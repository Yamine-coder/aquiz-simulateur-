/**
 * Module de monitoring santé du scraping
 * 
 * Suit l'état de chaque site/méthode d'extraction en temps réel :
 * - Détecte la dégradation (ex: API cassée → fallback Jina systématique)
 * - Détecte les blocages anti-bot (DataDome/Cloudflare UA obsolètes)
 * - Détecte les clés API invalidées (LBC mobile, etc.)
 * - Génère des alertes Sentry pour les admins
 * 
 * @module healthMonitor
 */

import * as Sentry from '@sentry/nextjs'

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

/** Niveau de santé d'un site */
type HealthStatus = 'healthy' | 'degraded' | 'down'

/** Type d'alerte détectée */
type AlertType =
  | 'api_broken'          // API interne cassée (SeLoger, LBC, Bienici...)
  | 'api_key_invalid'     // Clé API révoquée (LBC mobile)
  | 'antibot_blocking'    // UA/headers obsolètes → DataDome/Cloudflare bloque
  | 'cascade_degradation' // Site tombe systématiquement sur fallbacks (N3+)
  | 'proxy_down'          // Railway proxy inaccessible
  | 'timeout_spike'       // Temps de réponse anormalement élevés

/** Alerte active */
interface ScrapingAlert {
  id: string
  type: AlertType
  site: string
  message: string
  detail: string
  severity: 'warning' | 'critical'
  firstSeen: number
  lastSeen: number
  occurrences: number
  resolved: boolean
}

/** Résultat d'une extraction enregistrée */
interface ExtractionRecord {
  site: string
  method: string
  level: string           // N1, N2, N3, N4, N5
  success: boolean
  fieldsExtracted: number
  durationMs: number
  timestamp: number
  error?: string
}

/** État de santé d'un site */
interface SiteHealth {
  site: string
  status: HealthStatus
  lastSuccess: number | null
  lastFailure: number | null
  recentExtractions: ExtractionRecord[]  // 50 dernières
  n1SuccessRate: number     // % de succès de l'API N1
  avgCascadeLevel: number   // niveau moyen de cascade (1 = super, 4+ = dégradé)
  avgDurationMs: number     // durée moyenne d'extraction
  alerts: string[]          // IDs des alertes actives
}

/** Rapport global de santé */
export interface ScrapingHealthReport {
  timestamp: number
  overallStatus: HealthStatus
  sites: Record<string, SiteHealth>
  alerts: ScrapingAlert[]
  proxyHealthy: boolean
  uptimeMs: number
}

// ═══════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════

/** Nombre max d'extractions récentes gardées par site */
const MAX_RECENT_PER_SITE = 50

/** Nombre max d'alertes gardées en mémoire */
const MAX_ALERTS = 100

/** Seuil : si N1 échoue X fois consécutives → alerte api_broken */
const N1_FAILURE_THRESHOLD = 5

/** Seuil : si cascade level moyen > X → alerte cascade_degradation */
const CASCADE_DEGRADATION_THRESHOLD = 2.5

/** Seuil : si durée moyenne > X ms → alerte timeout_spike */
const TIMEOUT_SPIKE_THRESHOLD_MS = 15_000

/** Fenêtre d'analyse (dernières N extractions) */
const ANALYSIS_WINDOW = 20

/** TTL alerte non-réapparue depuis X ms → auto-résolution */
const ALERT_AUTO_RESOLVE_MS = 6 * 60 * 60 * 1000  // 6h

/** Niveau cascade numérique pour tri/analyse */
const LEVEL_TO_NUM: Record<string, number> = {
  'cache': 0, 'N1': 1, 'N1.5': 1.5, 'N2': 2, 'N3': 3, 'N4': 4, 'N5': 5,
}

/** Sites avec API N1 dédiée (on surveille spécifiquement leur santé) */
const SITES_WITH_N1_API = [
  'seloger', 'leboncoin', 'bienici', 'laforet', 'orpi', 'century21',
]

/** Patterns indiquant une clé API invalidée */
const API_KEY_ERROR_PATTERNS = [
  /401/i, /403/i, /unauthorized/i, /forbidden/i,
  /invalid.*key/i, /api.*key.*invalid/i, /token.*expired/i,
]

