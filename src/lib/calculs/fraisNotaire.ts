/**
 * Calcul des frais de notaire
 */

import { SIMULATEUR_CONFIG } from '@/config/simulateur.config'
import type { TypeBien } from '@/types/simulateur'

interface FraisNotaireResult {
  /** Frais de notaire totaux */
  fraisNotaire: number
  /** Taux appliqué */
  tauxApplique: number
  /** Détail des frais */
  detail: {
    droitsMutation: number
    emoluments: number
    debours: number
    fraisDivers: number
  }
}

/**
 * Calcule les frais de notaire selon le type de bien
 *
 * @param prixBien - Prix du bien en euros
 * @param typeBien - Type de bien (neuf ou ancien)
 * @returns Frais de notaire détaillés
 *
 * @example
 * calculerFraisNotaire(200000, 'ancien')
 * // { fraisNotaire: 16000, tauxApplique: 0.08, detail: {...} }
 */
export function calculerFraisNotaire(
  prixBien: number,
  typeBien: TypeBien
): FraisNotaireResult {
  if (prixBien <= 0) {
    return {
      fraisNotaire: 0,
      tauxApplique: 0,
      detail: {
        droitsMutation: 0,
        emoluments: 0,
        debours: 0,
        fraisDivers: 0,
      },
    }
  }

  const tauxApplique =
    typeBien === 'neuf'
      ? SIMULATEUR_CONFIG.fraisNotaireNeuf
      : SIMULATEUR_CONFIG.fraisNotaireAncien

  // Calcul simplifié
  const fraisNotaire = Math.round(prixBien * tauxApplique)

  // Détail approximatif (pour affichage)
  const detail =
    typeBien === 'neuf'
      ? {
          droitsMutation: Math.round(prixBien * 0.007), // TVA réduite
          emoluments: Math.round(prixBien * 0.01),
          debours: Math.round(prixBien * 0.005),
          fraisDivers: Math.round(prixBien * 0.003),
        }
      : {
          droitsMutation: Math.round(prixBien * 0.058), // Droits d'enregistrement
          emoluments: Math.round(prixBien * 0.01),
          debours: Math.round(prixBien * 0.007),
          fraisDivers: Math.round(prixBien * 0.005),
        }

  return {
    fraisNotaire,
    tauxApplique,
    detail,
  }
}

/**
 * Calcule le coût total d'acquisition (prix + frais)
 *
 * @param prixBien - Prix du bien
 * @param typeBien - Type de bien
 * @returns Coût total
 */
export function calculerCoutTotalAcquisition(prixBien: number, typeBien: TypeBien): number {
  const { fraisNotaire } = calculerFraisNotaire(prixBien, typeBien)
  return prixBien + fraisNotaire
}

/**
 * Calcule le prix maximum du bien pour un budget donné
 * (inverse : budget = prix + frais)
 *
 * @param budgetTotal - Budget total disponible
 * @param typeBien - Type de bien
 * @returns Prix maximum du bien
 */
export function calculerPrixMaxPourBudget(budgetTotal: number, typeBien: TypeBien): number {
  const tauxFrais =
    typeBien === 'neuf'
      ? SIMULATEUR_CONFIG.fraisNotaireNeuf
      : SIMULATEUR_CONFIG.fraisNotaireAncien

  // budget = prix × (1 + tauxFrais)
  // donc prix = budget / (1 + tauxFrais)
  return Math.round(budgetTotal / (1 + tauxFrais))
}
