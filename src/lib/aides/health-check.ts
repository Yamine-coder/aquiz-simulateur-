/**
 * Health Check système pour les aides à l'accession
 * 
 * Vérifie automatiquement :
 * - Accessibilité des URLs officielles (404, 403, timeout)
 * - Fraîcheur des données (dernière vérification)
 * - Changements de contenu des pages sources
 * 
 * Utilisé par :
 * - API route /api/admin/aides/health-check
 * - Cron job hebdomadaire
 * - Dashboard admin /admin/aides
 */

import { TOUTES_AIDES, type AideAccession } from '@/data/aides-accession'

// ============================================
// TYPES
// ============================================

export type HealthStatus = 'ok' | 'warning' | 'error' | 'unknown'

export interface UrlCheckResult {
  aideId: string
  aideNom: string
  url: string
  status: HealthStatus
  httpStatus?: number
  responseTimeMs: number
  error?: string
  checkedAt: string
}

export interface FreshnessResult {
  aideId: string
  aideNom: string
  dateMAJ: string
  dateVerification?: string
  joursSansVerification: number
  status: HealthStatus
}

export interface ContentHashResult {
  aideId: string
  url: string
  previousHash?: string
  currentHash: string
  changed: boolean
  checkedAt: string
}

export interface HealthCheckReport {
  timestamp: string
  durationMs: number
  summary: {
    total: number
    urlsOk: number
    urlsBroken: number
    urlsWarning: number
    staleCount: number
    contentChanged: number
  }
  urlChecks: UrlCheckResult[]
  freshness: FreshnessResult[]
  contentChanges: ContentHashResult[]
}

// ============================================
// CONSTANTES
// ============================================

/** Nombre de jours avant qu'une aide soit considérée "obsolète" */
const STALE_THRESHOLD_DAYS = 90

/** Timeout pour les requêtes HTTP (ms) */
const HTTP_TIMEOUT_MS = 10_000

/** User-Agent pour les requêtes (évite les blocages) */
const USER_AGENT = 'AQUIZ-HealthCheck/1.0 (https://www.aquiz.eu)'

// ============================================
// VÉRIFICATION DES URLs
// ============================================

/**
 * Vérifie l'accessibilité d'une URL
 */
async function checkUrl(aide: AideAccession): Promise<UrlCheckResult> {
  const start = Date.now()
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
    
    const response = await fetch(aide.urlOfficielle, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
      },
      redirect: 'follow',
    })
    
    clearTimeout(timeout)
    const responseTimeMs = Date.now() - start
    
    // Certains sites bloquent HEAD, retry avec GET
    if (response.status === 405 || response.status === 403) {
      const getResponse = await fetch(aide.urlOfficielle, {
        method: 'GET',
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html',
        },
        redirect: 'follow',
      })
      
      return {
        aideId: aide.id,
        aideNom: aide.nomCourt,
        url: aide.urlOfficielle,
        status: getResponse.ok ? 'ok' : getResponse.status === 403 ? 'warning' : 'error',
        httpStatus: getResponse.status,
        responseTimeMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
      }
    }
    
    return {
      aideId: aide.id,
      aideNom: aide.nomCourt,
      url: aide.urlOfficielle,
      status: response.ok ? 'ok' : 'error',
      httpStatus: response.status,
      responseTimeMs,
      checkedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      aideId: aide.id,
      aideNom: aide.nomCourt,
      url: aide.urlOfficielle,
      status: 'error',
      responseTimeMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
      checkedAt: new Date().toISOString(),
    }
  }
}

/**
 * Vérifie toutes les URLs des aides (en parallèle avec concurrence limitée)
 */
export async function checkAllUrls(concurrency = 5): Promise<UrlCheckResult[]> {
  const results: UrlCheckResult[] = []
  const aides = TOUTES_AIDES.filter(a => a.actif && a.urlOfficielle)
  
  // Exécution par lots pour éviter de surcharger les serveurs
  for (let i = 0; i < aides.length; i += concurrency) {
    const batch = aides.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(checkUrl))
    results.push(...batchResults)
  }
  
  return results
}

