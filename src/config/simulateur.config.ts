/**
 * Configuration globale du simulateur AQUIZ
 * Paramètres réglementaires français (HCSF 2024)
 */

export const SIMULATEUR_CONFIG = {
  // Taux d'endettement
  tauxEndettementMax: 0.35, // 35% norme HCSF
  tauxEndettementAlerte: 0.315, // 31.5% seuil d'alerte (90% du max)

  // Durée de prêt (HCSF: max 25 ans)
  dureeMinAns: 10,
  dureeMaxAns: 25, // Norme HCSF
  dureeDefautAns: 20,

  // Frais de notaire
  fraisNotaireNeuf: 0.025, // 2.5%
  fraisNotaireAncien: 0.08, // 8%

  // Assurance emprunteur
  tauxAssuranceMoyen: 0.0034, // 0.34% du capital/an

  // Reste à vivre minimum (en euros/mois)
  resteAVivre: {
    celibataire: 800,
    couple: 1200,
    parEnfant: 300,
  },

  // Taux d'intérêt de référence (à jour 2024-2025)
  tauxInteretDefaut: {
    court: 0.032, // 3.2% sur 10-15 ans
    moyen: 0.035, // 3.5% sur 15-20 ans
    long: 0.038, // 3.8% sur 20-25 ans
  },

  // Limites de validation
  limites: {
    revenusMin: 0,
    revenusMax: 100000,
    apportMin: 0,
    apportMax: 2000000,
    prixBienMin: 10000,
    prixBienMax: 5000000,
  },
} as const

export type SimulateurConfig = typeof SIMULATEUR_CONFIG
