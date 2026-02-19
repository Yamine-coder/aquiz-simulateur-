/**
 * API Route: /api/dvf/[codeDept]
 * 
 * Récupère les prix DVF réels pour un département
 * avec mise en cache côté serveur
 */

import { fetchDVFDepartement, type DVFDepartementStats } from '@/lib/api/dvf-real';
import { ServerCache } from '@/lib/serverCache';
import { NextRequest, NextResponse } from 'next/server';

// Cache borné (TTL 24h, max 100 départements)
const cache = new ServerCache<DVFDepartementStats>({ ttlMs: 24 * 60 * 60 * 1000, maxSize: 100 })

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
    
    if (cached) {
      return NextResponse.json({
        ...cached,
        fromCache: true
      })
    }

    // Récupérer les données DVF réelles
    console.info(`[DVF] Fetch dept ${codeDept}`)
    const data = await fetchDVFDepartement(codeDept)
    
    // Mettre en cache
    cache.set(cacheKey, data)
    
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
