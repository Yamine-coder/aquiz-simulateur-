/**
 * Calcul de faisabilité d'un bien par rapport au budget
 * Utilisé dans le comparateur et les annonces cards
 */

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
  budgetMax: number | null
): AnalyseFaisabilite | undefined {
  if (!budgetMax) return undefined

  const ecart = budgetMax - prix
  const pourcentage = Math.round((prix / budgetMax) * 100)

  // Frais notaire estimés (8% ancien par défaut)
  const fraisNotaire = Math.round(prix * 0.08)

  let niveau: 'confortable' | 'limite' | 'impossible'
  let message: string

  if (pourcentage <= 90) {
    niveau = 'confortable'
    message = `Dans votre budget avec une marge de ${ecart.toLocaleString('fr-FR')} €`
  } else if (pourcentage <= 105) {
    niveau = 'limite'
    message = pourcentage <= 100
      ? `Proche de votre budget max (${pourcentage}%)`
      : `Légèrement au-dessus (+${Math.abs(ecart).toLocaleString('fr-FR')} €)`
  } else {
    niveau = 'impossible'
    message = `Dépasse votre budget de ${Math.abs(ecart).toLocaleString('fr-FR')} €`
  }

  return {
    faisable: pourcentage <= 100,
    ecartBudget: ecart,
    pourcentageBudget: pourcentage,
    mensualiteEstimee: 0, // Simplifié — calculé avec les vrais paramètres dans TableauComparaison
    fraisNotaire,
    niveau,
    message
  }
}
