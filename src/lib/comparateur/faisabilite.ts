/**
 * Calcul de faisabilité d'un bien par rapport au budget
 * Utilisé dans le comparateur et les annonces cards
 */

import { SIMULATEUR_CONFIG } from '@/config/simulateur.config'
import { calculerMensualite, estimerFraisNotaire } from '@/lib/comparateur/financier'
import type { AnalyseFaisabilite } from '@/types/annonces'

/**
 * Calcule la faisabilité d'une annonce par rapport au budget utilisateur.
 * 
 * @param prix - Prix du bien en euros
 * @param budgetMax - Budget maximum en euros (null si non défini)
 * @returns Analyse de faisabilité ou undefined si pas de budget
 */
export function calculerFaisabilite(
  prix: number,
  budgetMax: number | null,
  anneeConstruction?: number
): AnalyseFaisabilite | undefined {
  if (!budgetMax) return undefined

  // Frais notaire selon neuf/ancien (2.5% vs 7.5%)
  const { montant: fraisNotaire } = estimerFraisNotaire(prix, anneeConstruction)

  // Coût total = prix + frais de notaire (ce que l'acheteur doit réellement financer)
  const coutTotal = prix + fraisNotaire
  const ecart = budgetMax - coutTotal
  const pourcentage = Math.round((coutTotal / budgetMax) * 100)

  let niveau: 'confortable' | 'limite' | 'impossible'
  let message: string

  if (pourcentage <= 90) {
    niveau = 'confortable'
    message = `Dans votre budget avec une marge de ${ecart.toLocaleString('fr-FR')} € (frais notaire inclus)`
  } else if (pourcentage <= 105) {
    niveau = 'limite'
    message = pourcentage <= 100
      ? `Proche de votre budget max (${pourcentage}% frais inclus)`
      : `Légèrement au-dessus (+${Math.abs(ecart).toLocaleString('fr-FR')} € frais inclus)`
  } else {
    niveau = 'impossible'
    message = `Dépasse votre budget de ${Math.abs(ecart).toLocaleString('fr-FR')} € (frais notaire inclus)`
  }

  return {
    faisable: pourcentage <= 100,
    ecartBudget: ecart,
    pourcentageBudget: pourcentage,
    mensualiteEstimee: calculerMensualite(coutTotal, 0, SIMULATEUR_CONFIG.tauxInteretDefaut.long * 100, 25),
    fraisNotaire,
    niveau,
    message
  }
}
