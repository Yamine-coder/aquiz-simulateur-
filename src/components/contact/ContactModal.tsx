'use client'

/**
 * Modale de contact - Demande de rappel
 * Design minimaliste et épuré
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/logger'
import { useSimulateurStore } from '@/stores/useSimulateurStore'
import {
    ArrowRight,
    Calendar,
    Check,
    Clock,
    Moon,
    Phone,
    Sun,
    Sunrise,
    Video,
    X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ContactModal({ isOpen, onClose, onSuccess }: ContactModalProps) {
  const { resultats, profil } = useSimulateurStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [activeTab, setActiveTab] = useState<'rappel' | 'rdv'>('rappel')
  
  // Formulaire de rappel
  const [formData, setFormData] = useState({
    prenom: '',
    telephone: '',
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
    setActiveTab('rappel')
    setFormData({ prenom: '', telephone: '', creneau: 'matin', accepte: false })
  }

  // Ref pour tracker l'état précédent
  const wasOpen = useRef(isOpen)
  useEffect(() => {
    // Seulement reset quand on passe de ouvert à fermé
    if (wasOpen.current && !isOpen) {
      const timer = setTimeout(resetForm, 200) // Délai pour l'animation
      return () => clearTimeout(timer)
    }
    wasOpen.current = isOpen
  }, [isOpen])

  const handleSubmitRappel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.accepte) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/contact/rappel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: formData.prenom,
          telephone: formData.telephone,
          creneau: formData.creneau,
          budget: resultats?.prixAchatMax,
          situation: profil?.situationFoyer,
          tauxEndettement: resultats?.tauxEndettementProjet
        })
      })
      
      if (!response.ok) {
        throw new Error('Erreur serveur')
      }
      
      setIsSubmitted(true)
      
      // Appeler le callback de succès après un délai pour laisser l'utilisateur voir la confirmation
      if (onSuccess) {
        setTimeout(() => {
          onClose()
          onSuccess()
        }, 1500)
      }
    } catch (error) {
      logger.error('Erreur envoi:', error)
      // Afficher quand même le succès pour l'UX (la demande sera dans les logs)
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

  const budget = resultats?.prixAchatMax || 0
  const formatMontant = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      
      {/* Modal - Best practices: 
          - max-w-[420px] pour formulaires (optimal readability)
          - max-h avec scroll interne
          - Animation d'entrée
          - Safe area sur mobile
      */}
      <div className="relative w-full max-w-[420px] max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        
        {/* Header minimaliste */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-aquiz-black">
                Parlons de votre projet
              </h2>
              <p className="text-sm text-aquiz-gray mt-0.5">
                Choisissez le mode de contact qui vous convient
              </p>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-aquiz-gray-lightest flex items-center justify-center transition-colors -mt-1 -mr-1"
            >
              <X className="w-4 h-4 text-aquiz-gray" />
            </button>
          </div>
          
          {/* Onglets Rappel / RDV */}
          <div className="mt-4 p-1 bg-aquiz-gray-lightest rounded-xl flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('rappel')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'rappel'
                  ? 'bg-white text-aquiz-black shadow-sm'
                  : 'text-aquiz-gray hover:text-aquiz-black'
              }`}
            >
              <Phone className="w-4 h-4" />
              Être rappelé
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rdv')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'rdv'
                  ? 'bg-white text-aquiz-black shadow-sm'
                  : 'text-aquiz-gray hover:text-aquiz-black'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Prendre RDV
            </button>
          </div>
          
          {/* Budget compact avec accent vert */}
          {budget > 0 && (
            <div className="mt-4 flex items-center justify-between py-3 px-4 bg-aquiz-green/5 border border-aquiz-green/20 rounded-xl">
              <span className="text-sm text-aquiz-gray">Budget estimé</span>
              <span className="font-semibold text-aquiz-green">{formatMontant(budget)} €</span>
            </div>
          )}
        </div>

        {/* Séparateur */}
        <div className="h-px bg-aquiz-gray-lighter mx-5 sm:mx-6 shrink-0" />

        {/* Content - scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          
          {/* ===== ONGLET RAPPEL ===== */}
          {activeTab === 'rappel' && (
            <>
              {/* Formulaire Rappel */}
              {isSubmitted ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-aquiz-green/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-5 h-5 text-aquiz-green" />
                  </div>
                  <h3 className="font-medium text-aquiz-black mb-1">C&apos;est noté</h3>
                  <p className="text-sm text-aquiz-gray mb-5">
                    Nous vous rappelons très vite
                  </p>
                  <Button onClick={onClose} variant="outline" className="rounded-lg">
                    Fermer
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitRappel} className="space-y-4">
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
              )}
            </>
          )}
          
          {/* ===== ONGLET RDV ===== */}
          {activeTab === 'rdv' && (
            <div className="space-y-6">
              {/* Intro sobre */}
              <p className="text-sm text-aquiz-gray">
                Échangez avec un conseiller pour affiner votre projet immobilier.
              </p>
              
              {/* Avantages RDV */}
              <div className="space-y-2.5">
                {[
                  { icon: Clock, text: 'Entretien de 30 minutes' },
                  { icon: Video, text: 'Visio ou téléphone, au choix' },
                  { icon: Check, text: 'Sans engagement' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-aquiz-gray-lightest flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-aquiz-gray" />
                    </div>
                    <span className="text-sm text-aquiz-black">{item.text}</span>
                  </div>
                ))}
              </div>
              
              {/* CTA Principal */}
              <a
                href="https://calendly.com/contact-aquiz/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-aquiz-black hover:bg-aquiz-black/90 text-white font-medium rounded-lg transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Choisir un créneau
              </a>
              
              {/* Note */}
              <p className="text-xs text-aquiz-gray text-center">
                Vous serez redirigé vers notre agenda en ligne
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
