/**
 * Calcul du taux d'endettement
 * Norme HCSF : max 35%
 */

import { SIMULATEUR_CONFIG } from '@/config/simulateur.config'
import type { NiveauEndettement, VerificationEndettement } from '@/types/simulateur'

/**
 * Calcule le taux d'endettement
 *
 * @param revenusNets - Revenus nets mensuels en euros
 * @param chargesMensuelles - Charges mensuelles existantes en euros
 * @param mensualiteProjet - Mensualité du projet immobilier en euros
 * @returns Taux d'endettement en pourcentage (0-100)
 *
 * @example
 * calculerTauxEndettement(3000, 200, 800) // 33.33
 */
export function calculerTauxEndettement(
  revenusNets: number,
  chargesMensuelles: number,
  mensualiteProjet: number
): number {
  // Validation des entrées
  if (revenusNets <= 0) return 0
  if (chargesMensuelles < 0 || mensualiteProjet < 0) {
    throw new Error('Les charges et mensualités ne peuvent être négatives')
  }

  // Calcul
  const chargesTotal = chargesMensuelles + mensualiteProjet
  const taux = (chargesTotal / revenusNets) * 100

  // Arrondi à 2 décimales
  return Math.round(taux * 100) / 100
}

/**
 * Vérifie si le taux d'endettement est acceptable
 *
 * @param tauxEndettement - Taux d'endettement en pourcentage
 * @returns Résultat de la vérification avec niveau et message
 */
export function verifierEndettement(tauxEndettement: number): VerificationEndettement {
  const tauxMax = SIMULATEUR_CONFIG.tauxEndettementMax * 100
  const tauxAlerte = SIMULATEUR_CONFIG.tauxEndettementAlerte * 100
  const depassement = tauxEndettement - tauxMax

  let niveau: NiveauEndettement
  let valide: boolean
  let message: string

  if (tauxEndettement <= tauxAlerte) {
    niveau = 'ok'
    valide = true
    message = 'Taux d\'endettement confortable'
  } else if (tauxEndettement <= tauxMax) {
    niveau = 'limite'
    valide = true
    message = 'Taux d\'endettement à la limite du seuil réglementaire'
  } else {
    niveau = 'depassement'
    valide = false
    message = `Taux d'endettement dépassé de ${depassement.toFixed(1)}% (max ${tauxMax}%)`
  }

  return {
    valide,
    niveau,
    depassement: Math.round(depassement * 100) / 100,
    message,
  }
}

/**
 * Calcule la mensualité maximale acceptable
 *
 * @param revenusNets - Revenus nets mensuels
 * @param chargesMensuelles - Charges existantes
 * @param tauxEndettementMax - Taux max (par défaut 35%)
 * @returns Mensualité maximale en euros
 */
export function calculerMensualiteMaximale(
  revenusNets: number,
  chargesMensuelles: number,
  tauxEndettementMax: number = SIMULATEUR_CONFIG.tauxEndettementMax
): number {
  if (revenusNets <= 0) return 0

  const mensualiteMax = revenusNets * tauxEndettementMax - chargesMensuelles
  return Math.max(0, Math.round(mensualiteMax))
}
