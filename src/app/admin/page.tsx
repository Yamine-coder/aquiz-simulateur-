'use client'

import {
  Activity,
  ArrowUp,
  BarChart3,
  Calculator,
  ChevronDown,
  Clock,
  Download,
  FileDown,
  Flame,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Play,
  RefreshCw,
  Snowflake,
  Sun,
  Users,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────

interface DashboardData {
  kpis: {
    contacts: { total: number; nouveaux: number; today: number; week: number; month: number }
    rappels: { total: number; nouveaux: number; today: number; week: number }
    leads: { total: number; today: number; week: number; month: number }
    newsletter: { active: number; total: number; week: number }
  }
  leadsBySource: Record<string, number>
  leadsByNiveau: Record<string, number>
  timeline: Array<{ date: string; leads: number; contacts: number; rappels: number }>
  recent: {
    contacts: Array<{ id: string; nom: string; email: string; status: string; createdAt: string }>
    rappels: Array<{ id: string; prenom: string; telephone: string; status: string; budget: number | null; createdAt: string }>
    leads: Array<{ id: string; email: string; prenom: string; source: string; contexte: string | null; createdAt: string }>
  }
  analytics?: {
    toolUsage: Record<string, number>
    toolUsageWeek: Record<string, number>
    totalSimulations: number
    simulationsWeek: number
    simulationsModeA: number
    simulationsModeB: number
    growth: { simulations: number; leads: number }
    conversion: { simToLead: number; leadToContact: number }
    averages: { budgetMoyen: number | null; tauxEndettementMoyen: number | null; dureeMoyenne: number | null; apportMoyen: number | null; typeBienTop: string | null; simCount: number }
    topCommunes: Array<{ commune: string; count: number }>
    funnel: {
      modeA: { starts: number; completions: number; pdfDownloads: number }
      modeB: { starts: number; completions: number; pdfDownloads: number }
      steps: Record<string, Record<string, number>>
      totalStarts: number
      totalCompletions: number
      totalPdfDownloads: number
    }
    cta?: {
      byType: Record<string, number>
      byPosition: Record<string, number>
      byPage: Record<string, number>
      weekByType: Record<string, number>
      total: number
    }
  }
}

type Period = '7j' | '30j'

// ── Constantes ────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  comparateur: 'Comparateur',
  'simulateur-a': 'Mode A',
  'simulateur-b': 'Mode B',
  carte: 'Carte',
  aides: 'Aides',
}
const SOURCE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1']
const NIVEAU_COLORS: Record<string, string> = { hot: '#ef4444', warm: '#f59e0b', cold: '#3b82f6' }
const NIVEAU_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  hot:  { label: 'Hot',  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  desc: 'Score ≥60 · Projet avancé, données complètes' },
  warm: { label: 'Warm', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', desc: 'Score 30-59 · Intérêt confirmé, données partielles' },
  cold: { label: 'Cold', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  desc: 'Score <30 · En exploration, peu de données' },
}

const TOOL_LABELS: Record<string, string> = {
  'simulation-a': 'Mode A',
  'simulation-b': 'Mode B',
  comparaison: 'Comparateur',
  'carte-view': 'Carte',
  'aides-check': 'Aides',
  'contact-form': 'Contact',
  'rappel-form': 'Rappel',
}
const TOOL_COLORS: Record<string, string> = {
  'simulation-a': '#3b82f6',
  'simulation-b': '#8b5cf6',
  comparaison: '#10b981',
  'carte-view': '#f59e0b',
  'aides-check': '#ef4444',
  'contact-form': '#06b6d4',
  'rappel-form': '#f97316',
}

const CTA_TYPE_LABELS: Record<string, string> = {
  calendly: 'Prise de RDV',
  phone: 'Appel téléphone',
  'contact-modal': 'Modale contact',
  'callback-cta': 'Demande rappel',
}
const CTA_TYPE_COLORS: Record<string, string> = {
  calendly: '#8b5cf6',
  phone: '#10b981',
  'contact-modal': '#3b82f6',
  'callback-cta': '#f59e0b',
}
const CTA_POS_LABELS: Record<string, string> = {
  navbar: 'Navbar',
  'navbar-mobile': 'Navbar mobile',
  footer: 'Footer',
  'footer-banner': 'Bannière footer',
  'contact-section': 'Section contact',
  'modal-rdv': 'Modale → RDV',
  'gate-overlay': 'Gate overlay',
  'mode-a-error': 'Mode A (erreur)',
  'mode-a-bottombar': 'Mode A (barre bas)',
  'mode-a-results': 'Mode A (résultats)',
  'mode-b-accompagne': 'Mode B (accompagné)',
  'mode-b-bottombar': 'Mode B (barre bas)',
  'mode-b-results': 'Mode B (résultats)',
  'aides-results': 'Aides (résultats)',
  'comparateur-hot': 'Comparateur (hot)',
  'about-footer': 'À propos (bas)',
  'modal-open': 'Ouverture modale contact',
}

const STATUS_PILL: Record<string, string> = {
  nouveau: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  lu: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  rappelé: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  traité: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  archivé: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
}

// ── Helpers ───────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}j`
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M€`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k€`
  return `${n}€`
}

