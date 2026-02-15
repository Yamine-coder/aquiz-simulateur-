/**
 * Calcul de la capacité d'achat globale
 */

import type { TypeBien } from '@/types/simulateur'
import { calculerFraisNotaire, calculerPrixMaxPourBudget } from './fraisNotaire'

interface CapaciteAchatParams {
  /** Apport personnel */
  apport: number
  /** Capital empruntable */
  capitalEmpruntable: number
  /** Type de bien */
  typeBien: TypeBien
}

interface CapaciteAchatResult {
  /** Capacité d'achat maximale (prix du bien) */
  capaciteAchatMax: number
  /** Budget total disponible (apport + emprunt) */
  budgetTotal: number
  /** Frais de notaire estimés */
  fraisNotaireEstimes: number
}

/**
 * Calcule la capacité d'achat globale
 *
 * Budget total = Apport + Capacité d'emprunt
 * Capacité d'achat = Prix max du bien après déduction des frais
 *
 * @param params - Paramètres de calcul
 * @returns Capacité d'achat détaillée
 *
 * @example
 * calculerCapaciteAchatGlobale({
 *   apport: 30000,
 *   capitalEmpruntable: 200000,
 *   typeBien: 'ancien'
 * })
 * // { capaciteAchatMax: 212963, budgetTotal: 230000, fraisNotaireEstimes: 17037 }
 */
export function calculerCapaciteAchatGlobale(
  params: CapaciteAchatParams
): CapaciteAchatResult {
  const { apport, capitalEmpruntable, typeBien } = params

  // Budget total disponible
  const budgetTotal = apport + capitalEmpruntable

  // Prix max du bien (budget doit couvrir prix + frais)
  const capaciteAchatMax = calculerPrixMaxPourBudget(budgetTotal, typeBien)

  // Frais de notaire sur ce prix
  const { fraisNotaire } = calculerFraisNotaire(capaciteAchatMax, typeBien)

  return {
    capaciteAchatMax,
    budgetTotal,
    fraisNotaireEstimes: fraisNotaire,
  }
}

/**
 * Vérifie si un bien est dans le budget
 *
 * @param prixBien - Prix du bien ciblé
 * @param apport - Apport disponible
 * @param capaciteEmprunt - Capacité d'emprunt
 * @param typeBien - Type de bien
 * @returns True si le bien est accessible
 */
export function verifierBienDansBudget(
  prixBien: number,
  apport: number,
  capaciteEmprunt: number,
  typeBien: TypeBien
): {
  accessible: boolean
  budgetNecessaire: number
  budgetDisponible: number
  manque: number
} {
  const { fraisNotaire } = calculerFraisNotaire(prixBien, typeBien)
  const budgetNecessaire = prixBien + fraisNotaire
  const budgetDisponible = apport + capaciteEmprunt
  const manque = budgetNecessaire - budgetDisponible

  return {
    accessible: budgetDisponible >= budgetNecessaire,
    budgetNecessaire,
    budgetDisponible,
    manque: Math.max(0, manque),
  }
}

/**
 * Calcule l'apport nécessaire pour un bien donné
 *
 * @param prixBien - Prix du bien
 * @param capaciteEmprunt - Capacité d'emprunt
 * @param typeBien - Type de bien
 * @returns Apport minimum nécessaire
 */
export function calculerApportNecessaire(
  prixBien: number,
  capaciteEmprunt: number,
  typeBien: TypeBien
): number {
  const { fraisNotaire } = calculerFraisNotaire(prixBien, typeBien)
  const coutTotal = prixBien + fraisNotaire
  const apportNecessaire = coutTotal - capaciteEmprunt

  return Math.max(0, Math.round(apportNecessaire))
}
