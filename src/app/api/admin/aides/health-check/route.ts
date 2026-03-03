/**
 * API Route — Health Check des aides à l'accession
 * 
 * GET /api/admin/aides/health-check
 * 
 * Vérifie :
 * - URLs cassées (404, 403, timeout)
 * - Fraîcheur des données
 * - Changements de contenu des pages sources
 * 
 * Protégé par le middleware admin (JWT)
 */

import { checkFreshness, runFullHealthCheck } from '@/lib/aides/health-check'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'

const HASHES_DIR = join(process.cwd(), '.cache')
const HASHES_FILE = join(HASHES_DIR, 'aides-content-hashes.json')
const REPORT_FILE = join(HASHES_DIR, 'aides-health-report.json')

/**
 * Lit les hashes précédents depuis le cache local
 */
function readPreviousHashes(): Record<string, string> {
  try {
    if (existsSync(HASHES_FILE)) {
      return JSON.parse(readFileSync(HASHES_FILE, 'utf-8'))
    }
  } catch {
    // Fichier corrompu, on repart de zéro
  }
  return {}
}

/**
 * Sauvegarde les nouveaux hashes
 */
function saveHashes(hashes: Record<string, string>): void {
  if (!existsSync(HASHES_DIR)) {
    mkdirSync(HASHES_DIR, { recursive: true })
  }
  writeFileSync(HASHES_FILE, JSON.stringify(hashes, null, 2), 'utf-8')
}

/**
 * Sauvegarde le rapport pour consultation ultérieure
 */
function saveReport(report: unknown): void {
  if (!existsSync(HASHES_DIR)) {
    mkdirSync(HASHES_DIR, { recursive: true })
  }
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8')
}

/**
 * Lit le dernier rapport sauvegardé
 */
function readLastReport(): unknown | null {
  try {
    if (existsSync(REPORT_FILE)) {
      return JSON.parse(readFileSync(REPORT_FILE, 'utf-8'))
    }
  } catch {
    // Fichier corrompu
  }
  return null
}

// ── GET — Exécute le health check ou lit le dernier rapport ──

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'full'
  
  try {
    // Mode "last" — retourne le dernier rapport sans re-vérifier
    if (mode === 'last') {
      const lastReport = readLastReport()
      if (lastReport) {
        return NextResponse.json(lastReport)
      }
      return NextResponse.json({ error: 'Aucun rapport précédent' }, { status: 404 })
    }
    
    // Mode "freshness" — vérification rapide sans HTTP
    if (mode === 'freshness') {
      const freshness = checkFreshness()
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        freshness,
        summary: {
          total: freshness.length,
          staleCount: freshness.filter(r => r.status !== 'ok').length,
        },
      })
    }
    
    // Mode "full" — health check complet (URLs + contenu + fraîcheur)
    const previousHashes = readPreviousHashes()
    const report = await runFullHealthCheck(previousHashes)
    
    // Sauvegarder les nouveaux hashes
    const newHashes: Record<string, string> = { ...previousHashes }
    for (const change of report.contentChanges) {
      newHashes[change.aideId] = change.currentHash
    }
    saveHashes(newHashes)
    
    // Sauvegarder le rapport
    saveReport(report)
    
    return NextResponse.json(report)
  } catch (error) {
    console.error('[Health Check] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du health check', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
