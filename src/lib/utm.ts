/**
 * Capture et persiste les paramètres UTM + referrer.
 * Stocké en sessionStorage pour survivre aux navigations internes.
 */

const UTM_KEY = 'aquiz-utm'

interface UtmData {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  referrer?: string
}

/** Capture les UTM depuis l'URL courante (appeler au mount de l'app). */
export function captureUtm(): void {
  // Ne pas écraser si déjà capturé dans cette session
  if (typeof window === 'undefined') return
  if (sessionStorage.getItem(UTM_KEY)) return

  const params = new URLSearchParams(window.location.search)
  const data: UtmData = {}

  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const) {
    const val = params.get(key)
    if (val) data[key] = val.slice(0, 100)
  }

  if (document.referrer && !document.referrer.includes(window.location.hostname)) {
    try {
      data.referrer = new URL(document.referrer).hostname
    } catch { /* invalid referrer */ }
  }

  if (Object.keys(data).length > 0) {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(data))
  }
}

/** Retourne les UTM capturés pour injection dans le contexte Lead. */
export function getUtmData(): UtmData | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(UTM_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UtmData
  } catch {
    return null
  }
}
