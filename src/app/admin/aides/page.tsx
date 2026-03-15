'use client'

import { LABELS_CATEGORIES, TOUTES_AIDES, type CategorieAide } from '@/data/aides-accession'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

// ── Types ─────────────────────────────────────────────────

type HealthStatus = 'ok' | 'warning' | 'error' | 'unknown'

interface UrlCheckResult {
  aideId: string
  aideNom: string
  url: string
  status: HealthStatus
  httpStatus?: number
  responseTimeMs: number
  error?: string
  checkedAt: string
}

interface FreshnessResult {
  aideId: string
  aideNom: string
  dateMAJ: string
  dateVerification?: string
  joursSansVerification: number
  status: HealthStatus
}

interface ContentHashResult {
  aideId: string
  url: string
  changed: boolean
  checkedAt: string
}

interface HealthReport {
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

// ── Helpers ───────────────────────────────────────────────

const STATUS_DOT: Record<HealthStatus, string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  unknown: 'bg-zinc-600',
}

const STATUS_ICONS: Record<HealthStatus, React.ReactNode> = {
  ok: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  error: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  unknown: <Clock className="w-3.5 h-3.5 text-zinc-500" />,
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ── Component ─────────────────────────────────────────────

export default function AdminAidesPage() {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategorieAide | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<HealthStatus | 'all'>('all')
  const [expandedAides, setExpandedAides] = useState<Set<string>>(new Set())

  const fetchLastReport = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/aides/health-check?mode=last')
      if (res.ok) {
        setReport(await res.json())
      }
    } catch {
      // Pas de rapport précédent
    }
  }, [])

  useEffect(() => { fetchLastReport() }, [fetchLastReport])

  const runHealthCheck = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/aides/health-check?mode=full')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setReport(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  const aidesView = useMemo(() => {
    return TOUTES_AIDES.filter(a => a.actif).map(aide => {
      const urlCheck = report?.urlChecks.find(c => c.aideId === aide.id)
      const freshness = report?.freshness.find(f => f.aideId === aide.id)
      const contentChange = report?.contentChanges.find(c => c.aideId === aide.id)
      let globalStatus: HealthStatus = 'unknown'
      if (urlCheck || freshness) {
        const statuses = [urlCheck?.status, freshness?.status].filter(Boolean) as HealthStatus[]
        if (statuses.includes('error')) globalStatus = 'error'
        else if (statuses.includes('warning')) globalStatus = 'warning'
        else if (statuses.every(s => s === 'ok')) globalStatus = 'ok'
      }
      return { aide, urlCheck, freshness, contentChange, globalStatus }
    })
  }, [report])

  const filteredAides = useMemo(() => {
    return aidesView.filter(item => {
      if (search) {
        const q = search.toLowerCase()
        if (!item.aide.nom.toLowerCase().includes(q) && !item.aide.id.toLowerCase().includes(q)) return false
      }
      if (categoryFilter !== 'all' && item.aide.categorie !== categoryFilter) return false
      if (statusFilter !== 'all' && item.globalStatus !== statusFilter) return false
      return true
    })
  }, [aidesView, search, categoryFilter, statusFilter])

  const toggleExpand = (id: string) => {
    setExpandedAides(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const counts = useMemo(() => ({
    total: aidesView.length,
    ok: aidesView.filter(a => a.globalStatus === 'ok').length,
    warning: aidesView.filter(a => a.globalStatus === 'warning').length,
    error: aidesView.filter(a => a.globalStatus === 'error').length,
    unknown: aidesView.filter(a => a.globalStatus === 'unknown').length,
  }), [aidesView])

  return (
    <div className="space-y-4 pb-8">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            Monitoring Aides
          </h1>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            {counts.total} aides actives · Dernière vérif. : {report ? formatDate(report.timestamp) : 'jamais'}
          </p>
        </div>
        <button
          onClick={runHealthCheck}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? 'Vérification…' : 'Vérifier'}
        </button>
      </div>

      {/* ═══ KPI STRIP ═══ */}
      <div className="grid grid-cols-5 gap-px rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-800">
        {[
          { label: 'Total', value: counts.total, icon: <Activity className="h-3.5 w-3.5 text-zinc-400" />, color: 'text-white' },
          { label: 'OK', value: counts.ok, icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />, color: 'text-emerald-400' },
          { label: 'Warning', value: counts.warning, icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />, color: 'text-amber-400' },
          { label: 'Erreur', value: counts.error, icon: <XCircle className="h-3.5 w-3.5 text-red-400" />, color: 'text-red-400' },
          { label: 'Non vérifié', value: counts.unknown, icon: <Clock className="h-3.5 w-3.5 text-zinc-500" />, color: 'text-zinc-500' },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              {s.icon}
              <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">{s.label}</span>
            </div>
            <span className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ═══ REPORT SUMMARY (inline bar) ═══ */}
      {report && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-2.5 text-[11px] text-zinc-500">
          <span>Scan : <strong className="text-zinc-300">{formatDuration(report.durationMs)}</strong></span>
          <span>URLs OK : <strong className="text-emerald-400">{report.summary.urlsOk}</strong></span>
          <span>Cassées : <strong className={report.summary.urlsBroken > 0 ? 'text-red-400' : 'text-zinc-400'}>{report.summary.urlsBroken}</strong></span>
          <span>Obsolètes : <strong className={report.summary.staleCount > 0 ? 'text-amber-400' : 'text-zinc-400'}>{report.summary.staleCount}</strong></span>
          <span>Modifiées : <strong className={report.summary.contentChanged > 0 ? 'text-blue-400' : 'text-zinc-400'}>{report.summary.contentChanged}</strong></span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-[12px] text-red-400 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ═══ FILTERS + LIST (one panel) ═══ */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-800/60">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-8 pr-3 py-1.5 text-[12px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as CategorieAide | 'all')}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[12px] text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          >
            <option value="all">Toutes catégories</option>
            {(Object.entries(LABELS_CATEGORIES) as [CategorieAide, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as HealthStatus | 'all')}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[12px] text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          >
            <option value="all">Tous statuts</option>
            <option value="ok">OK</option>
            <option value="warning">Warning</option>
            <option value="error">Erreur</option>
            <option value="unknown">Non vérifié</option>
          </select>
          <span className="text-[11px] text-zinc-700 ml-auto">{filteredAides.length} résultat{filteredAides.length !== 1 ? 's' : ''}</span>
        </div>

        {/* List */}
        {filteredAides.length === 0 ? (
          <p className="text-center text-[12px] text-zinc-700 py-12">Aucune aide ne correspond aux filtres</p>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {filteredAides.map(({ aide, urlCheck, freshness, contentChange, globalStatus }) => {
              const isExpanded = expandedAides.has(aide.id)
              return (
                <div key={aide.id}>
                  <button
                    onClick={() => toggleExpand(aide.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-800/20 transition"
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[globalStatus]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-zinc-300 truncate">{aide.nomCourt}</span>
                        <span className="text-[10px] text-zinc-700 font-mono">{aide.id}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-600">
                        <span>{LABELS_CATEGORIES[aide.categorie]}</span>
                        <span className="text-zinc-800">·</span>
                        <span>MAJ {aide.dateMAJ}</span>
                        {freshness && freshness.status !== 'ok' && (
                          <>
                            <span className="text-zinc-800">·</span>
                            <span className="text-amber-400/80 font-medium">{freshness.joursSansVerification}j sans vérif.</span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Badges */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {urlCheck && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          urlCheck.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : urlCheck.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {urlCheck.httpStatus || 'timeout'}
                        </span>
                      )}
                      {contentChange?.changed && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">
                          modifié
                        </span>
                      )}
                      {STATUS_ICONS[globalStatus]}
                    </div>
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-600 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-600 shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-zinc-800/30 bg-zinc-950/30 px-4 py-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
                        <div>
                          <h4 className="font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                            <Globe className="h-3 w-3" /> URL Officielle
                          </h4>
                          <a href={aide.urlOfficielle} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 break-all flex items-center gap-1">
                            {aide.urlOfficielle} <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                          {urlCheck && (
                            <div className="mt-2 space-y-0.5 text-zinc-600">
                              <p>HTTP : <strong className={urlCheck.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}>{urlCheck.httpStatus || 'N/A'}</strong></p>
                              <p>Réponse : <strong className="text-zinc-400">{urlCheck.responseTimeMs}ms</strong></p>
                              {urlCheck.error && <p className="text-red-400">Erreur : {urlCheck.error}</p>}
                              <p>Vérifié : {formatDate(urlCheck.checkedAt)}</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                            <Shield className="h-3 w-3" /> Métadonnées
                          </h4>
                          <div className="space-y-0.5 text-zinc-600">
                            <p>Organisme : <strong className="text-zinc-400">{aide.organisme}</strong></p>
                            <p>Disponibilité : <strong className="text-zinc-400">{aide.disponibilite}</strong></p>
                            {aide.sourceJuridique && <p>Source : <strong className="text-zinc-400">{aide.sourceJuridique}</strong></p>}
                            <p>Date MAJ : <strong className="text-zinc-400">{aide.dateMAJ}</strong></p>
                            {aide.dateVerification && <p>Vérification : <strong className="text-zinc-400">{aide.dateVerification}</strong></p>}
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-600 leading-relaxed mt-3 pt-3 border-t border-zinc-800/30">{aide.description}</p>
                      <div className="mt-3 pt-3 border-t border-zinc-800/30 flex items-center gap-2">
                        <a href={aide.urlOfficielle} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2.5 py-1 rounded-md border border-blue-500/20 hover:bg-blue-500/10 transition">
                          <ExternalLink className="h-3 w-3" /> Ouvrir
                        </a>
                        {aide.sourceLegifrance && (
                          <a href={aide.sourceLegifrance} target="_blank" rel="noopener noreferrer" className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-800 hover:bg-zinc-800/50 transition">
                            Légifrance
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
