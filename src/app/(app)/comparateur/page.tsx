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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FadeIn } from '@/components/vitrine/Motion'
import {
    calculerStatistiques,
    getAnnoncesFiltrees,
    getAnnoncesSelectionnees,
    useComparateurStore
} from '@/stores/useComparateurStore'
import { useSimulateurStore } from '@/stores/useSimulateurStore'
import type { AnalyseFaisabilite, NouvelleAnnonce, TriAnnonces } from '@/types/annonces'
import { motion } from 'framer-motion'
import {
    ArrowRight,
    Calculator,
    Check,
    Grid3X3,
    Import,
    Info,
    LayoutGrid,
    List,
    Plus,
    RotateCcw,
    Scale,
    X
} from 'lucide-react'
import Image from 'next/image'
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
  }
  
  const handleModifierAnnonce = (data: NouvelleAnnonce) => {
    if (editingId) {
      comparateur.modifierAnnonce(editingId, data)
      setEditingId(null)
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
  
  return (
    <div className="min-h-screen flex flex-col">
      <h1 className="sr-only">Comparateur de biens immobiliers</h1>
      
      {/* ─── Header — même pattern que simulateur ─── */}
      <section className="relative bg-aquiz-black overflow-hidden">
        {/* Photo de fond */}
        <div className="absolute inset-0">
          <Image
            src="/images/parquet-moulures.jpg"
            alt="Intérieur parisien"
            fill
            className="object-cover grayscale opacity-30"
            priority
            quality={85}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-b from-aquiz-black/50 via-aquiz-black/70 to-aquiz-black" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 md:pt-12 md:pb-14 text-center">
          <motion.p
            className="text-xs font-medium tracking-[0.2em] uppercase text-aquiz-green mb-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Outil de comparaison
          </motion.p>

          <motion.h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-[1.15] tracking-tight mb-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Comparateur d&apos;<span className="text-aquiz-green">annonces</span>
          </motion.h2>

          <motion.div
            className="mx-auto w-12 h-px bg-white/20 mb-3"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          />

          <motion.p
            className="text-sm text-white/45 max-w-md mx-auto font-light leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Comparez jusqu&apos;à 4 biens côte à côte pour faire le meilleur choix
          </motion.p>
        </div>

        {/* Curved bottom */}
        <div className="absolute -bottom-px left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 36" fill="none" preserveAspectRatio="none" className="w-full h-5 md:h-9 block">
            <path d="M0 36V24Q360 0 720 0Q1080 0 1440 24V36H0Z" fill="#f3f4f6" />
          </svg>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 bg-aquiz-gray-lightest">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">

        {/* Budget — design épuré */}
        <FadeIn>
        {comparateur.budgetMax ? (
          <div className="mb-6 bg-white rounded-2xl border border-aquiz-green/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-aquiz-green/10 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-aquiz-green" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-aquiz-green uppercase tracking-wider">Budget max</span>
                <p className="font-bold text-aquiz-black text-lg leading-tight">
                  {comparateur.budgetMax.toLocaleString('fr-FR')} €
                </p>
              </div>
            </div>
            <button
              onClick={() => comparateur.setBudgetMax(null)}
              className="p-2 rounded-xl hover:bg-aquiz-gray-lightest transition-colors"
            >
              <X className="h-4 w-4 text-aquiz-gray" />
            </button>
          </div>
        ) : budgetSimulateur ? (
          <div className="mb-6 bg-white rounded-2xl border border-aquiz-gray-lighter p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-aquiz-gray-lightest flex items-center justify-center">
                <Info className="h-4 w-4 text-aquiz-gray" />
              </div>
              <span className="text-sm text-aquiz-gray">
                Budget détecté : <strong className="text-aquiz-black">{budgetSimulateur.toLocaleString('fr-FR')} €</strong>
              </span>
            </div>
            <Button 
              size="sm"
              onClick={handleImporterBudget}
              className="bg-aquiz-green hover:bg-aquiz-green/90 text-white rounded-xl"
            >
              <Import className="h-4 w-4 mr-2" />
              Importer
            </Button>
          </div>
        ) : (
          <div className="mb-6 bg-white rounded-2xl border border-dashed border-aquiz-gray-lighter p-4 text-center">
            <p className="text-sm text-aquiz-gray">
              Aucun budget défini — 
              <Link href="/simulateur/mode-a" className="text-aquiz-green font-medium hover:underline underline-offset-2">
                Faire une simulation
              </Link>
            </p>
          </div>
        )}
        </FadeIn>
        
        {/* Onglets */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <FadeIn delay={0.05}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <TabsList className="h-auto p-0 bg-transparent gap-2">
              <TabsTrigger 
                value="liste" 
                className="gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-white border border-aquiz-gray-lighter text-aquiz-gray transition-all data-[state=active]:bg-aquiz-black data-[state=active]:text-white data-[state=active]:border-aquiz-black"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Mes annonces</span>
                {comparateur.annonces.length > 0 && (
                  <span className="text-xs font-medium opacity-70">
                    {comparateur.annonces.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="comparaison" 
                className="gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-white border border-aquiz-gray-lighter text-aquiz-gray transition-all data-[state=active]:bg-aquiz-green data-[state=active]:text-white data-[state=active]:border-aquiz-green"
              >
                <Scale className="h-4 w-4" />
                <span>Comparaison</span>
                {annoncesSelectionnees.length > 0 && (
                  <span className="text-xs font-semibold bg-white/20 px-1.5 py-0.5 rounded">
                    {annoncesSelectionnees.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'liste' && (
              <div className="flex items-center gap-2">
                <Select
                  value={comparateur.tri}
                  onValueChange={(v) => comparateur.setTri(v as TriAnnonces)}
                >
                  <SelectTrigger className="w-40 h-9 text-sm border-aquiz-gray-lighter bg-white rounded-xl">
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
                
                <div className="flex bg-white border border-aquiz-gray-lighter rounded-xl p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-aquiz-gray-lightest text-aquiz-black' 
                        : 'text-aquiz-gray hover:text-aquiz-black'
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-aquiz-gray-lightest text-aquiz-black' 
                        : 'text-aquiz-gray hover:text-aquiz-black'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
                
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-aquiz-black hover:bg-aquiz-black/90 text-white h-9 rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            )}
          </div>
          </FadeIn>
          
          {/* Tab Liste */}
          <TabsContent value="liste">
            {/* Formulaire ajout/édition */}
            {(showForm || editingId) && (
              <FadeIn>
              <div className="mb-6 bg-white rounded-2xl border border-aquiz-gray-lighter shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter bg-aquiz-gray-lightest flex items-center justify-between">
                  <h3 className="font-semibold text-aquiz-black text-sm">
                    {editingId ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowForm(false)
                      setEditingId(null)
                    }}
                    className="text-aquiz-gray hover:text-aquiz-black p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-5">
                  <FormulaireAnnonce
                    editMode={!!editingId}
                    initialValues={annonceEnEdition || undefined}
                    onSubmit={editingId ? handleModifierAnnonce : handleAjouterAnnonce}
                    onCancel={() => {
                      setShowForm(false)
                      setEditingId(null)
                    }}
                  />
                </div>
              </div>
              </FadeIn>
            )}
            
            {/* Liste vide */}
            {comparateur.annonces.length === 0 && !showForm && (
              <FadeIn>
              <div className="bg-white rounded-2xl border border-aquiz-gray-lighter shadow-sm">
                {/* Mini stepper */}
                <div className="flex items-center justify-center gap-6 py-4 border-b border-aquiz-gray-lighter text-sm">
                  <div className="flex items-center gap-2 text-aquiz-green">
                    <span className="w-6 h-6 rounded-md bg-aquiz-green text-white text-xs font-bold flex items-center justify-center">1</span>
                    <span className="font-medium">Ajouter</span>
                  </div>
                  <div className="w-4 h-px bg-aquiz-gray-lighter" />
                  <div className="flex items-center gap-2 text-aquiz-gray opacity-50">
                    <span className="w-6 h-6 rounded-md bg-aquiz-gray-lighter text-xs font-medium flex items-center justify-center">2</span>
                    <span>Sélectionner</span>
                  </div>
                  <div className="w-4 h-px bg-aquiz-gray-lighter" />
                  <div className="flex items-center gap-2 text-aquiz-gray opacity-50">
                    <span className="w-6 h-6 rounded-md bg-aquiz-gray-lighter text-xs font-medium flex items-center justify-center">3</span>
                    <span>Comparer</span>
                  </div>
                </div>
                
                {/* Formulaire inline */}
                <div className="p-5">
                  <FormulaireAnnonce
                    onSubmit={handleAjouterAnnonce}
                  />
                </div>
              </div>
              </FadeIn>
            )}
            
            {/* Grille d'annonces */}
            {comparateur.annonces.length > 0 && (
              <>
                {/* Stepper de progression */}
                <div className="mb-4 flex items-center justify-center gap-8 py-3 text-sm">
                  <div className="flex items-center gap-2 text-aquiz-green">
                    <span className="w-6 h-6 rounded-md bg-aquiz-green text-white text-xs font-medium flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-medium">Ajouter</span>
                  </div>
                  <div className="w-6 h-px bg-aquiz-gray-lighter" />
                  <div className={`flex items-center gap-2 ${annoncesSelectionnees.length >= 2 ? 'text-aquiz-green' : 'text-aquiz-gray'}`}>
                    <span className={`w-6 h-6 rounded-md text-xs font-medium flex items-center justify-center ${
                      annoncesSelectionnees.length >= 2 
                        ? 'bg-aquiz-green text-white' 
                        : 'bg-aquiz-gray-lighter text-aquiz-gray'
                    }`}>
                      {annoncesSelectionnees.length >= 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                    </span>
                    <span className="font-medium">
                      Sélectionner
                      {annoncesSelectionnees.length > 0 && annoncesSelectionnees.length < 2 && (
                        <span className="text-orange-500 ml-1">({annoncesSelectionnees.length}/2 min)</span>
                      )}
                      {annoncesSelectionnees.length >= 2 && (
                        <span className="text-aquiz-green ml-1">({annoncesSelectionnees.length})</span>
                      )}
                    </span>
                  </div>
                  <div className="w-6 h-px bg-aquiz-gray-lighter" />
                  <div className={`flex items-center gap-2 ${annoncesSelectionnees.length >= 2 ? 'text-aquiz-black' : 'text-aquiz-gray opacity-50'}`}>
                    <span className={`w-6 h-6 rounded-md text-xs font-medium flex items-center justify-center ${
                      annoncesSelectionnees.length >= 2 
                        ? 'bg-aquiz-black text-white' 
                        : 'bg-aquiz-gray-lighter text-aquiz-gray'
                    }`}>3</span>
                    {annoncesSelectionnees.length >= 2 ? (
                      <button
                        onClick={() => setActiveTab('comparaison')}
                        className="font-medium hover:text-aquiz-green transition-colors flex items-center gap-1"
                      >
                        Comparer
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="font-medium">Comparer</span>
                    )}
                  </div>
                </div>
                
                {/* Barre de sélection - Design AQUIZ */}
                {annoncesSelectionnees.length > 0 && (
                  <div className="mb-4 bg-aquiz-green/10 rounded-xl p-4 border border-aquiz-green/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-aquiz-green/20 flex items-center justify-center">
                          <Check className="h-4 w-4 text-aquiz-green" />
                        </div>
                        <span className="text-sm font-medium text-aquiz-black">
                          {annoncesSelectionnees.length} sélectionné{annoncesSelectionnees.length > 1 ? 's' : ''}
                        </span>
                        {annoncesSelectionnees.length >= 4 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-aquiz-green/20 text-aquiz-green">Maximum</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => comparateur.deselectionnerTout()}
                          className="text-sm text-aquiz-gray hover:text-aquiz-black px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
                        >
                          Réinitialiser
                        </button>
                        <Button
                          size="sm"
                          className="bg-aquiz-green hover:bg-aquiz-green/90 text-white"
                          onClick={() => setActiveTab('comparaison')}
                        >
                          <Scale className="h-4 w-4 mr-2" />
                          Comparer
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                    : 'grid-cols-1'
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
          </TabsContent>
          
          {/* Tab Comparaison */}
          <TabsContent value="comparaison">
            {annoncesSelectionnees.length === 0 ? (
              <FadeIn>
              <div className="bg-white rounded-2xl border border-aquiz-gray-lighter shadow-sm">
                <div className="py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-aquiz-green/10 flex items-center justify-center mx-auto mb-6">
                    <Scale className="h-8 w-8 text-aquiz-green" />
                  </div>
                  <h3 className="text-lg font-semibold text-aquiz-black mb-2">
                    Prêt à comparer ?
                  </h3>
                  <p className="text-aquiz-gray mb-2">
                    Sélectionnez entre 2 et 4 biens depuis l&apos;onglet &quot;Mes annonces&quot;
                  </p>
                  <p className="text-sm text-aquiz-gray/70 mb-8">
                    Cliquez simplement sur les cartes pour les ajouter à la comparaison
                  </p>
                  <Button 
                    onClick={() => setActiveTab('liste')}
                    className="bg-aquiz-green hover:bg-aquiz-green/90 text-white rounded-xl"
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Voir mes annonces
                  </Button>
                </div>
              </div>
              </FadeIn>
            ) : (
              <FadeIn>
              <div className="space-y-6">
                {/* Header section comparaison - Design AQUIZ Pro */}
                <div className="bg-white rounded-2xl border border-aquiz-gray-lighter shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-aquiz-green/10 flex items-center justify-center">
                        <Scale className="h-5 w-5 text-aquiz-green" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-aquiz-black">
                          {annoncesSelectionnees.length} bien{annoncesSelectionnees.length > 1 ? 's' : ''} en comparaison
                        </h2>
                        <p className="text-xs text-aquiz-gray">Analyse comparative détaillée</p>
                      </div>
                    </div>
                    <button
                      onClick={() => comparateur.deselectionnerTout()}
                      className="flex items-center gap-2 text-sm text-aquiz-gray hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="hidden sm:inline">Réinitialiser</span>
                    </button>
                  </div>
                </div>
                
                {/* Tableau de comparaison avec analyse intégrée */}
                <div className="bg-white rounded-2xl border border-aquiz-gray-lighter shadow-sm overflow-hidden">
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
              </FadeIn>
            )}
          </TabsContent>
        </Tabs>

        {/* Trust footer */}
        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-aquiz-gray-light">
          <span>Données DVF data.gouv.fr</span>
          <span className="w-px h-3 bg-aquiz-gray-lighter" />
          <span>Conforme HCSF</span>
          <span className="w-px h-3 bg-aquiz-gray-lighter" />
          <span>Aucune donnée partagée</span>
        </div>

        </div>
      </main>
      
      {/* Modal Contact */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </div>
  )
}
