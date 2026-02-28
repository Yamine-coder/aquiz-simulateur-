/**
 * Calcul du TAEG (Taux Annuel Effectif Global)
 */

import { calculerAssuranceEmprunteur } from './assurance'
import { calculerMensualite } from './mensualite'

interface TAEGParams {
  /** Capital emprunté */
  capital: number
  /** Taux d'intérêt nominal annuel */
  tauxNominal: number
  /** Durée du prêt en années */
  dureeAns: number
  /** Frais de dossier */
  fraisDossier?: number
  /** Frais de garantie (hypothèque ou caution) */
  fraisGarantie?: number
  /** Taux d'assurance annuel */
  tauxAssurance?: number
}

interface TAEGResult {
  /** TAEG en pourcentage */
  taeg: number
  /** Coût total du crédit */
  coutTotal: number
  /** Détail des coûts */
  detail: {
    interets: number
    assurance: number
    fraisDossier: number
    fraisGarantie: number
  }
}

/**
 * Calcule le TAEG (Taux Annuel Effectif Global)
 *
 * Le TAEG inclut tous les frais obligatoires du crédit.
 *
 * @param params - Paramètres du calcul
 * @returns TAEG et détail des coûts
 *
 * @example
 * calculerTAEG({
 *   capital: 200000,
 *   tauxNominal: 0.035,
 *   dureeAns: 20,
 *   fraisDossier: 500,
 *   fraisGarantie: 2000
 * })
 */
export function calculerTAEG(params: TAEGParams): TAEGResult {
  const {
    capital,
    tauxNominal,
    dureeAns,
    fraisDossier = 0,
    fraisGarantie = 0,
    tauxAssurance,
  } = params

  if (capital <= 0 || dureeAns <= 0) {
    return {
      taeg: 0,
      coutTotal: 0,
      detail: {
        interets: 0,
        assurance: 0,
        fraisDossier: 0,
        fraisGarantie: 0,
      },
    }
  }

  // Mensualité crédit hors assurance
  const mensualiteCredit = calculerMensualite(capital, tauxNominal, dureeAns)
  const totalCredit = mensualiteCredit * dureeAns * 12
  const interets = totalCredit - capital

  // Assurance
  const { coutTotalAssurance } = calculerAssuranceEmprunteur(capital, dureeAns, tauxAssurance)

  // Coût total
  const coutTotal = interets + coutTotalAssurance + fraisDossier + fraisGarantie

  // Calcul TAEG simplifié (approximation)
  // TAEG = (coût total / capital / durée) × 100
  // Cette formule est une approximation, le vrai calcul nécessite une résolution itérative
  const taegApprox = ((coutTotal / capital) / dureeAns) * 100

  // Ajustement pour se rapprocher du vrai TAEG
  const taeg = tauxNominal * 100 + (taegApprox - (interets / capital / dureeAns) * 100)

  return {
    taeg: Math.round(taeg * 100) / 100,
    coutTotal: Math.round(coutTotal),
    detail: {
      interets: Math.round(interets),
      assurance: Math.round(coutTotalAssurance),
      fraisDossier,
      fraisGarantie,
    },
  }
}

/**
 * Vérifie si le TAEG dépasse le taux d'usure
 *
 * @param taeg - TAEG calculé
 * @param tauxUsure - Taux d'usure en vigueur (ex: 5.48% — T1 2026, prêts ≥20 ans)
 * @returns True si le TAEG est valide
 */
export function verifierTauxUsure(taeg: number, tauxUsure: number = 5.48): boolean {
  return taeg <= tauxUsure
}

/**
 * Calcule les frais de garantie estimés
 *
 * @param capital - Capital emprunté
 * @param typeGarantie - Type de garantie
 * @returns Frais de garantie estimés
 */
export function estimerFraisGarantie(
  capital: number,
  typeGarantie: 'hypotheque' | 'caution' = 'caution'
): number {
  if (capital <= 0) return 0

  // Estimations moyennes
  const taux = typeGarantie === 'hypotheque' ? 0.015 : 0.012

  return Math.round(capital * taux)
}
