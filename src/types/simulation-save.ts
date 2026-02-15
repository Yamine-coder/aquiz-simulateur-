/**
 * Types pour la sauvegarde des simulations AQUIZ
 * 
 * Système de sauvegarde MANUELLE (pas d'auto-save)
 */

import type { ModeSimulation } from './simulateur'

/** Statut d'une simulation */
export type SimulationStatus = 'en_cours' | 'terminee'

/** Données de profil */
export interface SavedProfil {
  age: number
  statutProfessionnel: string
  situationFoyer: 'celibataire' | 'couple'
  nombreEnfants: number
  salaire1: number
  salaire2: number
  autresRevenus: number
  creditsEnCours: number
  autresCharges: number
}

/** Données Mode A */
export interface SavedModeAData {
  mensualiteMax: number
  dureeAns: number
  apport: number
  typeBien: 'neuf' | 'ancien'
  tauxInteret: number
}

/** Données Mode B */
export interface SavedModeBData {
  prixBien: number
  typeBien: 'neuf' | 'ancien'
  codePostal: string
  apport: number
  dureeAns: number
  tauxInteret: number
}

/** Résultats */
export interface SavedResultats {
  capaciteAchat: number
  mensualite: number
  tauxEndettement: number
  faisable: boolean
}

/** Une simulation sauvegardée */
export interface SavedSimulation {
  id: string
  mode: ModeSimulation
  status: SimulationStatus
  etape: string
  savedAt: string
  profil: SavedProfil | null
  modeAData: SavedModeAData | null
  modeBData: SavedModeBData | null
  resultats: SavedResultats | null
}

/** État du storage */
export interface SimulationStorage {
  simulations: SavedSimulation[]
}

/** Clé localStorage */
export const STORAGE_KEY = 'aquiz-simulations'

/** Nombre max de simulations gardées */
export const MAX_SIMULATIONS = 10
