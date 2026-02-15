/**
 * Types pour les aides financières (PTZ, PAS, Action Logement)
 */

// ============================================
// TYPES DE BASE
// ============================================

/** Types d'aides disponibles */
export type TypeAide = 'PTZ' | 'PAS' | 'ACTION_LOGEMENT' | 'TVA_REDUITE'

/** Zones géographiques PTZ */
export type ZonePTZ = 'Abis' | 'A' | 'B1' | 'B2' | 'C'

/** Zones PAS */
export type ZonePAS = 'A' | 'B' | 'C'

// ============================================
// INTERFACES ÉLIGIBILITÉ
// ============================================

/**
 * Condition d'éligibilité
 */
export interface Condition {
  /** Nom du critère */
  critere: string
  /** La condition est-elle remplie ? */
  remplie: boolean
  /** Valeur actuelle de l'utilisateur */
  valeurActuelle: unknown
  /** Valeur requise */
  valeurRequise: unknown
  /** Description lisible */
  description: string
}

/**
 * Résultat d'éligibilité à une aide
 */
export interface ResultatEligibilite {
  /** L'utilisateur est-il éligible ? */
  eligible: boolean
  /** Montant maximum de l'aide */
  montantMax?: number
  /** Durée maximale */
  dureeMax?: number
  /** Taux applicable */
  taux?: number
  /** Liste des conditions vérifiées */
  conditions: Condition[]
  /** Raisons de non-éligibilité */
  raisons?: string[]
}

// ============================================
// INTERFACES PARAMÈTRES AIDES
// ============================================

/**
 * Paramètres pour vérifier l'éligibilité PTZ
 */
export interface ParametresPTZ {
  /** Zone PTZ de la commune */
  zonePTZ: ZonePTZ
  /** Type de bien */
  typeBien: 'neuf' | 'ancien-renove'
  /** Prix d'achat du bien */
  prixAchat: number
  /** Revenus fiscaux de référence N-2 */
  revenusN2: number
  /** Nombre de personnes dans le foyer */
  nombrePersonnes: number
  /** Est-ce un premier achat ? */
  primoAccedant: boolean
}

/**
 * Paramètres pour vérifier l'éligibilité PAS
 */
export interface ParametresPAS {
  /** Revenus fiscaux de référence N-2 */
  revenusN2: number
  /** Nombre de personnes dans le foyer */
  nombrePersonnes: number
  /** Zone PAS */
  zonePAS: ZonePAS
  /** Montant total de l'opération */
  montantOperation: number
}

/**
 * Paramètres pour vérifier l'éligibilité Action Logement
 */
export interface ParametresActionLogement {
  /** Secteur d'activité de l'employeur */
  secteurActivite: 'prive' | 'public'
  /** Taille de l'entreprise (nombre de salariés) */
  tailleEntreprise: number
  /** Ancienneté en mois */
  ancienneteMois: number
  /** Type de contrat */
  typeContrat: 'CDI' | 'CDD' | 'interim' | 'autre'
  /** La zone est-elle tendue ? */
  zoneTendue: boolean
}

// ============================================
// INTERFACES RÉSULTATS AIDES
// ============================================

/**
 * Résultat global de toutes les aides
 */
export interface ResultatAides {
  /** Éligibilité PTZ */
  ptz: ResultatEligibilite
  /** Éligibilité PAS */
  pas: ResultatEligibilite
  /** Éligibilité Action Logement */
  actionLogement: ResultatEligibilite
  /** Montant total des aides potentielles */
  totalAides: number
  /** Économies mensuelles potentielles */
  economiesMensuelles: number
  /** Impact sur le taux d'endettement */
  impactEndettement: number
}

/**
 * Détail d'une aide obtenue
 */
export interface AideObtenue {
  /** Type d'aide */
  type: TypeAide
  /** Montant de l'aide */
  montant: number
  /** Taux applicable */
  taux: number
  /** Durée en années */
  dureeAns: number
  /** Mensualité de cette aide */
  mensualite: number
  /** Différé éventuel en années */
  differeAns?: number
}
