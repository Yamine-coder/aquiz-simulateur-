/**
 * Module de conseils AQUIZ avancés
 * Système de recommandations professionnelles inspiré des meilleurs courtiers
 * (Meilleurtaux, Pretto, Empruntis, CAFPI)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ConseilAQUIZ {
  id: string;
  priorite: 1 | 2 | 3; // 1 = critique, 2 = important, 3 = optimisation
  categorie: 'diagnostic' | 'action' | 'scenario' | 'strategie';
  titre: string;
  conseil: string;
  impact?: string; // Chiffrage de l'impact
  action?: ActionConcrète;
  type: 'succes' | 'amelioration' | 'optimisation' | 'alerte' | 'info';
}

export interface ActionConcrète {
  label: string;
  timeline?: string;
  gain?: string;
}

export interface ScenarioAlternatif {
  id: string;
  titre: string;
  description: string;
  modifications: {
    apport?: number;
    duree?: number;
    mensualite?: number;
  };
  resultats: {
    nouveauBudget: number;
    nouveauTaux: number;
    nouvellesMensualites: number;
    economieOuCout: number;
  };
  avantages: string[];
  inconvenients: string[];
  recommande: boolean;
}

export interface DiagnosticBancaire {
  scoreGlobal: number;
  probabiliteAcceptation: 'très élevée' | 'élevée' | 'moyenne' | 'faible' | 'très faible';
  pointsForts: string[];
  pointsVigilance: string[];
  banquesRecommandees: string[];
  delaiEstime: string;
}

export interface DonneesConseil {
  // Profil
  age: number;
  statutProfessionnel: string;
  situationFoyer: string;
  nombreEnfants: number;
  
  // Revenus & charges
  revenus: number;
  charges: number;
  
  // Projet
  apport: number;
  mensualiteMax: number;
  mensualiteRecommandee: number;
  dureeAns: number;
  tauxInteret: number;
  typeBien: string;
  
  // Résultats calculés
  prixAchat: number;
  capitalEmpruntable: number;
  tauxEndettement: number;
  resteAVivre: number;
  resteAVivreMin: number;
  niveauResteAVivre: 'ok' | 'limite' | 'risque';
  scoreFaisabilite: number;
  
  // Géographie
  surfaceParis: number;
  surfacePetiteCouronne: number;
  surfaceGrandeCouronne: number;
}

export interface ResultatConseilsAvances {
  diagnostic: DiagnosticBancaire;
  conseils: ConseilAQUIZ[];
  scenarios: ScenarioAlternatif[];
  resumeExecutif: string;
}

// ============================================================================
// CONSTANTES MARCHÉ (à mettre à jour régulièrement)
// ============================================================================

const CONTEXTE_MARCHE_2026 = {
  tauxMoyen20Ans: 3.45,
  tauxMoyen25Ans: 3.55,
  tendance: 'stable' as const, // 'hausse' | 'baisse' | 'stable'
  politiqueBancaire: 'selective' as const, // 'souple' | 'normale' | 'selective'
  ptzDisponible: true,
  pasDisponible: true,
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

const formatMontant = (n: number): string => 
  new Intl.NumberFormat('fr-FR').format(Math.round(n))

const calculerMensualite = (capital: number, tauxAnnuel: number, dureeAns: number): number => {
  const tauxMensuel = tauxAnnuel / 100 / 12
  const nombreMois = dureeAns * 12
  if (tauxMensuel === 0) return capital / nombreMois
  return capital * tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -nombreMois))
}

const calculerCapital = (mensualite: number, tauxAnnuel: number, dureeAns: number): number => {
  const tauxMensuel = tauxAnnuel / 100 / 12
  const nombreMois = dureeAns * 12
  if (tauxMensuel === 0) return mensualite * nombreMois
  return mensualite * (1 - Math.pow(1 + tauxMensuel, -nombreMois)) / tauxMensuel
}

// ============================================================================
// GÉNÉRATION DU DIAGNOSTIC BANCAIRE
// ============================================================================

function genererDiagnosticBancaire(data: DonneesConseil): DiagnosticBancaire {
  const pointsForts: string[] = []
  const pointsVigilance: string[] = []
  const banquesRecommandees: string[] = []
  
  const pourcentageApport = data.prixAchat > 0 ? (data.apport / data.prixAchat) * 100 : 0
  const ageFinPret = data.age + data.dureeAns

  // Analyse des points forts
  if (data.statutProfessionnel === 'fonctionnaire') {
    pointsForts.push('Statut fonctionnaire très apprécié des banques')
    banquesRecommandees.push('Banque Postale', 'Crédit Mutuel')
  }
  if (data.statutProfessionnel === 'cdi') {
    pointsForts.push('CDI = stabilité professionnelle')
  }
  if (pourcentageApport >= 20) {
    pointsForts.push(`Apport solide de ${Math.round(pourcentageApport)}%`)
  }
  if (data.tauxEndettement <= 30) {
    pointsForts.push('Taux d\'endettement confortable')
  }
  if (data.niveauResteAVivre === 'ok') {
    pointsForts.push('Reste à vivre suffisant')
  }
  if (data.situationFoyer === 'couple' && data.revenus > 5000) {
    pointsForts.push('Revenus du foyer stables')
  }
  if (data.age >= 25 && data.age <= 45) {
    pointsForts.push('Tranche d\'âge optimale pour l\'emprunt')
  }

  // Analyse des points de vigilance
  if (pourcentageApport < 10) {
    pointsVigilance.push('Apport inférieur à 10% (frais de notaire)')
  }
  if (data.tauxEndettement > 33) {
    pointsVigilance.push(`Endettement à ${data.tauxEndettement.toFixed(1)}% (proche limite HCSF)`)
  }
  if (data.statutProfessionnel === 'cdd') {
    pointsVigilance.push('Contrat CDD = conditions plus strictes')
    banquesRecommandees.push('Crédit Agricole', 'BNP (si revenus élevés)')
  }
  if (data.statutProfessionnel === 'independant') {
    pointsVigilance.push('Indépendant : 3 ans d\'ancienneté minimum requis')
    banquesRecommandees.push('Banque Populaire', 'CIC')
  }
  if (ageFinPret > 70) {
    pointsVigilance.push(`Fin de prêt à ${ageFinPret} ans (assurance majorée)`)
  }
  if (data.niveauResteAVivre === 'limite') {
    pointsVigilance.push('Reste à vivre juste suffisant')
  }
  if (data.charges > 0) {
    pointsVigilance.push('Crédits en cours à prendre en compte')
  }

  // Banques par défaut si pas encore remplies
  if (banquesRecommandees.length === 0) {
    if (pourcentageApport >= 20) {
      banquesRecommandees.push('Boursorama', 'Fortuneo', 'Crédit Agricole')
    } else {
      banquesRecommandees.push('Crédit Mutuel', 'Caisse d\'Épargne', 'LCL')
    }
  }

  // Probabilité d'acceptation
  let probabilite: DiagnosticBancaire['probabiliteAcceptation']
  if (data.scoreFaisabilite >= 85) {
    probabilite = 'très élevée'
  } else if (data.scoreFaisabilite >= 70) {
    probabilite = 'élevée'
  } else if (data.scoreFaisabilite >= 55) {
    probabilite = 'moyenne'
  } else if (data.scoreFaisabilite >= 40) {
    probabilite = 'faible'
  } else {
    probabilite = 'très faible'
  }

  // Délai estimé
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
    delaiEstime: delai
  }
}

// ============================================================================
// GÉNÉRATION DES SCÉNARIOS ALTERNATIFS
// ============================================================================

function genererScenarios(data: DonneesConseil): ScenarioAlternatif[] {
  const scenarios: ScenarioAlternatif[] = []
  const pourcentageApport = data.prixAchat > 0 ? (data.apport / data.prixAchat) * 100 : 0

  // Scénario 1 : Augmenter l'apport de 10 000€
  if (pourcentageApport < 25) {
    const nouvelApport = data.apport + 10000
    const nouveauBudget = nouvelApport + data.capitalEmpruntable
    const nouveauPrix = nouveauBudget / (1 + (data.typeBien === 'neuf' ? 0.025 : 0.075))
    const nouveauPourcentage = (nouvelApport / nouveauPrix) * 100
    
    // Estimation du gain de taux avec plus d'apport
    const gainTaux = nouveauPourcentage >= 20 ? 0.15 : 0.05
    const nouveauTaux = Math.max(data.tauxInteret - gainTaux, 2.5)
    
    scenarios.push({
      id: 'apport-plus-10k',
      titre: 'Augmenter l\'apport de 10 000 €',
      description: 'Économisez pendant quelques mois pour renforcer votre dossier',
      modifications: { apport: nouvelApport },
      resultats: {
        nouveauBudget: nouveauPrix,
        nouveauTaux,
        nouvellesMensualites: data.mensualiteMax,
        economieOuCout: (nouveauPrix - data.prixAchat)
      },
      avantages: [
        `Apport passe à ${Math.round(nouveauPourcentage)}%`,
        `Budget achat : +${formatMontant(nouveauPrix - data.prixAchat)} €`,
        gainTaux > 0.1 ? `Taux négociable à ${nouveauTaux.toFixed(2)}%` : 'Dossier renforcé'
      ],
      inconvenients: [
        `Nécessite ${formatMontant(10000)} € d'épargne supplémentaire`,
        'Report du projet de quelques mois'
      ],
      recommande: pourcentageApport < 15
    })
  }

  // Scénario 2 : Allonger la durée de 5 ans
  if (data.dureeAns <= 20 && data.age + data.dureeAns + 5 <= 75) {
    const nouvelleDuree = data.dureeAns + 5
    const nouveauCapital = calculerCapital(data.mensualiteMax, data.tauxInteret + 0.1, nouvelleDuree)
    const nouveauBudget = data.apport + nouveauCapital
    const nouveauPrix = nouveauBudget / (1 + (data.typeBien === 'neuf' ? 0.025 : 0.075))
    const coutTotal25 = data.mensualiteMax * nouvelleDuree * 12
    const coutTotalActuel = data.mensualiteMax * data.dureeAns * 12
    const coutSupp = coutTotal25 - coutTotalActuel

    scenarios.push({
      id: 'duree-plus-5',
      titre: `Passer à ${nouvelleDuree} ans`,
      description: 'Augmentez votre capacité d\'achat en allongeant la durée',
      modifications: { duree: nouvelleDuree },
      resultats: {
        nouveauBudget: nouveauPrix,
        nouveauTaux: data.tauxInteret + 0.1,
        nouvellesMensualites: data.mensualiteMax,
        economieOuCout: coutSupp
      },
      avantages: [
        `Budget achat : +${formatMontant(nouveauPrix - data.prixAchat)} €`,
        'Même mensualité conservée',
        `+${Math.round((nouveauPrix - data.prixAchat) / (data.prixAchat / data.surfaceGrandeCouronne))} m² potentiels`
      ],
      inconvenients: [
        `Coût total du crédit : +${formatMontant(coutSupp)} €`,
        'Taux légèrement plus élevé (+0.10%)'
      ],
      recommande: data.surfaceParis < 30
    })
  }

  // Scénario 3 : Réduire la mensualité pour sécuriser
  if (data.tauxEndettement > 32) {
    const mensualiteSecurisee = Math.round(data.revenus * 0.30 - data.charges)
    const capitalSecurise = calculerCapital(mensualiteSecurisee, data.tauxInteret, data.dureeAns)
    const nouveauBudget = data.apport + capitalSecurise
    const nouveauPrix = nouveauBudget / (1 + (data.typeBien === 'neuf' ? 0.025 : 0.075))
    const reductionMensuelle = data.mensualiteMax - mensualiteSecurisee

    if (reductionMensuelle > 50) {
      scenarios.push({
        id: 'mensualite-securisee',
        titre: 'Mensualité sécurisée à 30%',
        description: 'Réduisez votre mensualité pour un dossier béton',
        modifications: { mensualite: mensualiteSecurisee },
        resultats: {
          nouveauBudget: nouveauPrix,
          nouveauTaux: data.tauxInteret,
          nouvellesMensualites: mensualiteSecurisee,
          economieOuCout: -(data.prixAchat - nouveauPrix)
        },
        avantages: [
          `Endettement à 30% (marge de sécurité)`,
          `Économie mensuelle : ${formatMontant(reductionMensuelle)} €`,
          'Acceptation quasi-garantie'
        ],
        inconvenients: [
          `Budget réduit de ${formatMontant(data.prixAchat - nouveauPrix)} €`,
          'Surface accessible réduite'
        ],
        recommande: data.scoreFaisabilite < 70
      })
    }
  }

  // Scénario 4 : Neuf vs Ancien
  if (data.typeBien === 'ancien') {
    const fraisNotaireNeuf = 0.025
    const budgetNeuf = (data.apport + data.capitalEmpruntable) / (1 + fraisNotaireNeuf)
    const gainPrix = budgetNeuf - data.prixAchat

    if (gainPrix > 5000) {
      scenarios.push({
        id: 'passer-au-neuf',
        titre: 'Opter pour le neuf',
        description: 'Profitez des frais de notaire réduits et du PTZ',
        modifications: {},
        resultats: {
          nouveauBudget: budgetNeuf,
          nouveauTaux: data.tauxInteret,
          nouvellesMensualites: data.mensualiteMax,
          economieOuCout: gainPrix
        },
        avantages: [
          `Budget achat : +${formatMontant(gainPrix)} €`,
          'Frais de notaire : 2-3% au lieu de 7-8%',
          'Éligibilité PTZ possible',
          'Pas de travaux à prévoir'
        ],
        inconvenients: [
          'Choix géographique plus limité',
          'Délai de livraison (VEFA)'
        ],
        recommande: true
      })
    }
  }

  return scenarios.slice(0, 3) // Max 3 scénarios
}

// ============================================================================
// GÉNÉRATION DES CONSEILS AVANCÉS
// ============================================================================

function genererConseils(data: DonneesConseil, diagnostic: DiagnosticBancaire): ConseilAQUIZ[] {
  const conseils: ConseilAQUIZ[] = []
  const pourcentageApport = data.prixAchat > 0 ? (data.apport / data.prixAchat) * 100 : 0
  const ageFinPret = data.age + data.dureeAns

  // ===== CONSEILS STRATÉGIQUES (Priorité 1) =====

  // Conseil sur le timing marché
  if (CONTEXTE_MARCHE_2026.tendance === 'stable') {
    conseils.push({
      id: 'timing-marche',
      priorite: 2,
      categorie: 'strategie',
      titre: 'Marché favorable',
      conseil: `Les taux sont stables autour de ${CONTEXTE_MARCHE_2026.tauxMoyen20Ans}% sur 20 ans. C'est le bon moment pour concrétiser votre projet sans précipitation.`,
      type: 'info'
    })
  }

  // Conseil personnalisé selon le score
  if (data.scoreFaisabilite >= 85) {
    conseils.push({
      id: 'profil-excellent',
      priorite: 1,
      categorie: 'diagnostic',
      titre: 'Profil bancaire excellent',
      conseil: `Votre dossier fait partie des 15% les plus solides. Vous avez un pouvoir de négociation : demandez une réduction de 0.10% à 0.20% sur le taux proposé.`,
      impact: `Économie potentielle : ${formatMontant(data.capitalEmpruntable * 0.0015 * data.dureeAns)} € sur la durée du prêt`,
      action: {
        label: 'Négocier le taux',
        timeline: 'Lors du premier RDV banque',
        gain: '-0.15% sur le taux'
      },
      type: 'succes'
    })
  } else if (data.scoreFaisabilite >= 70) {
    conseils.push({
      id: 'profil-bon',
      priorite: 1,
      categorie: 'diagnostic',
      titre: 'Bon profil, optimisable',
      conseil: `Votre dossier est solide (${data.scoreFaisabilite}/100). Pour passer dans la catégorie "excellent" et négocier les meilleures conditions, concentrez-vous sur les points ci-dessous.`,
      type: 'amelioration'
    })
  } else if (data.scoreFaisabilite >= 50) {
    conseils.push({
      id: 'profil-moyen',
      priorite: 1,
      categorie: 'diagnostic',
      titre: 'Dossier à consolider',
      conseil: `Score de ${data.scoreFaisabilite}/100 : certaines banques seront sélectives. Un courtier peut identifier les établissements les plus adaptés à votre profil et maximiser vos chances.`,
      action: {
        label: 'Consulter un courtier',
        timeline: 'Avant les démarches bancaires'
      },
      type: 'amelioration'
    })
  }

  // ===== CONSEILS APPORT (Actions concrètes) =====

  if (pourcentageApport < 10 && data.apport > 0) {
    const montantManquant = Math.round(data.prixAchat * 0.10 - data.apport)
    const moisEpargne = Math.ceil(montantManquant / (data.revenus * 0.15)) // 15% d'épargne mensuelle
    
    conseils.push({
      id: 'apport-insuffisant',
      priorite: 1,
      categorie: 'action',
      titre: 'Renforcer l\'apport à 10%',
      conseil: `Il manque ${formatMontant(montantManquant)} € pour atteindre le seuil des 10% qui rassure les banques. En épargnant ${formatMontant(Math.round(data.revenus * 0.15))} €/mois, vous y serez dans ${moisEpargne} mois.`,
      impact: `Déblocage de ${diagnostic.banquesRecommandees.length + 2} banques supplémentaires`,
      action: {
        label: 'Épargner 15% des revenus',
        timeline: `${moisEpargne} mois`,
        gain: 'Accès aux meilleures offres'
      },
      type: 'alerte'
    })
  } else if (pourcentageApport >= 10 && pourcentageApport < 20) {
    const pour20pourcent = Math.round(data.prixAchat * 0.20 - data.apport)
    
    conseils.push({
      id: 'apport-optimisable',
      priorite: 2,
      categorie: 'action',
      titre: 'Viser 20% d\'apport',
      conseil: `Avec ${formatMontant(pour20pourcent)} € de plus, vous atteignez 20% d'apport et accédez aux taux "premium" des banques (-0.10% à -0.20%).`,
      impact: `Économie sur le crédit : ~${formatMontant(data.capitalEmpruntable * 0.0015 * data.dureeAns)} €`,
      action: {
        label: 'Compléter l\'apport',
        gain: 'Meilleur taux négociable'
      },
      type: 'optimisation'
    })
  } else if (pourcentageApport >= 20) {
    conseils.push({
      id: 'apport-excellent',
      priorite: 2,
      categorie: 'diagnostic',
      titre: 'Apport solide',
      conseil: `${Math.round(pourcentageApport)}% d'apport : vous êtes au-dessus du seuil de confort des banques. C'est un atout majeur pour négocier.`,
      type: 'succes'
    })
  }

  // ===== CONSEILS ENDETTEMENT =====

  if (data.tauxEndettement > 33 && data.tauxEndettement <= 35) {
    const reductionNecessaire = Math.round((data.tauxEndettement - 33) * data.revenus / 100)
    
    conseils.push({
      id: 'endettement-limite',
      priorite: 1,
      categorie: 'action',
      titre: 'Endettement à optimiser',
      conseil: `À ${data.tauxEndettement.toFixed(1)}%, vous êtes proche de la limite HCSF (35%). Réduire la mensualité de ${formatMontant(reductionNecessaire)} € vous donnerait une marge de sécurité appréciée des banques.`,
      impact: 'Passage de "acceptation probable" à "acceptation quasi-certaine"',
      action: {
        label: `Réduire de ${formatMontant(reductionNecessaire)} €/mois`,
        gain: 'Dossier renforcé'
      },
      type: 'amelioration'
    })
  } else if (data.tauxEndettement <= 30) {
    conseils.push({
      id: 'endettement-ok',
      priorite: 3,
      categorie: 'diagnostic',
      titre: 'Endettement maîtrisé',
      conseil: `${data.tauxEndettement.toFixed(1)}% d'endettement vous laisse ${formatMontant(data.resteAVivre - data.resteAVivreMin)} € de marge mensuelle au-delà du minimum requis.`,
      type: 'succes'
    })
  }

  // ===== CONSEILS ÂGE / DURÉE =====

  if (ageFinPret > 70 && ageFinPret <= 75) {
    conseils.push({
      id: 'age-assurance',
      priorite: 2,
      categorie: 'action',
      titre: 'Anticiper l\'assurance',
      conseil: `Fin de prêt à ${ageFinPret} ans : les assurances groupe seront plus chères. Demandez des devis en délégation d'assurance (Magnolia, April) pour économiser jusqu'à 50%.`,
      impact: `Économie potentielle : ${formatMontant(data.capitalEmpruntable * 0.003 * data.dureeAns)} €`,
      action: {
        label: 'Comparer les assurances',
        timeline: 'Avant la signature de l\'offre',
        gain: 'Jusqu\'à 50% d\'économie'
      },
      type: 'amelioration'
    })
  }

  if (data.dureeAns === 25 && data.age < 45) {
    const economie20ans = (data.mensualiteMax * 25 * 12) - (calculerMensualite(data.capitalEmpruntable, data.tauxInteret - 0.1, 20) * 20 * 12)
    
    if (economie20ans > 5000) {
      conseils.push({
        id: 'duree-optimisation',
        priorite: 3,
        categorie: 'scenario',
        titre: 'Envisager 20 ans',
        conseil: `Passer à 20 ans augmenterait votre mensualité mais économiserait ~${formatMontant(economie20ans)} € sur le coût total du crédit.`,
        impact: `Économie totale : ${formatMontant(economie20ans)} €`,
        type: 'optimisation'
      })
    }
  }

  // ===== CONSEILS STATUT PROFESSIONNEL =====

  if (data.statutProfessionnel === 'cdd') {
    conseils.push({
      id: 'statut-cdd',
      priorite: 2,
      categorie: 'action',
      titre: 'Renforcer votre dossier CDD',
      conseil: `En CDD, préparez : contrats des 3 dernières années, preuve de renouvellements, attestation employeur. Un co-emprunteur en CDI ou 25% d'apport compensera.`,
      action: {
        label: 'Constituer le dossier renforcé',
        timeline: 'Avant les démarches'
      },
      type: 'amelioration'
    })
  }

  if (data.statutProfessionnel === 'independant') {
    conseils.push({
      id: 'statut-tns',
      priorite: 2,
      categorie: 'action',
      titre: 'Documents TNS à préparer',
      conseil: `Indépendant : les banques regardent la moyenne des 3 derniers bilans. Préparez : liasses fiscales, bilans comptables, extrait Kbis, derniers avis d'imposition.`,
      action: {
        label: 'Rassembler les pièces',
        timeline: '1-2 semaines avant le RDV'
      },
      type: 'amelioration'
    })
  }

  if (data.statutProfessionnel === 'fonctionnaire') {
    conseils.push({
      id: 'statut-fonctionnaire',
      priorite: 3,
      categorie: 'diagnostic',
      titre: 'Profil très apprécié',
      conseil: `En tant que fonctionnaire, vous bénéficiez de conditions privilégiées. Certaines banques (Banque Postale, Crédit Mutuel Enseignant) proposent des offres dédiées.`,
      type: 'succes'
    })
  }

  // ===== CONSEILS GÉOGRAPHIQUES =====

  if (data.surfaceParis < 30 && data.surfaceGrandeCouronne >= 60) {
    conseils.push({
      id: 'geo-opportunite',
      priorite: 3,
      categorie: 'strategie',
      titre: 'Opportunité Grande Couronne',
      conseil: `Votre budget permet ${data.surfaceGrandeCouronne} m² en Seine-et-Marne/Essonne contre ${data.surfaceParis} m² à Paris. Le télétravail rend ces zones attractives.`,
      type: 'optimisation'
    })
  }

  // ===== CONSEIL PTZ =====

  if (CONTEXTE_MARCHE_2026.ptzDisponible && 
      data.situationFoyer === 'celibataire' && 
      data.revenus <= 4500 &&
      data.typeBien === 'neuf') {
    conseils.push({
      id: 'ptz-eligible',
      priorite: 2,
      categorie: 'strategie',
      titre: 'PTZ potentiellement éligible',
      conseil: `Votre profil semble compatible avec le Prêt à Taux Zéro. En zone A bis/A, jusqu'à 100 000 € à 0% sur 25 ans.`,
      impact: 'Économie de plusieurs milliers d\'euros d\'intérêts',
      type: 'succes'
    })
  }

  // Trier par priorité et limiter
  return conseils
    .sort((a, b) => a.priorite - b.priorite)
    .slice(0, 5)
}

// ============================================================================
// GÉNÉRATION DU RÉSUMÉ EXÉCUTIF
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

export function genererConseilsAvances(data: DonneesConseil): ResultatConseilsAvances {
  const diagnostic = genererDiagnosticBancaire(data)
  const conseils = genererConseils(data, diagnostic)
  const scenarios = genererScenarios(data)
  const resumeExecutif = genererResume(data, diagnostic)

  return {
    diagnostic,
    conseils,
    scenarios,
    resumeExecutif
  }
}
