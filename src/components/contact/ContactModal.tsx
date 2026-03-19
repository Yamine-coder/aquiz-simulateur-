'use client'

/**
 * Modale de contact - Demande de rappel ou RDV
 * Design minimaliste et épuré
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { trackEvent } from '@/lib/analytics'
import { logger } from '@/lib/logger'
import { useSimulateurStore } from '@/stores/useSimulateurStore'
import {
    ArrowRight,
    CalendarDays,
    Check,
    ChevronLeft,
    Moon,
    PhoneCall,
    Sun,
    Sunrise,
    X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ContactModalContextData {
  prixBien?: number
  localisation?: string
  typeBien?: string
  mensualite?: number
  honoraires?: number
}

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  commune?: string
  budgetOverride?: number
  /** Données Mode B — active l'écran de choix RDV / Rappel */
  contextData?: ContactModalContextData
}

export function ContactModal({ isOpen, onClose, onSuccess, commune, budgetOverride, contextData }: ContactModalProps) {
  const { resultats, profil } = useSimulateurStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const focusTrapRef = useFocusTrap(isOpen)

  // Étape : 'choice' si contextData fourni, sinon directement 'rappel'
  type ModalStep = 'choice' | 'rappel'
  const [step, setStep] = useState<ModalStep>(contextData ? 'choice' : 'rappel')
  
  // Formulaire
  const [formData, setFormData] = useState({
    prenom: '',
    telephone: '',
    email: '',
    creneau: 'matin',
    accepte: false
  })

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Reset à la fermeture - utiliser un callback pour éviter setState synchrone
  const resetForm = () => {
    setIsSubmitted(false)
    setStep(contextData ? 'choice' : 'rappel')
    setFormData({ prenom: '', telephone: '', email: '', creneau: 'matin', accepte: false })
  }

  // Track modal open
  const wasOpen = useRef(isOpen)
  useEffect(() => {
    if (!wasOpen.current && isOpen) {
      trackEvent('cta-click', { type: 'contact-modal', position: 'modal-open', page: window.location.pathname })
    }
    // Seulement reset quand on passe de ouvert à fermé
    if (wasOpen.current && !isOpen) {
      const timer = setTimeout(resetForm, 200) // Délai pour l'animation
      return () => clearTimeout(timer)
    }
    wasOpen.current = isOpen
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.accepte) return
    
    setIsSubmitting(true)
    
    // Budget : priorité contextData Mode B, puis budgetOverride, puis Mode A
    const budgetToSend = contextData?.prixBien ?? budgetOverride ?? resultats?.prixAchatMax

    try {
      const response = await fetch('/api/contact/rappel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rappel',
          prenom: formData.prenom,
          telephone: formData.telephone,
          creneau: formData.creneau,
          budget: budgetToSend,
          localisation: contextData?.localisation ?? commune,
          mensualite: contextData?.mensualite,
          situation: profil?.situationFoyer,
          tauxEndettement: resultats?.tauxEndettementProjet
        })
      })
      
      if (!response.ok) {
        throw new Error('Erreur serveur')
      }

      // Dual-write : persister comme lead si email fourni
      if (formData.email) {
        fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            prenom: formData.prenom,
            source: contextData ? 'simulateur-b' : 'simulateur-a',
            contexte: {
              type: 'rappel',
              telephone: formData.telephone,
              budget: budgetToSend,
              localisation: contextData?.localisation ?? commune,
              mensualite: contextData?.mensualite,
              situation: profil?.situationFoyer,
            },
          }),
        }).catch(() => { /* fire-and-forget */ })
      }
      
      setIsSubmitted(true)
      
      if (onSuccess) {
        setTimeout(() => {
          onClose()
          onSuccess()
        }, 1500)
      }
    } catch (error) {
      logger.error('Erreur envoi:', error)
      setIsSubmitted(true)
      if (onSuccess) {
        setTimeout(() => {
          onClose()
          onSuccess()
        }, 1500)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const budget = contextData?.prixBien ?? budgetOverride ?? resultats?.prixAchatMax ?? 0
  const budgetLabel = contextData?.prixBien ? 'Prix du bien' : budgetOverride !== undefined ? 'Budget carte' : 'Budget estimé'
  const localisation = contextData?.localisation ?? commune
  const formatMontant = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

  // Titre header dynamique selon étape
  const headerTitle = localisation
    ? (step === 'choice' ? `Votre projet à ${localisation}` : `Être rappelé — ${localisation}`)
    : (step === 'rappel' ? 'Être rappelé' : 'Parlons de votre projet')

  const headerSubtitle = step === 'choice'
    ? 'Comment souhaitez-vous être accompagné ?'
    : localisation
    ? `Un conseiller vous rappelle pour votre projet sur ${localisation}.`
    : 'Renseignez vos coordonnées, un conseiller vous rappelle.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="relative w-full max-w-[420px] max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200"
      >
        
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {/* Bouton retour visible uniquement dans les étapes rdv/rappel quand contextData */}
              {contextData && step === 'rappel' && !isSubmitted && (
                <button
                  onClick={() => setStep('choice')}
                  aria-label="Retour au choix"
                  className="w-7 h-7 rounded-full hover:bg-aquiz-gray-lightest flex items-center justify-center transition-colors shrink-0 -ml-1"
                >
                  <ChevronLeft className="w-4 h-4 text-aquiz-gray" />
                </button>
              )}
              <div>
                <h2 id="contact-modal-title" className="text-lg font-semibold text-aquiz-black">
                  {headerTitle}
                </h2>
                <p className="text-sm text-aquiz-gray mt-0.5">
                  {headerSubtitle}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              aria-label="Fermer la modale"
              className="w-8 h-8 rounded-full hover:bg-aquiz-gray-lightest flex items-center justify-center transition-colors -mt-1 -mr-1 shrink-0"
            >
              <X className="w-4 h-4 text-aquiz-gray" />
            </button>
          </div>
          
          {/* Badge budget — affiché sur l'écran de choix et sous-étapes */}
          {budget > 0 && (
            <div className="mt-4 flex items-center justify-between py-3 px-4 bg-aquiz-green/5 border border-aquiz-green/20 rounded-xl">
              <span className="text-sm text-aquiz-gray">{budgetLabel}</span>
              <span className="font-semibold text-aquiz-green">{formatMontant(budget)} €</span>
            </div>
          )}
          {/* Mensualité (Mode B uniquement) */}
          {contextData?.mensualite && contextData.mensualite > 0 && (
            <div className="mt-2 flex items-center justify-between py-2 px-4 bg-aquiz-gray-lightest/50 border border-aquiz-gray-lighter rounded-xl">
              <span className="text-sm text-aquiz-gray">Mensualité estimée</span>
              <span className="font-medium text-aquiz-black">{formatMontant(contextData.mensualite)} €/mois</span>
            </div>
          )}
        </div>

        {/* Séparateur */}
        <div className="h-px bg-aquiz-gray-lighter mx-5 sm:mx-6 shrink-0" />

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">

          {/* ── Écran de choix ── */}
          {step === 'choice' && (
            <div className="grid grid-cols-2 gap-3">
              <a
                href="https://calendly.com/contact-aquiz/30min"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('cta-click', { type: 'calendly', position: 'contact-modal-rdv', page: window.location.pathname })}
                className="group p-5 rounded-xl border-2 border-aquiz-gray-lighter hover:border-aquiz-green hover:bg-aquiz-green/5 text-center flex flex-col items-center gap-2.5 transition-all duration-150"
              >
                <CalendarDays className="w-7 h-7 text-aquiz-green group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-aquiz-black text-sm">Prendre RDV</span>
                <span className="text-[11px] text-aquiz-gray leading-tight">Choisissez un créneau avec un conseiller</span>
              </a>
              <button
                onClick={() => setStep('rappel')}
                className="group p-5 rounded-xl border-2 border-aquiz-gray-lighter hover:border-aquiz-black/40 hover:bg-aquiz-black/5 text-center flex flex-col items-center gap-2.5 transition-all duration-150"
              >
                <PhoneCall className="w-7 h-7 text-aquiz-black group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-aquiz-black text-sm">Être rappelé</span>
                <span className="text-[11px] text-aquiz-gray leading-tight">Indiquez quand nous pouvons vous joindre</span>
              </button>
            </div>
          )}

          {/* ── Formulaire Rappel ── */}
          {step === 'rappel' && (
            isSubmitted ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-aquiz-green/10 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-5 h-5 text-aquiz-green" />
                </div>
                <h3 className="font-medium text-aquiz-black mb-1">C&apos;est noté</h3>
                <p className="text-sm text-aquiz-gray mb-5">Nous vous rappelons très vite</p>
                <Button onClick={onClose} variant="outline" className="rounded-lg">
                  Fermer
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="prenom" className="text-xs font-medium text-aquiz-gray uppercase tracking-wide">
                      Prénom
                    </Label>
                    <Input
                      id="prenom"
                      type="text"
                      placeholder="Jean"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      required
                      className="mt-1.5 h-10 rounded-lg border-aquiz-gray-lighter bg-aquiz-gray-lightest/30 focus:bg-white focus:border-aquiz-green focus:ring-1 focus:ring-aquiz-green/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telephone" className="text-xs font-medium text-aquiz-gray uppercase tracking-wide">
                      Téléphone
                    </Label>
                    <Input
                      id="telephone"
                      type="tel"
                      placeholder="06 12 34 56 78"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      required
                      className="mt-1.5 h-10 rounded-lg border-aquiz-gray-lighter bg-aquiz-gray-lightest/30 focus:bg-white focus:border-aquiz-green focus:ring-1 focus:ring-aquiz-green/20"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email-contact" className="text-xs font-medium text-aquiz-gray uppercase tracking-wide">
                    Email <span className="text-aquiz-gray-light font-normal normal-case">(optionnel — pour recevoir un récapitulatif)</span>
                  </Label>
                  <Input
                    id="email-contact"
                    type="email"
                    placeholder="jean@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1.5 h-10 rounded-lg border-aquiz-gray-lighter bg-aquiz-gray-lightest/30 focus:bg-white focus:border-aquiz-green focus:ring-1 focus:ring-aquiz-green/20"
                  />
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-aquiz-gray uppercase tracking-wide">
                    Créneau préféré
                  </Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {[
                      { value: 'matin', label: 'Matin', sublabel: '9h-12h', Icon: Sunrise },
                      { value: 'midi', label: 'Après-midi', sublabel: '14h-17h', Icon: Sun },
                      { value: 'soir', label: 'Soir', sublabel: '17h-20h', Icon: Moon }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, creneau: option.value })}
                        className={`p-3 rounded-lg border transition-all text-center ${
                          formData.creneau === option.value
                            ? 'border-aquiz-green bg-aquiz-green text-white'
                            : 'border-aquiz-gray-lighter bg-aquiz-gray-lightest/30 hover:border-aquiz-green/40'
                        }`}
                      >
                        <option.Icon className={`w-4 h-4 mx-auto mb-1 ${
                          formData.creneau === option.value ? 'text-white' : 'text-aquiz-gray'
                        }`} />
                        <p className={`text-xs font-medium ${
                          formData.creneau === option.value ? 'text-white' : 'text-aquiz-black'
                        }`}>{option.label}</p>
                        <p className={`text-[10px] ${
                          formData.creneau === option.value ? 'text-white/70' : 'text-aquiz-gray'
                        }`}>{option.sublabel}</p>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="accepte"
                    checked={formData.accepte}
                    onChange={(e) => setFormData({ ...formData, accepte: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded border-aquiz-gray-lighter checked:bg-aquiz-green checked:border-aquiz-green focus:ring-aquiz-green/30"
                    style={{ accentColor: '#6fcf97' }}
                  />
                  <label htmlFor="accepte" className="text-xs text-aquiz-gray leading-relaxed">
                    J&apos;accepte d&apos;être recontacté par un conseiller
                  </label>
                </div>
                
                <Button
                  type="submit"
                  disabled={!formData.accepte || isSubmitting}
                  className="w-full h-11 bg-aquiz-green hover:bg-aquiz-green/90 text-white font-medium rounded-lg disabled:opacity-40 disabled:bg-aquiz-gray"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Envoi...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Envoyer ma demande
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  )
}
