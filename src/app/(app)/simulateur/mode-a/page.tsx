'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { jsPDF } from 'jspdf'
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle,
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
import { ResumeModal, SaveButton } from '@/components/simulation'
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

  // Restaurer l'étape ET les données depuis le store au chargement (si on revient de la carte)
  // Sauf si ?new=true est présent (nouvelle simulation depuis Mode B)
  useEffect(() => {
    // Si c'est une nouvelle simulation, ne pas restaurer et rester à l'étape 1
    if (isNewSimulation) {
      setEtapeLocal('profil')
      setEtapeStore(1)
      setHasRestoredFromStore(true) // Marquer comme fait pour éviter la restauration
      // Nettoyer l'URL sans recharger la page
      window.history.replaceState({}, '', '/simulateur/mode-a')
      return
    }
    
    if (!hasRestoredFromStore && storedResultats && storedEtape >= 2 && storedProfil && storedParametresModeA) {
      // On a des résultats dans le store, restaurer l'étape et les données
      setEtapeLocal(getEtapeIdFromNumber(storedEtape))
      
      // Restaurer le profil
      setAge(storedProfil.age)
      setStatutProfessionnel(storedProfil.statutProfessionnel)
      setValue('situationFoyer', storedProfil.situationFoyer)
      setValue('nombreEnfants', storedProfil.nombreEnfants)
      setValue('salaire1', storedProfil.salaire1)
      setValue('salaire2', storedProfil.salaire2)
      setValue('autresRevenus', storedProfil.autresRevenus)
      setValue('creditsEnCours', storedProfil.creditsEnCours)
      setValue('autresCharges', storedProfil.autresCharges)
      
      // Restaurer les paramètres Mode A
      setValue('mensualiteMax', storedParametresModeA.mensualiteMax)
      setValue('dureeAns', storedParametresModeA.dureeAns)
      setValue('apport', storedParametresModeA.apport)
      setValue('typeBien', storedParametresModeA.typeBien)
      setValue('tauxInteret', storedParametresModeA.tauxInteret)
      
      setHasRestoredFromStore(true)
    }
   
  }, [storedResultats, storedEtape, storedProfil, storedParametresModeA, hasRestoredFromStore, setValue, isNewSimulation, setEtapeStore])

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
    const params = new URLSearchParams(window.location.search)
    if (params.get('returning') === '1') {
      // Nettoyer le param sans recharger
      window.history.replaceState({}, '', window.location.pathname)
      return
    }
    const pending = getPending('A')
    if (pending && pending.profil && pending.profil.salaire1 > 0) {
      setPendingToResume(pending)
      setShowResumeModal(true)
    }
  }, [isLoaded, simulations, getPending])

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

  // Score de faisabilité (0-100)
  const scoreFaisabilite = useMemo(() => {
    let score = 100
    if (calculs.tauxEndettementProjet > 35) score -= 50
    else if (calculs.tauxEndettementProjet > 33) score -= 20
    else if (calculs.tauxEndettementProjet > 31) score -= 10
    if (calculs.niveauResteAVivre === 'risque') score -= 30
    else if (calculs.niveauResteAVivre === 'limite') score -= 15
    const pourcentageApport = calculs.prixAchatMax > 0 ? (apport / calculs.prixAchatMax) * 100 : 0
    if (pourcentageApport >= 20) score += 10
    else if (pourcentageApport >= 10) score += 5
    else if (pourcentageApport < 5) score -= 10
    return Math.max(0, Math.min(100, score))
  }, [calculs, apport])

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

  // Export PDF Premium - Design professionnel avec conseils avancés
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

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginLeft = 15
    const marginRight = 15
    const contentWidth = pageWidth - marginLeft - marginRight

    const fmt = (n: number): string => {
      const str = Math.round(n).toString()
      let result = ''
      for (let i = 0; i < str.length; i++) {
        if (i > 0 && (str.length - i) % 3 === 0) result += ' '
        result += str[i]
      }
      return result
    }

    const C = {
      black: [26, 26, 26] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
      gray: [100, 100, 100] as [number, number, number],
      grayLight: [150, 150, 150] as [number, number, number],
      grayBg: [245, 247, 250] as [number, number, number],
      green: [34, 197, 94] as [number, number, number],
      greenLight: [220, 252, 231] as [number, number, number],
      greenDark: [22, 163, 74] as [number, number, number],
      orange: [249, 115, 22] as [number, number, number],
      red: [239, 68, 68] as [number, number, number],
      blue: [59, 130, 246] as [number, number, number],
    }

    // Utilitaires
    const drawSectionTitle = (title: string, x: number, y: number, width: number) => {
      doc.setFillColor(...C.black)
      doc.roundedRect(x, y, width, 8, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...C.white)
      doc.text(title, x + 4, y + 5.5)
    }

    const drawDataRow = (label: string, value: string, x: number, y: number, w: number, highlight?: [number, number, number]) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.gray)
      doc.text(label, x + 4, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...(highlight || C.black))
      doc.text(value, x + w - 4, y, { align: 'right' })
    }

    const addFooter = (pageNum: number, totalPages: number) => {
      doc.setFillColor(...C.black)
      doc.rect(0, pageHeight - 20, pageWidth, 20, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...C.white)
      doc.text('AQUIZ', marginLeft, pageHeight - 10)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(120, 120, 120)
      doc.text('Simulation indicative - Ne constitue pas une offre de pret', pageWidth / 2, pageHeight - 10, { align: 'center' })
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(`Page ${pageNum}/${totalPages}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' })
    }

    let y = 0

    // =====================================================
    // PAGE 1 : RÉSUMÉ CAPACITÉ
    // =====================================================
    
    // Header noir
    doc.setFillColor(...C.black)
    doc.rect(0, 0, pageWidth, 48, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(24)
    doc.setTextColor(...C.white)
    doc.text('AQUIZ', marginLeft, 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(180, 180, 180)
    doc.text('Etude de capacite d\'achat immobilier', marginLeft, 23)
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(dateStr, pageWidth - marginRight, 15, { align: 'right' })
    
    // Badge score dans header
    const scoreColor = scoreFaisabilite >= 80 ? C.green : scoreFaisabilite >= 60 ? C.orange : C.red
    doc.setFillColor(...scoreColor)
    doc.roundedRect(pageWidth - marginRight - 28, 22, 28, 18, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...C.white)
    doc.text(scoreFaisabilite.toString(), pageWidth - marginRight - 14, 32, { align: 'center' })
    doc.setFontSize(6)
    doc.text('/100', pageWidth - marginRight - 14, 37, { align: 'center' })
    y = 56

    // Grande carte capacité
    doc.setFillColor(...C.grayBg)
    doc.roundedRect(marginLeft, y, contentWidth, 36, 3, 3, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...C.gray)
    doc.text('VOTRE CAPACITE D\'ACHAT MAXIMALE', marginLeft + 8, y + 10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(28)
    doc.setTextColor(...C.black)
    doc.text(fmt(calculs.prixAchatMax) + ' EUR', marginLeft + 8, y + 26)
    // Probabilité à droite
    doc.setFillColor(...C.black)
    doc.roundedRect(pageWidth - marginRight - 45, y + 6, 38, 24, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(180, 180, 180)
    doc.text('PROBABILITE', pageWidth - marginRight - 26, y + 13, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...C.white)
    const probaText = resultatsConseils.diagnostic.probabiliteAcceptation.toUpperCase()
    doc.text(probaText.length > 12 ? probaText.substring(0, 12) : probaText, pageWidth - marginRight - 26, y + 22, { align: 'center' })
    y += 44

    // 3 Colonnes métriques clés
    const col3Width = (contentWidth - 8) / 3
    const metrics = [
      { label: 'MENSUALITE', value: fmt(mensualiteMax + calculs.mensualiteAssurance) + ' EUR', sub: 'Crédit + Assurance' },
      { label: 'DUREE', value: dureeAns + ' ans', sub: 'Soit ' + (dureeAns * 12) + ' mensualités' },
      { label: 'TAUX', value: tauxInteret + '%', sub: 'Hors assurance' }
    ]
    metrics.forEach((m, i) => {
      const mx = marginLeft + i * (col3Width + 4)
      doc.setFillColor(...C.white)
      doc.roundedRect(mx, y, col3Width, 26, 2, 2, 'F')
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.roundedRect(mx, y, col3Width, 26, 2, 2, 'S')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...C.gray)
      doc.text(m.label, mx + col3Width / 2, y + 7, { align: 'center' })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...C.black)
      doc.text(m.value, mx + col3Width / 2, y + 16, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(...C.grayLight)
      doc.text(m.sub, mx + col3Width / 2, y + 22, { align: 'center' })
    })
    y += 34

    // 2 Colonnes : Profil & Paramètres
    const halfWidth = (contentWidth - 6) / 2
    drawSectionTitle('PROFIL EMPRUNTEUR', marginLeft, y, halfWidth)
    doc.setFillColor(...C.grayBg)
    doc.roundedRect(marginLeft, y + 9, halfWidth, 40, 1, 1, 'F')
    let rowY = y + 17
    drawDataRow('Age', age + ' ans', marginLeft, rowY, halfWidth)
    rowY += 8
    drawDataRow('Statut', (statutProfessionnel || 'CDI').toUpperCase(), marginLeft, rowY, halfWidth)
    rowY += 8
    drawDataRow('Situation', situationFoyer === 'couple' ? 'En couple' : 'Celibataire', marginLeft, rowY, halfWidth)
    rowY += 8
    drawDataRow('Revenus nets', fmt(calculs.revenusMensuelsTotal) + ' EUR/mois', marginLeft, rowY, halfWidth)
    rowY += 8
    drawDataRow('Charges', fmt(calculs.chargesMensuellesTotal) + ' EUR/mois', marginLeft, rowY, halfWidth)

    const rightX = marginLeft + halfWidth + 6
    drawSectionTitle('FINANCEMENT', rightX, y, halfWidth)
    doc.setFillColor(...C.grayBg)
    doc.roundedRect(rightX, y + 9, halfWidth, 40, 1, 1, 'F')
    rowY = y + 17
    drawDataRow('Capital empruntable', fmt(calculs.capitalEmpruntable) + ' EUR', rightX, rowY, halfWidth)
    rowY += 8
    drawDataRow('Apport personnel', fmt(apport) + ' EUR', rightX, rowY, halfWidth)
    rowY += 8
    drawDataRow('Frais de notaire', fmt(calculs.fraisNotaire) + ' EUR', rightX, rowY, halfWidth)
    rowY += 8
    const tauxColor = calculs.tauxEndettementProjet <= 33 ? C.green : calculs.tauxEndettementProjet <= 35 ? C.orange : C.red
    drawDataRow('Taux d\'endettement', Math.round(calculs.tauxEndettementProjet) + '%', rightX, rowY, halfWidth, tauxColor)
    rowY += 8
    const ravColor = calculs.resteAVivre >= calculs.resteAVivreMinTotal ? C.green : C.orange
    drawDataRow('Reste a vivre', fmt(calculs.resteAVivre) + ' EUR', rightX, rowY, halfWidth, ravColor)
    y += 58

    // Répartition budget (barres)
    drawSectionTitle('REPARTITION DU BUDGET', marginLeft, y, contentWidth)
    y += 12
    const items = [
      { label: 'Apport personnel', value: pieData.apport, pct: pieData.pourcentageApport, color: C.blue },
      { label: 'Pret bancaire', value: pieData.pret, pct: pieData.pourcentagePret, color: C.black },
      { label: 'Frais de notaire', value: pieData.frais, pct: pieData.pourcentageFrais, color: C.grayLight },
    ]
    items.forEach((item, i) => {
      const by = y + i * 11
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...C.gray)
      doc.text(item.label, marginLeft, by)
      doc.text(fmt(item.value) + ' EUR (' + item.pct + '%)', pageWidth - marginRight, by, { align: 'right' })
      doc.setFillColor(230, 230, 230)
      doc.roundedRect(marginLeft, by + 2, contentWidth, 5, 1, 1, 'F')
      if (item.pct > 0) {
        doc.setFillColor(...item.color)
        doc.roundedRect(marginLeft, by + 2, Math.max(3, contentWidth * item.pct / 100), 5, 1, 1, 'F')
      }
    })
    y += 35
    doc.setDrawColor(200, 200, 200)
    doc.line(marginLeft, y, pageWidth - marginRight, y)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...C.black)
    doc.text('BUDGET TOTAL', marginLeft, y)
    doc.text(fmt(pieData.total) + ' EUR', pageWidth - marginRight, y, { align: 'right' })
    
    addFooter(1, 2)

    // =====================================================
    // PAGE 2 : DIAGNOSTIC BANCAIRE & CONSEILS
    // =====================================================
    doc.addPage()
    y = 15

    // Header léger
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...C.black)
    doc.text('DIAGNOSTIC BANCAIRE', marginLeft, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...C.gray)
    doc.text('Analyse de votre dossier', marginLeft + 52, y)
    y += 8

    // Carte score diagnostic
    doc.setFillColor(...C.black)
    doc.roundedRect(marginLeft, y, contentWidth, 32, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(32)
    doc.setTextColor(...C.white)
    doc.text(resultatsConseils.diagnostic.scoreGlobal.toString(), marginLeft + 20, y + 20, { align: 'center' })
    doc.setFontSize(10)
    doc.text('/100', marginLeft + 32, y + 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(180, 180, 180)
    doc.text('Score global', marginLeft + 8, y + 28)
    // Probabilité
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...C.green)
    doc.text('Probabilite: ' + resultatsConseils.diagnostic.probabiliteAcceptation, marginLeft + 60, y + 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(180, 180, 180)
    doc.text('Delai estime: ' + resultatsConseils.diagnostic.delaiEstime, marginLeft + 60, y + 22)
    if (resultatsConseils.diagnostic.banquesRecommandees.length > 0) {
      doc.text('Banques ciblees: ' + resultatsConseils.diagnostic.banquesRecommandees.join(', '), marginLeft + 60, y + 28)
    }
    y += 40

    // Points forts & vigilance
    const pfWidth = (contentWidth - 6) / 2
    doc.setFillColor(...C.greenLight)
    doc.roundedRect(marginLeft, y, pfWidth, 6, 1, 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...C.greenDark)
    doc.text('POINTS FORTS', marginLeft + 4, y + 4.5)
    doc.setFillColor(...C.grayBg)
    const pfHeight = Math.max(24, resultatsConseils.diagnostic.pointsForts.length * 8 + 6)
    doc.roundedRect(marginLeft, y + 7, pfWidth, pfHeight, 1, 1, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...C.black)
    resultatsConseils.diagnostic.pointsForts.forEach((pf, i) => {
      const maxChars = 42
      const pfText = '• ' + (pf.length > maxChars ? pf.substring(0, maxChars - 3) + '...' : pf)
      doc.text(pfText, marginLeft + 3, y + 14 + i * 8)
    })

    const pvX = marginLeft + pfWidth + 6
    doc.setFillColor(255, 243, 224)
    doc.roundedRect(pvX, y, pfWidth, 6, 1, 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...C.orange)
    doc.text('POINTS D\'ATTENTION', pvX + 4, y + 4.5)
    doc.setFillColor(...C.grayBg)
    const pvHeight = Math.max(24, resultatsConseils.diagnostic.pointsVigilance.length * 8 + 6)
    doc.roundedRect(pvX, y + 7, pfWidth, pvHeight, 1, 1, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...C.black)
    resultatsConseils.diagnostic.pointsVigilance.forEach((pv, i) => {
      const maxChars = 42
      const pvText = '• ' + (pv.length > maxChars ? pv.substring(0, maxChars - 3) + '...' : pv)
      doc.text(pvText, pvX + 3, y + 14 + i * 8)
    })
    y += Math.max(pfHeight, pvHeight) + 16

    // Résumé exécutif - en plusieurs lignes avec bullets
    const resumeHeight = 28
    doc.setFillColor(...C.grayBg)
    doc.roundedRect(marginLeft, y, contentWidth, resumeHeight, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...C.black)
    doc.text('RESUME', marginLeft + 4, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...C.gray)
    // Découper le résumé en points clés (max 55 chars par ligne)
    const maxCharsPerLine = 55
    const resumeFull = resultatsConseils.resumeExecutif
    const resumeBullets: string[] = []
    let remaining = resumeFull
    while (remaining.length > 0 && resumeBullets.length < 3) {
      if (remaining.length <= maxCharsPerLine) {
        resumeBullets.push('• ' + remaining)
        break
      }
      // Trouver le dernier espace avant la limite
      let cutPoint = remaining.lastIndexOf(' ', maxCharsPerLine)
      if (cutPoint <= 0) cutPoint = maxCharsPerLine
      resumeBullets.push('• ' + remaining.substring(0, cutPoint))
      remaining = remaining.substring(cutPoint + 1)
    }
    resumeBullets.forEach((line, i) => {
      doc.text(line, marginLeft + 4, y + 12 + i * 5)
    })
    y += resumeHeight + 8

    // CONSEILS PERSONNALISES
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...C.black)
    doc.text('RECOMMANDATIONS PERSONNALISEES', marginLeft, y)
    y += 8

    resultatsConseils.conseils.slice(0, 4).forEach((conseil, idx) => {
      if (y > pageHeight - 50) return
      const conseilHeight = 20
      doc.setFillColor(...C.grayBg)
      doc.roundedRect(marginLeft, y, contentWidth, conseilHeight, 1, 1, 'F')
      // Numéro
      doc.setFillColor(...C.black)
      doc.roundedRect(marginLeft + 3, y + 4, 12, 12, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...C.white)
      doc.text((idx + 1).toString(), marginLeft + 9, y + 12, { align: 'center' })
      // Titre & conseil
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...C.black)
      const titreMax = 50
      const titreTronque = conseil.titre.length > titreMax ? conseil.titre.substring(0, titreMax - 3) + '...' : conseil.titre
      doc.text(titreTronque, marginLeft + 20, y + 8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...C.gray)
      const conseilMax = 85
      const conseilText = conseil.conseil.length > conseilMax ? conseil.conseil.substring(0, conseilMax - 3) + '...' : conseil.conseil
      doc.text(conseilText, marginLeft + 20, y + 15)
      y += conseilHeight + 3
    })
    y += 8

    // SCENARIOS ALTERNATIFS
    if (resultatsConseils.scenarios.length > 0 && y < pageHeight - 70) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...C.black)
      doc.text('SCENARIOS ALTERNATIFS', marginLeft, y)
      y += 8

      resultatsConseils.scenarios.slice(0, 2).forEach((scenario) => {
        if (y > pageHeight - 45) return
        const scenHeight = 24
        doc.setFillColor(...(scenario.recommande ? C.greenLight : C.grayBg))
        doc.roundedRect(marginLeft, y, contentWidth, scenHeight, 1, 1, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...C.black)
        const scenTitreMax = 40
        const scenTitre = scenario.titre.length > scenTitreMax ? scenario.titre.substring(0, scenTitreMax - 3) + '...' : scenario.titre
        doc.text(scenTitre, marginLeft + 4, y + 7)
        if (scenario.recommande) {
          doc.setFillColor(...C.green)
          const badgeX = marginLeft + 4 + doc.getTextWidth(scenTitre) + 4
          doc.roundedRect(badgeX, y + 3, 22, 6, 1, 1, 'F')
          doc.setFontSize(5)
          doc.setTextColor(...C.white)
          doc.text('RECOMMANDE', badgeX + 11, y + 7, { align: 'center' })
        }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(...C.gray)
        const descMax = 70
        const descText = scenario.description.length > descMax ? scenario.description.substring(0, descMax - 3) + '...' : scenario.description
        doc.text(descText, marginLeft + 4, y + 14)
        // Impact
        const isPositif = scenario.resultats.economieOuCout > 0
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...(isPositif ? C.green : C.black))
        const impactText = (isPositif ? '+' : '-') + fmt(Math.abs(scenario.resultats.economieOuCout)) + ' EUR'
        doc.text(impactText, pageWidth - marginRight - 4, y + 10, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(...C.grayLight)
        doc.text('sur le budget', pageWidth - marginRight - 4, y + 17, { align: 'right' })
        y += scenHeight + 4
      })
    }

    // CTA Contact
    y = pageHeight - 50
    doc.setFillColor(...C.black)
    doc.roundedRect(marginLeft, y, contentWidth, 24, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...C.white)
    doc.text('Besoin d\'accompagnement ?', marginLeft + 8, y + 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(180, 180, 180)
    doc.text('Un conseiller AQUIZ peut negocier votre taux et optimiser votre financement.', marginLeft + 8, y + 16)
    doc.setFillColor(...C.green)
    doc.roundedRect(pageWidth - marginRight - 38, y + 5, 34, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...C.white)
    doc.text('www.aquiz.fr', pageWidth - marginRight - 21, y + 13.5, { align: 'center' })

    addFooter(2, 2)

    const dateFile = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
    doc.save(`AQUIZ-Simulation-${dateFile}.pdf`)
  }, [calculs, mensualiteMax, mensualiteRecommandee, dureeAns, apport, typeBien, tauxInteret, age, statutProfessionnel, situationFoyer, nombreEnfants, scoreFaisabilite, pieData])

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
            {/* Desktop - stepper + save */}
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
              {/* Save button */}
              <div className="shrink-0 ml-4">
                <SaveButton onSave={handleSave} disabled={salaire1 === 0} />
              </div>
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
                <SaveButton onSave={handleSave} disabled={salaire1 === 0} />
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
