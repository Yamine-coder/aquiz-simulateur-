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
import { logger } from '@/lib/logger'
import type { Annonce } from '@/types/annonces'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAnalyseEnrichieReturn {
  analyses: Map<string, AnalyseComplete>
  isLoading: boolean
  loadingIds: Set<string>
  failedIds: Set<string>
  error: string | null
  refreshAnalyse: (annonceId: string) => void
  retryFailed: () => void
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
    hasCave: annonce.cave,
    latitude: annonce.latitude,
    longitude: annonce.longitude,
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
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  // Ref pour lire les analyses sans les mettre dans les deps du useEffect
  const analysesRef = useRef(analyses)
  analysesRef.current = analyses
  const failedIdsRef = useRef(failedIds)
  failedIdsRef.current = failedIds
  // BUG-10 : compteur de retries par ID pour éviter les boucles infinies
  const retryCountRef = useRef<Map<string, number>>(new Map())
  const MAX_RETRIES = 3
  // BUG-06 : tracker un hash des champs clés pour détecter les modifications
  const annonceHashRef = useRef<Map<string, string>>(new Map())
  
  // Analyser les annonces quand elles changent
  useEffect(() => {
    if (annonces.length === 0) {
      setAnalyses(new Map())
      return
    }
    
    // Identifier les annonces qui n'ont pas encore été analysées (et pas en échec)
    // BUG-06 : aussi re-analyser si les champs clés ont changé
    const computeHash = (a: Annonce): string => `${a.prix}_${a.surface}_${a.codePostal}_${a.dpe}_${a.type}`
    const annoncesSansAnalyse = annonces.filter(a => {
      const hash = computeHash(a)
      const prevHash = annonceHashRef.current.get(a.id)
      if (prevHash && prevHash !== hash) {
        // Champs clés modifiés → invalider l'ancienne analyse
        annonceHashRef.current.set(a.id, hash)
        return true
      }
      if (!analysesRef.current.has(a.id) && !failedIdsRef.current.has(a.id)) {
        annonceHashRef.current.set(a.id, hash)
        return true
      }
      return false
    })
    
    if (annoncesSansAnalyse.length === 0) return
    
    // Marquer comme en cours de chargement
    setLoadingIds(prev => {
      const next = new Set(prev)
      annoncesSansAnalyse.forEach(a => next.add(a.id))
      return next
    })
    
    // Lancer les analyses SÉQUENTIELLEMENT pour éviter les 429 Overpass
    const analyserTout = async () => {
      try {
        const resultats: Array<{ id: string; analyse: AnalyseComplete | null }> = []
        // Partage en-cours : si une annonce réussit le quartier pour un CP, les suivantes du
        // même CP réutilisent directement ce résultat sans rappeler Overpass.
        const quartierByCPLive = new Map<string, AnalyseComplete['quartier']>()

        for (let i = 0; i < annoncesSansAnalyse.length; i++) {
          const annonce = annoncesSansAnalyse[i]
          // Délai entre chaque annonce : Overpass rate-limite par IP.
          // 2000ms laisse le temps à la connexion Overpass précédente de se fermer.
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 2000))
          try {
            const bien = annonceToBienAnalyse(annonce)
            if (!bien.codePostal || bien.codePostal.length !== 5) {
              logger.warn(`Analyse ${annonce.id} : code postal manquant ou invalide ("${bien.codePostal}"). Enrichissement partiel.`)
            }
            const analyse = await analyserBien(bien)
            // Si on a déjà un quartier réussi pour ce CP, l'injecter si l'analyse a échoué le sien
            if (analyse && !analyse.quartier?.success && bien.codePostal && quartierByCPLive.has(bien.codePostal)) {
              analyse.quartier = quartierByCPLive.get(bien.codePostal)
            }
            // Mémoriser pour les annonces suivantes du même CP
            if (analyse?.quartier?.success && bien.codePostal) {
              quartierByCPLive.set(bien.codePostal, analyse.quartier)
            }
            resultats.push({ id: annonce.id, analyse })
          } catch (err) {
            logger.error(`Erreur analyse ${annonce.id}:`, err)
            resultats.push({ id: annonce.id, analyse: null })
          }
        }
        
        // Propager les données quartier entre biens du même code postal
        // (si un bien a réussi, les autres du même CP en profitent)
        const quartierByCP = new Map<string, AnalyseComplete['quartier']>()
        for (const { analyse } of resultats) {
          if (analyse?.quartier?.success && analyse.bien.codePostal) {
            if (!quartierByCP.has(analyse.bien.codePostal)) {
              quartierByCP.set(analyse.bien.codePostal, analyse.quartier)
            }
          }
        }
        for (const r of resultats) {
          if (r.analyse && !r.analyse.quartier?.success && r.analyse.bien.codePostal) {
            const shared = quartierByCP.get(r.analyse.bien.codePostal)
            if (shared) r.analyse = { ...r.analyse, quartier: shared }
          }
        }
        
        // Mettre à jour les analyses + tracker les échecs
        setAnalyses(prev => {
          const next = new Map(prev)
          resultats.forEach(({ id, analyse }) => {
            if (analyse) {
              next.set(id, analyse)
            }
          })
          return next
        })
        
        // Enregistrer les IDs en échec pour ne pas les re-tenter en boucle
        const newFailed = resultats.filter(r => !r.analyse).map(r => r.id)
        if (newFailed.length > 0) {
          setFailedIds(prev => {
            const next = new Set(prev)
            newFailed.forEach(id => next.add(id))
            return next
          })
        }
        
        setError(null)
      } catch (err) {
        logger.error('Erreur analyse enrichie:', err)
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

  // BUG-17 : Auto-retry des analyses en échec après 60 secondes (max 3 tentatives)
  useEffect(() => {
    if (failedIds.size === 0) return
    const timer = setTimeout(() => {
      // BUG-10 : ne retenter que les IDs qui n'ont pas atteint le max
      const idsToRetry = new Set<string>()
      for (const id of failedIds) {
        const count = retryCountRef.current.get(id) || 0
        if (count < MAX_RETRIES) {
          retryCountRef.current.set(id, count + 1)
          idsToRetry.add(id)
        }
      }
      if (idsToRetry.size > 0) {
        setFailedIds(prev => {
          const next = new Set(prev)
          for (const id of idsToRetry) next.delete(id)
          return next
        })
      }
    }, 60_000)
    return () => clearTimeout(timer)
  }, [failedIds])
  
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
    
    // Retirer des échecs pour autoriser le re-fetch
    setFailedIds(prev => {
      const next = new Set(prev)
      next.delete(annonceId)
      return next
    })
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
      logger.error(`Erreur refresh ${annonceId}:`, err)
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

  // Relancer toutes les analyses en échec
  const retryFailed = useCallback(() => {
    if (failedIds.size === 0) return
    // Vider les échecs → le useEffect les re-détectera comme "sans analyse"
    setFailedIds(new Set())
  }, [failedIds])
  
  return {
    analyses,
    isLoading: loadingIds.size > 0,
    loadingIds,
    failedIds,
    error,
    refreshAnalyse,
    retryFailed,
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
      logger.error('Erreur analyse:', err)
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
