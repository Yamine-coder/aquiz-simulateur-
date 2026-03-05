'use client'

/**
 * MissingDataBanner — Bandeau incitant à compléter les données manquantes.
 * Affiche un compteur global et un bouton pour ouvrir le drawer de saisie rapide.
 */

import type { Annonce } from '@/types/annonces'
import { AlertCircle, ChevronRight, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CompleteDonneesDrawer } from './CompleteDonneesDrawer'
import { countMissingFields } from './EditableCell'

interface MissingDataBannerProps {
  annonces: Annonce[]
}

export function MissingDataBanner({ annonces }: MissingDataBannerProps) {
  const [drawerAnnonceId, setDrawerAnnonceId] = useState<string | null>(null)

  const missingCounts = useMemo(
    () => annonces.map((a) => ({ id: a.id, ville: a.ville, count: countMissingFields(a) })),
    [annonces],
  )

  const totalMissing = missingCounts.reduce((s, c) => s + c.count, 0)

  if (totalMissing === 0) return null

  const drawerAnnonce = annonces.find((a) => a.id === drawerAnnonceId) ?? null

  return (
    <>
      <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{totalMissing} donnée{totalMissing > 1 ? 's' : ''} manquante{totalMissing > 1 ? 's' : ''}</strong>
            {' '}— complétez-les pour un score de comparaison plus précis.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {missingCounts
            .filter((c) => c.count > 0)
            .map((c) => (
              <button
                key={c.id}
                onClick={() => setDrawerAnnonceId(c.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all group"
              >
                <Pencil className="w-3 h-3" />
                <span className="truncate max-w-24">{c.ville}</span>
                <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {c.count}
                </span>
                <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
        </div>
      </div>

      {/* Drawer de saisie rapide */}
      <CompleteDonneesDrawer
        annonce={drawerAnnonce}
        open={drawerAnnonceId !== null}
        onClose={() => setDrawerAnnonceId(null)}
      />
    </>
  )
}
