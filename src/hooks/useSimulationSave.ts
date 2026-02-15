/**
 * Hook de sauvegarde des simulations AQUIZ
 * 
 * Sauvegarde MANUELLE uniquement (pas d'auto-save)
 * L'utilisateur clique sur "Sauvegarder" pour enregistrer
 */

'use client'

import type { ModeSimulation } from '@/types/simulateur'
import type {
    SavedModeAData,
    SavedModeBData,
    SavedProfil,
    SavedResultats,
    SavedSimulation,
    SimulationStatus,
    SimulationStorage
} from '@/types/simulation-save'
import { MAX_SIMULATIONS, STORAGE_KEY } from '@/types/simulation-save'
import { useCallback, useEffect, useState } from 'react'

/** Génère un ID unique */
function generateId(): string {
  return `sim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** Charge depuis localStorage */
function loadStorage(): SimulationStorage {
  if (typeof window === 'undefined') {
    return { simulations: [] }
  }
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Erreur lecture localStorage:', e)
  }
  return { simulations: [] }
}

/** Sauvegarde dans localStorage */
function saveStorage(storage: SimulationStorage): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
  } catch (e) {
    console.error('Erreur écriture localStorage:', e)
  }
}

/** Hook principal */
export function useSimulationSave() {
  const [simulations, setSimulations] = useState<SavedSimulation[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Charger au montage
  useEffect(() => {
    const storage = loadStorage()
    setSimulations(storage.simulations)
    setIsLoaded(true)
  }, [])

  /** Sauvegarder une simulation */
  const save = useCallback((data: {
    mode: ModeSimulation
    etape: string
    profil: SavedProfil | null
    modeAData?: SavedModeAData | null
    modeBData?: SavedModeBData | null
    resultats?: SavedResultats | null
    status?: SimulationStatus
    existingId?: string
  }): SavedSimulation => {
    const now = new Date().toISOString()
    
    // Créer ou mettre à jour
    const simulation: SavedSimulation = {
      id: data.existingId || generateId(),
      mode: data.mode,
      status: data.status || 'en_cours',
      etape: data.etape,
      savedAt: now,
      profil: data.profil,
      modeAData: data.modeAData || null,
      modeBData: data.modeBData || null,
      resultats: data.resultats || null
    }

    setSimulations(prev => {
      // Sécurité : s'assurer que prev est un tableau
      const current = Array.isArray(prev) ? prev : []
      
      // Si ID existant, remplacer
      let updated: SavedSimulation[]
      if (data.existingId) {
        const exists = current.some(s => s.id === data.existingId)
        if (exists) {
          updated = current.map(s => s.id === data.existingId ? simulation : s)
        } else {
          updated = [simulation, ...current].slice(0, MAX_SIMULATIONS)
        }
      } else {
        // Nouvelle simulation en tête, limite max
        updated = [simulation, ...current].slice(0, MAX_SIMULATIONS)
      }
      
      // Sauvegarder
      saveStorage({ simulations: updated })
      return updated
    })

    return simulation
  }, [])

  /** Supprimer une simulation */
  const remove = useCallback((id: string): void => {
    setSimulations(prev => {
      const updated = prev.filter(s => s.id !== id)
      saveStorage({ simulations: updated })
      return updated
    })
  }, [])

  /** Supprimer toutes les simulations */
  const clearAll = useCallback((): void => {
    setSimulations([])
    saveStorage({ simulations: [] })
  }, [])

  /** Obtenir une simulation "en cours" pour un mode donné */
  const getPending = useCallback((mode: ModeSimulation): SavedSimulation | null => {
    if (!simulations || simulations.length === 0) return null
    return simulations.find(s => s.mode === mode && s.status === 'en_cours') || null
  }, [simulations])

  /** Exporter une simulation en JSON */
  const exportJson = useCallback((id: string): string | null => {
    const sim = simulations.find(s => s.id === id)
    if (!sim) return null
    return JSON.stringify(sim, null, 2)
  }, [simulations])

  /** Importer une simulation depuis JSON */
  const importJson = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json) as SavedSimulation
      if (!data.mode || !data.profil) {
        throw new Error('Format invalide')
      }
      
      // Générer un nouvel ID
      const imported: SavedSimulation = {
        ...data,
        id: generateId(),
        savedAt: new Date().toISOString()
      }
      
      setSimulations(prev => {
        const updated = [imported, ...prev].slice(0, MAX_SIMULATIONS)
        saveStorage({ simulations: updated })
        return updated
      })
      
      return true
    } catch (e) {
      console.error('Erreur import:', e)
      return false
    }
  }, [])

  return {
    // État
    simulations,
    isLoaded,
    
    // Actions
    save,
    remove,
    clearAll,
    getPending,
    
    // Export/Import
    exportJson,
    importJson
  }
}

export type UseSimulationSaveReturn = ReturnType<typeof useSimulationSave>
