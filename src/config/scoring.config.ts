/**
 * Configuration du moteur de scoring comparateur
 *
 * Regroupe tous les poids, seuils et constantes métier.
 * Modifier ce fichier pour ajuster la notation sans toucher au moteur de calcul.
 */

import type { ClasseDPE } from '@/types/annonces'

// Re-export du type AxeScoring pour usage dans la config
export type AxeScoring =
  | 'prixMarche'
  | 'rendement'
  | 'energie'
  | 'emplacement'
  | 'transports'
  | 'etatBien'
  | 'charges'
  | 'risques'
  | 'surface'
  | 'equipements'
  | 'plusValue'

// ============================================
// PONDÉRATIONS DES AXES (total = 100%)
// ============================================

export const POIDS_AXES: Record<AxeScoring, number> = {
  prixMarche: 20,
  rendement: 15,
  energie: 12,
  emplacement: 13,
  transports: 7,
  etatBien: 10,
  charges: 8,
  risques: 5,
  surface: 4,
  equipements: 4,
  plusValue: 2,
}

// ============================================
// LABELS & DESCRIPTIONS (UI)
// ============================================

export const LABELS_AXES: Record<AxeScoring, string> = {
  prixMarche: 'Prix vs Marché',
  rendement: 'Rendement locatif',
  energie: 'Performance énergie',
  emplacement: 'Emplacement',
  transports: 'Transports',
  etatBien: 'État du bien',
  charges: 'Charges & fiscalité',
  risques: 'Risques naturels',
  surface: 'Surface & agencement',
  equipements: 'Équipements',
  plusValue: 'Potentiel plus-value',
}

export const DESCRIPTIONS_AXES: Record<AxeScoring, string> = {
  prixMarche: 'Compare le prix/m² au prix médian des transactions DVF dans le même secteur. Un écart négatif signifie une bonne affaire.',
  rendement: 'Estime le rendement locatif brut annuel basé sur le loyer potentiel (ajusté surface, DPE, type de bien). +7% = excellent, 3-5% = moyen.',
  energie: 'Combine la classe DPE, le GES et le coût énergie estimé. Les passoires thermiques (F/G) sont pénalisées car interdites à la location.',
  emplacement: 'Score de vie du quartier : commerces, écoles, santé, espaces verts dans un rayon de 1 km (source OpenStreetMap).',
  transports: 'Desserte en transports en commun : nombre de stations, variété des modes (métro, tram, bus, RER) et proximité à pied.',
  etatBien: 'Estime les travaux nécessaires selon le DPE, l\'année de construction et l\'état général. Un bien récent DPE A = 0 € de travaux.',
  charges: 'Évalue le poids des charges mensuelles et de la taxe foncière rapporté au prix. Moins c\'est cher, meilleur est le score.',
  risques: 'Analyse les risques naturels et technologiques via Géorisques : inondation, séisme, radon, pollution des sols, PPRT.',
  surface: 'Rapport surface/pièces, orientation (Sud valorisée), et comparaison avec la surface médiane des autres biens sélectionnés.',
  equipements: 'Présence de balcon/terrasse, parking, cave, ascenseur. Chaque équipement apporte un bonus. Étage élevé sans ascenseur pénalise.',
  plusValue: 'Potentiel de valorisation : décote DPE (rénovation rentable), prix inférieur au marché, quartier dynamique, évolution des prix DVF.',
}

// ============================================
// PERFORMANCE ÉNERGÉTIQUE
// ============================================

/**
 * Coût énergie annuel estimé par classe DPE (€/m²/an)
 * Source : ADEME, données moyennes France 2024
 * A: <70 kWh/m²/an → ~5€/m²/an  |  G: >450 kWh/m²/an → ~38€/m²/an
 */
export const COUT_ENERGIE_M2_AN: Record<ClasseDPE, number> = {
  A: 5,
  B: 8,
  C: 12,
  D: 17,
  E: 23,
  F: 30,
  G: 38,
  NC: 20, // Hypothèse prudente
}

/**
 * Score DPE pour la notation (A=100, B=85, ..., G=10)
 */
export const SCORE_DPE: Record<ClasseDPE, number> = {
  A: 100,
  B: 85,
  C: 70,
  D: 55,
  E: 40,
  F: 20,
  G: 10,
  NC: 40, // Prudent
}

/**
 * Score GES par classe (A=100, G=10)
 * Même grille que le DPE — utilisé comme composante dans l'axe énergie
 */
export const SCORE_GES: Record<ClasseDPE, number> = {
  A: 100,
  B: 85,
  C: 70,
  D: 55,
  E: 40,
  F: 20,
  G: 10,
  NC: 40,
}

/**
 * Pondération des composantes de l'axe énergie
 * - Avec GES : 40% DPE + 30% coût + 30% GES
 * - Sans GES : 70% DPE + 30% coût (rétro-compatible)
 */
