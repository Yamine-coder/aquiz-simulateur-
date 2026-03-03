/**
 * Cron Route — Vérification hebdomadaire des aides
 * 
 * GET /api/cron/aides-health
 * 
 * Appelé automatiquement par Vercel Cron chaque lundi à 8h.
 * Peut aussi être appelé manuellement avec le bon secret.
 * 
 * Exécute un health check complet et envoie une alerte
 * si des problèmes sont détectés (via Sentry).
 */

import { runFullHealthCheck, type HealthCheckReport } from '@/lib/aides/health-check'
import * as Sentry from '@sentry/nextjs'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'

const HASHES_DIR = join(process.cwd(), '.cache')
const HASHES_FILE = join(HASHES_DIR, 'aides-content-hashes.json')
const REPORT_FILE = join(HASHES_DIR, 'aides-health-report.json')

/**
 * Vérifie l'autorisation du cron job
 */
function isAuthorized(request: NextRequest): boolean {
  // Vercel Cron ajoute automatiquement ce header
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  
  // En dev, autoriser sans secret
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  
  return false
}

function readPreviousHashes(): Record<string, string> {
  try {
    if (existsSync(HASHES_FILE)) {
      return JSON.parse(readFileSync(HASHES_FILE, 'utf-8'))
    }
  } catch { /* ignore */ }
  return {}
}

function saveHashes(hashes: Record<string, string>): void {
  if (!existsSync(HASHES_DIR)) mkdirSync(HASHES_DIR, { recursive: true })
  writeFileSync(HASHES_FILE, JSON.stringify(hashes, null, 2), 'utf-8')
}

function saveReport(report: HealthCheckReport): void {
  if (!existsSync(HASHES_DIR)) mkdirSync(HASHES_DIR, { recursive: true })
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8')
}

/**
 * Génère une alerte Sentry si des problèmes sont détectés
 */
function alertIfProblems(report: HealthCheckReport): void {
  const { summary } = report
  const problems: string[] = []
  
  if (summary.urlsBroken > 0) {
    const broken = report.urlChecks
      .filter(r => r.status === 'error')
      .map(r => `  - ${r.aideNom}: ${r.url} (HTTP ${r.httpStatus || 'timeout'})`)
    problems.push(`🔴 ${summary.urlsBroken} URL(s) cassée(s):\n${broken.join('\n')}`)
  }
  
  if (summary.urlsWarning > 0) {
    const warnings = report.urlChecks
      .filter(r => r.status === 'warning')
      .map(r => `  - ${r.aideNom}: ${r.url} (HTTP ${r.httpStatus})`)
    problems.push(`🟡 ${summary.urlsWarning} URL(s) suspecte(s):\n${warnings.join('\n')}`)
  }
  
  if (summary.staleCount > 0) {
    const stale = report.freshness
      .filter(r => r.status !== 'ok')
      .map(r => `  - ${r.aideNom}: ${r.joursSansVerification}j sans vérification`)
    problems.push(`⏰ ${summary.staleCount} aide(s) obsolète(s):\n${stale.join('\n')}`)
  }
  
  if (summary.contentChanged > 0) {
    const changed = report.contentChanges
      .filter(r => r.changed)
      .map(r => `  - ${r.aideId}: ${r.url}`)
    problems.push(`📝 ${summary.contentChanged} page(s) modifiée(s):\n${changed.join('\n')}`)
  }
  
  if (problems.length > 0) {
    const message = `[AQUIZ] Health Check Aides — ${problems.length} problème(s) détecté(s)\n\n${problems.join('\n\n')}`
    
    Sentry.captureMessage(message, {
      level: summary.urlsBroken > 0 ? 'error' : 'warning',
      tags: {
        feature: 'aides-health-check',
        urlsBroken: String(summary.urlsBroken),
        staleCount: String(summary.staleCount),
        contentChanged: String(summary.contentChanged),
      },
      extra: {
        report: {
          timestamp: report.timestamp,
          durationMs: report.durationMs,
          summary: report.summary,
        },
      },
    })
  }
}

// ── GET — Cron endpoint ──

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const previousHashes = readPreviousHashes()
    const report = await runFullHealthCheck(previousHashes)
    
    // Mettre à jour les hashes
    const newHashes: Record<string, string> = { ...previousHashes }
    for (const change of report.contentChanges) {
      newHashes[change.aideId] = change.currentHash
    }
    saveHashes(newHashes)
    saveReport(report)
    
    // Alerter si problèmes
    alertIfProblems(report)
    
    return NextResponse.json({
      ok: true,
      summary: report.summary,
      timestamp: report.timestamp,
      durationMs: report.durationMs,
    })
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: 'aides-health-check-cron' },
    })
    
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