function displayConversion(pct: number, enough: boolean): string {
  if (!enough) return '—'
  if (pct > 100) return '>100'
  return String(pct)
}

/** Mini sparkline SVG */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 48
  const h = 16
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-60">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Export dashboard data as CSV */
function exportCSV(data: DashboardData) {
  const rows: Array<Array<string | number>> = [
    ['Métrique', 'Total', "Aujourd'hui", 'Semaine', 'Mois'],
    ['Contacts', data.kpis.contacts.total, data.kpis.contacts.today, data.kpis.contacts.week, data.kpis.contacts.month],
    ['Rappels', data.kpis.rappels.total, data.kpis.rappels.today, data.kpis.rappels.week, '—'],
    ['Leads', data.kpis.leads.total, data.kpis.leads.today, data.kpis.leads.week, data.kpis.leads.month],
    ['Newsletter (actifs)', data.kpis.newsletter.active, '—', data.kpis.newsletter.week, '—'],
    ['Newsletter (total)', data.kpis.newsletter.total, '—', '—', '—'],
  ]
  if (data.analytics) {
    rows.push(['', '', '', '', ''])
    rows.push(['Simulations', data.analytics.totalSimulations, '—', data.analytics.simulationsWeek, '—'])
    rows.push(['Mode A', data.analytics.simulationsModeA, '', '', ''])
    rows.push(['Mode B', data.analytics.simulationsModeB, '', '', ''])
    rows.push(['', '', '', '', ''])
    rows.push(['Conversion sim→lead (%)', data.analytics.conversion.simToLead, '', '', ''])
    rows.push(['Conversion lead→contact (%)', data.analytics.conversion.leadToContact, '', '', ''])
    rows.push(['Croissance sims (%)', data.analytics.growth.simulations, '', '', ''])
    rows.push(['Croissance leads (%)', data.analytics.growth.leads, '', '', ''])
    if (data.analytics.averages.budgetMoyen) rows.push(['Budget moyen (€)', data.analytics.averages.budgetMoyen, '', '', ''])
    if (data.analytics.averages.apportMoyen) rows.push(['Apport moyen (€)', data.analytics.averages.apportMoyen, '', '', ''])
    if (data.analytics.averages.tauxEndettementMoyen) rows.push(['Endettement moyen (%)', data.analytics.averages.tauxEndettementMoyen, '', '', ''])
    if (data.analytics.averages.dureeMoyenne) rows.push(['Durée moyenne (ans)', data.analytics.averages.dureeMoyenne, '', '', ''])
    if (data.analytics.averages.typeBienTop) rows.push(['Type bien favori', data.analytics.averages.typeBienTop, '', '', ''])
    // Funnel
    if (data.analytics.funnel) {
      rows.push(['', '', '', '', ''])
      rows.push(['Parcours simulateur', 'Démarrés', 'Terminés', 'PDF', 'Complétion (%)'])
      rows.push(['Mode A', data.analytics.funnel.modeA.starts, data.analytics.funnel.modeA.completions, data.analytics.funnel.modeA.pdfDownloads, data.analytics.funnel.modeA.starts > 0 ? Math.round((data.analytics.funnel.modeA.completions / data.analytics.funnel.modeA.starts) * 100) : 0])
      rows.push(['Mode B', data.analytics.funnel.modeB.starts, data.analytics.funnel.modeB.completions, data.analytics.funnel.modeB.pdfDownloads, data.analytics.funnel.modeB.starts > 0 ? Math.round((data.analytics.funnel.modeB.completions / data.analytics.funnel.modeB.starts) * 100) : 0])
      rows.push(['Total', data.analytics.funnel.totalStarts, data.analytics.funnel.totalCompletions, data.analytics.funnel.totalPdfDownloads, data.analytics.funnel.totalStarts > 0 ? Math.round((data.analytics.funnel.totalCompletions / data.analytics.funnel.totalStarts) * 100) : 0])
    }
    // Sources leads
    const sources = Object.entries(data.leadsBySource)
    if (sources.length > 0) {
      rows.push(['', '', '', '', ''])
      rows.push(['Source', 'Nb leads', '', '', ''])
      for (const [src, count] of sources) rows.push([src, count, '', '', ''])
    }
    // Tool usage
    const tools = Object.entries(data.analytics.toolUsage).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    if (tools.length > 0) {
      rows.push(['', '', '', '', ''])
      rows.push(['Outil', 'Total', 'Semaine', '', ''])
      for (const [tool, total] of tools) rows.push([tool, total, data.analytics.toolUsageWeek[tool] ?? 0, '', ''])
    }
  }
  rows.push(['', '', '', '', ''])
  rows.push(['Date', 'Leads', 'Contacts', 'Rappels', ''])
  for (const day of data.timeline) {
    rows.push([day.date, day.leads, day.contacts, day.rappels, ''])
  }
  const csv = rows.map(r => r.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `aquiz-dashboard-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Unified feed item type */
interface FeedItem {
  id: string
  type: 'contact' | 'rappel' | 'lead'
  name: string
  detail: string
  tag: string
  tagStyle: string
  time: string
  color: string
  bgColor: string
  icon: typeof MessageSquare
}

// ── Page ──────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<Period>('30j')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard')
      if (!res.ok) return
      const json = (await res.json()) as DashboardData
      setData(json)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  const handleRefresh = () => { setRefreshing(true); load() }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-zinc-500">
        <Activity className="h-8 w-8 text-zinc-600" />
        <p className="text-sm">Impossible de charger les données</p>
        <button onClick={handleRefresh} className="text-xs text-emerald-500 hover:text-emerald-400">Réessayer</button>
      </div>
    )
  }

  const { kpis, leadsBySource, leadsByNiveau, timeline, recent, analytics } = data
  const isEmpty = kpis.contacts.total === 0 && kpis.leads.total === 0 && kpis.rappels.total === 0 && (analytics?.totalSimulations ?? 0) === 0
  const sourceData = Object.entries(leadsBySource).filter(([, v]) => v > 0).map(([k, v]) => ({ name: SOURCE_LABELS[k] ?? k, value: v }))
  const niveauData = (['hot', 'warm', 'cold'] as const).map(k => ({ name: k, value: leadsByNiveau[k] ?? 0, ...NIVEAU_CONFIG[k] }))
  const urgentCount = kpis.contacts.nouveaux + kpis.rappels.nouveaux
  const toolData = analytics
    ? Object.entries(analytics.toolUsage).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, name: TOOL_LABELS[k] ?? k, value: v, week: analytics.toolUsageWeek[k] ?? 0, color: TOOL_COLORS[k] ?? '#6b7280' }))
    : []
  const totalSims = analytics?.totalSimulations ?? 0
  const enoughSimData = totalSims >= 1
  const filteredTimeline = timeline.slice(period === '7j' ? -7 : -30)
  const last7 = timeline.slice(-7)
  const sparkLeads = last7.map(d => d.leads)
  const sparkContacts = last7.map(d => d.contacts)
  const hotWarm = (leadsByNiveau['hot'] ?? 0) + (leadsByNiveau['warm'] ?? 0)
  const leadQuality = kpis.leads.total > 0 ? Math.round((hotWarm / kpis.leads.total) * 100) : 0
  const newsletterRetention = kpis.newsletter.total > 0 ? Math.round((kpis.newsletter.active / kpis.newsletter.total) * 100) : 100

  // Unified activity feed — merge all recent, sort by date
  const feedItems: FeedItem[] = [
    ...recent.contacts.map((c): FeedItem => ({
      id: `c-${c.id}`, type: 'contact', name: c.nom, detail: c.email,
      tag: c.status, tagStyle: STATUS_PILL[c.status] ?? 'bg-zinc-800 text-zinc-500 border-zinc-700',
      time: c.createdAt, color: 'text-blue-400', bgColor: 'bg-blue-500/15', icon: MessageSquare,
    })),
    ...recent.rappels.map((r): FeedItem => ({
      id: `r-${r.id}`, type: 'rappel', name: r.prenom, detail: r.budget ? formatK(r.budget) : 'Rappel',
      tag: r.status, tagStyle: STATUS_PILL[r.status] ?? 'bg-zinc-800 text-zinc-500 border-zinc-700',
      time: r.createdAt, color: 'text-orange-400', bgColor: 'bg-orange-500/15', icon: Phone,
    })),
    ...recent.leads.map((l): FeedItem => {
      let niveau = 'non-qualifié'
      try { if (l.contexte) { niveau = ((JSON.parse(l.contexte) as Record<string, unknown>).niveau as string) ?? 'non-qualifié' } } catch { /* skip */ }
      return {
        id: `l-${l.id}`, type: 'lead', name: l.prenom || l.email, detail: SOURCE_LABELS[l.source] ?? l.source,
        tag: niveau, tagStyle: '',
        time: l.createdAt, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', icon: Users,
      }
    }),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return (
    <div className="space-y-4 pb-8">

      {/* ═══ HEADER ROW ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white tracking-tight">Dashboard</h1>
          {urgentCount > 0 && (
            <Link href="/admin/contacts" className="group flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 transition hover:bg-amber-500/20">
              <Zap className="h-3 w-3 text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-300">{urgentCount}</span>
              <span className="text-[11px] text-amber-500/70">en attente</span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-600">
              <Clock className="h-3 w-3" />
              {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => exportCSV(data)} className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300" title="Exporter CSV">
            <Download className="h-3 w-3" /><span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-40">
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* ═══ EMPTY STATE ═══ */}
      {isEmpty && (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
          <BarChart3 className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 font-medium mb-1">Aucune donnée pour le moment</p>
          <p className="text-[12px] text-zinc-600 max-w-md mx-auto">
            Partagez votre simulateur pour commencer à collecter des données.
          </p>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* ═══ SECTION 1 — KPIs compact strip ═══ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-800">
            {/* Leads — primary */}
            <Link href="/admin/leads" className="bg-zinc-900 px-4 py-3.5 hover:bg-zinc-900/60 transition group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Leads</span>
                <Sparkline data={sparkLeads} color="#10b981" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-400 tabular-nums">{kpis.leads.total}</span>
                {kpis.leads.today > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-500/80">+{kpis.leads.today} auj.</span>
                )}
                {analytics && analytics.growth.leads !== 0 && (
                  <span className={`text-[11px] font-semibold ${analytics.growth.leads > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {analytics.growth.leads > 0 ? '+' : ''}{analytics.growth.leads}%
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-600">{kpis.leads.week}/sem · {kpis.leads.month}/mois</span>
            </Link>
            {/* Contacts + Rappels */}
            <Link href="/admin/contacts" className="bg-zinc-900 px-4 py-3.5 hover:bg-zinc-900/60 transition group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Demandes</span>
                <Sparkline data={sparkContacts} color="#3b82f6" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tabular-nums">{kpis.contacts.total + kpis.rappels.total}</span>
                {(kpis.contacts.today + kpis.rappels.today) > 0 && (
                  <span className="text-[11px] font-semibold text-blue-400/80">+{kpis.contacts.today + kpis.rappels.today} auj.</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                <span className="text-blue-400/70">{kpis.contacts.total} contacts</span>
                <span className="text-zinc-800">·</span>
                <span className="text-orange-400/70">{kpis.rappels.total} rappels</span>
                <span className="text-zinc-800">·</span>
                <span>{kpis.contacts.week + kpis.rappels.week}/sem</span>
              </div>
            </Link>
            {/* Simulations */}
            <div className="bg-zinc-900 px-4 py-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Simulations</span>
                {analytics && analytics.growth.simulations !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${analytics.growth.simulations > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    <ArrowUp className={`h-2.5 w-2.5 ${analytics.growth.simulations < 0 ? 'rotate-180' : ''}`} />
                    {Math.abs(analytics?.growth.simulations ?? 0)}%
                  </span>
                )}
              </div>
              <span className="text-2xl font-bold text-cyan-400 tabular-nums">{totalSims}</span>
              <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                <span className="text-blue-400/70">A:{analytics?.simulationsModeA ?? 0}</span>
                <span className="text-purple-400/70">B:{analytics?.simulationsModeB ?? 0}</span>
                <span className="text-zinc-800">|</span>
                <span>{analytics?.simulationsWeek ?? 0}/sem</span>
              </div>
            </div>
            {/* Conversion — two rates */}
            <div className="bg-zinc-900 px-4 py-3.5">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Conversion</span>
              {(() => {
                const simToLead = analytics?.conversion.simToLead ?? 0
                const leadToContact = analytics?.conversion.leadToContact ?? 0
                const sims = analytics?.totalSimulations ?? 0
                const leads = kpis.leads.total
                const contacts = kpis.contacts.total
                return (
                  <div className="space-y-2.5">
                    {/* Sim → Lead */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-zinc-600">Simulation → Lead</span>
                        <span className="text-[12px] font-bold text-white tabular-nums">{enoughSimData ? `${displayConversion(simToLead, true)}%` : '—'}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500/70 transition-all" style={{ width: `${enoughSimData ? Math.min(simToLead, 100) : 0}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[9px] text-zinc-700 tabular-nums">{sims} sims</span>
                        <span className="text-[9px] text-zinc-700 tabular-nums">{leads} leads</span>
                      </div>
                    </div>
                    {/* Lead → Contact */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-zinc-600">Lead → Contact</span>
                        <span className="text-[12px] font-bold text-amber-400 tabular-nums">{leadToContact}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500/70 transition-all" style={{ width: `${Math.min(leadToContact, 100)}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[9px] text-zinc-700 tabular-nums">{leads} leads</span>
                        <span className="text-[9px] text-zinc-700 tabular-nums">{contacts} contacts</span>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* ═══ SECTION 2 — Chart + Funnel (one panel) ═══ */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
            {/* Chart header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-0">
              <div className="flex items-center gap-3">
                <h2 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Activité</h2>
                <div className="flex rounded-md border border-zinc-800 overflow-hidden">
                  {(['7j', '30j'] as const).map((p) => (
                    <button key={p} onClick={() => setPeriod(p)} className={`px-2 py-0.5 text-[11px] font-medium transition ${period === p ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Leads</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Contacts</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Rappels</span>
              </div>
            </div>
            {/* Chart */}
            <div className="h-52 sm:h-60 px-5 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredTimeline} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#3f3f46' }} tickFormatter={(v: string) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}` }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#3f3f46' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #27272a', borderRadius: 10, fontSize: 11 }} labelFormatter={(v) => new Date(String(v)).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} />
                  <Area type="monotone" dataKey="leads" stroke="#10b981" fill="url(#gL)" strokeWidth={2} name="Leads" />
                  <Area type="monotone" dataKey="contacts" stroke="#3b82f6" fill="url(#gC)" strokeWidth={1.5} name="Contacts" />
                  <Area type="monotone" dataKey="rappels" stroke="#f59e0b" fill="url(#gR)" strokeWidth={1.5} name="Rappels" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Horizontal funnel — inside the same panel */}
            {analytics && (
              <div className="border-t border-zinc-800/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-600 shrink-0 w-20">Conversion</span>
                  <div className="flex items-center gap-1.5 flex-1">
                    {/* Sims */}
                    <div className="flex items-center gap-1.5 rounded-md bg-cyan-500/8 border border-cyan-500/15 px-2.5 py-1.5">
                      <Calculator className="h-3 w-3 text-cyan-400" />
                      <span className="text-[12px] font-bold text-cyan-400 tabular-nums">{totalSims}</span>
                      <span className="text-[10px] text-cyan-400/50">sims</span>
                    </div>
                    <div className="flex items-center text-zinc-700">
                      <ChevronDown className="h-3 w-3 -rotate-90" />
                      <span className="text-[10px] tabular-nums mx-0.5">{enoughSimData ? `${Math.min(analytics.conversion.simToLead, 100)}%` : '<5'}</span>
                      <ChevronDown className="h-3 w-3 -rotate-90" />
                    </div>
                    {/* Leads */}
                    <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/8 border border-emerald-500/15 px-2.5 py-1.5">
                      <Users className="h-3 w-3 text-emerald-400" />
                      <span className="text-[12px] font-bold text-emerald-400 tabular-nums">{kpis.leads.total}</span>
                      <span className="text-[10px] text-emerald-400/50">leads</span>
                    </div>
                    <div className="flex items-center text-zinc-700">
                      <ChevronDown className="h-3 w-3 -rotate-90" />
                      <span className="text-[10px] tabular-nums mx-0.5">{analytics.conversion.leadToContact}%</span>
                      <ChevronDown className="h-3 w-3 -rotate-90" />
                    </div>
                    {/* Contacts */}
                    <div className="flex items-center gap-1.5 rounded-md bg-blue-500/8 border border-blue-500/15 px-2.5 py-1.5">
                      <MessageSquare className="h-3 w-3 text-blue-400" />
                      <span className="text-[12px] font-bold text-blue-400 tabular-nums">{kpis.contacts.total}</span>
                      <span className="text-[10px] text-blue-400/50">contacts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Simulator funnel — start → complete → PDF */}
            {analytics?.funnel && analytics.funnel.totalStarts > 0 && (() => {
              const f = analytics.funnel
              const completionRate = f.totalStarts > 0 ? Math.min(Math.round((f.totalCompletions / f.totalStarts) * 100), 100) : 0
              const pdfRate = f.totalCompletions > 0 ? Math.min(Math.round((f.totalPdfDownloads / f.totalCompletions) * 100), 100) : 0
              const abandonRate = f.totalStarts > 0 ? Math.max(100 - completionRate, 0) : 0
              return (
                <div className="border-t border-zinc-800/60 px-5 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Parcours simulateur</h3>
                    {abandonRate > 0 && (
                      <span className="text-[10px] text-red-400/60 font-medium">{abandonRate}% abandon</span>
                    )}
                  </div>

                  {/* Horizontal funnel — 3 steps with bars */}
                  <div className="space-y-3 mb-4">
                    {/* Step 1 → 2 : Démarrés → Terminés */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Play className="h-3 w-3 text-violet-400" />
                          <span className="text-[11px] text-zinc-400">Démarrés</span>
                          <span className="text-[11px] font-bold text-violet-400 tabular-nums">{f.totalStarts}</span>
                          <span className="text-zinc-700 text-[10px]">→</span>
                          <Calculator className="h-3 w-3 text-cyan-400" />
                          <span className="text-[11px] text-zinc-400">Terminés</span>
                          <span className="text-[11px] font-bold text-cyan-400 tabular-nums">{f.totalCompletions}</span>
                        </div>
                        <span className="text-[12px] font-bold text-white tabular-nums">{completionRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500/60 to-cyan-500/70 transition-all" style={{ width: `${completionRate}%` }} />
                      </div>
                    </div>

                    {/* Step 2 → 3 : Terminés → PDF */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-3 w-3 text-cyan-400" />
                          <span className="text-[11px] text-zinc-400">Terminés</span>
                          <span className="text-[11px] font-bold text-cyan-400 tabular-nums">{f.totalCompletions}</span>
                          <span className="text-zinc-700 text-[10px]">→</span>
                          <FileDown className="h-3 w-3 text-amber-400" />
                          <span className="text-[11px] text-zinc-400">PDF</span>
                          <span className="text-[11px] font-bold text-amber-400 tabular-nums">{f.totalPdfDownloads}</span>
                        </div>
                        <span className="text-[12px] font-bold text-white tabular-nums">{pdfRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 to-amber-500/70 transition-all" style={{ width: `${pdfRate}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Per-mode breakdown */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Mode A', sublabel: 'Capacité d\'achat', colorFrom: 'from-blue-500/50', colorTo: 'to-blue-400/70', text: 'text-blue-400', data: f.modeA },
                      { label: 'Mode B', sublabel: 'Faisabilité', colorFrom: 'from-purple-500/50', colorTo: 'to-purple-400/70', text: 'text-purple-400', data: f.modeB },
                    ].map(({ label, sublabel, colorFrom, colorTo, text, data }) => {
                      if (data.starts <= 0) return null
                      const rate = Math.min(Math.round((data.completions / data.starts) * 100), 100)
                      const pdfR = data.completions > 0 ? Math.min(Math.round((data.pdfDownloads / data.completions) * 100), 100) : 0
                      return (
                        <div key={label} className="rounded-lg bg-zinc-800/30 border border-zinc-800/50 px-3 py-2.5">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className={`text-[11px] font-semibold ${text}`}>{label}</span>
                              <span className="text-[9px] text-zinc-600 ml-1.5">{sublabel}</span>
                            </div>
                            <span className={`text-[11px] font-bold ${text} tabular-nums`}>{rate}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mb-2">
                            <div className={`h-full rounded-full bg-gradient-to-r ${colorFrom} ${colorTo} transition-all`} style={{ width: `${rate}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-600 tabular-nums">
                            <span>{data.starts} démarrés</span>
                            <span>{data.completions} terminés</span>
                            <span>{data.pdfDownloads} PDF{pdfR > 0 ? ` (${pdfR}%)` : ''}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* ═══ SECTION 3 — Analytics (one panel, internal grid) ═══ */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-zinc-800/60">
              <BarChart3 className="h-3.5 w-3.5 text-zinc-600" />
              <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Analytics &amp; Scoring</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60">

              {/* Col 1: Outils */}
              <div className="p-4">
                <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Outils</h3>
                {toolData.length > 0 ? (
                  <div className="space-y-2">
                    {toolData.slice(0, 5).map((t) => {
                      const maxVal = toolData[0]?.value ?? 1
                      return (
                        <div key={t.key}>
                          <div className="flex items-center justify-between text-[11px] mb-0.5">
                            <span className="text-zinc-400">{t.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-600 tabular-nums text-[10px]">{t.week}/sem</span>
                              <span className="text-zinc-500 tabular-nums font-medium">{t.value}</span>
                            </div>
                          </div>
                          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(t.value / maxVal) * 100}%`, background: t.color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-700 text-center py-4">—</p>
                )}
              </div>

              {/* Col 2: Sources */}
              <div className="p-4">
                <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Sources</h3>
                {sourceData.length > 0 ? (
                  <div className="flex gap-3">
                    <div className="h-[90px] w-[90px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sourceData} cx="50%" cy="50%" innerRadius={20} outerRadius={40} paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {sourceData.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5 flex-1 py-1">
                      {sourceData.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-1.5 text-[11px]">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                          <span className="flex-1 text-zinc-400 truncate">{s.name}</span>
                          <span className="text-zinc-500 tabular-nums">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-700 text-center py-4">—</p>
                )}
              </div>

              {/* Col 3: Scoring */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Scoring leads</h3>
                  {kpis.leads.total > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${leadQuality >= 50 ? 'bg-emerald-500/10 text-emerald-400' : leadQuality >= 25 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                      {leadQuality}% qualifié
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {niveauData.map((n) => {
                    const pct = kpis.leads.total > 0 ? (n.value / kpis.leads.total) * 100 : 0
                    const Icon = n.name === 'hot' ? Flame : n.name === 'warm' ? Sun : Snowflake
                    return (
                      <div key={n.name} className="rounded-lg p-2" style={{ background: n.bg }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: n.color }} />
                          <span className="text-[11px] font-semibold" style={{ color: n.color }}>{n.label}</span>
                          <span className="ml-auto text-[12px] font-bold tabular-nums" style={{ color: n.color }}>{n.value}</span>
                          <span className="text-[10px] text-zinc-600 tabular-nums">({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-1 rounded-full bg-zinc-800/60 overflow-hidden mb-1">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%`, background: n.color }} />
                        </div>
                        <p className="text-[9px] text-zinc-500 leading-tight">{n.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Col 4: Insights — 3 blocs distincts */}
              <div className="p-4 space-y-4">

                {/* ── Bloc 1 : Newsletter ── */}
                <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Mail className="h-3 w-3 text-purple-400" />
                    </div>
                    <h4 className="text-[10px] font-semibold text-purple-400/80 uppercase tracking-wider">Newsletter</h4>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[18px] font-bold text-purple-400 tabular-nums">{kpis.newsletter.active}</span>
                    <span className="text-[10px] text-zinc-500">abonnés actifs</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {kpis.newsletter.week > 0 && (
                      <span className="text-[10px] text-purple-400/60 bg-purple-500/10 px-1.5 py-0.5 rounded">+{kpis.newsletter.week}/sem</span>
                    )}
                    <span className="text-[10px] text-zinc-600">Rétention {newsletterRetention}%</span>
                  </div>
                </div>

                {/* ── Bloc 2 : Profil utilisateur moyen ── */}
                {analytics?.averages.budgetMoyen && (
                  <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/30 p-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Users className="h-3 w-3 text-emerald-400" />
                      </div>
                      <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Profil utilisateur moyen</h4>
                      {analytics.averages.simCount > 0 && (
                        <span className="ml-auto text-[9px] text-zinc-600">{analytics.averages.simCount} sim.</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <div>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Budget</p>
                        <p className="text-[14px] font-bold text-emerald-400 tabular-nums">{formatK(analytics.averages.budgetMoyen)}</p>
                      </div>
                      {analytics.averages.tauxEndettementMoyen && (
                        <div>
                          <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Endettement</p>
                          <p className="text-[14px] font-bold tabular-nums" style={{ color: analytics.averages.tauxEndettementMoyen > 33 ? '#ef4444' : analytics.averages.tauxEndettementMoyen > 28 ? '#f59e0b' : '#10b981' }}>
                            {analytics.averages.tauxEndettementMoyen}%
                          </p>
                        </div>
                      )}
                      {analytics.averages.dureeMoyenne && (
                        <div>
                          <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Durée</p>
                          <p className="text-[14px] font-bold text-cyan-400 tabular-nums">{analytics.averages.dureeMoyenne} ans</p>
                        </div>
                      )}
                      {analytics.averages.apportMoyen && (
                        <div>
                          <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Apport</p>
                          <p className="text-[14px] font-bold text-amber-400 tabular-nums">{formatK(analytics.averages.apportMoyen)}</p>
                        </div>
                      )}
                    </div>
                    {analytics.averages.typeBienTop && (
                      <div className="mt-2 pt-2 border-t border-zinc-700/30 flex items-center gap-1.5">
                        <Home className="h-3 w-3 text-zinc-600" />
                        <span className="text-[10px] text-zinc-500">Type privilégié :</span>
                        <span className="text-[10px] text-zinc-300 font-semibold capitalize">{analytics.averages.typeBienTop}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Bloc 3 : Communes les plus recherchées ── */}
                <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/30 p-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-emerald-400" />
                    </div>
                    <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Communes recherchées</h4>
                  </div>
                  {analytics && analytics.topCommunes.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-admin-sm">
                      {analytics.topCommunes.map((c, i) => (
                        <div key={c.commune} className="flex items-center gap-2 py-1 text-[11px]">
                          <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${i === 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                            {i + 1}
                          </span>
                          <span className="flex-1 text-zinc-400 truncate">{c.commune}</span>
                          <span className="text-zinc-600 tabular-nums text-[10px]">{c.count}×</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-700 text-center py-2">Aucune commune</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ SECTION 3b — Conversions RDV & Contact ═══ */}
          {(() => {
            const ctaData = analytics?.cta
            const total = ctaData?.total ?? 0
            const byType = ctaData?.byType ?? {}
            const byPosition = ctaData?.byPosition ?? {}
            const byPage = ctaData?.byPage ?? {}
            const weekByType = ctaData?.weekByType ?? {}
            const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1])
            const sortedPositions = Object.entries(byPosition).sort((a, b) => b[1] - a[1])
            const sortedPages = Object.entries(byPage).sort((a, b) => b[1] - a[1])
            const weekTotal = Object.values(weekByType).reduce((a, b) => a + b, 0)
            const topType = sortedTypes[0]
            const topPosition = sortedPositions[0]
            const topPage = sortedPages[0]

            const PAGE_LABELS: Record<string, string> = {
              '/simulateur/mode-a': 'Mode A',
              '/simulateur/mode-b': 'Mode B',
              '/aides': 'Aides',
              '/comparateur': 'Comparateur',
              '/carte': 'Carte',
              '/': 'Accueil',
              '/a-propos': 'À propos',
              '/contact': 'Contact',
              '/blog': 'Blog',
              '/simulateur': 'Simulateur',
            }
            const getPageLabel = (path: string) => PAGE_LABELS[path] ?? (path.replace(/^\//, '') || 'Accueil')

            return (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-emerald-500/70" />
                    <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Conversions RDV &amp; Contact</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {total > 0 ? (
                      <>
                        <span className="text-[10px] text-zinc-600">{weekTotal}/sem</span>
                        <span className="text-[12px] font-bold text-emerald-400 tabular-nums">{total} clics</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-zinc-600">En attente de données</span>
                    )}
                  </div>
                </div>
                {total > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60">
                    {/* Col 1: Par type de CTA */}
                    <div className="p-4">
                      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Type de CTA</h3>
                      <div className="space-y-2">
                        {sortedTypes.map(([type, count]) => {
                          const pct = total > 0 ? (count / total) * 100 : 0
                          const week = weekByType[type] ?? 0
                          return (
                            <div key={type}>
                              <div className="flex items-center justify-between text-[11px] mb-0.5">
                                <span className="text-zinc-400">{CTA_TYPE_LABELS[type] ?? type}</span>
                                <div className="flex items-center gap-1.5">
                                  {week > 0 && <span className="text-[10px] text-zinc-600">{week}/sem</span>}
                                  <span className="tabular-nums font-medium" style={{ color: CTA_TYPE_COLORS[type] ?? '#6b7280' }}>{count}</span>
                                  <span className="text-zinc-700 text-[10px]">({Math.round(pct)}%)</span>
                                </div>
                              </div>
                              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CTA_TYPE_COLORS[type] ?? '#6b7280' }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Col 2: Par position (emplacement du bouton) */}
                    <div className="p-4">
                      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Emplacement</h3>
                      <div className="space-y-1.5">
                        {sortedPositions.slice(0, 8).map(([pos, count]) => {
                          const pct = total > 0 ? (count / total) * 100 : 0
                          return (
                            <div key={pos} className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400 truncate flex-1">{CTA_POS_LABELS[pos] ?? pos}</span>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className="text-zinc-500 tabular-nums font-medium">{count}</span>
                                <div className="w-12 h-1 rounded-full bg-zinc-800 overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Col 3: Par page (URL visitée) */}
                    <div className="p-4">
                      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Page d&apos;origine</h3>
                      <div className="space-y-1.5">
                        {sortedPages.length > 0 ? sortedPages.slice(0, 8).map(([page, count]) => {
                          const pct = total > 0 ? (count / total) * 100 : 0
                          return (
                            <div key={page} className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400 truncate flex-1">{getPageLabel(page)}</span>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className="text-zinc-500 tabular-nums font-medium">{count}</span>
                                <div className="w-12 h-1 rounded-full bg-zinc-800 overflow-hidden">
                                  <div className="h-full rounded-full bg-violet-500/60" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </div>
                          )
                        }) : (
                          <p className="text-[10px] text-zinc-600">Données en cours de collecte</p>
                        )}
                      </div>
                    </div>

                    {/* Col 4: Insights */}
                    <div className="p-4">
                      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Insights</h3>
                      <div className="space-y-3">
                        {topType && (
                          <div className="rounded-lg p-2.5 bg-zinc-800/40">
                            <p className="text-[10px] text-zinc-600 mb-1">CTA le plus cliqué</p>
                            <p className="text-[12px] font-bold" style={{ color: CTA_TYPE_COLORS[topType[0]] ?? '#6b7280' }}>
                              {CTA_TYPE_LABELS[topType[0]] ?? topType[0]}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{topType[1]} clics · {Math.round((topType[1] / total) * 100)}% du total</p>
                          </div>
                        )}
                        {topPosition && (
                          <div className="rounded-lg p-2.5 bg-zinc-800/40">
                            <p className="text-[10px] text-zinc-600 mb-1">Meilleur emplacement</p>
                            <p className="text-[12px] font-bold text-emerald-400">
                              {CTA_POS_LABELS[topPosition[0]] ?? topPosition[0]}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{topPosition[1]} clics · {Math.round((topPosition[1] / total) * 100)}% du total</p>
                          </div>
                        )}
                        {topPage && (
                          <div className="rounded-lg p-2.5 bg-zinc-800/40">
                            <p className="text-[10px] text-zinc-600 mb-1">Page la plus convertissante</p>
                            <p className="text-[12px] font-bold text-violet-400">
                              {getPageLabel(topPage[0])}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{topPage[1]} clics · {Math.round((topPage[1] / total) * 100)}% du total</p>
                          </div>
                        )}
                        {kpis.rappels.total > 0 && total > 0 && (
                          <div className="rounded-lg p-2.5 bg-zinc-800/40">
                            <p className="text-[10px] text-zinc-600 mb-1">Taux conversion CTA → Rappel</p>
                            <p className="text-[12px] font-bold text-amber-400 tabular-nums">
                              {Math.round((kpis.rappels.total / total) * 100)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Phone className="h-6 w-6 text-zinc-700 mx-auto mb-2" />
                    <p className="text-[12px] text-zinc-500 font-medium mb-1">Aucun clic CTA enregistré</p>
                    <p className="text-[10px] text-zinc-600 leading-relaxed max-w-sm mx-auto">
                      Le tracking est actif sur les boutons Calendly, téléphone, modale contact et demande de rappel.
                      Les données apparaîtront ici dès les premiers clics visiteurs.
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                      {Object.entries(CTA_TYPE_LABELS).map(([key, label]) => (
                        <span key={key} className="text-[9px] px-2 py-0.5 rounded-full border border-zinc-800 text-zinc-600">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ═══ SECTION 4 — Activity feed (unified, one panel) ═══ */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60">
              <h2 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Activité récente</h2>
              <div className="flex items-center gap-2">
                <Link href="/admin/contacts" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition">Contacts →</Link>
                <Link href="/admin/leads" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition">Leads →</Link>
              </div>
            </div>
            {feedItems.length === 0 ? (
              <p className="text-center text-[11px] text-zinc-700 py-8">Aucune activité récente</p>
            ) : (
              <div className="divide-y divide-zinc-800/40">
                {feedItems.slice(0, 10).map((item) => {
                  const Icon = item.icon
                  const isLead = item.type === 'lead'
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-800/20 transition">
                      {/* Avatar */}
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.bgColor} ${item.color} text-[11px] font-bold`}>
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Type icon */}
                      <Icon className={`h-3 w-3 shrink-0 ${item.color} opacity-50`} />
                      {/* Name + detail */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-[12px] font-medium text-zinc-300 truncate">{item.name}</span>
                        <span className="text-[11px] text-zinc-600 truncate hidden sm:block">{item.detail}</span>
                      </div>
                      {/* Tag */}
                      {isLead ? (
                        <span className="inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize shrink-0" style={{ background: `${NIVEAU_COLORS[item.tag] ?? '#52525b'}15`, color: NIVEAU_COLORS[item.tag] ?? '#52525b', borderColor: `${NIVEAU_COLORS[item.tag] ?? '#52525b'}30` }}>
                          {item.tag}
                        </span>
                      ) : (
                        <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${item.tagStyle}`}>
                          {item.tag}
                        </span>
                      )}
                      {/* Time */}
                      <span className="text-[11px] text-zinc-700 tabular-nums shrink-0 w-10 text-right">{timeAgo(item.time)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