/** Patterns indiquant un blocage anti-bot */
const ANTIBOT_PATTERNS = [
  /datadome/i, /cloudflare/i, /challenge/i,
  /captcha/i, /blocked/i, /access.*denied/i,
  /perimeterx/i, /akamai/i,
]

// ═══════════════════════════════════════════════════════
// ÉTAT EN MÉMOIRE
// ═══════════════════════════════════════════════════════

const siteRecords = new Map<string, ExtractionRecord[]>()
const activeAlerts = new Map<string, ScrapingAlert>()
const startTime = Date.now()
let proxyHealthy = true

// ═══════════════════════════════════════════════════════
// ENREGISTREMENT DES EXTRACTIONS
// ═══════════════════════════════════════════════════════

/**
 * Enregistre le résultat d'une extraction dans le monitor.
 * Appelé automatiquement par le cascade dans route.ts.
 */
export function recordExtraction(record: ExtractionRecord): void {
  const { site } = record
  if (!siteRecords.has(site)) siteRecords.set(site, [])
  const records = siteRecords.get(site)!
  records.push(record)

  // Garder seulement les N dernières
  if (records.length > MAX_RECENT_PER_SITE) {
    records.splice(0, records.length - MAX_RECENT_PER_SITE)
  }

  // Analyser après chaque enregistrement
  analyzeAndAlert(site)
}

/**
 * Enregistre l'état du proxy Railway.
 */
export function recordProxyHealth(healthy: boolean): void {
  proxyHealthy = healthy

  if (!healthy) {
    raiseAlert({
      type: 'proxy_down',
      site: 'railway-proxy',
      message: 'Proxy Railway inaccessible',
      detail: 'Le micro-service Railway (aquiz-scraper) ne répond plus. Les sites bloqués sur IP datacenter (SeLoger, LBC, PAP, Orpi) ne peuvent plus être extraits via N1.',
      severity: 'critical',
    })
  } else {
    resolveAlertsForSite('railway-proxy', 'proxy_down')
  }
}

// ═══════════════════════════════════════════════════════
// ANALYSE ET DÉTECTION D'ALERTES
// ═══════════════════════════════════════════════════════

function analyzeAndAlert(site: string): void {
  const records = siteRecords.get(site)
  if (!records || records.length < 3) return

  const recent = records.slice(-ANALYSIS_WINDOW)
  const hasN1Api = SITES_WITH_N1_API.includes(site)

  // ── 1. Détection API N1 cassée ──
  if (hasN1Api) {
    const n1Records = recent.filter(r => r.level === 'N1')
    const consecutiveFailures = countTrailingFailures(n1Records)

    if (consecutiveFailures >= N1_FAILURE_THRESHOLD) {
      const lastError = n1Records[n1Records.length - 1]?.error || 'inconnu'
      
      // Distinguer clé API vs. blocage anti-bot vs. API changée
      const isApiKey = API_KEY_ERROR_PATTERNS.some(p => p.test(lastError))
      const isAntibot = ANTIBOT_PATTERNS.some(p => p.test(lastError))

      if (isApiKey) {
        raiseAlert({
          type: 'api_key_invalid',
          site,
          message: `Clé API ${site} probablement invalidée`,
          detail: `Les ${consecutiveFailures} dernières tentatives N1 retournent des erreurs d'auth: "${lastError}". Vérifier la clé API.`,
          severity: 'critical',
        })
      } else if (isAntibot) {
        raiseAlert({
          type: 'antibot_blocking',
          site,
          message: `Anti-bot bloque ${site} (UA/headers obsolètes)`,
          detail: `DataDome/Cloudflare/Akamai détecté: "${lastError}". Les User-Agents ou headers sont probablement périmés.`,
          severity: 'critical',
        })
      } else {
        raiseAlert({
          type: 'api_broken',
          site,
          message: `API N1 ${site} en échec`,
          detail: `${consecutiveFailures} échecs consécutifs. Dernière erreur: "${lastError}". L'API a peut-être changé de format ou d'endpoint.`,
          severity: 'warning',
        })
      }
    } else if (consecutiveFailures === 0 && n1Records.length >= 3) {
      // N1 fonctionne → résoudre les alertes associées
      resolveAlertsForSite(site, 'api_broken')
      resolveAlertsForSite(site, 'api_key_invalid')
      resolveAlertsForSite(site, 'antibot_blocking')
    }
  }

  // ── 2. Détection cascade dégradée ──
  const successRecords = recent.filter(r => r.success)
  if (successRecords.length >= 5) {
    const avgLevel = successRecords.reduce((sum, r) => {
      return sum + (LEVEL_TO_NUM[r.level] ?? 3)
    }, 0) / successRecords.length

    if (avgLevel > CASCADE_DEGRADATION_THRESHOLD) {
      raiseAlert({
        type: 'cascade_degradation',
        site,
        message: `${site}: extraction dégradée (fallbacks systématiques)`,
        detail: `Niveau cascade moyen = ${avgLevel.toFixed(1)} (seuil: ${CASCADE_DEGRADATION_THRESHOLD}). Les APIs rapides échouent et le système se rabat sur Jina/Google Cache/ScrapingBee.`,
        severity: 'warning',
      })
    } else {
      resolveAlertsForSite(site, 'cascade_degradation')
    }
  }

  // ── 3. Détection timeout spike ──
  if (successRecords.length >= 3) {
    const avgDuration = successRecords.reduce((s, r) => s + r.durationMs, 0) / successRecords.length
    if (avgDuration > TIMEOUT_SPIKE_THRESHOLD_MS) {
      raiseAlert({
        type: 'timeout_spike',
        site,
        message: `${site}: temps de réponse élevé (${Math.round(avgDuration)}ms)`,
        detail: `Durée moyenne d'extraction = ${Math.round(avgDuration)}ms (seuil: ${TIMEOUT_SPIKE_THRESHOLD_MS}ms). Possible congestion réseau ou changement côté site.`,
        severity: 'warning',
      })
    } else {
      resolveAlertsForSite(site, 'timeout_spike')
    }
  }
}

