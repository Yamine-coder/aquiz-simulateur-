'use client'

import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Global error boundary — s'affiche quand une erreur non attrapée survient.
 * Stylé sur la charte AQUIZ (noir + vert).
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
    <body className="antialiased">
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icône */}
        <div className="mx-auto w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Oups, quelque chose a planté
        </h1>

        {/* Description */}
        <p className="text-white/50 text-sm mb-8 leading-relaxed">
          Une erreur inattendue est survenue. Pas de panique, vos données de simulation
          sont sauvegardées localement. Essayez de recharger la page.
        </p>

        {/* Détails techniques (dev only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 p-3 rounded-lg bg-white/5 border border-white/10 text-left">
            <p className="text-xs font-mono text-red-400 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-white/30 mt-1">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#22c55e] text-[#1a1a1a] font-semibold text-sm hover:bg-[#16a34a] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white font-medium text-sm hover:bg-white/5 transition-colors"
          >
            <Home className="w-4 h-4" />
            Retour à l&apos;accueil
          </a>
        </div>

        {/* Branding */}
        <p className="mt-10 text-xs text-white/20">
          AQUIZ — Conseil en acquisition immobilière
        </p>
      </div>
    </div>
    </body>
    </html>
  )
}
