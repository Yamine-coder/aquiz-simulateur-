'use client'

/**
 * LeadCaptureGate — Composant réutilisable de capture email
 * 
 * Peut être utilisé sur n'importe quelle page pour capturer un lead.
 * Variantes: inline (intégré dans le flux) ou card (bloc autonome).
 * Pas de logique PDF — juste capture email + prénom optionnel.
 */

import { Check, Loader2, Mail, Send, User } from 'lucide-react'
import { useCallback, useState } from 'react'

type LeadSource = 'comparateur' | 'simulateur-a' | 'simulateur-b' | 'carte' | 'aides'

interface LeadCaptureGateProps {
  /** Titre affiché */
  titre: string
  /** Description sous le titre */
  description: string
  /** Source du lead */
  source: LeadSource
  /** Contexte JSON libre */
  contexte?: Record<string, unknown>
  /** Variante d'affichage */
  variant?: 'card' | 'inline' | 'banner'
  /** Couleur d'accent (green par défaut) */
  accent?: 'green' | 'blue'
  /** Texte du bouton */
  buttonText?: string
  /** Texte après succès */
  successText?: string
  /** Callback appelé après capture réussie */
  onSuccess?: (data: { email: string; prenom?: string }) => void
  /** Contenu visible seulement après capture (children) */
  children?: React.ReactNode
}

export function LeadCaptureGate({
  titre,
  description,
  source,
  contexte,
  variant = 'card',
  accent = 'green',
  buttonText = 'Recevoir par email',
  successText = 'C\'est envoyé !',
  onSuccess,
  children,
}: LeadCaptureGateProps) {
  const [email, setEmail] = useState('')
  const [prenom, setPrenom] = useState('')
  const [loading, setLoading] = useState(false)
  const [captured, setCaptured] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accentColor = accent === 'green' ? 'aquiz-green' : 'blue-600'

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@') || loading) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          prenom: prenom || undefined,
          source,
          contexte,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      setCaptured(true)
      onSuccess?.({ email, prenom: prenom || undefined })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }, [email, prenom, loading, source, contexte, onSuccess])

  // === Captured state: show success + children ===
  if (captured) {
    return (
      <div className={variant === 'banner' ? '' : 'space-y-4'}>
        <div className={`
          flex items-center gap-3 rounded-xl p-4
          ${variant === 'banner' ? 'bg-aquiz-green/5 border border-aquiz-green/20' : 'bg-aquiz-green/5 border border-aquiz-green/20'}
        `}>
          <div className="w-9 h-9 rounded-lg bg-aquiz-green/10 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-aquiz-green" />
          </div>
          <div>
            <p className="text-sm font-semibold text-aquiz-black">{successText}</p>
            <p className="text-xs text-aquiz-gray">Vérifiez votre boîte mail — pensez aux spams</p>
          </div>
        </div>
        {children}
      </div>
    )
  }

  // === Banner variant: compact inline bar ===
  if (variant === 'banner') {
    return (
      <div className={`rounded-xl border border-${accentColor}/20 bg-${accentColor}/5 p-4`}>
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-aquiz-black">{titre}</p>
            <p className="text-xs text-aquiz-gray mt-0.5">{description}</p>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 w-full">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemple.com"
                required
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-aquiz-gray-lighter rounded-lg focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-aquiz-green hover:bg-aquiz-green/90 disabled:opacity-60 text-white font-semibold rounded-lg text-sm whitespace-nowrap transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : buttonText}
            </button>
          </form>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    )
  }

  // === Inline variant: lightweight form ===
  if (variant === 'inline') {
    return (
      <div className="rounded-xl border border-aquiz-gray-lighter bg-white p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-aquiz-green" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-aquiz-black">{titre}</h4>
            <p className="text-xs text-aquiz-gray mt-0.5">{description}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <div className="relative w-2/5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light" />
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Prénom"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-aquiz-gray-lighter rounded-lg focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green bg-white"
              />
            </div>
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
                required
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-aquiz-gray-lighter rounded-lg focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green bg-white"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-aquiz-green hover:bg-aquiz-green/90 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Envoi…' : buttonText}
          </button>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </form>
        <p className="text-[10px] text-aquiz-gray text-center mt-2">Gratuit · Pas de spam</p>
      </div>
    )
  }

  // === Card variant (default): prominent standalone block ===
  return (
    <div className="relative overflow-hidden rounded-2xl border border-aquiz-green/20 bg-linear-to-br from-aquiz-green/5 via-white to-aquiz-green/10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-aquiz-green/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-aquiz-green/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="relative p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-aquiz-green/10 flex items-center justify-center mx-auto mb-4 ring-4 ring-aquiz-green/5">
          <Mail className="w-7 h-7 text-aquiz-green" />
        </div>
        <h3 className="text-lg font-bold text-aquiz-black mb-1">{titre}</h3>
        <p className="text-sm text-aquiz-gray mb-5 max-w-md mx-auto">{description}</p>

        <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-2">
          <div className="flex gap-2">
            <div className="relative w-2/5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light" />
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Prénom"
                className="w-full pl-10 pr-3 py-3 text-sm border border-aquiz-gray-lighter rounded-xl focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green bg-white"
              />
            </div>
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
                required
                className="w-full pl-10 pr-4 py-3 text-sm border border-aquiz-gray-lighter rounded-xl focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green bg-white"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-aquiz-green hover:bg-aquiz-green/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-md shadow-aquiz-green/20 transition-all hover:shadow-lg hover:shadow-aquiz-green/30"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? 'Envoi…' : buttonText}
          </button>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </form>

        <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-aquiz-gray">
          <span>Gratuit</span>
          <span className="text-aquiz-gray-lighter">·</span>
          <span>Pas de spam</span>
          <span className="text-aquiz-gray-lighter">·</span>
          <span>Données sécurisées</span>
        </div>
      </div>
    </div>
  )
}
