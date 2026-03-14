/**
 * GET /api/admin/scraping-health
 * POST /api/admin/scraping-health (résoudre une alerte)
 * 
 * Dashboard de santé du système de scraping protégé par auth admin.
 */

import { checkAdminAuth } from '@/lib/adminAuth'
import { getActiveAlerts, getHealthReport, resolveAlert } from '@/lib/scraping/healthMonitor'
import { getScrapingStats } from '@/lib/scraping/antiBlock'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Retourne le rapport de santé complet pour le dashboard admin.
 */
export async function GET(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const report = getHealthReport()
  const scrapingStats = getScrapingStats()
  const activeAlerts = getActiveAlerts()

  return NextResponse.json({
    ...report,
    scrapingStats,
    activeAlertsCount: activeAlerts.length,
    summary: {
      totalSites: Object.keys(report.sites).length,
      healthySites: Object.values(report.sites).filter(s => s.status === 'healthy').length,
      degradedSites: Object.values(report.sites).filter(s => s.status === 'degraded').length,
      downSites: Object.values(report.sites).filter(s => s.status === 'down').length,
    },
  })
}

/**
 * Résout manuellement une alerte.
 * Body: { alertId: string }
 */
export async function POST(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const body = await request.json() as { alertId?: string }
  if (!body.alertId || typeof body.alertId !== 'string') {
    return NextResponse.json({ error: 'alertId requis' }, { status: 400 })
  }

  const resolved = resolveAlert(body.alertId)
  if (!resolved) {
    return NextResponse.json({ error: 'Alerte introuvable' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, message: `Alerte ${body.alertId} résolue` })
}
