'use client'

/**
 * ProfilScoringSelector — Sélecteur de profil pour le scoring adaptatif
 * 
 * Permet à l'utilisateur de choisir un profil prédéfini
 * qui ajuste les pondérations du scoring comparateur
 */

import type { ProfilScoring, ProfilScoringId } from '@/lib/comparateur/scoreComparateur'
import { PROFILS_SCORING } from '@/lib/comparateur/scoreComparateur'
import { cn } from '@/lib/utils'
import {
    BarChart3,
    Heart,
    Home,
    Leaf,
    Scale,
    Sliders
} from 'lucide-react'
import { useCallback } from 'react'

interface ProfilScoringSelectorProps {
  /** ID du profil actif */
  activeProfilId: ProfilScoringId
  /** Callback quand l'utilisateur change de profil */
  onProfilChange: (profil: ProfilScoring) => void
  /** Classe CSS */
  className?: string
  /** Version compacte (mobile) */
  compact?: boolean
}

/** Icône par profil */
function ProfilIcon({ id, className }: { id: ProfilScoringId; className?: string }) {
  switch (id) {
    case 'equilibre': return <Scale className={className} />
    case 'investisseur': return <BarChart3 className={className} />
    case 'famille': return <Home className={className} />
    case 'premier_achat': return <Heart className={className} />
    case 'eco': return <Leaf className={className} />
    case 'personnalise': return <Sliders className={className} />
    default: return <Scale className={className} />
  }
}

/** Couleur par profil */
function getProfilColor(id: ProfilScoringId): { bg: string; text: string; border: string; activeBg: string; ring: string } {
  switch (id) {
    case 'equilibre': return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', activeBg: 'bg-slate-600', ring: 'ring-slate-300' }
    case 'investisseur': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', activeBg: 'bg-amber-500', ring: 'ring-amber-300' }
    case 'famille': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', activeBg: 'bg-blue-500', ring: 'ring-blue-300' }
    case 'premier_achat': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', activeBg: 'bg-rose-500', ring: 'ring-rose-300' }
    case 'eco': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', activeBg: 'bg-emerald-500', ring: 'ring-emerald-300' }
    default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', activeBg: 'bg-slate-600', ring: 'ring-slate-300' }
  }
}

export function ProfilScoringSelector({
  activeProfilId,
  onProfilChange,
  className,
  compact = false,
}: ProfilScoringSelectorProps) {
  const handleSelect = useCallback((profil: ProfilScoring) => {
    onProfilChange(profil)
  }, [onProfilChange])

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5', className)}>
        {PROFILS_SCORING.map(profil => {
          const isActive = profil.id === activeProfilId
          const colors = getProfilColor(profil.id)
          return (
            <button
              key={profil.id}
              onClick={() => handleSelect(profil)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-200 shrink-0',
                isActive
                  ? `${colors.activeBg} text-white shadow-sm ring-2 ${colors.ring} ring-offset-1`
                  : `${colors.bg} ${colors.text} border ${colors.border} hover:shadow-sm active:scale-95`
              )}
            >
              <ProfilIcon id={profil.id} className="h-3 w-3" />
              {profil.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-5 gap-2', className)}>
      {PROFILS_SCORING.map(profil => {
        const isActive = profil.id === activeProfilId
        const colors = getProfilColor(profil.id)
        return (
          <button
            key={profil.id}
            onClick={() => handleSelect(profil)}
            className={cn(
              'group relative flex items-start gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-200',
              isActive
                ? `${colors.activeBg} text-white border-transparent shadow-md ring-2 ${colors.ring} ring-offset-1`
                : `bg-white ${colors.border} hover:shadow-md active:scale-[0.98]`
            )}
          >
            {/* Icône */}
            <div className={cn(
              'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              isActive ? 'bg-white/20' : colors.bg
            )}>
              <ProfilIcon
                id={profil.id}
                className={cn('h-4 w-4', isActive ? 'text-white' : colors.text)}
              />
            </div>
            {/* Texte */}
            <div className="min-w-0">
              <span className={cn('text-xs font-bold block leading-tight', isActive ? 'text-white' : 'text-aquiz-black')}>
                {profil.label}
              </span>
              <span className={cn('text-[10px] leading-snug block mt-0.5', isActive ? 'text-white/75' : 'text-aquiz-gray')}>
                {profil.description}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
