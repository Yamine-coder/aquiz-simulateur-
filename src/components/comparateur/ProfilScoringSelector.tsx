'use client'

/**
 * ProfilScoringSelector — Sélecteur de profil pour le scoring adaptatif
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
    Sliders,
} from 'lucide-react'
import { useCallback } from 'react'

interface ProfilScoringSelectorProps {
  activeProfilId: ProfilScoringId
  onProfilChange: (profil: ProfilScoring) => void
  className?: string
  compact?: boolean
  wrapPills?: boolean
}

/** Axes prioritaires + axes réduits par profil */
const PROFIL_DETAIL: Record<ProfilScoringId, { prioritaires: string[]; reduits?: string[] }> = {
  equilibre:    { prioritaires: ['Tous les axes au même niveau'] },
  investisseur: { prioritaires: ['Rendement locatif', 'Plus-value', 'Prix marché'], reduits: ['Surface', 'Équipements'] },
  famille:      { prioritaires: ['Surface & pièces', 'Emplacement', 'Sécurité'], reduits: ['Rendement', 'Plus-value'] },
  premier_achat:{ prioritaires: ['Prix vs marché', 'Charges', 'État du bien'], reduits: ['Rendement', 'Plus-value'] },
  eco:          { prioritaires: ['Performance DPE', 'Risques naturels', 'Emplacement'], reduits: ['Rendement'] },
  personnalise: { prioritaires: ['Pondération personnalisée'] },
}

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

function getProfilColor(id: ProfilScoringId) {
  switch (id) {
    case 'equilibre':    return { bg: 'bg-slate-50',   text: 'text-slate-600',  border: 'border-slate-200',  activeBg: 'bg-slate-600',  ring: 'ring-slate-300',  accent: 'text-slate-500' }
    case 'investisseur': return { bg: 'bg-amber-50',   text: 'text-amber-600',  border: 'border-amber-200',  activeBg: 'bg-amber-500',  ring: 'ring-amber-300',  accent: 'text-amber-600' }
    case 'famille':      return { bg: 'bg-blue-50',    text: 'text-blue-600',   border: 'border-blue-200',   activeBg: 'bg-blue-500',   ring: 'ring-blue-300',   accent: 'text-blue-600' }
    case 'premier_achat':return { bg: 'bg-rose-50',    text: 'text-rose-600',   border: 'border-rose-200',   activeBg: 'bg-rose-500',   ring: 'ring-rose-300',   accent: 'text-rose-600' }
    case 'eco':          return { bg: 'bg-emerald-50', text: 'text-emerald-600',border: 'border-emerald-200',activeBg: 'bg-emerald-500',ring: 'ring-emerald-300',accent: 'text-emerald-600' }
    default:             return { bg: 'bg-slate-50',   text: 'text-slate-600',  border: 'border-slate-200',  activeBg: 'bg-slate-600',  ring: 'ring-slate-300',  accent: 'text-slate-500' }
  }
}

export function ProfilScoringSelector({
  activeProfilId,
  onProfilChange,
  className,
  compact = false,
  wrapPills = false,
}: ProfilScoringSelectorProps) {
  const handleSelect = useCallback((profil: ProfilScoring) => {
    onProfilChange(profil)
  }, [onProfilChange])

  const activeProfil = PROFILS_SCORING.find(p => p.id === activeProfilId)

  if (compact) {
    return (
      <div className={cn(wrapPills ? 'flex flex-col gap-2' : 'flex flex-row items-center gap-3 flex-wrap', className)}>
        {/* Pills */}
        <div className={cn('flex items-center gap-x-1.5 gap-y-2 py-0.5 shrink-0', wrapPills ? 'flex-wrap' : 'overflow-x-auto scrollbar-hide')}>
          {PROFILS_SCORING.map(profil => {
            const isActive = profil.id === activeProfilId
            const colors = getProfilColor(profil.id)
            return (
              <button
                key={profil.id}
                onClick={() => handleSelect(profil)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-200 shrink-0 active:scale-95',
                  isActive
                    ? `${colors.activeBg} text-white shadow-sm ring-2 ${colors.ring} ring-offset-1`
                    : `${colors.bg} ${colors.text} border ${colors.border} hover:shadow-sm`
                )}
              >
                <ProfilIcon id={profil.id} className="h-3.5 w-3.5" />
                {profil.label}
              </button>
            )
          })}
        </div>
        {/* Description profil actif */}
        {activeProfil && (
          <div className="flex items-center gap-1.5 animate-in fade-in duration-200 shrink-0">
            {!wrapPills && (
              <span className="text-aquiz-gray-lighter select-none">—</span>
            )}
            {wrapPills && (
              <span className={cn(
                'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
                getProfilColor(activeProfilId).bg,
                getProfilColor(activeProfilId).text,
              )}>
                <ProfilIcon id={activeProfilId} className="h-2.5 w-2.5" />
                {activeProfil.label}
              </span>
            )}
            <span className="text-[11px] text-aquiz-gray leading-tight">
              {PROFIL_DETAIL[activeProfilId].prioritaires.join(' · ')}
            </span>
          </div>
        )}
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
            <div className={cn('shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors', isActive ? 'bg-white/20' : colors.bg)}>
              <ProfilIcon id={profil.id} className={cn('h-4 w-4', isActive ? 'text-white' : colors.text)} />
            </div>
            <div className="min-w-0">
              <span className={cn('text-xs font-bold block leading-tight', isActive ? 'text-white' : 'text-aquiz-black')}>{profil.label}</span>
              <span className={cn('text-[10px] leading-snug block mt-0.5', isActive ? 'text-white/75' : 'text-aquiz-gray')}>{profil.description}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}


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
