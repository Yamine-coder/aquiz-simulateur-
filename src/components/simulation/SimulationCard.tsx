/**
 * Carte de simulation pour la page historique
 * Charte AQUIZ : noir/gris/blanc + vert accent uniquement
 */

'use client'

import { Button } from '@/components/ui/button'
import type { SavedSimulation } from '@/types/simulation-save'
import { Calendar, CheckCircle, ChevronRight, Euro, Home, Trash2, Wallet } from 'lucide-react'

interface SimulationCardProps {
  simulation: SavedSimulation
  onDelete: () => void
  onRestore: () => void
}

/** Formatte une date */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** Formatte un montant */
function formatMontant(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

/** Labels des étapes Mode A */
const ETAPES_MODE_A: Record<string, string> = {
  profil: 'Profil',
  simulation: 'Simulation',
  aides: 'Aides',
  score: 'Score',
  resume: 'Résumé'
}

/** Labels des étapes Mode B */
const ETAPES_MODE_B: Record<string, string> = {
  '1': 'Le bien',
  '2': 'Financement',
  '3': 'Résultat'
}

/** Configuration des modes */
const MODE_CONFIG = {
  A: {
    title: 'Ma capacité d\'achat',
    subtitle: 'Combien puis-je emprunter ?',
    icon: Wallet
  },
  B: {
    title: 'Puis-je acheter ce bien ?',
    subtitle: 'Ce qu\'il faut pour l\'acheter',
    icon: Home
  }
}

export function SimulationCard({ simulation, onDelete, onRestore }: SimulationCardProps) {
  const isComplete = simulation.status === 'terminee'
  const config = MODE_CONFIG[simulation.mode]
  const Icon = config.icon
  
  // Revenus selon le mode
  const revenus = simulation.profil 
    ? simulation.profil.salaire1 + simulation.profil.salaire2 + simulation.profil.autresRevenus
    : 0
  
  // Prix du bien pour Mode B
  const prixBien = simulation.modeBData?.prixBien || 0

  // Label de l'étape selon le mode
  const getEtapeLabel = () => {
    if (isComplete) return 'Terminée'
    if (simulation.mode === 'A') {
      return ETAPES_MODE_A[simulation.etape] || 'En cours'
    } else {
      return ETAPES_MODE_B[simulation.etape] || 'En cours'
    }
  }

  return (
    <div className="bg-white border border-aquiz-gray-lighter rounded-xl overflow-hidden hover:border-aquiz-gray transition-colors">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              ${isComplete ? 'bg-aquiz-green/10' : 'bg-aquiz-gray-lighter'}
            `}>
              <Icon className={`w-5 h-5 ${isComplete ? 'text-aquiz-green' : 'text-aquiz-gray'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-aquiz-black text-sm">
                  {config.title}
                </p>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-aquiz-gray-lighter text-aquiz-gray">
                  Mode {simulation.mode}
                </span>
              </div>
              <p className="text-xs text-aquiz-gray">{config.subtitle}</p>
            </div>
          </div>
          
          {/* Badge statut */}
          <div className="text-right">
            <span className={`
              inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
              ${isComplete 
                ? 'bg-aquiz-green/10 text-aquiz-green' 
                : 'bg-aquiz-gray-lighter text-aquiz-gray'
              }
            `}>
              {isComplete && <CheckCircle className="w-3 h-3" />}
              {getEtapeLabel()}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-aquiz-gray mt-1 justify-end">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(simulation.savedAt)}</span>
            </div>
          </div>
        </div>

        {/* Infos principales */}
        <div className="flex items-center gap-4 mb-4 py-2.5 px-3 bg-aquiz-gray-lightest rounded-lg border border-aquiz-gray-lighter">
          {simulation.mode === 'A' && revenus > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Euro className="w-4 h-4 text-aquiz-gray" />
              <span className="text-aquiz-gray">Revenus :</span>
              <span className="font-semibold text-aquiz-black">{formatMontant(revenus)} €/mois</span>
            </div>
          )}
          
          {simulation.mode === 'B' && prixBien > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Home className="w-4 h-4 text-aquiz-gray" />
              <span className="text-aquiz-gray">Prix du bien :</span>
              <span className="font-semibold text-aquiz-black">{formatMontant(prixBien)} €</span>
            </div>
          )}
          
          {isComplete && simulation.resultats && (
            <div className="flex items-center gap-2 text-sm ml-auto">
              <CheckCircle className="w-4 h-4 text-aquiz-green" />
              <span className="text-aquiz-gray">
                {simulation.mode === 'A' ? 'Capacité :' : 'Mensualité :'}
              </span>
              <span className="font-semibold text-aquiz-green">
                {simulation.mode === 'A' 
                  ? `${formatMontant(simulation.resultats.capaciteAchat)} €`
                  : `${formatMontant(simulation.resultats.mensualite)} €/mois`
                }
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onRestore}
            size="sm"
            className="flex-1 bg-aquiz-black hover:bg-aquiz-black/90 text-white"
          >
            {isComplete ? 'Revoir' : 'Reprendre'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          
          <Button
            onClick={onDelete}
            size="sm"
            variant="ghost"
            className="text-aquiz-gray hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
