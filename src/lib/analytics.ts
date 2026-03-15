/**
 * Envoie un événement analytics au serveur (fire-and-forget).
 * Données anonymes — pas de PII.
 */
export function trackEvent(event: string, data?: Record<string, unknown>): void {
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, data }),
  }).catch(() => {
    // Silently fail — analytics should never break UX
  })
}
