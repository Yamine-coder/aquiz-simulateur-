'use client'

/**
 * Hook useAnalyseEnrichie
 * 
 * Gère l'appel aux APIs gratuites pour enrichir l'analyse des biens :
 * - DVF (prix du marché)
 * - Géorisques (risques)
 * - OpenStreetMap (score quartier)
 */

import { analyserBien, type AnalyseComplete, type BienAnalyse } from '@/lib/api/analyseIntelligente'
import type { Annonce } from '@/types/annonces'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAnalyseEnrichieReturn {
  analyses: Map<string, AnalyseComplete>
  isLoading: boolean
  loadingIds: Set<string>
  error: string | null
  refreshAnalyse: (annonceId: string) => void
  getAnalyse: (annonceId: string) => AnalyseComplete | null
}

/**
 * Convertit une Annonce en BienAnalyse pour l'API
 */
function annonceToBienAnalyse(annonce: Annonce): BienAnalyse {
  // Extraire le code postal de l'annonce ou de la ville
  let codePostal = annonce.codePostal?.trim()
  
  // Si le code postal est vide, essayer de l'extraire de la ville
  if (!codePostal || codePostal.length !== 5) {
    codePostal = extraireCodePostal(annonce.ville)
  }
  
  return {
    id: annonce.id,
    adresse: annonce.adresse,
    codePostal,
    ville: annonce.ville,
    prix: annonce.prix,
    surface: annonce.surface,
    typeBien: annonce.type === 'maison' ? 'maison' : 'appartement',
    prixM2: annonce.prixM2,
    dpe: annonce.dpe,
    etage: annonce.etage,
    hasAscenseur: annonce.ascenseur,
    hasBalcon: annonce.balconTerrasse,
    hasParking: annonce.parking,
    hasCave: annonce.cave
  }
}

/**
 * Tente d'extraire le code postal du nom de ville
 * Format attendu: "Paris (75001)" ou "75001 Paris" ou "Vitry-sur-Seine (94400)"
 */
function extraireCodePostal(ville: string): string {
  if (!ville) return ''
  
  // Cherche un code postal français (5 chiffres)
  const match = ville.match(/\b(0[1-9]|[1-9][0-9])\d{3}\b/)
  if (match) {
    return match[0]
  }
  
  // Si pas trouvé, retourner vide (pas de défaut à Paris qui fausserait les données)
  return ''
}

/**
 * Hook principal pour l'analyse enrichie
 */
export function useAnalyseEnrichie(annonces: Annonce[]): UseAnalyseEnrichieReturn {
  const [analyses, setAnalyses] = useState<Map<string, AnalyseComplete>>(new Map())
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  // Ref pour lire les analyses sans les mettre dans les deps du useEffect
  const analysesRef = useRef(analyses)
  analysesRef.current = analyses
  
  // Analyser les annonces quand elles changent
  useEffect(() => {
    if (annonces.length === 0) {
      setAnalyses(new Map())
      return
    }
    
    // Identifier les annonces qui n'ont pas encore été analysées
    const annoncesSansAnalyse = annonces.filter(a => !analysesRef.current.has(a.id))
    
    if (annoncesSansAnalyse.length === 0) return
    
    // Marquer comme en cours de chargement
    setLoadingIds(prev => {
      const next = new Set(prev)
      annoncesSansAnalyse.forEach(a => next.add(a.id))
      return next
    })
    
    // Lancer les analyses en parallèle
    const analyserTout = async () => {
      try {
        const resultats = await Promise.all(
          annoncesSansAnalyse.map(async (annonce) => {
            try {
              const bien = annonceToBienAnalyse(annonce)
              const analyse = await analyserBien(bien)
              return { id: annonce.id, analyse }
            } catch (err) {
              console.error(`Erreur analyse ${annonce.id}:`, err)
              return { id: annonce.id, analyse: null }
            }
          })
        )
        
        // Mettre à jour les analyses
        setAnalyses(prev => {
          const next = new Map(prev)
          resultats.forEach(({ id, analyse }) => {
            if (analyse) {
              next.set(id, analyse)
            }
          })
          return next
        })
        
        setError(null)
      } catch (err) {
        console.error('Erreur analyse enrichie:', err)
        setError('Erreur lors de l\'analyse des biens')
      } finally {
        // Retirer du chargement
        setLoadingIds(prev => {
          const next = new Set(prev)
          annoncesSansAnalyse.forEach(a => next.delete(a.id))
          return next
        })
      }
    }
    
    analyserTout()
  }, [annonces]) // analyses retiré des deps — utilise analysesRef pour éviter le re-render cycle
  
  // Nettoyer les analyses des annonces supprimées
  useEffect(() => {
    const annonceIds = new Set(annonces.map(a => a.id))
    
    setAnalyses(prev => {
      const next = new Map(prev)
      for (const id of prev.keys()) {
        if (!annonceIds.has(id)) {
          next.delete(id)
        }
      }
      return next
    })
  }, [annonces])
  
  // Rafraîchir l'analyse d'une annonce
  const refreshAnalyse = useCallback(async (annonceId: string) => {
    const annonce = annonces.find(a => a.id === annonceId)
    if (!annonce) return
    
    setLoadingIds(prev => new Set(prev).add(annonceId))
    
    try {
      const bien = annonceToBienAnalyse(annonce)
      const analyse = await analyserBien(bien)
      
      setAnalyses(prev => {
        const next = new Map(prev)
        next.set(annonceId, analyse)
        return next
      })
    } catch (err) {
      console.error(`Erreur refresh ${annonceId}:`, err)
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(annonceId)
        return next
      })
    }
  }, [annonces])
  
  // Récupérer l'analyse d'une annonce
  const getAnalyse = useCallback((annonceId: string): AnalyseComplete | null => {
    return analyses.get(annonceId) || null
  }, [analyses])
  
  return {
    analyses,
    isLoading: loadingIds.size > 0,
    loadingIds,
    error,
    refreshAnalyse,
    getAnalyse
  }
}

/**
 * Hook simplifié pour une seule annonce
 */
export function useAnalyseEnrichieSingle(annonce: Annonce | null): {
  analyse: AnalyseComplete | null
  isLoading: boolean
  error: string | null
  refresh: () => void
} {
  const [analyse, setAnalyse] = useState<AnalyseComplete | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const loadAnalyse = useCallback(async () => {
    if (!annonce) {
      setAnalyse(null)
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const bien = annonceToBienAnalyse(annonce)
      const result = await analyserBien(bien)
      setAnalyse(result)
    } catch (err) {
      console.error('Erreur analyse:', err)
      setError('Erreur lors de l\'analyse')
    } finally {
      setIsLoading(false)
    }
  }, [annonce])
  
  useEffect(() => {
    loadAnalyse()
  }, [loadAnalyse])
  
  return {
    analyse,
    isLoading,
    error,
    refresh: loadAnalyse
  }
}
