'use client'

import { LocalisationSearch } from '@/components/simulateur'
import { AutoSaveIndicator, ResumeModal, useAutoSave } from '@/components/simulation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip'
import { SIMULATEUR_CONFIG } from '@/config/simulateur.config'
import { useSimulationSave } from '@/hooks/useSimulationSave'
import { trackEvent } from '@/lib/analytics'
import { logger } from '@/lib/logger'
import type { EnrichissementPDF } from '@/lib/pdf/enrichirPourPDF'
import { enrichirPourPDF } from '@/lib/pdf/enrichirPourPDF'
import { formatMontant } from '@/lib/utils/formatters'
import { calculerMontantPTZ, getInfoPTZ } from '@/lib/utils/zonePTZ'
import { getUtmData } from '@/lib/utm'
import { hasValidEmail, useLeadStore } from '@/stores/useLeadStore'
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Building,
    Check,
    CheckCircle,
    Home,
    Info,
    MapPin,
    Phone,
    TrendingUp
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cell, Pie, PieChart, Tooltip as RechartsTooltip } from 'recharts'

const ContactModal = dynamic(() => import('@/components/contact').then(m => ({ default: m.ContactModal })), { ssr: false })
// SimulationPDFModeB is imported dynamically inside generatePDF

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
  const hasTrackedResults = useRef(false)
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

  // Invalider le cache enrichissement quand les données clés changent
  // (évite de re-télécharger un rapport avec l'ancienne ville)
  useEffect(() => {
    setCachedEnrichissement(null)
    setPdfEmailSent(false)
  }, [prixBien, codePostal, nomCommune, typeBien, typeLogement, apport, dureeAns, tauxInteret])

  // Calculs en temps réel
  const calculs = useMemo(() => {
    // Frais de notaire
    const tauxNotaire =
      typeBien === 'neuf'
        ? SIMULATEUR_CONFIG.fraisNotaireNeuf
        : SIMULATEUR_CONFIG.fraisNotaireAncien
    const fraisNotaire = prixBien * tauxNotaire

    // Honoraires AQUIZ selon la tranche du bien
    const fraisAnnexes =
      prixBien < 500_000 ? 5_900 :
      prixBien < 800_000 ? 8_900 :
      Math.round(prixBien * 0.02)

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
      { label: 'Honoraires AQUIZ', value: fraisAnnexesArrondi, color: '#9ca3af' },
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
    
    return {
      alerts,
      hasErrors: alerts.some(a => a.type === 'error'),
      hasWarnings: alerts.some(a => a.type === 'warning'),
      canProceed: prixBien >= 50000 && codePostal.length >= 5 && !alerts.some(a => a.type === 'error')
    }
  }, [prixBien, codePostal, apport, dureeAns, tauxInteret, calculs])

  // Scroll to top when changing step
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Track simulation start (once per mount)
  const hasTrackedStart = useRef(false)
  useEffect(() => {
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true
      trackEvent('simulation-b-start', {})
    }
  }, [])

  const goToNextEtape = () => {
    setEtape((e) => {
      const next = Math.min(e + 1, 3)
      if (next !== e) trackEvent('simulation-b-step', { from: e, to: next })
      return next
    })
    scrollToTop()
  }
  const goToPrevEtape = () => {
    setEtape((e) => {
      const prev = Math.max(e - 1, 1)
      if (prev !== e) trackEvent('simulation-b-step', { from: e, to: prev })
      return prev
    })
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
    const { SimulationPDFModeB: SimulationPDFModeBComponent } = await import('@/components/pdf/SimulationPDFModeB')
    const blob = await pdf(
      <SimulationPDFModeBComponent
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
    trackEvent('pdf-download', { source: 'simulation-b' })
  }, [prixBien, typeBien, typeLogement, codePostal, nomCommune, apport, dureeAns, tauxInteret, calculs, infoLocalisation])

  /** Capture email bonus + génère le PDF en local */
  const handleSendPdfEmail = useCallback(async () => {
    if (!pdfEmailValue || pdfEmailLoading) return
    setPdfEmailLoading(true)
    try {
      // 1. Capture lead (non-bloquant — on génère le PDF même si ça échoue)
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: pdfEmailValue,
            source: 'simulateur-b',
            contexte: { prixBien, typeBien, dureeAns, apport, ...getUtmData() }
          })
        })
        if (res.ok) {
          leadStore.capture(pdfEmailValue, 'simulateur-b', undefined, { prixBien, typeBien, dureeAns, apport })
        }
      } catch { /* lead capture failed — continue anyway */ }
      // 2. Enrichir le PDF avec IA + données quartier (Mode B = a codePostal)
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
      // 3. Cacher l'enrichissement pour re-téléchargement + générer PDF
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
  }, [save, currentSaveId, etape, prixBien, typeBien, typeLogement, codePostal, nomCommune, apport, dureeAns, tauxInteret, calculs.mensualiteTotal, calculs.fraisNotaire])

  // Track when user reaches results (step 3)
  useEffect(() => {
    if (etape === 3 && prixBien > 0 && !hasTrackedResults.current) {
      hasTrackedResults.current = true
      trackEvent('simulation-b', { prixBien, typeBien, typeLogement, codePostal, apport, dureeAns, mensualite: Math.round(calculs.mensualiteTotal), fraisNotaire: Math.round(calculs.fraisNotaire) })
    }
    if (etape !== 3) {
      hasTrackedResults.current = false
    }
  }, [etape, prixBien, typeBien, typeLogement, codePostal, apport, dureeAns, calculs.mensualiteTotal, calculs.fraisNotaire])

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
  const goToEtape = (targetEtape: number) => { if (canGoToEtape(targetEtape)) { if (targetEtape !== etape) trackEvent('simulation-b-step', { from: etape, to: targetEtape }); setEtape(targetEtape); scrollToTop() } }

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

      {/* === STEPPER NAVIGATION (style Pretto/Stripe — stepper centré, pas de breadcrumb) === */}
      {/* Schema.org BreadcrumbList caché pour le SEO */}
      <ol className="sr-only" itemScope itemType="https://schema.org/BreadcrumbList">
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <a href="/" itemProp="item"><span itemProp="name">Accueil</span></a>
          <meta itemProp="position" content="1" />
        </li>
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <a href="/simulateur" itemProp="item"><span itemProp="name">Simulateur</span></a>
          <meta itemProp="position" content="2" />
        </li>
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <span itemProp="name">Faisabilité</span>
          <meta itemProp="position" content="3" />
        </li>
      </ol>

      <nav aria-label="Progression de la simulation" className="bg-white border-b border-gray-100 sticky top-0 z-30 md:static md:z-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* ── Desktop ── */}
          <div className="hidden md:flex items-center justify-center h-14 relative">
            {/* Retour — contextuel : étape précédente ou page simulateur */}
            <button
              type="button"
              onClick={etapeActuelleIndex > 0 ? goToPrevEtape : () => router.push('/simulateur')}
              className="absolute left-0 flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-gray-400 hover:text-gray-800 rounded-lg hover:bg-gray-50 transition-all group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
              <span>{etapeActuelleIndex === 0 ? 'Retour' : ETAPES[etapeActuelleIndex - 1].label}</span>
            </button>

            {/* Stepper centré */}
            <ol className="flex items-center">
              {ETAPES.map((e, index) => {
                const isActive = e.id === etape
                const isPassed = e.id < etape
                const isClickable = canGoToEtape(e.id)
                const isLast = index === ETAPES.length - 1
                
                return (
                  <Fragment key={e.id}>
                    <li>
                      <button
                        type="button"
                        onClick={() => isClickable && goToEtape(e.id)}
                        disabled={!isClickable}
                        className={`flex items-center gap-2 px-1 py-1 transition-all duration-200 ${
                          isClickable && !isActive ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-aquiz-green text-white shadow-sm shadow-aquiz-green/25'
                            : isPassed
                              ? 'bg-aquiz-green/10 text-aquiz-green'
                              : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isPassed ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : e.id}
                        </div>
                        <span className={`text-[13px] transition-colors duration-200 ${
                          isActive
                            ? 'text-gray-900 font-semibold'
                            : isPassed
                              ? 'text-aquiz-green font-medium'
                              : 'text-gray-400 font-medium'
                        }`}>
                          {e.label}
                        </span>
                      </button>
                    </li>
                    {!isLast && (
                      <li aria-hidden="true" className="flex items-center mx-3">
                        <div className={`w-10 h-px transition-colors duration-300 ${
                          isPassed ? 'bg-aquiz-green/30' : 'bg-gray-200'
                        }`} />
                      </li>
                    )}
                  </Fragment>
                )
              })}
            </ol>

            {/* Auto-save */}
            <div className="absolute right-0">
              <AutoSaveIndicator lastSavedAt={autoSave.lastSavedAt} />
            </div>
          </div>

          {/* ── Mobile ── */}
          <div className="md:hidden">
            <div className="flex items-center h-12 relative">
              {/* Retour */}
              <button
                type="button"
                onClick={etapeActuelleIndex > 0 ? goToPrevEtape : () => router.push('/simulateur')}
                className="w-8 h-8 flex items-center justify-center text-gray-500 active:text-gray-900 active:bg-gray-100 rounded-full transition-colors shrink-0 -ml-1"
                aria-label={etapeActuelleIndex === 0 ? 'Retour au simulateur' : `Retour à ${ETAPES[etapeActuelleIndex - 1].label}`}
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>

              {/* Progress bar + label — centré */}
              <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2">
                <span className="text-[12px] font-semibold text-gray-800">
                  {ETAPES[etapeActuelleIndex].label}
                </span>
                <div className="flex items-center gap-1.5 w-full max-w-[140px]">
                  {ETAPES.map((e) => {
                    const isActive = e.id === etape
                    const isPassed = e.id < etape
                    return (
                      <div
                        key={e.id}
                        className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                          isPassed
                            ? 'bg-aquiz-green'
                            : isActive
                              ? 'bg-aquiz-green/60'
                              : 'bg-gray-200'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Étape X/3 */}
              <span className="text-[11px] text-gray-400 font-medium tabular-nums shrink-0 mr-0.5">
                {etapeActuelleIndex + 1}/{ETAPES.length}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
        {/* ÉTAPE 1 : Le bien ciblé */}
        {etape === 1 && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-aquiz-black tracking-tight">Le bien ciblé</h2>
              <p className="text-aquiz-gray text-sm sm:text-base mt-1">Renseignez les informations du bien que vous visez</p>
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
                        <p className="text-xs text-aquiz-gray">Honoraires AQUIZ</p>
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
                      onClick={() => { setShowContactModal(true); trackEvent('cta-click', { type: 'contact-modal', position: 'mode-b-accompagne', page: 'mode-b' }) }}
                      className="group relative overflow-hidden p-5 bg-aquiz-green hover:bg-aquiz-green/90 rounded-xl transition-all shadow-lg shadow-aquiz-green/25 flex flex-col items-center justify-center gap-2 min-h-[80px]"
                    >
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-white/90 shrink-0" />
                        <p className="text-xl font-extrabold text-white tracking-tight">On s&apos;en occupe ?</p>
                      </div>
                      <p className="text-[11px] text-white/70 font-medium">Je prends RDV dès maintenant !</p>
                    </button>
                    
                    {/* Option 2 : Continuer la simulation */}
                    <button
                      type="button"
                      onClick={goToNextEtape}
                      disabled={!validations.canProceed}
                      className="group p-5 bg-white hover:bg-aquiz-green/5 border-2 border-aquiz-green rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2 min-h-[80px]"
                    >
                      <div className="flex items-center gap-3">
                        <ArrowRight className="w-5 h-5 text-aquiz-green shrink-0" />
                        <p className="text-xl font-extrabold text-aquiz-green tracking-tight">Continuer</p>
                      </div>
                      <p className="text-[11px] text-aquiz-gray font-medium">Voir les mensualités et revenus requis</p>
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

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-aquiz-black tracking-tight">Financement souhaité</h2>
              <p className="text-aquiz-gray text-sm sm:text-base mt-1">Apport et paramètres du prêt</p>
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
                      max={25}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-aquiz-gray">
                      <span>10 ans</span>
                      <span>25 ans</span>
                    </div>
                  </div>

                  {/* Taux d'intérêt */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium text-aquiz-gray-dark">Taux d&apos;intérêt</Label>
                      <span className={`text-sm font-bold tabular-nums px-2.5 py-1 rounded-md ${
                        tauxInteret <= 3.2 ? 'bg-emerald-50 text-emerald-700' :
                        tauxInteret <= 3.5 ? 'bg-aquiz-green/10 text-aquiz-green' :
                        tauxInteret <= 3.7 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-600'
                      }`}>{tauxInteret.toFixed(1)}%</span>
                    </div>
                    <div className="relative">
                      <div
                        className="absolute inset-0 h-1.5 top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                        style={{ background: 'linear-gradient(to right, #059669, #34d399, #fbbf24, #f87171)' }}
                      />
                      <Slider
                        value={[tauxInteret * 10]}
                        onValueChange={(v) => setTauxInteret(v[0] / 10)}
                        min={30}
                        max={40}
                        step={1}
                        className="w-full [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-aquiz-gray">
                      <span className="text-emerald-600">3.0%</span>
                      <span className="text-red-500">4.0%</span>
                    </div>
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
                Calculer ma capacité sur ce bien
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
                    {/* PDF DÉSACTIVÉ — PHASE 2
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
                    */}
                  </div>
                </div>

                {/* Actions mobile — hidden, bottom bar handles this */}
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

              {/* Chiffre clé : Revenus minimums */}
              <div className="bg-aquiz-green rounded-2xl p-5 sm:p-7">
                <p className="text-xs uppercase tracking-widest text-white/60 mb-3">Revenus mensuels requis</p>
                <p className="text-4xl sm:text-5xl font-extrabold text-white tabular-nums">
                  {formatMontant(calculs.revenusMinimums35)} €
                </p>
                <p className="text-xs text-white/50 mt-2 mb-5">nets / mois · taux d&apos;endettement 35% (norme HCSF)</p>
                <div className="border-t border-white/15 pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">Mensualité</p>
                    <p className="text-base font-semibold text-white tabular-nums">{formatMontant(Math.round(calculs.mensualiteTotal))} € / mois</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">Apport conseillé</p>
                    <p className="text-base font-semibold text-white tabular-nums">{formatMontant(apport > 0 ? apport : Math.round(calculs.coutTotal * 0.1))} €</p>
                  </div>
                </div>
              </div>

              {/* Détails financiers */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-aquiz-gray-lightest border-b border-aquiz-gray-lighter flex items-center gap-2 sm:gap-3">
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
                    <span className="text-sm text-aquiz-gray">Honoraires AQUIZ</span>
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

              {/* Répartition du coût total — Donut premium */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-aquiz-gray-lightest border-b border-aquiz-gray-lighter flex items-center gap-2 sm:gap-3">
                  <div className="w-5 h-5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-bold flex items-center justify-center">2</div>
                  <h3 className="font-semibold text-aquiz-black text-sm">Répartition du coût total</h3>
                </div>
                <div className="p-5 sm:p-7">
                  <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">

                    {/* Donut avec texte centré */}
                    <div className="relative shrink-0">
                      <PieChart width={220} height={220}>
                        <Pie
                          data={calculs.repartitionCout}
                          cx={110}
                          cy={110}
                          innerRadius={68}
                          outerRadius={104}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="label"
                          strokeWidth={0}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-out"
                        >
                          {calculs.repartitionCout.map((item, i) => (
                            <Cell key={i} fill={item.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value, name) => [`${formatMontant(Number(value))} €`, name as string]}
                          contentStyle={{ fontSize: '12px', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                        />
                      </PieChart>
                      {/* Texte au centre du donut */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] uppercase tracking-widest text-aquiz-gray mb-0.5">Coût total</span>
                        <span className="text-base font-extrabold text-aquiz-black tabular-nums leading-tight">
                          {formatMontant(Math.round(calculs.totalProjet))} €
                        </span>
                        <span className="text-[10px] text-aquiz-gray mt-0.5">sur {dureeAns} ans</span>
                      </div>
                    </div>

                    {/* Légende cartes */}
                    <div className="flex-1 w-full grid grid-cols-1 gap-2.5">
                      {calculs.repartitionCout.map((item, i) => {
                        const pct = calculs.totalProjet > 0 ? (item.value / calculs.totalProjet) * 100 : 0
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-aquiz-gray-lightest"
                            style={{ borderLeft: `4px solid ${item.color}` }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-aquiz-gray leading-none mb-1">{item.label}</p>
                              <p className="text-sm font-bold text-aquiz-black tabular-nums">{formatMontant(item.value)} €</p>
                            </div>
                            <span
                              className="text-sm font-extrabold tabular-nums shrink-0"
                              style={{ color: item.color }}
                            >
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>

                  </div>
                </div>
              </div>

              {/* GRAPHIQUE : Mensualité selon durée */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-bold flex items-center justify-center">3</div>
                  <h3 className="font-semibold text-aquiz-black text-sm">Mensualité selon la durée</h3>
                </div>
              <div className="p-4 sm:p-5">
                {/* Graphique barres minimaliste */}
                <div className="flex items-end justify-between gap-2 sm:gap-4" style={{ height: '120px' }}>
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
                <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-aquiz-gray-lighter">
                  <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 text-xs">
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

              {/* Comparatif durées - compact */}
              <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-aquiz-gray-lightest border-b border-aquiz-gray-lighter">
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
                    <div className="flex gap-3 sm:gap-6 text-xs sm:text-sm">
                      <span className={sim.duree === dureeAns ? 'font-medium text-aquiz-black' : 'text-aquiz-gray'}>
                        {formatMontant(sim.mensualite)} €/mois
                      </span>
                      <span className={`w-20 sm:w-24 text-right ${sim.duree === dureeAns ? 'font-medium text-aquiz-black' : 'text-aquiz-gray'}`}>
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
                    <div className="flex justify-between px-3 sm:px-5 py-2">
                      <span className="text-xs sm:text-sm text-aquiz-gray shrink-0">Commune</span>
                      <span className="text-xs sm:text-sm font-medium text-aquiz-black text-right">{nomCommune || infoLocalisation.nomCommune}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 sm:px-5 py-2">
                    <span className="text-xs sm:text-sm text-aquiz-gray">Zone PTZ</span>
                    <span className="text-xs sm:text-sm font-medium text-aquiz-black">{infoLocalisation.zonePTZ}</span>
                  </div>
                  {infoLocalisation.prixLocalM2 && (
                    <div className="flex justify-between px-3 sm:px-5 py-2">
                      <span className="text-xs sm:text-sm text-aquiz-gray shrink-0">Prix médian {typeLogement}</span>
                      <span className="text-xs sm:text-sm font-medium text-aquiz-black ml-2">{formatMontant(infoLocalisation.prixLocalM2)} €/m²</span>
                    </div>
                  )}
                  {infoLocalisation.surfaceEstimee && (
                    <div className="flex justify-between px-3 sm:px-5 py-2 bg-aquiz-green/5">
                      <span className="text-xs sm:text-sm text-aquiz-gray shrink-0">Surface estimée pour {formatMontant(prixBien)} €</span>
                      <span className="text-xs sm:text-sm font-semibold text-aquiz-green ml-2">~{infoLocalisation.surfaceEstimee} m²</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start px-3 sm:px-5 py-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs sm:text-sm text-aquiz-gray flex items-center gap-1 cursor-help shrink-0">
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
                    <span className={`text-xs sm:text-sm font-medium text-right ml-2 ${infoLocalisation.ptzEligible ? 'text-aquiz-green' : 'text-aquiz-gray'}`}>
                      {infoLocalisation.ptzEligible 
                        ? `Éligible (~${formatMontant(infoLocalisation.ptzMontant)} €)` 
                        : infoLocalisation.ptzRaison || 'Non éligible'
                      }
                    </span>
                  </div>

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
              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setEtape(1); scrollToTop() }}
                  className="flex-1 h-10 sm:h-12 text-sm border-aquiz-gray-lighter text-aquiz-gray hover:text-aquiz-green hover:border-aquiz-green"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5 sm:mr-2" />
                  Modifier le bien
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push('/simulateur/mode-a?new=true')}
                  className="flex-1 h-10 sm:h-12 text-sm bg-aquiz-green hover:bg-aquiz-green/90"
                >
                  Tester mon profil
                  <ArrowRight className="w-4 h-4 ml-1.5 sm:ml-2" />
                </Button>
              </div>

              {/* PDF DÉSACTIVÉ — PHASE 2
              <div id="pdf-gate" className="mt-4 sm:mt-6">
                <div className="rounded-xl border border-aquiz-gray-lighter bg-aquiz-gray-lightest/50 px-4 sm:px-5 py-4 sm:py-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-aquiz-green/10 flex items-center justify-center shrink-0">
                      <FileDown className="w-4 h-4 text-aquiz-green" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-aquiz-black">
                        {pdfEmailSent ? 'Étude téléchargée !' : 'Recevez votre étude de faisabilité'}
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
                        try { await generatePDF(cachedEnrichissement ?? undefined) } finally { setPdfLoading(false) }
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
              */}

              {/* CTA Accompagnement projet — hidden on mobile, bottom bar has Conseiller */}
              <div className="hidden sm:block mt-6 rounded-2xl overflow-hidden border border-aquiz-green/20 bg-gradient-to-br from-aquiz-green/5 to-aquiz-green/10">
                <div className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-aquiz-green/15 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-aquiz-green" />
                    </div>
                    <div>
                      <h3 className="text-aquiz-black font-bold text-sm">
                        Besoin d&apos;aide pour la suite ?
                      </h3>
                      <p className="text-aquiz-gray text-xs mt-0.5">
                        Échangez avec un conseiller pour valider votre projet — sans engagement
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://calendly.com/contact-aquiz/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('cta-click', { type: 'calendly', position: 'mode-b-results', page: 'mode-b' })}
                    className="w-full sm:w-auto h-10 bg-aquiz-green hover:bg-aquiz-green/90 text-white text-sm font-semibold rounded-xl px-5 flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    Échanger avec un conseiller
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Note discrète — hidden on mobile (bottom bar has navigation) */}
              <p className="hidden sm:flex text-xs text-center text-aquiz-gray pt-2 items-center justify-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                Vous avez les revenus ? Testez le <Link href="/simulateur/mode-a" className="underline hover:text-aquiz-black">Mode A</Link> pour connaître votre capacité réelle.
              </p>
            </div>

              {/* Mobile sticky bar */}
              <div className="sm:hidden fixed bottom-0 left-0 right-0 px-3 pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-sm border-t border-aquiz-gray-lighter z-20">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={goToPrevEtape}
                    className="h-10 px-3 bg-white border border-aquiz-gray-lighter text-aquiz-gray hover:text-aquiz-green hover:border-aquiz-green rounded-xl text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Button>
                  {/* PDF DÉSACTIVÉ — PHASE 2
                  <Button
                    type="button"
                    onClick={() => document.getElementById('pdf-gate')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex-1 h-10 bg-aquiz-black hover:bg-aquiz-black/90 text-white rounded-xl gap-1.5 text-xs"
                  >
                    <FileDown className="w-3.5 h-3.5 shrink-0" />
                    Mon PDF
                  </Button>
                  */}
                  <Button
                    type="button"
                    onClick={() => { setShowContactModal(true); trackEvent('cta-click', { type: 'contact-modal', position: 'mode-b-bottombar', page: 'mode-b' }) }}
                    className="flex-1 h-10 bg-aquiz-green hover:bg-aquiz-green/90 text-white rounded-xl gap-1.5 text-xs"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    Conseiller
                  </Button>
                </div>
              </div>
              <div className="sm:hidden h-16" />
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
      contextData={{
        prixBien: prixBien > 0 ? prixBien : undefined,
        localisation: nomCommune ? `${codePostal} — ${nomCommune}` : codePostal || undefined,
        typeBien: typeBien,
        mensualite: calculs.mensualiteTotal > 0 ? Math.round(calculs.mensualiteTotal) : undefined,
        honoraires: calculs.fraisAnnexes,
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
