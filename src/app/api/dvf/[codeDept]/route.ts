/**
 * API Route: /api/dvf/[codeDept]
 * 
 * Récupère les prix DVF réels pour un département
 * avec mise en cache côté serveur
 */

import { fetchDVFDepartement, type DVFDepartementStats } from '@/lib/api/dvf-real';
import { NextRequest, NextResponse } from 'next/server';

// Cache en mémoire (simple pour le MVP)
// En production: utiliser Redis ou autre
const cache = new Map<string, { data: DVFDepartementStats; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 heures

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codeDept: string }> }
) {
  try {
    const { codeDept } = await params
    
    // Valider le code département
    if (!codeDept || !/^\d{2,3}$/.test(codeDept)) {
      return NextResponse.json(
        { error: 'Code département invalide' },
        { status: 400 }
      )
    }

    // Vérifier le cache
    const cacheKey = `dvf_${codeDept}`
    const cached = cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ...cached.data,
        fromCache: true
      })
    }

    // Récupérer les données DVF réelles
    console.log(`[API DVF] Fetching real data for ${codeDept}...`)
    const data = await fetchDVFDepartement(codeDept)
    
    // Mettre en cache
    cache.set(cacheKey, { data, timestamp: Date.now() })
    
    return NextResponse.json({
      ...data,
      fromCache: false
    })
    
  } catch (error) {
    console.error('[API DVF] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données DVF' },
      { status: 500 }
    )
  }
}
