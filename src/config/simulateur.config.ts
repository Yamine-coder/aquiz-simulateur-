/**
 * Configuration globale du simulateur AQUIZ
 * Paramètres réglementaires français (HCSF 2026)
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

  // Taux d'intérêt de référence (à jour T1 2026)
  tauxInteretDefaut: {
    court: 0.031, // 3.1% sur 10-15 ans
    moyen: 0.033, // 3.3% sur 15-20 ans
    long: 0.035, // 3.5% sur 20-25 ans
  },

  // Taux d'usure (Banque de France, T1 2026)
  tauxUsure: {
    fixe10a20: 0.0529, // 5.29% — prêts à taux fixe 10-20 ans
    fixe20plus: 0.0548, // 5.48% — prêts à taux fixe ≥20 ans
    variable: 0.0525, // 5.25% — prêts à taux variable
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
