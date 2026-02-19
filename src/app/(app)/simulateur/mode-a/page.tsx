'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { pdf } from '@react-pdf/renderer'
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    ChevronDown,
    Clock,
    CreditCard,
    Download,
    Info,
    MapPin,
    Percent,
    Phone,
    PiggyBank,
    Shield
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import MiniCarteIDF from '@/components/carte/MiniCarteIDF'
import { ConseilsAvances } from '@/components/conseils'
import { ContactModal } from '@/components/contact'
import { SimulationPDF } from '@/components/pdf/SimulationPDF'
import { AutoSaveIndicator, ResumeModal, useAutoSave } from '@/components/simulation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SIMULATEUR_CONFIG } from '@/config/simulateur.config'
import { ZONES_ILE_DE_FRANCE } from '@/data/prix-m2-idf'
import { useDVFData } from '@/hooks/useDVFData'
import { useSimulationSave } from '@/hooks/useSimulationSave'
import { calculerScoreFaisabilite } from '@/lib/calculs/scoreFaisabilite'
import { genererConseilsAvances } from '@/lib/conseils/genererConseilsAvances'
import { modeASchema, type ModeAFormData } from '@/lib/validators/schemas'
import { useSimulateurStore } from '@/stores/useSimulateurStore'

const STATUTS_PROFESSIONNELS = [
  { value: 'cdi', label: 'CDI', description: 'Meilleure acceptation bancaire' },
  { value: 'fonctionnaire', label: 'Fonctionnaire', description: 'Profil très apprécié' },
  { value: 'cdd', label: 'CDD', description: 'Conditions plus strictes' },
  { value: 'independant', label: 'Indépendant / TNS', description: '3 ans d\'ancienneté requis' },
  { value: 'retraite', label: 'Retraité', description: 'Selon âge et revenus' },
  { value: 'autre', label: 'Autre', description: '' }
]

const ETAPES = [
  { id: 'profil', label: 'Profil', numero: 1 },
  { id: 'simulation', label: 'Simulation', numero: 2 },
  { id: 'resultats', label: 'Résultats', numero: 3 }
] as const

type EtapeId = typeof ETAPES[number]['id']

// Constante hors du composant pour éviter les re-renders infinis
const DEPARTEMENTS_IDF = ['75', '77', '78', '91', '92', '93', '94', '95'] as const

function ModeAPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNewSimulation = searchParams.get('new') === 'true'
  
  // Convertir le numéro d'étape du store en ID
  const getEtapeIdFromNumber = (num: number): EtapeId => {
    const etape = ETAPES.find(e => e.numero === num)
    return etape?.id || 'profil'
  }
  const getEtapeNumberFromId = (id: EtapeId): number => {
    const etape = ETAPES.find(e => e.id === id)
    return etape?.numero || 1
  }
  const [etape, setEtapeLocal] = useState<EtapeId>('profil')
  const [age, setAge] = useState(30)
  const [statutProfessionnel, setStatutProfessionnel] = useState('')
  const [showResumeModal, setShowResumeModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showScoreDetail, setShowScoreDetail] = useState(false)
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null)
  const { 
    setMode, setProfil, setParametresModeA, setResultats, reset: resetStore,
    resultats: storedResultats, 
    profil: storedProfil,
    parametresModeA: storedParametresModeA,
    etapeActuelle: storedEtape, 
    setEtape: setEtapeStore 
  } = useSimulateurStore()
  const { simulations, isLoaded, save, getPending } = useSimulationSave()
  
  // Fonction setEtape qui synchronise local + store + scroll haut
  const setEtape = useCallback((newEtape: EtapeId) => {
    setEtapeLocal(newEtape)
    setEtapeStore(getEtapeNumberFromId(newEtape))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [setEtapeStore])
  
  // Flag pour éviter double restauration
  const [hasRestoredFromStore, setHasRestoredFromStore] = useState(false)
  
  // Données DVF réelles - utiliser la constante externe
  const { zones: zonesReelles } = useDVFData(DEPARTEMENTS_IDF)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ModeAFormData>({
    resolver: zodResolver(modeASchema),
    defaultValues: {
      situationFoyer: 'celibataire', nombreEnfants: 0, salaire1: 0, salaire2: 0,
      autresRevenus: 0, creditsEnCours: 0, autresCharges: 0, mensualiteMax: 0,
      dureeAns: 20, apport: 0, typeBien: 'ancien', tauxInteret: 3.5
    }
  })

  // Restaurer l'étape ET les données depuis le store au chargement
  // UNIQUEMENT si on revient d'une page interne (carte, aides) via ?returning=1
  // Sinon, on laisse la modale décider (reprise ou nouvelle)
  useEffect(() => {
    // Si c'est une nouvelle simulation, ne pas restaurer et rester à l'étape 1
    if (isNewSimulation) {
      resetStore()
      setEtapeLocal('profil')
      setEtapeStore(1)
      setHasRestoredFromStore(true)
      window.history.replaceState({}, '', '/simulateur/mode-a')
      return
    }
    
    // Vérifier si on revient d'une page interne (carte, aides…)
    const params = new URLSearchParams(window.location.search)
    const isReturning = params.get('returning') === '1'
    
    if (isReturning && !hasRestoredFromStore && storedResultats && storedEtape >= 2 && storedProfil && storedParametresModeA) {
      // Retour interne : restaurer silencieusement
      setEtapeLocal(getEtapeIdFromNumber(storedEtape))
      
      setAge(storedProfil.age)
      setStatutProfessionnel(storedProfil.statutProfessionnel)
      setValue('situationFoyer', storedProfil.situationFoyer)
      setValue('nombreEnfants', storedProfil.nombreEnfants)
      setValue('salaire1', storedProfil.salaire1)
      setValue('salaire2', storedProfil.salaire2)
      setValue('autresRevenus', storedProfil.autresRevenus)
      setValue('creditsEnCours', storedProfil.creditsEnCours)
      setValue('autresCharges', storedProfil.autresCharges)
      
      setValue('mensualiteMax', storedParametresModeA.mensualiteMax)
      setValue('dureeAns', storedParametresModeA.dureeAns)
      setValue('apport', storedParametresModeA.apport)
      setValue('typeBien', storedParametresModeA.typeBien)
      setValue('tauxInteret', storedParametresModeA.tauxInteret)
      
      setHasRestoredFromStore(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
   
  }, [storedResultats, storedEtape, storedProfil, storedParametresModeA, hasRestoredFromStore, setValue, isNewSimulation, setEtapeStore, resetStore])

  const situationFoyer = watch('situationFoyer')
  const nombreEnfants = watch('nombreEnfants') || 0
  const salaire1 = watch('salaire1') || 0
  const salaire2 = watch('salaire2') || 0
  const autresRevenus = watch('autresRevenus') || 0
  const creditsEnCours = watch('creditsEnCours') || 0
  const autresCharges = watch('autresCharges') || 0
  const mensualiteMax = watch('mensualiteMax') || 0
  const dureeAns = watch('dureeAns') || 20
  const apport = watch('apport') || 0
  const typeBien = watch('typeBien') || 'ancien'
  const tauxInteret = watch('tauxInteret') || 3.5

  const hasCheckedRef = useRef(false)
  const [pendingToResume, setPendingToResume] = useState<typeof simulations[0] | null>(null)

  useEffect(() => {
    if (hasCheckedRef.current || !isLoaded) return
    hasCheckedRef.current = true
    const restoreId = sessionStorage.getItem('aquiz-restore-id')
    if (restoreId) {
      sessionStorage.removeItem('aquiz-restore-id')
      const sim = simulations.find(s => s.id === restoreId)
      if (sim) { restoreSimulation(sim); setCurrentSaveId(restoreId); return }
    }
    // Ne pas afficher la modale si l'utilisateur revient d'une page interne (carte, aides…)
    // ou si c'est une nouvelle simulation explicite
    const params = new URLSearchParams(window.location.search)
    const isReturningParam = params.get('returning') === '1'
    const isReturningSession = sessionStorage.getItem('aquiz-navigating-away') === '1'
    
    if (isReturningParam || params.get('new') === 'true') {
      window.history.replaceState({}, '', window.location.pathname)
      sessionStorage.removeItem('aquiz-navigating-away')
      return
    }
    
    // Retour via bouton navigateur (back) depuis carte/aides
    // Le flag sessionStorage est posé quand on navigue vers ces pages
    if (isReturningSession) {
      sessionStorage.removeItem('aquiz-navigating-away')
      // Restaurer silencieusement depuis le store si données présentes
      if (storedProfil && (storedProfil.salaire1 > 0 || storedProfil.salaire2 > 0) && storedEtape >= 2) {
        setEtapeLocal(getEtapeIdFromNumber(storedEtape))
        setAge(storedProfil.age)
        setStatutProfessionnel(storedProfil.statutProfessionnel)
        setValue('situationFoyer', storedProfil.situationFoyer)
        setValue('nombreEnfants', storedProfil.nombreEnfants)
        setValue('salaire1', storedProfil.salaire1)
        setValue('salaire2', storedProfil.salaire2)
        setValue('autresRevenus', storedProfil.autresRevenus)
        setValue('creditsEnCours', storedProfil.creditsEnCours)
        setValue('autresCharges', storedProfil.autresCharges)
        if (storedParametresModeA) {
          setValue('mensualiteMax', storedParametresModeA.mensualiteMax)
          setValue('dureeAns', storedParametresModeA.dureeAns)
          setValue('apport', storedParametresModeA.apport)
          setValue('typeBien', storedParametresModeA.typeBien)
          setValue('tauxInteret', storedParametresModeA.tauxInteret)
        }
        return
      }
    }
    
    // Chercher une simulation à reprendre :
    // 1. D'abord une simulation en cours (non terminée)
    const pending = getPending('A')
    // 2. Sinon, la dernière simulation Mode A (même terminée)
    const lastSimA = simulations
      .filter(s => s.mode === 'A' && s.profil && s.profil.salaire1 > 0)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0]
    // 3. Sinon, vérifier si le Zustand store a des données
    const hasStoreData = !!(storedProfil && (storedProfil.salaire1 > 0 || storedProfil.salaire2 > 0))
    
    const simulationToResume = pending || lastSimA || null
    
    if (simulationToResume) {
      setPendingToResume(simulationToResume)
      setShowResumeModal(true)
    } else if (hasStoreData) {
      // Données dans le store mais pas de simulation sauvegardée
      // → on reset le store pour repartir propre
      resetStore()
    }
  }, [isLoaded, simulations, getPending, storedProfil, resetStore])

  const restoreSimulation = useCallback((sim: typeof simulations[0]) => {
    if (sim.profil) {
      setAge(sim.profil.age); setStatutProfessionnel(sim.profil.statutProfessionnel)
      setValue('situationFoyer', sim.profil.situationFoyer)
      setValue('nombreEnfants', sim.profil.nombreEnfants)
      setValue('salaire1', sim.profil.salaire1); setValue('salaire2', sim.profil.salaire2)
      setValue('autresRevenus', sim.profil.autresRevenus)
      setValue('creditsEnCours', sim.profil.creditsEnCours); setValue('autresCharges', sim.profil.autresCharges)
    }
    if (sim.modeAData) {
      setValue('mensualiteMax', sim.modeAData.mensualiteMax); setValue('dureeAns', sim.modeAData.dureeAns)
      setValue('apport', sim.modeAData.apport); setValue('typeBien', sim.modeAData.typeBien)
      setValue('tauxInteret', sim.modeAData.tauxInteret)
    }
    // Si simulation terminée, aller à l'étape resultats pour revoir
    if (sim.etape === 'resultats' || sim.status === 'terminee') {
      setEtape('resultats')
    } else if (sim.etape) {
      setEtape(sim.etape as EtapeId)
    }
    setCurrentSaveId(sim.id)
  }, [setValue, setEtape])

  const handleResume = useCallback(() => {
    if (pendingToResume) restoreSimulation(pendingToResume)
    setShowResumeModal(false)
    setPendingToResume(null)
  }, [pendingToResume, restoreSimulation])

  const handleNew = useCallback(() => {
    // Réinitialiser le store Zustand
    resetStore()
    // Réinitialiser le formulaire
    setValue('situationFoyer', 'celibataire')
    setValue('nombreEnfants', 0)
    setValue('salaire1', 0)
    setValue('salaire2', 0)
    setValue('autresRevenus', 0)
    setValue('creditsEnCours', 0)
    setValue('autresCharges', 0)
    setValue('mensualiteMax', 0)
    setValue('dureeAns', 20)
    setValue('apport', 0)
    setValue('typeBien', 'ancien')
    setValue('tauxInteret', 3.5)
    // Réinitialiser l'état local
    setAge(30)
    setStatutProfessionnel('')
    setCurrentSaveId(null)
    setEtapeLocal('profil')
    setHasRestoredFromStore(true) // Empêcher la restauration depuis le store
    // Fermer la modale
    setShowResumeModal(false)
    setPendingToResume(null)
  }, [resetStore, setValue])

  const handleSave = useCallback(() => {
    const isCompleted = etape === 'resultats'
    const savedSim = save({
      mode: 'A', etape, status: isCompleted ? 'terminee' : 'en_cours', existingId: currentSaveId || undefined,
      profil: { age, statutProfessionnel, situationFoyer, nombreEnfants, salaire1, salaire2, autresRevenus, creditsEnCours, autresCharges },
      modeAData: { mensualiteMax, dureeAns, apport, typeBien, tauxInteret }
    })
    setCurrentSaveId(savedSim.id)
  }, [save, currentSaveId, etape, age, statutProfessionnel, situationFoyer, nombreEnfants, salaire1, salaire2, autresRevenus, creditsEnCours, autresCharges, mensualiteMax, dureeAns, apport, typeBien, tauxInteret])

  // Auto-save : Ctrl+S + auto-save au changement d'étape
  const autoSave = useAutoSave(handleSave, salaire1 === 0)

  // Re-sauvegarder après chaque changement d'étape pour que la progression soit à jour
  useEffect(() => {
    if (salaire1 > 0) {
      // Petit délai pour que le state soit bien à jour
      const timer = setTimeout(() => autoSave.triggerSave(), 100)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape])

  // Mensualité max recommandée - calcul EXACT incluant l'assurance
  // Résolution de : (charges + M + assurance(M)) / revenus = 35%
  // Avec assurance(M) = (M / facteur) * tauxAssurance / 12
  // => M * (1 + tauxAssurance / (12 * facteur)) = revenus * 0.35 - charges
  const mensualiteRecommandee = useMemo(() => {
    const revenus = salaire1 + salaire2 + autresRevenus
    const charges = creditsEnCours + autresCharges
    if (revenus <= 0) return 0
    
    const tauxMensuel = tauxInteret / 100 / 12
    const nombreMois = dureeAns * 12
    const facteur = tauxMensuel > 0 ? tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -nombreMois)) : 0
    const tauxAssurance = SIMULATEUR_CONFIG.tauxAssuranceMoyen
    
    // Coefficient multiplicateur : chaque € de mensualité génère aussi de l'assurance
    const coeffAssurance = facteur > 0 ? 1 + tauxAssurance / (12 * facteur) : 1
    
    const maxBrut = (revenus * 0.35 - charges) / coeffAssurance
    
    // Arrondir à 1€ en dessous pour garantir <= 35% tout en reflétant l'impact du taux
    return Math.max(0, Math.floor(maxBrut))
  }, [salaire1, salaire2, autresRevenus, creditsEnCours, autresCharges, tauxInteret, dureeAns])

  // Synchroniser la mensualité max avec la recommandation HCSF
  useEffect(() => {
    if (mensualiteRecommandee > 0) {
      setValue('mensualiteMax', mensualiteRecommandee)
    }
  }, [mensualiteRecommandee, setValue])

  const calculs = useMemo(() => {
    const revenusMensuelsTotal = salaire1 + salaire2 + autresRevenus
    const chargesMensuellesTotal = creditsEnCours + autresCharges
    const tauxEndettementActuel = revenusMensuelsTotal > 0 ? (chargesMensuellesTotal / revenusMensuelsTotal) * 100 : 0
    const endettementActuelEleve = tauxEndettementActuel > 35
    const tauxMensuel = tauxInteret / 100 / 12
    const nombreMois = dureeAns * 12
    const facteur = tauxMensuel > 0 ? tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -nombreMois)) : 0
    const capitalEmpruntable = facteur > 0 ? mensualiteMax / facteur : 0
    const tauxAssurance = SIMULATEUR_CONFIG.tauxAssuranceMoyen
    const mensualiteAssurance = (capitalEmpruntable * tauxAssurance) / 12
    const mensualitesTotalesProjet = chargesMensuellesTotal + mensualiteMax + mensualiteAssurance
    // Arrondir à 1 décimale pour cohérence affichage/calcul
    const tauxEndettementProjet = revenusMensuelsTotal > 0 
      ? Math.round((mensualitesTotalesProjet / revenusMensuelsTotal) * 1000) / 10 
      : 0
    // > 35% signifie que 35.0% est OK, 35.1% ne l'est pas
    const depasseEndettement = tauxEndettementProjet > 35
    
    // Mensualité max recommandée = 35% des revenus - charges existantes
    // Cette valeur doit être INDÉPENDANTE de la mensualité saisie par l'utilisateur
    // On ne soustrait pas l'assurance car elle sera calculée après
    const mensualiteMaxRecommandee = revenusMensuelsTotal > 0 
      ? Math.max(0, Math.round(revenusMensuelsTotal * 0.35 - chargesMensuellesTotal))
      : 0
    
    const resteAVivre = revenusMensuelsTotal - mensualitesTotalesProjet
    const resteAVivreMin = situationFoyer === 'couple' ? SIMULATEUR_CONFIG.resteAVivre.couple : SIMULATEUR_CONFIG.resteAVivre.celibataire
    const resteAVivreMinTotal = resteAVivreMin + nombreEnfants * SIMULATEUR_CONFIG.resteAVivre.parEnfant
    const niveauResteAVivre: 'ok' | 'limite' | 'risque' = resteAVivre >= resteAVivreMinTotal * 1.2 ? 'ok' : resteAVivre >= resteAVivreMinTotal ? 'limite' : 'risque'
    const tauxNotaire = typeBien === 'neuf' ? SIMULATEUR_CONFIG.fraisNotaireNeuf : SIMULATEUR_CONFIG.fraisNotaireAncien
    const budgetTotal = apport + capitalEmpruntable
    const prixAchatMax = budgetTotal / (1 + tauxNotaire)
    const fraisNotaire = prixAchatMax * tauxNotaire
    const coutTotalCredit = (mensualiteMax + mensualiteAssurance) * nombreMois - capitalEmpruntable
    
    // Calcul des prix moyens par département avec données DVF réelles
    const departements = ['75', '92', '93', '94', '77', '78', '91', '95']
    
    // Utiliser les données DVF réelles si disponibles, sinon fallback sur données statiques
    const sourceData = zonesReelles.length > 0 ? zonesReelles : ZONES_ILE_DE_FRANCE
    
    const apercuSurfaces = departements.map(codeDept => {
      // Récupérer toutes les communes du département avec prix valides
      const communesDept = sourceData.filter(z => 
        z.codeDepartement === codeDept && z.prixM2Appartement > 0
      )
      if (communesDept.length === 0) return { codeDept, nom: '', prixM2: 0, surface: 0, nbOpportunites: 0 }
      
      // Trier par prix croissant pour trouver les meilleures opportunités
      const prixList = communesDept.map(c => c.prixM2Appartement).sort((a, b) => a - b)
      const prixMin = prixList[0] || 0 // Prix de la commune la moins chère
      
      // Compter les opportunités (communes où on peut acheter >= 40m²)
      const surfaceMin40m2Prix = prixAchatMax / 40
      const nbOpportunites = communesDept.filter(c => c.prixM2Appartement <= surfaceMin40m2Prix).length
      
      // Surface max = ce qu'on peut acheter dans la MEILLEURE commune du département
      // C'est cohérent avec les opportunités affichées sur la carte
      const surfaceMax = prixMin > 0 ? Math.round(prixAchatMax / prixMin) : 0
      
      // Noms des départements
      const nomsDept: Record<string, string> = {
        '75': 'Paris',
        '92': 'Hauts-de-Seine',
        '93': 'Seine-Saint-Denis', 
        '94': 'Val-de-Marne',
        '77': 'Seine-et-Marne',
        '78': 'Yvelines',
        '91': 'Essonne',
        '95': "Val-d'Oise"
      }
      
      return {
        codeDept,
        nom: nomsDept[codeDept] || codeDept,
        prixM2: prixMin,
        surface: surfaceMax,
        nbOpportunites
      }
    })
    
    // Calcul pour compatibilité avec données DVF réelles
    const prixM2Paris = apercuSurfaces.find(s => s.codeDept === '75')?.prixM2 || 10500
    const prixM2PetiteCouronne = Math.round(
      (apercuSurfaces.filter(s => ['92', '93', '94'].includes(s.codeDept))
        .reduce((sum, s) => sum + s.prixM2, 0) / 3) || 6200
    )
    const prixM2GrandeCouronne = Math.round(
      (apercuSurfaces.filter(s => ['77', '78', '91', '95'].includes(s.codeDept))
        .reduce((sum, s) => sum + s.prixM2, 0) / 4) || 3800
    )
    
    const surfaceParis = Math.round(prixAchatMax / prixM2Paris)
    const surfacePetiteCouronne = Math.round(prixAchatMax / prixM2PetiteCouronne)
    const surfaceGrandeCouronne = Math.round(prixAchatMax / prixM2GrandeCouronne)
    const surfaceProvince = Math.round(prixAchatMax / 2800) // Province reste fixe
    
    // Zones compatibles (surface >= 20m² considérée comme viable)
    const zonesCompatibles = [
      surfaceParis >= 20 ? { zone: 'Paris', surface: surfaceParis, prixM2: prixM2Paris } : null,
      surfacePetiteCouronne >= 20 ? { zone: 'Petite Couronne', surface: surfacePetiteCouronne, prixM2: prixM2PetiteCouronne } : null,
      surfaceGrandeCouronne >= 20 ? { zone: 'Grande Couronne', surface: surfaceGrandeCouronne, prixM2: prixM2GrandeCouronne } : null,
      surfaceProvince >= 20 ? { zone: 'Province', surface: surfaceProvince, prixM2: 2800 } : null,
    ].filter(Boolean) as { zone: string; surface: number; prixM2: number }[]
    return { revenusMensuelsTotal, chargesMensuellesTotal, tauxEndettementActuel, endettementActuelEleve, tauxEndettementProjet, depasseEndettement, mensualiteMaxRecommandee, resteAVivre, resteAVivreMinTotal, niveauResteAVivre, capitalEmpruntable, mensualiteAssurance, prixAchatMax, fraisNotaire, budgetTotal, coutTotalCredit, surfaceParis, surfacePetiteCouronne, surfaceGrandeCouronne, surfaceProvince, zonesCompatibles, apercuSurfaces }
  }, [salaire1, salaire2, autresRevenus, creditsEnCours, autresCharges, mensualiteMax, dureeAns, apport, typeBien, tauxInteret, situationFoyer, nombreEnfants, zonesReelles])

  // Score de faisabilité multicritère (0-100) — 7 critères pondérés
  const scoreResult = useMemo(() => {
    return calculerScoreFaisabilite({
      tauxEndettementProjet: calculs.tauxEndettementProjet,
      niveauResteAVivre: calculs.niveauResteAVivre,
      resteAVivre: calculs.resteAVivre,
      resteAVivreMin: calculs.resteAVivreMinTotal,
      apport,
      prixAchat: calculs.prixAchatMax,
      statutProfessionnel,
      age,
      dureeAns,
      chargesMensuelles: calculs.chargesMensuellesTotal,
      revenusMensuels: calculs.revenusMensuelsTotal,
    })
  }, [calculs, apport, statutProfessionnel, age, dureeAns])
  const scoreFaisabilite = scoreResult.score
  const scoreDetails = scoreResult.details

  // Données répartition budget
  const pieData = useMemo(() => {
    const total = apport + calculs.capitalEmpruntable + calculs.fraisNotaire
    return {
      apport,
      pret: calculs.capitalEmpruntable,
      frais: calculs.fraisNotaire,
      total,
      pourcentageApport: total > 0 ? Math.round((apport / total) * 100) : 0,
      pourcentagePret: total > 0 ? Math.round((calculs.capitalEmpruntable / total) * 100) : 0,
      pourcentageFrais: total > 0 ? Math.round((calculs.fraisNotaire / total) * 100) : 0,
    }
  }, [apport, calculs])

  // Export PDF Premium - Design professionnel avec @react-pdf/renderer
  const generatePDF = useCallback(async () => {
    // Génération des conseils pour le PDF
    const resultatsConseils = genererConseilsAvances({
      age,
      statutProfessionnel,
      situationFoyer,
      nombreEnfants,
      revenus: calculs.revenusMensuelsTotal,
      charges: calculs.chargesMensuellesTotal,
      apport,
      mensualiteMax,
      mensualiteRecommandee,
      dureeAns,
      tauxInteret,
      typeBien,
      prixAchat: calculs.prixAchatMax,
      capitalEmpruntable: calculs.capitalEmpruntable,
      tauxEndettement: calculs.tauxEndettementProjet,
      resteAVivre: calculs.resteAVivre,
      resteAVivreMin: calculs.resteAVivreMinTotal,
      niveauResteAVivre: calculs.niveauResteAVivre,
      scoreFaisabilite,
      surfaceParis: calculs.surfaceParis,
      surfacePetiteCouronne: calculs.surfacePetiteCouronne,
      surfaceGrandeCouronne: calculs.surfaceGrandeCouronne
    })

    const logoUrl = `${window.location.origin}/logo-aquiz-white.png`

    const blob = await pdf(
      <SimulationPDF
        logoUrl={logoUrl}
        age={age}
        statutProfessionnel={statutProfessionnel}
        situationFoyer={situationFoyer}
        nombreEnfants={nombreEnfants}
        revenusMensuelsTotal={calculs.revenusMensuelsTotal}
        chargesMensuellesTotal={calculs.chargesMensuellesTotal}
        capitalEmpruntable={calculs.capitalEmpruntable}
        prixAchatMax={calculs.prixAchatMax}
        fraisNotaire={calculs.fraisNotaire}
        tauxEndettementProjet={calculs.tauxEndettementProjet}
        resteAVivre={calculs.resteAVivre}
        mensualiteAssurance={calculs.mensualiteAssurance}
        mensualiteMax={mensualiteMax}
        dureeAns={dureeAns}
        tauxInteret={tauxInteret}
        apport={apport}
        scoreFaisabilite={scoreFaisabilite}
        scoreDetails={scoreDetails}
        pieData={pieData}
        conseils={resultatsConseils}
      />
    ).toBlob()

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const dateFile = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
    link.download = `AQUIZ-Simulation-${dateFile}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [calculs, mensualiteMax, mensualiteRecommandee, dureeAns, apport, typeBien, tauxInteret, age, statutProfessionnel, situationFoyer, nombreEnfants, scoreFaisabilite, scoreDetails, pieData])

  const onSubmit = (data: ModeAFormData) => {
    setMode('A')
    const revenusMensuelsTotal = data.salaire1 + (data.salaire2 || 0) + (data.autresRevenus || 0)
    const chargesMensuellesTotal = (data.creditsEnCours || 0) + (data.autresCharges || 0)
    setProfil({ age, statutProfessionnel: (statutProfessionnel || 'cdi') as 'cdi' | 'cdd' | 'fonctionnaire' | 'independant' | 'retraite' | 'autre', situationFoyer: data.situationFoyer, nombreEnfants: data.nombreEnfants, salaire1: data.salaire1, salaire2: data.salaire2 || 0, autresRevenus: data.autresRevenus || 0, creditsEnCours: data.creditsEnCours || 0, autresCharges: data.autresCharges || 0, revenusMensuelsTotal, chargesMensuellesTotal, tauxEndettementActuel: revenusMensuelsTotal > 0 ? (chargesMensuellesTotal / revenusMensuelsTotal) * 100 : 0 })
    setParametresModeA({ mensualiteMax: data.mensualiteMax, dureeAns: data.dureeAns, apport: data.apport, typeBien: data.typeBien, tauxInteret: data.tauxInteret || 3.5 })
    setResultats({ mode: 'A', capaciteEmprunt: Math.round(calculs.capitalEmpruntable), mensualiteCredit: Math.round(data.mensualiteMax), mensualiteAssurance: Math.round(calculs.mensualiteAssurance), mensualiteTotal: Math.round(data.mensualiteMax + calculs.mensualiteAssurance), fraisNotaire: Math.round(calculs.fraisNotaire), tauxEndettementProjet: Math.round(calculs.tauxEndettementProjet), resteAVivre: Math.round(calculs.resteAVivre), resteAVivreMinimum: calculs.resteAVivreMinTotal, niveauProjet: calculs.depasseEndettement || calculs.niveauResteAVivre === 'risque' ? 'impossible' : calculs.tauxEndettementProjet > 31.5 || calculs.niveauResteAVivre === 'limite' ? 'limite' : 'confortable', faisable: !calculs.depasseEndettement && calculs.niveauResteAVivre !== 'risque', alertes: [...(calculs.depasseEndettement ? [`Taux d'endettement trop élevé (${Math.round(calculs.tauxEndettementProjet)}% > 35%)`] : []), ...(calculs.niveauResteAVivre === 'risque' ? [`Reste à vivre insuffisant`] : [])], prixAchatMax: Math.round(calculs.prixAchatMax), prixAchatPessimiste: Math.round(calculs.prixAchatMax * 0.92), prixAchatRealiste: Math.round(calculs.prixAchatMax), capaciteEmpruntPessimiste: Math.round(calculs.capitalEmpruntable * 0.92), capaciteEmpruntRealiste: Math.round(calculs.capitalEmpruntable) })
    setEtape('resultats')
  }

  // Sauvegarder les résultats et aller à la carte
  const saveAndGoToCarte = () => {
    // Auto-save avant de quitter
    autoSave.triggerSave()
    if (calculs.prixAchatMax > 0) {
      setMode('A')
      const revenusMensuelsTotal = salaire1 + salaire2 + autresRevenus
      const chargesMensuellesTotal = creditsEnCours + autresCharges
      setProfil({ age, statutProfessionnel: (statutProfessionnel || 'cdi') as 'cdi' | 'cdd' | 'fonctionnaire' | 'independant' | 'retraite' | 'autre', situationFoyer, nombreEnfants, salaire1, salaire2, autresRevenus, creditsEnCours, autresCharges, revenusMensuelsTotal, chargesMensuellesTotal, tauxEndettementActuel: revenusMensuelsTotal > 0 ? (chargesMensuellesTotal / revenusMensuelsTotal) * 100 : 0 })
      setParametresModeA({ mensualiteMax, dureeAns, apport, typeBien, tauxInteret })
      setResultats({ mode: 'A', capaciteEmprunt: Math.round(calculs.capitalEmpruntable), mensualiteCredit: Math.round(mensualiteMax), mensualiteAssurance: Math.round(calculs.mensualiteAssurance), mensualiteTotal: Math.round(mensualiteMax + calculs.mensualiteAssurance), fraisNotaire: Math.round(calculs.fraisNotaire), tauxEndettementProjet: Math.round(calculs.tauxEndettementProjet), resteAVivre: Math.round(calculs.resteAVivre), resteAVivreMinimum: calculs.resteAVivreMinTotal, niveauProjet: calculs.depasseEndettement || calculs.niveauResteAVivre === 'risque' ? 'impossible' : calculs.tauxEndettementProjet > 31.5 || calculs.niveauResteAVivre === 'limite' ? 'limite' : 'confortable', faisable: !calculs.depasseEndettement && calculs.niveauResteAVivre !== 'risque', alertes: [...(calculs.depasseEndettement ? [`Taux d'endettement trop élevé (${Math.round(calculs.tauxEndettementProjet)}% > 35%)`] : []), ...(calculs.niveauResteAVivre === 'risque' ? [`Reste à vivre insuffisant`] : [])], prixAchatMax: Math.round(calculs.prixAchatMax), prixAchatPessimiste: Math.round(calculs.prixAchatMax * 0.92), prixAchatRealiste: Math.round(calculs.prixAchatMax), capaciteEmpruntPessimiste: Math.round(calculs.capitalEmpruntable * 0.92), capaciteEmpruntRealiste: Math.round(calculs.capitalEmpruntable) })
      // Sauvegarder l'étape 3 dans le store pour pouvoir y revenir
      setEtapeStore(3)
    }
    // Marquer qu'on navigue vers une page interne (carte/aides)
    // pour ne pas afficher la modale au retour (même via bouton back navigateur)
    sessionStorage.setItem('aquiz-navigating-away', '1')
    router.push('/carte?from=simulation')
  }

  const etapeActuelleIndex = ETAPES.findIndex(e => e.id === etape)
  const canGoToEtape = (targetEtape: EtapeId): boolean => {
    const targetIndex = ETAPES.findIndex(e => e.id === targetEtape)
    if (targetIndex <= etapeActuelleIndex) return true
    if (targetEtape === 'simulation') return calculs.revenusMensuelsTotal > 0
    if (targetEtape === 'resultats') return calculs.revenusMensuelsTotal > 0 && mensualiteMax > 0
    return false
  }
  const goToEtape = (targetEtape: EtapeId) => { if (canGoToEtape(targetEtape)) { setEtape(targetEtape) } }
  const goToNextEtape = () => { const nextIndex = etapeActuelleIndex + 1; if (nextIndex < ETAPES.length) { const nextEtape = ETAPES[nextIndex].id; if (canGoToEtape(nextEtape)) { setEtape(nextEtape) } } }
  const goToPrevEtape = () => { const prevIndex = etapeActuelleIndex - 1; if (prevIndex >= 0) setEtape(ETAPES[prevIndex].id) }
  const formatMontant = (montant: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(montant)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white">
        <h1 className="sr-only">Simulateur de capacité d&apos;achat immobilière</h1>
        {showResumeModal && pendingToResume && <ResumeModal simulation={pendingToResume} onResume={handleResume} onNew={handleNew} />}

        {/* === STEPPER + ACTIONS === */}
        <div className="border-b border-aquiz-gray-lighter/60 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Desktop - stepper + auto-save indicator */}
            <div className="hidden md:flex items-center py-4">
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
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                        ${isActive 
                          ? 'bg-aquiz-green text-white shadow-md shadow-aquiz-green/25' 
                          : isPassed 
                            ? 'bg-aquiz-green/15 text-aquiz-green' 
                            : 'bg-aquiz-gray-lightest text-aquiz-gray-light'
                        }
                      `}>
                        {isPassed ? <CheckCircle className="w-4 h-4" /> : index + 1}
                      </div>
                      <span className={`text-sm font-medium transition-colors ${
                        isActive ? 'text-aquiz-black' : isPassed ? 'text-aquiz-green' : 'text-aquiz-gray-light'
                      }`}>
                        {e.label}
                      </span>
                    </button>
                    
                    {/* Connecteur */}
                    {index < ETAPES.length - 1 && (
                      <div className="flex-1 mx-4">
                        <div className={`h-0.5 rounded-full transition-all duration-300 ${isPassed ? 'bg-aquiz-green/30' : 'bg-aquiz-gray-lighter'}`} />
                      </div>
                    )}
                  </div>
                )
              })}
              <AutoSaveIndicator lastSavedAt={autoSave.lastSavedAt} className="ml-auto" />
            </div>
            
            {/* Mobile */}
            <div className="md:hidden py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-aquiz-green text-white text-xs font-bold flex items-center justify-center shadow-md shadow-aquiz-green/25">
                  {etapeActuelleIndex + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-aquiz-black">{ETAPES[etapeActuelleIndex].label}</p>
                  <p className="text-[11px] text-aquiz-gray">Étape {etapeActuelleIndex + 1} sur {ETAPES.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AutoSaveIndicator lastSavedAt={autoSave.lastSavedAt} />
                <div className="flex gap-1.5">
                {ETAPES.map((_, index) => (
                  <div 
                    key={index}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      index < etapeActuelleIndex 
                        ? 'bg-aquiz-green w-5' 
                        : index === etapeActuelleIndex 
                          ? 'bg-aquiz-green w-7' 
                          : 'bg-aquiz-gray-lighter w-5'
                    }`}
                  />
                ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-6 py-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            {etape === 'profil' && (
              <div className="animate-fade-in">
                <div className="grid lg:grid-cols-[1fr,340px] gap-8">
                  
                  {/* === FORMULAIRE === */}
                  <div className="space-y-5">
                    
                    {/* Header simple */}
                    <div className="mb-2">
                      <h2 className="text-xl font-bold text-aquiz-black">Votre profil</h2>
                      <p className="text-aquiz-gray text-sm mt-0.5">Renseignez votre situation pour calculer votre capacité d&apos;emprunt</p>
                    </div>
                    
                    {/* Section 1: Situation personnelle */}
                    <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                      <div className="px-5 py-3 border-b border-aquiz-gray-lighter/60 flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-aquiz-green/10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-aquiz-green">1</span>
                        </div>
                        <h2 className="font-semibold text-aquiz-black text-sm">Situation personnelle</h2>
                      </div>
                      
                      <div className="p-6">
                        {/* Ligne 1: Âge + Statut */}
                        <div className="grid grid-cols-2 gap-8 mb-6">
                          {/* Âge */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <Label className="text-sm font-medium text-aquiz-gray-dark">Âge</Label>
                              <span className="text-sm font-bold text-aquiz-black tabular-nums px-2.5 py-1 bg-aquiz-gray-lightest rounded-md">{age} ans</span>
                            </div>
                            <Slider value={[age]} onValueChange={(value) => setAge(value[0])} min={18} max={70} step={1} className="w-full" />
                            {age > 55 && (
                              <p className="text-xs text-aquiz-orange flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Durée de prêt limitée
                              </p>
                            )}
                          </div>
                          
                          {/* Statut */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-aquiz-gray-dark">Statut professionnel</Label>
                            <Select value={statutProfessionnel} onValueChange={setStatutProfessionnel}>
                              <SelectTrigger className="h-10 bg-white border border-aquiz-gray-lighter rounded-lg w-full">
                                <SelectValue placeholder="Sélectionnez" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUTS_PROFESSIONNELS.map((statut) => (
                                  <SelectItem key={statut.value} value={statut.value}>{statut.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Ligne 2: Situation + Enfants */}
                        <div className="grid grid-cols-2 gap-8">
                          {/* Foyer - avec coche animée */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-aquiz-gray-dark">Situation</Label>
                            <RadioGroup 
                              value={situationFoyer} 
                              onValueChange={(value) => setValue('situationFoyer', value as 'celibataire' | 'couple')} 
                              className="grid grid-cols-2 gap-3"
                            >
                              {['celibataire', 'couple'].map((value) => (
                                <label 
                                  key={value}
                                  htmlFor={value}
                                  className={`relative flex items-center justify-center h-10 rounded-lg cursor-pointer transition-all text-sm font-medium border ${
                                    situationFoyer === value 
                                      ? 'bg-aquiz-green text-white border-aquiz-green' 
                                      : 'bg-white text-aquiz-gray-dark border-aquiz-gray-lighter hover:border-aquiz-gray-light'
                                  }`}
                                >
                                  <RadioGroupItem value={value} id={value} className="sr-only" />
                                  {value === 'celibataire' ? 'Seul(e)' : 'En couple'}
                                  {situationFoyer === value && (
                                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-aquiz-green/30 shadow-sm animate-in zoom-in-50 duration-200">
                                      <CheckCircle className="w-3.5 h-3.5 text-aquiz-green" />
                                    </div>
                                  )}
                                </label>
                              ))}
                            </RadioGroup>
                          </div>
                          
                          {/* Enfants */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-aquiz-gray-dark">Enfants à charge</Label>
                            <Select value={String(nombreEnfants)} onValueChange={(value) => setValue('nombreEnfants', parseInt(value))}>
                              <SelectTrigger className="h-10 bg-white border border-aquiz-gray-lighter rounded-lg w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 1, 2, 3, 4, 5].map((n) => (
                                  <SelectItem key={n} value={String(n)}>{n} {n > 1 ? 'enfants' : 'enfant'}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Section 2: Revenus */}
                    <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                      <div className="px-5 py-3 border-b border-aquiz-gray-lighter/60 flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-aquiz-green/10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-aquiz-green">2</span>
                        </div>
                        <h2 className="font-semibold text-aquiz-black text-sm">Revenus mensuels nets</h2>
                      </div>
                      
                      <div className="p-5">
                        <div className={`grid gap-4 ${situationFoyer === 'couple' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                          {/* Salaire 1 */}
                          <div className="space-y-2">
                            <Label htmlFor="salaire1" className="text-sm font-medium text-aquiz-gray-dark">
                              {situationFoyer === 'couple' ? 'Vos revenus' : 'Salaire net'}
                            </Label>
                            <div className="relative">
                              <Input 
                                id="salaire1" 
                                type="number" 
                                placeholder="2 500" 
                                {...register('salaire1', { valueAsNumber: true })} 
                                className="h-10 bg-white border border-aquiz-gray-lighter rounded-lg pr-10 font-medium placeholder:text-aquiz-gray-light" 
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-aquiz-gray text-sm">€</span>
                            </div>
                            {errors.salaire1 && <p className="text-xs text-aquiz-red">{errors.salaire1.message}</p>}
                          </div>
                          
                          {/* Salaire 2 (couple) */}
                          {situationFoyer === 'couple' && (
                            <div className="space-y-2">
                              <Label htmlFor="salaire2" className="text-sm font-medium text-aquiz-gray-dark">Revenus conjoint</Label>
                              <div className="relative">
                                <Input 
                                  id="salaire2" 
                                  type="number" 
                                  placeholder="2 000" 
                                  {...register('salaire2', { valueAsNumber: true })} 
                                  className="h-10 bg-white border border-aquiz-gray-lighter rounded-lg pr-10 font-medium placeholder:text-aquiz-gray-light" 
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-aquiz-gray text-sm">€</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Autres revenus */}
                          <div className="space-y-2">
                            <Label htmlFor="autresRevenus" className="text-sm font-medium text-aquiz-gray-dark">Autres revenus</Label>
                            <div className="relative">
                              <Input 
                                id="autresRevenus" 
                                type="number" 
                                placeholder="0" 
                                {...register('autresRevenus', { valueAsNumber: true })} 
                                className="h-10 bg-white border border-aquiz-gray-lighter rounded-lg pr-10 font-medium placeholder:text-aquiz-gray-light" 
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-aquiz-gray text-sm">€</span>
                            </div>
                            <p className="text-xs text-aquiz-gray">Locatifs, pensions, allocations</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Section 3: Charges */}
                    <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                      <div className="px-5 py-3 border-b border-aquiz-gray-lighter/60 flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-aquiz-green/10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-aquiz-green">3</span>
                        </div>
                        <h2 className="font-semibold text-aquiz-black text-sm">Charges mensuelles</h2>
                      </div>
                      
                      <div className="p-5">
                        <div className="grid sm:grid-cols-2 gap-4">
                          {/* Crédits en cours */}
                          <div className="space-y-2">
                            <Label htmlFor="creditsEnCours" className="text-sm font-medium text-aquiz-gray-dark">Crédits en cours</Label>
                            <div className="relative">
                              <Input 
                                id="creditsEnCours" 
                                type="number" 
                                placeholder="0" 
                                {...register('creditsEnCours', { valueAsNumber: true })} 
                                className="h-10 bg-white border border-aquiz-gray-lighter rounded-lg pr-10 font-medium placeholder:text-aquiz-gray-light" 
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-aquiz-gray text-sm">€</span>
                            </div>
                            <p className="text-xs text-aquiz-gray">Auto, conso, étudiant</p>
                          </div>
                          
                          {/* Autres charges */}
                          <div className="space-y-2">
                            <Label htmlFor="autresCharges" className="text-sm font-medium text-aquiz-gray-dark">Autres charges</Label>
                            <div className="relative">
                              <Input 
                                id="autresCharges" 
                                type="number" 
                                placeholder="0" 
                                {...register('autresCharges', { valueAsNumber: true })} 
                                className="h-10 bg-white border border-aquiz-gray-lighter rounded-lg pr-10 font-medium placeholder:text-aquiz-gray-light" 
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-aquiz-gray text-sm">€</span>
                            </div>
                            <p className="text-xs text-aquiz-gray">Pension, crédit auto, etc.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bouton Desktop */}
                    <div className="hidden lg:block">
                      <Button 
                        type="button" 
                        className="w-full bg-aquiz-green hover:bg-aquiz-green/90 h-11 text-sm font-semibold rounded-xl shadow-md shadow-aquiz-green/20 transition-all" 
                        onClick={goToNextEtape} 
                        disabled={calculs.revenusMensuelsTotal === 0}
                      >
                        Continuer vers la simulation
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* === SIDEBAR RÉCAPITULATIF === */}
                  <aside className="hidden lg:block">
                    <div className="sticky top-24 space-y-4">
                      
                      {/* Card Résultat principal */}
                      <div className="rounded-xl border border-aquiz-green/20 bg-aquiz-green/5 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-aquiz-green/15">
                          <p className="text-[11px] text-aquiz-green uppercase tracking-wider font-semibold">Mensualité maximale</p>
                        </div>
                        <div className="px-4 py-4">
                          <p className="text-2xl font-bold text-aquiz-black tracking-tight">
                            {mensualiteRecommandee > 0 
                              ? `${formatMontant(mensualiteRecommandee)} €`
                              : '— €'
                            }
                            <span className="text-sm font-normal text-aquiz-gray">/mois</span>
                          </p>
                          {mensualiteRecommandee > 0 && (
                            <p className="text-[10px] text-aquiz-gray mt-1">Assurance incluse dans le calcul HCSF</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Card Détails */}
                      <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                        {/* Revenus */}
                        <div className="px-4 py-3 flex items-center justify-between border-b border-aquiz-gray-lighter">
                          <span className="text-sm text-aquiz-gray">Revenus nets</span>
                          <span className="text-sm font-semibold text-aquiz-black">
                            {calculs.revenusMensuelsTotal > 0 ? `${formatMontant(calculs.revenusMensuelsTotal)} €` : '—'}
                          </span>
                        </div>
                        
                        {/* Charges */}
                        <div className="px-4 py-3 flex items-center justify-between border-b border-aquiz-gray-lighter">
                          <span className="text-sm text-aquiz-gray">Charges</span>
                          <span className="text-sm font-semibold text-aquiz-black">{formatMontant(calculs.chargesMensuellesTotal)} €</span>
                        </div>
                        
                        {/* Taux endettement */}
                        <div className="px-4 py-3 border-b border-aquiz-gray-lighter">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-aquiz-gray">Taux d&apos;endettement</span>
                            <span className={`text-sm font-semibold ${
                              calculs.revenusMensuelsTotal === 0 
                                ? 'text-aquiz-gray-light' 
                                : calculs.endettementActuelEleve 
                                  ? 'text-aquiz-red' 
                                  : 'text-aquiz-black'
                            }`}>
                              {calculs.revenusMensuelsTotal > 0 ? `${calculs.tauxEndettementActuel.toFixed(1)}%` : '—'}
                            </span>
                          </div>
                          {calculs.revenusMensuelsTotal > 0 && (
                            <div className="h-1.5 bg-aquiz-gray-lighter rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${calculs.endettementActuelEleve ? 'bg-aquiz-red' : 'bg-aquiz-green'}`}
                                style={{ width: `${Math.min((calculs.tauxEndettementActuel / 50) * 100, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Capacité */}
                        <div className="px-4 py-4 bg-aquiz-gray-lightest">
                          <p className="text-xs text-aquiz-gray uppercase tracking-wider font-medium mb-1">Capacité d&apos;achat estimée</p>
                          <p className="text-lg font-bold text-aquiz-black">
                            {mensualiteRecommandee > 0 
                              ? `~${formatMontant(Math.round(calculs.prixAchatMax))} €`
                              : '— €'
                            }
                          </p>
                          <p className="text-[10px] text-aquiz-gray mt-0.5">Sur {dureeAns} ans à {tauxInteret}%</p>
                        </div>
                      </div>
                      
                      {/* Info HCSF */}
                      <div className="flex items-center justify-center gap-1 text-[10px] text-aquiz-gray">
                        <span>Norme HCSF : 35% d&apos;endettement maximum</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-aquiz-gray-light hover:text-aquiz-gray transition-colors">
                              <Info className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-72 text-xs leading-relaxed">
                            <p className="font-semibold mb-1">Haut Conseil de Stabilité Financière</p>
                            <p>Depuis janvier 2022, le HCSF impose aux banques :</p>
                            <ul className="mt-1 space-y-0.5">
                              <li>• <strong>Taux d&apos;endettement max : 35%</strong> des revenus nets (charges + crédit + assurance)</li>
                              <li>• <strong>Durée max : 25 ans</strong> (27 ans en VEFA / construction)</li>
                              <li>• Marge de flexibilité : 20% des dossiers peuvent déroger</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                    </div>
                  </aside>
                </div>
                
                {/* Bouton Mobile */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t border-aquiz-gray-lighter/60 z-20">
                  <Button 
                    type="button" 
                    className="w-full bg-aquiz-green hover:bg-aquiz-green/90 h-12 font-semibold rounded-xl shadow-md shadow-aquiz-green/20" 
                    onClick={goToNextEtape} 
                    disabled={calculs.revenusMensuelsTotal === 0}
                  >
                    Continuer
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <div className="lg:hidden h-20" />
              </div>
            )}

            {etape === 'simulation' && (
              <div className="animate-fade-in">
                <div className="grid lg:grid-cols-[1fr,340px] gap-8">
                  
                  {/* === FORMULAIRE === */}
                  <div className="space-y-5">
                    
                    {/* Header + Retour */}
                    <div className="mb-2">
                      <button type="button" onClick={goToPrevEtape} className="flex items-center gap-2 text-aquiz-gray hover:text-aquiz-black transition-colors text-sm mb-3">
                        <ArrowLeft className="w-4 h-4" />Modifier mon profil
                      </button>
                      <h2 className="text-xl font-bold text-aquiz-black">Votre simulation</h2>
                      <p className="text-aquiz-gray text-sm mt-0.5">Définissez votre budget et les paramètres de votre projet</p>
                    </div>
                    
                    {/* Section 1: Budget mensuel */}
                    <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                      <div className="px-5 py-3 border-b border-aquiz-gray-lighter/60 flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-aquiz-green/10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-aquiz-green">1</span>
                        </div>
                        <h2 className="font-semibold text-aquiz-black text-sm">Budget mensuel</h2>
                      </div>
                      
                      <div className="p-6 space-y-5">
                        {/* Mensualité max — automatique basée sur le profil */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-aquiz-gray-dark">Mensualité maximale</Label>
                            <div className="flex items-center gap-1.5 text-[10px] text-aquiz-gray">
                              <Shield className="w-3 h-3" />
                              Norme HCSF
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="text-aquiz-gray-light hover:text-aquiz-gray transition-colors">
                                    <Info className="w-3 h-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-72 text-xs leading-relaxed">
                                  <p className="font-semibold mb-1">Haut Conseil de Stabilité Financière</p>
                                  <p>Depuis janvier 2022, le HCSF impose aux banques :</p>
                                  <ul className="mt-1 space-y-0.5">
                                    <li>• <strong>Taux d&apos;endettement max : 35%</strong> des revenus nets</li>
                                    <li>• <strong>Durée max : 25 ans</strong> (27 ans en VEFA)</li>
                                    <li>• 20% des dossiers peuvent déroger</li>
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <div className="relative overflow-hidden rounded-xl border border-aquiz-green/20 bg-gradient-to-r from-aquiz-green/5 to-transparent">
                            <div className="flex items-center gap-4 p-4">
                              <div className="w-10 h-10 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
                                <CreditCard className="w-5 h-5 text-aquiz-green" />
                              </div>
                              <div className="flex-1">
                                <p className="text-2xl font-bold text-aquiz-black tracking-tight">
                                  {formatMontant(mensualiteRecommandee)} €
                                  <span className="text-sm font-normal text-aquiz-gray ml-1">/mois</span>
                                </p>
                                <p className="text-xs text-aquiz-gray mt-0.5">Assurance incluse dans le calcul HCSF ({dureeAns} ans à {tauxInteret.toFixed(1)}%)</p>
                              </div>
                            </div>
                            <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-l from-aquiz-green/5 to-transparent" />
                          </div>
                        </div>
                        
                        {/* Apport personnel — mis en avant */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="apportSimu" className="text-sm font-medium text-aquiz-gray-dark flex items-center gap-2">
                              <PiggyBank className="w-4 h-4 text-aquiz-green" />
                              Apport personnel
                            </Label>
                            {apport > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-aquiz-green/10 text-aquiz-green font-medium">
                                {((apport / (apport + (mensualiteRecommandee > 0 ? mensualiteRecommandee * dureeAns * 12 : 1))) * 100).toFixed(0)}% du projet
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <Input 
                              id="apportSimu" 
                              type="number" 
                              placeholder="Ex: 30 000" 
                              {...register('apport', { valueAsNumber: true })} 
                              className="h-12 text-base bg-white border-aquiz-gray-lighter pr-10 rounded-xl font-medium placeholder:text-aquiz-gray-light focus:border-aquiz-green focus:ring-aquiz-green/20" 
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-aquiz-gray font-medium">€</span>
                          </div>
                          <p className="text-xs text-aquiz-gray">Épargne, donations, héritage... Plus votre apport est élevé, plus votre capacité d&apos;achat augmente.</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Section 2: Paramètres du prêt */}
                    <div className="bg-white rounded-xl border border-aquiz-gray-lighter overflow-hidden">
                      <div className="px-5 py-3 border-b border-aquiz-gray-lighter/60 flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-aquiz-green/10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-aquiz-green">2</span>
                        </div>
                        <h2 className="font-semibold text-aquiz-black text-sm">Paramètres du prêt</h2>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        {/* Durée */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label className="text-sm font-medium text-aquiz-gray-dark">Durée du prêt</Label>
                            <span className="text-sm font-bold text-aquiz-black bg-aquiz-gray-lightest px-3 py-1 rounded">{dureeAns} ans</span>
                          </div>
                          <Slider 
                            value={[dureeAns]} 
                            onValueChange={(value) => setValue('dureeAns', value[0])} 
                            min={10} 
                            max={25} 
                            step={1} 
                            className="py-2"
                          />
                          <div className="flex justify-between text-[10px] text-aquiz-gray">
                            <span>10 ans</span>
                            <span>15 ans</span>
                            <span>20 ans</span>
                            <span>25 ans (max HCSF)</span>
                          </div>
                        </div>
                        
                        {/* Taux d'intérêt — mis en avant */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-sm font-medium text-aquiz-gray-dark">Taux d&apos;intérêt estimé</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-aquiz-gray-light hover:text-aquiz-gray transition-colors">
                                  <Info className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-72 text-xs leading-relaxed">
                                <p className="font-semibold mb-1.5">Taux moyens constatés (fév. 2025)</p>
                                <ul className="space-y-1">
                                  <li><strong>3.0%</strong> — Profil premium : CDI cadre, revenus élevés, apport 20%+</li>
                                  <li><strong>3.2%</strong> — Très bon profil : CDI stable, bon apport</li>
                                  <li><strong>3.5%</strong> — Taux moyen du marché (tous profils)</li>
                                  <li><strong>3.8%</strong> — Profil standard : peu d&apos;apport ou CDD</li>
                                  <li><strong>4.0%</strong> — Profil à risques : intérimaire, découverts</li>
                                </ul>
                                <p className="mt-1.5 text-aquiz-gray">Source : Observatoire Crédit Logement / CSA</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {[
                              { value: '3.0', label: '3.0%', sub: 'Excellent' },
                              { value: '3.2', label: '3.2%', sub: 'Très bon' },
                              { value: '3.5', label: '3.5%', sub: 'Moyen' },
                              { value: '3.8', label: '3.8%', sub: 'Standard' },
                              { value: '4.0', label: '4.0%', sub: 'Risque' },
                            ].map((t) => (
                              <button
                                key={t.value}
                                type="button"
                                onClick={() => setValue('tauxInteret', parseFloat(t.value))}
                                className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                                  tauxInteret.toFixed(1) === t.value
                                    ? 'border-aquiz-green bg-aquiz-green/5 shadow-sm'
                                    : 'border-aquiz-gray-lighter hover:border-aquiz-gray-light bg-white'
                                }`}
                              >
                                <span className="block text-base font-bold text-aquiz-black">{t.label}</span>
                                <span className="block text-[10px] text-aquiz-gray mt-0.5">{t.sub}</span>
                                {tauxInteret.toFixed(1) === t.value && (
                                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-aquiz-green rounded-full flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Type de bien — compact inline */}
                        <div className="flex items-center gap-4">
                          <Label className="text-sm font-medium text-aquiz-gray-dark whitespace-nowrap">Type de bien</Label>
                          <RadioGroup value={typeBien} onValueChange={(value) => setValue('typeBien', value as 'neuf' | 'ancien')} className="flex gap-2 flex-1">
                            <label 
                              htmlFor="ancien" 
                              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-center ${
                                typeBien === 'ancien' 
                                  ? 'border-aquiz-green bg-aquiz-green/5 text-aquiz-black font-medium' 
                                  : 'border-aquiz-gray-lighter hover:border-aquiz-gray-light text-aquiz-gray'
                              }`}
                            >
                              <RadioGroupItem value="ancien" id="ancien" className="sr-only" />
                              <span className="text-sm">Ancien</span>
                              <span className="text-[10px] text-aquiz-gray">(~8%)</span>
                            </label>
                            <label 
                              htmlFor="neuf" 
                              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-center ${
                                typeBien === 'neuf' 
                                  ? 'border-aquiz-green bg-aquiz-green/5 text-aquiz-black font-medium' 
                                  : 'border-aquiz-gray-lighter hover:border-aquiz-gray-light text-aquiz-gray'
                              }`}
                            >
                              <RadioGroupItem value="neuf" id="neuf" className="sr-only" />
                              <span className="text-sm">Neuf / VEFA</span>
                              <span className="text-[10px] text-aquiz-gray">(~2.5%)</span>
                            </label>
                          </RadioGroup>
                        </div>
                      </div>
                    </div>
                    
                    {/* Alerte si problème */}
                    {mensualiteMax > 0 && (calculs.depasseEndettement || calculs.niveauResteAVivre === 'risque') && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-red-700 text-sm">Projet non finançable en l&apos;état</p>
                            <p className="text-xs text-red-600 mt-1">
                              {calculs.depasseEndettement 
                                ? `Taux d'endettement trop élevé (${Math.round(calculs.tauxEndettementProjet)}% > 35%). Réduisez la mensualité.`
                                : `Reste à vivre insuffisant (${formatMontant(calculs.resteAVivre)}€ < ${formatMontant(calculs.resteAVivreMinTotal)}€ requis).`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Bouton Desktop */}
                    <div className="hidden lg:block">
                      <Button 
                        type="button" 
                        className="w-full bg-aquiz-green hover:bg-aquiz-green/90 h-11 text-sm font-semibold rounded-xl shadow-md shadow-aquiz-green/20 transition-all" 
                        onClick={goToNextEtape} 
                        disabled={mensualiteMax === 0 || calculs.depasseEndettement || calculs.niveauResteAVivre === 'risque'}
                      >
                        Voir mon score
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* === SIDEBAR RÉSULTATS === */}
                  <aside className="hidden lg:block">
                    <div className="sticky top-24 space-y-4">
                      
                      {/* Card Résultat principal — hero */}
                      <div className="rounded-2xl overflow-hidden border border-aquiz-green/20 bg-gradient-to-br from-aquiz-green/5 via-white to-aquiz-green/5">
                        <div className="p-5">
                          <p className="text-[10px] text-aquiz-green uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3" />
                            Prix d&apos;achat maximum
                          </p>
                          <p className="text-3xl font-bold text-aquiz-black tracking-tight">
                            {mensualiteMax > 0 
                              ? `${formatMontant(calculs.prixAchatMax)} €`
                              : '— €'
                            }
                          </p>
                          {mensualiteMax > 0 && (
                            <p className="text-xs text-aquiz-gray mt-1.5">
                              Dont {formatMontant(calculs.fraisNotaire)} € de frais de notaire ({typeBien === 'neuf' ? '~2.5%' : '~8%'})
                            </p>
                          )}
                        </div>
                        {mensualiteRecommandee > 0 && (
                          <div className="mx-5 mb-4 px-3 py-2.5 rounded-xl bg-aquiz-green/5 border border-aquiz-green/10">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-aquiz-gray uppercase tracking-wide">Mensualité</p>
                                <p className="text-lg font-bold text-aquiz-black">{formatMontant(mensualiteRecommandee)} €<span className="text-xs font-normal text-aquiz-gray">/mois</span></p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-aquiz-gray">sur <span className="font-semibold text-aquiz-black">{dureeAns} ans</span> à <span className="font-semibold text-aquiz-black">{tauxInteret.toFixed(1)}%</span></p>
                                <p className="text-[10px] text-aquiz-gray mt-0.5">Assurance incluse dans le calcul HCSF</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {mensualiteRecommandee > 0 && (
                          <div className="grid grid-cols-2 border-t border-aquiz-green/10">
                            <div className="p-3 text-center border-r border-aquiz-green/10">
                              <p className="text-[10px] text-aquiz-gray uppercase tracking-wide">Emprunt</p>
                              <p className="text-sm font-bold text-aquiz-black mt-0.5">{formatMontant(calculs.capitalEmpruntable)} €</p>
                            </div>
                            <div className="p-3 text-center">
                              <p className="text-[10px] text-aquiz-gray uppercase tracking-wide">Apport</p>
                              <p className="text-sm font-bold text-aquiz-black mt-0.5">{formatMontant(apport)} €</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Card Indicateurs santé */}
                      <div className="bg-white rounded-2xl border border-aquiz-gray-lighter overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-aquiz-gray-lighter/60 bg-aquiz-gray-lightest/50">
                          <p className="text-[10px] text-aquiz-gray uppercase tracking-wider font-medium">Indicateurs de faisabilité</p>
                        </div>
                        
                        {/* Taux endettement */}
                        <div className="p-4 border-b border-aquiz-gray-lighter">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Percent className="w-3.5 h-3.5 text-aquiz-gray" />
                              <span className="text-sm text-aquiz-gray">Endettement</span>
                            </div>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${
                              mensualiteMax === 0 
                                ? 'text-aquiz-gray-light' 
                                : calculs.depasseEndettement 
                                  ? 'text-red-600 bg-red-50' 
                                  : calculs.tauxEndettementProjet > 31.5 
                                    ? 'text-amber-600 bg-amber-50'
                                    : 'text-aquiz-green bg-aquiz-green/10'
                            }`}>
                              {mensualiteMax > 0 ? `${Math.round(calculs.tauxEndettementProjet)}%` : '—'}
                            </span>
                          </div>
                          {mensualiteMax > 0 && (
                            <>
                              <div className="relative h-2 bg-aquiz-gray-lighter rounded-full overflow-hidden">
                                <div 
                                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                                    calculs.depasseEndettement 
                                      ? 'bg-red-500' 
                                      : calculs.tauxEndettementProjet > 31.5 
                                        ? 'bg-amber-400' 
                                        : 'bg-aquiz-green'
                                  }`}
                                  style={{ width: `${Math.min((calculs.tauxEndettementProjet / 35) * 100, 100)}%` }}
                                />
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-[9px] text-aquiz-gray">0%</span>
                                <span className={`text-[9px] font-medium ${calculs.depasseEndettement ? 'text-red-500' : 'text-aquiz-gray'}`}>35% max HCSF</span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Reste à vivre */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-aquiz-gray" />
                              <span className="text-sm text-aquiz-gray">Reste à vivre</span>
                            </div>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${
                              mensualiteMax === 0 
                                ? 'text-aquiz-gray-light' 
                                : calculs.niveauResteAVivre === 'ok' 
                                  ? 'text-aquiz-green bg-aquiz-green/10' 
                                  : calculs.niveauResteAVivre === 'limite' 
                                    ? 'text-amber-600 bg-amber-50' 
                                    : 'text-red-600 bg-red-50'
                            }`}>
                              {mensualiteMax > 0 ? `${formatMontant(calculs.resteAVivre)} €` : '—'}
                            </span>
                          </div>
                          {mensualiteMax > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-aquiz-gray">Min requis : {formatMontant(calculs.resteAVivreMinTotal)} €/mois</span>
                              <span className={`text-[10px] font-medium ${
                                calculs.niveauResteAVivre === 'ok' ? 'text-aquiz-green' : calculs.niveauResteAVivre === 'limite' ? 'text-amber-500' : 'text-red-500'
                              }`}>
                                {calculs.niveauResteAVivre === 'ok' ? 'Confortable' : calculs.niveauResteAVivre === 'limite' ? 'Limite' : 'Insuffisant'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                    </div>
                  </aside>
                </div>
                
                {/* Bouton Mobile */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t border-aquiz-gray-lighter/60 z-20">
                  <Button 
                    type="button" 
                    className="w-full bg-aquiz-green hover:bg-aquiz-green/90 h-12 font-semibold rounded-xl shadow-md shadow-aquiz-green/20" 
                    onClick={goToNextEtape} 
                    disabled={mensualiteMax === 0 || calculs.depasseEndettement || calculs.niveauResteAVivre === 'risque'}
                  >
                    Voir mon score
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <div className="lg:hidden h-20" />
              </div>
            )}

            {etape === 'resultats' && (
              <div className="animate-fade-in -mx-4 sm:mx-0">

                <div className="px-4 sm:px-0 space-y-4">
                  
                  {/* CARTE IDF INTERACTIVE - EN PREMIER (Above the fold) */}
                  <div className="bg-white rounded-2xl shadow-sm border border-aquiz-gray-lighter overflow-hidden">
                    {/* Header compact */}
                    <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-aquiz-green" />
                          </div>
                          <div>
                            <h2 className="font-bold text-aquiz-black text-sm">Carte des surfaces accessibles</h2>
                            <p className="text-[11px] text-aquiz-gray">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-semibold mr-1">DVF 2025</span>
                              Budget {formatMontant(calculs.prixAchatMax)} €
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${!calculs.depasseEndettement ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-500 border border-red-200'}`}>
                          {!calculs.depasseEndettement ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {!calculs.depasseEndettement ? 'Finançable' : 'Non finançable'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Carte Leaflet interactive */}
                    <MiniCarteIDF departements={calculs.apercuSurfaces} onExplore={saveAndGoToCarte} />
                    
                    {/* Statistiques rapides */}
                    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500">Jusqu&apos;à :</span>
                            <span className="font-bold text-emerald-600">
                              {Math.max(...calculs.apercuSurfaces.map(z => z.surface || 0))} m² ({calculs.apercuSurfaces.find(z => z.surface === Math.max(...calculs.apercuSurfaces.map(a => a.surface || 0)))?.nom})
                            </span>
                          </div>
                        </div>
                        <div className="text-slate-500">
                          <span className="font-semibold text-emerald-600">{calculs.apercuSurfaces.reduce((sum, z) => sum + (z.nbOpportunites || 0), 0)}</span> communes accessibles
                        </div>
                      </div>
                    </div>
                    
                    {/* Détails par zone sous la carte - Redesign */}
                    <div className="px-4 py-4 border-t border-slate-100">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {calculs.apercuSurfaces
                          .sort((a, b) => (b.surface || 0) - (a.surface || 0))
                          .slice(0, 4)
                          .map((zone, index) => (
                          <div key={zone.codeDept} className={`relative flex items-center gap-2.5 p-3 rounded-xl transition-all cursor-pointer ${
                            (zone.surface || 0) >= 40 ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200' :
                            (zone.surface || 0) >= 25 ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200' : 
                            'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                          }`}>
                            {index === 0 && (
                              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-aquiz-green rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow">
                                1
                              </div>
                            )}
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                              (zone.surface || 0) >= 40 ? 'bg-emerald-500' :
                              (zone.surface || 0) >= 25 ? 'bg-amber-500' : 'bg-slate-400'
                            }`}>{zone.codeDept}</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-slate-500 truncate">{zone.nom}</p>
                              <p className={`text-sm font-bold ${
                                (zone.surface || 0) >= 40 ? 'text-emerald-700' :
                                (zone.surface || 0) >= 25 ? 'text-amber-700' : 'text-slate-600'
                              }`}>jusqu&apos;à {zone.surface} m²</p>
                              {(zone.nbOpportunites || 0) > 0 && (
                                <p className="text-[9px] text-emerald-600 font-medium">{zone.nbOpportunites} commune{(zone.nbOpportunites || 0) > 1 ? 's' : ''} accessible{(zone.nbOpportunites || 0) > 1 ? 's' : ''}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA Explorer — pleine largeur, vert, en bas de la carte */}
                    <div className="px-4 pb-4 pt-1">
                      <button type="button" onClick={saveAndGoToCarte} className="w-full flex items-center justify-center gap-2.5 py-3 bg-gradient-to-r from-aquiz-green to-emerald-500 hover:from-emerald-600 hover:to-emerald-500 text-white rounded-xl shadow-lg shadow-aquiz-green/25 hover:shadow-aquiz-green/40 hover:scale-[1.01] active:scale-[0.98] transition-all group cursor-pointer">
                        <MapPin className="w-4.5 h-4.5 group-hover:animate-bounce" />
                        <span className="text-sm font-bold tracking-tight">Explorer la carte interactive</span>
                        <span className="text-xs text-white/70 font-medium hidden sm:inline">— {calculs.apercuSurfaces.reduce((sum, z) => sum + (z.nbOpportunites || 0), 0)} communes, PTZ, prix au m²</span>
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                    
                  </div>

                  {/* SCORE + INDICATEURS */}
                  <div className="bg-white rounded-2xl shadow-sm border border-aquiz-gray-lighter overflow-hidden">
                    <div className="p-5 flex items-center gap-5 border-b border-aquiz-gray-lighter">
                      {/* Score circulaire */}
                      <div className="relative shrink-0">
                        <svg className="w-20 h-20 -rotate-90">
                          <circle cx="40" cy="40" r="34" stroke="#f1f5f9" strokeWidth="6" fill="none" />
                          <circle 
                            cx="40" cy="40" r="34" 
                            stroke="currentColor" 
                            strokeWidth="6" 
                            fill="none"
                            strokeDasharray={213.6}
                            strokeDashoffset={213.6 - (213.6 * scoreFaisabilite) / 100}
                            strokeLinecap="round"
                            className={scoreFaisabilite >= 80 ? 'text-aquiz-green' : scoreFaisabilite >= 60 ? 'text-amber-500' : 'text-red-500'}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-xl font-bold ${scoreFaisabilite >= 80 ? 'text-aquiz-green' : scoreFaisabilite >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{scoreFaisabilite}</span>
                          <span className="text-[9px] text-aquiz-gray -mt-0.5">/100</span>
                        </div>
                      </div>
                      {/* Verdict */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-lg font-bold ${scoreFaisabilite >= 80 ? 'text-aquiz-green' : scoreFaisabilite >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                          {scoreFaisabilite >= 80 ? 'Excellent' : scoreFaisabilite >= 60 ? 'Bon' : scoreFaisabilite >= 40 ? 'Moyen' : 'À améliorer'}
                        </p>
                        <p className="text-sm text-aquiz-gray leading-snug mt-0.5">
                          {scoreFaisabilite >= 80 
                            ? 'Profil solide, excellentes chances d\'obtenir votre financement.'
                            : scoreFaisabilite >= 60
                              ? 'Projet réalisable, quelques optimisations possibles.'
                              : 'Des ajustements sont nécessaires.'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {/* Indicateurs clés */}
                    <div className="grid grid-cols-2 divide-x divide-aquiz-gray-lighter">
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Percent className="w-4 h-4 text-aquiz-gray" />
                          <span className="text-xs text-aquiz-gray">Taux d&apos;endettement</span>
                          {!calculs.depasseEndettement ? <CheckCircle className="w-3.5 h-3.5 text-aquiz-green ml-auto" /> : <AlertCircle className="w-3.5 h-3.5 text-red-500 ml-auto" />}
                        </div>
                        <p className={`text-2xl font-bold ${!calculs.depasseEndettement ? 'text-aquiz-black' : 'text-red-500'}`}>
                          {Math.round(calculs.tauxEndettementProjet)}%
                        </p>
                        <p className="text-[10px] text-aquiz-gray mt-0.5">Maximum autorisé : 35%</p>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <PiggyBank className="w-4 h-4 text-aquiz-gray" />
                          <span className="text-xs text-aquiz-gray">Reste à vivre</span>
                          {calculs.niveauResteAVivre !== 'risque' ? <CheckCircle className="w-3.5 h-3.5 text-aquiz-green ml-auto" /> : <AlertCircle className="w-3.5 h-3.5 text-red-500 ml-auto" />}
                        </div>
                        <p className={`text-2xl font-bold ${calculs.niveauResteAVivre !== 'risque' ? 'text-aquiz-black' : 'text-red-500'}`}>
                          {formatMontant(calculs.resteAVivre)} €
                        </p>
                        <p className="text-[10px] text-aquiz-gray mt-0.5">Minimum requis : {formatMontant(calculs.resteAVivreMinTotal)} €</p>
                      </div>
                    </div>
                  </div>

                  {/* DÉTAIL DU SCORE — 7 critères (accordéon) */}
                  <div className="bg-white rounded-2xl shadow-sm border border-aquiz-gray-lighter overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowScoreDetail(!showScoreDetail)}
                      className="w-full px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-aquiz-gray-lightest/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-aquiz-gray-lightest flex items-center justify-center">
                          <Shield className="w-4 h-4 text-aquiz-gray" />
                        </div>
                        <div className="text-left">
                          <h2 className="text-sm font-semibold text-aquiz-black">Analyse détaillée du score</h2>
                          <p className="text-[10px] text-aquiz-gray mt-0.5">
                            7 critères bancaires — <span className={`font-semibold ${
                              scoreFaisabilite >= 80 ? 'text-aquiz-green' : scoreFaisabilite >= 60 ? 'text-amber-500' : 'text-red-500'
                            }`}>{scoreDetails.filter(d => (d.max > 0 ? (d.score / d.max) * 100 : 0) >= 75).length}/7 validés</span>
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-aquiz-gray transition-transform duration-300 ${showScoreDetail ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`grid transition-all duration-300 ease-in-out ${showScoreDetail ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                        <div className="divide-y divide-aquiz-gray-lighter border-t border-aquiz-gray-lighter">
                          {scoreDetails.map((d) => {
                            const pct = d.max > 0 ? (d.score / d.max) * 100 : 0
                            const isGood = pct >= 75
                            const isMedium = pct >= 50 && pct < 75
                            const barColor = isGood ? 'bg-aquiz-green' : isMedium ? 'bg-amber-400' : pct >= 25 ? 'bg-orange-400' : 'bg-red-400'
                            const iconEl = isGood
                              ? <CheckCircle className="w-4 h-4 text-aquiz-green" />
                              : isMedium
                                ? <AlertCircle className="w-4 h-4 text-amber-500" />
                                : <AlertCircle className="w-4 h-4 text-red-400" />
                            return (
                              <div key={d.critere} className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isGood ? 'bg-aquiz-green/10' : isMedium ? 'bg-amber-50' : 'bg-red-50'}`}>
                                    {iconEl}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm text-aquiz-black">{d.critere}</span>
                                      <span className={`text-xs font-semibold ${isGood ? 'text-aquiz-green' : isMedium ? 'text-amber-500' : 'text-red-400'}`}>{d.score}/{d.max}</span>
                                    </div>
                                    <div className="h-1.5 bg-aquiz-gray-lightest rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-aquiz-gray mt-1">{d.commentaire}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DÉTAILS DU FINANCEMENT */}
                  <div className="bg-white rounded-2xl shadow-sm border border-aquiz-gray-lighter overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter">
                      <h2 className="text-sm font-semibold text-aquiz-black">Détail du financement</h2>
                    </div>
                    <div className="divide-y divide-aquiz-gray-lighter">
                      <div className="px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-aquiz-gray-lightest flex items-center justify-center">
                            <Clock className="w-4 h-4 text-aquiz-gray" />
                          </div>
                          <div>
                            <p className="text-sm text-aquiz-gray">Mensualité</p>
                            <p className="text-[10px] text-aquiz-gray/70">Sur {dureeAns} ans à {tauxInteret.toFixed(1)}%</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-aquiz-black">{formatMontant(mensualiteRecommandee)} €/mois</p>
                      </div>
                      <div className="px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-aquiz-gray-lightest flex items-center justify-center">
                            <PiggyBank className="w-4 h-4 text-aquiz-gray" />
                          </div>
                          <div>
                            <p className="text-sm text-aquiz-gray">Apport personnel</p>
                            <p className="text-[10px] text-aquiz-gray/70">{calculs.prixAchatMax > 0 ? Math.round((apport / calculs.prixAchatMax) * 100) : 0}% du budget</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-aquiz-black">{formatMontant(apport)} €</p>
                      </div>
                      <div className="px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-aquiz-gray-lightest flex items-center justify-center">
                            <Percent className="w-4 h-4 text-aquiz-gray" />
                          </div>
                          <div>
                            <p className="text-sm text-aquiz-gray">Capacité d&apos;emprunt</p>
                            <p className="text-[10px] text-aquiz-gray/70">Hors frais de notaire</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-aquiz-black">{formatMontant(calculs.capitalEmpruntable)} €</p>
                      </div>
                    </div>
                  </div>

                  {/* CONSEILS AQUIZ AVANCÉS - Système professionnel */}
                  {!calculs.depasseEndettement && calculs.niveauResteAVivre !== 'risque' && (() => {
                    const resultatsConseils = genererConseilsAvances({
                      // Profil
                      age,
                      statutProfessionnel,
                      situationFoyer,
                      nombreEnfants,
                      // Revenus & charges
                      revenus: calculs.revenusMensuelsTotal,
                      charges: calculs.chargesMensuellesTotal,
                      // Projet
                      apport,
                      mensualiteMax,
                      mensualiteRecommandee,
                      dureeAns,
                      tauxInteret,
                      typeBien,
                      // Résultats calculés
                      prixAchat: calculs.prixAchatMax,
                      capitalEmpruntable: calculs.capitalEmpruntable,
                      tauxEndettement: calculs.tauxEndettementProjet,
                      resteAVivre: calculs.resteAVivre,
                      resteAVivreMin: calculs.resteAVivreMinTotal,
                      niveauResteAVivre: calculs.niveauResteAVivre,
                      scoreFaisabilite,
                      // Géographie
                      surfaceParis: calculs.surfaceParis,
                      surfacePetiteCouronne: calculs.surfacePetiteCouronne,
                      surfaceGrandeCouronne: calculs.surfaceGrandeCouronne
                    })
                    
                    return (
                      <ConseilsAvances 
                        resultats={resultatsConseils}
                        onContactConseiller={() => setShowContactModal(true)}
                      />
                    )
                  })()}

                  {/* ALERTE SI PROBLÈME + CTA CONSEILLER */}
                  {(calculs.depasseEndettement || calculs.niveauResteAVivre === 'risque') && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-red-700 text-sm">Projet non finançable en l'état</p>
                          <p className="text-xs text-red-600 mt-1">Réduisez la mensualité ou augmentez votre apport.</p>
                          <button 
                            type="button"
                            onClick={() => setShowContactModal(true)}
                            className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Un conseiller peut vous aider
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CTA Télécharger PDF — consécration du projet */}
                  <div className="relative overflow-hidden rounded-2xl border border-aquiz-green/20 bg-gradient-to-br from-aquiz-green/5 via-white to-aquiz-green/10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-aquiz-green/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-aquiz-green/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                    <div className="relative p-6 sm:p-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-aquiz-green/10 flex items-center justify-center mx-auto mb-4">
                        <Download className="w-7 h-7 text-aquiz-green" />
                      </div>
                      <h3 className="text-lg font-bold text-aquiz-black mb-1">Votre rapport de simulation</h3>
                      <p className="text-sm text-aquiz-gray mb-5 max-w-md mx-auto">
                        Téléchargez votre étude complète au format PDF : budget, capacité d&apos;emprunt, conseils personnalisés et opportunités géographiques.
                      </p>
                      <button
                        type="button"
                        onClick={generatePDF}
                        className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-aquiz-green hover:bg-aquiz-green/90 text-white font-semibold rounded-xl shadow-md shadow-aquiz-green/20 transition-all hover:shadow-lg hover:shadow-aquiz-green/30 hover:-translate-y-0.5"
                      >
                        <Download className="w-5 h-5" />
                        Télécharger mon rapport PDF
                      </button>
                      <p className="text-[10px] text-aquiz-gray mt-3">Gratuit • Aucune inscription requise</p>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-[10px] text-aquiz-gray text-center pt-2">
                    Simulation indicative • Critères HCSF 2025 • Prix DVF data.gouv.fr
                  </p>
                </div>
                
                {/* Bouton Mobile fixe */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-aquiz-gray-lighter z-20">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="h-11 px-3 border-aquiz-gray-lighter rounded-xl" onClick={() => goToEtape('simulation')}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button type="button" onClick={saveAndGoToCarte} className="flex-1 h-11 bg-aquiz-black hover:bg-aquiz-black/90 text-white rounded-xl gap-2 text-sm">
                      <MapPin className="w-4 h-4" />
                      Carte
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => setShowContactModal(true)}
                      className="flex-1 h-11 bg-aquiz-green hover:bg-aquiz-green/90 text-white rounded-xl gap-2 text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      Conseiller
                    </Button>
                  </div>
                </div>
                <div className="lg:hidden h-24" />
              </div>
            )}

          </form>
        </main>
      </div>
      
      {/* Modale Contact */}
      <ContactModal 
        isOpen={showContactModal} 
        onClose={() => setShowContactModal(false)}
      />
    </TooltipProvider>
  )
}

// Loading fallback
function ModeALoading() {
  return (
    <div className="min-h-screen bg-aquiz-gray-lightest flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-aquiz-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-aquiz-gray">Chargement...</p>
      </div>
    </div>
  )
}

// Export avec Suspense wrapper
export default function ModeAPage() {
  return (
    <Suspense fallback={<ModeALoading />}>
      <ModeAPageContent />
    </Suspense>
  )
}
