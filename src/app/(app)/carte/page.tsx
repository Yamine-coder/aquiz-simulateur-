'use client'

/**
 * Page Carte Interactive - Où puis-je acheter ?
 * Design minimaliste AQUIZ - Version épurée
 */

import { Button } from '@/components/ui/button'
import { CENTRES_REGIONS, ZONES_ILE_DE_FRANCE } from '@/data/prix-m2-idf'
import { useDVFData } from '@/hooks/useDVFData'
import {
    calculerToutesZones,
    filtrerParDepartement,
} from '@/lib/calculs/calculZones'
import { formatMontant } from '@/lib/utils/formatters'
import { getZonePTZ } from '@/lib/utils/zonePTZ'
import { useHydration, useSimulateurStore } from '@/stores/useSimulateurStore'
import type { StatutZone, TypeBienCarte, ZoneCalculee } from '@/types/carte'
import {
    ArrowLeft,
    Building2,
    Filter,
    Home,
    Info,
    Lightbulb,
    Loader2,
    X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Import dynamique de la carte (Leaflet SSR)
const CarteInteractive = dynamic(
  () => import('@/components/carte/CarteInteractive'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-aquiz-gray-lightest flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-aquiz-gray animate-spin" />
      </div>
    )
  }
)

function CartePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isHydrated = useHydration()
  const { resultats, parametresModeA, setZoneSelectionnee: saveZoneToStore } = useSimulateurStore()
  
  // Détecter l'origine de la navigation
  // On mémorise en sessionStorage pour ne pas perdre l'info après un détour (carte→aides→carte)
  const fromParam = searchParams.get('from')
  const [fromSimulation, setFromSimulation] = useState(false)
  useEffect(() => {
    if (fromParam === 'simulation') {
      sessionStorage.setItem('aquiz-carte-from-simulation', '1')
      setFromSimulation(true)
    } else if (sessionStorage.getItem('aquiz-carte-from-simulation') === '1') {
      setFromSimulation(true)
    }
  }, [fromParam])
  const hasSimulationData = !!(resultats?.prixAchatMax && resultats.prixAchatMax > 0)

  // États
  const [typeBien, setTypeBien] = useState<TypeBienCarte>('appartement')
  const [filtreStatuts, setFiltreStatuts] = useState<StatutZone[]>([])
  const [filtreDepartements, setFiltreDepartements] = useState<string[]>([])
  const [zoneSelectionnee, setZoneSelectionnee] = useState<ZoneCalculee | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [customBudget, setCustomBudget] = useState<number>(300000)
  const [showBudgetHint, setShowBudgetHint] = useState(false)

  // Budget input: affichage formaté (300 000) avec saisie numérique
  const [budgetInputValue, setBudgetInputValue] = useState(formatMontant(300000))
  const budgetInputRef = useRef<HTMLInputElement>(null)

  const handleBudgetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '')
    const num = raw === '' ? 0 : Math.min(parseInt(raw, 10), 99_999_999)
    setCustomBudget(num)
    setBudgetInputValue(raw === '' ? '' : formatMontant(num))
    setShowBudgetHint(false)
  }, [])

  const handleBudgetFocus = useCallback(() => {
    setBudgetInputValue(customBudget === 0 ? '' : customBudget.toString())
    setShowBudgetHint(false)
    // Sélectionner tout le texte après le render
    requestAnimationFrame(() => budgetInputRef.current?.select())
  }, [customBudget])

  const handleBudgetBlur = useCallback(() => {
    setBudgetInputValue(formatMontant(customBudget))
  }, [customBudget])

  // Afficher le hint budget en accès direct après un court délai
  useEffect(() => {
    if (!fromSimulation && isHydrated) {
      const showTimer = setTimeout(() => setShowBudgetHint(true), 800)
      const hideTimer = setTimeout(() => setShowBudgetHint(false), 6000)
      return () => { clearTimeout(showTimer); clearTimeout(hideTimer) }
    }
  }, [fromSimulation, isHydrated])

  // DVF Data
  const departementsIDF = ['75', '77', '78', '91', '92', '93', '94', '95']
  const { zones: zonesReelles, isLoading: dvfLoading } = useDVFData(departementsIDF)

  // Effacer la sélection si la zone n'a plus de données valides
  useEffect(() => {
    if (zoneSelectionnee && zoneSelectionnee.prixM2 === 0) {
      setZoneSelectionnee(null)
    }
  }, [zoneSelectionnee, typeBien])

  // CSS Leaflet — ne pas supprimer au démontage pour éviter le bug de shrink au retour
  useEffect(() => {
    const LEAFLET_CSS_ID = 'leaflet-css-global'
    if (!document.getElementById(LEAFLET_CSS_ID)) {
      const link = document.createElement('link')
      link.id = LEAFLET_CSS_ID
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
      link.crossOrigin = ''
      document.head.appendChild(link)
    }
    // Pas de cleanup : le CSS reste chargé pour les retours navigation
  }, [])

  // Budget utilisateur
  const budget = useMemo(() => {
    if (!isHydrated) return 300000
    // Si on vient de la simulation, utiliser le budget calculé
    if (fromSimulation && resultats?.prixAchatMax) return resultats.prixAchatMax
    // Sinon, budget personnalisé
    return customBudget
  }, [isHydrated, fromSimulation, resultats, customBudget])

  // Centre de la région
  const centreRegion = CENTRES_REGIONS['ile-de-france']

  // Source de données - filtrer par type de bien dès la source
  const zonesSource = useMemo(() => {
    const source = zonesReelles.length > 0 ? zonesReelles : ZONES_ILE_DE_FRANCE
    // Filtrer les zones qui ont un prix pour le type de bien sélectionné
    // ET exclure les zones avec des données incorrectes (nom = département)
    return source.filter(z => {
      const prixM2 = typeBien === 'appartement' ? z.prixM2Appartement : z.prixM2Maison
      if (prixM2 <= 0) return false
      // Exclure les zones où le nom est le département (données corrompues)
      if (z.nom === z.departement) return false
      if (!z.nom || z.nom.length < 2) return false
      return true
    })
  }, [zonesReelles, typeBien])

  // Calcul des zones
  const zonesCalculees = useMemo(() => {
    return calculerToutesZones(zonesSource, budget, typeBien)
  }, [zonesSource, budget, typeBien])

  // Filtrage additionnel (statut, département)
  const zonesFiltrees = useMemo(() => {
    let zones = [...zonesCalculees]
    if (filtreStatuts.length > 0) {
      zones = zones.filter(z => filtreStatuts.includes(z.statut))
    }
    if (filtreDepartements.length > 0) {
      zones = filtrerParDepartement(zones, filtreDepartements)
    }
    return zones
  }, [zonesCalculees, filtreStatuts, filtreDepartements])

  // Statistiques
  const stats = useMemo(() => {
    const vertes = zonesFiltrees.filter(z => z.statut === 'vert').length
    const oranges = zonesFiltrees.filter(z => z.statut === 'orange').length
    return { vertes, oranges, total: zonesFiltrees.length }
  }, [zonesFiltrees])

  // Départements uniques
  const departementsDisponibles = useMemo(() => {
    const depts = new Set(ZONES_ILE_DE_FRANCE.map(z => z.codeDepartement))
    return Array.from(depts).sort()
  }, [])

  const getDeptLabel = (code: string) => {
    const labels: Record<string, string> = {
      '75': 'Paris',
      '77': 'Seine-et-Marne',
      '78': 'Yvelines',
      '91': 'Essonne',
      '92': 'Hauts-de-Seine',
      '93': 'Seine-Saint-Denis',
      '94': 'Val-de-Marne',
      '95': "Val-d'Oise",
    }
    return labels[code] || code
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-aquiz-gray animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-72px)] md:h-[calc(100dvh-88px)] flex flex-col bg-white overflow-hidden">
      <h1 className="sr-only">Carte des prix immobiliers en Île-de-France</h1>
      
      {/* ============================================ */}
      {/* BARRE CONTEXTUELLE PRO                      */}
      {/* ============================================ */}
      <div className="shrink-0 bg-white border-b border-slate-200/80 relative z-[40]">
        <div className="px-2 sm:px-5 h-12 flex items-center justify-between gap-1.5 sm:gap-2">
          
          {/* Gauche: Retour + Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {fromSimulation && (
              <>
                <button
                  onClick={() => {
                    sessionStorage.removeItem('aquiz-carte-from-simulation')
                    router.push('/simulateur/mode-a?returning=1')
                  }}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all text-[11px] font-medium"
                  title="Retour à la simulation"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Simulation</span>
                </button>

                <div className="w-px h-5 bg-slate-200 hidden sm:block" />
              </>
            )}

            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 rounded-full p-[3px]">
              <button
                onClick={() => setTypeBien('appartement')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-[5px] rounded-full text-[11px] font-semibold transition-all duration-200 ${
                  typeBien === 'appartement'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Appartement</span>
                <span className="sm:hidden">Appart.</span>
              </button>
              <button
                onClick={() => setTypeBien('maison')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-[5px] rounded-full text-[11px] font-semibold transition-all duration-200 ${
                  typeBien === 'maison'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Maison
              </button>
            </div>
          </div>

          {/* Droite: Budget + Filtres */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Budget: éditable si pas de simulation, badge fixe sinon */}
            {fromSimulation ? (
              <div className="relative group">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/80 rounded-full border border-emerald-200/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-700 tabular-nums">{formatMontant(budget)} €</span>
                  <Info className="w-3 h-3 text-emerald-400" />
                </div>
                {/* Tooltip au hover */}
                <div className="absolute top-full right-0 mt-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                  <div className="bg-slate-900 text-white text-[10px] leading-relaxed px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                    <span className="text-emerald-400 font-semibold">Budget issu de votre simulation</span>
                    <br />
                    <span className="text-slate-400">Relancez une simulation pour modifier</span>
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-slate-900 rotate-45" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">Budget</span>
                  <input
                    ref={budgetInputRef}
                    type="text"
                    inputMode="numeric"
                    value={budgetInputValue}
                    onChange={handleBudgetChange}
                    onFocus={handleBudgetFocus}
                    onBlur={handleBudgetBlur}
                    className="w-18 sm:w-24 text-[11px] font-bold text-slate-800 bg-transparent border-none outline-none tabular-nums text-right"
                  />
                  <span className="text-[10px] text-slate-500">€</span>
                </div>
                {/* Hint animé pour indiquer de modifier le budget */}
                <div
                  className={`absolute top-full right-0 mt-1.5 z-50 transition-all duration-300 ${
                    showBudgetHint
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 -translate-y-1 pointer-events-none'
                  }`}
                >
                  <div className="bg-aquiz-black text-white text-[10px] leading-relaxed px-3 py-2 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3 text-aquiz-green shrink-0" />
                    <span><span className="text-aquiz-green font-semibold">Modifiez le budget</span><span className="text-slate-300"> pour adapter la carte</span></span>
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-aquiz-black rotate-45" />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[11px] font-semibold transition-all duration-200
                ${showFilters 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                }
              `}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtres</span>
              {(filtreStatuts.length > 0 || filtreDepartements.length > 0) && (
                <span className="w-4 h-4 rounded-full bg-aquiz-green text-slate-900 text-[10px] flex items-center justify-center font-bold -mr-0.5">
                  {filtreStatuts.length + filtreDepartements.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* CONTENU PRINCIPAL - Carte pleine page       */}
      {/* ============================================ */}
      <main className="flex-1 relative overflow-hidden">
        
        {/* Carte en fond - z-index bas */}
        <div className="absolute inset-0 z-0">
          <CarteInteractive
            zonesCalculees={zonesFiltrees}
            onSelectZone={(zone) => {
              // Ne pas sélectionner les zones sans données DVF
              if (zone && zone.prixM2 > 0) {
                setZoneSelectionnee(zone)
              }
            }}
            zoneSelectionnee={zoneSelectionnee}
            typeBien={typeBien}
            filtreStatuts={filtreStatuts.length > 0 ? filtreStatuts : undefined}
            centreInitial={centreRegion.centre}
            zoomInitial={centreRegion.zoom}
          />
        </div>

        {/* Loading DVF */}
        {dvfLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-aquiz-gray-lighter">
              <Loader2 className="w-4 h-4 text-aquiz-green animate-spin" />
              <span className="text-sm text-aquiz-gray">Chargement des données...</span>
            </div>
          </div>
        )}

        {/* Légende discrète — centrée sur mobile, gauche sur desktop (masquée quand popup ouverte) */}
        <div className={`absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 sm:left-4 sm:translate-x-0 z-20 ${zoneSelectionnee ? 'hidden sm:block' : ''}`}>
          <div className="bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/50 px-2.5 sm:px-3 py-1.5">
            <div className="flex items-center gap-2 sm:gap-3 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-1 ring-emerald-300/50" />
                <span className="text-slate-600 font-medium">Confort <span className="font-bold text-slate-800">{stats.vertes}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-1 ring-amber-300/50" />
                <span className="text-slate-600 font-medium">Accessible <span className="font-bold text-slate-800">{stats.oranges}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400 ring-1 ring-red-300/50" />
                <span className="text-slate-600 font-medium">Limité</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Filtres */}
        {showFilters && (
          <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-auto sm:right-4 z-[40] sm:w-72">
            <div className="bg-white rounded-xl shadow-xl border border-aquiz-gray-lighter overflow-hidden">
              <div className="px-4 py-3 border-b border-aquiz-gray-lighter flex items-center justify-between">
                <span className="font-semibold text-aquiz-black">Filtres</span>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="p-1 text-aquiz-gray hover:text-aquiz-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Statut */}
                <div>
                  <p className="text-xs font-medium text-aquiz-gray mb-2 uppercase tracking-wide">Statut</p>
                  <div className="flex flex-wrap gap-2">
                    {(['vert', 'orange', 'rouge'] as const).map((statut) => {
                      const isActive = filtreStatuts.includes(statut)
                      const colors = {
                        vert: 'bg-aquiz-green',
                        orange: 'bg-aquiz-orange',
                        rouge: 'bg-aquiz-red',
                      }
                      const labels = {
                        vert: 'Confort',
                        orange: 'Accessible',
                        rouge: 'Limité',
                      }
                      return (
                        <button
                          key={statut}
                          onClick={() => {
                            if (isActive) {
                              setFiltreStatuts(filtreStatuts.filter(s => s !== statut))
                            } else {
                              setFiltreStatuts([...filtreStatuts, statut])
                            }
                          }}
                          className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                            ${isActive 
                              ? 'bg-aquiz-black text-white' 
                              : 'bg-aquiz-gray-lightest text-aquiz-gray hover:bg-aquiz-gray-lighter'
                            }
                          `}
                        >
                          <div className={`w-2 h-2 rounded-full ${colors[statut]}`} />
                          {labels[statut]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Départements */}
                <div>
                  <p className="text-xs font-medium text-aquiz-gray mb-2 uppercase tracking-wide">Départements</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {departementsDisponibles.map((code) => {
                      const isActive = filtreDepartements.includes(code)
                      return (
                        <button
                          key={code}
                          onClick={() => {
                            if (isActive) {
                              setFiltreDepartements(filtreDepartements.filter(d => d !== code))
                            } else {
                              setFiltreDepartements([...filtreDepartements, code])
                            }
                          }}
                          className={`
                            w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                            ${isActive 
                              ? 'bg-aquiz-black text-white' 
                              : 'hover:bg-aquiz-gray-lightest text-aquiz-black'
                            }
                          `}
                        >
                          <span>{getDeptLabel(code)}</span>
                          <span className={isActive ? 'text-white/60' : 'text-aquiz-gray'}>{code}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Reset */}
                {(filtreStatuts.length > 0 || filtreDepartements.length > 0) && (
                  <button
                    onClick={() => {
                      setFiltreStatuts([])
                      setFiltreDepartements([])
                    }}
                    className="w-full py-2 text-sm text-aquiz-gray hover:text-aquiz-black transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Zone sélectionnée - Slide panel */}
        {zoneSelectionnee && (
          <div className="absolute bottom-0 left-0 right-0 z-50 sm:left-auto sm:right-4 sm:bottom-4 sm:w-104">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-aquiz-gray-lighter overflow-y-auto max-h-[75vh] animate-in slide-in-from-bottom duration-300">
              
              {/* Header zone */}
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-aquiz-gray-lighter">
                <h2 className="sr-only">Détail de la zone sélectionnée</h2>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
                      style={{ 
                        backgroundColor: zoneSelectionnee.statut === 'vert' ? '#22c55e15' : 
                                        zoneSelectionnee.statut === 'orange' ? '#f59e0b15' : '#ef444415'
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ 
                          backgroundColor: zoneSelectionnee.statut === 'vert' ? '#22c55e' : 
                                          zoneSelectionnee.statut === 'orange' ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-aquiz-black">{zoneSelectionnee.nom}</h3>
                      <p className="text-xs sm:text-sm text-aquiz-gray">
                        {zoneSelectionnee.departement} • Zone PTZ {getZonePTZ(zoneSelectionnee.codePostal)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setZoneSelectionnee(null)}
                    className="p-1.5 text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="px-4 py-3 sm:px-5 sm:py-4">
                {zoneSelectionnee.prixM2 > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="text-center bg-aquiz-gray-lightest rounded-xl py-2 sm:py-3">
                      <p className="text-xl sm:text-2xl font-bold text-aquiz-black">{zoneSelectionnee.surfaceMax}</p>
                      <p className="text-[10px] sm:text-xs text-aquiz-gray">m² max</p>
                    </div>
                    <div className="text-center bg-aquiz-gray-lightest rounded-xl py-2 sm:py-3">
                      <p className="text-lg sm:text-xl font-bold text-aquiz-black">{formatMontant(zoneSelectionnee.prixM2)}</p>
                      <p className="text-[10px] sm:text-xs text-aquiz-gray">€/m² médian</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center bg-aquiz-gray-lightest rounded-xl py-4">
                    <p className="text-sm text-aquiz-gray">Données insuffisantes</p>
                    <p className="text-xs text-aquiz-gray/70 mt-1">Aucune vente enregistrée en 2024</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 pb-3 sm:px-5 sm:pb-5 flex gap-2.5 sm:gap-3">
                <Button
                  className="flex-1 h-9 sm:h-11 text-sm sm:text-base bg-aquiz-green hover:bg-aquiz-green/90 text-aquiz-black font-semibold"
                  onClick={() => {
                    saveZoneToStore({
                      codeInsee: zoneSelectionnee.codeInsee,
                      codePostal: zoneSelectionnee.codePostal,
                      nomCommune: zoneSelectionnee.nom,
                      codeDepartement: zoneSelectionnee.codeDepartement,
                      departement: zoneSelectionnee.departement,
                      zonePTZ: getZonePTZ(zoneSelectionnee.codePostal),
                      prixM2: zoneSelectionnee.prixM2,
                      surfaceAccessible: zoneSelectionnee.surfaceMax,
                    })
                    router.push('/aides?from=carte')
                  }}
                >
                  Simuler mes aides
                </Button>
                <Button
                  variant="outline"
                  className="h-9 sm:h-11 text-sm sm:text-base border-aquiz-gray-lighter"
                  onClick={() => setZoneSelectionnee(null)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function CartePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CartePageContent />
    </Suspense>
  )
}
