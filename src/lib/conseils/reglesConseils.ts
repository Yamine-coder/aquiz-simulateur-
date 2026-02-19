/**
 * Règles de conseils AQUIZ — déclaratives
 *
 * Chaque règle est un objet avec :
 * - id : identifiant unique
 * - groupe : exclusion mutuelle (1 seule règle par groupe)
 * - priorite : 1 = critique, 2 = important, 3 = optimisation
 * - poids : départage au sein du groupe (le plus haut gagne)
 * - condition : quand activer la règle
 * - generer : produire le conseil
 *
 * Ajouter une règle = ajouter un objet. Supprimer = retirer l'objet.
 * Aucun if/else imbriqué, aucun risque de doublon.
 */

import {
    CONTEXTE_MARCHE,
    calculerMensualite,
    estEligiblePTZ,
    formatMontant,
    getMontantPTZ,
} from './contexteMarche'
import type { RegleConseil } from './moteurConseils'

// ============================================================================
// GROUPE : score (diagnostic global)
// ============================================================================

const scoreExcellent: RegleConseil = {
  id: 'score-excellent',
  groupe: 'score',
  priorite: 1,
  poids: 100,
  condition: (d) => d.scoreFaisabilite >= 85,
  generer: (d) => ({
    categorie: 'diagnostic',
    titre: 'Profil bancaire excellent',
    conseil: `Votre dossier fait partie des 15% les plus solides. Vous avez un pouvoir de négociation : demandez une réduction de 0.10% à 0.20% sur le taux proposé.`,
    impact: `Économie potentielle : ${formatMontant(d.capitalEmpruntable * 0.0015 * d.dureeAns)} € sur la durée du prêt`,
    action: {
      label: 'Négocier le taux',
      timeline: 'Lors du premier RDV banque',
      gain: '-0.15% sur le taux',
    },
    type: 'succes',
  }),
}

const scoreBon: RegleConseil = {
  id: 'score-bon',
  groupe: 'score',
  priorite: 1,
  poids: 75,
  condition: (d) => d.scoreFaisabilite >= 70,
  generer: (d) => ({
    categorie: 'diagnostic',
    titre: 'Bon profil, négociable',
    conseil: `Votre dossier est solide (${d.scoreFaisabilite}/100). Les banques accepteront votre financement mais vous n'aurez pas automatiquement les meilleurs taux. Faites jouer la concurrence entre au moins 3 établissements, ou passez par un courtier pour gagner 0.10% à 0.15%.`,
    impact: `Économie potentielle : ${formatMontant(d.capitalEmpruntable * 0.001 * d.dureeAns)} € en négociant le taux`,
    action: {
      label: 'Comparer 3 banques minimum',
      timeline: 'Dès le début des démarches',
      gain: 'Meilleur taux garanti',
    },
    type: 'amelioration',
  }),
}

const scoreMoyen: RegleConseil = {
  id: 'score-moyen',
  groupe: 'score',
  priorite: 1,
  poids: 50,
  condition: (d) => d.scoreFaisabilite >= 50,
  generer: (d) => ({
    categorie: 'diagnostic',
    titre: 'Dossier à consolider',
    conseil: `Score de ${d.scoreFaisabilite}/100 : certaines banques seront sélectives. Un courtier peut identifier les établissements les plus adaptés à votre profil et maximiser vos chances.`,
    action: {
      label: 'Consulter un courtier',
      timeline: 'Avant les démarches bancaires',
    },
    type: 'amelioration',
  }),
}

const scoreFragile: RegleConseil = {
  id: 'score-fragile',
  groupe: 'score',
  priorite: 1,
  poids: 25,
  condition: (d) => d.scoreFaisabilite < 50,
  generer: (d) => ({
    categorie: 'diagnostic',
    titre: 'Profil à retravailler',
    conseil: `Score de ${d.scoreFaisabilite}/100 : en l'état, la plupart des banques refuseront le dossier. Avant toute démarche, stabilisez votre situation pendant 6 à 12 mois. Un courtier spécialisé dans les dossiers complexes pourra ensuite cibler les établissements adaptés.`,
    action: {
      label: 'Consulter un courtier spécialisé',
      timeline: 'Après stabilisation du profil',
      gain: 'Maximiser vos chances',
    },
    type: 'alerte',
  }),
}

// ============================================================================
// GROUPE : apport
// ============================================================================

