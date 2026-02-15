'use client'

import { CheckCircle, Loader2, Mail, MessageSquare, Phone, Send, User } from 'lucide-react'
import { useCallback, useState } from 'react'

interface FormData {
  nom: string
  email: string
  telephone: string
  message: string
}

interface FormErrors {
  nom?: string
  email?: string
  telephone?: string
  message?: string
}

/**
 * Formulaire de contact AQUIZ — clean & minimal.
 * Inputs aérés, validation live, transitions douces.
 */
export function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    email: '',
    telephone: '',
    message: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [consent, setConsent] = useState(false)

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide'
    }

    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Le téléphone est requis'
    } else if (!/^[\d\s+\-.()]{8,}$/.test(formData.telephone)) {
      newErrors.telephone = 'Numéro invalide'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Le message est requis'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validate() || !consent) return

      setStatus('sending')

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, rgpdConsent: consent }),
        })

        if (res.ok) {
          setStatus('success')
          setFormData({ nom: '', email: '', telephone: '', message: '' })
          setConsent(false)
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    },
    [formData, consent, validate]
  )

  const handleChange = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }))
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    },
    [errors]
  )

  if (status === 'success') {
    return (
      <div className="text-center py-10">
        <div className="w-14 h-14 rounded-full bg-aquiz-green/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-aquiz-green" />
        </div>
        <h3 className="text-lg font-bold text-aquiz-black mb-1">Message envoyé !</h3>
        <p className="text-sm text-aquiz-gray mb-5">
          Notre équipe vous recontactera sous 24h.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="text-sm font-medium text-aquiz-green hover:underline underline-offset-4"
        >
          Envoyer un autre message
        </button>
      </div>
    )
  }

  const inputBase =
    'w-full h-11 pl-10 pr-4 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-4'
  const inputNormal =
    'border-aquiz-gray-lighter bg-white focus:border-aquiz-green focus:ring-aquiz-green/10'
  const inputError =
    'border-red-300 focus:border-red-400 focus:ring-red-100'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nom + Email côte à côte */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nom" className="block text-xs font-medium text-aquiz-gray mb-1.5">
            Nom complet
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light pointer-events-none" />
            <input
              id="nom"
              type="text"
              value={formData.nom}
              onChange={handleChange('nom')}
              placeholder="Jean Dupont"
              className={`${inputBase} ${errors.nom ? inputError : inputNormal}`}
            />
          </div>
          {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-medium text-aquiz-gray mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light pointer-events-none" />
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="jean@email.com"
              className={`${inputBase} ${errors.email ? inputError : inputNormal}`}
            />
          </div>
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
      </div>

      {/* Téléphone */}
      <div>
        <label htmlFor="telephone" className="block text-xs font-medium text-aquiz-gray mb-1.5">
          Téléphone
        </label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light pointer-events-none" />
          <input
            id="telephone"
            type="tel"
            value={formData.telephone}
            onChange={handleChange('telephone')}
            placeholder="06 12 34 56 78"
            className={`${inputBase} ${errors.telephone ? inputError : inputNormal}`}
          />
        </div>
        {errors.telephone && <p className="text-xs text-red-500 mt-1">{errors.telephone}</p>}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-xs font-medium text-aquiz-gray mb-1.5">
          Votre message
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-aquiz-gray-light pointer-events-none" />
          <textarea
            id="message"
            value={formData.message}
            onChange={handleChange('message')}
            placeholder="Décrivez votre projet immobilier..."
            rows={3}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm resize-none transition-all duration-200 focus:outline-none focus:ring-4 ${
              errors.message ? inputError : inputNormal
            }`}
          />
        </div>
        {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
      </div>

      {/* RGPD */}
      <label htmlFor="consent" className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-4.5 h-4.5 rounded border-2 border-aquiz-gray-lighter bg-white peer-checked:bg-aquiz-green peer-checked:border-aquiz-green transition-all duration-200 flex items-center justify-center group-hover:border-aquiz-gray-light">
            {consent && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-xs text-aquiz-gray-light leading-relaxed">
          J&apos;accepte que mes données soient traitées pour répondre à ma demande.
        </span>
      </label>

      {/* Erreur */}
      {status === 'error' && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          Une erreur est survenue. Réessayez ou appelez-nous directement.
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'sending' || !consent}
        className="group w-full flex items-center justify-center gap-2.5 h-12 bg-aquiz-green text-white font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:brightness-110 hover:shadow-lg hover:shadow-aquiz-green/25"
      >
        {status === 'sending' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            Envoyer le message
          </>
        )}
      </button>
    </form>
  )
}
