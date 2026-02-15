/**
 * Hook pour récupérer les données DVF réelles
 * Avec gestion du loading, erreur et cache côté client
 */

'use client'

import type { ZoneGeographique } from '@/types/carte'
import { useCallback, useEffect, useState } from 'react'

// Types pour les données DVF
interface DVFStatsCommune {
  codeCommune: string
  nomCommune: string
  codeDepartement: string
  codePostal: string
  prixM2MedianAppart: number
  prixM2MedianMaison: number
  nbVentesAppart: number
  nbVentesMaison: number
  latitude: number
  longitude: number
  annee: number
}

interface DVFDepartementStats {
  codeDepartement: string
  nomDepartement: string
  communes: DVFStatsCommune[]
  nbTotalVentes: number
  prixM2MedianGlobal: number
  dateMAJ: string
  fromCache?: boolean
}

interface UseDVFDataResult {
  zones: ZoneGeographique[]
  isLoading: boolean
  error: string | null
  progress: { loaded: number; total: number }
  source: string
  refresh: () => void
}

// Cache côté client
const clientCache = new Map<string, DVFDepartementStats>()

// Convertir stats DVF en ZoneGeographique pour la carte
function dvfToZoneGeographique(stats: DVFStatsCommune, nomDepartement: string): ZoneGeographique {
  // Déterminer le type de zone
  const typeZone = stats.codeDepartement === '75' ? 'urbain' as const :
    ['92', '93', '94'].includes(stats.codeDepartement) ? 'periurbain' as const : 'rural' as const

  return {
    id: stats.codeCommune,
    codeInsee: stats.codeCommune,
    codePostal: stats.codePostal,
    nom: stats.nomCommune,
    departement: nomDepartement,
    codeDepartement: stats.codeDepartement,
    region: 'Île-de-France',
    typeZone,
    prixM2Appartement: stats.prixM2MedianAppart || 0,
    prixM2Maison: stats.prixM2MedianMaison || 0,
    evolutionPrix1an: 0, // Non disponible dans DVF brut
    evolutionPrix5ans: 0,
    centre: {
      lat: stats.latitude,
      lng: stats.longitude
    }
  }
}

/**
 * Hook pour charger les données DVF réelles pour l'IDF
 */
export function useDVFData(departements: readonly string[] = ['75', '92', '93', '94', '77', '78', '91', '95']): UseDVFDataResult {
  const [zones, setZones] = useState<ZoneGeographique[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ loaded: 0, total: departements.length })
  
  // Stabiliser la dépendance des départements
  const deptKey = departements.join(',')

  const fetchData = useCallback(async () => {
    const depts = deptKey.split(',')
    setIsLoading(true)
    setError(null)
    setProgress({ loaded: 0, total: depts.length })

    const allZones: ZoneGeographique[] = []
    let loaded = 0

    for (const codeDept of depts) {
      try {
        // Vérifier cache client
        if (clientCache.has(codeDept)) {
          const cached = clientCache.get(codeDept)!
          for (const commune of cached.communes) {
            if (commune.latitude && commune.longitude && (commune.prixM2MedianAppart > 0 || commune.prixM2MedianMaison > 0)) {
              allZones.push(dvfToZoneGeographique(commune, cached.nomDepartement))
            }
          }
        } else {
          // Appeler l'API
          const response = await fetch(`/api/dvf/${codeDept}`)
          
          if (!response.ok) {
            console.warn(`[DVF] Département ${codeDept}: ${response.status}`)
            continue
          }
          
          const data: DVFDepartementStats = await response.json()
          
          // Mettre en cache client
          clientCache.set(codeDept, data)
          
          // Convertir en zones
          for (const commune of data.communes) {
            if (commune.latitude && commune.longitude && (commune.prixM2MedianAppart > 0 || commune.prixM2MedianMaison > 0)) {
              allZones.push(dvfToZoneGeographique(commune, data.nomDepartement))
            }
          }
        }

        loaded++
        setProgress({ loaded, total: depts.length })
        
      } catch (err) {
        console.error(`[DVF] Erreur département ${codeDept}:`, err)
      }
    }

    if (allZones.length === 0) {
      setError('Aucune donnée DVF disponible')
    } else {
      setZones(allZones)
    }
    
    setIsLoading(false)
  }, [deptKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    zones,
    isLoading,
    error,
    progress,
    source: 'DVF - data.gouv.fr (transactions 2024)',
    refresh: fetchData
  }
}

/**
 * Hook pour charger les données d'une seule commune
 */
export function useDVFCommune(codeCommune: string | null) {
  const [data, setData] = useState<DVFStatsCommune | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!codeCommune) {
      setData(null)
      return
    }

    const fetchCommune = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/dvf/commune/${codeCommune}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Commune non trouvée')
          } else {
            setError('Erreur de chargement')
          }
          setData(null)
          return
        }

        const result = await response.json()
        setData(result)
        
      } catch (err) {
        setError('Erreur réseau')
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCommune()
  }, [codeCommune])

  return { data, isLoading, error }
}
