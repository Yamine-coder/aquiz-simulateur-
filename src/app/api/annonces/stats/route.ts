/**
 * API Route pour consulter les statistiques de scraping
 * GET /api/annonces/stats
 * 
 * Retourne :
 * - Nombre total de requêtes
 * - Taux de cache hit
 * - Taux de succès
 * - Nombre de blocages
 * - Stats par domaine
 * 
 * Protégé : uniquement en développement ou avec clé admin.
 */

import { getCacheSize, getScrapingStats } from '@/lib/scraping/antiBlock'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Protection : uniquement en dev ou avec clé admin
  const isDev = process.env.NODE_ENV === 'development'
  const adminKey = process.env.ADMIN_API_KEY
  const providedKey = request.headers.get('x-admin-key') || request.nextUrl.searchParams.get('key')
  
  if (!isDev && (!adminKey || providedKey !== adminKey)) {
    return NextResponse.json(
      { error: 'Accès non autorisé' },
      { status: 403 }
    )
  }
  
  const stats = getScrapingStats()
  
  return NextResponse.json({
    ...stats,
    cacheSize: getCacheSize(),
    timestamp: new Date().toISOString(),
  })
}
