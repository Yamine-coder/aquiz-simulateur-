/**
 * Configuration marché immobilier — source de vérité unique
 * Mise à jour : Q1 2026
 * À actualiser chaque trimestre ou lors de changements réglementaires
 */

// ============================================================================
// DONNÉES MARCHÉ
// ============================================================================

export const CONTEXTE_MARCHE = {
  /** Taux moyens constatés hors assurance */
  taux: {
    moyen15Ans: 3.25,
    moyen20Ans: 3.45,
    moyen25Ans: 3.55,
  },

  /** 'hausse' | 'baisse' | 'stable' */
  tendance: 'stable' as const,

  /** 'souple' | 'normale' | 'selective' */
  politiqueBancaire: 'selective' as const,

  /** Réglementation HCSF */
  hcsf: {
    seuilMaxEndettement: 35,
    seuilConfort: 30,
    seuilVigilance: 33,
    dureeMaxAns: 25,
  },

  /** Frais de notaire (pourcentage du prix d'achat) */
  fraisNotaire: {
    neuf: 0.025,
    ancien: 0.075,
  },

  /** PTZ (Prêt à Taux Zéro) 2025/2026 */
  ptz: {
    disponible: true,
    /** Plafonds revenus mensuels par nb de personnes (zone A bis/A — IDF) */
    plafondsMensuels: { 1: 4083, 2: 6125, 3: 7350, 4: 8575 } as Record<number, number>,
    /** Montants max PTZ */
    montants: {
      celibataireSansEnfant: 100000,
      celibataireAvecEnfant: 120000,
      coupleSansEnfant: 120000,
      coupleAvecEnfants: 150000,
    },
  },

  /** Taux assurance moyen (%) */
  tauxAssuranceMoyen: 0.34,
} as const

// ============================================================================
// UTILITAIRES FINANCIERS
// ============================================================================

/** Formate un nombre en montant lisible (1234567 → "1 234 567") */
export const formatMontant = (n: number): string =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n))

/** Calcule la mensualité d'un prêt */
export const calculerMensualite = (capital: number, tauxAnnuel: number, dureeAns: number): number => {
  const tauxMensuel = tauxAnnuel / 100 / 12
  const nombreMois = dureeAns * 12
  if (tauxMensuel === 0) return capital / nombreMois
  return capital * tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -nombreMois))
}

/** Calcule le capital empruntable à partir d'une mensualité */
export const calculerCapital = (mensualite: number, tauxAnnuel: number, dureeAns: number): number => {
  const tauxMensuel = tauxAnnuel / 100 / 12
  const nombreMois = dureeAns * 12
  if (tauxMensuel === 0) return mensualite * nombreMois
  return mensualite * (1 - Math.pow(1 + tauxMensuel, -nombreMois)) / tauxMensuel
}

/** Taux de frais de notaire selon le type de bien */
export const getFraisNotaire = (typeBien: string): number =>
  typeBien === 'neuf' ? CONTEXTE_MARCHE.fraisNotaire.neuf : CONTEXTE_MARCHE.fraisNotaire.ancien

// ============================================================================
// ÉLIGIBILITÉ PTZ
// ============================================================================

interface ProfilPTZ {
  situationFoyer: string;
  nombreEnfants: number;
  revenus: number;
  typeBien: string;
}

/**
 * Vérifie l'éligibilité PTZ simplifiée (plafonds 2025/2026 zone IDF)
 * En réalité dépend aussi de la zone géographique exacte et du statut
 * primo-accédant, mais ces infos ne sont pas collectées dans le Mode A.
 */
export function estEligiblePTZ(data: ProfilPTZ): boolean {
  if (!CONTEXTE_MARCHE.ptz.disponible) return false

  const nbPersonnes = (data.situationFoyer === 'couple' ? 2 : 1) + data.nombreEnfants
  const plafond = CONTEXTE_MARCHE.ptz.plafondsMensuels[Math.min(nbPersonnes, 4)] || 8575

  if (data.revenus > plafond) return false

  // Neuf : toujours éligible en IDF (zone A bis / A)
  // Ancien : zones B2/C uniquement — on propose avec mention conditionnelle
  return true
}

/** Montant PTZ maximum selon la composition du foyer */
export function getMontantPTZ(situationFoyer: string, nombreEnfants: number): number {
  const { montants } = CONTEXTE_MARCHE.ptz
  if (situationFoyer === 'couple') {
    return nombreEnfants >= 2 ? montants.coupleAvecEnfants : montants.coupleSansEnfant
  }
  return nombreEnfants >= 1 ? montants.celibataireAvecEnfant : montants.celibataireSansEnfant
}
