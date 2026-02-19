/**
 * Modal de reprise de simulation - UI moderne et professionnelle
 */

'use client'

import type { SavedSimulation } from '@/types/simulation-save'
import {
    ArrowRight,
    Clock,
    Home,
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
  resultats: 'Résultats'
}

/** Labels des étapes - Mode B */
const ETAPES_B: Record<string, string> = {
  '1': 'Le bien',
  '2': 'Financement',
  '3': 'Résultat'
}

/** Progression */
function getProgress(etape: string, mode: 'A' | 'B', status?: string): number {
  // Simulation terminée → toujours 100%
  if (status === 'terminee') return 100
  if (mode === 'B') {
    const step = parseInt(etape, 10)
    return step > 0 ? Math.round((step / 3) * 100) : 0
  }
  const steps = ['profil', 'simulation', 'resultats']
  const idx = steps.indexOf(etape)
  // Fallback : si étape inconnue mais données existent, au moins 33%
  return idx >= 0 ? Math.round(((idx + 1) / steps.length) * 100) : 33
}

/** Obtenir le label de l'étape */
function getEtapeLabel(etape: string, mode: 'A' | 'B'): string {
  if (mode === 'B') {
    return ETAPES_B[etape] || `Étape ${etape}`
  }
  return ETAPES_A[etape] || etape
}

export function ResumeModal({ simulation, onResume, onNew }: ResumeModalProps) {
  const progress = getProgress(simulation.etape, simulation.mode, simulation.status)
  const etapeLabel = getEtapeLabel(simulation.etape, simulation.mode)
  const isComplete = simulation.status === 'terminee' || progress === 100
  const revenus = simulation.profil 
    ? simulation.profil.salaire1 + simulation.profil.salaire2 + simulation.profil.autresRevenus
    : 0
  const prixBien = simulation.modeBData?.prixBien || 0

  const isModA = simulation.mode === 'A'
  const ModeIcon = isModA ? Wallet : Home

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[400px] bg-white rounded-2xl border border-gray-100 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden">
        
        {/* Header - fond blanc, style aéré Apple-like */}
        <div className="relative px-7 pt-7 pb-5">
          {/* Bouton fermer */}
          <button 
            onClick={onNew}
            className="absolute top-5 right-5 p-1.5 rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icône dans cercle gris clair */}
          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
            <ModeIcon className="w-5 h-5 text-aquiz-black" />
          </div>

          {/* Label mode en vert */}
          <span className="text-xs font-semibold uppercase tracking-wider text-aquiz-green">
            Mode {simulation.mode}
          </span>

          {/* Titre */}
          <h2 className="text-xl font-bold text-aquiz-black mt-1.5">
            {isComplete ? 'Revoir votre simulation ?' : 'Reprendre votre simulation ?'}
          </h2>

          {/* Sous-titre */}
          <p className="text-sm text-gray-400 mt-1">
            {isModA ? 'Estimation de votre capacité d\'achat' : 'Vérification de faisabilité'}
          </p>
        </div>

        {/* Séparateur */}
        <div className="mx-7 h-px bg-gray-100" />

        {/* Infos - badges style page d'accueil */}
        <div className="px-7 py-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {isModA ? 'Revenus mensuels' : 'Prix du bien'}
            </span>
            <span className="text-sm font-semibold text-aquiz-black">
              {isModA && revenus > 0 && `${formatMontant(revenus)} €`}
              {!isModA && prixBien > 0 && `${formatMontant(prixBien)} €`}
              {((isModA && revenus === 0) || (!isModA && prixBien === 0)) && '—'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Étape actuelle</span>
            <span className="text-sm font-medium text-aquiz-black">{etapeLabel}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Sauvegardée</span>
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(simulation.savedAt)}
            </div>
          </div>

          {/* Barre de progression */}
          <div className="pt-1">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">Progression</span>
              <span className="font-medium text-aquiz-black">{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-aquiz-green rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Séparateur */}
        <div className="mx-7 h-px bg-gray-100" />

        {/* Actions - boutons bien visibles */}
        <div className="px-7 py-6 space-y-3">
          <button
            onClick={onResume}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-aquiz-green text-white text-sm font-semibold hover:bg-aquiz-green/90 transition-colors"
          >
            {isComplete ? 'Revoir les résultats' : 'Reprendre la simulation'}
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={onNew}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-gray-300 hover:text-aquiz-black transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle simulation
          </button>
        </div>
      </div>
    </div>
  )
}
