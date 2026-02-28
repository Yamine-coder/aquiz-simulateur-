/**
 * Store Zustand centralisé pour la gestion des leads
 *
 * Centralise l'état lead (email, prénom, qualification) à travers
 * toutes les features : comparateur, simulateur, carte, aides.
 *
 * NOTE : useComparateurStore conserve ses propres champs lead
 * pour rétro-compatibilité. Ce store est la source de vérité
 * unique pour les nouvelles intégrations et le pré-remplissage.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================
// TYPES
// ============================================

/** Sources possibles d'un lead */
type LeadSource = 'comparateur' | 'simulateur-a' | 'simulateur-b' | 'carte' | 'aides'

/** Qualification du lead */
interface LeadQualification {
  typeProjet: 'residence_principale' | 'investissement' | 'curieux'
  delai: 'moins_3_mois' | '3_6_mois' | 'plus_6_mois' | 'ne_sait_pas'
  score: number
  niveau: 'hot' | 'warm' | 'cold'
  qualifiedAt: number
}

/** Capture enregistrée (1 par source) */
interface LeadCapture {
  source: LeadSource
  capturedAt: number
  contexte?: Record<string, unknown>
}

interface LeadState {
  /** Email du lead (partagé entre toutes les features) */
  email: string | null
  /** Prénom optionnel */
  prenom: string | null
  /** Historique des captures par source */
  captures: LeadCapture[]
  /** Qualification (unique, indépendante de la source) */
  qualification: LeadQualification | null

  // --- Actions ---

  /** Enregistrer un lead après capture email */
  capture: (email: string, source: LeadSource, prenom?: string, contexte?: Record<string, unknown>) => void
  /** Enregistrer la qualification */
  qualify: (data: Omit<LeadQualification, 'qualifiedAt'>) => void
  /** Vérifier si le lead a été capturé pour une source donnée */
  isCaptured: (source: LeadSource) => boolean
  /** Réinitialiser */
  reset: () => void
}

// ============================================
// INITIAL STATE
// ============================================

const initialState = {
  email: null as string | null,
  prenom: null as string | null,
  captures: [] as LeadCapture[],
  qualification: null as LeadQualification | null,
}

// ============================================
// STORE
// ============================================

export const useLeadStore = create<LeadState>()(
  persist(
    (set, get) => ({
      ...initialState,

      capture: (email, source, prenom, contexte) => {
        set((state) => {
          // Remplacer ou ajouter la capture pour cette source
          const existingIndex = state.captures.findIndex((c) => c.source === source)
          const newCapture: LeadCapture = {
            source,
            capturedAt: Date.now(),
            contexte,
          }

          const captures =
            existingIndex >= 0
              ? state.captures.map((c, i) => (i === existingIndex ? newCapture : c))
              : [...state.captures, newCapture]

          return {
            email,
            prenom: prenom ?? state.prenom,
            captures,
          }
        })
      },

      qualify: (data) => {
        set({
          qualification: {
            ...data,
            qualifiedAt: Date.now(),
          },
        })
      },

      isCaptured: (source) => {
        return get().captures.some((c) => c.source === source)
      },

      reset: () => {
        set(initialState)
      },
    }),
    {
      name: 'aquiz-lead',
      version: 1,
    }
  )
)

// ============================================
// CONSTANTS
// ============================================

/** TTL 30 jours en millisecondes */
const LEAD_TTL_MS = 30 * 24 * 60 * 60 * 1000

// ============================================
// SÉLECTEURS
// ============================================

/** Vérifie si le lead est qualifié « hot » */
export function isHotLead(state: LeadState): boolean {
  return state.qualification?.niveau === 'hot'
}

/** Nombre de sources capturées */
export function captureCount(state: LeadState): number {
  return state.captures.length
}

/** Vérifie si le lead a un email valide non expiré (TTL 30j) */
export function hasValidEmail(state: LeadState): boolean {
  if (!state.email || state.captures.length === 0) return false
  const latestCapture = Math.max(...state.captures.map(c => c.capturedAt))
  return Date.now() - latestCapture < LEAD_TTL_MS
}