/** Compte le nombre d'échecs consécutifs en fin de liste */
function countTrailingFailures(records: ExtractionRecord[]): number {
  let count = 0
  for (let i = records.length - 1; i >= 0; i--) {
    if (!records[i].success) count++
    else break
  }
  return count
}

// ═══════════════════════════════════════════════════════
// GESTION DES ALERTES
// ═══════════════════════════════════════════════════════

function raiseAlert(params: {
  type: AlertType
  site: string
  message: string
  detail: string
  severity: 'warning' | 'critical'
}): void {
  const id = `${params.type}:${params.site}`
  const existing = activeAlerts.get(id)
  const now = Date.now()

  if (existing && !existing.resolved) {
    // Mise à jour de l'alerte existante
    existing.lastSeen = now
    existing.occurrences++
    existing.message = params.message
    existing.detail = params.detail
    return
  }

  // Nouvelle alerte
  const alert: ScrapingAlert = {
    id,
    type: params.type,
    site: params.site,
    message: params.message,
    detail: params.detail,
    severity: params.severity,
    firstSeen: now,
    lastSeen: now,
    occurrences: 1,
    resolved: false,
  }
  activeAlerts.set(id, alert)

  // Nettoyer les vieilles alertes
  if (activeAlerts.size > MAX_ALERTS) {
    const oldest = [...activeAlerts.entries()]
      .filter(([, a]) => a.resolved)
      .sort((a, b) => a[1].lastSeen - b[1].lastSeen)
    for (const [key] of oldest.slice(0, activeAlerts.size - MAX_ALERTS)) {
      activeAlerts.delete(key)
    }
  }

  // Envoi Sentry pour les nouvelles alertes
  sendSentryAlert(alert)
}

function resolveAlertsForSite(site: string, type: AlertType): void {
  const id = `${type}:${site}`
  const alert = activeAlerts.get(id)
  if (alert && !alert.resolved) {
    alert.resolved = true
    console.log(`✅ Alerte résolue: [${type}] ${site}`)
  }
}

