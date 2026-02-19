'use client'

import { Cookie, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const COOKIE_CONSENT_KEY = 'aquiz-cookie-consent'
const COOKIE_CONSENT_VERSION = '1' // Incrémenter si la politique change

interface CookiePreferences {
  necessary: true // Toujours actifs
  analytics: boolean
  version: string
  date: string
}

/**
 * Bandeau de consentement cookies conforme RGPD / CNIL.
 *
 * - S'affiche au premier chargement
 * - 3 choix : Tout accepter, Tout refuser, Personnaliser (futur)
 * - Stocke le consentement en localStorage
 * - Le consentement est vérifié au chargement pour ne pas re-afficher
 */
export function CookieConsent() {
  /** 'loading' → en cours de vérification, 'banner' → bandeau affiché, 'icon' → petit bouton flottant */
  const [state, setState] = useState<'loading' | 'banner' | 'icon'>('loading')
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
      if (stored) {
        const prefs: CookiePreferences = JSON.parse(stored)
        if (prefs.version === COOKIE_CONSENT_VERSION) {
          // Consentement déjà donné → afficher seulement l'icône
          setState('icon')
          return
        }
      }
    } catch {
      // localStorage indisponible ou données corrompues
    }
    // Premier visit → afficher le bandeau après un court délai
    const timer = setTimeout(() => setState('banner'), 1500)
    return () => clearTimeout(timer)
  }, [])

  const savePreferences = useCallback((analytics: boolean) => {
    const prefs: CookiePreferences = {
      necessary: true,
      analytics,
      version: COOKIE_CONSENT_VERSION,
      date: new Date().toISOString(),
    }
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs))
    } catch {
      // Silencieux si storage indisponible
    }

    if (analytics && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookie-consent', { detail: { analytics: true } }))
    }

    setState('icon')
  }, [])

  const acceptAll = useCallback(() => savePreferences(true), [savePreferences])
  const refuseAll = useCallback(() => savePreferences(false), [savePreferences])
  const reopenBanner = useCallback(() => {
    setShowDetails(false)
    setState('banner')
  }, [])

  // Rien pendant le chargement initial
  if (state === 'loading') return null

  // ─── Petit bouton flottant (après consentement) ───
  if (state === 'icon') {
    return (
      <button
        onClick={reopenBanner}
        className="fixed bottom-4 left-4 z-[9998] w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/10 shadow-lg shadow-black/20 flex items-center justify-center hover:bg-[#2d2d2d] hover:scale-110 transition-all duration-200 cursor-pointer group"
        aria-label="Paramètres des cookies"
        title="Gérer les cookies"
      >
        <Cookie className="w-4 h-4 text-white/50 group-hover:text-[#22c55e] transition-colors" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-2xl mx-auto bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* ─── Contenu principal ─── */}
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex w-10 h-10 rounded-full bg-[#22c55e]/10 items-center justify-center shrink-0 mt-0.5">
              <Cookie className="w-5 h-5 text-[#22c55e]" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1.5">
                Nous respectons votre vie privée
              </h3>
              <p className="text-xs text-white/50 leading-relaxed">
                AQUIZ utilise des cookies strictement nécessaires au fonctionnement du site.
                Nous utilisons également des cookies d&apos;analyse anonymes pour améliorer
                votre expérience.{' '}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-[#22c55e] hover:underline cursor-pointer"
                >
                  {showDetails ? 'Masquer les détails' : 'En savoir plus'}
                </button>
              </p>

              {/* ─── Détails expandables ─── */}
              {showDetails && (
                <div className="mt-3 space-y-2.5 text-xs text-white/40">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5">
                    <div className="w-2 h-2 rounded-full bg-[#22c55e] shrink-0" />
                    <div className="flex-1">
                      <span className="text-white/70 font-medium">Cookies nécessaires</span>
                      <p className="mt-0.5">Fonctionnement du site, sauvegarde locale de vos simulations. Toujours actifs.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5">
                    <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <div className="flex-1">
                      <span className="text-white/70 font-medium">Cookies d&apos;analyse</span>
                      <p className="mt-0.5">Statistiques anonymes de fréquentation (Vercel Analytics). Aucune donnée personnelle transmise à des tiers.</p>
                    </div>
                  </div>
                  <p className="pt-1">
                    Consultez notre{' '}
                    <a href="/mentions-legales#confidentialite" className="text-[#22c55e] hover:underline">
                      politique de confidentialité
                    </a>{' '}
                    pour plus d&apos;informations.
                  </p>
                </div>
              )}
            </div>

            {/* Close button (mobile) */}
            <button
              onClick={refuseAll}
              className="sm:hidden text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Actions ─── */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pb-5 sm:pb-6">
          <button
            onClick={refuseAll}
            className="flex-1 sm:flex-none px-4 py-2 rounded-full border border-white/15 text-white/70 text-xs font-medium hover:bg-white/5 transition-colors cursor-pointer"
          >
            Refuser
          </button>
          <button
            onClick={acceptAll}
            className="flex-1 sm:flex-none px-5 py-2 rounded-full bg-[#22c55e] text-[#1a1a1a] text-xs font-semibold hover:bg-[#16a34a] transition-colors cursor-pointer"
          >
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Helper pour vérifier le consentement analytics côté client
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) return false
    const prefs: CookiePreferences = JSON.parse(stored)
    return prefs.analytics && prefs.version === COOKIE_CONSENT_VERSION
  } catch {
    return false
  }
}
