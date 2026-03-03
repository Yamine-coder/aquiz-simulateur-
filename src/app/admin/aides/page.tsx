'use client'

/**
 * Admin Dashboard — Gestion des aides à l'accession
 * 
 * /admin/aides
 * 
 * Fonctionnalités :
 * - Vue d'ensemble avec statuts de santé
 * - Health check en un clic
 * - Indicateurs de fraîcheur par aide
 * - Détection des liens cassés
 * - Historique des changements de contenu
 */

import { LABELS_CATEGORIES, TOUTES_AIDES, type CategorieAide } from '@/data/aides-accession'
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
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
import Link from 'next/link'
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

const STATUS_COLORS: Record<HealthStatus, string> = {
  ok: 'text-emerald-600 bg-emerald-50',
  warning: 'text-amber-600 bg-amber-50',
  error: 'text-red-600 bg-red-50',
  unknown: 'text-gray-400 bg-gray-50',
}

const STATUS_ICONS: Record<HealthStatus, React.ReactNode> = {
  ok: <CheckCircle2 className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  error: <XCircle className="w-4 h-4" />,
  unknown: <Clock className="w-4 h-4" />,
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
      // Pas de rapport précédent, c'est OK
    }
  }, [])

  // Charger le dernier rapport au mount
  useEffect(() => {
    fetchLastReport()
  }, [fetchLastReport])

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

  // Construire la vue consolidée par aide
  const aidesView = useMemo(() => {
    return TOUTES_AIDES.filter(a => a.actif).map(aide => {
      const urlCheck = report?.urlChecks.find(c => c.aideId === aide.id)
      const freshness = report?.freshness.find(f => f.aideId === aide.id)
      const contentChange = report?.contentChanges.find(c => c.aideId === aide.id)

      // Statut global = pire statut des vérifications
      let globalStatus: HealthStatus = 'unknown'
      if (urlCheck || freshness) {
        const statuses = [urlCheck?.status, freshness?.status].filter(Boolean) as HealthStatus[]
        if (statuses.includes('error')) globalStatus = 'error'
        else if (statuses.includes('warning')) globalStatus = 'warning'
        else if (statuses.every(s => s === 'ok')) globalStatus = 'ok'
      }

      return {
        aide,
        urlCheck,
        freshness,
        contentChange,
        globalStatus,
      }
    })
  }, [report])

  // Filtrage
  const filteredAides = useMemo(() => {
    return aidesView.filter(item => {
      if (search) {
        const q = search.toLowerCase()
        if (!item.aide.nom.toLowerCase().includes(q) && !item.aide.id.toLowerCase().includes(q)) {
          return false
        }
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

  // Compteurs
  const counts = useMemo(() => ({
    total: aidesView.length,
    ok: aidesView.filter(a => a.globalStatus === 'ok').length,
    warning: aidesView.filter(a => a.globalStatus === 'warning').length,
    error: aidesView.filter(a => a.globalStatus === 'error').length,
    unknown: aidesView.filter(a => a.globalStatus === 'unknown').length,
  }), [aidesView])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Monitoring Aides
                </h1>
                <p className="text-xs text-gray-500">
                  {counts.total} aides actives · Dernière vérification : {report ? formatDate(report.timestamp) : 'jamais'}
                </p>
              </div>
            </div>
            <button
              onClick={runHealthCheck}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {loading ? 'Vérification…' : 'Vérifier maintenant'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard label="Total" value={counts.total} icon={<Activity className="w-4 h-4" />} color="bg-gray-50 text-gray-700" />
          <StatCard label="OK" value={counts.ok} icon={<CheckCircle2 className="w-4 h-4" />} color="bg-emerald-50 text-emerald-700" />
          <StatCard label="Warning" value={counts.warning} icon={<AlertTriangle className="w-4 h-4" />} color="bg-amber-50 text-amber-700" />
          <StatCard label="Erreur" value={counts.error} icon={<XCircle className="w-4 h-4" />} color="bg-red-50 text-red-700" />
          <StatCard label="Non vérifié" value={counts.unknown} icon={<Clock className="w-4 h-4" />} color="bg-gray-50 text-gray-500" />
        </div>

        {/* Report summary */}
        {report && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
              <span>Durée du scan : <strong className="text-gray-700">{formatDuration(report.durationMs)}</strong></span>
              <span>URLs OK : <strong className="text-emerald-600">{report.summary.urlsOk}</strong></span>
              <span>URLs cassées : <strong className={report.summary.urlsBroken > 0 ? 'text-red-600' : 'text-gray-700'}>{report.summary.urlsBroken}</strong></span>
              <span>Aides obsolètes : <strong className={report.summary.staleCount > 0 ? 'text-amber-600' : 'text-gray-700'}>{report.summary.staleCount}</strong></span>
              <span>Contenus modifiés : <strong className={report.summary.contentChanged > 0 ? 'text-blue-600' : 'text-gray-700'}>{report.summary.contentChanged}</strong></span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-sm text-red-700">
            <ShieldAlert className="w-4 h-4 inline mr-2" />
            Erreur : {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-50 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une aide…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as CategorieAide | 'all')}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="all">Toutes catégories</option>
            {(Object.entries(LABELS_CATEGORIES) as [CategorieAide, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as HealthStatus | 'all')}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="all">Tous statuts</option>
            <option value="ok">OK</option>
            <option value="warning">Warning</option>
            <option value="error">Erreur</option>
            <option value="unknown">Non vérifié</option>
          </select>
        </div>

        {/* Aides list */}
        <div className="space-y-2">
          {filteredAides.map(({ aide, urlCheck, freshness, contentChange, globalStatus }) => {
            const isExpanded = expandedAides.has(aide.id)
            return (
              <div
                key={aide.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all"
              >
                {/* Row header */}
                <button
                  onClick={() => toggleExpand(aide.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  {/* Status indicator */}
                  <span className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${STATUS_COLORS[globalStatus]}`}>
                    {STATUS_ICONS[globalStatus]}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">{aide.nomCourt}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{aide.id}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500">
                      <span>{LABELS_CATEGORIES[aide.categorie]}</span>
                      <span>·</span>
                      <span>MAJ : {aide.dateMAJ}</span>
                      {freshness && (
                        <>
                          <span>·</span>
                          <span className={freshness.status !== 'ok' ? 'text-amber-600 font-medium' : ''}>
                            {freshness.joursSansVerification}j sans vérification
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* URL status badge */}
                  {urlCheck && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[urlCheck.status]}`}>
                      {urlCheck.httpStatus || 'timeout'}
                    </span>
                  )}

                  {contentChange?.changed && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                      Contenu modifié
                    </span>
                  )}

                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {/* URL Info */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" /> URL Officielle
                        </h4>
                        <a
                          href={aide.urlOfficielle}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-all flex items-center gap-1"
                        >
                          {aide.urlOfficielle}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        {urlCheck && (
                          <div className="mt-2 space-y-1 text-gray-500">
                            <p>HTTP : <strong className={urlCheck.status === 'ok' ? 'text-emerald-600' : 'text-red-600'}>{urlCheck.httpStatus || 'N/A'}</strong></p>
                            <p>Temps de réponse : <strong>{urlCheck.responseTimeMs}ms</strong></p>
                            {urlCheck.error && <p className="text-red-600">Erreur : {urlCheck.error}</p>}
                            <p>Vérifié le : {formatDate(urlCheck.checkedAt)}</p>
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" /> Métadonnées
                        </h4>
                        <div className="space-y-1 text-gray-500">
                          <p>Organisme : <strong className="text-gray-700">{aide.organisme}</strong></p>
                          <p>Disponibilité : <strong className="text-gray-700">{aide.disponibilite}</strong></p>
                          {aide.sourceJuridique && <p>Source : <strong className="text-gray-700">{aide.sourceJuridique}</strong></p>}
                          <p>Date MAJ : <strong className="text-gray-700">{aide.dateMAJ}</strong></p>
                          {aide.dateVerification && <p>Dernière vérification : <strong className="text-gray-700">{aide.dateVerification}</strong></p>}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mt-3 pt-3 border-t border-gray-200/80">
                      <p className="text-xs text-gray-600 leading-relaxed">{aide.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-3 border-t border-gray-200/80 flex items-center gap-2">
                      <a
                        href={aide.urlOfficielle}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1.5 rounded-md border border-blue-200 hover:bg-blue-50 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> Ouvrir le lien
                      </a>
                      {aide.sourceLegifrance && (
                        <a
                          href={aide.sourceLegifrance}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          Légifrance
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {filteredAides.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Aucune aide ne correspond aux filtres
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className={`rounded-xl border border-gray-200 p-3 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium opacity-75">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  )
}
