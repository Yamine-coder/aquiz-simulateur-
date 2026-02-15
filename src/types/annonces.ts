/**
 * Types pour le comparateur d'annonces immobilières
 * Sprint 6 - AQUIZ
 */

// ============================================
// TYPES DE BASE
// ============================================

/** Sources d'annonces supportées */
export type SourceAnnonce = 
  | 'seloger' 
  | 'leboncoin' 
  | 'pap' 
  | 'bienici' 
  | 'logic-immo' 
  | 'manuel'

/** Type de bien */
export type TypeBienAnnonce = 'appartement' | 'maison'

/** Classe DPE / GES */
export type ClasseDPE = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'NC'

// ============================================
// INTERFACE ANNONCE
// ============================================

/**
 * Annonce immobilière complète
 */
export interface Annonce {
  /** Identifiant unique */
  id: string
  
  /** Source de l'annonce */
  source: SourceAnnonce
  
  /** URL de l'annonce originale */
  url?: string
  
  // --- Caractéristiques du bien ---
  
  /** Prix du bien en € */
  prix: number
  
  /** Surface habitable en m² */
  surface: number
  
  /** Prix au m² (calculé) */
  prixM2: number
  
  /** Type de bien */
  type: TypeBienAnnonce
  
  /** Nombre de pièces */
  pieces: number
  
  /** Nombre de chambres */
  chambres: number
  
  /** Étage (appartement) */
  etage?: number
  
  /** Nombre d'étages total */
  etagesTotal?: number
  
  /** Avec ascenseur */
  ascenseur?: boolean
  
  /** Avec balcon/terrasse */
  balconTerrasse?: boolean
  
  /** Avec parking/garage */
  parking?: boolean
  
  /** Avec cave */
  cave?: boolean
  
  // --- Localisation ---
  
  /** Nom de la ville */
  ville: string
  
  /** Code postal */
  codePostal: string
  
  /** Département */
  departement?: string
  
  /** Adresse complète (optionnel) */
  adresse?: string
  
  // --- Performance énergétique ---
  
  /** Diagnostic de Performance Énergétique */
  dpe: ClasseDPE
  
  /** Gaz à Effet de Serre */
  ges?: ClasseDPE
  
  // --- Charges et taxes ---
  
  /** Charges mensuelles de copropriété */
  chargesMensuelles?: number
  
  /** Taxe foncière annuelle */
  taxeFonciere?: number
  
  // --- Métadonnées ---
  
  /** Titre de l'annonce */
  titre?: string
  
  /** Description */
  description?: string
  
  /** URL de l'image principale */
  imageUrl?: string
  
  /** Date d'ajout au comparateur */
  dateAjout: Date
  
  /** Notes personnelles */
  notes?: string
  
  /** Annonce favorite */
  favori: boolean
}

// ============================================
// INTERFACE CRÉATION ANNONCE
// ============================================

/**
 * Données pour créer une nouvelle annonce
 * (sans les champs calculés/auto)
 */
export interface NouvelleAnnonce {
  url?: string
  prix: number
  surface: number
  type: TypeBienAnnonce
  pieces: number
  chambres: number
  ville: string
  codePostal: string
  dpe: ClasseDPE
  
  // Optionnels
  adresse?: string
  etage?: number
  ascenseur?: boolean
  balconTerrasse?: boolean
  parking?: boolean
  cave?: boolean
  chargesMensuelles?: number
  taxeFonciere?: number
  titre?: string
  description?: string
  imageUrl?: string
  notes?: string
  ges?: ClasseDPE
}

// ============================================
// STATISTIQUES COMPARAISON
// ============================================

/**
 * Statistiques calculées sur les annonces comparées
 */
export interface StatistiquesComparaison {
  /** Nombre total d'annonces */
  nbAnnonces: number
  
  /** Prix moyen */
  prixMoyen: number
  
  /** Prix minimum */
  prixMin: number
  
  /** Prix maximum */
  prixMax: number
  
  /** Prix au m² moyen */
  prixM2Moyen: number
  
  /** Surface moyenne */
  surfaceMoyenne: number
  
  /** ID de l'annonce avec le meilleur rapport qualité/prix */
  meilleurRapportId?: string
  
  /** ID de l'annonce la moins chère */
  moinsChererId?: string
  
  /** ID de l'annonce avec le meilleur DPE */
  meilleurDPEId?: string
}

// ============================================
// FILTRES ET TRI
// ============================================

/** Options de tri des annonces */
export type TriAnnonces = 
  | 'prix-asc' 
  | 'prix-desc' 
  | 'prixM2-asc' 
  | 'prixM2-desc'
  | 'surface-asc' 
  | 'surface-desc'
  | 'dateAjout-desc'

/**
 * Critères de filtrage rapide
 */
export interface FiltresAnnonces {
  prixMin?: number
  prixMax?: number
  surfaceMin?: number
  surfaceMax?: number
  type?: TypeBienAnnonce | 'tous'
  dpeMax?: ClasseDPE
  favorisUniquement?: boolean
}

// ============================================
// COMPARAISON AVEC BUDGET
// ============================================

/**
 * Analyse de faisabilité d'une annonce par rapport au budget utilisateur
 */
export interface AnalyseFaisabilite {
  /** L'achat est-il possible ? */
  faisable: boolean
  
  /** Écart avec le budget max */
  ecartBudget: number
  
  /** Pourcentage du budget utilisé */
  pourcentageBudget: number
  
  /** Mensualité estimée (hors assurance) */
  mensualiteEstimee: number
  
  /** Frais de notaire estimés */
  fraisNotaire: number
  
  /** Taux d'endettement estimé */
  tauxEndettement?: number
  
  /** Niveau : confortable / limite / impossible */
  niveau: 'confortable' | 'limite' | 'impossible'
  
  /** Message explicatif */
  message: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Couleurs DPE selon la classe
 */
export const COULEURS_DPE: Record<ClasseDPE, string> = {
  A: 'bg-green-500',
  B: 'bg-lime-500',
  C: 'bg-yellow-400',
  D: 'bg-amber-400',
  E: 'bg-orange-500',
  F: 'bg-red-500',
  G: 'bg-red-700',
  NC: 'bg-gray-400'
}

/**
 * Labels DPE
 */
export const LABELS_DPE: Record<ClasseDPE, string> = {
  A: 'A - Excellent',
  B: 'B - Très bon',
  C: 'C - Bon',
  D: 'D - Moyen',
  E: 'E - Passable',
  F: 'F - Mauvais',
  G: 'G - Très mauvais',
  NC: 'Non communiqué'
}

/**
 * Labels sources d'annonces
 */
export const LABELS_SOURCES: Record<SourceAnnonce, string> = {
  seloger: 'SeLoger',
  leboncoin: 'LeBonCoin',
  pap: 'PAP',
  bienici: 'Bien\'ici',
  'logic-immo': 'Logic-Immo',
  manuel: 'Saisie manuelle'
}