const apportZero: RegleConseil = {
  id: 'apport-zero',
  groupe: 'apport',
  priorite: 1,
  poids: 100,
  condition: (d) => d.apport === 0,
  generer: (d) => ({
    categorie: 'action',
    titre: 'Aucun apport : frein majeur',
    conseil: `Sans apport, vous ne couvrez pas les frais de notaire (${d.typeBien === 'neuf' ? '2-3%' : '7-8%'} du prix). Très peu de banques acceptent un financement à 110%. Visez au minimum ${formatMontant(Math.round(d.prixAchat * 0.10))} € (10%) pour débloquer la situation.`,
    impact: 'Passage de "refus quasi-certain" à "étude possible"',
    action: {
      label: 'Épargner ou mobiliser un don familial',
      timeline: `Objectif : ${formatMontant(Math.round(d.prixAchat * 0.10))} €`,
      gain: 'Dossier finançable',
    },
    type: 'alerte',
  }),
}

const apportInsuffisant: RegleConseil = {
  id: 'apport-insuffisant',
  groupe: 'apport',
  priorite: 1,
  poids: 75,
  condition: (d) => {
    const pct = d.prixAchat > 0 ? (d.apport / d.prixAchat) * 100 : 0
    return d.apport > 0 && pct < 10
  },
  generer: (d, diag) => {
    const montantManquant = Math.round(d.prixAchat * 0.10 - d.apport)
    const moisEpargne = Math.ceil(montantManquant / (d.revenus * 0.15))
    return {
      categorie: 'action',
      titre: 'Renforcer l\'apport à 10%',
      conseil: `Il manque ${formatMontant(montantManquant)} € pour atteindre le seuil des 10% qui rassure les banques. En épargnant ${formatMontant(Math.round(d.revenus * 0.15))} €/mois, vous y serez dans ${moisEpargne} mois.`,
      impact: `Déblocage de ${diag.banquesRecommandees.length + 2} banques supplémentaires`,
      action: {
        label: 'Épargner 15% des revenus',
        timeline: `${moisEpargne} mois`,
        gain: 'Accès aux meilleures offres',
      },
      type: 'alerte',
    }
  },
}

const apportOptimisable: RegleConseil = {
  id: 'apport-optimisable',
  groupe: 'apport',
  priorite: 2,
  poids: 50,
  condition: (d) => {
    const pct = d.prixAchat > 0 ? (d.apport / d.prixAchat) * 100 : 0
    return pct >= 10 && pct < 20
  },
  generer: (d) => {
    const pour20pourcent = Math.round(d.prixAchat * 0.20 - d.apport)
    return {
      categorie: 'action',
      titre: 'Viser 20% d\'apport',
      conseil: `Avec ${formatMontant(pour20pourcent)} € de plus, vous atteignez 20% d'apport et accédez aux taux "premium" des banques (-0.10% à -0.20%).`,
      impact: `Économie sur le crédit : ~${formatMontant(d.capitalEmpruntable * 0.0015 * d.dureeAns)} €`,
      action: {
        label: 'Compléter l\'apport',
        gain: 'Meilleur taux négociable',
      },
      type: 'optimisation',
    }
  },
}

const apportExcellent: RegleConseil = {
  id: 'apport-excellent',
  groupe: 'apport',
  priorite: 2,
  poids: 25,
  condition: (d) => {
    const pct = d.prixAchat > 0 ? (d.apport / d.prixAchat) * 100 : 0
    return pct >= 20
  },
  generer: (d) => {
    const pct = d.prixAchat > 0 ? (d.apport / d.prixAchat) * 100 : 0
    return {
      categorie: 'diagnostic',
      titre: 'Apport solide',
      conseil: `${Math.round(pct)}% d'apport : vous êtes au-dessus du seuil de confort des banques. C'est un atout majeur pour négocier.`,
      type: 'succes',
    }
  },
}

// ============================================================================
// GROUPE : endettement
// ============================================================================

const endettementDepasse: RegleConseil = {
  id: 'endettement-depasse',
  groupe: 'endettement',
  priorite: 1,
  poids: 100,
  condition: (d) => d.tauxEndettement > 35,
  generer: (d) => {
    const reduction = Math.round((d.tauxEndettement - 33) * d.revenus / 100)
    return {
      categorie: 'action',
      titre: 'Endettement hors norme HCSF',
      conseil: `À ${d.tauxEndettement.toFixed(1)}%, vous dépassez la limite légale de 35% imposée par le HCSF. Aucune banque ne peut financer ce dossier en l'état. Il faut réduire la mensualité de ${formatMontant(reduction)} €/mois ou augmenter vos revenus.`,
      impact: 'Obligatoire pour obtenir un financement',
      action: {
        label: `Réduire la mensualité de ${formatMontant(reduction)} €`,
        timeline: 'Immédiat',
        gain: 'Passage sous le seuil HCSF',
      },
      type: 'alerte',
    }
  },
}

