'use client'

/**
 * Barre CTA sticky en bas de page — Bonus email
 * Propose d'envoyer la comparaison par email (pas de gate, juste un bonus).
 * Se rétracte si on remonte. Inspirée de Hosman / MeilleursAgents.
 */

import { Mail, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface StickyCtaBarProps {
  /** Callback principal */
  onRequestHelp?: () => void
  /** Seuil en px depuis le haut pour déclencher l'apparition */
  triggerRef?: React.RefObject<HTMLElement | null>
}

export function StickyCtaBar({ onRequestHelp, triggerRef }: StickyCtaBarProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (dismissed) return

    const handleScroll = () => {
      if (triggerRef?.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        // Montrer quand le trigger entre dans le viewport
        setVisible(rect.top < window.innerHeight * 0.7)
      } else {
        // Fallback: apparaître après 60% du scroll de la page
        const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight)
        setVisible(scrollPercent > 0.5)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial
    return () => window.removeEventListener('scroll', handleScroll)
  }, [triggerRef, dismissed])

  if (dismissed || !visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 transform transition-transform duration-300 ease-out">
      <div className="bg-white/95 backdrop-blur-sm border-t border-aquiz-gray-lighter shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Message */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-aquiz-green/10 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-aquiz-green" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-aquiz-black truncate">
                Gardez cette comparaison
              </div>
              <div className="text-[10px] text-aquiz-gray hidden sm:block">
                Recevez le rapport complet avec scores et recommandations
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={onRequestHelp}
            className="flex items-center gap-2 bg-aquiz-green hover:bg-aquiz-green/90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-aquiz-green/20 shrink-0"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Recevoir par email</span>
            <span className="sm:hidden">Par email</span>
          </button>

          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className="text-aquiz-gray-light hover:text-aquiz-gray text-xs shrink-0 p-1"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
