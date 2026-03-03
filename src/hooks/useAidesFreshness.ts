/**
 * Hook — Fraîcheur des données aides
 * 
 * Calcule dynamiquement la date de dernière vérification
 * à partir des métadonnées du fichier aides-accession.ts
 * 
 * Pas de requête réseau — calcul local pur.
 */

import { TOUTES_AIDES } from '@/data/aides-accession'
import { useMemo } from 'react'

export interface AidesFreshness {
  /** Date de la vérification la plus récente parmi toutes les aides */
  lastVerification: Date
  /** Nombre de jours depuis cette vérification */
  daysSinceLastCheck: number
  /** Nombre d'aides considérées obsolètes (>90j) */
  staleCount: number
  /** Label traduit en français */
  label: string
  /** Couleur du badge (Tailwind classes) */
  colorClass: string
  /** Statut global */
  status: 'fresh' | 'aging' | 'stale'
}

/**
 * Calcule la fraîcheur globale des données aides
 */
export function useAidesFreshness(): AidesFreshness {
  return useMemo(() => {
    const now = new Date()
    const activeAides = TOUTES_AIDES.filter(a => a.actif)
    
    // Trouver la vérification la plus récente
    let latestDate = new Date(0)
    let staleCount = 0
    
    for (const aide of activeAides) {
      const dateStr = aide.dateVerification || aide.dateMAJ
      const date = new Date(dateStr)
      if (date > latestDate) latestDate = date
      
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 90) staleCount++
    }
    
    const daysSinceLastCheck = Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Déterminer le statut
    let status: 'fresh' | 'aging' | 'stale'
    let label: string
    let colorClass: string
    
    if (daysSinceLastCheck <= 30) {
      status = 'fresh'
      label = formatRelativeDate(latestDate)
      colorClass = 'text-aquiz-green'
    } else if (daysSinceLastCheck <= 90) {
      status = 'aging'
      label = formatRelativeDate(latestDate)
      colorClass = 'text-amber-500'
    } else {
      status = 'stale'
      label = `il y a ${daysSinceLastCheck} jours`
      colorClass = 'text-red-500'
    }
    
    return {
      lastVerification: latestDate,
      daysSinceLastCheck,
      staleCount,
      label,
      colorClass,
      status,
    }
  }, [])
}

/**
 * Formate une date en relatif humain (français)
 */
function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "aujourd'hui"
  if (diffDays === 1) return 'hier'
  if (diffDays < 7) return `il y a ${diffDays} jours`
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`
  
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
