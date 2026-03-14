'use client'

import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    RefreshCw,
    Server,
    Shield,
    ShieldAlert,
    XCircle,
    Zap,
} from 'lucide-react'
import Link from 'next/link'
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
  healthy: { label: 'OK', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30', icon: CheckCircle2 },
  degraded: { label: 'Dégradé', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', icon: AlertTriangle },
  down: { label: 'Down', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', icon: XCircle },
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
    const interval = setInterval(fetchReport, 60_000) // refresh every minute
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

  // ── Loading / Error ──
  if (loading && !report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <XCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-400">{error}</p>
        <button onClick={fetchReport} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition">
          Réessayer
        </button>
      </div>
    )
  }

  if (!report) return null

  const activeAlerts = report.alerts.filter(a => !a.resolved)
  const sortedSites = Object.values(report.sites).sort((a, b) => {
    const order = { down: 0, degraded: 1, healthy: 2 }
    return (order[a.status] ?? 2) - (order[b.status] ?? 2)
  })

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 rounded-lg hover:bg-zinc-800 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-400" />
              Santé Scraping
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Monitoring en temps réel du système d&apos;extraction
            </p>
          </div>
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* ── Overall Status Banner ── */}
      {(() => {
        const cfg = STATUS_CONFIG[report.overallStatus]
        const Icon = cfg.icon
        return (
          <div className={`p-4 rounded-xl border ${cfg.bg} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <Icon className={`w-6 h-6 ${cfg.color}`} />
              <div>
                <p className={`font-semibold ${cfg.color}`}>
                  Système {cfg.label}
                </p>
                <p className="text-sm text-zinc-400">
                  Uptime: {formatUptime(report.uptimeMs)} · Dernière vérification: {timeAgo(report.timestamp)}
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="text-green-400">{report.summary.healthySites} OK</span>
              {report.summary.degradedSites > 0 && (
                <span className="text-yellow-400">{report.summary.degradedSites} dégradé(s)</span>
              )}
              {report.summary.downSites > 0 && (
                <span className="text-red-400">{report.summary.downSites} down</span>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Zap className="w-5 h-5 text-blue-400" />}
          label="Requêtes totales"
          value={report.scrapingStats.totalRequests.toString()}
        />
        <MetricCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
          label="Taux de succès"
          value={report.scrapingStats.successRate}
        />
        <MetricCard
          icon={<Shield className="w-5 h-5 text-purple-400" />}
          label="Cache hits"
          value={report.scrapingStats.cacheHitRate}
        />
        <MetricCard
          icon={<Server className={`w-5 h-5 ${report.proxyHealthy ? 'text-green-400' : 'text-red-400'}`} />}
          label="Proxy Railway"
          value={report.proxyHealthy ? 'OK' : 'DOWN'}
        />
      </div>

      {/* ── Active Alerts ── */}
      {activeAlerts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Alertes actives ({activeAlerts.length})
          </h2>
          <div className="space-y-3">
            {activeAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border ${
                  alert.severity === 'critical'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                        alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-zinc-500">{ALERT_TYPE_LABELS[alert.type] || alert.type}</span>
                      <span className="text-xs text-zinc-600">·</span>
                      <span className="text-xs text-zinc-500 font-mono">{alert.site}</span>
                    </div>
                    <p className="font-medium text-sm">{alert.message}</p>
                    <p className="text-xs text-zinc-400 mt-1">{alert.detail}</p>
                    <p className="text-xs text-zinc-600 mt-2">
                      {alert.occurrences}x · Première: {timeAgo(alert.firstSeen)} · Dernière: {timeAgo(alert.lastSeen)}
                    </p>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    disabled={resolving === alert.id}
                    className="ml-4 px-3 py-1.5 text-xs bg-zinc-700 rounded-lg hover:bg-zinc-600 transition disabled:opacity-50"
                  >
                    {resolving === alert.id ? '...' : 'Résoudre'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Sites Health Grid ── */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Santé par site ({report.summary.totalSites})
        </h2>
        {sortedSites.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucune extraction enregistrée depuis le dernier démarrage.</p>
            <p className="text-sm mt-1">Les données apparaîtront après les premières requêtes.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedSites.map(site => {
              const cfg = STATUS_CONFIG[site.status]
              const Icon = cfg.icon
              return (
                <div key={site.site} className={`p-4 rounded-xl border ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                      <span className="font-semibold text-sm">{site.site}</span>
                    </div>
                    <span className={`text-xs font-mono ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-zinc-500">N1 API</p>
                      <p className={`font-mono font-semibold ${
                        site.n1SuccessRate < 0 ? 'text-zinc-600'
                        : site.n1SuccessRate >= 80 ? 'text-green-400'
                        : site.n1SuccessRate >= 50 ? 'text-yellow-400'
                        : 'text-red-400'
                      }`}>
                        {site.n1SuccessRate < 0 ? 'N/A' : `${site.n1SuccessRate}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Cascade</p>
                      <p className={`font-mono font-semibold ${
                        site.avgCascadeLevel <= 1.5 ? 'text-green-400'
                        : site.avgCascadeLevel <= 2.5 ? 'text-yellow-400'
                        : 'text-red-400'
                      }`}>
                        N{site.avgCascadeLevel}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Durée</p>
                      <p className="font-mono font-semibold text-zinc-300">
                        {formatMs(site.avgDurationMs)}
                      </p>
                    </div>
                  </div>
                  {site.lastSuccess && (
                    <p className="text-xs text-zinc-600 mt-2">
                      Dernier succès: {timeAgo(site.lastSuccess)}
                    </p>
                  )}
                  {/* Recent extractions mini-timeline */}
                  {site.recentExtractions.length > 0 && (
                    <div className="flex gap-0.5 mt-3">
                      {site.recentExtractions.slice(-20).map((ext, i) => (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded-sm ${
                            ext.success ? 'bg-green-500/60' : 'bg-red-500/60'
                          }`}
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
      </section>

      {/* ── Domain Stats ── */}
      {Object.keys(report.scrapingStats.byDomain).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Statistiques par domaine</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                  <th className="px-4 py-3">Domaine</th>
                  <th className="px-4 py-3 text-right">Requêtes</th>
                  <th className="px-4 py-3 text-right">Succès</th>
                  <th className="px-4 py-3 text-right">Bloqués</th>
                  <th className="px-4 py-3 text-right">Taux</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(report.scrapingStats.byDomain)
                  .sort(([, a], [, b]) => b.requests - a.requests)
                  .map(([domain, stats]) => {
                    const rate = stats.requests > 0 ? Math.round((stats.success / stats.requests) * 100) : 0
                    return (
                      <tr key={domain} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-2 font-mono text-xs">{domain}</td>
                        <td className="px-4 py-2 text-right">{stats.requests}</td>
                        <td className="px-4 py-2 text-right text-green-400">{stats.success}</td>
                        <td className="px-4 py-2 text-right text-red-400">{stats.blocked}</td>
                        <td className={`px-4 py-2 text-right font-semibold ${
                          rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {rate}%
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Resolved Alerts History ── */}
      {report.alerts.filter(a => a.resolved).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-zinc-400">
            Alertes résolues ({report.alerts.filter(a => a.resolved).length})
          </h2>
          <div className="space-y-2">
            {report.alerts.filter(a => a.resolved).slice(0, 10).map(alert => (
              <div key={alert.id} className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="font-mono">{alert.site}</span>
                  <span>·</span>
                  <span>{ALERT_TYPE_LABELS[alert.type] || alert.type}</span>
                  <span>·</span>
                  <span>{alert.occurrences}x</span>
                  <span>·</span>
                  <span>{timeAgo(alert.lastSeen)}</span>
                </div>
                <p className="text-xs text-zinc-600 mt-1">{alert.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <p className="text-2xl font-bold font-mono">{value}</p>
    </div>
  )
}
