/**
 * Page "Mes Simulations" - Historique des simulations
 * Charte AQUIZ : noir/gris/blanc + vert accent uniquement
 */

'use client'

import { History, Home, Trash2, Wallet, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { SimulationCard } from '@/components/simulation'
import { Button } from '@/components/ui/button'
import { useSimulationSave } from '@/hooks/useSimulationSave'

export default function MesSimulationsPage() {
  const router = useRouter()
  const { simulations, isLoaded, remove, clearAll } = useSimulationSave()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'all' | 'single', id?: string } | null>(null)

  // Restaurer une simulation
  const handleRestore = (id: string) => {
    const sim = simulations.find(s => s.id === id)
    if (!sim) return
    
    sessionStorage.setItem('aquiz-restore-id', id)
    router.push(`/simulateur/mode-${sim.mode.toLowerCase()}`)
  }

  // Ouvrir modal suppression tout
  const handleClearAll = () => {
    setDeleteTarget({ type: 'all' })
    setShowDeleteModal(true)
  }

  // Ouvrir modal suppression simple
  const handleDeleteSingle = (id: string) => {
    setDeleteTarget({ type: 'single', id })
    setShowDeleteModal(true)
  }

  // Confirmer suppression
  const confirmDelete = () => {
    if (deleteTarget?.type === 'all') {
      clearAll()
    } else if (deleteTarget?.type === 'single' && deleteTarget.id) {
      remove(deleteTarget.id)
    }
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  const enCours = simulations.filter(s => s.status === 'en_cours')
  const terminees = simulations.filter(s => s.status === 'terminee')

  return (
    <div className="min-h-screen bg-aquiz-gray-lightest">
      {/* Contenu */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        
        {/* En-tête avec actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-aquiz-black flex items-center gap-2">
              <History className="w-5 h-5 text-aquiz-gray" />
              Mes simulations
            </h1>
            {simulations.length > 0 && (
              <p className="text-sm text-aquiz-gray mt-1">
                {simulations.length} simulation{simulations.length > 1 ? 's' : ''} sauvegardée{simulations.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          {/* Supprimer tout */}
          {simulations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-aquiz-gray hover:text-red-600 hover:bg-red-50 gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Tout supprimer</span>
            </Button>
          )}
        </div>

        {/* État vide */}
        {isLoaded && simulations.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-aquiz-gray-lighter">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-aquiz-gray-lightest flex items-center justify-center">
              <History className="w-7 h-7 text-aquiz-gray" />
            </div>
            <h2 className="text-lg font-semibold text-aquiz-black mb-2">
              Aucune simulation
            </h2>
            <p className="text-sm text-aquiz-gray mb-6 max-w-xs mx-auto">
              Commencez une simulation et sauvegardez-la pour la retrouver ici
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/simulateur/mode-a">
                <Button variant="outline" className="gap-2 border-aquiz-gray-light">
                  <Wallet className="w-4 h-4" />
                  Mode A
                </Button>
              </Link>
              <Link href="/simulateur/mode-b">
                <Button className="bg-aquiz-black hover:bg-aquiz-black/90 gap-2">
                  <Home className="w-4 h-4" />
                  Mode B
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Simulations en cours */}
        {enCours.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-aquiz-gray animate-pulse" />
              <h2 className="text-sm font-semibold text-aquiz-black uppercase tracking-wide">
                En cours
              </h2>
              <span className="text-xs text-aquiz-gray">({enCours.length})</span>
            </div>
            <div className="space-y-3">
              {enCours.map(sim => (
                <SimulationCard
                  key={sim.id}
                  simulation={sim}
                  onDelete={() => handleDeleteSingle(sim.id)}
                  onRestore={() => handleRestore(sim.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Simulations terminées */}
        {terminees.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-aquiz-green" />
              <h2 className="text-sm font-semibold text-aquiz-black uppercase tracking-wide">
                Terminées
              </h2>
              <span className="text-xs text-aquiz-gray">({terminees.length})</span>
            </div>
            <div className="space-y-3">
              {terminees.map(sim => (
                <SimulationCard
                  key={sim.id}
                  simulation={sim}
                  onDelete={() => handleDeleteSingle(sim.id)}
                  onRestore={() => handleRestore(sim.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Bouton nouvelle simulation */}
        {simulations.length > 0 && (
          <div className="pt-4 border-t border-aquiz-gray-lighter">
            <p className="text-xs text-aquiz-gray text-center mb-3">Nouvelle simulation</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/simulateur/mode-a">
                <Button variant="outline" size="sm" className="gap-2 border-aquiz-gray-light">
                  <Wallet className="w-4 h-4" />
                  Mode A
                </Button>
              </Link>
              <Link href="/simulateur/mode-b">
                <Button size="sm" className="bg-aquiz-black hover:bg-aquiz-black/90 gap-2">
                  <Home className="w-4 h-4" />
                  Mode B
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-aquiz-black/60 backdrop-blur-[2px]"
            onClick={() => setShowDeleteModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Close button */}
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-aquiz-gray-lightest hover:bg-aquiz-gray-lighter flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4 text-aquiz-gray" />
            </button>
            
            {/* Content */}
            <div className="pt-8 pb-6 px-6">
              {/* Icon */}
              <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-aquiz-gray-lightest flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-aquiz-black" />
              </div>
              
              {/* Text */}
              <h3 className="text-lg font-semibold text-aquiz-black text-center mb-2">
                {deleteTarget?.type === 'all' 
                  ? 'Tout supprimer ?' 
                  : 'Supprimer ?'
                }
              </h3>
              <p className="text-sm text-aquiz-gray text-center leading-relaxed">
                {deleteTarget?.type === 'all' 
                  ? 'Toutes vos simulations seront définitivement supprimées.' 
                  : 'Cette simulation sera définitivement supprimée.'
                }
              </p>
            </div>
            
            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-11 rounded-lg border border-aquiz-gray-lighter text-aquiz-black font-medium hover:bg-aquiz-gray-lightest transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 h-11 rounded-lg bg-aquiz-black text-white font-medium hover:bg-aquiz-black/90 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