const endettementLimite: RegleConseil = {
  id: 'endettement-limite',
  groupe: 'endettement',
  priorite: 1,
  poids: 75,
  condition: (d) => d.tauxEndettement > 33 && d.tauxEndettement <= 35,
  generer: (d) => {
    const reduction = Math.round((d.tauxEndettement - 33) * d.revenus / 100)
    return {
      categorie: 'action',
      titre: 'Endettement à optimiser',
      conseil: `À ${d.tauxEndettement.toFixed(1)}%, vous êtes dans la zone limite HCSF (33-35%). Le dossier reste finançable mais les banques sont plus exigeantes. Réduire de ${formatMontant(reduction)} €/mois vous donnerait une marge de confort.`,
      impact: 'Passage de "acceptation probable" à "acceptation quasi-certaine"',
      action: {
        label: `Réduire de ${formatMontant(reduction)} €/mois`,
        gain: 'Dossier renforcé',
      },
      type: 'amelioration',
    }
  },
}

const endettementCorrect: RegleConseil = {
  id: 'endettement-correct',
  groupe: 'endettement',
  priorite: 3,
  poids: 50,
  condition: (d) => d.tauxEndettement > 30 && d.tauxEndettement <= 33,
  generer: (d) => ({
    categorie: 'diagnostic',
    titre: 'Endettement dans la norme',
    conseil: `${d.tauxEndettement.toFixed(1)}% d'endettement : vous restez sous le seuil HCSF avec une marge raisonnable. Certaines banques premium préfèrent ≤ 30%.`,
    type: 'info',
  }),
}

const endettementOk: RegleConseil = {
  id: 'endettement-ok',
  groupe: 'endettement',
  priorite: 3,
  poids: 25,
  condition: (d) => d.tauxEndettement <= 30,
  generer: (d) => ({
    categorie: 'diagnostic',
    titre: 'Endettement maîtrisé',
    conseil: `${d.tauxEndettement.toFixed(1)}% d'endettement vous laisse ${formatMontant(d.resteAVivre - d.resteAVivreMin)} € de marge mensuelle au-delà du minimum requis. Excellent signal pour les banques.`,
    type: 'succes',
  }),
}

// ============================================================================
// GROUPE : statut professionnel
// ============================================================================

const statutInterim: RegleConseil = {
  id: 'statut-interim',
  groupe: 'statut',
  priorite: 1,
  poids: 100,
  condition: (d) => d.statutProfessionnel === 'interim',
  generer: () => ({
    categorie: 'action',
    titre: 'Intérimaire : dossier spécifique',
    conseil: `En intérim, les banques demandent 2 à 3 ans d'ancienneté dans le secteur, des relevés de missions régulières, et un apport d'au minimum 15-20%. Préparez vos contrats de mission et bulletins de paie des 3 dernières années.`,
    action: {
      label: 'Constituer un historique de missions',
      timeline: 'Minimum 24 mois de relevés',
      gain: 'Prouver la régularité des revenus',
    },
    type: 'alerte',
  }),
}

const statutCDD: RegleConseil = {
  id: 'statut-cdd',
  groupe: 'statut',
  priorite: 2,
  poids: 80,
  condition: (d) => d.statutProfessionnel === 'cdd',
  generer: () => ({
    categorie: 'action',
    titre: 'Renforcer votre dossier CDD',
    conseil: `En CDD, préparez : contrats des 3 dernières années, preuve de renouvellements, attestation employeur. Un co-emprunteur en CDI ou 25% d'apport compensera.`,
    action: {
      label: 'Constituer le dossier renforcé',
      timeline: 'Avant les démarches',
    },
    type: 'amelioration',
  }),
}

const statutIndependant: RegleConseil = {
  id: 'statut-independant',
  groupe: 'statut',
  priorite: 2,
  poids: 75,
  condition: (d) => d.statutProfessionnel === 'independant',
  generer: () => ({
    categorie: 'action',
    titre: 'Documents TNS à préparer',
    conseil: `Indépendant : les banques regardent la moyenne des 3 derniers bilans. Préparez : liasses fiscales, bilans comptables, extrait Kbis, derniers avis d'imposition.`,
    action: {
      label: 'Rassembler les pièces',
      timeline: '1-2 semaines avant le RDV',
    },
    type: 'amelioration',
  }),
}

