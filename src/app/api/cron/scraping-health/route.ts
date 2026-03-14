/**
 * Cron Route — Vérification de santé du scraping
 * 
 * GET /api/cron/scraping-health
 * 
 * Appelé automatiquement par Vercel Cron toutes les 6h.
 * Peut aussi être appelé manuellement avec le bon secret.
 * 
 * Tests effectués :
 * 1. Probe chaque API N1 avec une URL de test connue
 * 2. Vérifie la disponibilité du proxy Railway
 * 3. Vérifie que les User-Agents ne sont pas bloqués
 * 4. Envoie une alerte Sentry si dégradation détectée
 */

import { getHealthReport, recordExtraction, recordProxyHealth } from '@/lib/scraping/healthMonitor'
import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 55
export const dynamic = 'force-dynamic'

// ── URLs de test connues (annonces longue durée / programmes neufs) ──
// Ces URLs doivent être des annonces stables, pas des listings éphémères
const PROBE_TARGETS: { site: string; url: string; minFields: number }[] = [
  {
    site: 'seloger',
    url: 'https://www.seloger.com/annonces/achat/appartement/paris-15eme-75/saint-lambert/228839553.htm',
    minFields: 10,
  },
  {
    site: 'leboncoin',
    url: 'https://www.leboncoin.fr/ad/ventes_immobilieres/2861449498',
    minFields: 8,
  },
  {
    site: 'bienici',
    url: 'https://www.bienici.com/annonce/vente/paris/appartement/3pieces/ag751065-389965804',
    minFields: 8,
  },
  {
    site: 'laforet',
    url: 'https://www.laforet.com/acheter/paris-15eme-75015/appartement/r23e22c3fcddcfc88c62a45023b6a3ec',
    minFields: 10,
  },
]

/** Timeout par probe (12s max par site) */
const PROBE_TIMEOUT_MS = 12_000

/**
 * Vérifie l'autorisation du cron job.
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true
  if (process.env.NODE_ENV === 'development') return true
  return false
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const results: {
    site: string
    status: 'ok' | 'degraded' | 'down'
    method?: string
    fieldsExtracted?: number
    durationMs: number
    error?: string
  }[] = []

  // ── 1. Vérifier le proxy Railway ──
  const proxyUrl = process.env.SCRAPER_URL
  if (proxyUrl) {
    try {
      const t0 = performance.now()
      const resp = await fetch(`${proxyUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      const duration = Math.round(performance.now() - t0)
      const healthy = resp.ok
      recordProxyHealth(healthy)
      results.push({
        site: 'railway-proxy',
        status: healthy ? 'ok' : 'down',
        durationMs: duration,
        error: healthy ? undefined : `HTTP ${resp.status}`,
      })
    } catch (err) {
      recordProxyHealth(false)
      results.push({
        site: 'railway-proxy',
        status: 'down',
        durationMs: 0,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  } else {
    results.push({
      site: 'railway-proxy',
      status: 'down',
      durationMs: 0,
      error: 'SCRAPER_URL non configuré',
    })
  }

  // ── 2. Probe chaque API N1 via notre propre endpoint ──
  const baseUrl = request.nextUrl.origin

  for (const probe of PROBE_TARGETS) {
    const t0 = performance.now()
    try {
      const resp = await fetch(`${baseUrl}/api/annonces/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Bypass rate limit pour les probes internes
          'x-cron-probe': process.env.CRON_SECRET || 'dev',
        },
        body: JSON.stringify({ url: probe.url }),
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      })
      const durationMs = Math.round(performance.now() - t0)
      const data = await resp.json() as Record<string, unknown>

      if (data.success && typeof data.fieldsExtracted === 'number') {
        const fields = data.fieldsExtracted as number
        const method = (data.method as string) || 'unknown'
        
        // Enregistrer dans le monitor
        recordExtraction({
          site: probe.site,
          method,
          level: method.toLowerCase().includes('api') ? 'N1' : guessLevel(method),
          success: true,
          fieldsExtracted: fields,
          durationMs,
          timestamp: Date.now(),
        })

        results.push({
          site: probe.site,
          status: fields >= probe.minFields ? 'ok' : 'degraded',
          method,
          fieldsExtracted: fields,
          durationMs,
        })
      } else {
        recordExtraction({
          site: probe.site,
          method: 'probe',
          level: 'N1',
          success: false,
          fieldsExtracted: 0,
          durationMs,
          timestamp: Date.now(),
          error: (data.error as string) || 'extraction failed',
        })

        results.push({
          site: probe.site,
          status: 'down',
          durationMs,
          error: (data.error as string) || `success=false`,
        })
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0)
      recordExtraction({
        site: probe.site,
        method: 'probe',
        level: 'N1',
        success: false,
        fieldsExtracted: 0,
        durationMs,
        timestamp: Date.now(),
        error: err instanceof Error ? err.message : String(err),
      })

      results.push({
        site: probe.site,
        status: 'down',
        durationMs,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // Délai entre probes pour ne pas saturer
    await new Promise(r => setTimeout(r, 2000))
  }

  // ── 3. Générer le rapport et alerter si problème ──
  const report = getHealthReport()
  const downSites = results.filter(r => r.status === 'down' && r.site !== 'railway-proxy')
  const degradedSites = results.filter(r => r.status === 'degraded')

  if (downSites.length > 0 || (results.find(r => r.site === 'railway-proxy')?.status === 'down')) {
    Sentry.withScope(scope => {
      scope.setTag('cron', 'scraping-health')
      scope.setLevel('error')
      scope.setContext('health_check', {
        results,
        activeAlerts: report.alerts.filter(a => !a.resolved).length,
        overallStatus: report.overallStatus,
      })
      const downList = downSites.map(s => s.site).join(', ')
      Sentry.captureMessage(
        `🚨 Scraping Health: ${downSites.length} site(s) DOWN (${downList})`,
        'error'
      )
    })
  } else if (degradedSites.length > 0) {
    Sentry.withScope(scope => {
      scope.setTag('cron', 'scraping-health')
      scope.setLevel('warning')
      scope.setContext('health_check', { results })
      Sentry.captureMessage(
        `⚠️ Scraping Health: ${degradedSites.length} site(s) dégradé(s)`,
        'warning'
      )
    })
  }

  return NextResponse.json({
    ok: downSites.length === 0,
    timestamp: new Date().toISOString(),
    proxyHealthy: results.find(r => r.site === 'railway-proxy')?.status === 'ok',
    results,
    overallStatus: report.overallStatus,
    activeAlerts: report.alerts.filter(a => !a.resolved).length,
  })
}

/** Devine le niveau cascade depuis le nom de méthode */
function guessLevel(method: string): string {
  const m = method.toLowerCase()
  if (m.includes('api') || m.includes('json-ld')) return 'N1'
  if (m.includes('playwright') || m.includes('chrome')) return 'N1.5'
  if (m.includes('direct') || m.includes('html')) return 'N2'
  if (m.includes('jina')) return 'N3'
  if (m.includes('google') || m.includes('cache') || m.includes('archive')) return 'N4'
  if (m.includes('scrapingbee') || m.includes('firecrawl')) return 'N5'
  return 'N2'
}
