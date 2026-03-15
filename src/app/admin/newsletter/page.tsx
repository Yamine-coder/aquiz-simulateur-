'use client'

import {
    ArrowLeft,
    ArrowRight,
    Download,
    Mail,
    Search,
    Trash2,
    UserMinus,
    UserPlus,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// ── Types ─────────────────────────────────────────────────

interface SubscriberRow {
  id: string
  email: string
  status: string
  source: string
  ip: string
  subscribedAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ── Constantes ────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  blog: 'Blog',
  article: 'Article',
  homepage: 'Accueil',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  unsubscribed: 'bg-zinc-700/50 text-zinc-400',
}

// ── Page ──────────────────────────────────────────────────

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const fetchSubscribers = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/admin/newsletter?${params}`)
      if (!res.ok) return
      const data = (await res.json()) as { subscribers: SubscriberRow[]; pagination: Pagination }
      setSubscribers(data.subscribers)
      setPagination(data.pagination)
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { fetchSubscribers() }, [fetchSubscribers])

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'unsubscribed' : 'active'
    await fetch('/api/admin/newsletter', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
    fetchSubscribers(pagination.page)
  }

  const handleDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Supprimer ${selected.size} abonné(s) ?`)) return
    await fetch('/api/admin/newsletter', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    fetchSubscribers(pagination.page)
  }

  const handleExport = () => {
    const BOM = '\uFEFF'
    const headers = ['Email', 'Statut', 'Source', 'Date']
    const rows = subscribers.map((s) => [s.email, s.status, SOURCE_LABELS[s.source] ?? s.source, new Date(s.subscribedAt).toLocaleDateString('fr-FR')])
    const csv = BOM + [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleAll = () => {
    if (selected.size === subscribers.length) setSelected(new Set())
    else setSelected(new Set(subscribers.map((s) => s.id)))
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Newsletter</h1>
            <p className="text-xs text-zinc-500">{pagination.total} abonné{pagination.total > 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer ({selected.size})
            </button>
          )}
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher par email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 focus:border-purple-500/50 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="unsubscribed">Désabonnés</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs text-zinc-500">
              <th className="px-4 py-3">
                <input type="checkbox" checked={selected.size === subscribers.length && subscribers.length > 0} onChange={toggleAll} className="rounded border-zinc-600 accent-purple-500" />
              </th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="py-12 text-center text-zinc-600">Chargement…</td></tr>
            )}
            {!loading && subscribers.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-zinc-600">Aucun abonné trouvé</td></tr>
            )}
            {!loading && subscribers.map((sub) => (
              <tr key={sub.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(sub.id)} onChange={() => toggleOne(sub.id)} className="rounded border-zinc-600 accent-purple-500" />
                </td>
                <td className="px-4 py-3 font-medium">{sub.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[sub.status] ?? 'bg-zinc-700/50 text-zinc-400'}`}>
                    {sub.status === 'active' ? 'Actif' : 'Désabonné'}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {SOURCE_LABELS[sub.source] ?? sub.source}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {new Date(sub.subscribedAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(sub.id, sub.status)}
                    title={sub.status === 'active' ? 'Désabonner' : 'Réactiver'}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                  >
                    {sub.status === 'active' ? <UserMinus className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Page {pagination.page} / {pagination.totalPages} ({pagination.total} résultats)
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchSubscribers(pagination.page - 1)}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Précédent
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchSubscribers(pagination.page + 1)}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
            >
              Suivant <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