const statutRetraiteCritique: RegleConseil = {
  id: 'statut-retraite-critique',
  groupe: 'statut',
  priorite: 1,
  poids: 100, // Gagne toujours le groupe statut si condition vraie
  condition: (d) => d.statutProfessionnel === 'retraite' && (d.age + d.dureeAns) > 80,
  generer: (d) => {
    const ageFinPret = d.age + d.dureeAns
    const dureeMax = Math.max(80 - d.age, 10)
    return {
      categorie: 'action',
      titre: 'Âge en fin de prêt : risque majeur',
      conseil: `Fin de prêt à ${ageFinPret} ans : au-delà de 80 ans, la plupart des assureurs refusent ou appliquent des surprimes prohibitives. Réduisez la durée à ${dureeMax} ans maximum et compensez par un apport plus important. Sans assurance, pas de prêt.`,
      impact: 'Bloqueur potentiel — à traiter en priorité',
      action: {
        label: `Passer à ${dureeMax} ans + assurance déléguée`,
        timeline: 'Immédiat — avant toute démarche',
        gain: 'Rendre le dossier assurable',
      },
      type: 'alerte',
    }
  },
}

const statutRetraite: RegleConseil = {
  id: 'statut-retraite',
  groupe: 'statut',
  priorite: 2,
  poids: 60,
  condition: (d) => d.statutProfessionnel === 'retraite' && (d.age + d.dureeAns) <= 80,
  generer: (d) => {
    const ageFinPret = d.age + d.dureeAns
    return {
      categorie: 'action',
      titre: 'Retraité : adapter la stratégie',
      conseil: `Revenus stables et prévisibles : c'est un atout. Avec une durée de ${d.dureeAns} ans (fin à ${ageFinPret} ans), le dossier est cohérent. Comparez les assurances : la délégation est souvent 40-60% moins chère.`,
      action: {
        label: 'Comparer les assurances en délégation',
        timeline: 'Avant toute signature',
        gain: 'Jusqu\'à 60% d\'économie sur l\'assurance',
      },
      type: 'succes',
    }
  },
}

const statutFonctionnaire: RegleConseil = {
  id: 'statut-fonctionnaire',
  groupe: 'statut',
  priorite: 3,
  poids: 50,
  condition: (d) => d.statutProfessionnel === 'fonctionnaire',
  generer: () => ({
    categorie: 'diagnostic',
    titre: 'Profil très apprécié',
    conseil: `En tant que fonctionnaire, vous bénéficiez de conditions privilégiées. Certaines banques (Banque Postale, Crédit Mutuel Enseignant) proposent des offres dédiées avec taux préférentiels.`,
    type: 'succes',
  }),
}

const statutCDI: RegleConseil = {
  id: 'statut-cdi',
  groupe: 'statut',
  priorite: 3,
  poids: 40,
  condition: (d) => d.statutProfessionnel === 'cdi',
  generer: () => ({
    categorie: 'diagnostic',
    titre: 'CDI validé',
    conseil: `Le CDI reste le critère n°1 des banques. Si vous avez passé votre période d'essai, votre dossier coche la case la plus importante. Pensez à demander une attestation employeur récente.`,
    action: {
      label: 'Préparer l\'attestation employeur',
      timeline: 'Avant le RDV banque',
    },
    type: 'succes',
  }),
}

// ============================================================================
// GROUPE : âge / assurance
// ============================================================================

const ageAssurance: RegleConseil = {
  id: 'age-assurance',
  groupe: 'age',
  priorite: 2,
  poids: 75,
  condition: (d) => {
    const ageFinPret = d.age + d.dureeAns
    // Skip si retraité (déjà couvert par statut-retraite qui parle d'assurance)
    return ageFinPret > 70 && ageFinPret <= 75 && d.statutProfessionnel !== 'retraite'
  },
  generer: (d) => {
    const ageFinPret = d.age + d.dureeAns
    return {
      categorie: 'action',
      titre: 'Anticiper l\'assurance',
      conseil: `Fin de prêt à ${ageFinPret} ans : les assurances groupe seront plus chères. Demandez des devis en délégation d'assurance (Magnolia, April) pour économiser jusqu'à 50%.`,
      impact: `Économie potentielle : ${formatMontant(d.capitalEmpruntable * 0.003 * d.dureeAns)} €`,
      action: {
        label: 'Comparer les assurances',
        timeline: 'Avant la signature de l\'offre',
        gain: 'Jusqu\'à 50% d\'économie',
      },
      type: 'amelioration',
    }
  },
}

// ============================================================================
// GROUPE : durée
// ============================================================================

