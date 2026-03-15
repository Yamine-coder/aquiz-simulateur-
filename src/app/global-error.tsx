'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/**
 * global-error.tsx — Catch les erreurs que même le root layout ne rattrape pas.
 * Doit fournir ses propres <html> et <body> car le layout est inutilisable.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#1a1a1a', color: '#fff' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
              Erreur critique
            </h1>
            <p style={{ color: '#999', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              Une erreur inattendue est survenue. Essayez de recharger la page.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
