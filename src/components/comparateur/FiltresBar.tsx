'use client'

/**
 * Filtres du comparateur — 2 composants frères :
 *   <FiltresToggle />  → bouton dans la barre d'onglets
 *   <FiltresPanel />   → panel inline pleine largeur sous les onglets
 *
 * Le parent gère l'état isOpen pour positionner chaque morceau.
 */

import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import type { ClasseDPE, FiltresAnnonces, TypeBienAnnonce } from '@/types/annonces'
import {
    Building2,
    ChevronDown,
    Filter,
    Heart,
    Home,
    RotateCcw,
} from 'lucide-react'
import { useCallback } from 'react'

/* ─────────────── Helpers ─────────────── */

/** Compte les filtres actifs */
export function countActiveFilters(filtres: FiltresAnnonces): number {
  let count = 0
  if (filtres.prixMin !== undefined && filtres.prixMin > 0) count++
  if (filtres.prixMax !== undefined && filtres.prixMax > 0) count++
  if (filtres.surfaceMin !== undefined && filtres.surfaceMin > 0) count++
  if (filtres.surfaceMax !== undefined && filtres.surfaceMax > 0) count++
  if (filtres.type && filtres.type !== 'tous') count++
  if (filtres.dpeMax && filtres.dpeMax !== 'G') count++
  if (filtres.favorisUniquement) count++
  return count
}

const DPE_COLORS: Record<string, string> = {
  A: 'bg-emerald-500',
  B: 'bg-emerald-400',
  C: 'bg-lime-500',
  D: 'bg-amber-400',
  E: 'bg-amber-500',
  F: 'bg-orange-500',
  G: 'bg-rose-500',
}

/* ═══════════════════════════════════════════
   FiltresToggle — bouton compact
   ═══════════════════════════════════════════ */

interface FiltresToggleProps {
  isOpen: boolean
  onToggle: () => void
  activeCount: number
}

