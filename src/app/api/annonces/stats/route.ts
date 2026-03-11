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
 * - Santé par site (tier, méthode, taux succès)
 * - Alertes (sites en panne détectés)
 * 
 * Protégé : uniquement en développement ou avec clé admin.
 */

import { getCacheSize, getScrapingStats } from '@/lib/scraping/antiBlock'
import { NextRequest, NextResponse } from 'next/server'

/** Configuration de santé par site — tier, méthodes, seuils d'alerte */
interface SiteHealthConfig {
  source: string
  tier: 'S' | 'A' | 'B' | 'C' | 'F'
  method: string
  domains: string[]
  /** Taux de succès en dessous duquel on alerte (%) */
  alertThreshold: number
}

const SITES_HEALTH: SiteHealthConfig[] = [
  // Tier S — APIs dédiées
  { source: 'SeLoger', tier: 'S', method: 'API mobile iOS/Android', domains: ['www.seloger.com', 'api-seloger.svc.groupe-seloger.com'], alertThreshold: 70 },
  { source: 'LeBonCoin', tier: 'S', method: 'API interne /finder/classified', domains: ['www.leboncoin.fr', 'api.leboncoin.fr'], alertThreshold: 70 },
  { source: "Bien'ici", tier: 'S', method: 'API JSON + HTML __NEXT_DATA__', domains: ['www.bienici.com'], alertThreshold: 70 },
  { source: 'Laforêt', tier: 'S', method: 'API REST /api/immo/properties', domains: ['www.laforet.com'], alertThreshold: 60 },
  { source: 'Orpi', tier: 'S', method: 'HTML JSON embarqué / __NEXT_DATA__', domains: ['www.orpi.com'], alertThreshold: 60 },
  // Tier A — HTML accessible
  { source: 'Century21', tier: 'A', method: 'HTML + __NEXT_DATA__', domains: ['www.century21.fr'], alertThreshold: 50 },
  { source: 'Guy Hoquet', tier: 'A', method: 'HTML + __NEXT_DATA__', domains: ['www.guy-hoquet.com', 'www.guyhoquet.com'], alertThreshold: 50 },
  { source: 'Stéphane Plaza', tier: 'A', method: 'HTML direct', domains: ['www.stephaneplazaimmobilier.com'], alertThreshold: 50 },
  { source: 'IAD France', tier: 'A', method: 'HTML direct', domains: ['www.iadfrance.fr'], alertThreshold: 50 },
  { source: 'Capifrance', tier: 'A', method: 'HTML direct', domains: ['www.capifrance.fr'], alertThreshold: 50 },
  { source: 'Safti', tier: 'A', method: 'HTML direct', domains: ['www.safti.fr'], alertThreshold: 50 },
  { source: 'OptimHome', tier: 'A', method: 'HTML direct', domains: ['www.optimhome.com'], alertThreshold: 50 },
  { source: 'ParuVendu', tier: 'A', method: 'HTML direct', domains: ['www.paruvendu.fr'], alertThreshold: 50 },
  { source: 'SuperImmo', tier: 'A', method: 'HTML direct', domains: ['www.superimmo.com'], alertThreshold: 50 },
  { source: 'AVendreALouer', tier: 'A', method: 'HTML direct', domains: ['www.avendrealouer.fr'], alertThreshold: 50 },
  { source: 'Green-Acres', tier: 'A', method: 'HTML direct', domains: ['www.green-acres.fr'], alertThreshold: 50 },
  { source: 'MeilleursAgents', tier: 'A', method: 'HTML direct', domains: ['www.meilleursagents.com'], alertThreshold: 50 },
  { source: 'Hosman', tier: 'A', method: 'HTML direct', domains: ['www.hosman.co', 'www.hosman.com'], alertThreshold: 50 },
  { source: 'Bouygues Immo', tier: 'A', method: 'HTML direct', domains: ['www.bouygues-immobilier.com'], alertThreshold: 50 },
  { source: 'Kaufman & Broad', tier: 'A', method: 'HTML direct', domains: ['www.kaufmanbroad.fr'], alertThreshold: 50 },
  // Tier B — Chrome-first
  { source: 'Logic-Immo', tier: 'B', method: 'Chrome stealth (SCRAPER_URL)', domains: ['www.logic-immo.com'], alertThreshold: 20 },
  { source: 'Foncia', tier: 'B', method: 'Chrome stealth (SCRAPER_URL)', domains: ['www.foncia.com'], alertThreshold: 20 },
  { source: 'Nexity', tier: 'B', method: 'Chrome stealth (SCRAPER_URL)', domains: ['www.nexity.fr'], alertThreshold: 20 },
  // Tier C — Fortement protégés
  { source: 'PAP.fr', tier: 'C', method: 'Jina / ScrapingBee (DataDome)', domains: ['www.pap.fr'], alertThreshold: 10 },
  { source: 'Ouest-France Immo', tier: 'C', method: 'Cascade complète', domains: ['www.ouestfrance-immo.com'], alertThreshold: 10 },
  { source: 'Figaro Immo', tier: 'C', method: 'Cascade complète', domains: ['immobilier.lefigaro.fr', 'www.explorimmo.com'], alertThreshold: 10 },
  // Tier F — Impossible
  { source: 'SeLoger Neuf', tier: 'F', method: 'Fast-fail → mode assistant', domains: ['www.selogerneuf.com'], alertThreshold: 0 },
]

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
  
  // ── Enrichir avec la santé par site ──
  const siteHealth = SITES_HEALTH.map(site => {
    let totalReqs = 0
    let totalSuccess = 0
    let totalBlocked = 0
    
    for (const domain of site.domains) {
      const domainStats = stats.byDomain[domain]
      if (domainStats) {
        totalReqs += domainStats.requests
        totalSuccess += domainStats.success
        totalBlocked += domainStats.blocked
      }
    }
    
    const successRate = totalReqs > 0 ? Math.round((totalSuccess / totalReqs) * 100) : null
    const isDown = successRate !== null && successRate < site.alertThreshold
    
    return {
      source: site.source,
      tier: site.tier,
      method: site.method,
      requests: totalReqs,
      success: totalSuccess,
      blocked: totalBlocked,
      successRate: successRate !== null ? `${successRate}%` : 'N/A',
      status: totalReqs === 0 ? 'no-data' : isDown ? 'alert' : 'ok',
    }
  })
  
  // ── Alertes : sites en panne ──
  const alerts = siteHealth
    .filter(s => s.status === 'alert')
    .map(s => `⚠️ ${s.source} (Tier ${s.tier}): ${s.successRate} succès — seulement ${s.success}/${s.requests} requêtes réussies`)
  
  // ── Infra check ──
  const infraStatus = {
    scraperUrl: !!process.env.SCRAPER_URL,
    scraperApiKey: !!process.env.SCRAPER_API_KEY,
    scrapingBeeKey: !!process.env.SCRAPINGBEE_API_KEY,
    firecrawlKey: !!process.env.FIRECRAWL_API_KEY,
    jinaApiKey: !!process.env.JINA_API_KEY,
    leboncoinApiKey: !!process.env.LEBONCOIN_API_KEY,
  }
  
  return NextResponse.json({
    ...stats,
    cacheSize: getCacheSize(),
    timestamp: new Date().toISOString(),
    siteHealth,
    alerts,
    infraStatus,
    totalSitesSupported: SITES_HEALTH.length,
    sitesWithData: siteHealth.filter(s => s.requests > 0).length,
    sitesHealthy: siteHealth.filter(s => s.status === 'ok').length,
    sitesDown: siteHealth.filter(s => s.status === 'alert').length,
  })
}
