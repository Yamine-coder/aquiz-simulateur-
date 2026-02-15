/**
 * Types pour la carte interactive AQUIZ
 * Affichage des zones d'achat possibles selon le budget
 */

// ============================================
// TYPES DE BASE
// ============================================

/** Région géographique disponible */
export type RegionCible = 
  | 'france'
  | 'ile-de-france'
  | 'paris-petite-couronne'
  | 'lyon-metropole'
  | 'marseille-metropole'
  | 'toulouse-metropole'
  | 'bordeaux-metropole'
  | 'nantes-metropole'
  | 'lille-metropole'

/** Type de zone */
export type TypeZone = 'urbain' | 'periurbain' | 'rural'

/** Statut d'accessibilité de la zone */
export type StatutZone = 'vert' | 'orange' | 'rouge'

/** Type de bien pour le calcul */
export type TypeBienCarte = 'appartement' | 'maison'

// ============================================
// INTERFACES DONNÉES ZONES
// ============================================

/**
 * Coordonnées géographiques
 */
export interface Coordonnees {
  lat: number
  lng: number
}

/**
 * Données d'une zone géographique
 */
export interface ZoneGeographique {
  /** Identifiant unique (code INSEE ou code postal) */
  id: string
  /** Code INSEE de la commune */
  codeInsee: string
  /** Code postal */
  codePostal: string
  /** Nom de la zone (ville, arrondissement, quartier) */
  nom: string
  /** Département */
  departement: string
  /** Code département */
  codeDepartement: string
  /** Région */
  region: string
  /** Type de zone */
  typeZone: TypeZone
  /** Prix moyen au m² pour un appartement */
  prixM2Appartement: number
  /** Prix moyen au m² pour une maison */
  prixM2Maison: number
  /** Évolution du prix sur 1 an (en %) */
  evolutionPrix1an?: number
  /** Évolution du prix sur 5 ans (en %) */
  evolutionPrix5ans?: number
  /** Coordonnées du centre de la zone */
  centre: Coordonnees
  /** Polygone GeoJSON de la zone (optionnel pour affichage) */
  polygone?: GeoJSON.Polygon | GeoJSON.MultiPolygon
  /** Population de la zone */
  population?: number
}

/**
 * Résultat de calcul pour une zone
 */
export interface ZoneCalculee extends ZoneGeographique {
  /** Prix au m² utilisé (selon type de bien) */
  prixM2: number
  /** Surface maximale possible avec le budget */
  surfaceMax: number
  /** Surface minimale (avec marge de 10%) */
  surfaceMin: number
  /** Statut d'accessibilité */
  statut: StatutZone
  /** Label explicatif */
  label: string
  /** Description détaillée */
  description: string
  /** Commentaire sur le type de logement possible */
  commentaireLogement: string
  /** Score de pertinence (0-100) */
  scoreRelevance: number
}

// ============================================
// INTERFACES CONFIGURATION
// ============================================

/**
 * Seuils de surface pour la classification vert/orange/rouge
 */
export interface SeuilsSurface {
  /** Seuil minimum pour zone verte (confortable) */
  seuilVert: number
  /** Seuil minimum pour zone orange (possible) */
  seuilOrange: number
  /** En dessous de seuilOrange = rouge */
}

/**
 * Seuils par défaut selon le type de bien
 */
export const SEUILS_DEFAUT: Record<TypeBienCarte, SeuilsSurface> = {
  appartement: {
    seuilVert: 40, // >= 40m² = zone verte
    seuilOrange: 25, // 25-40m² = zone orange, < 25m² = rouge
  },
  maison: {
    seuilVert: 70, // >= 70m² = zone verte
    seuilOrange: 50, // 50-70m² = zone orange, < 50m² = rouge
  },
}

/**
 * Configuration de la carte
 */
export interface ConfigurationCarte {
  /** Région ciblée */
  region: RegionCible
  /** Type de bien */
  typeBien: TypeBienCarte
  /** Budget maximum (capacité d'achat) */
  budgetMax: number
  /** Seuils de surface personnalisés */
  seuils?: SeuilsSurface
  /** Nombre maximum de zones à afficher */
  maxZones?: number
  /** Afficher uniquement les zones accessibles (>= seuil orange) */
  filtrerInaccessibles?: boolean
}

// ============================================
// INTERFACES POUR L'AFFICHAGE
// ============================================

/**
 * Données pour le popup d'une zone
 */
export interface PopupZoneData {
  zone: ZoneCalculee
  /** Actions disponibles */
  actions: {
    /** Sélectionner cette zone pour la suite */
    selectionner: () => void
    /** Voir plus de détails */
    voirDetails?: () => void
  }
}

/**
 * État de la carte interactive
 */
export interface EtatCarte {
  /** Zone actuellement survolée */
  zoneHover: string | null
  /** Zone sélectionnée */
  zoneSelectionnee: string | null
  /** Niveau de zoom actuel */
  zoom: number
  /** Centre de la carte */
  centre: Coordonnees
  /** Zones calculées et filtrées */
  zonesAffichees: ZoneCalculee[]
  /** Chargement en cours */
  isLoading: boolean
  /** Erreur éventuelle */
  error: string | null
}

// ============================================
// INTERFACES STORE
// ============================================

/**
 * Zone sélectionnée pour la suite du simulateur
 */
export interface ZoneSelectionnee {
  id: string
  nom: string
  departement: string
  prixM2: number
  surfaceMax: number
  statut: StatutZone
  /** Zone PTZ (A, Abis, B1, B2, C) */
  zonePTZ?: 'A' | 'Abis' | 'B1' | 'B2' | 'C'
}

/**
 * Labels et couleurs pour chaque statut
 */
export const STATUT_CONFIG: Record<StatutZone, { label: string; couleur: string; icone: string; bgColor: string }> = {
  vert: {
    label: 'Zone compatible',
    couleur: '#22c55e',
    icone: '✅',
    bgColor: 'rgba(34, 197, 94, 0.4)',
  },
  orange: {
    label: 'Zone accessible',
    couleur: '#f97316',
    icone: '⚠️',
    bgColor: 'rgba(249, 115, 22, 0.4)',
  },
  rouge: {
    label: 'Zone tendue',
    couleur: '#ef4444',
    icone: '⛔',
    bgColor: 'rgba(239, 68, 68, 0.4)',
  },
}