export const ENERGIE_WEIGHTS = {
  withGES: { dpe: 0.4, cout: 0.3, ges: 0.3 },
  withoutGES: { dpe: 0.7, cout: 0.3 },
} as const

// ============================================
// SEUILS SURFACE
// ============================================

export const SEUILS_SURFACE = {
  /** Surface au-dessus de laquelle un bonus est appliqué */
  grandeMin: 80,
  /** Bonus en points pour surface ≥ grandeMin */
  grandeBonus: 10,
  /** Surface en-dessous de laquelle un malus est appliqué */
  petiteMax: 20,
  /** Malus en points pour surface ≤ petiteMax */
  petiteMalus: -10,
} as const

// ============================================
// SEUILS PRIX VS MARCHÉ
// ============================================

export const SEUILS_PRIX_MARCHE = {
  /** Score quand l'écart est exactement 0% (ni sous ni sur-évalué) */
  scoreNeutre: 50,
  /** Pente : points perdus par % d'écart au-dessus du marché */
  penteParPourcent: 1.67,
} as const

// ============================================
// ÉQUIPEMENTS — BONUS / MALUS
// ============================================

export const EQUIPEMENTS_SCORING = {
  /** Score de base quand les équipements sont renseignés */
  baseAvecDonnees: 40,
  /** Score quand aucun équipement n'est renseigné (undefined = pas de données) */
  baseIndetermine: 50,

  bonus: {
    parking: 15,
    balconTerrasse: 12,
    cave: 8,
    ascenseur: 8,
    multiSDB: 8, // ≥2 salles de bains
    etageEleveAvecAscenseur: 5, // étage ≥3 avec ascenseur
  },
  malus: {
    etageEleveSansAscenseur: -20, // étage ≥4 sans ascenseur
    rezDeChaussee: -5,
  },
  /** Seuil d'étage pour le malus "sans ascenseur" */
  seuilEtageSansAscenseur: 4,
  /** Seuil d'étage pour le bonus "avec ascenseur" */
  seuilEtageAvecAscenseur: 3,
} as const

// ============================================
// CONFIANCE & REDISTRIBUTION
// ============================================

export const CONFIANCE_CONFIG = {
  /** En-dessous de ce seuil (%), le score est pénalisé */
  seuilPenalite: 70,
  /** Facteur de pénalité maximum (confiance=0 → score ×0.7) */
  facteurMin: 0.7,
} as const

// ============================================
// BUDGET TRAVAUX — SEUILS PAR CLASSE DPE
// ============================================

export const BUDGET_TRAVAUX_DPE: Record<ClasseDPE, number> = {
  A: 0,
  B: 0,
  C: 50,
  D: 150,
  E: 300,
  F: 500,
  G: 700,
  NC: 200, // Prudent
}

/**
 * Seuils de vétusté basés sur l'année de construction (€/m²)
 * Appliqués en complément de la composante DPE
 */
export const VETUSTE_SEUILS = [
  { avantAnnee: 1950, coutM2: 300 },
  { avantAnnee: 1970, coutM2: 200 },
  { avantAnnee: 1990, coutM2: 100 },
  { avantAnnee: 2005, coutM2: 50 },
  { avantAnnee: Infinity, coutM2: 0 },
] as const

// ============================================
// ESTIMATION LOYER — RATIOS PAR ZONE
// ============================================

/** Ratio loyer mensuel / prix d'achat, par zone géographique */
export const RATIO_LOYER_ZONE = {
  /** Paris intra-muros */
  paris: 0.0028,
  /** Petite couronne (92, 93, 94) */
  petiteCouronne: 0.0035,
  /** Grande couronne (77, 78, 91, 95) */
  grandeCouronne: 0.004,
  /** Grandes métropoles */
  grandesMetropoles: 0.0042,
  /** Villes moyennes */
  villesMoyennes: 0.005,
  /** DOM-TOM */
  domTom: 0.0045,
  /** Moyenne nationale (fallback) */
  moyenneNationale: 0.004,
  /** Petites villes / rural */
  rural: 0.0055,
} as const

/** Départements classés comme grandes métropoles */
export const DEPTS_GRANDES_METROPOLES = ['69', '13', '33', '31', '44', '59', '67', '06', '34'] as const
/** Départements classés comme villes moyennes */
export const DEPTS_VILLES_MOYENNES = ['35', '45', '37', '21', '63', '76', '14', '29', '87'] as const
/** Départements petite couronne */
export const DEPTS_PETITE_COURONNE = [92, 93, 94] as const
/** Départements grande couronne */
export const DEPTS_GRANDE_COURONNE = [77, 78, 91, 95] as const

// ============================================
// SCORE COÛT ÉNERGIE — NORMALISATION
// ============================================

/**
 * Coût max DPE (€/m²/an) utilisé pour normaliser le score coût énergie à [0-100].
 * DPE G = 38 €/m²/an → 38/0.38 = 100 → score = 0.
 */
export const COUT_ENERGIE_MAX_RATIO = 0.38
