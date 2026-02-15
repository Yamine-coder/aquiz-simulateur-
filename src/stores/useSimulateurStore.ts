/**
 * Store Zustand pour le simulateur AQUIZ
 * Conforme aux spécifications du PDF
 */

import type { ZonePTZ } from '@/types/aides'
import type { ModeSimulation } from '@/types/simulateur'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================
// TYPES DU STORE
// ============================================

/** Statut professionnel */
type StatutProfessionnel = 'cdi' | 'cdd' | 'fonctionnaire' | 'independant' | 'retraite' | 'autre'

/** Zone sélectionnée depuis la carte */
interface ZoneSelectionneeStore {
  /** Code INSEE de la commune */
  codeInsee: string
  /** Code postal */
  codePostal: string
  /** Nom de la commune */
  nomCommune: string
  /** Code département */
  codeDepartement: string
  /** Nom département */
  departement: string
  /** Zone PTZ associée */
  zonePTZ: ZonePTZ
  /** Prix au m² médian */
  prixM2: number
  /** Surface accessible avec le budget */
  surfaceAccessible: number
}

/** Profil utilisateur (commun Mode A et B) */
interface ProfilStore {
  // Données personnelles
  age: number
  statutProfessionnel: StatutProfessionnel
  situationFoyer: 'celibataire' | 'couple'
  nombreEnfants: number
  // Revenus
  salaire1: number
  salaire2: number
  autresRevenus: number
  // Charges
  creditsEnCours: number
  autresCharges: number
  // Calculés
  revenusMensuelsTotal: number
  chargesMensuellesTotal: number
  tauxEndettementActuel: number
}

/** Paramètres Mode A */
interface ParametresModeAStore {
  mensualiteMax: number
  dureeAns: number
  apport: number
  typeBien: 'neuf' | 'ancien'
  tauxInteret: number
}

/** Paramètres Mode B */
interface ParametresModeBStore {
  prixBien: number
  typeBien: 'neuf' | 'ancien'
  codePostal?: string
  typeLogement?: 'appartement' | 'maison'
  apport: number
  dureeAns: number
  tauxInteret: number
}

/** Niveau de risque du projet */
type NiveauProjet = 'confortable' | 'limite' | 'impossible'

/** Résultats de simulation */
interface ResultatsStore {
  // Mode
  mode: ModeSimulation
  
  // Résultats communs
  capaciteEmprunt: number
  mensualiteCredit: number
  mensualiteAssurance: number
  mensualiteTotal: number
  fraisNotaire: number
  tauxEndettementProjet: number
  resteAVivre: number
  resteAVivreMinimum: number
  
  // Évaluation
  niveauProjet: NiveauProjet
  faisable: boolean
  alertes: string[]
  
  // Mode A spécifique
  prixAchatMax?: number
  // Fourchettes pessimiste / réaliste (specs)
  prixAchatPessimiste?: number
  prixAchatRealiste?: number
  capaciteEmpruntPessimiste?: number
  capaciteEmpruntRealiste?: number
  
  // Mode B spécifique
  prixBienAnalyse?: number
  achatPossible?: boolean
  
  // Ajustements suggérés
  ajustements?: {
    type: string
    valeurActuelle: number
    valeurProposee: number
    impact: string
  }[]
}

interface SimulateurState {
  // Données de simulation
  mode: ModeSimulation | null
  profil: ProfilStore | null
  parametresModeA: ParametresModeAStore | null
  parametresModeB: ParametresModeBStore | null
  resultats: ResultatsStore | null
  
  // Zone sélectionnée depuis la carte (Mode A uniquement)
  zoneSelectionnee: ZoneSelectionneeStore | null

  // Navigation
  etapeActuelle: number

  // Actions
  setMode: (mode: ModeSimulation) => void
  setProfil: (profil: ProfilStore) => void
  setParametresModeA: (params: ParametresModeAStore) => void
  setParametresModeB: (params: ParametresModeBStore) => void
  setResultats: (resultats: ResultatsStore) => void
  setZoneSelectionnee: (zone: ZoneSelectionneeStore | null) => void
  setEtape: (etape: number) => void

  // Reset
  reset: () => void
}

// ============================================
// ÉTAT INITIAL
// ============================================

const initialState = {
  mode: null as ModeSimulation | null,
  profil: null as ProfilStore | null,
  parametresModeA: null as ParametresModeAStore | null,
  parametresModeB: null as ParametresModeBStore | null,
  resultats: null as ResultatsStore | null,
  zoneSelectionnee: null as ZoneSelectionneeStore | null,
  etapeActuelle: 1,
}

// ============================================
// STORE
// ============================================

export const useSimulateurStore = create<SimulateurState>()(
  persist(
    (set) => ({
      ...initialState,

      setMode: (mode) => set({ mode, etapeActuelle: 1, resultats: null }),
      
      setProfil: (profil) => set({ profil }),
      
      setParametresModeA: (params) => set({ parametresModeA: params }),
      
      setParametresModeB: (params) => set({ parametresModeB: params }),
      
      setResultats: (resultats) => set({ resultats }),
      
      setZoneSelectionnee: (zone) => set({ zoneSelectionnee: zone }),
      
      setEtape: (etape) => set({ etapeActuelle: etape }),

      reset: () => set(initialState),
    }),
    {
      name: 'aquiz-simulateur',
      partialize: (state) => ({
        mode: state.mode,
        profil: state.profil,
        parametresModeA: state.parametresModeA,
        parametresModeB: state.parametresModeB,
        resultats: state.resultats,
        zoneSelectionnee: state.zoneSelectionnee,
      }),
    }
  )
)

// ============================================
// HOOK D'HYDRATATION
// ============================================

/**
 * Hook pour attendre que le store soit hydraté depuis localStorage
 * Évite les problèmes de mismatch SSR/client
 */
export const useHydration = () => {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Zustand persist stocke l'état de réhydratation
    const unsubFinishHydration = useSimulateurStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })

    // Si déjà hydraté (ex: navigation client-side)
    if (useSimulateurStore.persist.hasHydrated()) {
      setHydrated(true)
    }

    return () => {
      unsubFinishHydration()
    }
  }, [])

  return hydrated
}
