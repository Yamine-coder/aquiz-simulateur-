'use client'

/**
 * LockedSection — Carte de conversion mid-scroll du comparateur
 * 
 * Affiche une carte CTA incitant à donner son email pour débloquer
 * les analyses (scores, risques, recommandations).
 * 
 * Disparaît automatiquement une fois débloqué (unlocked = true).
 * Canal de conversion : compact mid-scroll + StickyCtaBar + teasers inline
 */

import { Check, Clock, Send, Sparkles } from 'lucide-react'

interface LockedSectionProps {
  /** Callback pour ouvrir la modale email (funnel unique) */
  onOpenModal?: () => void
  /** Nombre d'éléments analysés mais cachés */
  nbInsightsBlocked?: number
  /** Sections déverrouillées après email */
  unlocked?: boolean
  /** Email envoyé — afficher confirmation */
  emailSent?: boolean
}

export function LockedSection({ onOpenModal, nbInsightsBlocked = 5, unlocked = false, emailSent = false }: LockedSectionProps) {
  if (unlocked) return null

  // Email sent: show confirmation banner instead of CTA
  if (emailSent) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-linear-to-r from-aquiz-green/5 via-white to-aquiz-green/5 border border-aquiz-green/20 shadow-sm">
        <div className="flex items-center gap-3 py-4 px-5 justify-center">
          <div className="w-8 h-8 rounded-lg bg-aquiz-green/15 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-aquiz-green" />
          </div>
          <div>
            <p className="text-sm font-semibold text-aquiz-green">
              ✓ Analyse complète envoyée par email
            </p>
            <p className="text-xs text-aquiz-gray mt-0.5">
              Consultez votre boîte mail pour découvrir tous les détails
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-linear-to-r from-aquiz-green/5 via-white to-aquiz-green/5 border border-aquiz-green/20 shadow-sm">
      <div className="flex flex-col md:flex-row items-center gap-4 py-5 px-5">
        {/* Gauche — value prop */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0 ring-2 ring-aquiz-green/10">
            <Sparkles className="w-5 h-5 text-aquiz-green" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-aquiz-black">
              {nbInsightsBlocked} analyses disponibles
            </p>
            <p className="text-xs text-aquiz-gray mt-0.5">
              Scores, risques & recommandations personnalisées pour chaque bien
            </p>
          </div>
        </div>

        {/* Droite — CTA */}
        <button
          onClick={onOpenModal}
          className="flex items-center gap-2 bg-aquiz-green hover:bg-aquiz-green/90 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-aquiz-green/20 cursor-pointer shrink-0 w-full md:w-auto justify-center"
        >
          <Send className="w-4 h-4" />
          Recevoir mon rapport gratuit
        </button>
      </div>

      {/* Urgence + micro trust */}
      <div className="border-t border-aquiz-green/10 py-2 px-5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[10px] text-aquiz-gray">
        <span className="flex items-center gap-1 text-aquiz-green font-medium">
          <Clock className="w-3 h-3" /> Données marché actualisées
        </span>
        <span className="hidden sm:inline text-aquiz-gray-lighter">·</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-aquiz-green" /> Gratuit
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-aquiz-green" /> Pas de spam
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-aquiz-green" /> 1 seul email
          </span>
        </div>
      </div>
    </div>
  )
}
