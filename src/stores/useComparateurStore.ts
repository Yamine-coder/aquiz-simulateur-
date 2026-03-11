/**
 * Store Zustand pour le comparateur d'annonces
 * Sprint 6 - AQUIZ
 */

import { detecterSource as detecterSourceFromUrl } from '@/lib/scraping/extracteur'
import type {
    Annonce,
    FiltresAnnonces,
    NouvelleAnnonce,
    TriAnnonces
} from '@/types/annonces'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Module-level reference to the store's `set` function.
 * Captured during store initializer so `onRehydrateStorage` callback
 * can call it — avoids the TDZ issue where `useComparateurStore`
 * is not yet assigned when persist rehydrates synchronously.
 */
let _persistSet: ((partial: Partial<ComparateurState>) => void) | null = null

// ============================================
// TYPES DU STORE
// ============================================

interface ComparateurState {
  /** Flag de rehydration Zustand persist */
  _hasHydrated: boolean
  /** Liste des annonces ajoutées */
  annonces: Annonce[]
  
  /** IDs des annonces sélectionnées pour comparaison (max 4) */
  annonceSelectionnees: string[]
  
  /** Filtres actifs */
  filtres: FiltresAnnonces
  
  /** Tri actif */
  tri: TriAnnonces
  
  /** Budget max (importé depuis simulateur) */
  budgetMax: number | null
  
  // --- Lead / Unlock ---
  
  /** Données débloquées par email */
  unlocked: boolean
  /** Email du lead */
  leadEmail: string | null
  /** Timestamp du déblocage (pour TTL) */
  unlockedAt: number | null
  /** IDs triés de la sélection au moment du déblocage (pour re-verrouiller si la sélection change) */
  unlockedForSelection: string[] | null
  /** Qualification faite */
  qualificationDone: boolean
  /** Lead chaud */
  isHotLead: boolean
  
  // --- Actions ---
  
  /** Débloquer les données (après email) */
  unlock: (email: string) => void
  /** Réinitialiser le déblocage */
  resetUnlock: () => void
  /** Marquer la qualification comme faite */
  setQualified: (isHot: boolean) => void
  
  /** Ajouter une annonce */
  ajouterAnnonce: (annonce: NouvelleAnnonce) => string
  
  /** Modifier une annonce */
  modifierAnnonce: (id: string, updates: Partial<NouvelleAnnonce>) => void
  
  /** Supprimer une annonce */
  supprimerAnnonce: (id: string) => void
  
  /** Supprimer plusieurs annonces d'un coup */
  supprimerPlusieurs: (ids: string[]) => void
  
  /** Dupliquer une annonce */
  dupliquerAnnonce: (id: string) => string | null
  
  /** Toggle favori */
  toggleFavori: (id: string) => void
  
  /** Sélectionner/désélectionner pour comparaison */
  toggleSelection: (id: string) => void
  
  /** Tout désélectionner */
  deselectionnerTout: () => void
  
  /** Mettre à jour les filtres */
  setFiltres: (filtres: FiltresAnnonces) => void
  
  /** Mettre à jour le tri */
  setTri: (tri: TriAnnonces) => void
  
  /** Importer le budget depuis le simulateur */
  setBudgetMax: (budget: number | null) => void
  
  /** Réinitialiser le store */
  reset: () => void
}

// ============================================
// HELPERS
// ============================================

/** Générer un ID unique */
function generateId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/** Détecter la source depuis l'URL — utilise la version canonique d'extracteur.ts */
function detecterSource(url?: string): Annonce['source'] {
  if (!url) return 'manuel'
  return (detecterSourceFromUrl(url) as Annonce['source']) ?? 'manuel'
}

// ============================================
// ÉTAT INITIAL
// ============================================

const initialState = {
  _hasHydrated: false,
  annonces: [] as Annonce[],
  annonceSelectionnees: [] as string[],
  filtres: {} as FiltresAnnonces,
  tri: 'dateAjout-desc' as TriAnnonces,
  budgetMax: null as number | null,
  unlocked: false,
  leadEmail: null as string | null,
  unlockedAt: null as number | null,
  unlockedForSelection: null as string[] | null,
  qualificationDone: false,
  isHotLead: false,
}

// ============================================
// STORE
// ============================================

