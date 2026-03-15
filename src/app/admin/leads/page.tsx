'use client'

import {
    ArrowLeft,
    ArrowRight,
    Download,
    ExternalLink,
    Filter,
    Flame,
    HelpCircle,
    RefreshCw,
    Search,
    Snowflake,
    Thermometer,
    Trash2,
    Users,
    X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

// ── Types ─────────────────────────────────────────────────

interface LeadRow {
  id: string
  email: string
  prenom: string
  source: string
  contexte: string | null
  emailSent: boolean
  ip: string
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ── Constantes ────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  'comparateur': 'Comparateur',
  'simulateur-a': 'Mode A',
  'simulateur-b': 'Mode B',
  'carte': 'Carte',
  'aides': 'Aides',
}

const SOURCE_COLORS: Record<string, string> = {
  'comparateur': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'simulateur-a': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'simulateur-b': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'carte': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'aides': 'bg-red-500/20 text-red-400 border-red-500/30',
}

const NIVEAU_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Flame }> = {
  hot: { label: 'Hot', color: 'text-red-400', bg: 'bg-red-500/15 text-red-400 border-red-500/25', icon: Flame },
  warm: { label: 'Warm', color: 'text-amber-400', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/25', icon: Thermometer },
  cold: { label: 'Cold', color: 'text-blue-400', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/25', icon: Snowflake },
}

const SOURCES = ['comparateur', 'simulateur-a', 'simulateur-b', 'carte', 'aides'] as const
const NIVEAUX = ['hot', 'warm', 'cold'] as const

/** Context field labels for human display */
const CTX_LABELS: Record<string, string> = {
  prixAchatMax: 'Budget max',
  capitalEmpruntable: 'Capital empruntable',
  prixBien: 'Prix du bien',
  budgetMax: 'Budget max',
  tauxEndettement: 'Taux endettement',
  dureeAns: 'Durée (ans)',
  apport: 'Apport',
  typeBien: 'Type de bien',
  scoreFaisabilite: 'Score faisabilité',
  nbBiens: 'Nb biens comparés',
  gate: 'Point de capture',
  type: 'Type',
  utm_source: 'Source UTM',
  utm_medium: 'Medium UTM',
  utm_campaign: 'Campagne UTM',
  referrer: 'Referrer',
}

const CTX_HIDDEN = new Set(['score', 'niveau', 'utm_term', 'utm_content'])

// ── Helpers ───────────────────────────────────────────────

function parseContexte(ctx: string | null): Record<string, unknown> | null {
  if (!ctx) return null
  try {
    return JSON.parse(ctx) as Record<string, unknown>
  } catch {
    return null
  }
}

function getNiveau(ctx: Record<string, unknown> | null): string {
  return (ctx?.niveau as string) ?? 'cold'
}

function getScore(ctx: Record<string, unknown> | null): number | null {
  const s = ctx?.score
  return typeof s === 'number' ? s : null
}

function formatMontant(n: unknown): string {
  if (typeof n !== 'number') return String(n ?? '—')
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' €'
}

function formatCtxValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (key === 'prixAchatMax' || key === 'capitalEmpruntable' || key === 'prixBien' || key === 'budgetMax' || key === 'apport') return formatMontant(val)
  if (key === 'tauxEndettement' || key === 'scoreFaisabilite') return `${val}%`
  if (key === 'dureeAns') return `${val} ans`
  if (key === 'gate') return val === 'result-unlock' ? 'Résultats débloqués' : val === 'pdf-bonus' ? 'PDF bonus' : String(val)
  if (key === 'typeBien') return String(val).charAt(0).toUpperCase() + String(val).slice(1)
  return String(val)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}j`
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

// ── Score bar component ───────────────────────────────────

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-600">—</span>
  const color = score >= 60 ? 'bg-red-500' : score >= 30 ? 'bg-amber-500' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[11px] text-zinc-500 tabular-nums">{score}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [niveauFilter, setNiveauFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<LeadRow | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (sourceFilter) params.set('source', sourceFilter)
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/admin/leads?${params}`)
      if (!res.ok) return
      const data = (await res.json()) as { leads: LeadRow[]; pagination: Pagination }
      setLeads(data.leads)
      setPagination(data.pagination)
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }, [search, sourceFilter])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Client-side niveau filter (since API doesn't support it)
  const filteredLeads = useMemo(() => {
    if (!niveauFilter) return leads
    return leads.filter((l) => {
      const ctx = parseContexte(l.contexte)
      return getNiveau(ctx) === niveauFilter
    })
  }, [leads, niveauFilter])

  // Stats computed from current page leads
  const stats = useMemo(() => {
    const all = leads.map((l) => parseContexte(l.contexte))
    const hot = all.filter((c) => getNiveau(c) === 'hot').length
    const warm = all.filter((c) => getNiveau(c) === 'warm').length
    const cold = all.filter((c) => getNiveau(c) === 'cold').length
    return { hot, warm, cold, total: pagination.total }
  }, [leads, pagination.total])

  const handleDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Supprimer ${selected.size} lead(s) ?`)) return
    await fetch('/api/admin/leads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    fetchLeads(pagination.page)
  }

  const handleExport = () => {
    const BOM = '\uFEFF'
    const headers = ['Email', 'Prénom', 'Source', 'Niveau', 'Score', 'Date']
    const rows = leads.map((l) => {
      const ctx = parseContexte(l.contexte)
      return [l.email, l.prenom, SOURCE_LABELS[l.source] ?? l.source, getNiveau(ctx), getScore(ctx) ?? '', new Date(l.createdAt).toLocaleDateString('fr-FR')]
    })
    const csv = BOM + [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleAll = () => {
    if (selected.size === filteredLeads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredLeads.map((l) => l.id)))
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const hasFilters = sourceFilter || niveauFilter || search
  const clearFilters = () => { setSourceFilter(''); setNiveauFilter(''); setSearch('') }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white tracking-tight">Leads</h1>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400 tabular-nums">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20">
              <Trash2 className="h-3 w-3" /> {selected.size}
            </button>
          )}
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition">
            <Download className="h-3 w-3" /> Export
          </button>
          <button onClick={() => fetchLeads(pagination.page)} className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowHelp(!showHelp)} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition ${showHelp ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}>
            <HelpCircle className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Help panel — what is a lead */}
      {showHelp && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-blue-400 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" /> C&apos;est quoi un lead ?
            </h3>
            <button onClick={() => setShowHelp(false)} className="text-zinc-600 hover:text-zinc-400 transition">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[12px] text-zinc-400 leading-relaxed">
            Un <span className="text-white font-medium">lead</span> est un visiteur qui a donné son email pour débloquer ses résultats de simulation. Il est capturé automatiquement quand un utilisateur remplit le formulaire email sur la page résultats (Mode A, Mode B) ou demande un rapport via le Comparateur.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-red-500/10 border border-red-500/15 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame className="h-3 w-3 text-red-400" />
                <span className="text-[11px] font-semibold text-red-400">Hot · Score ≥ 60</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">Projet avancé — données complètes (budget, apport, durée, type de bien, taux calculé)</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/15 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Thermometer className="h-3 w-3 text-amber-400" />
                <span className="text-[11px] font-semibold text-amber-400">Warm · Score 30-59</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">Intérêt confirmé — données partielles (quelques champs remplis)</p>
            </div>
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/15 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Snowflake className="h-3 w-3 text-blue-400" />
                <span className="text-[11px] font-semibold text-blue-400">Cold · Score &lt; 30</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">En exploration — peu de données, navigation carte ou aides uniquement</p>
            </div>
          </div>
          <div className="border-t border-blue-500/10 pt-2">
            <p className="text-[10px] text-zinc-600">Le score (0-100) se calcule automatiquement selon la source (+25 simulateur, +15 comparateur, +5 carte/aides) et la complétude des données (+15 budget, +10 apport, +10 durée, +10 type bien, +10 taux, +10 faisabilité, +5 prénom, +5 UTM).</p>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-zinc-800 bg-zinc-800">
        {NIVEAUX.map((n) => {
          const cfg = NIVEAU_CONFIG[n]
          const Icon = cfg.icon
          const count = stats[n]
          return (
            <button
              key={n}
              onClick={() => setNiveauFilter(niveauFilter === n ? '' : n)}
              className={`bg-zinc-900 px-4 py-3 text-left transition hover:bg-zinc-900/60 ${niveauFilter === n ? 'ring-1 ring-inset ring-zinc-700' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                <span className={`text-[11px] font-medium uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
              </div>
              <span className="text-xl font-bold text-white tabular-nums">{count}</span>
              <span className="text-[11px] text-zinc-600 ml-1.5">/{leads.length}</span>
            </button>
          )
        })}
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            placeholder="Rechercher par email ou prénom…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 focus:border-emerald-500/50 focus:outline-none"
        >
          <option value="">Toutes sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
          ))}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-2 text-xs text-zinc-500 hover:text-zinc-300">
            <X className="h-3 w-3" /> Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-[11px] text-zinc-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.size === filteredLeads.length && filteredLeads.length > 0} onChange={toggleAll} className="rounded border-zinc-600 accent-emerald-500" />
                </th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Niveau</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Contexte</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="py-12 text-center text-zinc-600">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-zinc-700" />
                </td></tr>
              )}
              {!loading && filteredLeads.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center">
                  <Users className="h-6 w-6 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-600">Aucun lead trouvé</p>
                </td></tr>
              )}
              {!loading && filteredLeads.map((lead) => {
                const ctx = parseContexte(lead.contexte)
                const niveau = getNiveau(ctx)
                const score = getScore(ctx)
                const nCfg = NIVEAU_CONFIG[niveau]
                const NIcon = nCfg?.icon ?? Filter
                // Extract key context info for summary
                const budget = ctx?.prixAchatMax ?? ctx?.capitalEmpruntable ?? ctx?.prixBien ?? ctx?.budgetMax
                const typeBien = ctx?.typeBien as string | undefined
                return (
                  <tr key={lead.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition cursor-pointer" onClick={() => setDetail(lead)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} className="rounded border-zinc-600 accent-emerald-500" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          niveau === 'hot' ? 'bg-red-500/15 text-red-400'
                          : niveau === 'warm' ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-blue-500/15 text-blue-400'
                        }`}>
                          {(lead.prenom || lead.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-zinc-200 truncate">{lead.prenom || '—'}</p>
                          <p className="text-[11px] text-zinc-600 truncate">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${SOURCE_COLORS[lead.source] ?? 'bg-zinc-700/50 text-zinc-400 border-zinc-600'}`}>
                        {SOURCE_LABELS[lead.source] ?? lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${nCfg?.bg ?? 'bg-zinc-700/50 text-zinc-400 border-zinc-600'}`}>
                        {nCfg && <NIcon className="h-2.5 w-2.5" />}
                        {nCfg?.label ?? niveau}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar score={score} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        {typeof budget === 'number' && <span className="text-emerald-400/70">{formatMontant(budget)}</span>}
                        {typeBien && <span className="text-zinc-600 capitalize">{typeBien}</span>}
                        {!budget && !typeBien && <span className="text-zinc-700">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-600 whitespace-nowrap">
                      {timeAgo(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setDetail(lead)} className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-white transition">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-zinc-600">
            Page {pagination.page}/{pagination.totalPages} · {pagination.total} leads
          </p>
          <div className="flex gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchLeads(pagination.page - 1)}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-500 hover:bg-zinc-800 disabled:opacity-30"
            >
              <ArrowLeft className="h-3 w-3" />
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchLeads(pagination.page + 1)}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-500 hover:bg-zinc-800 disabled:opacity-30"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {detail && (() => {
        const ctx = parseContexte(detail.contexte)
        const niveau = getNiveau(ctx)
        const score = getScore(ctx)
        const nCfg = NIVEAU_CONFIG[niveau]
        const NIcon = nCfg?.icon ?? Filter
        // Separate context fields into categories
        const financialKeys = ['prixAchatMax', 'capitalEmpruntable', 'prixBien', 'budgetMax', 'apport', 'tauxEndettement', 'dureeAns', 'typeBien', 'scoreFaisabilite', 'nbBiens']
        const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'referrer']
        const ctxEntries = ctx ? Object.entries(ctx).filter(([k]) => !CTX_HIDDEN.has(k)) : []
        const financialEntries = ctxEntries.filter(([k]) => financialKeys.includes(k))
        const utmEntries = ctxEntries.filter(([k]) => utmKeys.includes(k))
        const otherEntries = ctxEntries.filter(([k]) => !financialKeys.includes(k) && !utmKeys.includes(k))

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDetail(null)}>
            <div className="mx-4 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    niveau === 'hot' ? 'bg-red-500/15 text-red-400'
                    : niveau === 'warm' ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-blue-500/15 text-blue-400'
                  }`}>
                    {(detail.prenom || detail.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{detail.prenom || detail.email.split('@')[0]}</p>
                    <p className="text-[12px] text-zinc-500">{detail.email}</p>
                  </div>
                </div>
                <button onClick={() => setDetail(null)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/40 bg-zinc-900/60">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${nCfg?.bg ?? 'bg-zinc-700/50 text-zinc-400 border-zinc-600'}`}>
                  {nCfg && <NIcon className="h-3 w-3" />}
                  {nCfg?.label ?? niveau}
                </span>
                {score !== null && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-zinc-800 overflow-hidden">
                      <div className={`h-full rounded-full ${score >= 60 ? 'bg-red-500' : score >= 30 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${score}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500 tabular-nums">{score}/100</span>
                  </div>
                )}
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${SOURCE_COLORS[detail.source] ?? 'bg-zinc-700/50 text-zinc-400 border-zinc-600'}`}>
                  {SOURCE_LABELS[detail.source] ?? detail.source}
                </span>
                <span className="ml-auto text-[11px] text-zinc-600">{new Date(detail.createdAt).toLocaleString('fr-FR')}</span>
              </div>

              {/* Context sections */}
              <div className="max-h-80 overflow-y-auto px-5 py-4 space-y-4">
                {/* Financial data */}
                {financialEntries.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Données financières</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {financialEntries.map(([k, v]) => (
                        <div key={k}>
                          <p className="text-[10px] text-zinc-600">{CTX_LABELS[k] ?? k}</p>
                          <p className="text-[13px] font-medium text-zinc-300">{formatCtxValue(k, v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* UTM / Acquisition */}
                {utmEntries.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Acquisition</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {utmEntries.map(([k, v]) => (
                        <div key={k}>
                          <p className="text-[10px] text-zinc-600">{CTX_LABELS[k] ?? k}</p>
                          <p className="text-[13px] font-medium text-zinc-300">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other context */}
                {otherEntries.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Autres</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {otherEntries.map(([k, v]) => (
                        <div key={k}>
                          <p className="text-[10px] text-zinc-600">{CTX_LABELS[k] ?? k}</p>
                          <p className="text-[13px] font-medium text-zinc-300">{formatCtxValue(k, v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!ctx && (
                  <p className="text-sm text-zinc-600 text-center py-4">Aucune donnée contextuelle</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
