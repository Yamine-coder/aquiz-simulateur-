/**
 * Module de conseils AQUIZ avancés
 * Système de recommandations professionnelles — Architecture Rules Engine
 *
 * Ce fichier est le point d'entrée unique.
 * Il orchestre le moteur de règles et re-exporte les types pour les consommateurs.
 *
 * Architecture :
 * - types.ts           → Toutes les interfaces (source de vérité)
 * - contexteMarche.ts  → Config marché + utilitaires financiers
 * - moteurConseils.ts  → Engine (évaluation, dédup par groupe, budget)
 * - reglesConseils.ts  → Règles de conseils (déclaratives)
 * - reglesScenarios.ts → Règles de scénarios (déclaratives)
 */

// ============================================================================
// RE-EXPORTS — ne pas casser les imports existants
// ============================================================================

export type {
    ActionConcrète,
    ConseilAQUIZ,
    DiagnosticBancaire,
    DonneesConseil,
    ResultatConseilsAvances,
    ScenarioAlternatif
} from './types'

import type {
    DiagnosticBancaire,
    DonneesConseil,
    ResultatConseilsAvances,
} from './types'

import { formatMontant } from './contexteMarche'
import { evaluerConseils, evaluerScenarios } from './moteurConseils'
import { REGLES_CONSEILS } from './reglesConseils'
import { REGLES_SCENARIOS } from './reglesScenarios'

// ============================================================================
// DIAGNOSTIC BANCAIRE (agrégation, pas rule-based)
// ============================================================================

function genererDiagnosticBancaire(data: DonneesConseil): DiagnosticBancaire {
  const pointsForts: string[] = []
  const pointsVigilance: string[] = []
  const banquesRecommandees: string[] = []

  const pourcentageApport = data.prixAchat > 0 ? (data.apport / data.prixAchat) * 100 : 0
  const ageFinPret = data.age + data.dureeAns

  // ===== POINTS FORTS =====
  if (data.statutProfessionnel === 'fonctionnaire') {
    pointsForts.push('Statut fonctionnaire très apprécié des banques')
    banquesRecommandees.push('Banque Postale', 'Crédit Mutuel')
  }
  if (data.statutProfessionnel === 'cdi') {
    pointsForts.push('CDI = stabilité professionnelle valorisée')
    banquesRecommandees.push('Crédit Agricole', 'Société Générale')
  }
  if (data.statutProfessionnel === 'retraite') {
    pointsForts.push('Revenus stables et pérennes (pension)')
    banquesRecommandees.push('Banque Postale', 'Caisse d\'Épargne')
  }
  if (pourcentageApport >= 20) {
    pointsForts.push(`Apport solide de ${Math.round(pourcentageApport)}%`)
  } else if (pourcentageApport >= 10) {
    pointsForts.push(`Apport correct de ${Math.round(pourcentageApport)}% (couvre les frais)`)
  }
  if (data.tauxEndettement <= 30) {
    pointsForts.push('Taux d\'endettement confortable (≤ 30%)')
  } else if (data.tauxEndettement <= 33) {
    pointsForts.push('Endettement raisonnable (≤ 33%)')
  }
  if (data.niveauResteAVivre === 'ok') {
    pointsForts.push('Reste à vivre suffisant')
  }
  if (data.situationFoyer === 'couple') {
    pointsForts.push('Deux revenus = dossier plus solide')
  }
  if (data.age >= 25 && data.age <= 45) {
    pointsForts.push('Tranche d\'âge optimale pour l\'emprunt')
  }
  if (data.revenus >= 5000) {
    pointsForts.push('Revenus élevés, fort pouvoir de négociation')
  }

  // ===== POINTS DE VIGILANCE =====
  if (pourcentageApport === 0) {
    pointsVigilance.push('Aucun apport : dossier très difficile à financer')
  } else if (pourcentageApport < 10) {
    pointsVigilance.push('Apport inférieur à 10% (ne couvre pas les frais de notaire)')
  }
  if (data.tauxEndettement > 35) {
    pointsVigilance.push(`Endettement à ${data.tauxEndettement.toFixed(1)}% : dépasse la limite HCSF (35%)`)
  } else if (data.tauxEndettement > 33) {
    pointsVigilance.push(`Endettement à ${data.tauxEndettement.toFixed(1)}% (proche limite HCSF 35%)`)
  }
  if (data.statutProfessionnel === 'cdd') {
    pointsVigilance.push('Contrat CDD = conditions plus strictes')
    banquesRecommandees.push('Crédit Agricole', 'BNP (si revenus élevés)')
  }
  if (data.statutProfessionnel === 'independant') {
    pointsVigilance.push('Indépendant : 3 ans d\'ancienneté minimum requis')
    banquesRecommandees.push('Banque Populaire', 'CIC')
  }
  if (data.statutProfessionnel === 'interim') {
    pointsVigilance.push('Intérimaire : profil considéré précaire par les banques')
    banquesRecommandees.push('Crédit Agricole', 'Action Logement (garantie)')
  }
  if (data.statutProfessionnel === 'retraite' && ageFinPret > 80) {
    pointsVigilance.push(`Fin de prêt à ${ageFinPret} ans : assurance très coûteuse voire refusée`)
  } else if (ageFinPret > 70) {
    pointsVigilance.push(`Fin de prêt à ${ageFinPret} ans (assurance majorée)`)
  }
  if (data.niveauResteAVivre === 'limite') {
    pointsVigilance.push('Reste à vivre juste suffisant')
  }
  if (data.niveauResteAVivre === 'risque') {
    pointsVigilance.push('Reste à vivre insuffisant : refus quasi-certain')
  }
  if (data.charges > 0) {
    pointsVigilance.push(`Charges existantes de ${formatMontant(data.charges)} €/mois (loyer ou crédits en cours)`)
  }

  // ===== BANQUES PAR DÉFAUT =====
  if (banquesRecommandees.length === 0) {
    if (pourcentageApport >= 20) {
      banquesRecommandees.push('Boursorama', 'Fortuneo', 'Crédit Agricole')
    } else {
      banquesRecommandees.push('Crédit Mutuel', 'Caisse d\'Épargne', 'LCL')
    }
  }

  // ===== PROBABILITÉ =====
  let probabilite: DiagnosticBancaire['probabiliteAcceptation']
  if (data.scoreFaisabilite >= 85) probabilite = 'très élevée'
  else if (data.scoreFaisabilite >= 70) probabilite = 'élevée'
  else if (data.scoreFaisabilite >= 55) probabilite = 'moyenne'
  else if (data.scoreFaisabilite >= 40) probabilite = 'faible'
  else probabilite = 'très faible'

  // ===== DÉLAI =====
  let delai: string
  if (data.scoreFaisabilite >= 80 && pourcentageApport >= 15) {
    delai = '2-3 semaines'
  } else if (data.scoreFaisabilite >= 60) {
    delai = '3-4 semaines'
  } else {
    delai = '4-6 semaines (étude approfondie)'
  }

  return {
    scoreGlobal: data.scoreFaisabilite,
    probabiliteAcceptation: probabilite,
    pointsForts: pointsForts.slice(0, 4),
    pointsVigilance: pointsVigilance.slice(0, 4),
    banquesRecommandees: banquesRecommandees.slice(0, 3),
    delaiEstime: delai,
  }
}