// ============================================
// VÉRIFICATION DE FRAÎCHEUR
// ============================================

/**
 * Calcule la fraîcheur de chaque aide
 */
export function checkFreshness(): FreshnessResult[] {
  const now = new Date()
  
  return TOUTES_AIDES.filter(a => a.actif).map(aide => {
    const dateRef = aide.dateVerification || aide.dateMAJ
    const dateObj = new Date(dateRef)
    const diffMs = now.getTime() - dateObj.getTime()
    const joursSansVerification = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    let status: HealthStatus = 'ok'
    if (joursSansVerification > STALE_THRESHOLD_DAYS * 2) {
      status = 'error'
    } else if (joursSansVerification > STALE_THRESHOLD_DAYS) {
      status = 'warning'
    }
    
    return {
      aideId: aide.id,
      aideNom: aide.nomCourt,
      dateMAJ: aide.dateMAJ,
      dateVerification: aide.dateVerification,
      joursSansVerification,
      status,
    }
  })
}

// ============================================
// DÉTECTION DE CHANGEMENTS DE CONTENU
// ============================================

/**
 * Génère un hash simple du contenu textuel d'une page
 */
async function hashPageContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
      },
    })
    
    if (!response.ok) return null
    
    const html = await response.text()
    
    // Extraire le contenu principal (ignorer headers/footers dynamiques)
    const bodyMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
      || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
      || html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    
    const content = bodyMatch?.[1] || html
    
    // Nettoyer le contenu pour réduire le bruit (dates, sessions, etc.)
    const cleaned = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000) // Limiter à 5000 chars pour la comparaison
    
    // Hash simple via API Web Crypto
    const encoder = new TextEncoder()
    const data = encoder.encode(cleaned)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

/**
 * Vérifie les changements de contenu par rapport aux hashes précédents
 */
export async function checkContentChanges(
  previousHashes: Record<string, string>,
  concurrency = 3
): Promise<ContentHashResult[]> {
  const results: ContentHashResult[] = []
  const aides = TOUTES_AIDES.filter(a => a.actif && a.urlOfficielle)
  
  for (let i = 0; i < aides.length; i += concurrency) {
    const batch = aides.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (aide): Promise<ContentHashResult | null> => {
        const currentHash = await hashPageContent(aide.urlOfficielle)
        if (!currentHash) return null
        
        return {
          aideId: aide.id,
          url: aide.urlOfficielle,
          previousHash: previousHashes[aide.id],
          currentHash,
          changed: previousHashes[aide.id] !== undefined && previousHashes[aide.id] !== currentHash,
          checkedAt: new Date().toISOString(),
        }
      })
    )
    
    results.push(...batchResults.filter((r): r is ContentHashResult => r !== null))
  }
  
  return results
}

// ============================================
// RAPPORT COMPLET
// ============================================

/**
 * Exécute un health check complet et retourne le rapport
 */
export async function runFullHealthCheck(
  previousHashes?: Record<string, string>
): Promise<HealthCheckReport> {
  const start = Date.now()
  
  // Exécuter les vérifications en parallèle
  const [urlChecks, contentChanges] = await Promise.all([
    checkAllUrls(),
    previousHashes ? checkContentChanges(previousHashes) : Promise.resolve([]),
  ])
  
  const freshness = checkFreshness()
  
  return {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
    summary: {
      total: TOUTES_AIDES.filter(a => a.actif).length,
      urlsOk: urlChecks.filter(r => r.status === 'ok').length,
      urlsBroken: urlChecks.filter(r => r.status === 'error').length,
      urlsWarning: urlChecks.filter(r => r.status === 'warning').length,
      staleCount: freshness.filter(r => r.status !== 'ok').length,
      contentChanged: contentChanges.filter(r => r.changed).length,
    },
    urlChecks,
    freshness,
    contentChanges,
  }
}
