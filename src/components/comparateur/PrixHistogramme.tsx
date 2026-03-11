'use client'

/**
 * PrixHistogramme — Mini histogramme DVF contextuel
 * 
 * Affiche la distribution des prix du marché (DVF)
 * avec la position du bien pour contextualiser le prix
 */

import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface PrixHistogrammeProps {
  /** Prix au m² de l'annonce */
  prixM2Annonce: number
  /** Médiane prix/m² du marché DVF */
  prixM2Median: number
  /** Ecart en % vs marché (négatif = moins cher) */
  ecartPourcent: number
  /** Verdict textuel */
  verdict?: 'excellent' | 'bon' | 'correct' | 'cher' | 'tres_cher'
  /** Classe CSS */
  className?: string
  /** Taille compacte */
  compact?: boolean
}

/** Génère des "barres" de distribution simulées à partir de la médiane */
function genererDistribution(median: number, nbBars: number = 15): number[] {
  const bars: number[] = []
  // Distribution gaussienne centrée sur la médiane
  const sigma = median * 0.25 // 25% d'écart-type
  for (let i = 0; i < nbBars; i++) {
    const x = median - sigma * 2 + (sigma * 4 * i) / (nbBars - 1)
    // Gaussienne
    const y = Math.exp(-0.5 * ((x - median) / sigma) ** 2)
    bars.push(y)
  }
  // Normaliser 0-1
  const max = Math.max(...bars)
  return bars.map(b => b / max)
}

/** Couleur du verdict */
function getVerdictConfig(verdict?: string): { color: string; bg: string; label: string; emoji: string } {
  switch (verdict) {
    case 'excellent': return { color: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Excellente affaire', emoji: '🎯' }
    case 'bon': return { color: 'text-green-600', bg: 'bg-green-500', label: 'Bon prix', emoji: '✓' }
    case 'correct': return { color: 'text-amber-600', bg: 'bg-amber-500', label: 'Prix marché', emoji: '→' }
    case 'cher': return { color: 'text-orange-600', bg: 'bg-orange-500', label: 'Au-dessus du marché', emoji: '↑' }
    case 'tres_cher': return { color: 'text-red-600', bg: 'bg-red-500', label: 'Surévalué', emoji: '⚠' }
    default: return { color: 'text-slate-500', bg: 'bg-slate-400', label: 'Prix moyen', emoji: '→' }
  }
}

export function PrixHistogramme({
  prixM2Annonce,
  prixM2Median,
  ecartPourcent,
  verdict,
  className,
  compact = false,
}: PrixHistogrammeProps) {
  const bars = useMemo(() => genererDistribution(prixM2Median), [prixM2Median])
  const config = getVerdictConfig(verdict)

  // Position de l'annonce dans l'histogramme (0-100%)
  const sigma = prixM2Median * 0.25
  const min = prixM2Median - sigma * 2
  const max = prixM2Median + sigma * 2
  const positionPct = Math.max(0, Math.min(100, ((prixM2Annonce - min) / (max - min)) * 100))

  if (compact) {
    return (
      <div className={cn('', className)}>
        {/* Barre de position */}
        <div className="relative h-2 bg-gradient-to-r from-emerald-200 via-amber-200 to-red-200 rounded-full overflow-hidden">
          <div
            className={cn('absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm', config.bg)}
            style={{ left: `${positionPct}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
        <div className="flex justify-between mt-0.5 text-[9px] text-aquiz-gray">
          <span>− cher</span>
          <span className={cn('font-semibold', config.color)}>
            {ecartPourcent > 0 ? '+' : ''}{ecartPourcent.toFixed(0)}% vs marché
          </span>
          <span>+ cher</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 p-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-aquiz-black">Prix vs Marché</span>
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', 
          verdict === 'excellent' || verdict === 'bon' ? 'bg-emerald-50 text-emerald-600' :
          verdict === 'correct' ? 'bg-amber-50 text-amber-600' :
          'bg-red-50 text-red-600'
        )}>
          {config.emoji} {config.label}
        </span>
      </div>

      {/* Histogramme */}
      <div className="relative h-12 flex items-end gap-px mb-1">
        {bars.map((height, i) => {
          const barPctLeft = (i / (bars.length - 1)) * 100
          const isNearAnnonce = Math.abs(barPctLeft - positionPct) < (100 / bars.length)
          return (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-t-sm transition-colors',
                isNearAnnonce ? config.bg : 'bg-slate-200'
              )}
              style={{ height: `${Math.max(8, height * 100)}%` }}
            />
          )
        })}
        {/* Marker de l'annonce */}
        <div
          className="absolute bottom-0 w-0.5 bg-aquiz-black z-10"
          style={{ left: `${positionPct}%`, height: '120%' }}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-[9px] font-bold text-aquiz-black bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200">
              {prixM2Annonce.toLocaleString('fr-FR')} €/m²
            </span>
          </div>
        </div>
        {/* Marker médiane */}
        <div
          className="absolute bottom-0 w-px bg-slate-400 z-[5] border-dashed"
          style={{ left: '50%', height: '100%' }}
        />
      </div>

      {/* Légende */}
      <div className="flex justify-between text-[9px] text-aquiz-gray">
        <span>{(prixM2Median * 0.5).toLocaleString('fr-FR')} €/m²</span>
        <span className="font-medium">Médiane: {prixM2Median.toLocaleString('fr-FR')} €/m²</span>
        <span>{(prixM2Median * 1.5).toLocaleString('fr-FR')} €/m²</span>
      </div>

      {/* Résumé */}
      <div className={cn('mt-2 text-[11px] font-medium text-center py-1 rounded-lg', 
        verdict === 'excellent' || verdict === 'bon' ? 'bg-emerald-50 text-emerald-700' :
        verdict === 'correct' ? 'bg-slate-50 text-slate-600' :
        'bg-red-50 text-red-600'
      )}>
        {ecartPourcent < 0
          ? `${Math.abs(ecartPourcent).toFixed(0)}% en dessous du marché`
          : ecartPourcent > 0
            ? `${ecartPourcent.toFixed(0)}% au-dessus du marché`
            : 'Au prix du marché'}
      </div>
    </div>
  )
}
