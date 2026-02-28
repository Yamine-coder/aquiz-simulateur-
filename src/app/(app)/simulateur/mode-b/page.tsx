'use client'

import { LocalisationSearch } from '@/components/simulateur'
import { AutoSaveIndicator, ResumeModal, useAutoSave } from '@/components/simulation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip'
import { SIMULATEUR_CONFIG } from '@/config/simulateur.config'
import { useSimulationSave } from '@/hooks/useSimulationSave'
import { logger } from '@/lib/logger'
import type { EnrichissementPDF } from '@/lib/pdf/enrichirPourPDF'
import { enrichirPourPDF } from '@/lib/pdf/enrichirPourPDF'
import { formatMontant } from '@/lib/utils/formatters'
import { calculerMontantPTZ, getInfoPTZ } from '@/lib/utils/zonePTZ'
import { hasValidEmail, useLeadStore } from '@/stores/useLeadStore'
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Building,
    Check,
    CheckCircle,
    FileDown,
    Home,
    Info,
    Loader2,
    Mail,
    MapPin,
    Phone,
    PiggyBank,
    TrendingUp
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const ContactModal = dynamic(() => import('@/components/contact').then(m => ({ default: m.ContactModal })), { ssr: false })
const SimulationPDFModeB = dynamic(() => import('@/components/pdf/SimulationPDFModeB').then(m => ({ default: m.SimulationPDFModeB })), { ssr: false })

/**
 * Mode B - "Ce qu'il faut pour acheter"
 *
 * Objectif : Pour un bien à prix donné, calculer ce qu'il FAUT :
 * - Revenus minimums nécessaires
 * - Apport conseillé
 * - Mensualité à prévoir
 *
 * PAS de saisie de revenus - on calcule les revenus MIN requis !
 */
