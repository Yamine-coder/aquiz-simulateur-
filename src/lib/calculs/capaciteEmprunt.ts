/**
 * Calcul de la capacité d'emprunt
 */

import { SIMULATEUR_CONFIG } from '@/config/simulateur.config'
import { calculerMensualiteMaximale } from './endettement'
import { calculerCapitalDepuisMensualite } from './mensualite'

interface CapaciteEmpruntParams {
  /** Revenus nets mensuels */
  revenusNets: number
  /** Charges mensuelles existantes */
  chargesMensuelles: number
  /** Durée du prêt en années */
  dureeAns: number
  /** Taux d'intérêt annuel */
  tauxAnnuel: number
  /** Taux d'endettement max (optionnel, défaut 35%) */
  tauxEndettementMax?: number
}

interface CapaciteEmpruntResult {
  /** Capital empruntable maximum */
  capacite: number
  /** Mensualité maximale correspondante */
  mensualiteMax: number
  /** Facteur d'annuité utilisé */
  facteurAnnuite: number
}

/**
 * Calcule la capacité d'emprunt maximale
 *
 * @param params - Paramètres de calcul
 * @returns Capacité d'emprunt et mensualité max
 *
 * @example
 * calculerCapaciteEmprunt({
 *   revenusNets: 4000,
 *   chargesMensuelles: 200,
 *   dureeAns: 20,
 *   tauxAnnuel: 0.035
 * })
 * // { capacite: 240000, mensualiteMax: 1200, facteurAnnuite: 200 }
 */
export function calculerCapaciteEmprunt(params: CapaciteEmpruntParams): CapaciteEmpruntResult {
  const {
    revenusNets,
    chargesMensuelles,
    dureeAns,
    tauxAnnuel,
    tauxEndettementMax = SIMULATEUR_CONFIG.tauxEndettementMax,
  } = params

  // Calcul de la mensualité maximale selon l'endettement
  const mensualiteMax = calculerMensualiteMaximale(revenusNets, chargesMensuelles, tauxEndettementMax)

  // Calcul du capital empruntable
  const capacite = calculerCapitalDepuisMensualite(mensualiteMax, tauxAnnuel, dureeAns)

  // Calcul du facteur d'annuité (capital / mensualité)
  const facteurAnnuite = mensualiteMax > 0 ? Math.round(capacite / mensualiteMax) : 0

  return {
    capacite,
    mensualiteMax,
    facteurAnnuite,
  }
}

/**
 * Calcule la capacité d'emprunt pour différentes durées
 *
 * @param revenusNets - Revenus nets mensuels
 * @param chargesMensuelles - Charges existantes
 * @param tauxAnnuel - Taux d'intérêt
 * @returns Tableau des capacités par durée
 */
export function calculerCapacitesParDuree(
  revenusNets: number,
  chargesMensuelles: number,
  tauxAnnuel: number
): { dureeAns: number; capacite: number; mensualite: number }[] {
  const durees = [10, 15, 20, 25]

  return durees.map((dureeAns) => {
    const { capacite, mensualiteMax } = calculerCapaciteEmprunt({
      revenusNets,
      chargesMensuelles,
      dureeAns,
      tauxAnnuel,
    })

    return {
      dureeAns,
      capacite,
      mensualite: mensualiteMax,
    }
  })
}

/**
 * Trouve la durée optimale pour un montant cible
 *
 * @param montantCible - Montant souhaité
 * @param revenusNets - Revenus nets
 * @param chargesMensuelles - Charges
 * @param tauxAnnuel - Taux
 * @returns Durée optimale ou null si impossible
 */
export function trouverDureeOptimale(
  montantCible: number,
  revenusNets: number,
  chargesMensuelles: number,
  tauxAnnuel: number
): { dureeAns: number; mensualite: number } | null {
  const { dureeMinAns, dureeMaxAns } = SIMULATEUR_CONFIG

  for (let duree = dureeMinAns; duree <= dureeMaxAns; duree++) {
    const { capacite, mensualiteMax } = calculerCapaciteEmprunt({
      revenusNets,
      chargesMensuelles,
      dureeAns: duree,
      tauxAnnuel,
    })

    if (capacite >= montantCible) {
      return { dureeAns: duree, mensualite: mensualiteMax }
    }
  }

  return null
}
