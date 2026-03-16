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
    titre: 'Dossier solide — vous avez la main',
    conseil: `Votre dossier se situe dans le haut du spectre (${d.scoreFaisabilite}/100). Concrètement, cela signifie que vous êtes en position de force face aux banques. Ne signez pas la première offre : demandez systématiquement une contre-proposition avec un taux réduit de 0.10% à 0.20%. Sur ${d.dureeAns} ans, c'est ~${formatMontant(d.capitalEmpruntable * 0.0015 * d.dureeAns)} € d'économie — sans effort supplémentaire.`,
    impact: `Marge de négociation : -0.15% sur le taux, soit ~${formatMontant(d.capitalEmpruntable * 0.0015 * d.dureeAns)} €`,
    action: {
      label: 'Mettre en concurrence 3 banques minimum',
      timeline: 'Dès le premier rendez-vous',
      gain: 'Obtenir les conditions premium',
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
    titre: 'Projet cohérent — quelques leviers à activer',
    conseil: `Score de ${d.scoreFaisabilite}/100 : le projet tient, mais vous n'obtiendrez pas automatiquement les meilleures conditions. La différence entre un taux moyen et un bon taux se joue sur la mise en concurrence. En passant par un courtier ou en démarchant 3 à 4 établissements, vous pouvez gagner 0.10% à 0.15% — c'est ~${formatMontant(d.capitalEmpruntable * 0.001 * d.dureeAns)} € sur la durée du crédit.`,
    impact: `Économie réaliste : ${formatMontant(d.capitalEmpruntable * 0.001 * d.dureeAns)} € en faisant jouer la concurrence`,
    action: {
      label: 'Solliciter un courtier ou comparer 3 banques',
      timeline: 'Avant toute offre signée',
      gain: 'Taux optimisé',
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
    titre: 'Dossier finançable mais à structurer',
    conseil: `Avec un score de ${d.scoreFaisabilite}/100, le projet est accessible mais certaines banques seront sélectives. Le sujet n'est pas de savoir si vous pouvez emprunter, mais à quelles conditions. Un courtier spécialisé saura orienter votre dossier vers les établissements les plus réceptifs à votre profil — là où vous avez un risque de perte de temps en démarchant seul.`,
    action: {
      label: 'Faire évaluer le dossier par un courtier',
      timeline: 'Avant de démarcher les banques',
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
    titre: 'Projet à reporter ou réajuster',
    conseil: `Score de ${d.scoreFaisabilite}/100 : en l'état, la majorité des banques ne donneront pas suite. Ce n'est pas un verdict définitif, mais un constat de timing. Le plus efficace : stabiliser votre situation sur 6 à 12 mois (épargne, emploi, réduction de charges) puis revenir avec un dossier restructuré. Un courtier spécialisé en dossiers complexes peut identifier les rares établissements accessibles aujourd'hui — mais attendez d'avoir au moins un des leviers mentionnés ci-dessous.`,
    action: {
      label: 'Stabiliser le profil avant de démarcher',
      timeline: '6-12 mois de préparation',
      gain: 'Passer de refus à étude sérieuse',
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
    titre: 'Apport zéro : le principal obstacle du dossier',
    conseil: `Sans aucun apport, vous demandez un financement à 110% (prix + frais de notaire de ${d.typeBien === 'neuf' ? '2-3%' : '7-8%'}). Moins de 5% des banques acceptent ce type de montage, et uniquement pour des profils exceptionnels (CDI cadre, revenus élevés, épargne résiduelle). Le levier le plus rapide : un don familial acté notarié ou une épargne bloquée de ${formatMontant(Math.round(d.prixAchat * 0.10))} € (10%). Sans cela, le dossier sera systématiquement rejeté en l'état.`,
    impact: 'Passer de « rejet quasi-systématique » à « dossier recevable »',
    action: {
      label: 'Constituer un apport minimum de 10%',
      timeline: `Objectif : ${formatMontant(Math.round(d.prixAchat * 0.10))} €`,
      gain: 'Rendre le financement possible',
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
    const pctActuel = d.prixAchat > 0 ? Math.round((d.apport / d.prixAchat) * 100) : 0
    const montantManquant = Math.round(d.prixAchat * 0.10 - d.apport)
    const epargneMensuelle = Math.round(d.revenus * 0.15)
    const moisEpargne = epargneMensuelle > 0 ? Math.ceil(montantManquant / epargneMensuelle) : 0
    return {
      categorie: 'action',
      titre: 'Apport insuffisant : le verrou du dossier',
      conseil: `Avec ${formatMontant(d.apport)} € d'apport (${pctActuel}%), vous ne couvrez pas les frais de notaire. C'est le premier point de blocage que les banques vont relever. Le seuil minimal pour que le dossier soit étudié sérieusement : 10% du prix, soit ${formatMontant(Math.round(d.prixAchat * 0.10))} €. Il manque ${formatMontant(montantManquant)} €. Le levier concret : mobiliser un don familial acté par notaire, ou constituer cette épargne sur ${moisEpargne} mois en bloquant ~${formatMontant(epargneMensuelle)} €/mois (15% de vos revenus).`,
      impact: `Déblocage de l'accès à ${diag.banquesRecommandees.length + 2} banques supplémentaires`,
      action: {
        label: `Épargner ${formatMontant(epargneMensuelle)} €/mois ou don familial`,
        timeline: `${moisEpargne} mois`,
        gain: 'Dossier finançable',
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
    const pctActuel = d.prixAchat > 0 ? Math.round((d.apport / d.prixAchat) * 100) : 0
    return {
      categorie: 'action',
      titre: 'Apport correct — un palier de plus change la donne',
      conseil: `À ${pctActuel}%, vous couvrez les frais de notaire : c'est le minimum. Mais à 20%, vous basculez dans une catégorie de dossier différente aux yeux des banques — celle où elles proposent leurs meilleurs taux spontanément, sans négociation. Il faudrait ${formatMontant(pour20pourcent)} € de plus. Ce n'est pas bloquant en l'état, mais c'est un levier sous-exploité.`,
      impact: `Accès aux taux « premium » : -0.10% à -0.20%, soit ~${formatMontant(d.capitalEmpruntable * 0.0015 * d.dureeAns)} € d'économie`,
      action: {
        label: 'Compléter l\'apport à 20%',
        gain: 'Conditions de financement optimales',
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
    const pct = d.prixAchat > 0 ? Math.round((d.apport / d.prixAchat) * 100) : 0
    return {
      categorie: 'diagnostic',
      titre: 'Apport solide — atout majeur du dossier',
      conseil: `${pct}% d'apport : vous dépassez le seuil de confort des banques. C'est un signal fort qui pèse dans la négociation du taux et facilite l'acceptation du dossier, même si d'autres critères sont moyens.`,
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
      titre: 'Endettement hors norme : le dossier est bloqué',
      conseil: `À ${d.tauxEndettement.toFixed(1)}%, vous dépassez le plafond HCSF de 35%. Ce n'est pas une recommandation bancaire, c'est une obligation réglementaire : aucune banque ne peut légalement financer ce dossier en l'état. Deux leviers : réduire votre mensualité cible de ${formatMontant(reduction)} €/mois (en diminuant le budget ou en allongeant la durée), ou augmenter vos revenus pris en compte (co-emprunteur, revenus complémentaires justifiables).`,
      impact: 'Bloqueur réglementaire — à résoudre avant toute démarche',
      action: {
        label: `Réduire la mensualité de ${formatMontant(reduction)} € ou revoir le budget`,
        timeline: 'Préalable obligatoire',
        gain: 'Passage sous le seuil légal',
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
      titre: 'Endettement en zone limite HCSF',
      conseil: `À ${d.tauxEndettement.toFixed(1)}%, vous êtes techniquement sous le plafond de 35%, mais sans marge de manœuvre. Le moindre ajustement — hausse de taux entre la simulation et l'offre, charges imprévues, assurance plus chère — peut faire basculer le dossier. Les banques raisonnent en « endettement résiduel après projet » et ici, chaque euro compte. Réduire de ${formatMontant(reduction)} €/mois la mensualité stabiliserait le ratio autour de 33%.`,
      impact: 'Sécuriser le dossier face aux aléas entre simulation et offre finale',
      action: {
        label: `Viser 33% en réduisant de ${formatMontant(reduction)} €/mois`,
        gain: 'Marge de sécurité HCSF',
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
    conseil: `${d.tauxEndettement.toFixed(1)}% d'endettement : vous restez sous le seuil HCSF avec une marge raisonnable. À noter : certaines banques premium (en ligne ou mutualistes) appliquent un seuil interne de 30% pour leurs meilleures offres. Ce n'est pas un frein, mais un point de négociation.`,
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
    titre: 'Endettement maîtrisé — signal positif',
    conseil: `${d.tauxEndettement.toFixed(1)}% d'endettement avec ${formatMontant(d.resteAVivre - d.resteAVivreMin)} € de marge mensuelle au-delà du minimum requis. C'est un des meilleurs arguments du dossier : il démontre que le projet ne met pas votre budget sous tension.`,
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
    titre: 'Intérimaire : un parcours spécifique mais pas impossible',
    conseil: `L'intérim est le statut le plus scruté par les banques. Concrètement, elles exigent : 2 à 3 ans d'ancienneté dans le même secteur, des relevés de missions régulières (pas de « trous » de plus de 2 mois), et un apport d'au minimum 15-20%. Votre reste à vivre sera analysé sur la base de la moyenne des revenus des 24 derniers mois, pas du dernier bulletin. Le dossier type à préparer : 3 dernières années de contrats de mission, bulletins de paie, relevés bancaires sans incidents, et attestation Pôle Emploi si applicable.`,
    action: {
      label: 'Rassembler 3 ans de preuves de missions régulières',
      timeline: 'Minimum 24 mois de relevés continus',
      gain: 'Démontrer la stabilité des revenus',
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
  generer: (d) => {
    const apportPct = d.prixAchat > 0 ? Math.round((d.apport / d.prixAchat) * 100) : 0
    return {
      categorie: 'action',
      titre: 'CDD : un statut qui impose un dossier irréprochable',
      conseil: `En CDD, les banques croisent systématiquement votre statut avec les autres critères du dossier (apport, endettement, reste à vivre). ${apportPct < 15 ? `Avec seulement ${apportPct}% d'apport, le cumul CDD + apport faible est un signal négatif fort — c'est souvent ce croisement qui entraîne le refus, plus que le CDD seul.` : 'Votre apport compense partiellement, ce qui est un bon point.'} Le dossier à constituer : contrats des 3 dernières années, preuves de renouvellements successifs, attestation employeur mentionnant la perspective de CDI si applicable. Un co-emprunteur en CDI transformerait la lecture du dossier.`,
      action: {
        label: 'Constituer le dossier renforcé CDD',
        timeline: 'Avant toute démarche bancaire',
        gain: 'Compenser la fragilité du statut',
      },
      type: 'amelioration',
    }
  },
}

const statutIndependant: RegleConseil = {
  id: 'statut-independant',
  groupe: 'statut',
  priorite: 2,
  poids: 75,
  condition: (d) => d.statutProfessionnel === 'independant',
  generer: () => ({
    categorie: 'action',
    titre: 'Indépendant : les banques regardent vos bilans, pas votre CA',
    conseil: `En tant que TNS, les banques retiennent la moyenne de vos 3 derniers résultats nets (pas le chiffre d'affaires). Si votre activité est récente (< 3 ans), la plupart des établissements traditionnels ne pourront pas instruire le dossier — orientez-vous vers les banques habituées aux profils entrepreneuriaux (Banque Populaire, CIC, courtiers spécialisés). Le dossier type : 3 dernières liasses fiscales (2035 ou 2031), bilans comptables certifiés, extrait Kbis à jour, derniers avis d'imposition personnels.`,
    action: {
      label: 'Rassembler liasses fiscales + bilans 3 ans',
      timeline: '1-2 semaines avant le premier RDV',
      gain: 'Dossier complet dès le premier contact',
    },
    type: 'amelioration',
  }),
}

const statutRetraiteCritique: RegleConseil = {
  id: 'statut-retraite-critique',
  groupe: 'statut',
  priorite: 1,
  poids: 100,
  condition: (d) => d.statutProfessionnel === 'retraite' && (d.age + d.dureeAns) > 80,
  generer: (d) => {
    const ageFinPret = d.age + d.dureeAns
    const dureeMax = Math.max(80 - d.age, 10)
    return {
      categorie: 'action',
      titre: 'Âge en fin de prêt : bloqueur assurance',
      conseil: `Fin de prêt à ${ageFinPret} ans : au-delà de 80 ans, la quasi-totalité des assureurs refusent la couverture ou appliquent des surprimes qui rendent le crédit non viable économiquement. Or sans assurance emprunteur, pas de prêt. La solution : réduire la durée à ${dureeMax} ans maximum et compenser par un apport plus important. En parallèle, explorez les assurances en délégation (Magnolia, April, Cardif) qui couvrent parfois jusqu'à 85 ans — mais à des tarifs qu'il faut chiffrer précisément.`,
      impact: 'Bloqueur — sans assurance, aucune banque ne prêtera',
      action: {
        label: `Passer à ${dureeMax} ans + devis assurance déléguée`,
        timeline: 'Préalable obligatoire',
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
      titre: 'Retraité : un profil stable, une stratégie à adapter',
      conseil: `Revenus de pension stables et prévisibles : c'est un atout que les banques valorisent. Avec une durée de ${d.dureeAns} ans (fin à ${ageFinPret} ans), le dossier est cohérent côté assurabilité. Le principal levier d'économie ici : l'assurance emprunteur. Les contrats groupe des banques sont systématiquement plus chers pour les profils seniors. En passant par une délégation d'assurance, vous pouvez économiser 40 à 60% sur ce poste — c'est souvent plusieurs milliers d'euros sur la durée du prêt.`,
      action: {
        label: 'Comparer les assurances en délégation avant signature',
        timeline: 'Avant la signature de l\'offre de prêt',
        gain: '40-60% d\'économie sur l\'assurance',
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
    titre: 'Fonctionnaire : le statut le plus valorisé par les banques',
    conseil: `Le statut fonctionnaire est considéré comme le plus sécurisant par les établissements bancaires : emploi garanti à vie, revenus prévisibles, quasi-absence de risque de défaut. Certaines banques proposent des offres dédiées (Banque Postale, Crédit Mutuel Enseignant, Casden). C'est un atout structurel qui compense d'éventuelles faiblesses sur d'autres critères.`,
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
    titre: 'CDI : le critère n°1 est coché',
    conseil: `Le CDI reste le premier filtre des banques. Si vous avez passé votre période d'essai, ce point est acquis — il ne sera pas un sujet de discussion. Le dossier à avoir : 3 derniers bulletins de paie, attestation employeur récente mentionnant CDI + ancienneté, dernier avis d'imposition. Ce sont des éléments standards mais leur absence retarde systématiquement l'instruction.`,
    action: {
      label: 'Préparer attestation employeur + 3 bulletins',
      timeline: 'Avant le premier RDV banque',
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
    return ageFinPret > 70 && ageFinPret <= 75 && d.statutProfessionnel !== 'retraite'
  },
  generer: (d) => {
    const ageFinPret = d.age + d.dureeAns
    return {
      categorie: 'action',
      titre: 'Assurance emprunteur : anticiper le surcoût lié à l\'âge',
      conseil: `Fin de prêt à ${ageFinPret} ans : les contrats d'assurance groupe des banques appliquent des surprimes significatives au-delà de 65 ans en fin de prêt. La délégation d'assurance (Magnolia, April, Cardif) coûte en moyenne 40 à 50% moins cher pour votre tranche d'âge. Sur la durée du crédit, c'est une économie de ~${formatMontant(d.capitalEmpruntable * 0.003 * d.dureeAns)} €. C'est un poste souvent négligé mais qui pèse dans le coût total de l'opération.`,
      impact: `Économie estimée : ${formatMontant(d.capitalEmpruntable * 0.003 * d.dureeAns)} € sur l'assurance`,
      action: {
        label: 'Demander 2-3 devis en délégation d\'assurance',
        timeline: 'Avant la signature de l\'offre de prêt',
        gain: '40-50% d\'économie sur l\'assurance',
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
      titre: 'Réduire à 20 ans : un arbitrage à chiffrer',
      conseil: `Vous empruntez sur 25 ans, ce qui vous donne le budget maximum. Mais les banques proposent un meilleur taux sur 20 ans (-0.10% en moyenne). La contrepartie : une mensualité plus élevée. L'économie totale serait de ~${formatMontant(economie)} € sur le coût du crédit. Si votre reste à vivre le permet, c'est un arbitrage pertinent — mais seulement si la mensualité reste confortable au quotidien.`,
      impact: `Économie sur le coût total : ${formatMontant(economie)} €`,
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
      titre: 'PTZ : le premier levier à activer',
      conseil: d.typeBien === 'neuf'
        ? `Votre profil est compatible avec le Prêt à Taux Zéro — jusqu'à ${formatMontant(montant)} € à 0% d'intérêts. C'est un dispositif d'État qui réduit directement le coût de votre crédit de ~${formatMontant(economie)} €. Il se monte en complément du prêt principal et bénéficie d'un différé de remboursement. C'est le levier le plus rentable disponible pour votre profil — à intégrer dès le montage du dossier.`
        : `Le PTZ est désormais accessible dans l'ancien en zones B2 et C, sous conditions de travaux (25% du montant de l'opération). Jusqu'à ${formatMontant(montant)} € à 0% d'intérêts avec un différé de remboursement pouvant aller jusqu'à 15 ans. L'économie d'intérêts estimée : ~${formatMontant(economie)} €. C'est un dispositif souvent méconnu pour l'ancien — vérifiez votre éligibilité précise sur anil.org.`,
      impact: `Économie d'intérêts : ~${formatMontant(economie)} €`,
      action: {
        label: 'Vérifier l\'éligibilité complète sur anil.org',
        timeline: 'Avant le montage du dossier bancaire',
        gain: `${formatMontant(montant)} € à 0% d'intérêts`,
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
    titre: 'Grande Couronne : un arbitrage surface/localisation à considérer',
    conseil: `Votre budget vous donne accès à ~${d.surfaceParis} m² à Paris intra-muros, contre ~${d.surfaceGrandeCouronne} m² en Seine-et-Marne ou Essonne. L'écart est significatif. Si votre activité professionnelle permet du télétravail partiel, la Grande Couronne offre un rapport surface/prix nettement plus favorable — avec des communes bien desservies par le RER (Melun, Évry, Meaux). Ce n'est pas un conseil de « descendre en gamme », c'est un arbitrage immobilier rationnel.`,
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
    titre: 'Contexte de marché : taux stables, pas d\'urgence',
    conseil: `Les taux immobiliers sont actuellement stables autour de ${CONTEXTE_MARCHE.taux.moyen20Ans}% sur 20 ans. Ce contexte est favorable pour prendre le temps de structurer votre dossier sans subir de pression de timing. Ni les taux ni les prix ne sont en mouvement brutal — c'est le bon moment pour avancer à votre rythme, en consolidant chaque point faible identifié avant de démarcher les banques.`,
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
