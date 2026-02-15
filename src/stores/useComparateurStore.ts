/**
 * Store Zustand pour le comparateur d'annonces
 * Sprint 6 - AQUIZ
 */

import type {
    Annonce,
    FiltresAnnonces,
    NouvelleAnnonce,
    StatistiquesComparaison,
    TriAnnonces
} from '@/types/annonces'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================
// TYPES DU STORE
// ============================================

interface ComparateurState {
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
  
  // --- Actions ---
  
  /** Ajouter une annonce */
  ajouterAnnonce: (annonce: NouvelleAnnonce) => string
  
  /** Modifier une annonce */
  modifierAnnonce: (id: string, updates: Partial<NouvelleAnnonce>) => void
  
  /** Supprimer une annonce */
  supprimerAnnonce: (id: string) => void
  
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

/** Détecter la source depuis l'URL */
function detecterSource(url?: string): Annonce['source'] {
  if (!url) return 'manuel'
  
  const urlLower = url.toLowerCase()
  if (urlLower.includes('seloger')) return 'seloger'
  if (urlLower.includes('leboncoin')) return 'leboncoin'
  if (urlLower.includes('pap.fr')) return 'pap'
  if (urlLower.includes('bienici')) return 'bienici'
  if (urlLower.includes('logic-immo')) return 'logic-immo'
  
  return 'manuel'
}

// ============================================
// ÉTAT INITIAL
// ============================================

const initialState = {
  annonces: [] as Annonce[],
  annonceSelectionnees: [] as string[],
  filtres: {} as FiltresAnnonces,
  tri: 'dateAjout-desc' as TriAnnonces,
  budgetMax: null as number | null
}

// ============================================
// STORE
// ============================================

export const useComparateurStore = create<ComparateurState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      ajouterAnnonce: (nouvelleAnnonce) => {
        const id = generateId()
        const annonce: Annonce = {
          id,
          source: detecterSource(nouvelleAnnonce.url),
          prixM2: Math.round(nouvelleAnnonce.prix / nouvelleAnnonce.surface),
          dateAjout: new Date(),
          favori: false,
          ...nouvelleAnnonce
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
            if (updates.prix || updates.surface) {
              updated.prixM2 = Math.round(updated.prix / updated.surface)
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
      
      reset: () => {
        set(initialState)
      }
    }),
    {
      name: 'aquiz-comparateur',
      partialize: (state) => ({
        annonces: state.annonces,
        annonceSelectionnees: state.annonceSelectionnees,
        budgetMax: state.budgetMax
      })
    }
  )
)

// ============================================
// SÉLECTEURS
// ============================================

/**
 * Récupère les annonces filtrées et triées
 */
export function getAnnoncesFiltrees(state: ComparateurState): Annonce[] {
  let result = [...state.annonces]
  const { filtres, tri } = state
  
  // Appliquer les filtres
  if (filtres.prixMin !== undefined) {
    result = result.filter((a) => a.prix >= filtres.prixMin!)
  }
  if (filtres.prixMax !== undefined) {
    result = result.filter((a) => a.prix <= filtres.prixMax!)
  }
  if (filtres.surfaceMin !== undefined) {
    result = result.filter((a) => a.surface >= filtres.surfaceMin!)
  }
  if (filtres.surfaceMax !== undefined) {
    result = result.filter((a) => a.surface <= filtres.surfaceMax!)
  }
  if (filtres.type && filtres.type !== 'tous') {
    result = result.filter((a) => a.type === filtres.type)
  }
  if (filtres.favorisUniquement) {
    result = result.filter((a) => a.favori)
  }
  if (filtres.dpeMax) {
    const ordresDPE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'NC']
    const indexMax = ordresDPE.indexOf(filtres.dpeMax)
    result = result.filter((a) => {
      if (a.dpe === 'NC') return true // NC passe toujours
      return ordresDPE.indexOf(a.dpe) <= indexMax
    })
  }
  
  // Appliquer le tri
  result.sort((a, b) => {
    switch (tri) {
      case 'prix-asc':
        return a.prix - b.prix
      case 'prix-desc':
        return b.prix - a.prix
      case 'prixM2-asc':
        return a.prixM2 - b.prixM2
      case 'prixM2-desc':
        return b.prixM2 - a.prixM2
      case 'surface-asc':
        return a.surface - b.surface
      case 'surface-desc':
        return b.surface - a.surface
      case 'dateAjout-desc':
      default:
        return new Date(b.dateAjout).getTime() - new Date(a.dateAjout).getTime()
    }
  })
  
  return result
}

/**
 * Récupère les annonces sélectionnées pour comparaison
 */
export function getAnnoncesSelectionnees(state: ComparateurState): Annonce[] {
  return state.annonces.filter((a) => state.annonceSelectionnees.includes(a.id))
}

/**
 * Calcule les statistiques sur un ensemble d'annonces
 */
export function calculerStatistiques(annonces: Annonce[]): StatistiquesComparaison {
  if (annonces.length === 0) {
    return {
      nbAnnonces: 0,
      prixMoyen: 0,
      prixMin: 0,
      prixMax: 0,
      prixM2Moyen: 0,
      surfaceMoyenne: 0
    }
  }
  
  const prix = annonces.map((a) => a.prix)
  const prixM2 = annonces.map((a) => a.prixM2)
  const surfaces = annonces.map((a) => a.surface)
  
  const prixMin = Math.min(...prix)
  const prixMax = Math.max(...prix)
  const prixMoyen = Math.round(prix.reduce((sum, p) => sum + p, 0) / prix.length)
  const prixM2Moyen = Math.round(prixM2.reduce((sum, p) => sum + p, 0) / prixM2.length)
  const surfaceMoyenne = Math.round(surfaces.reduce((sum, s) => sum + s, 0) / surfaces.length)
  
  // Meilleur rapport qualité/prix = meilleur prix/m² avec surface > moyenne
  const meilleursRapport = annonces
    .filter((a) => a.surface >= surfaceMoyenne * 0.9) // Au moins 90% de la surface moyenne
    .sort((a, b) => a.prixM2 - b.prixM2)
  const meilleurRapportId = meilleursRapport[0]?.id
  
  // Moins cher
  const moinsChere = annonces.reduce((min, a) => a.prix < min.prix ? a : min, annonces[0])
  
  // Meilleur DPE
  const ordresDPE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'NC']
  const meilleurDPE = annonces.reduce((best, a) => {
    if (a.dpe === 'NC') return best
    if (best.dpe === 'NC') return a
    return ordresDPE.indexOf(a.dpe) < ordresDPE.indexOf(best.dpe) ? a : best
  }, annonces[0])
  
  return {
    nbAnnonces: annonces.length,
    prixMoyen,
    prixMin,
    prixMax,
    prixM2Moyen,
    surfaceMoyenne,
    meilleurRapportId,
    moinsChererId: moinsChere.id,
    meilleurDPEId: meilleurDPE.dpe !== 'NC' ? meilleurDPE.id : undefined
  }
}
