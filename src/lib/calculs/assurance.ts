/**
 * Calcul de l'assurance emprunteur
 */

import { SIMULATEUR_CONFIG } from '@/config/simulateur.config'

interface AssuranceResult {
  /** Mensualité de l'assurance */
  mensualiteAssurance: number
  /** Coût total de l'assurance sur la durée */
  coutTotalAssurance: number
  /** Taux annuel appliqué */
  tauxAnnuel: number
}

/**
 * Calcule l'assurance emprunteur
 *
 * Mode de calcul : sur capital initial (le plus courant)
 *
 * @param capitalEmprunte - Capital emprunté
 * @param dureeAns - Durée du prêt en années
 * @param tauxAssurance - Taux d'assurance annuel (optionnel, défaut 0.34%)
 * @returns Détails de l'assurance
 *
 * @example
 * calculerAssuranceEmprunteur(200000, 20)
 * // { mensualiteAssurance: 56.67, coutTotalAssurance: 13600, tauxAnnuel: 0.0034 }
 */
export function calculerAssuranceEmprunteur(
  capitalEmprunte: number,
  dureeAns: number,
  tauxAssurance: number = SIMULATEUR_CONFIG.tauxAssuranceMoyen
): AssuranceResult {
  if (capitalEmprunte <= 0 || dureeAns <= 0) {
    return {
      mensualiteAssurance: 0,
      coutTotalAssurance: 0,
      tauxAnnuel: tauxAssurance,
    }
  }

  // Calcul sur capital initial
  const coutAnnuel = capitalEmprunte * tauxAssurance
  const mensualiteAssurance = coutAnnuel / 12
  const coutTotalAssurance = coutAnnuel * dureeAns

  return {
    mensualiteAssurance: Math.round(mensualiteAssurance * 100) / 100,
    coutTotalAssurance: Math.round(coutTotalAssurance),
    tauxAnnuel: tauxAssurance,
  }
}

/**
 * Calcule le TAEA (Taux Annuel Effectif de l'Assurance)
 *
 * @param capitalEmprunte - Capital emprunté
 * @param coutTotalAssurance - Coût total de l'assurance
 * @param dureeAns - Durée du prêt
 * @returns TAEA en pourcentage
 */
export function calculerTAEA(
  capitalEmprunte: number,
  coutTotalAssurance: number,
  dureeAns: number
): number {
  if (capitalEmprunte <= 0 || dureeAns <= 0) return 0

  // TAEA simplifié = (coût total / capital) / durée
  const taea = (coutTotalAssurance / capitalEmprunte / dureeAns) * 100

  return Math.round(taea * 100) / 100
}

/**
 * Compare différentes offres d'assurance
 *
 * @param capitalEmprunte - Capital emprunté
 * @param dureeAns - Durée du prêt
 * @param tauxOptions - Liste des taux à comparer
 * @returns Comparaison des options
 */
export function comparerAssurances(
  capitalEmprunte: number,
  dureeAns: number,
  tauxOptions: number[] = [0.0020, 0.0034, 0.0045]
): AssuranceResult[] {
  return tauxOptions.map((taux) =>
    calculerAssuranceEmprunteur(capitalEmprunte, dureeAns, taux)
  )
}
