/**
 * Calcul du reste à vivre
 */

import { SIMULATEUR_CONFIG } from '@/config/simulateur.config'
import type { SituationFoyer, VerificationResteAVivre } from '@/types/simulateur'

interface ResteAVivreParams {
  /** Revenus nets mensuels */
  revenusNets: number
  /** Charges mensuelles (hors projet) */
  chargesMensuelles: number
  /** Mensualité du projet immobilier */
  mensualiteProjet: number
}

/**
 * Calcule le reste à vivre mensuel
 *
 * Reste à vivre = Revenus - Charges - Mensualité projet
 *
 * @param params - Paramètres de calcul
 * @returns Reste à vivre en euros
 *
 * @example
 * calculerResteAVivre({ revenusNets: 4000, chargesMensuelles: 200, mensualiteProjet: 1200 })
 * // 2600
 */
export function calculerResteAVivre(params: ResteAVivreParams): number {
  const { revenusNets, chargesMensuelles, mensualiteProjet } = params

  const resteAVivre = revenusNets - chargesMensuelles - mensualiteProjet

  return Math.round(resteAVivre)
}

interface ResteAVivreMinimumParams {
  /** Situation du foyer */
  situationFoyer: SituationFoyer
  /** Nombre d'enfants à charge */
  nombreEnfants: number
}

/**
 * Calcule le reste à vivre minimum recommandé
 *
 * @param params - Situation du foyer
 * @returns Reste à vivre minimum en euros
 *
 * @example
 * calculerResteAVivreMinimum({ situationFoyer: 'couple', nombreEnfants: 2 })
 * // 1800 (1200 + 2×300)
 */
export function calculerResteAVivreMinimum(params: ResteAVivreMinimumParams): number {
  const { situationFoyer, nombreEnfants } = params
  const config = SIMULATEUR_CONFIG.resteAVivre

  const base = situationFoyer === 'celibataire' ? config.celibataire : config.couple
  const enfants = Math.max(0, nombreEnfants) * config.parEnfant

  return base + enfants
}

/**
 * Vérifie si le reste à vivre est suffisant
 *
 * @param resteAVivre - Reste à vivre calculé
 * @param situationFoyer - Situation du foyer
 * @param nombreEnfants - Nombre d'enfants
 * @returns Résultat de la vérification
 */
export function verifierResteAVivre(
  resteAVivre: number,
  situationFoyer: SituationFoyer,
  nombreEnfants: number
): VerificationResteAVivre {
  const minimum = calculerResteAVivreMinimum({ situationFoyer, nombreEnfants })
  const marge = resteAVivre - minimum

  return {
    suffisant: resteAVivre >= minimum,
    montant: resteAVivre,
    minimum,
    marge: Math.round(marge),
  }
}

/**
 * Calcule la mensualité maximale pour respecter le reste à vivre
 *
 * @param revenusNets - Revenus nets
 * @param chargesMensuelles - Charges existantes
 * @param situationFoyer - Situation du foyer
 * @param nombreEnfants - Nombre d'enfants
 * @returns Mensualité maximale
 */
export function calculerMensualiteMaxResteAVivre(
  revenusNets: number,
  chargesMensuelles: number,
  situationFoyer: SituationFoyer,
  nombreEnfants: number
): number {
  const resteAVivreMin = calculerResteAVivreMinimum({ situationFoyer, nombreEnfants })

  // Mensualité max = Revenus - Charges - Reste à vivre minimum
  const mensualiteMax = revenusNets - chargesMensuelles - resteAVivreMin

  return Math.max(0, Math.round(mensualiteMax))
}