const duree20ans: RegleConseil = {
  id: 'duree-20ans',
  groupe: 'duree',
  priorite: 3,
  poids: 50,
  condition: (d) => {
    if (d.dureeAns !== 25 || d.age >= 45) return false
    const economie = (d.mensualiteMax * 25 * 12) - (calculerMensualite(d.capitalEmpruntable, d.tauxInteret - 0.1, 20) * 20 * 12)
    return economie > 5000
  },
  generer: (d) => {
    const economie = (d.mensualiteMax * 25 * 12) - (calculerMensualite(d.capitalEmpruntable, d.tauxInteret - 0.1, 20) * 20 * 12)
    return {
      categorie: 'scenario',
      titre: 'Envisager 20 ans',
      conseil: `Passer à 20 ans augmenterait votre mensualité mais économiserait ~${formatMontant(economie)} € sur le coût total du crédit.`,
      impact: `Économie totale : ${formatMontant(economie)} €`,
      type: 'optimisation',
    }
  },
}

// ============================================================================
// GROUPE : PTZ
// ============================================================================

const ptzEligible: RegleConseil = {
  id: 'ptz-eligible',
  groupe: 'ptz',
  priorite: 1,
  poids: 100,
  condition: (d) => estEligiblePTZ(d),
  generer: (d) => {
    const montant = getMontantPTZ(d.situationFoyer, d.nombreEnfants)
    const economie = Math.round(montant * (d.tauxInteret / 100) * d.dureeAns * 0.5)
    return {
      categorie: 'strategie',
      titre: 'PTZ : levier majeur à activer',
      conseil: d.typeBien === 'neuf'
        ? `Votre profil est compatible avec le Prêt à Taux Zéro. Jusqu'à ${formatMontant(montant)} € à 0% d'intérêts en zone A bis/A. C'est le premier levier à exploiter pour augmenter votre budget.`
        : `Le PTZ est désormais accessible dans l'ancien en zones B2 et C (sous conditions de travaux). Jusqu'à ${formatMontant(montant)} € à 0% d'intérêts avec un différé de remboursement.`,
      impact: `Économie d'intérêts estimée : ${formatMontant(economie)} €`,
      action: {
        label: 'Vérifier l\'éligibilité complète sur ANIL.org',
        timeline: 'Avant le montage du dossier',
        gain: `${formatMontant(montant)} € à 0%`,
      },
      type: 'succes',
    }
  },
}

// ============================================================================
// GROUPE : géographie
// ============================================================================

const geoOpportunite: RegleConseil = {
  id: 'geo-opportunite',
  groupe: 'geographie',
  priorite: 3,
  poids: 50,
  condition: (d) => d.surfaceParis < 30 && d.surfaceGrandeCouronne >= 60,
  generer: (d) => ({
    categorie: 'strategie',
    titre: 'Opportunité Grande Couronne',
    conseil: `Votre budget permet ${d.surfaceGrandeCouronne} m² en Seine-et-Marne/Essonne contre ${d.surfaceParis} m² à Paris. Le télétravail rend ces zones attractives.`,
    type: 'optimisation',
  }),
}

// ============================================================================
// GROUPE : marché
// ============================================================================

const marcheStable: RegleConseil = {
  id: 'marche-timing',
  groupe: 'marche',
  priorite: 2,
  poids: 50,
  condition: () => CONTEXTE_MARCHE.tendance === 'stable',
  generer: () => ({
    categorie: 'strategie',
    titre: 'Marché favorable',
    conseil: `Les taux sont stables autour de ${CONTEXTE_MARCHE.taux.moyen20Ans}% sur 20 ans. C'est le bon moment pour concrétiser votre projet sans précipitation.`,
    type: 'info',
  }),
}

// ============================================================================
// EXPORT : tableau complet des règles
// ============================================================================

export const REGLES_CONSEILS: RegleConseil[] = [
  // Score (P1)
  scoreExcellent,
  scoreBon,
  scoreMoyen,
  scoreFragile,
  // Apport (P1-P2)
  apportZero,
  apportInsuffisant,
  apportOptimisable,
  apportExcellent,
  // Endettement (P1-P3)
  endettementDepasse,
  endettementLimite,
  endettementCorrect,
  endettementOk,
  // Statut (P1-P3)
  statutInterim,
  statutCDD,
  statutIndependant,
  statutRetraiteCritique,
  statutRetraite,
  statutFonctionnaire,
  statutCDI,
  // Âge (P2)
  ageAssurance,
  // Durée (P3)
  duree20ans,
  // PTZ (P1)
  ptzEligible,
  // Géographie (P3)
  geoOpportunite,
  // Marché (P2)
  marcheStable,
]
