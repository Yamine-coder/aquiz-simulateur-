'use client'

/**
 * Liste des zones avec classement - Charte AQUIZ
 * Design: Blanc avec accents noir et couleurs statut
 */

import { trierParPrixM2, trierParSurface } from '@/lib/calculs/calculZones'
import { cn } from '@/lib/utils'
import { formatMontant } from '@/lib/utils/formatters'
import type { ZoneCalculee } from '@/types/carte'
import { STATUT_CONFIG } from '@/types/carte'
import {
    ArrowUpDown,
    Medal,
    TrendingDown,
    TrendingUp,
    Trophy
} from 'lucide-react'
import { useMemo } from 'react'

interface ListeZonesProps {
  zones: ZoneCalculee[]
  zoneSelectionnee?: ZoneCalculee | null
  onSelectZone?: (zone: ZoneCalculee) => void
  tri?: 'surface' | 'prix'
  onChangeTri?: (tri: 'surface' | 'prix') => void
  className?: string
  maxZones?: number
}

// Couleurs AQUIZ
const COULEURS_STATUT = {
  vert: '#22c55e',
  orange: '#f59e0b',
  rouge: '#ef4444',
}

export default function ListeZones({
  zones,
  zoneSelectionnee,
  onSelectZone,
  tri = 'surface',
  onChangeTri,
  className,
  maxZones = 12,
}: ListeZonesProps) {
  const zonesTries = useMemo(() => {
    const triees = tri === 'surface' ? trierParSurface(zones) : trierParPrixM2(zones)
    return triees.slice(0, maxZones)
  }, [zones, tri, maxZones])

  if (zones.length === 0) {
    return (
      <div className={cn(
        'bg-white rounded-2xl shadow-xl border-2 border-aquiz-gray-lighter p-6 text-center',
        className
      )}>
        <div className="text-aquiz-gray-light mb-2">📍</div>
        <p className="text-sm text-aquiz-gray">Aucune zone ne correspond aux filtres</p>
      </div>
    )
  }

  return (
    <div className={cn(
      'bg-white rounded-2xl shadow-xl border-2 border-aquiz-gray-lighter overflow-hidden',
      className
    )}>
      {/* En-tête avec tri */}
      <div className="flex items-center justify-between px-4 py-3 bg-aquiz-black">
        <div className="flex items-center gap-2 text-white">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h3 className="font-semibold text-sm">
            Top {Math.min(zones.length, maxZones)} zones
          </h3>
        </div>
        {onChangeTri && (
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3 h-3 text-aquiz-gray-light" />
            <select
              value={tri}
              onChange={(e) => onChangeTri(e.target.value as 'surface' | 'prix')}
              className="text-xs bg-aquiz-black-light text-white border border-aquiz-gray-dark rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-white/30"
            >
              <option value="surface">Par surface</option>
              <option value="prix">Par prix/m²</option>
            </select>
          </div>
        )}
      </div>

      {/* Liste scrollable */}
      <div className="divide-y divide-aquiz-gray-lighter max-h-[420px] overflow-y-auto">
        {zonesTries.map((zone, index) => {
          const config = STATUT_CONFIG[zone.statut]
          const isSelected = zoneSelectionnee?.id === zone.id
          const evolution = zone.evolutionPrix1an ?? 0
          const isTop3 = index < 3

          return (
            <button
              key={zone.id}
              onClick={() => onSelectZone?.(zone)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-aquiz-gray-lightest',
                isSelected && 'bg-aquiz-gray-lightest ring-2 ring-inset ring-aquiz-black'
              )}
            >
              {/* Rang avec médaille pour top 3 */}
              <div className={cn(
                'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                isTop3 
                  ? index === 0 
                    ? 'bg-yellow-100 text-yellow-700' 
                    : index === 1 
                      ? 'bg-gray-200 text-gray-600'
                      : 'bg-orange-100 text-orange-700'
                  : 'bg-aquiz-gray-lightest text-aquiz-gray'
              )}>
                {isTop3 ? (
                  <Medal className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Indicateur statut */}
              <div
                className="shrink-0 w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: COULEURS_STATUT[zone.statut] }}
                title={config.label}
              />

              {/* Infos zone */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="font-semibold text-sm text-aquiz-black truncate">
                  {zone.nom}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-aquiz-gray shrink-0">
                    {zone.codeDepartement}
                  </span>
                  <span className="text-[10px] text-aquiz-gray-dark font-medium shrink-0">
                    {formatMontant(zone.prixM2)} €/m²
                  </span>
                  {evolution !== 0 && (
                    <span className={cn(
                      'flex items-center gap-0.5 text-[10px] font-medium shrink-0',
                      evolution > 0 ? 'text-aquiz-orange' : 'text-aquiz-green'
                    )}>
                      {evolution > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {evolution > 0 ? '+' : ''}{evolution}%
                    </span>
                  )}
                </div>
              </div>

              {/* Surface max + badge */}
              <div className="shrink-0 text-right ml-2">
                <div className="text-lg font-bold text-aquiz-black leading-tight">
                  {zone.surfaceMax}<span className="text-[10px] font-normal text-aquiz-gray ml-0.5">m²</span>
                </div>
                <div
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block whitespace-nowrap"
                  style={{
                    backgroundColor: COULEURS_STATUT[zone.statut] + '20',
                    color: COULEURS_STATUT[zone.statut],
                  }}
                >
                  {config.label}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer si plus de zones */}
      {zones.length > maxZones && (
        <div className="px-4 py-2 bg-aquiz-gray-lightest border-t border-aquiz-gray-lighter text-center">
          <p className="text-[10px] text-aquiz-gray">
            +{zones.length - maxZones} autres zones disponibles
          </p>
        </div>
      )}
    </div>
  )
}
