'use client'

import { trackEvent } from '@/lib/analytics'
import { getUtmData } from '@/lib/utm'

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
import { AnalyseIA } from '@/components/comparateur/AnalyseIA'
import { AnnonceSkeletonGrid } from '@/components/comparateur/AnnonceCardSkeleton'
import { ConfirmDeleteDialog } from '@/components/comparateur/ConfirmDeleteDialog'
import type { AnnonceScoreData } from '@/components/comparateur/EmailComparisonModal'
import { countActiveFilters, FiltresPanel, FiltresToggle } from '@/components/comparateur/FiltresBar'

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
import { calculerFaisabilite } from '@/lib/comparateur/faisabilite'
import { genererSyntheseComparaison, scoreToRadarData } from '@/lib/comparateur/scoreComparateur'
import {
    calculerStatistiques,
    getAnnoncesFiltrees,
    getAnnoncesSelectionnees,
    useComparateurStore
} from '@/stores/useComparateurStore'
import { hasValidEmail, useLeadStore } from '@/stores/useLeadStore'
import { useSimulateurStore } from '@/stores/useSimulateurStore'
import type { FiltresAnnonces, NouvelleAnnonce, TriAnnonces } from '@/types/annonces'
import {
    ArrowDownUp,
    ArrowLeft,
    ArrowRight,
    BarChart3,
    Check,
    CheckSquare,
    ChevronLeft,
    FileDown,
    Grid3X3,
    Heart,
    Import,
    Info,
    LayoutGrid,
    List,
    Loader2,
    Mail,
    MapPin,
    Plus,
    RotateCcw,
    Scale,
    ScanSearch,
    Share2,
    ShieldCheck,
    Sparkles,
    Square,
    Trash2,
    TrendingUp,
    X
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

// ============================================
// HELPERS
// ============================================

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ComparateurPage() {
  // Stores — shallow selector to avoid re-renders on unrelated state changes
  const comparateur = useComparateurStore(
    useShallow(s => ({
      annonces: s.annonces,
      annonceSelectionnees: s.annonceSelectionnees,
      filtres: s.filtres,
      tri: s.tri,
      budgetMax: s.budgetMax,
      ajouterAnnonce: s.ajouterAnnonce,
      modifierAnnonce: s.modifierAnnonce,
      setBudgetMax: s.setBudgetMax,
      supprimerAnnonce: s.supprimerAnnonce,
      supprimerPlusieurs: s.supprimerPlusieurs,
      setTri: s.setTri,
      setFiltres: s.setFiltres,
      toggleSelection: s.toggleSelection,
      dupliquerAnnonce: s.dupliquerAnnonce,
      toggleFavori: s.toggleFavori,
      deselectionnerTout: s.deselectionnerTout,
    }))
  )
  const { resultats, parametresModeA, parametresModeB } = useSimulateurStore()
  
  // États locaux
  const [showForm, setShowForm] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [scoresForEmail, setScoresForEmail] = useState<AnnonceScoreData[]>([])
  const handleScoresReady = useCallback((scores: AnnonceScoreData[]) => {
    setScoresForEmail(scores)
  }, [])
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfEmailValue, setPdfEmailValue] = useState('')
  const [pdfEmailSent, setPdfEmailSent] = useState(false)
  const [pdfEmailLoading, setPdfEmailLoading] = useState(false)
  const leadStore = useLeadStore()
  const hasLead = useLeadStore(hasValidEmail)
  const [syntheseIA, setSyntheseIA] = useState<{ synthese: string; verdictFinal: string; conseilNego: string; conseilAcquisition: string } | null>(null)
  const syntheseIARef = useRef(syntheseIA)
  useEffect(() => { syntheseIARef.current = syntheseIA }, [syntheseIA])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'liste' | 'comparaison'>('liste')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filtresOpen, setFiltresOpen] = useState(false)
  const filtresActiveCount = useMemo(() => countActiveFilters(comparateur.filtres), [comparateur.filtres])
  // Mode gestion (sélection multiple pour suppression)
  const [manageMode, setManageMode] = useState(false)
  const [manageIds, setManageIds] = useState<Set<string>>(new Set())
  // Confirmation de suppression
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; ids: string[]; title?: string }>({
    open: false, ids: []
  })
  const hydrated = useComparateurStore(s => s._hasHydrated)
  
  // Données calculées
  const annoncesFiltrees = getAnnoncesFiltrees(comparateur)
  const annoncesSelectionnees = getAnnoncesSelectionnees(comparateur)
  const selCount = annoncesSelectionnees.length
  const nbFavoris = useMemo(() => comparateur.annonces.filter(a => a.favori).length, [comparateur.annonces])

  /** Map pré-calculée des faisabilités — évite de recalculer dans chaque AnnonceCard + CarteAnnonces */
  const faisabilitesMap = useMemo(
    () => new Map(comparateur.annonces.map(a => [a.id, calculerFaisabilite(a.prix, comparateur.budgetMax, a.anneeConstruction)])),
    [comparateur.annonces, comparateur.budgetMax]
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
    setManageMode(false)
    setManageIds(new Set())
    // Scroll vers le haut pour voir la nouvelle annonce
    window.scrollTo({ top: 0, behavior: 'smooth' })
    trackEvent('comparaison', { prix: data.prix, surface: data.surface, ville: data.ville, type: data.type, nbAnnonces: comparateur.annonces.length + 1 })
  }
  
  const handleModifierAnnonce = (data: NouvelleAnnonce) => {
    if (editingId) {
      comparateur.modifierAnnonce(editingId, data)
      setEditingId(null)
      setManageMode(false)
      setManageIds(new Set())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  
  const handleImporterBudget = () => {
    if (budgetSimulateur) {
      comparateur.setBudgetMax(budgetSimulateur)
    }
  }

  // ─── Export PDF — Rapport Comparaison Professionnel ───
  const generateComparateurPDF = useCallback(async () => {
    if (annoncesSelectionnees.length === 0 || scoresForEmail.length === 0) return
    setPdfLoading(true)

    try {
      // Attendre la synthèse IA (max 15s) si pas encore prête
      let iaData = syntheseIARef.current
      if (!iaData) {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 500))
          iaData = syntheseIARef.current
          if (iaData) break
        }
      }

      // ── Fallback : appel API direct si toujours pas de synthèse IA ──
      if (!iaData) {
        console.log('[PDF] Synthèse IA non reçue du composant, appel API direct...')
        try {
          const classementTmp = genererSyntheseComparaison(
            scoresForEmail
          )
          const classementMapTmp = new Map(classementTmp.classement.map(c => [c.annonceId, c.rang]))

          const biens = annoncesSelectionnees.map(a => {
            const score = scoresForEmail.find(s => s.annonceId === a.id)
            const rang = classementMapTmp.get(a.id) ?? 99
            return {
              id: a.id,
              titre: a.titre || `${a.type === 'maison' ? 'Maison' : 'Appt'} ${a.pieces}p - ${a.ville}`,
              prix: a.prix,
              surface: a.surface,
              prixM2: a.prixM2,
              type: a.type,
              pieces: a.pieces,
              chambres: a.chambres,
              ville: a.ville,
              codePostal: a.codePostal,
              dpe: a.dpe,
              etage: a.etage,
              anneeConstruction: a.anneeConstruction,
              parking: a.parking,
              balconTerrasse: a.balconTerrasse,
              cave: a.cave,
              ascenseur: a.ascenseur,
              chargesMensuelles: a.chargesMensuelles,
              taxeFonciere: a.taxeFonciere,
              scoreGlobal: score?.scoreGlobal ?? 0,
              rang,
              verdict: score?.verdict ?? '',
              confiance: score?.confiance ?? 0,
              axes: (score?.axes ?? []).filter(ax => ax.disponible).map(ax => ({
                label: ax.label,
                score: ax.score,
                detail: ax.detail,
                impact: ax.impact,
              })),
              estimations: score?.estimations ?? {},
              avantages: (score?.points ?? []).filter(p => p.type === 'avantage').map(p => p.texte),
              attentions: (score?.points ?? []).filter(p => p.type === 'attention').map(p => p.texte),
              conseilPerso: score?.conseilPerso ?? '',
            }
          })

          const resp = await fetch('/api/analyse/synthese-ia-comparaison', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              biens,
              budgetMax: comparateur.budgetMax,
              syntheseDeterministe: classementTmp.syntheseGlobale,
            }),
          })
          const json = await resp.json()
          if (json.success && json.data) {
            iaData = {
              synthese: json.data.synthese || '',
              verdictFinal: json.data.verdictFinal || '',
              conseilNego: json.data.conseilNego || '',
              conseilAcquisition: json.data.conseilAcquisition || '',
            }
            // Mettre à jour le state pour les futurs PDFs
            setSyntheseIA(iaData)
            console.log(`[PDF] Synthèse IA récupérée en direct (source: ${json.source})`)
          }
        } catch (directErr) {
          console.warn('[PDF] Appel API direct IA échoué, PDF sans IA:', directErr)
        }
      }

      const logoUrl = `${window.location.origin}/logo-aquiz-white.png`
      const { pdf } = await import('@react-pdf/renderer')
      const { ComparateurPDF } = await import('@/components/pdf/ComparateurPDF')

      // Synthèse déterministe à partir des scores
      const synthese = genererSyntheseComparaison(
        scoresForEmail
      )

      // Classer les annonces
      const classementMap = new Map(synthese.classement.map(c => [c.annonceId, c.rang]))

      // Construire les données PDF enrichies
      const annoncesPDF = annoncesSelectionnees.map(a => {
        const score = scoresForEmail.find(s => s.annonceId === a.id)
        const rang = classementMap.get(a.id) ?? 99
        const radarData = score 
          ? scoreToRadarData(score) 
          : []

        return {
          id: a.id,
          titre: a.titre,
          prix: a.prix,
          surface: a.surface,
          prixM2: a.prixM2,
          type: a.type,
          pieces: a.pieces,
          chambres: a.chambres,
          ville: a.ville,
          codePostal: a.codePostal,
          dpe: a.dpe,
          ges: a.ges,
          etage: a.etage,
          etagesTotal: a.etagesTotal,
          anneeConstruction: a.anneeConstruction,
          orientation: a.orientation,
          nbSallesBains: a.nbSallesBains,
          parking: a.parking,
          balconTerrasse: a.balconTerrasse,
          cave: a.cave,
          ascenseur: a.ascenseur,
          chargesMensuelles: a.chargesMensuelles,
          taxeFonciere: a.taxeFonciere,
          // Scoring
          scoreGlobal: score?.scoreGlobal ?? 0,
          verdict: score?.verdict ?? '',
          recommandation: score?.recommandation ?? 'a_etudier',
          conseilPerso: score?.conseilPerso ?? '',
          confiance: score?.confiance ?? 0,
          axes: (score?.axes ?? []).map(ax => ({
            axe: ax.axe,
            label: ax.label,
            score: ax.score,
            poids: ax.poids ?? 10,
            disponible: ax.disponible,
            detail: ax.detail,
            impact: ax.impact,
          })),
          points: score?.points ?? [],
          estimations: score?.estimations,
          enrichissement: score?.enrichissement ? {
            marche: score.enrichissement.marche ? {
              ...score.enrichissement.marche,
              evolution12Mois: score.enrichissement.marche.evolution12Mois,
              nbTransactions: score.enrichissement.marche.nbTransactions,
            } : undefined,
            risques: score.enrichissement.risques ? {
              ...score.enrichissement.risques,
              zoneInondable: (score.enrichissement.risques as Record<string, unknown>).zoneInondable as boolean | undefined,
              niveauRadon: (score.enrichissement.risques as Record<string, unknown>).niveauRadon as number | undefined,
            } : undefined,
            quartier: score.enrichissement.quartier ? {
              ...score.enrichissement.quartier,
              sante: (score.enrichissement.quartier as Record<string, unknown>).sante as number | undefined,
              espaceVerts: (score.enrichissement.quartier as Record<string, unknown>).espaceVerts as number | undefined,
              counts: (score.enrichissement.quartier as Record<string, unknown>).counts as { transport: number; commerce: number; education: number; sante: number; loisirs: number; vert: number } | undefined,
            } : undefined,
            communeInfos: score.enrichissement.communeInfos ?? undefined,
          } : undefined,
          radarData,
          rang,
        }
      }).sort((a, b) => a.rang - b.rang)

      const tauxPDF = parametresModeA?.tauxInteret ?? parametresModeB?.tauxInteret
      const dureePDF = parametresModeA?.dureeAns ?? parametresModeB?.dureeAns
      const apportPDF = parametresModeA?.apport ?? parametresModeB?.apport

      const blob = await pdf(
        <ComparateurPDF
          logoUrl={logoUrl}
          annonces={annoncesPDF}
          syntheseDeterministe={synthese.syntheseGlobale}
          conseilGeneral={synthese.conseilGeneral}
          budgetMax={comparateur.budgetMax}
          dateGeneration={new Date().toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
          })}
          syntheseIA={iaData}
          tauxInteret={tauxPDF}
          dureeAns={dureePDF}
          apport={apportPDF}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const dateFile = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
      link.download = `AQUIZ-Comparaison-${annoncesSelectionnees.length}biens-${dateFile}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erreur génération PDF comparateur:', err)
    } finally {
      setPdfLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annoncesSelectionnees, scoresForEmail, comparateur.budgetMax, parametresModeA, parametresModeB, syntheseIA])

  /** Capture email + génère le PDF comparateur */
  const handleSendPdfEmail = useCallback(async () => {
    if (!pdfEmailValue || pdfEmailLoading) return
    setPdfEmailLoading(true)
    try {
      // 1. Capture lead (non-bloquant)
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: pdfEmailValue,
            source: 'comparateur',
            contexte: { nbBiens: annoncesSelectionnees.length, budgetMax: comparateur.budgetMax, ...getUtmData() }
          })
        })
        if (res.ok) {
          leadStore.capture(pdfEmailValue, 'comparateur', undefined, {
            nbBiens: annoncesSelectionnees.length,
            budgetMax: comparateur.budgetMax
          })
        }
      } catch { /* lead capture failed — continue anyway */ }
      // 2. Générer le PDF
      await generateComparateurPDF()
      setPdfEmailSent(true)
    } catch (err) {
      console.error('Erreur envoi lead comparateur', err)
    } finally {
      setPdfEmailLoading(false)
    }
  }, [pdfEmailValue, pdfEmailLoading, annoncesSelectionnees.length, comparateur.budgetMax, leadStore, generateComparateurPDF])

  // Auto-fill email depuis le lead store si déjà capturé
  useEffect(() => {
    if (hasLead && leadStore.email && !pdfEmailValue) {
      setPdfEmailValue(leadStore.email)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLead, leadStore.email])

  const annonceEnEdition = editingId 
    ? comparateur.annonces.find((a) => a.id === editingId)
    : null

  // ─── Manage mode handlers ───
  const handleManageToggle = useCallback((id: string) => {
    setManageIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAllManage = useCallback(() => {
    const allIds = annoncesFiltrees.map(a => a.id)
    const allSelected = allIds.every(id => manageIds.has(id))
    if (allSelected) {
      setManageIds(new Set())
    } else {
      setManageIds(new Set(allIds))
    }
  }, [annoncesFiltrees, manageIds])

  const handleExitManageMode = useCallback(() => {
    setManageMode(false)
    setManageIds(new Set())
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirm.ids.length === 1) {
      comparateur.supprimerAnnonce(deleteConfirm.ids[0])
    } else if (deleteConfirm.ids.length > 1) {
      comparateur.supprimerPlusieurs(deleteConfirm.ids)
    }
    setDeleteConfirm({ open: false, ids: [] })
    // Quitter le mode gestion après suppression bulk
    if (deleteConfirm.ids.length > 1) {
      handleExitManageMode()
    }
  }, [deleteConfirm, comparateur, handleExitManageMode])
  
  // ─────────────── ÉTAT VIDE ───────────────
  if (comparateur.annonces.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">

        {/* Mobile back nav */}
        <div className="sm:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="flex items-center justify-between px-4 h-12">
            <Link
              href="/"
              className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors -ml-1"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-[13px] font-medium">Retour</span>
            </Link>
            <span className="text-[13px] font-bold text-aquiz-black">Comparateur</span>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Header compact */}
        <section className="pt-4 sm:pt-6 pb-4 sm:pb-5 md:pt-8 md:pb-6 border-b border-aquiz-gray-lighter bg-linear-to-b from-aquiz-green/5 to-white">
          <div className="max-w-2xl mx-auto px-4 sm:px-5 text-center">
            <h2 className="text-lg sm:text-xl md:text-3xl font-extrabold text-aquiz-black tracking-tight leading-tight">
              Comparez vos annonces
            </h2>
            <p className="mt-1.5 sm:mt-2 text-[12px] sm:text-sm text-aquiz-gray-light max-w-md mx-auto leading-relaxed">
              Ajoutez 2 à 4 biens et obtenez une analyse complète.
            </p>

            {/* Value props */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-2.5 sm:mt-3">
              {[
                { icon: TrendingUp, label: 'Prix vs Marché' },
                { icon: ShieldCheck, label: 'Risques zone' },
                { icon: MapPin, label: 'Score quartier' },
                { icon: Sparkles, label: 'Score 10 axes' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-aquiz-gray-lightest border border-aquiz-gray-lighter/50 text-[10px] sm:text-[11px] text-aquiz-gray-dark font-medium">
                  <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-aquiz-green" />
                  {label}
                </span>
              ))}
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-2.5 sm:mt-3 text-[9px] sm:text-[10px] text-aquiz-gray">
              <span className="flex items-center gap-1"><BarChart3 className="w-2.5 h-2.5" /> +2 000 comparatifs</span>
              <span>•</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> Données vérifiées</span>
            </div>
          </div>
        </section>

        {/* Formulaire */}
        <div className="flex-1 flex flex-col px-3 sm:px-5 pt-4 sm:pt-5 pb-8 sm:pb-10">
          <div className="w-full max-w-4xl mx-auto">
            <FormulaireAnnonce onSubmit={handleAjouterAnnonce} />
          </div>
          <p className="text-center text-[11px] sm:text-xs text-aquiz-gray-light mt-6 sm:mt-8">
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

      {/* ═══ MOBILE BACK NAV ═══ */}
      <div className="sm:hidden sticky top-0 z-30 bg-white border-b border-gray-100">
        {/* Top row: back + title + add */}
        <div className="flex items-center justify-between px-3 h-11">
          <Link
            href="/"
            className="flex items-center gap-1 text-aquiz-gray hover:text-aquiz-black transition-colors -ml-1"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[13px] font-medium">Retour</span>
          </Link>
          <span className="text-[13px] font-bold text-aquiz-black">Comparateur</span>
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="bg-aquiz-green hover:bg-aquiz-green/90 text-white h-7 rounded-lg text-[11px] font-semibold px-2.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>

        {/* Bottom row: tabs + filter/sort */}
        <div className="flex items-center justify-between px-3 pb-2 gap-2">
          {/* Tabs */}
          <div role="tablist" aria-label="Navigation comparateur" className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg shrink-0">
            <button
              role="tab"
              aria-selected={activeTab === 'liste'}
              aria-controls="tabpanel-liste"
              onClick={() => setActiveTab('liste')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                activeTab === 'liste'
                  ? 'bg-white text-aquiz-black shadow-sm'
                  : 'text-aquiz-gray'
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              Annonces
              <span className={`text-[9px] min-w-[14px] text-center px-0.5 py-px rounded-full font-bold ${
                activeTab === 'liste' ? 'bg-aquiz-black text-white' : 'bg-gray-300/60 text-aquiz-gray'
              }`}>{comparateur.annonces.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'comparaison'}
              aria-controls="tabpanel-comparaison"
              onClick={() => setActiveTab('comparaison')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                activeTab === 'comparaison'
                  ? 'bg-white text-aquiz-green shadow-sm'
                  : 'text-aquiz-gray'
              }`}
            >
              <Scale className="h-3 w-3" />
              Comparer
              {selCount > 0 && (
                <span className={`text-[9px] min-w-[14px] text-center px-0.5 py-px rounded-full font-bold ${
                  activeTab === 'comparaison' ? 'bg-aquiz-green text-white' : 'bg-aquiz-green/15 text-aquiz-green'
                }`}>{selCount}</span>
              )}
            </button>
          </div>

          {/* Controls */}
          {activeTab === 'liste' && (
            <div className="flex items-center gap-1 shrink-0">
              <FiltresToggle
                isOpen={filtresOpen}
                onToggle={() => setFiltresOpen(!filtresOpen)}
                activeCount={filtresActiveCount}
              />
              <Select
                value={comparateur.tri}
                onValueChange={(v) => comparateur.setTri(v as TriAnnonces)}
              >
                <SelectTrigger className="h-7 text-[10px] border-aquiz-gray-lighter rounded-lg font-medium bg-white w-8 px-1.5 justify-center [&>svg:last-child]:hidden">
                  <ArrowDownUp className="h-3 w-3 text-aquiz-gray shrink-0" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dateAjout-desc">Plus récentes</SelectItem>
                  <SelectItem value="prix-asc">Prix ↑</SelectItem>
                  <SelectItem value="prix-desc">Prix ↓</SelectItem>
                  <SelectItem value="prixM2-asc">€/m² ↑</SelectItem>
                  <SelectItem value="surface-desc">Surface ↓</SelectItem>
                  <SelectItem value="pieces-desc">Pièces ↓</SelectItem>
                  <SelectItem value="dpe-asc">DPE A → G</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Filtres panel mobile */}
        {activeTab === 'liste' && filtresOpen && (
          <FiltresPanel
            filtres={comparateur.filtres}
            onFiltresChange={(partial: Partial<FiltresAnnonces>) => comparateur.setFiltres({ ...comparateur.filtres, ...partial })}
            nbResultats={annoncesFiltrees.length}
            nbTotal={comparateur.annonces.length}
          />
        )}
      </div>

      {/* ═══ HEADER (desktop card + tabs) ═══ */}
      <div className="hidden sm:block sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className={`mx-auto px-3 sm:px-5 py-2 sm:py-3 transition-all duration-300 ${activeTab === 'liste' ? 'max-w-5xl' : 'max-w-7xl'}`}>
          <div className="sm:rounded-2xl sm:ring-1 sm:ring-gray-200/80 sm:shadow-sm sm:overflow-hidden">

            {/* Haut : identité + actions */}
            <div className="px-3 py-2 md:px-5 md:py-3.5 bg-white">
              <div className="flex items-center justify-between gap-2">
                {/* Gauche — badge + titre */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
                    <Scale className="w-4 h-4 text-aquiz-green" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-aquiz-black leading-tight truncate">
                      Comparateur immobilier
                    </h2>
                    <p className="text-[10px] text-aquiz-gray">
                      {comparateur.annonces.length} bien{comparateur.annonces.length > 1 ? 's' : ''} enregistré{comparateur.annonces.length > 1 ? 's' : ''}
                      {selCount >= 2 && <span className="text-aquiz-green font-medium"> · {selCount} sélectionnés</span>}
                    </p>
                  </div>
                </div>

                {/* Droite — actions essentielles */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Budget — hidden on mobile, shown via mobile budget row below */}
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

                  {/* Compteur favoris */}
                  {nbFavoris > 0 && (
                    <button
                      onClick={() => {
                        comparateur.setFiltres({ ...comparateur.filtres, favorisUniquement: !comparateur.filtres.favorisUniquement })
                        if (activeTab !== 'liste') setActiveTab('liste')
                      }}
                      className={`relative h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                        comparateur.filtres.favorisUniquement
                          ? 'bg-rose-50 text-rose-500 ring-1 ring-rose-200'
                          : 'text-aquiz-gray hover:text-rose-500 hover:bg-rose-50'
                      }`}
                      title={comparateur.filtres.favorisUniquement ? 'Afficher toutes les annonces' : 'Voir les favoris'}
                    >
                      <Heart className={`h-3.5 w-3.5 ${comparateur.filtres.favorisUniquement || nbFavoris > 0 ? 'fill-current' : ''}`} />
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 text-[9px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center px-1">
                        {nbFavoris}
                      </span>
                    </button>
                  )}

                  {/* Bouton Supprimer */}
                  {activeTab === 'liste' && comparateur.annonces.length > 0 && (
                    <Button
                      onClick={() => manageMode ? handleExitManageMode() : setManageMode(true)}
                      size="sm"
                      variant={manageMode ? 'default' : 'outline'}
                      className={`h-7 rounded-lg text-[11px] font-semibold px-3 ${
                        manageMode
                          ? 'bg-rose-500 hover:bg-rose-600 text-white border-0'
                          : 'border-aquiz-gray-lighter text-rose-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                      }`}
                    >
                      {manageMode ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1">{manageMode ? 'Terminer' : 'Supprimer'}</span>
                    </Button>
                  )}

                  <Button
                    onClick={() => setShowForm(true)}
                    size="sm"
                    className="bg-aquiz-green hover:bg-aquiz-green/90 text-white h-7 rounded-lg text-[11px] font-semibold px-3"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="ml-1">Ajouter</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Bas : onglets + filtres */}
            <div className="px-3 py-1.5 md:px-4 md:py-2.5 bg-gray-50/80 border-t border-gray-100">
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                {/* Onglets — pills */}
                <div role="tablist" aria-label="Navigation comparateur" className="flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-aquiz-gray-lighter shrink-0">
                  <button
                    role="tab"
                    aria-selected={activeTab === 'liste'}
                    aria-controls="tabpanel-liste"
                    onClick={() => setActiveTab('liste')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'liste'
                        ? 'bg-aquiz-black text-white shadow-sm'
                        : 'text-aquiz-gray hover:text-aquiz-black'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Annonces
                    <span className={`text-[10px] min-w-4 text-center px-1 py-px rounded-full font-bold ${
                      activeTab === 'liste' ? 'bg-white/20 text-white' : 'bg-aquiz-gray-lighter text-aquiz-gray'
                    }`}>{comparateur.annonces.length}</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'comparaison'}
                    aria-controls="tabpanel-comparaison"
                    onClick={() => setActiveTab('comparaison')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'comparaison'
                        ? 'bg-aquiz-green text-white shadow-sm'
                        : 'text-aquiz-gray hover:text-aquiz-black'
                    }`}
                  >
                    <Scale className="h-3.5 w-3.5" />
                    Comparaison
                    {selCount > 0 && (
                      <span className={`text-[10px] min-w-4 text-center px-1 py-px rounded-full font-bold ${
                        activeTab === 'comparaison' ? 'bg-white/20 text-white' : 'bg-aquiz-green/15 text-aquiz-green'
                      }`}>{selCount}</span>
                    )}
                  </button>
                </div>

                {/* Contrôles : filtres toggle + tri + vue */}
                {activeTab === 'liste' && (
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <FiltresToggle
                      isOpen={filtresOpen}
                      onToggle={() => setFiltresOpen(!filtresOpen)}
                      activeCount={filtresActiveCount}
                    />
                    <Select
                      value={comparateur.tri}
                      onValueChange={(v) => comparateur.setTri(v as TriAnnonces)}
                    >
                      <SelectTrigger className="h-7 text-[10px] sm:text-[11px] border-aquiz-gray-lighter rounded-lg font-medium bg-white w-8 sm:w-36 px-1.5 sm:px-3 justify-center sm:justify-between [&>svg:last-child]:hidden sm:[&>svg:last-child]:block">
                        <ArrowDownUp className="h-3 w-3 text-aquiz-gray shrink-0" />
                        <span className="hidden sm:inline"><SelectValue /></span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dateAjout-desc">Plus récentes</SelectItem>
                        <SelectItem value="prix-asc">Prix ↑</SelectItem>
                        <SelectItem value="prix-desc">Prix ↓</SelectItem>
                        <SelectItem value="prixM2-asc">€/m² ↑</SelectItem>
                        <SelectItem value="surface-desc">Surface ↓</SelectItem>
                        <SelectItem value="pieces-desc">Pièces ↓</SelectItem>
                        <SelectItem value="dpe-asc">DPE A → G</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="hidden sm:flex bg-white rounded-lg p-0.5 border border-aquiz-gray-lighter">
                      <button
                        onClick={() => setViewMode('grid')}
                        aria-label="Vue grille"
                        aria-pressed={viewMode === 'grid'}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-aquiz-gray-lightest text-aquiz-black' : 'text-aquiz-gray hover:text-aquiz-black'}`}
                      >
                        <Grid3X3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        aria-label="Vue liste"
                        aria-pressed={viewMode === 'list'}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-aquiz-gray-lightest text-aquiz-black' : 'text-aquiz-gray hover:text-aquiz-black'}`}
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Panel filtres inline — pleine largeur sous les onglets */}
            {activeTab === 'liste' && filtresOpen && (
              <FiltresPanel
                filtres={comparateur.filtres}
                onFiltresChange={(partial: Partial<FiltresAnnonces>) => comparateur.setFiltres({ ...comparateur.filtres, ...partial })}
                nbResultats={annoncesFiltrees.length}
                nbTotal={comparateur.annonces.length}
              />
            )}

          </div>
        </div>
      </div>

      {/* ═══ CONTENU ═══ */}
      <div className="flex-1">
        <div className={`mx-auto px-3 sm:px-5 py-4 sm:py-6 ${activeTab === 'liste' ? 'max-w-5xl' : 'max-w-7xl'}`}>

          {/* ─── TAB LISTE ─── */}
          {activeTab === 'liste' && (
            <div id="tabpanel-liste" role="tabpanel" aria-label="Liste des annonces" className="animate-in fade-in slide-in-from-bottom-2 duration-200">
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



              {/* Grille d'annonces ou skeletons de chargement */}
              {!hydrated ? (
                <AnnonceSkeletonGrid count={4} viewMode={viewMode} />
              ) : annoncesFiltrees.length === 0 && comparateur.annonces.length > 0 ? (
                <div className="bg-white rounded-2xl border border-aquiz-gray-lighter py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-aquiz-gray-lightest flex items-center justify-center mx-auto mb-4">
                    <Info className="h-5 w-5 text-aquiz-gray" />
                  </div>
                  <h3 className="text-sm font-semibold text-aquiz-black mb-1">Aucun résultat</h3>
                  <p className="text-xs text-aquiz-gray">
                    Aucune annonce ne correspond à vos filtres. Essayez d&apos;élargir vos critères.
                  </p>
                </div>
              ) : (
                <div className={`grid gap-3 sm:gap-5 ${
                  viewMode === 'grid'
                    ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 max-w-3xl'
                }`}>
                  {annoncesFiltrees.map((annonce) => {
                    const isAnnonceSelected = comparateur.annonceSelectionnees.includes(annonce.id)
                    const selectionIsFull = selCount >= 4 && !isAnnonceSelected
                    return (
                      <AnnonceCard
                        key={annonce.id}
                        annonce={annonce}
                        isSelected={isAnnonceSelected}
                        selectionDisabled={selectionIsFull}
                        faisabilite={faisabilitesMap.get(annonce.id)}
                        onSelect={() => comparateur.toggleSelection(annonce.id)}
                        onEdit={() => setEditingId(annonce.id)}
                        onDelete={() => setDeleteConfirm({ open: true, ids: [annonce.id], title: annonce.titre })}
                        onDuplicate={() => comparateur.dupliquerAnnonce(annonce.id)}
                        onToggleFavori={() => comparateur.toggleFavori(annonce.id)}
                        manageMode={manageMode}
                        isManageSelected={manageIds.has(annonce.id)}
                        onManageToggle={() => handleManageToggle(annonce.id)}
                        compact={viewMode === 'list'}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB COMPARAISON ─── */}
          {activeTab === 'comparaison' && (
            <div id="tabpanel-comparaison" role="tabpanel" aria-label="Comparaison des biens sélectionnés" className="animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                <div className="space-y-3 sm:space-y-5">
                  {/* Header comparaison — hidden on mobile (already in main header) */}
                  <div className="hidden sm:flex bg-white rounded-2xl border border-aquiz-gray-lighter px-5 py-4 items-center justify-between">
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => comparateur.deselectionnerTout()}
                        className="flex items-center gap-1.5 text-xs text-aquiz-gray hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Réinitialiser</span>
                      </button>
                      {scoresForEmail.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(window.location.href)
                                setLinkCopied(true)
                                setTimeout(() => setLinkCopied(false), 2000)
                              } catch { /* fallback */ }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-aquiz-gray-lighter text-aquiz-gray-dark text-xs font-medium hover:bg-aquiz-gray-lightest active:scale-[0.97] transition-all duration-200"
                          >
                            {linkCopied ? <Check className="w-3.5 h-3.5 text-aquiz-green" /> : <Share2 className="w-3.5 h-3.5" />}
                            {linkCopied ? 'Copié !' : 'Partager'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById('pdf-gate')
                              if (!el) return
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              el.classList.add('animate-pulse-highlight')
                              setTimeout(() => el.classList.remove('animate-pulse-highlight'), 1800)
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-aquiz-black text-white text-xs font-semibold hover:bg-aquiz-black/85 active:scale-[0.97] transition-all duration-200"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            Mon rapport PDF
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bandeau info PDF */}
                  {scoresForEmail.length > 0 && !pdfEmailSent && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-aquiz-green/5 border border-aquiz-gray-lighter">
                      <FileDown className="w-3.5 h-3.5 text-aquiz-green shrink-0" />
                      <p className="text-[11px] text-aquiz-gray flex-1">
                        <span className="font-semibold text-aquiz-black">Rapport PDF disponible</span> — Analyse complète de vos {annoncesSelectionnees.length} biens en quelques secondes
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('pdf-gate')
                          if (!el) return
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          el.classList.add('animate-pulse-highlight')
                          setTimeout(() => el.classList.remove('animate-pulse-highlight'), 1800)
                        }}
                        className="text-[11px] font-bold text-aquiz-green hover:underline whitespace-nowrap shrink-0"
                      >
                        Voir ↓
                      </button>
                    </div>
                  )}

                  {/* Tableau */}
                  <div className="bg-white border border-aquiz-gray-lighter overflow-hidden -mx-3 sm:mx-0 rounded-none sm:rounded-2xl border-x-0 sm:border-x">
                    <TableauComparaison
                      annonces={annoncesSelectionnees}
                      statistiques={statsSelection}
                      budgetMax={comparateur.budgetMax}
                      onRemove={(id) => comparateur.toggleSelection(id)}
                      onScoresReady={handleScoresReady}
                      tauxInteret={parametresModeA?.tauxInteret ?? parametresModeB?.tauxInteret}
                      dureeAns={parametresModeA?.dureeAns ?? parametresModeB?.dureeAns}
                      apport={parametresModeA?.apport ?? parametresModeB?.apport}
                    />
                  </div>

                  {/* ═══ ANALYSE IA (invisible — alimente le PDF via callback) + PDF GATE ═══ */}
                  {annoncesSelectionnees.length >= 2 && (
                    <div>
                      <div className="space-y-3 sm:space-y-5">
                        {/* AnalyseIA — masqué, uniquement pour alimenter syntheseIA du PDF */}
                        <div className="hidden">
                          <AnalyseIA
                            annonces={annoncesSelectionnees}
                            statistiques={statsSelection}
                            budgetMax={comparateur.budgetMax}
                            onSyntheseIAReady={setSyntheseIA}
                          />
                        </div>

                        {/* ═══ PDF GATE SECTION (email capture) ═══ */}
                        {scoresForEmail.length > 0 && (() => {
                          return (
                          <div id="pdf-gate" className="mt-6 sm:mt-8">
                            <div className="rounded-xl border border-aquiz-gray-lighter bg-aquiz-gray-lightest/50 px-4 sm:px-5 py-4 sm:py-5">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-lg bg-aquiz-green/10 flex items-center justify-center shrink-0">
                                  <FileDown className="w-4 h-4 text-aquiz-green" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-sm text-aquiz-black">
                                    {pdfEmailSent ? 'Comparatif téléchargé !' : 'Recevez votre comparatif'}
                                  </h3>
                                  {pdfEmailSent && (
                                    <p className="text-[10px] sm:text-xs text-aquiz-gray">Re-téléchargez quand vous voulez.</p>
                                  )}
                                </div>
                              </div>
                              {pdfEmailSent ? (
                                <button
                                  type="button"
                                  disabled={pdfLoading}
                                  onClick={async () => {
                                    setPdfLoading(true)
                                    try { await generateComparateurPDF() } finally { setPdfLoading(false) }
                                  }}
                                  className="w-full h-11 bg-aquiz-green hover:bg-aquiz-green/90 disabled:opacity-60 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                  {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                  {pdfLoading ? 'Génération…' : 'Télécharger à nouveau'}
                                </button>
                              ) : (
                                <div className="space-y-2.5">
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray/40" />
                                    <input
                                      type="email"
                                      value={pdfEmailValue}
                                      onChange={e => setPdfEmailValue(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendPdfEmail() } }}
                                      placeholder="votre@email.com"
                                      className="w-full h-11 pl-9 pr-3 rounded-lg bg-white text-aquiz-black placeholder:text-aquiz-gray/40 text-sm border border-aquiz-gray-lighter focus:border-aquiz-green focus:ring-1 focus:ring-aquiz-green/20 focus:outline-none transition-colors"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    disabled={pdfEmailLoading || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pdfEmailValue)}
                                    onClick={handleSendPdfEmail}
                                    className="w-full h-11 bg-aquiz-green hover:bg-aquiz-green/90 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                  >
                                    {pdfEmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                    {pdfEmailLoading ? 'Analyse…' : 'Recevoir mon étude'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          )
                        })()}

                        {/* Pulse highlight animation */}
                        <style>{`
                          @keyframes pulseHighlight {
                            0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
                            40% { box-shadow: 0 0 0 12px rgba(34,197,94,0.15); }
                            100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
                          }
                          .animate-pulse-highlight {
                            animation: pulseHighlight 0.9s ease-out 2;
                          }
                        `}</style>
                      </div>

                    </div>
                  )}


                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modal Contact */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />

      {/* ═══ FLOATING MANAGE BAR ═══ */}
      {manageMode && activeTab === 'liste' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] sm:w-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-rose-600 text-white shadow-xl shadow-rose-600/30">
            {/* Tout sélectionner / désélectionner */}
            <button
              onClick={handleSelectAllManage}
              className="flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white transition-colors whitespace-nowrap"
            >
              {annoncesFiltrees.length > 0 && annoncesFiltrees.every(a => manageIds.has(a.id)) ? (
                <CheckSquare className="h-3.5 w-3.5" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              Tout sélect.
            </button>

            <div className="w-px h-5 bg-white/20" />

            <span className="text-sm font-medium whitespace-nowrap">
              {manageIds.size} sélectionné{manageIds.size > 1 ? 's' : ''}
            </span>

            <div className="w-px h-5 bg-white/20" />

            <button
              onClick={handleExitManageMode}
              className="text-xs text-white/60 hover:text-white transition-colors whitespace-nowrap"
            >
              Annuler
            </button>

            {manageIds.size > 0 && (
              <button
                onClick={() => setDeleteConfirm({ open: true, ids: Array.from(manageIds) })}
                className="flex items-center gap-1.5 text-xs font-semibold bg-white text-rose-600 hover:bg-white/90 px-3.5 py-1.5 rounded-xl transition-colors whitespace-nowrap"
              >
                <Trash2 className="h-3 w-3" />
                Supprimer
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ FLOATING SELECTION BAR ═══ */}
      {!manageMode && selCount > 0 && activeTab === 'liste' && (
        <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] sm:w-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-aquiz-black text-white shadow-xl shadow-black/20">
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
              aria-label="Désélectionner tous les biens"
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

      {/* Modal Confirmation Suppression */}
      <ConfirmDeleteDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, ids: [] })}
        onConfirm={handleConfirmDelete}
        count={deleteConfirm.ids.length}
        annonceTitle={deleteConfirm.title}
      />

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
          <SheetHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-aquiz-gray-lighter bg-aquiz-gray-lightest/30 shrink-0">
            <div className="flex items-center gap-3">
              {/* Bouton retour mobile */}
              <button
                onClick={() => { setShowForm(false); setEditingId(null) }}
                className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest transition-colors shrink-0"
                aria-label="Fermer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
                {editingId ? (
                  <ScanSearch className="w-4 h-4 text-aquiz-green" />
                ) : (
                  <Plus className="w-4 h-4 text-aquiz-green" />
                )}
              </div>
              <div className="min-w-0">
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