export const useComparateurStore = create<ComparateurState>()(
  persist(
    (set, get) => {
      // Capture set for the onRehydrateStorage callback (avoids TDZ)
      _persistSet = (partial) => set(partial as Partial<ComparateurState>)

      return {
      ...initialState,
      
      ajouterAnnonce: (nouvelleAnnonce) => {
        const id = generateId()
        
        // Déduire le département depuis le code postal si absent
        let departement = nouvelleAnnonce.departement
        if (!departement && nouvelleAnnonce.codePostal) {
          const cp = nouvelleAnnonce.codePostal
          if (cp.startsWith('97')) {
            departement = cp.substring(0, 3) // DOM-TOM
          } else if (cp.startsWith('20')) {
            departement = parseInt(cp) < 20200 ? '2A' : '2B'
          } else {
            departement = cp.substring(0, 2)
          }
        }
        
        const annonce: Annonce = {
          id,
          source: detecterSource(nouvelleAnnonce.url),
          prixM2: nouvelleAnnonce.surface > 0
            ? Math.round(nouvelleAnnonce.prix / nouvelleAnnonce.surface)
            : 0,
          dateAjout: new Date(),
          favori: false,
          ...nouvelleAnnonce,
          ...(departement ? { departement } : {}),
        }
        
        set((state) => ({
          annonces: [...state.annonces, annonce]
        }))
        
        return id
      },
      
      modifierAnnonce: (id, updates) => {
        set((state) => ({
          annonces: state.annonces.map((ann) => {
            if (ann.id !== id) return ann
            
            const updated = { ...ann, ...updates }
            // Recalculer prix/m² si prix ou surface modifié
            if ('prix' in updates || 'surface' in updates) {
              updated.prixM2 = updated.surface > 0
                ? Math.round(updated.prix / updated.surface)
                : 0
            }
            // BUG-07 : Recalculer le département si le code postal change
            if ('codePostal' in updates && updated.codePostal) {
              const cp = updated.codePostal
              if (cp.startsWith('97')) {
                updated.departement = cp.substring(0, 3) // DOM-TOM
              } else if (cp.startsWith('20')) {
                updated.departement = parseInt(cp) < 20200 ? '2A' : '2B' // Corse
              } else {
                updated.departement = cp.substring(0, 2)
              }
            }
            return updated
          })
        }))
      },
      
      supprimerAnnonce: (id) => {
        set((state) => ({
          annonces: state.annonces.filter((ann) => ann.id !== id),
          annonceSelectionnees: state.annonceSelectionnees.filter((selId) => selId !== id)
        }))
      },
      
      supprimerPlusieurs: (ids) => {
        const idsSet = new Set(ids)
        set((state) => ({
          annonces: state.annonces.filter((ann) => !idsSet.has(ann.id)),
          annonceSelectionnees: state.annonceSelectionnees.filter((selId) => !idsSet.has(selId))
        }))
      },
      
      dupliquerAnnonce: (id) => {
        const original = get().annonces.find((a) => a.id === id)
        if (!original) return null
        
        const newId = generateId()
        const copie: Annonce = {
          ...original,
          id: newId,
          titre: original.titre ? `${original.titre} (copie)` : undefined,
          dateAjout: new Date(),
          favori: false,
        }
        
        set((state) => ({
          annonces: [...state.annonces, copie]
        }))
        
        return newId
      },
      
      toggleFavori: (id) => {
        set((state) => ({
          annonces: state.annonces.map((ann) => 
            ann.id === id ? { ...ann, favori: !ann.favori } : ann
          )
        }))
      },
      
      toggleSelection: (id) => {
        set((state) => {
          const isSelected = state.annonceSelectionnees.includes(id)
          
          if (isSelected) {
            // Désélectionner
            return {
              annonceSelectionnees: state.annonceSelectionnees.filter((selId) => selId !== id)
            }
          } else {
            // Sélectionner (max 4)
            if (state.annonceSelectionnees.length >= 4) {
              return state // Ne rien faire si déjà 4
            }
            return {
              annonceSelectionnees: [...state.annonceSelectionnees, id]
            }
          }
        })
      },
      
      deselectionnerTout: () => {
        set({ annonceSelectionnees: [] })
      },
      
      setFiltres: (filtres) => {
        set({ filtres })
      },
      
      setTri: (tri) => {
        set({ tri })
      },
      
      setBudgetMax: (budget) => {
        set({ budgetMax: budget })
      },
      
      unlock: (email) => {
        const selection = [...get().annonceSelectionnees].sort()
        set({ unlocked: true, leadEmail: email, unlockedAt: Date.now(), unlockedForSelection: selection, qualificationDone: false, isHotLead: false })
      },
      
      resetUnlock: () => {
        set({ unlocked: false, unlockedAt: null, unlockedForSelection: null, qualificationDone: false, isHotLead: false })
        // Note : leadEmail est conservé pour pré-remplir le champ email
      },
      
      setQualified: (isHot) => {
        set({ qualificationDone: true, isHotLead: isHot })
      },
      
      reset: () => {
        set(initialState)
      }
    }},
    {
      name: 'aquiz-comparateur',
      version: 1,
      partialize: (state) => ({
        annonces: state.annonces,
        annonceSelectionnees: state.annonceSelectionnees,
        budgetMax: state.budgetMax,
        unlocked: state.unlocked,
        leadEmail: state.leadEmail,
        unlockedAt: state.unlockedAt,
        unlockedForSelection: state.unlockedForSelection,
        qualificationDone: state.qualificationDone,
        isHotLead: state.isHotLead,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>
        if (version === 0) {
          // v0 → v1 : ajout de unlockedForSelection
          // Si unlocked sans unlockedForSelection, re-verrouiller pour forcer un email frais
          if (state.unlocked && !state.unlockedForSelection) {
            state.unlockedForSelection = null
            // On garde unlocked/unlockedAt intacts — isUnlocked() retournera false
            // car unlockedForSelection est null et la sélection a pu changer
          }
        }
        return state as unknown as ComparateurState
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[Comparateur] Erreur rehydratation:', error)
        }
        // Nettoyer les sélections orphelines (IDs qui ne correspondent plus à des annonces existantes)
        if (state && !error) {
          const existingIds = new Set(state.annonces.map(a => a.id))
          const cleanedSelection = state.annonceSelectionnees.filter(id => existingIds.has(id))
          if (cleanedSelection.length !== state.annonceSelectionnees.length) {
            state.annonceSelectionnees = cleanedSelection
          }
        }
        // Mark hydration complete using the captured set reference (no TDZ issue)
        _persistSet?.({ _hasHydrated: true })
      },
    }
  )
)

// ============================================
// SÉLECTEURS (ré-export depuis comparateur-selectors.ts)
// ============================================

export {
    calculerStatistiques,
    getAnnoncesFiltrees,
    getAnnoncesSelectionnees,
    isUnlocked
} from './comparateur-selectors'

