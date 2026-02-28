'use client'

import { AnnonceCard } from '@/components/comparateur'
import { useComparateurStore } from '@/stores/useComparateurStore'
import { ArrowLeft, Heart, Plus, Scale } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'

export default function FavorisPage() {
  const annonces = useComparateurStore((s) => s.annonces)
  const toggleFavori = useComparateurStore((s) => s.toggleFavori)
  const hydrated = useComparateurStore((s) => s.annonces !== undefined)

  const favoris = useMemo(
    () => annonces.filter((a) => a.favori),
    [annonces]
  )

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-aquiz-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="border-b border-aquiz-gray-lighter bg-linear-to-b from-rose-50/60 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link
            href="/comparateur"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-aquiz-gray hover:text-aquiz-black transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Comparateur</span>
            <span className="sm:hidden">Retour</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-aquiz-black">
                Mes favoris
              </h1>
              <p className="text-xs text-aquiz-gray mt-0.5">
                {favoris.length === 0
                  ? 'Aucun favori pour le moment'
                  : `${favoris.length} bien${favoris.length > 1 ? 's' : ''} enregistré${favoris.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {favoris.length === 0 ? (
          /* ─── État vide ─── */
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-rose-300" />
            </div>
            <h2 className="text-lg font-bold text-aquiz-black mb-2">
              Pas encore de favoris
            </h2>
            <p className="text-sm text-aquiz-gray max-w-sm mx-auto mb-6">
              Ajoutez des biens dans le comparateur et cliquez sur le cœur pour
              les retrouver ici.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/comparateur"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-aquiz-green text-white text-sm font-semibold hover:bg-aquiz-green-dark transition-colors"
              >
                <Scale className="w-4 h-4" />
                Aller au comparateur
              </Link>
              <Link
                href="/simulateur/mode-a"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-aquiz-gray-lighter text-aquiz-gray-dark text-sm font-medium hover:bg-aquiz-gray-lightest transition-colors"
              >
                <Plus className="w-4 h-4" />
                Faire une simulation
              </Link>
            </div>
          </div>
        ) : (
          /* ─── Grille de favoris ─── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoris.map((annonce) => (
              <AnnonceCard
                key={annonce.id}
                annonce={annonce}
                onToggleFavori={() => toggleFavori(annonce.id)}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
