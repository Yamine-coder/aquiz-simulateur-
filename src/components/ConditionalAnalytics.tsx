'use client'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useCallback, useEffect, useSyncExternalStore } from 'react'

const COOKIE_CONSENT_KEY = 'aquiz-cookie-consent'

/** Lit le consentement analytics depuis localStorage (snapshot pour useSyncExternalStore) */
function getAnalyticsConsent(): boolean {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) return false
    const prefs = JSON.parse(stored)
    return prefs.analytics === true
  } catch {
    return false
  }
}

/** Snapshot serveur — toujours false */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Charge Vercel Analytics uniquement si l'utilisateur a accepté les cookies analytics.
 * Écoute l'événement 'cookie-consent' pour activer en temps réel après acceptation.
 */
export function ConditionalAnalytics() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    // Écouter l'acceptation en temps réel
    window.addEventListener('cookie-consent', onStoreChange)
    return () => window.removeEventListener('cookie-consent', onStoreChange)
  }, [])

  const enabled = useSyncExternalStore(subscribe, getAnalyticsConsent, getServerSnapshot)

  // Re-check aussi au storage event (autre onglet)
  useEffect(() => {
    // no-op: déjà géré par useSyncExternalStore
  }, [])

  if (!enabled) return null

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