// ============================================================================
// RÉSUMÉ EXÉCUTIF
// ============================================================================

function genererResume(data: DonneesConseil, diagnostic: DiagnosticBancaire): string {
  const pourcentageApport = data.prixAchat > 0 ? (data.apport / data.prixAchat) * 100 : 0

  if (data.scoreFaisabilite >= 80) {
    return `Excellent profil (${data.scoreFaisabilite}/100). Budget de ${formatMontant(data.prixAchat)} € avec ${Math.round(pourcentageApport)}% d'apport. Probabilité d'acceptation ${diagnostic.probabiliteAcceptation}. Délai estimé : ${diagnostic.delaiEstime}.`
  } else if (data.scoreFaisabilite >= 60) {
    return `Bon profil (${data.scoreFaisabilite}/100). Projet finançable avec quelques optimisations possibles. Budget : ${formatMontant(data.prixAchat)} €. Délai estimé : ${diagnostic.delaiEstime}.`
  } else {
    return `Profil à renforcer (${data.scoreFaisabilite}/100). Le projet nécessite des ajustements pour maximiser les chances d'acceptation. Consultez nos recommandations.`
  }
}

// ============================================================================
// FONCTION PRINCIPALE EXPORTÉE
// ============================================================================

/**
 * Génère l'ensemble des conseils avancés pour un profil donné.
 * Délègue au moteur de règles pour garantir :
 * - 0 doublon (exclusion mutuelle par groupe)
 * - Budget d'affichage équilibré (max 2 P1 + 2 P2 + 2 P3)
 * - Scénarios triés par pertinence (max 3)
 */
export function genererConseilsAvances(data: DonneesConseil): ResultatConseilsAvances {
  // 1. Diagnostic bancaire (agrégation classique)
  const diagnostic = genererDiagnosticBancaire(data)

  // 2. Conseils via le moteur de règles
  const conseils = evaluerConseils(REGLES_CONSEILS, data, diagnostic)

  // 3. Scénarios via le moteur de règles
  const scenarios = evaluerScenarios(REGLES_SCENARIOS, data)

  // 4. Résumé exécutif
  const resumeExecutif = genererResume(data, diagnostic)

  return { diagnostic, conseils, scenarios, resumeExecutif }
}
