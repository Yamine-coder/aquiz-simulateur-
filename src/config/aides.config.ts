/**
 * Configuration des aides financières (PTZ, PAS, Action Logement)
 * Données réglementaires France 2026
 */

import type { ZonePTZ } from '@/types/aides'

export const AIDES_CONFIG = {
  ptz: {
    // Plafonds de revenus PTZ 2026 (revenus N-2) par zone et nombre de personnes
    plafondsRevenus: {
      Abis: { 1: 49000, 2: 73500, 3: 88200, 4: 102900, 5: 117600 },
      A: { 1: 49000, 2: 73500, 3: 88200, 4: 102900, 5: 117600 },
      B1: { 1: 34500, 2: 51750, 3: 62100, 4: 72450, 5: 82800 },
      B2: { 1: 31500, 2: 47250, 3: 56700, 4: 66150, 5: 75600 },
      C: { 1: 28500, 2: 42750, 3: 51300, 4: 59850, 5: 68400 },
    } as Record<ZonePTZ, Record<number, number>>,

    // Prix plafonds d'opération par zone
    prixPlafonds: {
      Abis: 150000,
      A: 150000,
      B1: 135000,
      B2: 110000,
      C: 100000,
    } as Record<ZonePTZ, number>,

    // Quotité finançable par PTZ (% du prix)
    quotiteMax: {
      neuf: 0.4, // 40% pour le neuf
      ancienRenove: 0.2, // 20% pour l'ancien avec travaux
    },

    // Durée maximale PTZ
    dureeMaxAns: 25,

    // Différé de remboursement possible
    differeMaxAns: 15,
  },

  pas: {
    // Plafonds de ressources PAS 2026
    plafondsRevenus: {
      A: { 1: 37000, 2: 51800, 3: 62900, 4: 74000, 5: 85100 },
      B: { 1: 30000, 2: 42000, 3: 51000, 4: 60000, 5: 69000 },
      C: { 1: 30000, 2: 42000, 3: 51000, 4: 60000, 5: 69000 },
    },

    // Taux maximum PAS
    tauxMax: 0.0345, // 3.45%

    // Durée
    dureeMinAns: 5,
    dureeMaxAns: 30,
  },

  actionLogement: {
    // Montant max prêt Action Logement
    montantMax: {
      zoneTendue: 40000,
      zoneNonTendue: 30000,
    },

    // Taux fixe
    taux: 0.01, // 1%

    // Durée
    dureeMaxAns: 25,

    // Conditions
    tailleEntrepriseMin: 10, // salariés
    ancienneteMinMois: 6,
  },

  // Zones géographiques
  zonesCommunes: {
    // À compléter avec les communes par zone
    // Sera chargé dynamiquement depuis un fichier JSON
  },
} as const

export type AidesConfig = typeof AIDES_CONFIG