function sendSentryAlert(alert: ScrapingAlert): void {
  const level = alert.severity === 'critical' ? 'error' : 'warning'
  
  Sentry.withScope(scope => {
    scope.setTag('alert.type', alert.type)
    scope.setTag('alert.site', alert.site)
    scope.setTag('alert.severity', alert.severity)
    scope.setLevel(level)
    scope.setContext('scraping_alert', {
      id: alert.id,
      type: alert.type,
      site: alert.site,
      detail: alert.detail,
      occurrences: alert.occurrences,
      firstSeen: new Date(alert.firstSeen).toISOString(),
    })
    Sentry.captureMessage(`🚨 Scraping Alert: ${alert.message}`, level)
  })
}

// ═══════════════════════════════════════════════════════
// AUTO-RÉSOLUTION DES ALERTES PÉRIMÉES
// ═══════════════════════════════════════════════════════

function autoResolveStaleAlerts(): void {
  const now = Date.now()
  for (const [, alert] of activeAlerts) {
    if (!alert.resolved && (now - alert.lastSeen) > ALERT_AUTO_RESOLVE_MS) {
      alert.resolved = true
    }
  }
}

// ═══════════════════════════════════════════════════════
// RAPPORT DE SANTÉ
// ═══════════════════════════════════════════════════════

/**
 * Génère le rapport de santé complet pour le dashboard admin.
 */
export function getHealthReport(): ScrapingHealthReport {
  autoResolveStaleAlerts()

  const sites: Record<string, SiteHealth> = {}
  let worstStatus: HealthStatus = 'healthy'

  for (const [site, records] of siteRecords) {
    const recent = records.slice(-ANALYSIS_WINDOW)
    const successes = recent.filter(r => r.success)
    const n1Records = recent.filter(r => r.level === 'N1')
    const n1Successes = n1Records.filter(r => r.success)
    
    // Calcul du taux N1
    const n1SuccessRate = n1Records.length > 0
      ? (n1Successes.length / n1Records.length) * 100
      : -1  // pas de données N1

    // Niveau cascade moyen
    const avgCascadeLevel = successes.length > 0
      ? successes.reduce((s, r) => s + (LEVEL_TO_NUM[r.level] ?? 3), 0) / successes.length
      : 0

    // Durée moyenne
    const avgDurationMs = successes.length > 0
      ? Math.round(successes.reduce((s, r) => s + r.durationMs, 0) / successes.length)
      : 0

    // Alertes actives du site
    const siteAlerts = [...activeAlerts.values()]
      .filter(a => a.site === site && !a.resolved)
      .map(a => a.id)

    // Déterminer le status
    let status: HealthStatus = 'healthy'
    const hasCritical = siteAlerts.some(id => {
      const a = activeAlerts.get(id)
      return a && a.severity === 'critical'
    })
    if (hasCritical) {
      status = 'down'
    } else if (siteAlerts.length > 0 || avgCascadeLevel > CASCADE_DEGRADATION_THRESHOLD) {
      status = 'degraded'
    }

    if (status === 'down') worstStatus = 'down'
    else if (status === 'degraded' && worstStatus !== 'down') worstStatus = 'degraded'

    const lastSuccessRecord = [...records].reverse().find(r => r.success)
    const lastFailureRecord = [...records].reverse().find(r => !r.success)

    sites[site] = {
      site,
      status,
      lastSuccess: lastSuccessRecord?.timestamp ?? null,
      lastFailure: lastFailureRecord?.timestamp ?? null,
      recentExtractions: recent,
      n1SuccessRate: Math.round(n1SuccessRate * 10) / 10,
      avgCascadeLevel: Math.round(avgCascadeLevel * 10) / 10,
      avgDurationMs,
      alerts: siteAlerts,
    }
  }

  return {
    timestamp: Date.now(),
    overallStatus: worstStatus,
    sites,
    alerts: [...activeAlerts.values()].sort((a, b) => b.lastSeen - a.lastSeen),
    proxyHealthy,
    uptimeMs: Date.now() - startTime,
  }
}

/**
 * Récupère les alertes actives non résolues.
 */
export function getActiveAlerts(): ScrapingAlert[] {
  autoResolveStaleAlerts()
  return [...activeAlerts.values()].filter(a => !a.resolved)
}

/**
 * Résout manuellement une alerte (via dashboard admin).
 */
export function resolveAlert(alertId: string): boolean {
  const alert = activeAlerts.get(alertId)
  if (!alert) return false
  alert.resolved = true
  return true
}
