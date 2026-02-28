'use client'

import {
    AlertTriangle,
    Archive,
    ArrowLeft, ArrowRight,
    CheckCircle2,
    ChevronDown,
    Clock,
    Download,
    Eye,
    LogOut,
    Mail,
    MessageSquare,
    Moon,
    Phone,
    RefreshCw,
    Search,
    Send,
    Sun,
    Sunrise,
    Trash2,
    X,
    Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────

interface ContactRow {
  id: string
  nom: string
  email: string
  telephone: string
  message: string
  status: string
  emailSent: boolean
  ip: string
  createdAt: string
}

interface RappelRow {
  id: string
  prenom: string
  telephone: string
  creneau: string
  budget: number | null
  situation: string | null
  tauxEndettement: number | null
  status: string
  notes: string
  emailSent: boolean
  webhookSent: boolean
  ip: string
  createdAt: string
}

interface Stats {
  contacts: { total: number; nouveaux: number; aujourdhui: number }
  rappels: { total: number; nouveaux: number; aujourdhui: number }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ── Constants ─────────────────────────────────────────────

const CONTACT_STATUSES = ['nouveau', 'lu', 'traité', 'archivé'] as const
const RAPPEL_STATUSES = ['nouveau', 'rappelé', 'traité', 'archivé'] as const
const AUTO_REFRESH_INTERVAL = 30_000

const STATUS_COLORS: Record<string, string> = {
  nouveau: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  lu: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  rappelé: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  traité: 'bg-green-500/20 text-green-400 border-green-500/30',
  archivé: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

const STATUS_ICONS: Record<string, typeof Eye> = {
  nouveau: Clock,
  lu: Eye,
  rappelé: Phone,
  traité: CheckCircle2,
  archivé: Archive,
}

const CRENEAU_LABELS: Record<string, { label: string; icon: typeof Sun }> = {
  matin: { label: 'Matin (9h-12h)', icon: Sunrise },
  midi: { label: 'Après-midi (14h-17h)', icon: Sun },
  soir: { label: 'Soir (17h-20h)', icon: Moon },
}

// ── Helpers ───────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Il y a ${days}j`
  return formatDate(iso)
}

function formatBudget(n: number | null): string {
  if (n === null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function buildApiUrl(path: string, params: Record<string, string | number> = {}): string {
  const url = new URL(path, window.location.origin)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }
  return url.toString()
}

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

// ── Composants réutilisables ──────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string
  value: number
  sub?: string
  icon?: typeof Mail
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-5 transition-colors ${
      accent ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800 bg-zinc-900'
    }`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{label}</p>
        {Icon && <Icon size={16} className={accent ? 'text-green-400' : 'text-zinc-600'} />}
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status, onChange, options }: {
  status: string
  onChange: (s: string) => void
  options: readonly string[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const Icon = STATUS_ICONS[status]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${STATUS_COLORS[status] ?? ''}`}
      >
        {Icon && <Icon size={12} />}
        <span className="capitalize">{status}</span>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-35 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
          {options.map((s) => {
            const SIcon = STATUS_ICONS[s]
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false) }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-800 ${
                  s === status ? 'text-white font-medium' : 'text-zinc-400'
                }`}
              >
                {SIcon && <SIcon size={12} className={STATUS_COLORS[s]?.split(' ')[1] ?? ''} />}
                <span className="capitalize">{s}</span>
                {s === status && <CheckCircle2 size={10} className="ml-auto text-green-400" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PaginationControls({ pagination, onPageChange }: {
  pagination: Pagination
  onPageChange: (p: number) => void
}) {
  if (pagination.totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
      <span className="text-sm text-zinc-400">
        Page {pagination.page}/{pagination.totalPages} — {pagination.total} résultat{pagination.total > 1 ? 's' : ''}
      </span>
      <div className="flex gap-2">
        <button
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-amber-400" size={24} />
          <h3 className="text-lg font-semibold">Confirmation</h3>
        </div>
        <p className="text-sm text-zinc-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
            Annuler
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
        checked
          ? 'border-green-500 bg-green-500'
          : 'border-zinc-600 bg-zinc-800 hover:border-zinc-500'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 6l3 3 5-5" />
        </svg>
      )}
    </button>
  )
}

function FilterDropdown({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const Icon = value ? STATUS_ICONS[value] : null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
          value ? `${STATUS_COLORS[value]} border-current/30` : 'border-zinc-700 bg-zinc-900 text-zinc-400'
        }`}
      >
        {Icon && <Icon size={13} />}
        <span className="capitalize">{value || 'Tous statuts'}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-40 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-800 ${!value ? 'text-white font-medium' : 'text-zinc-400'}`}
          >
            Tous statuts
            {!value && <CheckCircle2 size={12} className="ml-auto text-green-400" />}
          </button>
          <div className="mx-2 my-1 border-t border-zinc-800" />
          {options.map((s) => {
            const SIcon = STATUS_ICONS[s]
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false) }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-800 ${s === value ? 'text-white font-medium' : 'text-zinc-400'}`}
              >
                {SIcon && <SIcon size={13} className={STATUS_COLORS[s]?.split(' ')[1] ?? ''} />}
                <span className="capitalize">{s}</span>
                {s === value && <CheckCircle2 size={12} className="ml-auto text-green-400" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Modale détail contact ─────────────────────────────────

function ContactDetailModal({ contact, onClose, onStatusChange }: {
  contact: ContactRow
  onClose: () => void
  onStatusChange: (status: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-detail-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 id="contact-detail-title" className="text-lg font-semibold flex items-center gap-2">
            <Mail size={18} className="text-green-400" />
            Message de {contact.nom}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-zinc-800" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Email</p>
              <a href={`mailto:${contact.email}`} className="text-green-400 hover:underline text-sm">{contact.email}</a>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Téléphone</p>
              <p className="text-sm">{contact.telephone || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Date</p>
              <p className="text-sm text-zinc-300">{formatDate(contact.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Statut</p>
              <StatusBadge status={contact.status} onChange={onStatusChange} options={CONTACT_STATUSES} />
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase mb-2">Message</p>
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-4">
              <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{contact.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2">
            {contact.emailSent && <span className="flex items-center gap-1 text-green-400"><CheckCircle2 size={12} /> Email envoyé</span>}
            {contact.ip && <span>IP : {contact.ip}</span>}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <a
            href={`mailto:${contact.email}?subject=Re: Votre demande AQUIZ`}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 flex items-center gap-2"
          >
            <Mail size={14} /> Répondre
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Modale détail rappel ──────────────────────────────────

function RappelDetailModal({ rappel, onClose, onStatusChange, onNotesChange }: {
  rappel: RappelRow
  onClose: () => void
  onStatusChange: (status: string) => void
  onNotesChange: (notes: string) => void
}) {
  const [notes, setNotes] = useState(rappel.notes)
  const [saving, setSaving] = useState(false)

  async function saveNotes() {
    setSaving(true)
    try {
      await fetch('/api/admin/rappels', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ id: rappel.id, notes }),
      })
      onNotesChange(notes)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rappel-detail-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 id="rappel-detail-title" className="text-lg font-semibold flex items-center gap-2">
            <Phone size={18} className="text-green-400" />
            Rappel — {rappel.prenom}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-zinc-800" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Téléphone</p>
              <a href={`tel:${rappel.telephone}`} className="text-green-400 hover:underline text-sm font-medium">{rappel.telephone}</a>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Créneau</p>
              <p className="text-sm flex items-center gap-1.5">
                {CRENEAU_LABELS[rappel.creneau] ? (
                  <>{(() => { const C = CRENEAU_LABELS[rappel.creneau].icon; return <C size={13} className="text-zinc-400" /> })()}{CRENEAU_LABELS[rappel.creneau].label}</>
                ) : rappel.creneau}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Budget</p>
              <p className="text-sm font-medium">{formatBudget(rappel.budget)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Taux endettement</p>
              <p className="text-sm">{rappel.tauxEndettement ? `${rappel.tauxEndettement}%` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Situation</p>
              <p className="text-sm text-zinc-300">{rappel.situation || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Statut</p>
              <StatusBadge status={rappel.status} onChange={onStatusChange} options={RAPPEL_STATUSES} />
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1">
              <MessageSquare size={12} /> Notes internes
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ajouter des notes sur ce rappel..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
            />
            {notes !== rappel.notes && (
              <button
                onClick={saveNotes}
                disabled={saving}
                className="mt-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Sauvegarder les notes'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2">
            <span>{formatDate(rappel.createdAt)}</span>
            {rappel.emailSent && <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={12} /> Email</span>}
            {rappel.webhookSent && <span className="text-blue-400 flex items-center gap-1"><CheckCircle2 size={12} /> Webhook</span>}
            {rappel.ip && <span>IP : {rappel.ip}</span>}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <a
            href={`tel:${rappel.telephone}`}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 flex items-center gap-2"
          >
            <Phone size={14} /> Appeler
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()

  // Data state
  const [tab, setTab] = useState<'contacts' | 'rappels'>('contacts')
  const [stats, setStats] = useState<Stats | null>(null)
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [rappels, setRappels] = useState<RappelRow[]>([])
  const [contactsPagination, setContactsPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [rappelsPagination, setRappelsPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)

  // UI state
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null)
  const [selectedRappel, setSelectedRappel] = useState<RappelRow | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmAction, setConfirmAction] = useState<{ message: string; action: () => void } | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const autoRefreshRef = useRef(autoRefresh)
  autoRefreshRef.current = autoRefresh

  // ── Data fetching ─────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/stats'))
      if (res.ok) setStats(await res.json())
    } catch { /* silent */ }
  }, [])

  const loadContacts = useCallback(async (page = 1) => {
    const params: Record<string, string | number> = { page }
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    const res = await fetch(buildApiUrl('/api/admin/contacts', params))
    if (res.ok) {
      const data = await res.json()
      setContacts(data.contacts)
      setContactsPagination(data.pagination)
    }
  }, [search, statusFilter])

  const loadRappels = useCallback(async (page = 1) => {
    const params: Record<string, string | number> = { page }
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    const res = await fetch(buildApiUrl('/api/admin/rappels', params))
    if (res.ok) {
      const data = await res.json()
      setRappels(data.rappels)
      setRappelsPagination(data.pagination)
    }
  }, [search, statusFilter])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadStats(), loadContacts(), loadRappels()]).finally(() => setLoading(false))
  }, [loadStats, loadContacts, loadRappels])

  useEffect(() => {
    if (tab === 'contacts') loadContacts()
    else loadRappels()
    setSelectedIds(new Set())
  }, [tab, search, statusFilter, loadContacts, loadRappels])

  useEffect(() => {
    const interval = setInterval(() => {
      if (autoRefreshRef.current) {
        loadStats()
        if (tab === 'contacts') loadContacts()
        else loadRappels()
      }
    }, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [tab, loadStats, loadContacts, loadRappels])

  // ── Actions ───────────────────────────────────────────
  async function updateContactStatus(id: string, status: string) {
    await fetch('/api/admin/contacts', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ id, status }),
    })
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
    if (selectedContact?.id === id) setSelectedContact((prev) => prev ? { ...prev, status } : null)
    loadStats()
  }

  async function updateRappelStatus(id: string, status: string) {
    await fetch('/api/admin/rappels', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ id, status }),
    })
    setRappels((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    if (selectedRappel?.id === id) setSelectedRappel((prev) => prev ? { ...prev, status } : null)
    loadStats()
  }

  function deleteSelected() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setConfirmAction({
      message: `Supprimer ${ids.length} élément${ids.length > 1 ? 's' : ''} définitivement ?`,
      action: async () => {
        const endpoint = tab === 'contacts' ? '/api/admin/contacts' : '/api/admin/rappels'
        await fetch(endpoint, { method: 'DELETE', headers: authHeaders(), body: JSON.stringify({ ids }) })
        setSelectedIds(new Set())
        if (tab === 'contacts') await loadContacts()
        else await loadRappels()
        loadStats()
        setConfirmAction(null)
      },
    })
  }

  function archiveSelected() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setConfirmAction({
      message: `Archiver ${ids.length} élément${ids.length > 1 ? 's' : ''} ?`,
      action: async () => {
        const endpoint = tab === 'contacts' ? '/api/admin/contacts' : '/api/admin/rappels'
        await Promise.all(ids.map((id) =>
          fetch(endpoint, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ id, status: 'archivé' }) })
        ))
        setSelectedIds(new Set())
        if (tab === 'contacts') await loadContacts()
        else await loadRappels()
        loadStats()
        setConfirmAction(null)
      },
    })
  }

  function refresh() {
    setLoading(true)
    Promise.all([loadStats(), loadContacts(), loadRappels()]).finally(() => setLoading(false))
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const currentIds = tab === 'contacts' ? contacts.map((c) => c.id) : rappels.map((r) => r.id)
    const allSel = currentIds.every((id) => selectedIds.has(id))
    setSelectedIds(allSel ? new Set() : new Set(currentIds))
  }

  const allSelected = useMemo(() => {
    const ids = tab === 'contacts' ? contacts.map((c) => c.id) : rappels.map((r) => r.id)
    return ids.length > 0 && ids.every((id) => selectedIds.has(id))
  }, [tab, contacts, rappels, selectedIds])

  async function exportCSV() {
    try {
      const res = await fetch(buildApiUrl('/api/admin/export', { type: tab }))
      if (!res.ok) throw new Error('Export échoué')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aquiz-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Erreur lors de l\'export CSV')
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  // ── Render ────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Modals */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onStatusChange={(s) => updateContactStatus(selectedContact.id, s)}
        />
      )}
      {selectedRappel && (
        <RappelDetailModal
          rappel={selectedRappel}
          onClose={() => setSelectedRappel(null)}
          onStatusChange={(s) => updateRappelStatus(selectedRappel.id, s)}
          onNotesChange={(notes) => {
            setRappels((prev) => prev.map((r) => r.id === selectedRappel.id ? { ...r, notes } : r))
            setSelectedRappel((prev) => prev ? { ...prev, notes } : null)
          }}
        />
      )}
      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={confirmAction.action}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-green-400">AQUIZ</span>
            <span className="text-zinc-600">|</span>
            <span>Admin</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Gestion des demandes et contacts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              autoRefresh ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400'
            }`}
            title={autoRefresh ? 'Auto-refresh actif (30s)' : 'Auto-refresh désactivé'}
          >
            <Clock size={12} /> Auto
          </button>
          <button onClick={refresh} disabled={loading} className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800" title={`Exporter ${tab} en CSV`}>
            <Download size={14} /><span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800" title="Déconnexion">
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-8">
          <StatCard label="Contacts" value={stats.contacts.total} icon={Mail} sub={`${stats.contacts.nouveaux} nouveau(x)`} />
          <StatCard label="Aujourd'hui" value={stats.contacts.aujourdhui} icon={Clock} />
          <StatCard label="Rappels" value={stats.rappels.total} icon={Phone} sub={`${stats.rappels.nouveaux} nouveau(x)`} />
          <StatCard label="Aujourd'hui" value={stats.rappels.aujourdhui} icon={Clock} />
          <StatCard label="Non traités" value={stats.contacts.nouveaux + stats.rappels.nouveaux} icon={AlertTriangle} accent={stats.contacts.nouveaux + stats.rappels.nouveaux > 0} />
          <StatCard label="Total" value={stats.contacts.total + stats.rappels.total} icon={CheckCircle2} />
        </div>
      )}

      {/* Tabs + Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 border border-zinc-800">
          <button
            onClick={() => { setTab('contacts'); setStatusFilter(''); setSelectedIds(new Set()) }}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'contacts' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mail size={14} /> Contacts
            {stats && stats.contacts.nouveaux > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
                {stats.contacts.nouveaux}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab('rappels'); setStatusFilter(''); setSelectedIds(new Set()) }}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'rappels' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Phone size={14} /> Rappels
            {stats && stats.rappels.nouveaux > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                {stats.rappels.nouveaux}
              </span>
            )}
          </button>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input
              type="search"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 w-48"
            />
          </div>
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={tab === 'contacts' ? CONTACT_STATUSES : RAPPEL_STATUSES}
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
          <span className="text-sm font-medium text-green-400">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={archiveSelected} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs hover:bg-zinc-800">
              <Archive size={12} /> Archiver
            </button>
            <button onClick={deleteSelected} className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20">
              <Trash2 size={12} /> Supprimer
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800">
              Désélectionner
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <RefreshCw className="animate-spin text-zinc-500" size={32} />
        </div>
      )}

      {/* Contacts Table */}
      {!loading && tab === 'contacts' && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-zinc-400 text-xs uppercase">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <Checkbox checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Nom</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Message</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-3 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {contacts.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">Aucun contact trouvé</td></tr>
                )}
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-zinc-900/50 cursor-pointer transition-colors ${c.status === 'nouveau' ? 'bg-blue-500/3' : ''}`}
                    onClick={() => { setSelectedContact(c); if (c.status === 'nouveau') updateContactStatus(c.id, 'lu') }}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                    </td>
                    <td className="px-3 py-3 text-zinc-400 whitespace-nowrap text-xs">{formatDateRelative(c.createdAt)}</td>
                    <td className="px-3 py-3 font-medium">
                      {c.nom}
                      {c.status === 'nouveau' && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />}
                    </td>
                    <td className="px-3 py-3"><span className="text-green-400 text-xs">{c.email}</span></td>
                    <td className="px-3 py-3 max-w-50 truncate text-zinc-400 text-xs">{c.message}</td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={c.status} onChange={(s) => updateContactStatus(c.id, s)} options={CONTACT_STATUSES} />
                    </td>
                    <td className="px-3 py-3">
                      {c.emailSent && <span title="Email envoyé"><Send size={13} className="text-green-400" /></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls pagination={contactsPagination} onPageChange={(p) => loadContacts(p)} />
        </div>
      )}

      {/* Rappels Table */}
      {!loading && tab === 'rappels' && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-zinc-400 text-xs uppercase">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <Checkbox checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Prénom</th>
                  <th className="px-3 py-3 font-medium">Téléphone</th>
                  <th className="px-3 py-3 font-medium">Créneau</th>
                  <th className="px-3 py-3 font-medium">Budget</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-3 py-3 font-medium">Notes</th>
                  <th className="px-3 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {rappels.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-500">Aucun rappel trouvé</td></tr>
                )}
                {rappels.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-zinc-900/50 cursor-pointer transition-colors ${r.status === 'nouveau' ? 'bg-orange-500/3' : ''}`}
                    onClick={() => setSelectedRappel(r)}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} />
                    </td>
                    <td className="px-3 py-3 text-zinc-400 whitespace-nowrap text-xs">{formatDateRelative(r.createdAt)}</td>
                    <td className="px-3 py-3 font-medium">
                      {r.prenom}
                      {r.status === 'nouveau' && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-orange-400 animate-pulse" />}
                    </td>
                    <td className="px-3 py-3">
                      <a href={`tel:${r.telephone}`} onClick={(e) => e.stopPropagation()} className="text-green-400 hover:underline text-xs">{r.telephone}</a>
                    </td>
                    <td className="px-3 py-3 text-zinc-300 text-xs">
                      <span className="flex items-center gap-1">
                        {CRENEAU_LABELS[r.creneau] ? (
                          <>{(() => { const C = CRENEAU_LABELS[r.creneau].icon; return <C size={11} className="text-zinc-500" /> })()}{CRENEAU_LABELS[r.creneau].label}</>
                        ) : r.creneau}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-zinc-300 text-xs">{formatBudget(r.budget)}</td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={r.status} onChange={(s) => updateRappelStatus(r.id, s)} options={RAPPEL_STATUSES} />
                    </td>
                    <td className="px-3 py-3 max-w-30 truncate text-zinc-500 text-xs">
                      {r.notes ? <span className="flex items-center gap-1"><MessageSquare size={10} /> {r.notes}</span> : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">
                      {r.emailSent && <span title="Email envoyé"><Send size={13} className="text-green-400" /></span>}
                      {r.webhookSent && <span title="Webhook envoyé"><Zap size={13} className="text-blue-400 ml-1" /></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls pagination={rappelsPagination} onPageChange={(p) => loadRappels(p)} />
        </div>
      )}
    </div>
  )
}
