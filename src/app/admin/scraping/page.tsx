'use client'

import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    RefreshCw,
    Server,
    Shield,
    ShieldAlert,
    XCircle,
    Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// ── Types ─────────────────────────────────────────────────

interface ScrapingAlert {
  id: string
  type: string
  site: string
  message: string
  detail: string
  severity: 'warning' | 'critical'
  firstSeen: number
  lastSeen: number
  occurrences: number
  resolved: boolean
}

interface SiteHealth {
  site: string
  status: 'healthy' | 'degraded' | 'down'
  lastSuccess: number | null
  lastFailure: number | null
  n1SuccessRate: number
  avgCascadeLevel: number
  avgDurationMs: number
  alerts: string[]
  recentExtractions: {
    method: string
    level: string
    success: boolean
    fieldsExtracted: number
    durationMs: number
    timestamp: number
  }[]
}

interface HealthReport {
  timestamp: number
  overallStatus: 'healthy' | 'degraded' | 'down'
  sites: Record<string, SiteHealth>
  alerts: ScrapingAlert[]
  proxyHealthy: boolean
  uptimeMs: number
  scrapingStats: {
    totalRequests: number
    cacheHits: number
    cacheHitRate: string
    blockedCount: number
    successCount: number
    successRate: string
    byDomain: Record<string, { requests: number; blocked: number; success: number }>
  }
  summary: {
    totalSites: number
    healthySites: number
    degradedSites: number
    downSites: number
  }
}