export default function ModeBPage() {
  const router = useRouter()
  const [etape, setEtape] = useState(1)
  const [showResumeModal, setShowResumeModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfEmailValue, setPdfEmailValue] = useState('')
  const [pdfEmailSent, setPdfEmailSent] = useState(false)
  const [pdfEmailLoading, setPdfEmailLoading] = useState(false)
  const [cachedEnrichissement, setCachedEnrichissement] = useState<EnrichissementPDF | null>(null)
  const leadStore = useLeadStore()
  const hasLead = useLeadStore(hasValidEmail)
  const { simulations, isLoaded, save } = useSimulationSave()

  // États du formulaire
  const [prixBien, setPrixBien] = useState(0)
  const [typeBien, setTypeBien] = useState<'neuf' | 'ancien'>('ancien')
  const [typeLogement, setTypeLogement] = useState<'appartement' | 'maison'>('appartement')
  const [codePostal, setCodePostal] = useState('')
  const [nomCommune, setNomCommune] = useState('')
  const [apport, setApport] = useState(0)
  const [dureeAns, setDureeAns] = useState(20)
  const [tauxInteret, setTauxInteret] = useState(3.5)

  // Calculs en temps réel
  const calculs = useMemo(() => {
    // Frais de notaire
    const tauxNotaire =
      typeBien === 'neuf'
        ? SIMULATEUR_CONFIG.fraisNotaireNeuf
        : SIMULATEUR_CONFIG.fraisNotaireAncien
    const fraisNotaire = prixBien * tauxNotaire

    // Frais annexes (garantie, dossier, etc.) - environ 1.5% du prêt
    const tauxFraisAnnexes = 0.015
    const fraisAnnexes = prixBien * tauxFraisAnnexes

    // Coût total
    const coutTotal = prixBien + fraisNotaire + fraisAnnexes

    // Montant à emprunter
    const montantAEmprunter = Math.max(0, coutTotal - apport)

    // Vérification si apport couvre plus que le coût total
    const apportExcedentaire = apport > coutTotal
    const excedentApport = apport - coutTotal

    // Calcul mensualité
    const tauxMensuel = tauxInteret / 100 / 12
    const nombreMois = dureeAns * 12
    const facteur =
      tauxMensuel > 0
        ? tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -nombreMois))
        : 1 / nombreMois
    const mensualiteCredit =
      montantAEmprunter > 0 ? montantAEmprunter * facteur : 0

    // Assurance emprunteur
    const tauxAssuranceAnnuel = SIMULATEUR_CONFIG.tauxAssuranceMoyen
    const mensualiteAssurance = (montantAEmprunter * tauxAssuranceAnnuel) / 12
    const mensualiteTotal = mensualiteCredit + mensualiteAssurance

    // CALCUL CLÉ : Revenus minimums nécessaires pour respecter 33% d'endettement
    const revenusMinimums33 =
      mensualiteTotal > 0 ? Math.ceil(mensualiteTotal / 0.33) : 0
    const revenusMinimums35 =
      mensualiteTotal > 0 ? Math.ceil(mensualiteTotal / 0.35) : 0

    // Apport recommandé
    const apportMinimum10 = Math.round(prixBien * 0.1)
    const apportIdeal20 = Math.round(prixBien * 0.2)
    const apportSuffisant = apport >= apportMinimum10

    // Coût total du crédit (intérêts + assurance)
    const coutTotalCredit =
      mensualiteTotal * nombreMois - montantAEmprunter

    // Calculs avec différentes durées
    const simulationsDuree = [15, 20, 25, 30].map((duree) => {
      const mois = duree * 12
      const f =
        tauxMensuel > 0
          ? tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -mois))
          : 1 / mois
      const mensCredit = montantAEmprunter > 0 ? montantAEmprunter * f : 0
      const mensAssurance = (montantAEmprunter * tauxAssuranceAnnuel) / 12
      const mensTotal = mensCredit + mensAssurance
      const revenusMin = mensTotal > 0 ? Math.ceil(mensTotal / 0.33) : 0
      return {
        duree,
        mensualite: Math.round(mensTotal),
        revenusMinimums: revenusMin,
        coutTotal: Math.round(mensTotal * mois)
      }
    })

    // Données pour le graphique camembert (répartition du coût)
    const fraisNotaireArrondi = Math.round(fraisNotaire)
    const fraisAnnexesArrondi = Math.round(fraisAnnexes)
    const coutTotalCreditArrondi = Math.round(coutTotalCredit)
    const repartitionCout = [
      { label: 'Prix du bien', value: prixBien, color: '#1a1a1a' },
      { label: 'Frais de notaire', value: fraisNotaireArrondi, color: '#6b7280' },
      { label: 'Frais annexes', value: fraisAnnexesArrondi, color: '#9ca3af' },
      { label: 'Intérêts + Assurance', value: coutTotalCreditArrondi, color: '#22c55e' },
    ]
    const totalProjet = prixBien + fraisNotaireArrondi + fraisAnnexesArrondi + coutTotalCreditArrondi

    return {
      fraisNotaire,
      fraisAnnexes,
      coutTotal,
      montantAEmprunter,
      apportExcedentaire,
      excedentApport,
      mensualiteCredit,
      mensualiteAssurance,
      mensualiteTotal,
      revenusMinimums33,
      revenusMinimums35,
      apportMinimum10,
      apportIdeal20,
      apportSuffisant,
      coutTotalCredit,
      simulationsDuree,
      repartitionCout,
      totalProjet
    }
  }, [prixBien, typeBien, apport, dureeAns, tauxInteret])

  // Validation des inputs
  const validations = useMemo(() => {
    const alerts: { type: 'warning' | 'error' | 'info'; message: string }[] = []
    
    // Prix du bien
    if (prixBien > 0 && prixBien < 50000) {
      alerts.push({ type: 'warning', message: 'Prix très bas pour un bien immobilier. Vérifiez la saisie.' })
    }
    if (prixBien > 2000000) {
      alerts.push({ type: 'info', message: 'Projet haut de gamme. Les banques étudieront votre dossier au cas par cas.' })
    }
    
    // Apport
    if (apport > 0 && apport > prixBien * 0.8) {
      alerts.push({ type: 'info', message: 'Apport très conséquent ! Vous pourriez négocier un meilleur taux.' })
    }
    if (apport > calculs.coutTotal) {
      alerts.push({ type: 'warning', message: 'Votre apport dépasse le coût total. Pas besoin de crédit !' })
    }
    
    // Durée
    if (dureeAns > 25) {
      alerts.push({ type: 'warning', message: 'Durée > 25 ans : rare en France, acceptée sous conditions strictes.' })
    }
    
    // Taux
    if (tauxInteret < 2) {
      alerts.push({ type: 'info', message: 'Taux très bas. Vérifiez les offres actuelles du marché.' })
    }
    if (tauxInteret > 6) {
      alerts.push({ type: 'warning', message: 'Taux élevé. Comparez plusieurs banques pour optimiser.' })
    }
    
    // Revenus requis
    if (calculs.revenusMinimums33 > 15000) {
      alerts.push({ type: 'info', message: 'Revenus requis élevés. Envisagez un apport plus important ou une durée plus longue.' })
    }
    
    // Mensualité
    if (calculs.mensualiteTotal > 5000) {
      alerts.push({ type: 'info', message: 'Mensualité importante. Assurez-vous d\'avoir une épargne de précaution.' })
    }
    
    return {
      alerts,
      hasErrors: alerts.some(a => a.type === 'error'),
      hasWarnings: alerts.some(a => a.type === 'warning'),
      canProceed: prixBien >= 50000 && !alerts.some(a => a.type === 'error')
    }
  }, [prixBien, apport, dureeAns, tauxInteret, calculs])

  // Scroll to top when changing step
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToNextEtape = () => {
    setEtape((e) => Math.min(e + 1, 3))
    scrollToTop()
  }
  const goToPrevEtape = () => {
    setEtape((e) => Math.max(e - 1, 1))
    scrollToTop()
  }

  // État pour les données DVF réelles
  interface InfoLocalisation {
    zonePTZ: string
    descriptionZone: string
    ptzEligible: boolean
    ptzMontant: number
    ptzRaison: string
    nomCommune: string | null
    prixLocalM2: number | null
    prixFallbackM2: number | null
    surfaceEstimee: number | null
    nbVentes: number | null
    source: string | null
    isLoading: boolean
  }
  
  const [infoLocalisation, setInfoLocalisation] = useState<InfoLocalisation | null>(null)
  
  // Fetch données DVF réelles quand le code postal change
  useEffect(() => {
    // Reset si pas de code postal valide
    if (!codePostal || codePostal.length < 5) {
      // On utilise une fonction pour éviter l'erreur React Compiler
      const reset = () => setInfoLocalisation(null)
      reset()
      return
    }
    
    // Infos PTZ (synchrone)
    const infoPTZ = getInfoPTZ(codePostal)
    const ptzResult = calculerMontantPTZ(prixBien, codePostal, typeBien)
    
    // Marquer comme loading avec données PTZ
    const initialState: InfoLocalisation = {
      zonePTZ: infoPTZ.zone,
      descriptionZone: infoPTZ.description,
      ptzEligible: ptzResult.eligible,
      ptzMontant: ptzResult.montant,
      ptzRaison: ptzResult.raison || '',
      nomCommune: null,
      prixLocalM2: null,
      prixFallbackM2: null,
      surfaceEstimee: null,
      nbVentes: null,
      source: null,
      isLoading: true,
    }
    setInfoLocalisation(initialState)
    
    // Fetch données DVF réelles
    const controller = new AbortController()
    
    fetch(`/api/dvf/codepostal/${codePostal}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) {
          // Pas de données DVF, garder juste PTZ
          setInfoLocalisation(prev => prev ? { ...prev, isLoading: false } : null)
          return
        }
        
        const prixLocalM2 = typeLogement === 'appartement' 
          ? data.prixM2Appartement 
          : data.prixM2Maison
        // Fallback : si maison n'a pas de données, proposer le prix appartement comme référence
        const prixFallbackM2 = (!prixLocalM2 && typeLogement === 'maison' && data.prixM2Appartement > 0)
          ? data.prixM2Appartement
          : null
        const prixPourSurface = prixLocalM2 || prixFallbackM2
        const surfaceEstimee = prixPourSurface && prixBien > 0 
          ? Math.round(prixBien / prixPourSurface) 
          : null
        const nbVentes = typeLogement === 'appartement'
          ? data.nbVentesAppart
          : data.nbVentesMaison
          
        setInfoLocalisation(prev => prev ? {
          ...prev,
          nomCommune: data.nomCommune,
          prixLocalM2,
          prixFallbackM2,
          surfaceEstimee,
          nbVentes,
          source: `Prix ${data.annee}`,
          isLoading: false,
        } : null)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          logger.error('Erreur fetch DVF:', err)
          setInfoLocalisation(prev => prev ? { ...prev, isLoading: false } : null)
        }
      })
    
    return () => controller.abort()
  }, [codePostal, prixBien, typeBien, typeLogement])

  // Export PDF — Rapport Mode B
  const generatePDF = useCallback(async (enrichissement?: EnrichissementPDF) => {
    const logoUrl = `${window.location.origin}/logo-aquiz-white.png`

    const { pdf } = await import('@react-pdf/renderer')
    const blob = await pdf(
      <SimulationPDFModeB
        logoUrl={logoUrl}
        prixBien={prixBien}
        typeBien={typeBien}
        typeLogement={typeLogement}
        codePostal={codePostal}
        nomCommune={nomCommune}
        apport={apport}
        dureeAns={dureeAns}
        tauxInteret={tauxInteret}
        fraisNotaire={calculs.fraisNotaire}
        fraisAnnexes={calculs.fraisAnnexes}
        coutTotal={calculs.coutTotal}
        montantAEmprunter={calculs.montantAEmprunter}
        mensualiteCredit={calculs.mensualiteCredit}
        mensualiteAssurance={calculs.mensualiteAssurance}
        mensualiteTotal={calculs.mensualiteTotal}
        revenusMinimums33={calculs.revenusMinimums33}
        revenusMinimums35={calculs.revenusMinimums35}
        apportMinimum10={calculs.apportMinimum10}
        apportIdeal20={calculs.apportIdeal20}
        apportSuffisant={calculs.apportSuffisant}
        coutTotalCredit={calculs.coutTotalCredit}
        totalProjet={calculs.totalProjet}
        simulationsDuree={calculs.simulationsDuree}
        repartitionCout={calculs.repartitionCout}
        infoLocalisation={infoLocalisation ? {
          zonePTZ: infoLocalisation.zonePTZ,
          descriptionZone: infoLocalisation.descriptionZone,
          ptzEligible: infoLocalisation.ptzEligible,
          ptzMontant: infoLocalisation.ptzMontant,
          nomCommune: infoLocalisation.nomCommune,
          prixLocalM2: infoLocalisation.prixLocalM2,
          surfaceEstimee: infoLocalisation.surfaceEstimee,
          nbVentes: infoLocalisation.nbVentes,
        } : null}
        quartier={enrichissement?.quartier}
        syntheseIA={enrichissement?.syntheseIA}
      />
    ).toBlob()

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const dateFile = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
    link.download = `AQUIZ-Etude-Achat-${dateFile}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [prixBien, typeBien, typeLogement, codePostal, nomCommune, apport, dureeAns, tauxInteret, calculs, infoLocalisation])

  /** Capture email bonus + génère le PDF en local */
  const handleSendPdfEmail = useCallback(async () => {
    if (!pdfEmailValue || pdfEmailLoading) return
    setPdfEmailLoading(true)
    try {
      // 1. Enregistrer le lead via API
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pdfEmailValue,
          source: 'simulateur-b',
          contexte: { prixBien, typeBien, dureeAns, apport }
        })
      })
      // 2. Sync lead store
      leadStore.capture(pdfEmailValue, 'simulateur-b', undefined, { prixBien, typeBien, dureeAns, apport })
      // 3. Enrichir le PDF avec IA + données quartier (Mode B = a codePostal)
      const enrichissement = await enrichirPourPDF({
        mode: 'B',
        codePostal: codePostal || undefined,
        typeBien,
        typeLogement,
        nomCommune: nomCommune || undefined,
        age: 30, // Mode B n'a pas l'âge — valeur neutre
        statutProfessionnel: 'non_renseigne',
        situationFoyer: 'non_renseigne',
        nombreEnfants: 0,
        revenusMensuels: calculs.revenusMinimums33,
        chargesMensuelles: 0,
        prixAchatMax: prixBien,
        capitalEmpruntable: calculs.montantAEmprunter,
        apport,
        dureeAns,
        tauxInteret,
        mensualite: calculs.mensualiteTotal,
        scoreFaisabilite: calculs.apportSuffisant ? 75 : 45,
        tauxEndettement: 33,
        resteAVivre: calculs.revenusMinimums33 - calculs.mensualiteTotal,
      })
      // 4. Cacher l'enrichissement pour re-téléchargement + générer PDF
      setCachedEnrichissement(enrichissement)
      await generatePDF(enrichissement)
      setPdfEmailSent(true)
    } catch (err) {
      logger.error('Erreur envoi lead Mode B', err)
    } finally {
      setPdfEmailLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfEmailValue, pdfEmailLoading, prixBien, typeBien, typeLogement, codePostal, dureeAns, apport, tauxInteret, calculs.revenusMinimums33, calculs.montantAEmprunter, calculs.mensualiteTotal, calculs.apportSuffisant, generatePDF])

  // Système de sauvegarde
  const hasCheckedRef = useRef(false)
  const [pendingToResume, setPendingToResume] = useState<typeof simulations[0] | null>(null)

  const restoreSimulation = useCallback((sim: typeof simulations[0]) => {
    if (sim.modeBData) {
      setPrixBien(sim.modeBData.prixBien)
      setTypeBien(sim.modeBData.typeBien)
      if (sim.modeBData.typeLogement) setTypeLogement(sim.modeBData.typeLogement)
      setCodePostal(sim.modeBData.codePostal)
      if (sim.modeBData.nomCommune) setNomCommune(sim.modeBData.nomCommune)
      setApport(sim.modeBData.apport)
      setDureeAns(sim.modeBData.dureeAns)
      setTauxInteret(sim.modeBData.tauxInteret)
    }
    if (sim.etape) setEtape(Number(sim.etape) || 1)
    setCurrentSaveId(sim.id)
  }, [])

  useEffect(() => {
    if (hasCheckedRef.current || !isLoaded) return
    hasCheckedRef.current = true
    const restoreId = sessionStorage.getItem('aquiz-restore-id')
    if (restoreId) {
      sessionStorage.removeItem('aquiz-restore-id')
      const sim = simulations.find(s => s.id === restoreId)
      if (sim) { restoreSimulation(sim); setCurrentSaveId(restoreId); return }
    }
    // Chercher la simulation Mode B la plus récente (en_cours OU terminee)
    const lastB = simulations.find(s => s.mode === 'B' && s.modeBData && s.modeBData.prixBien > 0)
    if (lastB) {
      // Toujours proposer la reprise via la modale
      setPendingToResume(lastB)
      setShowResumeModal(true)
    }
  }, [isLoaded, simulations, restoreSimulation])

  const handleResume = useCallback(() => {
    if (pendingToResume) restoreSimulation(pendingToResume)
    setShowResumeModal(false)
    setPendingToResume(null)
  }, [pendingToResume, restoreSimulation])

  const handleNew = useCallback(() => {
    setCurrentSaveId(null)
    setShowResumeModal(false)
    setPendingToResume(null)
  }, [])

  const handleSave = useCallback(() => {
    const isCompleted = etape === 3
    const savedSim = save({
      mode: 'B',
      etape: String(etape),
      status: isCompleted ? 'terminee' : 'en_cours',
      existingId: currentSaveId || undefined,
      profil: null,
      modeBData: {
        prixBien,
        typeBien,
        typeLogement,
        codePostal,
        nomCommune,
        apport,
        dureeAns,
        tauxInteret
      },
      resultats: isCompleted ? {
        capaciteAchat: prixBien,
        mensualite: Math.round(calculs.mensualiteTotal),
        tauxEndettement: 33,
        faisable: true
      } : null
    })
    setCurrentSaveId(savedSim.id)
  }, [save, currentSaveId, etape, prixBien, typeBien, typeLogement, codePostal, nomCommune, apport, dureeAns, tauxInteret, calculs.mensualiteTotal])

  // Auto-save : Ctrl+S + auto-save au changement d'étape
  const autoSave = useAutoSave(handleSave, prixBien === 0)

  // Re-sauvegarder après chaque changement d'étape pour que la progression soit à jour
  useEffect(() => {
    if (prixBien > 0) {
      const timer = setTimeout(() => autoSave.triggerSave(), 100)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape])

  // Pré-remplir l'email du CTA PDF depuis le lead store
  useEffect(() => {
    if (hasLead && leadStore.email && !pdfEmailValue) {
      setPdfEmailValue(leadStore.email)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLead])

  // Étapes pour la barre de progression
  const ETAPES = [
    { id: 1, label: 'Le bien' },
    { id: 2, label: 'Financement' },
    { id: 3, label: 'Résultat' },
  ] as const

  const etapeActuelleIndex = etape - 1
  const canGoToEtape = (targetEtape: number): boolean => {
    if (targetEtape <= etape) return true
    if (targetEtape === 2) return prixBien >= 50000
    if (targetEtape === 3) return prixBien >= 50000
    return false
  }
  const goToEtape = (targetEtape: number) => { if (canGoToEtape(targetEtape)) { setEtape(targetEtape); scrollToTop() } }

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-white">
      <h1 className="sr-only">Simulateur de faisabilité d&apos;achat immobilier</h1>
      {/* Modal de reprise */}
      {showResumeModal && pendingToResume && (
        <ResumeModal
          simulation={pendingToResume}
          onResume={handleResume}
          onNew={handleNew}
        />
      )}

      {/* === STEPPER + ACTIONS === */}
      <div className="border-b border-aquiz-gray-lighter/60 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop */}
          <div className="hidden md:flex items-center py-4 relative">
            {/* Bouton retour desktop — label contextuel */}
            <button
              type="button"
              onClick={etapeActuelleIndex > 0 ? goToPrevEtape : () => router.push('/simulateur')}
              className="flex items-center gap-1.5 mr-5 px-3 py-1.5 rounded-lg text-sm text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {etapeActuelleIndex === 0 ? 'Retour' : ETAPES[etapeActuelleIndex - 1].label}
            </button>
            <div className="w-px h-6 bg-aquiz-gray-lighter mr-5" />
            {ETAPES.map((e, index) => {
              const isActive = e.id === etape
              const isPassed = index < etapeActuelleIndex
              const isClickable = canGoToEtape(e.id)
              
              return (
                <div key={e.id} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => goToEtape(e.id)}
                    disabled={!isClickable}
                    className={`group flex items-center gap-3 transition-all ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}`}
                  >
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                      ${isActive 
                        ? 'bg-aquiz-green text-white shadow-md shadow-aquiz-green/20' 
                        : isPassed 
                          ? 'bg-aquiz-green/15 text-aquiz-green' 
                          : 'bg-gray-100 text-gray-400'
                      }
                    `}>
                      {isPassed ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className={`text-sm font-semibold transition-colors ${
                      isActive ? 'text-aquiz-green' : isPassed ? 'text-aquiz-green' : 'text-gray-400'
                    }`}>
                      {e.label}
                    </span>
                  </button>
                  
                  {index < ETAPES.length - 1 && (
                    <div className="flex-1 mx-4">
                      <div className={`h-0.5 rounded-full transition-all duration-300 ${isPassed ? 'bg-aquiz-green' : 'bg-gray-200'}`} />
                    </div>
                  )}
                </div>
              )
            })}
              <AutoSaveIndicator lastSavedAt={autoSave.lastSavedAt} className="absolute right-0 top-1/2 -translate-y-1/2" />
          </div>
          
          {/* Mobile */}
          <div className="md:hidden py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Bouton retour mobile — label contextuel */}
              <button
                type="button"
                onClick={etapeActuelleIndex > 0 ? goToPrevEtape : () => router.push('/simulateur')}
                className="w-8 h-8 rounded-full bg-aquiz-gray-lightest flex items-center justify-center text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lighter transition-colors"
                aria-label={etapeActuelleIndex === 0 ? 'Retour' : `Retour à ${ETAPES[etapeActuelleIndex - 1].label}`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <div>
                <p className="text-sm font-semibold text-aquiz-black">{ETAPES[etapeActuelleIndex].label}</p>
                <p className="text-[11px] text-aquiz-gray">Étape {etapeActuelleIndex + 1} sur {ETAPES.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AutoSaveIndicator lastSavedAt={autoSave.lastSavedAt} />
              <div className="flex gap-1.5">
              {ETAPES.map((e, index) => {
                const isClickable = canGoToEtape(e.id)
                return (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => isClickable && goToEtape(e.id)}
                    disabled={!isClickable}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index < etapeActuelleIndex 
                        ? 'bg-aquiz-green w-5' 
                        : index === etapeActuelleIndex 
                          ? 'bg-aquiz-green w-7' 
                          : 'bg-aquiz-gray-lighter w-5'
                    } ${isClickable ? 'cursor-pointer hover:opacity-70' : 'cursor-not-allowed'}`}
                    aria-label={`Étape ${index + 1}: ${e.label}`}
                  />
                )
              })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* ÉTAPE 1 : Le bien ciblé */}
        {etape === 1 && (
          <div className="animate-fade-in">
            {/* Header simple */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-aquiz-black">Le bien ciblé</h2>
              <p className="text-aquiz-gray text-sm mt-0.5">Renseignez les informations du bien que vous visez</p>
            </div>
            
            <div className="space-y-5">
              {/* Section 1: Prix du bien */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-bold flex items-center justify-center">1</div>
                    <h3 className="font-semibold text-aquiz-black text-sm">Prix du bien</h3>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-aquiz-gray-light" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">Prix de vente affiché (hors frais de notaire)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="p-5">
                  <MoneyInput
                    value={prixBien}
                    onChange={setPrixBien}
                    placeholder="450 000"
                    className="h-11 text-base bg-white border border-aquiz-gray-lighter rounded-lg font-medium placeholder:text-aquiz-gray-light"
                  />
                </div>
              </div>

              {/* Section 2: Type de bien */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-bold flex items-center justify-center">2</div>
                    <h3 className="font-semibold text-aquiz-black text-sm">Type de bien</h3>
                  </div>
                </div>
                <div className="p-5 space-y-5">
                  {/* État du bien */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-aquiz-gray-dark">État du bien</Label>
                    <RadioGroup
                      value={typeBien}
                      onValueChange={(v) => setTypeBien(v as 'neuf' | 'ancien')}
                      className="grid grid-cols-2 gap-3"
                    >
                      {['ancien', 'neuf'].map((value) => (
                        <label 
                          key={value}
                          htmlFor={`type-${value}`}
                          className={`relative flex items-center justify-center h-12 rounded-lg cursor-pointer transition-all text-sm font-medium border ${
                            typeBien === value 
                              ? 'bg-aquiz-green text-white border-aquiz-green' 
                              : 'bg-white text-aquiz-gray-dark border-aquiz-gray-lighter hover:border-aquiz-gray-light'
                          }`}
                        >
                          <RadioGroupItem value={value} id={`type-${value}`} className="sr-only" />
                          <div className="text-center">
                            <span>{value === 'ancien' ? 'Ancien' : 'Neuf'}</span>
                            <p className={`text-xs mt-0.5 ${typeBien === value ? 'text-white/70' : 'text-aquiz-gray'}`}>
                              Frais {value === 'ancien' ? '~7-8%' : '~2-3%'}
                            </p>
                          </div>
                          {typeBien === value && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-aquiz-gray-lighter shadow-sm">
                              <CheckCircle className="w-3.5 h-3.5 text-aquiz-green" />
                            </div>
                          )}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Type de logement */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-aquiz-gray-dark">Type de logement</Label>
                    <RadioGroup
                      value={typeLogement}
                      onValueChange={(v) => setTypeLogement(v as 'appartement' | 'maison')}
                      className="grid grid-cols-2 gap-3"
                    >
                      {[
                        { value: 'appartement', label: 'Appartement', icon: Building },
                        { value: 'maison', label: 'Maison', icon: Home }
                      ].map((item) => {
                        const Icon = item.icon
                        return (
                          <label 
                            key={item.value}
                            htmlFor={`logement-${item.value}`}
                            className={`relative flex items-center justify-center gap-2 h-12 rounded-lg cursor-pointer transition-all text-sm font-medium border ${
                              typeLogement === item.value 
                                ? 'bg-aquiz-green text-white border-aquiz-green' 
                                : 'bg-white text-aquiz-gray-dark border-aquiz-gray-lighter hover:border-aquiz-gray-light'
                            }`}
                          >
                            <RadioGroupItem value={item.value} id={`logement-${item.value}`} className="sr-only" />
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                            {typeLogement === item.value && (
                              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-aquiz-gray-lighter shadow-sm">
                                <CheckCircle className="w-3.5 h-3.5 text-aquiz-green" />
                              </div>
                            )}
                          </label>
                        )
                      })}
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {/* Section 3: Localisation */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-bold flex items-center justify-center">3</div>
                    <h3 className="font-semibold text-aquiz-black text-sm">Localisation</h3>
                    <Badge variant="secondary" className="text-[10px] font-normal">Optionnel</Badge>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <LocalisationSearch
                    value={codePostal}
                    onChange={(cp, nom) => {
                      setCodePostal(cp)
                      setNomCommune(nom)
                    }}
                    placeholder="Ville ou code postal (ex: Paris, 75001)"
                  />
                  {/* Feedback localisation */}
                  {infoLocalisation && (
                    <div className="p-4 bg-aquiz-gray-lightest rounded-lg space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between text-sm">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-aquiz-gray flex items-center gap-1 cursor-help">
                                Zone PTZ
                                <Info className="w-3 h-3" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[280px] text-xs">
                              <p className="font-semibold mb-1">Prêt à Taux Zéro</p>
                              <p>Prêt sans intérêts pour les primo-accédants. Le montant dépend de la zone géographique et du prix du bien.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="font-medium text-aquiz-black">
                          {infoLocalisation.zonePTZ} - {infoLocalisation.descriptionZone}
                        </span>
                      </div>
                      {infoLocalisation.isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-aquiz-gray">
                          <div className="w-4 h-4 border-2 border-aquiz-green border-t-transparent rounded-full animate-spin" />
                          <span>Chargement des prix du marché...</span>
                        </div>
                      ) : (
                        <>
                          {(nomCommune || infoLocalisation.nomCommune) && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-aquiz-gray">Commune</span>
                              <span className="font-medium text-aquiz-black">
                                {nomCommune || infoLocalisation.nomCommune}
                              </span>
                            </div>
                          )}
                          {infoLocalisation.prixLocalM2 ? (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-aquiz-gray">Prix médian ({typeLogement})</span>
                                <span className="font-medium text-aquiz-black">
                                  {formatMontant(infoLocalisation.prixLocalM2)} €/m²
                                </span>
                              </div>
                              {infoLocalisation.surfaceEstimee && prixBien > 0 && (
                                <div className="flex items-center justify-between text-sm bg-aquiz-green/10 -mx-4 px-4 py-2">
                                  <span className="text-aquiz-gray">Surface estimée</span>
                                  <span className="font-bold text-aquiz-green">
                                    ~{infoLocalisation.surfaceEstimee} m²
                                  </span>
                                </div>
                              )}
                              {infoLocalisation.nbVentes && infoLocalisation.nbVentes > 0 && (
                                <div className="text-[10px] text-aquiz-gray text-right">
                                  {infoLocalisation.source} • {infoLocalisation.nbVentes} ventes
                                </div>
                              )}
                            </>
                          ) : infoLocalisation.prixFallbackM2 ? (
                            <>
                              <div className="text-xs text-orange-500 mb-2">
                                Peu ou pas de ventes de maisons dans cette commune
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-aquiz-gray">Prix médian (appartement)</span>
                                <span className="font-medium text-aquiz-black">
                                  {formatMontant(infoLocalisation.prixFallbackM2)} €/m²
                                </span>
                              </div>
                              <div className="text-[10px] text-aquiz-gray italic">
                                Référence appartement (à titre indicatif)
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-orange-500">
                              Pas de données de prix pour ce code postal
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {!infoLocalisation && (
                    <p className="text-xs text-aquiz-gray">Entrez un code postal pour voir les infos locales (PTZ, prix/m²)</p>
                  )}
                </div>
              </div>

              {/* Récapitulatif des coûts */}
              {prixBien > 0 && (
                <div className="bg-aquiz-green/5 rounded-xl border border-aquiz-green/20 overflow-hidden animate-fade-in">
                  <div className="px-5 py-3.5 border-b border-aquiz-green/20 flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-aquiz-green" />
                    <h3 className="font-semibold text-aquiz-black text-sm">Récapitulatif des coûts</h3>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-aquiz-gray">Prix du bien</p>
                        <p className="font-bold text-aquiz-black">{formatMontant(prixBien)} €</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-aquiz-gray">Frais notaire</p>
                        <p className="font-bold text-aquiz-black">{formatMontant(Math.round(calculs.fraisNotaire))} €</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-aquiz-gray">Frais annexes</p>
                        <p className="font-bold text-aquiz-black">{formatMontant(Math.round(calculs.fraisAnnexes))} €</p>
                      </div>
                      <div className="p-3 bg-aquiz-green rounded-lg">
                        <p className="text-xs text-white/80">Coût total</p>
                        <p className="font-bold text-white">{formatMontant(Math.round(calculs.coutTotal))} €</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Alertes de validation */}
              {prixBien > 0 && validations.alerts.filter(a => 
                a.message.includes('Prix') || a.message.includes('bas')
              ).length > 0 && (
                <div className="space-y-2">
                  {validations.alerts.filter(a => 
                    a.message.includes('Prix') || a.message.includes('bas')
                  ).map((alert, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                      alert.type === 'error' ? 'bg-red-50 text-red-700' :
                      alert.type === 'warning' ? 'bg-orange-50 text-orange-700' :
                      'bg-aquiz-gray-lightest text-aquiz-gray'
                    }`}>
                      <AlertTriangle className={`w-4 h-4 shrink-0 ${
                        alert.type === 'error' ? 'text-red-500' :
                        alert.type === 'warning' ? 'text-orange-500' : 'text-aquiz-gray'
                      }`} />
                      <span>{alert.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Choix : Continuer ou Être accompagné */}
              {prixBien > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 1 : Être accompagné (CTA principal) */}
                    <button
                      type="button"
                      onClick={() => setShowContactModal(true)}
                      className="group p-4 bg-aquiz-green hover:bg-aquiz-green/90 rounded-xl transition-all shadow-md shadow-aquiz-green/20 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-white">Je veux être accompagné</p>
                        <p className="text-xs text-white/60 mt-0.5">Un conseiller me rappelle gratuitement</p>
                      </div>
                    </button>
                    
                    {/* Option 2 : Continuer la simulation */}
                    <button
                      type="button"
                      onClick={goToNextEtape}
                      disabled={!validations.canProceed}
                      className="group p-4 bg-white hover:bg-aquiz-green/5 border-2 border-aquiz-green rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-aquiz-green/10 flex items-center justify-center shrink-0 group-hover:bg-aquiz-green/20 transition-colors">
                        <ArrowRight className="w-5 h-5 text-aquiz-green" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-aquiz-green">Continuer ma simulation</p>
                        <p className="text-xs text-aquiz-gray mt-0.5">Voir les mensualités et revenus requis</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Bouton Continuer simple (si pas de prix) */}
              {prixBien === 0 && (
                <Button
                  type="button"
                  className="w-full h-12 text-base bg-aquiz-green hover:bg-aquiz-green/90 transition-all shadow-lg"
                  onClick={goToNextEtape}
                  disabled={true}
                >
                  Continuer
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Financement souhaité */}
        {etape === 2 && (
          <div className="animate-fade-in">

            {/* Header simple */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-aquiz-black">Financement souhaité</h2>
              <p className="text-aquiz-gray text-sm mt-0.5">Apport et paramètres du prêt</p>
            </div>

            {/* Rappel du bien - style noir */}
            <div className="flex items-center justify-between p-4 bg-aquiz-green rounded-xl mb-5">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-white/70" />
                <span className="text-sm text-white/70">Bien ciblé</span>
              </div>
              <span className="font-bold text-white">{formatMontant(prixBien)} €</span>
            </div>
            
            <div className="space-y-5">
              {/* Section 1: Apport personnel */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-bold flex items-center justify-center">1</div>
                    <h3 className="font-semibold text-aquiz-black text-sm">Apport personnel</h3>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-aquiz-gray-light" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">Somme que vous pouvez investir immédiatement (épargne, donations, etc.)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="p-5 space-y-4">
                  <MoneyInput
                    value={apport}
                    onChange={setApport}
                    placeholder="30 000"
                    className="h-11 text-base bg-white border border-aquiz-gray-lighter rounded-lg font-medium placeholder:text-aquiz-gray-light"
                  />

                  {/* Indicateur de suffisance */}
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                    calculs.apportSuffisant
                      ? 'bg-aquiz-green/10 text-aquiz-green'
                      : 'bg-orange-50 text-orange-700'
                  }`}>
                    {calculs.apportSuffisant ? (
                      <>
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>Apport suffisant ({prixBien > 0 ? ((apport / prixBien) * 100).toFixed(0) : 0}% du prix)</span>
                      </>
                    ) : (
                      <>
                        <Info className="w-4 h-4 shrink-0 text-orange-500" />
                        <span>Recommandé : min {formatMontant(calculs.apportMinimum10)} € (10%)</span>
                      </>
                    )}
                  </div>

                  {/* Montant à emprunter */}
                  <div className="p-4 bg-aquiz-gray-lightest rounded-xl flex justify-between items-center">
                    <span className="text-sm text-aquiz-gray">À emprunter</span>
                    <span className="text-xl font-bold text-aquiz-black">
                      {formatMontant(Math.round(calculs.montantAEmprunter))} €
                    </span>
                  </div>

                  {/* Message si apport excédentaire */}
                  {calculs.apportExcedentaire && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-aquiz-gray-lightest text-aquiz-gray">
                      <Info className="w-4 h-4 shrink-0 text-aquiz-gray" />
                      <span>
                        Votre apport ({formatMontant(apport)} €) couvre plus que le coût total.
                        Excédent : <strong>{formatMontant(Math.round(calculs.excedentApport))} €</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Paramètres du prêt */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-bold flex items-center justify-center">2</div>
                    <h3 className="font-semibold text-aquiz-black text-sm">Paramètres du prêt</h3>
                  </div>
                </div>
                <div className="p-5 space-y-6">
                  {/* Durée */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium text-aquiz-gray-dark">Durée du prêt</Label>
                      <span className="text-sm font-bold text-aquiz-black tabular-nums px-2.5 py-1 bg-aquiz-gray-lightest rounded-md">{dureeAns} ans</span>
                    </div>
                    <Slider
                      value={[dureeAns]}
                      onValueChange={(v) => setDureeAns(v[0])}
                      min={10}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-aquiz-gray">
                      <span>10 ans</span>
                      <span>30 ans</span>
                    </div>
                  </div>

                  {/* Taux d'intérêt */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-aquiz-gray-dark">Taux d&apos;intérêt</Label>
                    <Select
                      value={tauxInteret.toFixed(1)}
                      onValueChange={(v) => setTauxInteret(parseFloat(v))}
                    >
                      <SelectTrigger className="h-11 bg-white border border-aquiz-gray-lighter rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3.2">3.2% (Optimiste)</SelectItem>
                        <SelectItem value="3.5">3.5% (Moyen)</SelectItem>
                        <SelectItem value="3.8">3.8% (Conservateur)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Aperçu mensualité */}
              {calculs.mensualiteTotal > 0 && (
                <div className="bg-aquiz-green/5 rounded-xl border border-aquiz-green/20 overflow-hidden animate-fade-in" aria-live="polite">
                  <div className="p-5 text-center">
                    <p className="text-xs text-aquiz-gray uppercase tracking-wide">Mensualité estimée</p>
                    <p className="text-3xl font-bold text-aquiz-green mt-1">
                      {formatMontant(Math.round(calculs.mensualiteTotal))} €
                      <span className="text-base font-normal text-aquiz-gray">/mois</span>
                    </p>
                  </div>
                  <div className="px-5 pb-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-lg text-center">
                        <p className="text-xs text-aquiz-gray">Crédit</p>
                        <p className="font-semibold text-aquiz-black">{formatMontant(Math.round(calculs.mensualiteCredit))} €</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg text-center">
                        <p className="text-xs text-aquiz-gray">Assurance</p>
                        <p className="font-semibold text-aquiz-black">{formatMontant(Math.round(calculs.mensualiteAssurance))} €</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Alertes de validation */}
              {validations.alerts.filter(a => 
                a.message.includes('Apport') || 
                a.message.includes('Durée') || 
                a.message.includes('Taux') ||
                a.message.includes('dépasse')
              ).length > 0 && (
                <div className="space-y-2">
                  {validations.alerts.filter(a => 
                    a.message.includes('Apport') || 
                    a.message.includes('Durée') || 
                    a.message.includes('Taux') ||
                    a.message.includes('dépasse')
                  ).map((alert, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                      alert.type === 'error' ? 'bg-red-50 text-red-700' :
                      alert.type === 'warning' ? 'bg-orange-50 text-orange-700' :
                      'bg-aquiz-gray-lightest text-aquiz-gray'
                    }`}>
                      <AlertTriangle className={`w-4 h-4 shrink-0 ${
                        alert.type === 'error' ? 'text-red-500' :
                        alert.type === 'warning' ? 'text-orange-500' : 'text-aquiz-gray'
                      }`} />
                      <span>{alert.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <Button
                type="button"
                className="w-full h-12 text-base bg-aquiz-green hover:bg-aquiz-green/90 transition-all shadow-lg rounded-xl"
                onClick={goToNextEtape}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Lancer la vérification
              </Button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Résultat - Ce qu'il FAUT */}
        {etape === 3 && (
          <div className="animate-fade-in" aria-live="polite">

            {/* Header résultat — blanc/vert, sobre */}
            <div className="mb-6 rounded-2xl border border-aquiz-gray-lighter bg-white overflow-hidden shadow-sm">
              {/* Accent vert */}
              <div className="h-1 bg-aquiz-green" />

              <div className="px-5 sm:px-7 py-5 sm:py-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-aquiz-black leading-tight">
                      Ce qu&apos;il me faut pour acheter
                    </h2>
                    <p className="text-sm text-aquiz-gray mt-1">
                      {formatMontant(prixBien)} € · {typeBien === 'neuf' ? 'Bien neuf' : 'Bien ancien'}{nomCommune ? ` · ${nomCommune}` : ''}
                    </p>
                  </div>

                  {/* Actions desktop */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={goToPrevEtape}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-aquiz-gray-lighter text-aquiz-gray text-xs font-medium hover:border-aquiz-green hover:text-aquiz-green active:scale-[0.97] transition-all duration-200"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Modifier
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
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aquiz-black text-white text-xs font-semibold hover:bg-aquiz-black/85 active:scale-[0.97] transition-all duration-200"
                    >
                      <FileDown className="w-4 h-4" />
                      Mon étude PDF
                    </button>
                  </div>
                </div>

                {/* Actions mobile */}
                <div className="sm:hidden flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={goToPrevEtape}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-aquiz-gray-lighter text-aquiz-gray text-sm font-medium hover:border-aquiz-green hover:text-aquiz-green active:scale-[0.98] transition-all duration-200"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Modifier
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
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-aquiz-black text-white text-sm font-semibold hover:bg-aquiz-black/85 active:scale-[0.98] transition-all duration-200"
                  >
                    <FileDown className="w-4 h-4" />
                    Mon étude PDF
                  </button>
                </div>
              </div>

              {/* Keyframe for pulse highlight */}
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

            <div className="space-y-5">

              {/* Chiffre clé : Revenus minimums (flouté) */}
              <div className="bg-aquiz-green rounded-xl p-6 text-center">
                <p className="text-xs uppercase tracking-wider text-white/60 mb-2">
                  Revenus mensuels requis
                </p>
                <p className="text-4xl font-bold text-white">
                  {formatMontant(calculs.revenusMinimums33)} €
                </p>
                <p className="text-xs text-white/50 mt-1">
                  nets / mois (foyer) pour 33% d&apos;endettement
                </p>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-center gap-8 text-sm">
                  <div>
                    <span className="text-white/50">À 35%</span>
                    <span className="text-white font-medium ml-2">{formatMontant(calculs.revenusMinimums35)} €</span>
                  </div>
                  <div className="w-px bg-white/20" />
                  <div>
                    <span className="text-white/50">Mensualité</span>
                    <span className="text-white font-medium ml-2">{formatMontant(Math.round(calculs.mensualiteTotal))} €</span>
                  </div>
                </div>
              </div>

              {/* Détails financiers */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 bg-aquiz-gray-lightest border-b border-aquiz-gray-lighter flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-bold flex items-center justify-center">1</div>
                  <h3 className="font-semibold text-aquiz-black text-sm">Détail du financement</h3>
                </div>
                <div className="divide-y divide-aquiz-gray-lighter">
                  <div className="flex justify-between px-5 py-3">
                    <span className="text-sm text-aquiz-gray">Prix du bien</span>
                    <span className="text-sm font-medium text-aquiz-black">{formatMontant(prixBien)} €</span>
                  </div>
                  <div className="flex justify-between px-5 py-3">
                    <span className="text-sm text-aquiz-gray">Frais de notaire ({typeBien === 'neuf' ? '~3%' : '~8%'})</span>
                    <span className="text-sm font-medium text-aquiz-black">{formatMontant(Math.round(calculs.fraisNotaire))} €</span>
                  </div>
                  <div className="flex justify-between px-5 py-3">
                    <span className="text-sm text-aquiz-gray">Frais annexes</span>
                    <span className="text-sm font-medium text-aquiz-black">{formatMontant(Math.round(calculs.fraisAnnexes))} €</span>
                  </div>
                  <div className="flex justify-between px-5 py-3 bg-aquiz-gray-lightest">
                    <span className="text-sm font-semibold text-aquiz-black">Coût total projet</span>
                    <span className="text-sm font-bold text-aquiz-black">{formatMontant(Math.round(calculs.coutTotal))} €</span>
                  </div>
                  <div className="flex justify-between px-5 py-3">
                    <span className="text-sm text-aquiz-gray">Votre apport</span>
                    <span className="text-sm font-medium text-aquiz-black">{formatMontant(apport)} €</span>
                  </div>
                  <div className="flex justify-between px-5 py-3">
                    <span className="text-sm text-aquiz-gray">Montant emprunté</span>
                    <span className="text-sm font-medium text-aquiz-black">{formatMontant(Math.round(calculs.montantAEmprunter))} €</span>
                  </div>
                  <div className="flex justify-between px-5 py-3">
                    <span className="text-sm text-aquiz-gray">Coût total crédit (intérêts + assurance)</span>
                    <span className="text-sm font-medium text-aquiz-black">{formatMontant(Math.round(calculs.coutTotalCredit))} €</span>
                  </div>
                </div>
              </div>

              {/* Répartition du coût total */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-bold flex items-center justify-center">2</div>
                  <h3 className="font-semibold text-aquiz-black text-sm">Répartition du coût total</h3>
                </div>
              <div className="p-5">
                {/* Barre de répartition horizontale minimaliste */}
                <div className="h-3 rounded-full overflow-hidden flex bg-aquiz-gray-lighter">
                  {calculs.repartitionCout.map((item, i) => (
                    <div
                      key={i}
                      className="h-full"
                      style={{
                        width: `${calculs.totalProjet > 0 ? (item.value / calculs.totalProjet) * 100 : 0}%`,
                        backgroundColor: item.color
                      }}
                    />
                  ))}
                </div>
                {/* Légende simple */}
                <div className="grid grid-cols-2 gap-4 mt-5">
                  {calculs.repartitionCout.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-aquiz-gray">{item.label}</span>
                          <span className="text-xs text-aquiz-gray ml-2">
                            {calculs.totalProjet > 0 ? ((item.value / calculs.totalProjet) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-aquiz-black">
                          {formatMontant(item.value)} €
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Total */}
                <div className="mt-5 pt-4 border-t border-aquiz-gray-lighter flex justify-between items-center">
                  <span className="text-sm text-aquiz-gray">Total sur {dureeAns} ans</span>
                  <span className="text-lg font-bold text-aquiz-black">{formatMontant(Math.round(calculs.totalProjet))} €</span>
                </div>
              </div>
            </div>

              {/* GRAPHIQUE : Mensualité selon durée */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-bold flex items-center justify-center">3</div>
                  <h3 className="font-semibold text-aquiz-black text-sm">Mensualité selon la durée</h3>
                </div>
              <div className="p-5">
                {/* Graphique barres minimaliste */}
                <div className="flex items-end justify-between gap-4" style={{ height: '120px' }}>
                  {calculs.simulationsDuree.map((sim) => {
                    const maxMens = Math.max(...calculs.simulationsDuree.map(s => s.mensualite))
                    const minMens = Math.min(...calculs.simulationsDuree.map(s => s.mensualite))
                    const range = maxMens - minMens
                    const normalizedHeight = range > 0 
                      ? 35 + ((sim.mensualite - minMens) / range) * 65
                      : 50
                    const isSelected = sim.duree === dureeAns
                    return (
                      <div key={sim.duree} className="flex-1 flex flex-col items-center h-full">
                        <span className={`text-xs font-medium mb-2 ${isSelected ? 'text-aquiz-green' : 'text-aquiz-gray'}`}>
                          {formatMontant(sim.mensualite)} €
                        </span>
                        <div className="flex-1 w-full flex items-end">
                          <div 
                            className={`w-full rounded-t transition-all ${
                              isSelected ? 'bg-aquiz-green' : 'bg-aquiz-gray-lighter'
                            }`}
                            style={{ height: `${normalizedHeight}%` }}
                          />
                        </div>
                        <span className={`mt-2 text-xs ${isSelected ? 'font-semibold text-aquiz-black' : 'text-aquiz-gray'}`}>
                          {sim.duree} ans
                        </span>
                      </div>
                    )
                  })}
                </div>
                {/* Info simple avec icônes */}
                <div className="mt-5 pt-4 border-t border-aquiz-gray-lighter">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-2 text-aquiz-gray">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Durée longue = mensualité réduite</span>
                    </div>
                    <div className="flex items-center gap-2 text-aquiz-gray">
                      <Info className="w-3.5 h-3.5" />
                      <span>Mais coût total plus élevé</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Mensualité détaillée */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-bold flex items-center justify-center">4</div>
                  <h3 className="font-semibold text-aquiz-black text-sm">Mensualité</h3>
                </div>
              <div className="p-5">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-3xl font-bold text-aquiz-black">{formatMontant(Math.round(calculs.mensualiteTotal))} €</p>
                    <p className="text-xs text-aquiz-gray">par mois pendant {dureeAns} ans</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-aquiz-gray">Crédit : <span className="text-aquiz-black font-medium">{formatMontant(Math.round(calculs.mensualiteCredit))} €</span></p>
                    <p className="text-aquiz-gray">Assurance : <span className="text-aquiz-black font-medium">{formatMontant(Math.round(calculs.mensualiteAssurance))} €</span></p>
                  </div>
                </div>
                {/* Barre de progression visuelle */}
                <div className="h-2 bg-aquiz-gray-lighter rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-aquiz-green rounded-full"
                    style={{ width: `${calculs.mensualiteTotal > 0 ? (calculs.mensualiteCredit / calculs.mensualiteTotal) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-aquiz-gray">
                  <span>Crédit ({calculs.mensualiteTotal > 0 ? ((calculs.mensualiteCredit / calculs.mensualiteTotal) * 100).toFixed(0) : 0}%)</span>
                  <span>Assurance ({calculs.mensualiteTotal > 0 ? ((calculs.mensualiteAssurance / calculs.mensualiteTotal) * 100).toFixed(0) : 0}%)</span>
                </div>
              </div>
            </div>

              {/* Apport - indicateur simple */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PiggyBank className="w-4 h-4 text-aquiz-green" />
                    <h3 className="font-semibold text-aquiz-black text-sm">Apport recommandé</h3>
                  </div>
                  {apport > 0 && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      calculs.apportSuffisant 
                        ? 'bg-aquiz-green/10 text-aquiz-green' 
                        : 'bg-aquiz-gray-lighter text-aquiz-gray'
                    }`}>
                      {calculs.apportSuffisant ? '✓ Suffisant' : 'À compléter'}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-aquiz-gray-lightest rounded-lg">
                      <p className="text-xs text-aquiz-gray mb-1">Minimum (10%)</p>
                      <p className="text-lg font-bold text-aquiz-black">{formatMontant(calculs.apportMinimum10)} €</p>
                    </div>
                    <div className="text-center p-3 bg-aquiz-gray-lightest rounded-lg">
                      <p className="text-xs text-aquiz-gray mb-1">Idéal (20%)</p>
                      <p className="text-lg font-bold text-aquiz-black">{formatMontant(calculs.apportIdeal20)} €</p>
                    </div>
                  </div>
                  {apport > 0 && (
                    <p className="mt-3 text-sm text-aquiz-gray text-center">
                      Votre apport : <span className="font-semibold text-aquiz-black">{formatMontant(apport)} €</span> ({prixBien > 0 ? ((apport / prixBien) * 100).toFixed(0) : 0}%)
                    </p>
                  )}
                </div>
              </div>

              {/* Comparatif durées - compact */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 bg-aquiz-gray-lightest border-b border-aquiz-gray-lighter">
                  <h3 className="font-semibold text-aquiz-black text-sm">Autres durées possibles</h3>
                </div>
              <div className="divide-y divide-aquiz-gray-lighter">
                {calculs.simulationsDuree.map((sim) => (
                  <div 
                    key={sim.duree}
                    className={`flex items-center justify-between px-5 py-3 ${
                      sim.duree === dureeAns ? 'bg-aquiz-green/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {sim.duree === dureeAns && (
                        <span className="w-5 h-5 rounded-full bg-aquiz-green flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </span>
                      )}
                      <span className={`text-sm ${sim.duree === dureeAns ? 'font-semibold text-aquiz-black' : 'text-aquiz-gray'}`}>
                        {sim.duree} ans
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <span className={sim.duree === dureeAns ? 'font-medium text-aquiz-black' : 'text-aquiz-gray'}>
                        {formatMontant(sim.mensualite)} €/mois
                      </span>
                      <span className={`w-24 text-right ${sim.duree === dureeAns ? 'font-medium text-aquiz-black' : 'text-aquiz-gray'}`}>
                        {formatMontant(sim.revenusMinimums)} € requis
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

              {/* Info localisation si renseignée */}
              {infoLocalisation && (
                <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                  <div className="px-5 py-3.5 bg-aquiz-gray-lightest border-b border-aquiz-gray-lighter flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-aquiz-green" />
                      <h3 className="font-semibold text-aquiz-black text-sm">Localisation</h3>
                    </div>
                    <span className="text-xs text-aquiz-gray">{codePostal}</span>
                  </div>
                <div className="divide-y divide-aquiz-gray-lighter">
                  {(nomCommune || infoLocalisation.nomCommune) && (
                    <div className="flex justify-between px-5 py-2.5">
                      <span className="text-sm text-aquiz-gray">Commune</span>
                      <span className="text-sm font-medium text-aquiz-black">{nomCommune || infoLocalisation.nomCommune}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-5 py-2.5">
                    <span className="text-sm text-aquiz-gray">Zone PTZ</span>
                    <span className="text-sm font-medium text-aquiz-black">{infoLocalisation.zonePTZ}</span>
                  </div>
                  {infoLocalisation.prixLocalM2 && (
                    <div className="flex justify-between px-5 py-2.5">
                      <span className="text-sm text-aquiz-gray">Prix médian {typeLogement}</span>
                      <span className="text-sm font-medium text-aquiz-black">{formatMontant(infoLocalisation.prixLocalM2)} €/m²</span>
                    </div>
                  )}
                  {infoLocalisation.surfaceEstimee && (
                    <div className="flex justify-between px-5 py-2.5 bg-aquiz-green/5">
                      <span className="text-sm text-aquiz-gray">Surface estimée pour {formatMontant(prixBien)} €</span>
                      <span className="text-sm font-semibold text-aquiz-green">~{infoLocalisation.surfaceEstimee} m²</span>
                    </div>
                  )}
                  <div className="flex justify-between px-5 py-2.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm text-aquiz-gray flex items-center gap-1 cursor-help">
                            PTZ ({typeBien})
                            <Info className="w-3 h-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[300px] text-xs">
                          <p className="font-semibold mb-1">Prêt à Taux Zéro</p>
                          <p className="mb-2">Prêt immobilier sans intérêts accordé par l&apos;État aux primo-accédants.</p>
                          <ul className="space-y-1 text-[11px]">
                            <li>• <strong>Zone {infoLocalisation.zonePTZ}</strong> : jusqu&apos;à 150 000 € de base</li>
                            <li>• <strong>Quotité</strong> : 40% du plafond en neuf</li>
                            <li>• Sous conditions de revenus</li>
                            <li>• Résidence principale uniquement</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className={`text-sm font-medium ${infoLocalisation.ptzEligible ? 'text-aquiz-green' : 'text-aquiz-gray'}`}>
                      {infoLocalisation.ptzEligible 
                        ? `Éligible (~${formatMontant(infoLocalisation.ptzMontant)} €)` 
                        : infoLocalisation.ptzRaison || 'Non éligible'
                      }
                    </span>
                  </div>
                  {infoLocalisation.source && (
                    <div className="px-5 py-2 text-[10px] text-aquiz-gray text-right border-t border-aquiz-gray-lighter">
                      Source : {infoLocalisation.source} {infoLocalisation.nbVentes ? `• ${infoLocalisation.nbVentes} ventes` : ''}
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Alertes et conseils finaux */}
              {validations.alerts.filter(a => 
                a.message.includes('Revenus') || 
                a.message.includes('Mensualité') ||
                a.message.includes('épargne')
              ).length > 0 && (
                <div className="space-y-2">
                  {validations.alerts.filter(a => 
                    a.message.includes('Revenus') || 
                    a.message.includes('Mensualité') ||
                    a.message.includes('épargne')
                  ).map((alert, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                      alert.type === 'error' ? 'bg-red-50 text-red-700' :
                      alert.type === 'warning' ? 'bg-orange-50 text-orange-700' :
                      'bg-aquiz-gray-lightest text-aquiz-gray'
                    }`}>
                      <Info className={`w-4 h-4 shrink-0 ${
                        alert.type === 'error' ? 'text-red-500' :
                        alert.type === 'warning' ? 'text-orange-500' : 'text-aquiz-gray'
                      }`} />
                      <span>{alert.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setEtape(1); scrollToTop() }}
                  className="flex-1 h-12 border-aquiz-gray-lighter text-aquiz-gray hover:text-aquiz-green hover:border-aquiz-green"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Modifier le bien
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push('/simulateur/mode-a?new=true')}
                  className="flex-1 h-12 bg-aquiz-green hover:bg-aquiz-green/90"
                >
                  Tester mon profil
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* CTA Bonus — Recevez votre étude personnalisée PDF (email capture) */}
              <div id="pdf-gate" className="mt-6">
                <div className="rounded-xl overflow-hidden bg-white border border-aquiz-gray-lighter" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                  <div className="px-5 py-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
                        <FileDown className="w-5 h-5 text-aquiz-green" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-aquiz-black">
                          Votre étude personnalisée est prête
                        </h3>
                        <p className="text-aquiz-gray text-xs">
                          Analyse IA, données de quartier, financement et conseils sur mesure
                        </p>
                      </div>
                    </div>

                    {!pdfEmailSent ? (
                      <>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray/40" />
                            <input
                              type="email"
                              value={pdfEmailValue}
                              onChange={e => setPdfEmailValue(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSendPdfEmail()}
                              placeholder="votre@email.fr"
                              className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 text-aquiz-black placeholder:text-aquiz-gray/50 text-sm border border-aquiz-gray-lighter focus:border-aquiz-green focus:ring-2 focus:ring-aquiz-green/20 focus:outline-none transition-colors"
                            />
                          </div>
                          <Button
                            type="button"
                            disabled={pdfEmailLoading || !pdfEmailValue}
                            onClick={handleSendPdfEmail}
                            className="h-11 bg-aquiz-green hover:bg-aquiz-green/90 text-white text-sm font-bold rounded-xl px-5 transition-colors"
                          >
                            {pdfEmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Recevoir'}
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 mt-2.5 text-[10px] text-aquiz-gray">
                          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-aquiz-green" /> Analyse IA</span>
                          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-aquiz-green" /> Gratuit</span>
                          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-aquiz-green" /> Sans spam</span>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-aquiz-green text-sm">
                          <CheckCircle className="w-5 h-5 text-aquiz-green" />
                          <span className="font-medium">Étude téléchargée !</span>
                        </div>
                        <Button
                          type="button"
                          disabled={pdfLoading}
                          onClick={async () => {
                            setPdfLoading(true)
                            try { await generatePDF(cachedEnrichissement ?? undefined) } finally { setPdfLoading(false) }
                          }}
                          className="w-full h-11 bg-aquiz-green hover:bg-aquiz-green/90 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                          Re-télécharger mon étude
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CTA Accompagnement projet */}
              <div className="mt-6 bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-aquiz-black font-semibold text-sm">
                        Besoin d&apos;aide pour la suite ?
                      </h3>
                      <p className="text-aquiz-gray text-xs">
                        Échangez avec un conseiller pour valider votre projet — sans engagement
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://calendly.com/contact-aquiz/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto h-10 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl px-5 flex items-center justify-center gap-2 transition-colors"
                  >
                    Échanger avec un conseiller
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Note discrète */}
              <p className="text-xs text-center text-aquiz-gray pt-2 flex items-center justify-center gap-1">
                <Info className="w-3 h-3" />
                Vous avez les revenus ? Testez le <Link href="/simulateur/mode-a" className="underline hover:text-aquiz-black">Mode A</Link> pour connaître votre capacité réelle.
              </p>
            </div>

              {/* Mobile sticky bar */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-sm border-t border-aquiz-gray-lighter z-20">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => document.getElementById('pdf-gate')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex-1 h-11 bg-aquiz-black hover:bg-aquiz-black/90 text-white rounded-xl gap-2 text-sm"
                  >
                    <FileDown className="w-4 h-4 shrink-0" />
                    Mon PDF
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowContactModal(true)}
                    className="flex-1 h-11 bg-aquiz-green hover:bg-aquiz-green/90 text-white rounded-xl gap-2 text-sm"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    Conseiller
                  </Button>
                </div>
              </div>
              <div className="lg:hidden h-20" />
          </div>
        )}
      </main>
    </div>
    
    {/* Modale Contact */}
    <ContactModal 
      isOpen={showContactModal} 
      onClose={() => setShowContactModal(false)}
      onSuccess={() => {
        // Afficher le toast
        setShowSuccessToast(true)
        // Cacher le toast après 4 secondes
        setTimeout(() => setShowSuccessToast(false), 4000)
        // Passer à l'étape suivante si on est à l'étape 1
        if (etape === 1) {
          goToNextEtape()
        }
      }}
    />
    
    {/* Toast de succès */}
    {showSuccessToast && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in" role="status" aria-live="polite">
        <div className="flex items-center gap-3 px-5 py-3 bg-aquiz-green text-white rounded-xl shadow-lg">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">Demande envoyée !</p>
            <p className="text-sm text-white/80">Un conseiller vous rappellera très bientôt</p>
          </div>
        </div>
      </div>
    )}
    </TooltipProvider>
  )
}
