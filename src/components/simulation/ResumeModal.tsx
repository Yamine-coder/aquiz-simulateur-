/**
 * Modal de reprise de simulation - UI moderne et professionnelle
 */

'use client'

import { Button } from '@/components/ui/button'
import type { SavedSimulation } from '@/types/simulation-save'
import {
    ArrowRight,
    Clock,
    Home,
    Play,
    Plus,
    Wallet,
    X
} from 'lucide-react'

interface ResumeModalProps {
  simulation: SavedSimulation
  onResume: () => void
  onNew: () => void
}

/** Formatte une date relative */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days} jours`
  
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** Formatte un montant */
function formatMontant(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

/** Labels des étapes - Mode A */
const ETAPES_A: Record<string, string> = {
  profil: 'Profil',
  simulation: 'Simulation',
  aides: 'Aides',
  score: 'Score',
  resume: 'Résumé'
}

/** Labels des étapes - Mode B */
const ETAPES_B: Record<string, string> = {
  '1': 'Le bien',
  '2': 'Financement',
  '3': 'Résultat'
}

/** Progression */
function getProgress(etape: string, mode: 'A' | 'B'): number {
  if (mode === 'B') {
    const step = parseInt(etape, 10)
    return step > 0 ? Math.round((step / 3) * 100) : 0
  }
  const steps = ['profil', 'simulation', 'aides', 'score', 'resume']
  const idx = steps.indexOf(etape)
  return idx >= 0 ? Math.round(((idx + 1) / steps.length) * 100) : 0
}

/** Obtenir le label de l'étape */
function getEtapeLabel(etape: string, mode: 'A' | 'B'): string {
  if (mode === 'B') {
    return ETAPES_B[etape] || `Étape ${etape}`
  }
  return ETAPES_A[etape] || etape
}

export function ResumeModal({ simulation, onResume, onNew }: ResumeModalProps) {
  const progress = getProgress(simulation.etape, simulation.mode)
  const etapeLabel = getEtapeLabel(simulation.etape, simulation.mode)
  const revenus = simulation.profil 
    ? simulation.profil.salaire1 + simulation.profil.salaire2 + simulation.profil.autresRevenus
    : 0
  const prixBien = simulation.modeBData?.prixBien || 0

  const isModA = simulation.mode === 'A'
  const ModeIcon = isModA ? Wallet : Home

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden">
        
        {/* Header sobre noir AQUIZ */}
        <div className="relative px-6 pt-6 pb-5 bg-aquiz-black">
          {/* Traits diagonaux ADN AQUIZ */}
          <div className="absolute top-0 right-0 w-20 h-full overflow-hidden opacity-20">
            <div className="absolute top-2 right-4 w-16 h-0.5 bg-white rotate-[-20deg]" />
            <div className="absolute top-5 right-2 w-14 h-0.5 bg-white/60 rotate-[-20deg]" />
            <div className="absolute top-8 right-0 w-12 h-0.5 bg-white/40 rotate-[-20deg]" />
          </div>

          {/* Bouton fermer */}
          <button 
            onClick={onNew}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>

          {/* Badge mode */}
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/10">
              <ModeIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
              Mode {simulation.mode}
            </span>
          </div>

          {/* Titre */}
          <h2 className="text-lg font-semibold text-white">
            Reprendre votre simulation ?
          </h2>
        </div>

        {/* Contenu */}
        <div className="px-6 py-5">
          {/* Info principale */}
          <div className="flex items-center justify-between py-3 border-b border-aquiz-gray-lighter">
            <span className="text-sm text-aquiz-gray">
              {isModA ? 'Revenus mensuels' : 'Prix du bien'}
            </span>
            <span className="text-base font-semibold text-aquiz-black">
              {isModA && revenus > 0 && `${formatMontant(revenus)} €`}
              {!isModA && prixBien > 0 && `${formatMontant(prixBien)} €`}
              {((isModA && revenus === 0) || (!isModA && prixBien === 0)) && '—'}
            </span>
          </div>

          {/* Étape */}
          <div className="flex items-center justify-between py-3 border-b border-aquiz-gray-lighter">
            <span className="text-sm text-aquiz-gray">Étape actuelle</span>
            <span className="text-sm font-medium text-aquiz-black">{etapeLabel}</span>
          </div>

          {/* Temps */}
          <div className="flex items-center justify-between py-3 border-b border-aquiz-gray-lighter">
            <span className="text-sm text-aquiz-gray">Sauvegardée</span>
            <div className="flex items-center gap-1.5 text-sm text-aquiz-gray">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(simulation.savedAt)}
            </div>
          </div>

          {/* Progression */}
          <div className="pt-4">
            <div className="flex justify-between text-xs text-aquiz-gray mb-2">
              <span>Progression</span>
              <span className="font-medium text-aquiz-black">{progress}%</span>
            </div>
            <div className="h-1.5 bg-aquiz-gray-lighter rounded-full overflow-hidden">
              <div 
                className="h-full bg-aquiz-green rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-1 space-y-2">
          <Button
            onClick={onResume}
            className="w-full h-11 bg-aquiz-black hover:bg-aquiz-black/90 rounded-xl font-medium text-sm"
          >
            <Play className="w-4 h-4 mr-2 fill-current" />
            Reprendre
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
          
          <button
            onClick={onNew}
            className="w-full h-9 text-sm text-aquiz-gray hover:text-aquiz-black transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle simulation
          </button>
        </div>
      </div>
    </div>
  )
}
