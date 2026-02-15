'use client'

/**
 * Panneau de filtres pour la carte - Charte AQUIZ
 * Design: Fond blanc, accents noir/gris
 */

import { cn } from '@/lib/utils'
import type { StatutZone, TypeBienCarte } from '@/types/carte'
import { STATUT_CONFIG } from '@/types/carte'
import {
    Building2,
    ChevronDown,
    ChevronUp,
    Filter,
    Home,
    MapPin,
    RotateCcw
} from 'lucide-react'
import { useState } from 'react'

interface FiltresCarteProps {
  typeBien: TypeBienCarte
  onChangeTypeBien: (type: TypeBienCarte) => void
  filtreStatuts: StatutZone[]
  onChangeFiltreStatuts: (statuts: StatutZone[]) => void
  filtreDepartements: string[]
  onChangeFiltreDepartements: (deps: string[]) => void
  className?: string
}

// Couleurs AQUIZ
const COULEURS_STATUT = {
  vert: '#22c55e',
  orange: '#f59e0b',
  rouge: '#ef4444',
}

const DEPARTEMENTS_IDF = [
  { code: '75', nom: 'Paris', emoji: '🗼' },
  { code: '92', nom: 'Hauts-de-Seine', emoji: '🏢' },
  { code: '93', nom: 'Seine-Saint-Denis', emoji: '🏠' },
  { code: '94', nom: 'Val-de-Marne', emoji: '🌳' },
  { code: '77', nom: 'Seine-et-Marne', emoji: '🌾' },
  { code: '78', nom: 'Yvelines', emoji: '🏰' },
  { code: '91', nom: 'Essonne', emoji: '🔬' },
  { code: '95', nom: "Val-d'Oise", emoji: '✈️' },
]

export default function FiltresCarte({
  typeBien,
  onChangeTypeBien,
  filtreStatuts,
  onChangeFiltreStatuts,
  filtreDepartements,
  onChangeFiltreDepartements,
  className,
}: FiltresCarteProps) {
  const [showDepartements, setShowDepartements] = useState(false)

  const toggleStatut = (statut: StatutZone) => {
    if (filtreStatuts.includes(statut)) {
      onChangeFiltreStatuts(filtreStatuts.filter((s) => s !== statut))
    } else {
      onChangeFiltreStatuts([...filtreStatuts, statut])
    }
  }

  const toggleDepartement = (code: string) => {
    if (filtreDepartements.includes(code)) {
      onChangeFiltreDepartements(filtreDepartements.filter((d) => d !== code))
    } else {
      onChangeFiltreDepartements([...filtreDepartements, code])
    }
  }

  const resetFilters = () => {
    onChangeFiltreStatuts([])
    onChangeFiltreDepartements([])
  }

  const hasFilters = filtreStatuts.length > 0 || filtreDepartements.length > 0

  return (
    <div className={cn(
      'bg-white rounded-2xl shadow-xl border-2 border-aquiz-gray-lighter overflow-hidden',
      className
    )}>
      {/* En-tête */}
      <div className="flex items-center justify-between px-4 py-3 bg-aquiz-black">
        <div className="flex items-center gap-2 text-white">
          <Filter className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Filtres</h3>
        </div>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-aquiz-gray-light hover:text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Réinitialiser
          </button>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* Type de bien */}
        <div className="space-y-2.5">
          <label className="text-[10px] text-aquiz-gray uppercase tracking-wider font-semibold">
            Type de bien
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChangeTypeBien('appartement')}
              className={cn(
                'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                typeBien === 'appartement'
                  ? 'bg-aquiz-black text-white shadow-lg'
                  : 'bg-aquiz-gray-lightest text-aquiz-gray hover:bg-aquiz-gray-lighter'
              )}
            >
              <Building2 className="w-4 h-4" />
              Appart.
            </button>
            <button
              onClick={() => onChangeTypeBien('maison')}
              className={cn(
                'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                typeBien === 'maison'
                  ? 'bg-aquiz-black text-white shadow-lg'
                  : 'bg-aquiz-gray-lightest text-aquiz-gray hover:bg-aquiz-gray-lighter'
              )}
            >
              <Home className="w-4 h-4" />
              Maison
            </button>
          </div>
        </div>

        {/* Filtre par accessibilité */}
        <div className="space-y-2.5">
          <label className="text-[10px] text-aquiz-gray uppercase tracking-wider font-semibold">
            Accessibilité
          </label>
          <div className="flex flex-col gap-2">
            {(['vert', 'orange', 'rouge'] as StatutZone[]).map((statut) => {
              const config = STATUT_CONFIG[statut]
              const isActive = filtreStatuts.length === 0 || filtreStatuts.includes(statut)
              
              return (
                <button
                  key={statut}
                  onClick={() => toggleStatut(statut)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                    isActive
                      ? 'bg-aquiz-gray-lightest'
                      : 'bg-white border border-aquiz-gray-lighter opacity-50'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full transition-all',
                      isActive ? 'shadow-md' : 'opacity-40'
                    )}
                    style={{ 
                      backgroundColor: COULEURS_STATUT[statut],
                      boxShadow: isActive ? `0 0 8px ${COULEURS_STATUT[statut]}50` : 'none'
                    }}
                  />
                  <span className={cn(
                    'font-medium flex-1 text-left',
                    isActive ? 'text-aquiz-black' : 'text-aquiz-gray'
                  )}>
                    {config.label}
                  </span>
                  <span className={cn(
                    'text-xs',
                    isActive ? 'text-aquiz-gray' : 'text-aquiz-gray-light'
                  )}>
                    {config.icone}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtre par département */}
        <div className="space-y-2.5">
          <button
            onClick={() => setShowDepartements(!showDepartements)}
            className="w-full flex items-center justify-between text-[10px] text-aquiz-gray uppercase tracking-wider font-semibold py-1"
          >
            <span className="flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              Départements
              {filtreDepartements.length > 0 && (
                <span className="bg-aquiz-black text-white text-[9px] px-1.5 py-0.5 rounded-full">
                  {filtreDepartements.length}
                </span>
              )}
            </span>
            {showDepartements ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showDepartements && (
            <div className="space-y-1 pt-1 animate-in slide-in-from-top-2 duration-200">
              {DEPARTEMENTS_IDF.map((dept) => {
                const isSelected = filtreDepartements.includes(dept.code)
                
                return (
                  <button
                    key={dept.code}
                    onClick={() => toggleDepartement(dept.code)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                      isSelected
                        ? 'bg-aquiz-black text-white'
                        : 'bg-aquiz-gray-lightest text-aquiz-gray hover:bg-aquiz-gray-lighter'
                    )}
                  >
                    <span className="text-base">{dept.emoji}</span>
                    <span className="flex-1 text-left font-medium">{dept.nom}</span>
                    <span className={cn(
                      'text-xs',
                      isSelected ? 'text-aquiz-gray-light' : 'text-aquiz-gray'
                    )}>
                      {dept.code}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer avec info source */}
      <div className="px-4 py-3 bg-aquiz-gray-lightest border-t border-aquiz-gray-lighter">
        <p className="text-[10px] text-aquiz-gray text-center">
          Prix médians DVF • Mise à jour oct. 2025
        </p>
      </div>
    </div>
  )
}