// ── Helpers ─────────────────────────────────────────────────

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatUptime(ms: number): string {
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'maintenant'
  if (minutes < 60) return `il y a ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

const STATUS_CONFIG = {
  healthy: { label: 'OK', dotColor: 'bg-emerald-500', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/8 border-emerald-500/15', icon: CheckCircle2 },
  degraded: { label: 'Dégradé', dotColor: 'bg-amber-500', textColor: 'text-amber-400', bgColor: 'bg-amber-500/8 border-amber-500/15', icon: AlertTriangle },
  down: { label: 'Down', dotColor: 'bg-red-500', textColor: 'text-red-400', bgColor: 'bg-red-500/8 border-red-500/15', icon: XCircle },
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  api_broken: 'API cassée',
  api_key_invalid: 'Clé API invalidée',
  antibot_blocking: 'Anti-bot bloque',
  cascade_degradation: 'Cascade dégradée',
  proxy_down: 'Proxy Railway down',
  timeout_spike: 'Timeout élevé',
}

// ── Component ───────────────────────────────────────────────

export default function ScrapingHealthPage() {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const resp = await fetch('/api/admin/scraping-health', { credentials: 'include' })
      if (resp.status === 401) {
        window.location.href = '/admin/login'
        return
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json() as HealthReport
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
    const interval = setInterval(fetchReport, 60_000)
    return () => clearInterval(interval)
  }, [fetchReport])

  const resolveAlert = async (alertId: string) => {
    setResolving(alertId)
    try {
      await fetch('/api/admin/scraping-health', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      })
      await fetchReport()
    } finally {
      setResolving(null)
    }
  }

  if (loading && !report) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-zinc-500">
        <XCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <button onClick={fetchReport} className="text-xs text-blue-400 hover:text-blue-300">Réessayer</button>
      </div>
    )
  }

  if (!report) return null

  const activeAlerts = report.alerts.filter(a => !a.resolved)
  const resolvedAlerts = report.alerts.filter(a => a.resolved)
  const sortedSites = Object.values(report.sites).sort((a, b) => {
    const order = { down: 0, degraded: 1, healthy: 2 }
    return (order[a.status] ?? 2) - (order[b.status] ?? 2)
  })

  const overallCfg = STATUS_CONFIG[report.overallStatus]
  const OverallIcon = overallCfg.icon

  return (
    <div className="space-y-4 pb-8">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            Santé Scraping
          </h1>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            Uptime {formatUptime(report.uptimeMs)} · Vérifié {timeAgo(report.timestamp)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Overall status badge */}
          <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${overallCfg.bgColor} ${overallCfg.textColor}`}>
            <OverallIcon className="h-3 w-3" />
            Système {overallCfg.label}
          </span>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* ═══ KPI STRIP ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-800">
        {[
          { label: 'Requêtes', value: String(report.scrapingStats.totalRequests), icon: <Zap className="h-3.5 w-3.5 text-blue-400" />, color: 'text-white' },
          { label: 'Succès', value: report.scrapingStats.successRate, icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />, color: 'text-emerald-400' },
          { label: 'Cache', value: report.scrapingStats.cacheHitRate, icon: <Shield className="h-3.5 w-3.5 text-purple-400" />, color: 'text-purple-400' },
          { label: 'Proxy', value: report.proxyHealthy ? 'OK' : 'DOWN', icon: <Server className={`h-3.5 w-3.5 ${report.proxyHealthy ? 'text-emerald-400' : 'text-red-400'}`} />, color: report.proxyHealthy ? 'text-emerald-400' : 'text-red-400' },
        ].map((m) => (
          <div key={m.label} className="bg-zinc-900 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              {m.icon}
              <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">{m.label}</span>
            </div>
            <span className={`text-xl font-bold tabular-nums font-mono ${m.color}`}>{m.value}</span>
            {m.label === 'Requêtes' && (
              <div className="flex items-center gap-2 text-[11px] text-zinc-600 mt-0.5">
                <span className="text-emerald-400/70">{report.summary.healthySites} OK</span>
                {report.summary.degradedSites > 0 && <span className="text-amber-400/70">{report.summary.degradedSites} dégradé</span>}
                {report.summary.downSites > 0 && <span className="text-red-400/70">{report.summary.downSites} down</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ═══ ALERTS (if any) ═══ */}
      {activeAlerts.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10">
            <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[12px] font-semibold text-red-400">{activeAlerts.length} alerte{activeAlerts.length > 1 ? 's' : ''} active{activeAlerts.length > 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-red-500/10">
            {activeAlerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      alert.severity === 'critical' ? 'bg-red-500/15 text-red-400 border-red-500/20' : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-zinc-500">{ALERT_TYPE_LABELS[alert.type] || alert.type}</span>
                    <span className="text-[11px] text-zinc-700 font-mono">{alert.site}</span>
                  </div>
                  <p className="text-[12px] font-medium text-zinc-300">{alert.message}</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">{alert.detail}</p>
                  <p className="text-[10px] text-zinc-700 mt-1">{alert.occurrences}x · {timeAgo(alert.firstSeen)} → {timeAgo(alert.lastSeen)}</p>
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  disabled={resolving === alert.id}
                  className="shrink-0 text-[11px] text-zinc-500 hover:text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800 hover:bg-zinc-800/50 transition disabled:opacity-40"
                >
                  {resolving === alert.id ? '…' : 'Résoudre'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SITES + DOMAINS (one panel, two sections) ═══ */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">

        {/* Sites header */}
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">
            Santé par site ({report.summary.totalSites})
          </h2>
        </div>

        {sortedSites.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
            <p className="text-[12px] text-zinc-600">Aucune extraction enregistrée</p>
            <p className="text-[11px] text-zinc-700 mt-0.5">Les données apparaîtront après les premières requêtes.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {sortedSites.map(site => {
              const cfg = STATUS_CONFIG[site.status]
              return (
                <div key={site.site} className="px-5 py-3 hover:bg-zinc-800/20 transition">
                  <div className="flex items-center gap-3">
                    {/* Status dot */}
                    <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dotColor}`} />
                    {/* Site name */}
                    <span className="text-[12px] font-semibold text-zinc-300 min-w-[120px]">{site.site}</span>
                    {/* Metrics inline */}
                    <div className="flex items-center gap-4 flex-1 text-[11px]">
                      <span className="text-zinc-600">
                        N1: <strong className={
                          site.n1SuccessRate < 0 ? 'text-zinc-600'
                          : site.n1SuccessRate >= 80 ? 'text-emerald-400'
                          : site.n1SuccessRate >= 50 ? 'text-amber-400'
                          : 'text-red-400'
                        }>
                          {site.n1SuccessRate < 0 ? 'N/A' : `${site.n1SuccessRate}%`}
                        </strong>
                      </span>
                      <span className="text-zinc-600">
                        Cascade: <strong className={
                          site.avgCascadeLevel <= 1.5 ? 'text-emerald-400'
                          : site.avgCascadeLevel <= 2.5 ? 'text-amber-400'
                          : 'text-red-400'
                        }>
                          N{site.avgCascadeLevel}
                        </strong>
                      </span>
                      <span className="text-zinc-600">
                        Durée: <strong className="text-zinc-400">{formatMs(site.avgDurationMs)}</strong>
                      </span>
                      {site.lastSuccess && (
                        <span className="text-zinc-700">Succès: {timeAgo(site.lastSuccess)}</span>
                      )}
                    </div>
                    {/* Status label */}
                    <span className={`text-[10px] font-bold shrink-0 ${cfg.textColor}`}>{cfg.label}</span>
                  </div>
                  {/* Mini timeline */}
                  {site.recentExtractions.length > 0 && (
                    <div className="flex gap-0.5 mt-2 ml-5">
                      {site.recentExtractions.slice(-20).map((ext, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-sm ${ext.success ? 'bg-emerald-500/50' : 'bg-red-500/50'}`}
                          title={`${ext.method} (${ext.level}) — ${ext.success ? 'OK' : 'FAIL'} — ${formatMs(ext.durationMs)}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Domain stats table — inside the same panel */}
        {Object.keys(report.scrapingStats.byDomain).length > 0 && (
          <>
            <div className="border-t border-zinc-800/60 px-5 pt-3 pb-2">
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Par domaine</h3>
            </div>
            <div className="px-5 pb-4">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-zinc-600 text-left">
                    <th className="pb-1.5 font-medium">Domaine</th>
                    <th className="pb-1.5 font-medium text-right">Req.</th>
                    <th className="pb-1.5 font-medium text-right">OK</th>
                    <th className="pb-1.5 font-medium text-right">Bloqués</th>
                    <th className="pb-1.5 font-medium text-right">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.scrapingStats.byDomain)
                    .sort(([, a], [, b]) => b.requests - a.requests)
                    .map(([domain, stats]) => {
                      const rate = stats.requests > 0 ? Math.round((stats.success / stats.requests) * 100) : 0
                      return (
                        <tr key={domain} className="border-t border-zinc-800/30 hover:bg-zinc-800/20">
                          <td className="py-1.5 font-mono text-zinc-400">{domain}</td>
                          <td className="py-1.5 text-right text-zinc-500 tabular-nums">{stats.requests}</td>
                          <td className="py-1.5 text-right text-emerald-400/80 tabular-nums">{stats.success}</td>
                          <td className="py-1.5 text-right text-red-400/80 tabular-nums">{stats.blocked}</td>
                          <td className={`py-1.5 text-right font-semibold tabular-nums ${
                            rate >= 80 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {rate}%
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ═══ RESOLVED ALERTS (compact) ═══ */}
      {resolvedAlerts.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
          <div className="px-5 py-2.5 border-b border-zinc-800/60">
            <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
              Alertes résolues ({resolvedAlerts.length})
            </span>
          </div>
          <div className="divide-y divide-zinc-800/30">
            {resolvedAlerts.slice(0, 8).map(alert => (
              <div key={alert.id} className="flex items-center gap-2 px-5 py-2 text-[11px]">
                <CheckCircle2 className="h-3 w-3 text-emerald-500/60 shrink-0" />
                <span className="font-mono text-zinc-600">{alert.site}</span>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-600">{ALERT_TYPE_LABELS[alert.type] || alert.type}</span>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-700">{alert.occurrences}x</span>
                <span className="flex-1 text-right text-zinc-700">{timeAgo(alert.lastSeen)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