export function FiltresToggle({ isOpen, onToggle, activeCount }: FiltresToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-1.5 h-7 sm:h-8 px-2.5 rounded-lg text-[11px] font-semibold transition-all
        ${activeCount > 0
          ? 'bg-aquiz-green/10 text-aquiz-green border border-aquiz-green/20 hover:bg-aquiz-green/15'
          : 'bg-white border border-aquiz-gray-lighter text-aquiz-gray hover:text-aquiz-black hover:border-aquiz-gray-light'
        }
      `}
    >
      <Filter className="h-3 w-3" />
      <span className="hidden sm:inline">Filtres</span>
      {activeCount > 0 && (
        <span className="min-w-4 h-4 text-[9px] flex items-center justify-center rounded-full bg-aquiz-green text-white font-bold">
          {activeCount}
        </span>
      )}
      <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )
}

/* ═══════════════════════════════════════════
   FiltresPanel — panel pleine largeur inline
   ═══════════════════════════════════════════ */

interface FiltresPanelProps {
  filtres: FiltresAnnonces
  onFiltresChange: (partial: Partial<FiltresAnnonces>) => void
  nbResultats: number
  nbTotal: number
}

export function FiltresPanel({ filtres, onFiltresChange, nbResultats, nbTotal }: FiltresPanelProps) {
  const activeCount = countActiveFilters(filtres)
  const isFiltered = nbResultats !== nbTotal

  const handleReset = useCallback(() => {
    onFiltresChange({
      prixMin: undefined,
      prixMax: undefined,
      surfaceMin: undefined,
      surfaceMax: undefined,
      type: 'tous',
      dpeMax: undefined,
      favorisUniquement: false,
    })
  }, [onFiltresChange])

  const handleNumberChange = useCallback(
    (key: keyof FiltresAnnonces, value: string) => {
      const num = value ? parseInt(value, 10) : undefined
      onFiltresChange({ [key]: num && !isNaN(num) ? num : undefined })
    },
    [onFiltresChange],
  )

  return (
    <div className="px-3 md:px-4 py-3 border-t border-aquiz-gray-lighter/60 bg-white animate-in slide-in-from-top-1 fade-in duration-150">
      {/* Grille de filtres — stack sur mobile, horizontal sur desktop */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-x-3 gap-y-2.5">

        {/* Type de bien */}
        <div className="col-span-2 sm:col-span-1 sm:w-32 sm:shrink-0">
          <label className="text-[10px] font-medium text-aquiz-gray mb-1 block">Type</label>
          <Select
            value={filtres.type || 'tous'}
            onValueChange={(v) => onFiltresChange({ type: v as TypeBienAnnonce | 'tous' })}
          >
            <SelectTrigger className="h-8 text-xs rounded-lg border-aquiz-gray-lighter bg-aquiz-gray-lightest/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous types</SelectItem>
              <SelectItem value="appartement">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-aquiz-gray" />
                  Appartement
                </span>
              </SelectItem>
              <SelectItem value="maison">
                <span className="flex items-center gap-1.5">
                  <Home className="h-3 w-3 text-aquiz-gray" />
                  Maison
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Séparateur desktop */}
        <div className="hidden sm:block w-px h-7 bg-aquiz-gray-lighter/70 self-end mb-0.5" />

        {/* Prix */}
        <div className="col-span-1 sm:shrink-0">
          <label className="text-[10px] font-medium text-aquiz-gray mb-1 block">Prix (€)</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Min"
              value={filtres.prixMin ?? ''}
              onChange={(e) => handleNumberChange('prixMin', e.target.value)}
              className="w-full sm:w-24 h-8 text-xs rounded-lg border border-aquiz-gray-lighter bg-aquiz-gray-lightest/30 px-2 tabular-nums focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green/40 placeholder:text-aquiz-gray-light [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[10px] text-aquiz-gray-light shrink-0">—</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Max"
              value={filtres.prixMax ?? ''}
              onChange={(e) => handleNumberChange('prixMax', e.target.value)}
              className="w-full sm:w-24 h-8 text-xs rounded-lg border border-aquiz-gray-lighter bg-aquiz-gray-lightest/30 px-2 tabular-nums focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green/40 placeholder:text-aquiz-gray-light [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Séparateur desktop */}
        <div className="hidden sm:block w-px h-7 bg-aquiz-gray-lighter/70 self-end mb-0.5" />

        {/* Surface */}
        <div className="col-span-1 sm:shrink-0">
          <label className="text-[10px] font-medium text-aquiz-gray mb-1 block">Surface (m²)</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Min"
              value={filtres.surfaceMin ?? ''}
              onChange={(e) => handleNumberChange('surfaceMin', e.target.value)}
              className="w-full sm:w-20 h-8 text-xs rounded-lg border border-aquiz-gray-lighter bg-aquiz-gray-lightest/30 px-2 tabular-nums focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green/40 placeholder:text-aquiz-gray-light [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[10px] text-aquiz-gray-light shrink-0">—</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Max"
              value={filtres.surfaceMax ?? ''}
              onChange={(e) => handleNumberChange('surfaceMax', e.target.value)}
              className="w-full sm:w-20 h-8 text-xs rounded-lg border border-aquiz-gray-lighter bg-aquiz-gray-lightest/30 px-2 tabular-nums focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green/40 placeholder:text-aquiz-gray-light [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Séparateur desktop */}
        <div className="hidden sm:block w-px h-7 bg-aquiz-gray-lighter/70 self-end mb-0.5" />

        {/* DPE — boutons lettre inline */}
        <div className="col-span-2 sm:shrink-0">
          <label className="text-[10px] font-medium text-aquiz-gray mb-1 block">DPE max</label>
          <div className="flex gap-0.5 sm:gap-0.5">
            {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as ClasseDPE[]).map((dpe) => {
              const isActive = filtres.dpeMax === dpe
              return (
                <button
                  key={dpe}
                  onClick={() => onFiltresChange({ dpeMax: isActive ? undefined : dpe })}
                  className={`
                    flex-1 sm:flex-none sm:w-7 h-8 rounded-md text-[11px] font-bold transition-all
                    ${isActive
                      ? `${DPE_COLORS[dpe]} text-white shadow-sm ring-1 ring-black/10`
                      : 'bg-aquiz-gray-lightest/50 text-aquiz-gray hover:bg-aquiz-gray-lightest border border-transparent hover:border-aquiz-gray-lighter'
                    }
                  `}
                >
                  {dpe}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Ligne bas : Favoris + compteur + reset */}
      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-aquiz-gray-lighter/40">
        <button
          onClick={() => onFiltresChange({ favorisUniquement: !filtres.favorisUniquement })}
          className={`
            flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
            ${filtres.favorisUniquement
              ? 'bg-rose-50 text-rose-600 border border-rose-200'
              : 'text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest'
            }
          `}
        >
          <Heart className={`h-3 w-3 ${filtres.favorisUniquement ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span className="hidden sm:inline">Favoris uniquement</span>
          <span className="sm:hidden">Favoris</span>
        </button>

        <div className="flex items-center gap-2">
          {isFiltered && (
            <span className="text-[11px] text-aquiz-gray">
              <strong className="text-aquiz-black">{nbResultats}</strong> / {nbTotal} bien{nbTotal > 1 ? 's' : ''}
            </span>
          )}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 text-[11px] text-aquiz-gray hover:text-rose-600 hover:bg-rose-50/50 px-2 rounded-lg"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Effacer
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
