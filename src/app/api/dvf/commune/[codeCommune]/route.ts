/**
 * API Route: /api/dvf/commune/[codeCommune]
 * 
 * Récupère les prix DVF réels pour une commune spécifique
 */

import { fetchDVFCommune, type DVFStatsCommune } from '@/lib/api/dvf-real';
import { ServerCache } from '@/lib/serverCache';
import { NextRequest, NextResponse } from 'next/server';

// Cache borné (TTL 24h, max 500 communes)
const cache = new ServerCache<DVFStatsCommune | null>({ ttlMs: 24 * 60 * 60 * 1000, maxSize: 500 })

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codeCommune: string }> }
) {
  try {
    const { codeCommune } = await params
    
    // Valider le code commune (5 chiffres)
    if (!codeCommune || !/^\d{5}$/.test(codeCommune)) {
      return NextResponse.json(
        { error: 'Code commune invalide (format: 5 chiffres)' },
        { status: 400 }
      )
    }

    // Vérifier le cache
    const cacheKey = `dvf_commune_${codeCommune}`
    const cached = cache.get(cacheKey)
    
    if (cached !== undefined) {
      if (!cached) {
        return NextResponse.json(
          { error: 'Commune non trouvée' },
          { status: 404 }
        )
      }
      return NextResponse.json({
        ...cached,
        fromCache: true
      })
    }

    // Récupérer les données DVF réelles
    console.info(`[DVF] Fetch commune ${codeCommune}`)
    const data = await fetchDVFCommune(codeCommune)
    
    // Mettre en cache (même si null)
    cache.set(cacheKey, data)
    
    if (!data) {
      return NextResponse.json(
        { error: 'Commune non trouvée ou aucune transaction' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      ...data,
      fromCache: false
    })
    
  } catch (error) {
    console.error('[API DVF Commune] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données DVF' },
      { status: 500 }
    )
  }
}
