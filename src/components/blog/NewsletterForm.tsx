'use client'

import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { useRef, useState } from 'react'

type NewsletterSource = 'blog' | 'article' | 'homepage'
type FormStatus = 'idle' | 'loading' | 'success' | 'error'

interface NewsletterFormProps {
  /** Source d'inscription pour tracking */
  source?: NewsletterSource
  /** Variante d'affichage */
  variant?: 'inline' | 'compact'
  /** Classe CSS additionnelle */
  className?: string
}

/**
 * Formulaire newsletter réutilisable
 * - Validation email côté client
 * - Appel API /api/newsletter
 * - Feedback visuel (succès, erreur, loading)
 */
export default function NewsletterForm({
  source = 'blog',
  variant = 'inline',
  className = '',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isValidEmail) {
      setStatus('error')
      setErrorMsg('Veuillez entrer un email valide.')
      inputRef.current?.focus()
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), source }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Une erreur est survenue.')
        return
      }

      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
      setErrorMsg('Erreur réseau. Vérifiez votre connexion.')
    }
  }

  // Succès — message de confirmation
  if (status === 'success') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="w-9 h-9 rounded-full bg-aquiz-green/10 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4.5 h-4.5 text-aquiz-green" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-gray-900">Inscription confirmée !</p>
          <p className="text-[11px] text-gray-400">Vous recevrez nos prochains articles par email.</p>
        </div>
      </div>
    )
  }

  // Compact — pour les articles (input + bouton sur une ligne)
  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className={className}>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
              placeholder="votre@email.com"
              disabled={status === 'loading'}
              className="w-full sm:w-48 pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-[12px] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green/30 transition-all disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-4 py-2.5 rounded-xl bg-gray-950 text-white text-[12px] font-bold hover:bg-aquiz-green active:scale-[0.98] transition-all shrink-0 disabled:opacity-50 flex items-center gap-1.5"
          >
            {status === 'loading' ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi…</>
            ) : (
              "S'abonner"
            )}
          </button>
        </div>
        {status === 'error' && (
          <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errorMsg}
          </p>
        )}
      </form>
    )
  }

  // Inline — pour la page blog (input + bouton côte à côte avec icône)
  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
            placeholder="votre@email.com"
            disabled={status === 'loading'}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-[13px] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green/30 transition-all duration-300 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-2.5 rounded-xl bg-gray-950 text-white text-[13px] font-bold hover:bg-aquiz-green active:scale-[0.98] transition-all duration-300 shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {status === 'loading' ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi…</>
          ) : (
            "S'abonner"
          )}
        </button>
      </div>
      {status === 'error' && (
        <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {errorMsg}
        </p>
      )}
    </form>
  )
}
