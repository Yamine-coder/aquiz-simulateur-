import * as Sentry from '@sentry/nextjs'

/**
 * Vérifie si l'utilisateur a donné son consentement pour les cookies analytics.
 * Sentry (replays, traces) est considéré comme un traceur au sens CNIL.
 */
function hasAnalyticsConsent(): boolean {
  try {
    const stored = localStorage.getItem('aquiz-cookie-consent')
    if (!stored) return false
    return JSON.parse(stored).analytics === true
  } catch {
    return false
  }
}

const consentGiven = typeof window !== 'undefined' && hasAnalyticsConsent()

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Traces et replays uniquement avec consentement
  tracesSampleRate: consentGiven
    ? (process.env.NODE_ENV === 'production' ? 0.2 : 1.0)
    : 0,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: consentGiven ? 1.0 : 0,

  // Désactiver en dev si pas de DSN
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // Sans consentement : capturer les erreurs (intérêt légitime) mais sans replay ni traces
  // Avec consentement : fonctionnalité complète

  // Filtrer le bruit
  ignoreErrors: [
    // Erreurs réseau bénignes
    'ResizeObserver loop',
    'Non-Error promise rejection',
    'AbortError',
    'NetworkError',
    'Load failed',
    'Failed to fetch',
    // Extensions navigateur
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
  ],

  integrations: consentGiven
    ? [
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ]
    : [],
})
