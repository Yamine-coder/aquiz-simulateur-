'use client'

import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Error boundary pour les pages vitrine (accueil, services, contact, etc.)
 * Intégré dans le layout vitrine avec Navbar/Footer — fond clair cohérent.
 */
export default function VitrineError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AQUIZ Vitrine Error]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center">
        {/* Icône */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <h2 className="text-2xl font-bold text-aquiz-black mb-2">
          Erreur inattendue
        </h2>

        <p className="text-aquiz-gray text-sm mb-6 leading-relaxed">
          Un problème est survenu sur cette page.
          Veuillez réessayer ou revenir à l&apos;accueil.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-100 text-left">
            <p className="text-xs font-mono text-red-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-aquiz-black text-white font-medium text-sm hover:bg-aquiz-black-light transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-aquiz-black font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Accueil
          </a>
        </div>
      </div>
    </div>
  )
}
