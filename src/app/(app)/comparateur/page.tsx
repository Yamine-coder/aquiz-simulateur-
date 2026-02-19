'use client'

/**
 * Page Comparateur d'Annonces Immobilières
 * Sprint 6 - AQUIZ
 * 
 * Permet de :
 * - Ajouter des annonces manuellement
 * - Comparer jusqu'à 4 biens côte à côte
 * - Voir les statistiques
 * - Importer le budget depuis le simulateur
 */

import {
    AnnonceCard,
    FormulaireAnnonce,
    TableauComparaison
} from '@/components/comparateur'
import { ContactModal } from '@/components/contact'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import {
    calculerStatistiques,
    getAnnoncesFiltrees,
    getAnnoncesSelectionnees,
    useComparateurStore
} from '@/stores/useComparateurStore'
import { useSimulateurStore } from '@/stores/useSimulateurStore'
import type { AnalyseFaisabilite, NouvelleAnnonce, TriAnnonces } from '@/types/annonces'
import {
    ArrowDownUp,
    ArrowRight,
    Check,
    Grid3X3,
    Import,
    Info,
    LayoutGrid,
    List,
    Plus,
    RotateCcw,
    Scale,
    ScanSearch,
    X
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

// ============================================
// HELPERS
// ============================================

/** Calcule la faisabilité d'une annonce par rapport au budget */
function calculerFaisabilite(
  prix: number,
  budgetMax: number | null
): AnalyseFaisabilite | undefined {
  if (!budgetMax) return undefined
  
  const ecart = budgetMax - prix
  const pourcentage = Math.round((prix / budgetMax) * 100)
  
  // Frais notaire estimés (8% ancien)
  const fraisNotaire = Math.round(prix * 0.08)
  
  let niveau: 'confortable' | 'limite' | 'impossible'
  let message: string
  
  if (pourcentage <= 90) {
    niveau = 'confortable'
    message = `Dans votre budget avec une marge de ${ecart.toLocaleString('fr-FR')} €`
  } else if (pourcentage <= 105) {
    niveau = 'limite'
    message = pourcentage <= 100 
      ? `Proche de votre budget max (${pourcentage}%)` 
      : `Légèrement au-dessus (+${Math.abs(ecart).toLocaleString('fr-FR')} €)`
  } else {
    niveau = 'impossible'
    message = `Dépasse votre budget de ${Math.abs(ecart).toLocaleString('fr-FR')} €`
  }
  
  return {
    faisable: pourcentage <= 100,
    ecartBudget: ecart,
    pourcentageBudget: pourcentage,
    mensualiteEstimee: 0, // Simplifié
    fraisNotaire,
    niveau,
    message
  }
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ComparateurPage() {
  // Stores
  const comparateur = useComparateurStore()
  const { resultats, parametresModeA, parametresModeB } = useSimulateurStore()
  
  // États locaux
  const [showForm, setShowForm] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'liste' | 'comparaison'>('liste')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Données calculées
  const annoncesFiltrees = getAnnoncesFiltrees(comparateur)
  const annoncesSelectionnees = getAnnoncesSelectionnees(comparateur)
  const selCount = annoncesSelectionnees.length
  const statistiques = useMemo(
    () => calculerStatistiques(comparateur.annonces),
    [comparateur.annonces]
  )
  const statsSelection = useMemo(
    () => calculerStatistiques(annoncesSelectionnees),
    [annoncesSelectionnees]
  )
  
  // Budget depuis le simulateur
  const budgetSimulateur = resultats?.prixAchatMax || 
    (resultats?.capaciteEmprunt 
      ? resultats.capaciteEmprunt + (parametresModeA?.apport || parametresModeB?.apport || 0)
      : null
    )
  
  // Handlers
  const handleAjouterAnnonce = (data: NouvelleAnnonce) => {
    comparateur.ajouterAnnonce(data)
    setShowForm(false)
    // Scroll vers le haut pour voir la nouvelle annonce
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const handleModifierAnnonce = (data: NouvelleAnnonce) => {
    if (editingId) {
      comparateur.modifierAnnonce(editingId, data)
      setEditingId(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  
  const handleImporterBudget = () => {
    if (budgetSimulateur) {
      comparateur.setBudgetMax(budgetSimulateur)
    }
  }
  
  const annonceEnEdition = editingId 
    ? comparateur.annonces.find((a) => a.id === editingId)
    : null
  
  // ─────────────── ÉTAT VIDE ───────────────
  if (comparateur.annonces.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">

        <section className="pt-10 pb-6 md:pt-12 md:pb-8 border-b border-aquiz-gray-lighter">
          <div className="max-w-2xl mx-auto px-5 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-medium mb-3">
              <Scale className="w-3 h-3" />
              Comparateur
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-aquiz-black tracking-tight leading-tight">
              Comparez vos annonces
            </h2>
            <p className="mt-2 text-sm md:text-base text-aquiz-gray-light max-w-lg mx-auto leading-relaxed">
              Ajoutez un bien via un lien, du texte copié, ou en saisie manuelle
            </p>
          </div>
        </section>

        <div className="flex-1 flex flex-col px-5 pt-8 pb-10">
          <div className="w-full max-w-4xl mx-auto">
            <FormulaireAnnonce onSubmit={handleAjouterAnnonce} />
          </div>
          <p className="text-center text-xs text-aquiz-gray-light mt-8">
            Vous n&apos;avez pas encore simulé votre budget ?{' '}
            <Link href="/simulateur/mode-a" className="text-aquiz-green font-medium hover:underline underline-offset-2">
              Faire une simulation
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // ─────────────── AVEC ANNONCES ───────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <h1 className="sr-only">Comparateur de biens immobiliers</h1>

      {/* ═══ HEADER ═══ */}
      <div className="sticky top-0 z-30 bg-white border-b border-aquiz-gray-lighter">
        <div className="max-w-5xl mx-auto px-5 py-3">
          <div className="rounded-2xl border border-aquiz-gray-lighter overflow-hidden">

            {/* Haut : identité + actions */}
            <div className="px-4 py-3 md:px-5 md:py-3.5 bg-white border-b border-aquiz-gray-lighter">
              <div className="flex items-center justify-between gap-3">
                {/* Gauche — badge + titre */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
                    <Scale className="w-4 h-4 text-aquiz-green" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm md:text-base font-bold text-aquiz-black leading-tight truncate">
                      Comparateur immobilier
                    </h2>
                    <p className="text-[11px] text-aquiz-gray mt-0.5">
                      {comparateur.annonces.length} bien{comparateur.annonces.length > 1 ? 's' : ''} enregistré{comparateur.annonces.length > 1 ? 's' : ''}
                      {selCount >= 2 && <span className="text-aquiz-green font-medium"> · {selCount} sélectionnés</span>}
                    </p>
                  </div>
                </div>

                {/* Droite — budget + ajouter */}
                <div className="flex items-center gap-2 shrink-0">
                  {comparateur.budgetMax ? (
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-aquiz-green/8 border border-aquiz-green/15 text-xs">
                      <span className="font-semibold text-aquiz-green">{(comparateur.budgetMax / 1000).toFixed(0)}k €</span>
                      <button onClick={() => comparateur.setBudgetMax(null)} className="p-0.5 rounded hover:bg-aquiz-green/10">
                        <X className="h-2.5 w-2.5 text-aquiz-green/60" />
                      </button>
                    </div>
                  ) : budgetSimulateur ? (
                    <button
                      onClick={handleImporterBudget}
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-aquiz-green/30 text-xs text-aquiz-green hover:bg-aquiz-green/5 transition-colors"
                    >
                      <Import className="w-3 h-3" />
                      Importer {(budgetSimulateur / 1000).toFixed(0)}k €
                    </button>
                  ) : null}

                  <Button
                    onClick={() => setShowForm(true)}
                    size="sm"
                    className="bg-aquiz-green hover:bg-aquiz-green/90 text-white h-8 rounded-lg text-xs font-semibold px-3"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </div>
            </div>

            {/* Bas : onglets + filtres */}
            <div className="px-3 py-2 md:px-4 md:py-2.5 bg-aquiz-gray-lightest/40">
              <div className="flex items-center justify-between gap-3">
                {/* Onglets — pills */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-aquiz-gray-lighter">
                  <button
                    onClick={() => setActiveTab('liste')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'liste'
                        ? 'bg-aquiz-black text-white shadow-sm'
                        : 'text-aquiz-gray hover:text-aquiz-black'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Annonces
                    <span className={`text-[10px] min-w-[16px] text-center px-1 py-px rounded-full font-bold ${
                      activeTab === 'liste' ? 'bg-white/20 text-white' : 'bg-aquiz-gray-lighter text-aquiz-gray'
                    }`}>{comparateur.annonces.length}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('comparaison')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'comparaison'
                        ? 'bg-aquiz-green text-white shadow-sm'
                        : 'text-aquiz-gray hover:text-aquiz-black'
                    }`}
                  >
                    <Scale className="h-3.5 w-3.5" />
                    Comparaison
                    {selCount > 0 && (
                      <span className={`text-[10px] min-w-[16px] text-center px-1 py-px rounded-full font-bold ${
                        activeTab === 'comparaison' ? 'bg-white/20 text-white' : 'bg-aquiz-green/15 text-aquiz-green'
                      }`}>{selCount}</span>
                    )}
                  </button>
                </div>

                {/* Filtres tri + vue */}
                {activeTab === 'liste' && (
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={comparateur.tri}
                      onValueChange={(v) => comparateur.setTri(v as TriAnnonces)}
                    >
                      <SelectTrigger className="w-36 h-8 text-[11px] border-aquiz-gray-lighter rounded-lg font-medium bg-white">
                        <ArrowDownUp className="h-3 w-3 text-aquiz-gray mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dateAjout-desc">Plus récentes</SelectItem>
                        <SelectItem value="prix-asc">Prix ↑</SelectItem>
                        <SelectItem value="prix-desc">Prix ↓</SelectItem>
                        <SelectItem value="prixM2-asc">€/m² ↑</SelectItem>
                        <SelectItem value="surface-desc">Surface ↓</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="hidden sm:flex bg-white rounded-lg p-0.5 border border-aquiz-gray-lighter">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-aquiz-gray-lightest text-aquiz-black' : 'text-aquiz-gray hover:text-aquiz-black'}`}
                      >
                        <Grid3X3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-aquiz-gray-lightest text-aquiz-black' : 'text-aquiz-gray hover:text-aquiz-black'}`}
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ═══ CONTENU ═══ */}
      <div className="flex-1">
        <div className={`mx-auto px-5 py-6 ${activeTab === 'comparaison' ? 'max-w-7xl' : 'max-w-5xl'}`}>

          {/* ─── TAB LISTE ─── */}
          {activeTab === 'liste' && (
            <>
              {/* Budget mobile */}
              {!comparateur.budgetMax && budgetSimulateur && (
                <div className="sm:hidden mb-4 flex items-center justify-between px-3 py-2 rounded-lg border border-aquiz-gray-lighter">
                  <span className="text-xs text-aquiz-gray flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Budget : <strong className="text-aquiz-black">{budgetSimulateur.toLocaleString('fr-FR')} €</strong>
                  </span>
                  <button onClick={handleImporterBudget} className="text-xs text-aquiz-green font-medium">Importer</button>
                </div>
              )}



              {/* Grille d'annonces */}
              <div className={`grid gap-5 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1 max-w-3xl'
              }`}>
                {annoncesFiltrees.map((annonce) => (
                  <AnnonceCard
                    key={annonce.id}
                    annonce={annonce}
                    isSelected={comparateur.annonceSelectionnees.includes(annonce.id)}
                    selectionDisabled={comparateur.annonceSelectionnees.length >= 4}
                    faisabilite={calculerFaisabilite(annonce.prix, comparateur.budgetMax)}
                    onSelect={() => comparateur.toggleSelection(annonce.id)}
                    onEdit={() => setEditingId(annonce.id)}
                    onDelete={() => comparateur.supprimerAnnonce(annonce.id)}
                    onToggleFavori={() => comparateur.toggleFavori(annonce.id)}
                    compact={viewMode === 'list'}
                  />
                ))}
              </div>
            </>
          )}

          {/* ─── TAB COMPARAISON ─── */}
          {activeTab === 'comparaison' && (
            <>
              {annoncesSelectionnees.length === 0 ? (
                <div className="bg-white rounded-2xl border border-aquiz-gray-lighter py-16 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-aquiz-green/10 flex items-center justify-center mx-auto mb-5">
                    <Scale className="h-7 w-7 text-aquiz-green" />
                  </div>
                  <h3 className="text-lg font-semibold text-aquiz-black mb-2">Prêt à comparer ?</h3>
                  <p className="text-sm text-aquiz-gray mb-6 max-w-sm mx-auto">
                    Sélectionnez entre 2 et 4 biens depuis l&apos;onglet Annonces
                  </p>
                  <Button
                    onClick={() => setActiveTab('liste')}
                    className="bg-aquiz-green hover:bg-aquiz-green/90 text-white rounded-xl"
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Voir mes annonces
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Header comparaison */}
                  <div className="bg-white rounded-2xl border border-aquiz-gray-lighter px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-aquiz-green/10 flex items-center justify-center">
                        <Scale className="h-4 w-4 text-aquiz-green" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-aquiz-black text-sm">
                          {annoncesSelectionnees.length} bien{annoncesSelectionnees.length > 1 ? 's' : ''} en comparaison
                        </h2>
                        <p className="text-[11px] text-aquiz-gray">Analyse comparative détaillée</p>
                      </div>
                    </div>
                    <button
                      onClick={() => comparateur.deselectionnerTout()}
                      className="flex items-center gap-1.5 text-xs text-aquiz-gray hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Réinitialiser</span>
                    </button>
                  </div>

                  {/* Tableau */}
                  <div className="bg-white rounded-2xl border border-aquiz-gray-lighter overflow-hidden">
                    <TableauComparaison
                      annonces={annoncesSelectionnees}
                      statistiques={statsSelection}
                      budgetMax={comparateur.budgetMax}
                      onRemove={(id) => comparateur.toggleSelection(id)}
                      onRequestHelp={() => setShowContactModal(true)}
                      tauxInteret={parametresModeA?.tauxInteret ?? parametresModeB?.tauxInteret}
                      dureeAns={parametresModeA?.dureeAns ?? parametresModeB?.dureeAns}
                      apport={parametresModeA?.apport ?? parametresModeB?.apport}
                    />
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* Modal Contact */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />

      {/* ═══ FLOATING SELECTION BAR ═══ */}
      {selCount > 0 && activeTab === 'liste' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-aquiz-black text-white shadow-xl shadow-black/20">
            <div className="w-7 h-7 rounded-lg bg-aquiz-green flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">
              {selCount} sélectionné{selCount > 1 ? 's' : ''}
            </span>
            {selCount >= 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white/80 font-medium">Max</span>
            )}
            <div className="w-px h-5 bg-white/20" />
            <button
              onClick={() => comparateur.deselectionnerTout()}
              className="text-xs text-white/60 hover:text-white transition-colors whitespace-nowrap"
            >
              Effacer
            </button>
            {selCount >= 2 && (
              <button
                onClick={() => setActiveTab('comparaison')}
                className="flex items-center gap-1.5 text-xs font-semibold bg-aquiz-green hover:bg-aquiz-green/90 text-white px-3.5 py-1.5 rounded-xl transition-colors whitespace-nowrap"
              >
                Comparer
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ SHEET AJOUT / MODIFICATION ═══ */}
      <Sheet
        open={showForm || !!editingId}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false)
            setEditingId(null)
          }
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:max-w-xl p-0 flex flex-col"
        >
          {/* Header du panel */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-aquiz-gray-lighter bg-aquiz-gray-lightest/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
                {editingId ? (
                  <ScanSearch className="w-4 h-4 text-aquiz-green" />
                ) : (
                  <Plus className="w-4 h-4 text-aquiz-green" />
                )}
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-aquiz-black">
                  {editingId ? 'Modifier l\'annonce' : 'Ajouter une annonce'}
                </SheetTitle>
                <SheetDescription className="text-xs text-aquiz-gray mt-0.5">
                  {editingId
                    ? 'Modifiez les informations du bien'
                    : 'Collez un lien, du texte, ou remplissez manuellement'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            <FormulaireAnnonce
              editMode={!!editingId}
              initialValues={annonceEnEdition || undefined}
              onSubmit={editingId ? handleModifierAnnonce : handleAjouterAnnonce}
              onCancel={() => { setShowForm(false); setEditingId(null) }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
