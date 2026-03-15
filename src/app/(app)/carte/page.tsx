'use client'

/**
 * Page Carte Interactive Pro — Où puis-je acheter ?
 * Moteur WebGL MapLibre GL · Heatmap · Clusters · Recherche · Dark/Light
 */

import { Button } from '@/components/ui/button'
import { CENTRES_REGIONS, ZONES_ILE_DE_FRANCE } from '@/data/prix-m2-idf'
import { useDVFData } from '@/hooks/useDVFData'
import { trackEvent } from '@/lib/analytics'
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
    ChevronLeft,
    Filter,
    Flame,
    Home,
    Info,
    Lightbulb,
    Loader2,
    Ruler,
    Search,
    TrendingDown,
    TrendingUp,
    X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Import dynamique de la carte MapLibre (WebGL, pas de SSR)
const CarteMapLibre = dynamic(
  () => import('@/components/carte/CarteMapLibre'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-slate-200 rounded-full" />
            <div className="absolute inset-0 w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-slate-500 font-medium">Initialisation WebGL...</p>
        </div>
      </div>
    ),
  },
)

const SearchAdresse = dynamic(
  () => import('@/components/carte/SearchAdresse'),
  { ssr: false },
)

function CartePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isHydrated = useHydration()
  const { resultats, setZoneSelectionnee: saveZoneToStore } = useSimulateurStore()

  // ─── Navigation context ──────────────────────────────────
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

  // ─── States ──────────────────────────────────────────────
  const [typeBien, setTypeBien] = useState<TypeBienCarte>('appartement')
  const [filtreStatuts, setFiltreStatuts] = useState<StatutZone[]>([])
  const [filtreDepartements, setFiltreDepartements] = useState<string[]>([])
  const [zoneSelectionnee, setZoneSelectionnee] = useState<ZoneCalculee | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [customBudget, setCustomBudget] = useState<number>(300000)
  const [showBudgetHint, setShowBudgetHint] = useState(false)

  // ─── Pro features ────────────────────────────────────────
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

  // ─── Budget input ────────────────────────────────────────
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
    requestAnimationFrame(() => budgetInputRef.current?.select())
  }, [customBudget])

  const handleBudgetBlur = useCallback(() => {
    setBudgetInputValue(formatMontant(customBudget))
  }, [customBudget])

  useEffect(() => {
    if (!fromSimulation && isHydrated) {
      const show = setTimeout(() => setShowBudgetHint(true), 800)
      const hide = setTimeout(() => setShowBudgetHint(false), 6000)
      return () => { clearTimeout(show); clearTimeout(hide) }
    }
  }, [fromSimulation, isHydrated])

  // ─── DVF Data ────────────────────────────────────────────
  const departementsIDF = ['75', '77', '78', '91', '92', '93', '94', '95']
  const { zones: zonesReelles, isLoading: dvfLoading } = useDVFData(departementsIDF)

  useEffect(() => {
    if (zoneSelectionnee && zoneSelectionnee.prixM2 === 0) setZoneSelectionnee(null)
  }, [zoneSelectionnee, typeBien])

  // ─── Budget ──────────────────────────────────────────────
  const budget = useMemo(() => {
    if (!isHydrated) return 300000
    if (fromSimulation && resultats?.prixAchatMax) return resultats.prixAchatMax
    return customBudget
  }, [isHydrated, fromSimulation, resultats, customBudget])

  const centreRegion = CENTRES_REGIONS['ile-de-france']

  // ─── Zone computation ────────────────────────────────────
  const zonesSource = useMemo(() => {
    const source = zonesReelles.length > 0 ? zonesReelles : ZONES_ILE_DE_FRANCE
    return source.filter(z => {
      const prixM2 = typeBien === 'appartement' ? z.prixM2Appartement : z.prixM2Maison
      if (prixM2 <= 0) return false
      if (z.nom === z.departement || !z.nom || z.nom.length < 2) return false
      return true
    })
  }, [zonesReelles, typeBien])

  const zonesCalculees = useMemo(() =>
    calculerToutesZones(zonesSource, budget, typeBien),
  [zonesSource, budget, typeBien])

  const zonesFiltrees = useMemo(() => {
    let zones = [...zonesCalculees]
    if (filtreStatuts.length > 0) zones = zones.filter(z => filtreStatuts.includes(z.statut))
    if (filtreDepartements.length > 0) zones = filtrerParDepartement(zones, filtreDepartements)
    return zones
  }, [zonesCalculees, filtreStatuts, filtreDepartements])

  // ─── Stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const vertes = zonesFiltrees.filter(z => z.statut === 'vert').length
    const oranges = zonesFiltrees.filter(z => z.statut === 'orange').length
    const rouges = zonesFiltrees.filter(z => z.statut === 'rouge').length
    return { vertes, oranges, rouges, total: zonesFiltrees.length }
  }, [zonesFiltrees])

  // Stats de prix pour le panneau de détail
  const deptStats = useMemo(() => {
    if (!zoneSelectionnee) return null
    const deptZones = zonesCalculees.filter(z => z.codeDepartement === zoneSelectionnee.codeDepartement)
    if (deptZones.length === 0) return null
    const prices = deptZones.map(z => z.prixM2).sort((a, b) => a - b)
    return {
      min: prices[0],
      max: prices[prices.length - 1],
      median: prices[Math.floor(prices.length / 2)],
      count: deptZones.length,
    }
  }, [zoneSelectionnee, zonesCalculees])

  const departementsDisponibles = useMemo(() => {
    const depts = new Set(ZONES_ILE_DE_FRANCE.map(z => z.codeDepartement))
    return Array.from(depts).sort()
  }, [])

  const getDeptLabel = (code: string) => {
    const labels: Record<string, string> = {
      '75': 'Paris', '77': 'Seine-et-Marne', '78': 'Yvelines',
      '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis',
      '94': 'Val-de-Marne', '95': "Val-d'Oise",
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

      {/* ════════════════════════════════════════════ */}
      {/* BARRE D'OUTILS PRO                         */}
      {/* ════════════════════════════════════════════ */}
      <div className="shrink-0 border-b relative z-40 bg-white border-slate-200/80">
        <div className="px-2 sm:px-4 h-12 flex items-center justify-between gap-1 sm:gap-2">

          {/* Gauche: Retour + Type + Recherche */}
          <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
            {fromSimulation ? (
              <button
                onClick={() => {
                  sessionStorage.removeItem('aquiz-carte-from-simulation')
                  router.push('/simulateur/mode-a?returning=1')
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-full text-[11px] font-medium transition-all text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Simulation</span>
              </button>
            ) : (
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1 px-2 py-1.5 rounded-full text-[11px] font-medium transition-all text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Retour</span>
              </button>
            )}

            {/* Type toggle */}
            <div className="flex items-center gap-0.5 rounded-full p-0.75 bg-slate-100">
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

            {/* Search — desktop inline, mobile toggle */}
            <div className="hidden md:block flex-1 max-w-xs">
              <SearchAdresse
                onSelect={(result) => {
                  setFlyToCoords({ lat: result.lat, lng: result.lng, zoom: result.zoom })
                }}
                placeholder="Rechercher une ville..."
              />
            </div>
            <button
              onClick={() => { setShowSearch(!showSearch); if (!showSearch) setShowFilters(false) }}
              className={`md:hidden p-1.5 rounded-full transition-colors ${
                showSearch
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Droite: Budget + Contrôles Pro + Filtres */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Budget */}
            {fromSimulation ? (
              <div className="relative group">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/80 rounded-full border border-emerald-200/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-700 tabular-nums">{formatMontant(budget)} €</span>
                  <Info className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="absolute top-full right-0 mt-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                  <div className="bg-slate-900 text-white text-[10px] leading-relaxed px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                    <span className="text-emerald-400 font-semibold">Budget issu de votre simulation</span>
                    <br /><span className="text-slate-400">Relancez une simulation pour modifier</span>
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-slate-900 rotate-45" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200">
                  <span className="text-[10px] font-medium hidden sm:inline text-slate-500">Budget</span>
                  <input
                    ref={budgetInputRef}
                    type="text"
                    inputMode="numeric"
                    value={budgetInputValue}
                    onChange={handleBudgetChange}
                    onFocus={handleBudgetFocus}
                    onBlur={handleBudgetBlur}
                    className="w-18 sm:w-24 text-[11px] font-bold bg-transparent border-none outline-none tabular-nums text-right text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500">€</span>
                </div>
                <div className={`absolute top-full right-0 mt-1.5 z-50 transition-all duration-300 ${
                  showBudgetHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
                }`}>
                  <div className="bg-aquiz-black text-white text-[10px] leading-relaxed px-3 py-2 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3 text-aquiz-green shrink-0" />
                    <span><span className="text-aquiz-green font-semibold">Modifiez le budget</span><span className="text-slate-300"> pour adapter la carte</span></span>
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-aquiz-black rotate-45" />
                  </div>
                </div>
              </div>
            )}

            {/* Heatmap toggle */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              title={showHeatmap ? 'Masquer la heatmap' : 'Afficher la heatmap'}
              className={`p-[6px] rounded-full text-[11px] transition-all duration-200 ${
                showHeatmap
                  ? 'bg-orange-500/15 text-orange-500'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
            </button>

            {/* Filtres */}
            <button
              onClick={() => { setShowFilters(!showFilters); if (!showFilters) setShowSearch(false) }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-[5px] rounded-full text-[11px] font-semibold transition-all duration-200 ${
                showFilters
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
              }`}
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

        {/* Search mobile — expandable */}
        {showSearch && (
          <div className="md:hidden px-3 pb-2.5">
            <SearchAdresse
              onSelect={(result) => {
                setFlyToCoords({ lat: result.lat, lng: result.lng, zoom: result.zoom })
                setShowSearch(false)
              }}
              placeholder="Rechercher une ville, une adresse..."
            />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* CONTENU PRINCIPAL — Carte WebGL plein écran */}
      {/* ════════════════════════════════════════════ */}
      <main className="flex-1 relative overflow-hidden">
        
        {/* Carte MapLibre GL (WebGL) */}
        <div className="absolute inset-0 z-0">
          <CarteMapLibre
            zonesCalculees={zonesFiltrees}
            onSelectZone={(zone) => {
              if (zone && zone.prixM2 > 0) {
                setZoneSelectionnee(zone)
                trackEvent('carte-view', { commune: zone.nom, prixM2: Math.round(zone.prixM2), departement: zone.departement })
              }
            }}
            zoneSelectionnee={zoneSelectionnee}
            centreInitial={centreRegion.centre}
            zoomInitial={centreRegion.zoom}
            showHeatmap={showHeatmap}
            flyToCoords={flyToCoords}
          />
        </div>

        {/* Loading DVF */}
        {dvfLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-1000">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border bg-white border-slate-200">
              <Loader2 className="w-4 h-4 text-aquiz-green animate-spin" />
              <span className="text-sm text-slate-600">
                Chargement DVF...
              </span>
            </div>
          </div>
        )}

        {/* ─── Légende interactive ─── */}
        <div className={`absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 sm:left-4 sm:translate-x-0 z-20 transition-opacity ${
          zoneSelectionnee ? 'hidden sm:block' : ''
        }`}>
          <div className="rounded-2xl shadow-lg border px-3 sm:px-4 py-2 bg-white/95 backdrop-blur-md border-white/50">
            <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                <span className="text-slate-600">
                  Confort <span className="font-bold text-slate-800">{stats.vertes}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-400 ring-2 ring-amber-400/20" />
                <span className="text-slate-600">
                  Accessible <span className="font-bold text-slate-800">{stats.oranges}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400 ring-2 ring-red-400/20" />
                <span className="text-slate-600">
                  Limité <span className="font-bold text-slate-800">{stats.rouges}</span>
                </span>
              </div>
              {showHeatmap && (
                <div className="hidden sm:flex items-center gap-1.5 border-l pl-3 border-slate-200">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="text-slate-400">Heatmap active</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zone count badge */}
        <div className={`absolute top-3 left-3 z-20 ${showFilters ? 'hidden' : ''}`}>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-lg border bg-white/95 backdrop-blur border-white/50 text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-bold text-slate-800">{stats.total}</span> zones · {typeBien === 'appartement' ? 'Appart.' : 'Maisons'} · WebGL
          </div>
        </div>

        {/* ─── Panel Filtres ─── */}
        {showFilters && (
          <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-auto sm:right-14 z-40 sm:w-72">
            <div className="rounded-xl shadow-xl border overflow-hidden bg-white border-slate-200">
              <div className="px-4 py-3 border-b flex items-center justify-between border-slate-200">
                <span className="font-semibold text-slate-900">Filtres</span>
                <button onClick={() => setShowFilters(false)} className="p-1 transition-colors text-slate-400 hover:text-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* Statut */}
                <div>
                  <p className="text-xs font-medium mb-2 uppercase tracking-wide text-slate-400">Accessibilité</p>
                  <div className="flex flex-wrap gap-2">
                    {(['vert', 'orange', 'rouge'] as const).map((statut) => {
                      const isActive = filtreStatuts.includes(statut)
                      const colors = { vert: 'bg-emerald-400', orange: 'bg-amber-400', rouge: 'bg-red-400' }
                      const labels = { vert: 'Confort', orange: 'Accessible', rouge: 'Limité' }
                      return (
                        <button
                          key={statut}
                          onClick={() => {
                            if (isActive) setFiltreStatuts(filtreStatuts.filter(s => s !== statut))
                            else setFiltreStatuts([...filtreStatuts, statut])
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
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
                  <p className="text-xs font-medium mb-2 uppercase tracking-wide text-slate-400">Départements</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {departementsDisponibles.map((code) => {
                      const isActive = filtreDepartements.includes(code)
                      return (
                        <button
                          key={code}
                          onClick={() => {
                            if (isActive) setFiltreDepartements(filtreDepartements.filter(d => d !== code))
                            else setFiltreDepartements([...filtreDepartements, code])
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <span>{getDeptLabel(code)}</span>
                          <span className={isActive ? 'text-white/60' : 'text-slate-400'}>{code}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {(filtreStatuts.length > 0 || filtreDepartements.length > 0) && (
                  <button
                    onClick={() => { setFiltreStatuts([]); setFiltreDepartements([]) }}
                    className="w-full py-2 text-sm transition-colors text-slate-400 hover:text-slate-800"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Panneau de détail ─── */}
        {zoneSelectionnee && (() => {
          const statutColor = zoneSelectionnee.statut === 'vert' ? '#22c55e' : zoneSelectionnee.statut === 'orange' ? '#f59e0b' : '#ef4444'
          const statutLabel = zoneSelectionnee.statut === 'vert' ? 'Accessible' : zoneSelectionnee.statut === 'orange' ? 'Tendu' : 'Hors budget'
          const statutTextClass = zoneSelectionnee.statut === 'vert' ? 'text-emerald-700' : zoneSelectionnee.statut === 'orange' ? 'text-amber-700' : 'text-red-700'
          const statutBadgeBg = zoneSelectionnee.statut === 'vert' ? 'bg-emerald-50' : zoneSelectionnee.statut === 'orange' ? 'bg-amber-50' : 'bg-red-50'

          return (
          <div className="absolute bottom-2 left-2 right-2 z-40 sm:left-auto sm:right-3 sm:bottom-3 sm:w-[380px] sm:max-h-[calc(100%-60px)]">
            <div className="rounded-xl shadow-xl border border-slate-200 overflow-y-auto max-h-[60vh] sm:max-h-[75vh] bg-white">
              
              {/* Header */}
              <div className="px-4 pt-3.5 pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: statutColor, boxShadow: `0 0 0 2px ${statutColor}30, 0 0 0 3px white` }}
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate leading-tight">
                        {zoneSelectionnee.nom}
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        {zoneSelectionnee.departement} · PTZ {getZonePTZ(zoneSelectionnee.codePostal)} · {zoneSelectionnee.codePostal}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statutBadgeBg} ${statutTextClass}`}>
                      {statutLabel}
                    </span>
                    <button
                      onClick={() => setZoneSelectionnee(null)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Contenu */}
              <div className="px-4 py-3 space-y-2.5">
                {zoneSelectionnee.prixM2 > 0 ? (
                  <>
                    {/* Chiffres clés */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="text-center rounded-lg py-2 bg-slate-50">
                        <p className="text-lg font-bold text-slate-900 leading-none">
                          {zoneSelectionnee.surfaceMax}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">m² max</p>
                      </div>
                      <div className="text-center rounded-lg py-2 bg-slate-50">
                        <p className="text-base font-bold text-slate-900 leading-none">
                          {formatMontant(zoneSelectionnee.prixM2)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">€/m²</p>
                      </div>
                      <div className="text-center rounded-lg py-2 bg-slate-50">
                        <p className="text-base font-bold text-slate-900 leading-none">
                          {formatMontant(budget)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">budget €</p>
                      </div>
                    </div>

                    {/* Type de logement */}
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50">
                      <Ruler className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {zoneSelectionnee.commentaireLogement}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {zoneSelectionnee.surfaceMin}–{zoneSelectionnee.surfaceMax} m² accessibles
                        </p>
                      </div>
                    </div>

                    {/* Comparaison départementale */}
                    {deptStats && (
                      <div className="rounded-lg border border-slate-100 p-3 space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          vs {zoneSelectionnee.departement} ({deptStats.count} communes)
                        </p>
                        <div className="space-y-1">
                          <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400">
                            <div
                              className="absolute top-1/2 w-2.5 h-2.5 bg-white rounded-full shadow ring-2 ring-slate-700"
                              style={{
                                left: `${Math.min(Math.max(((zoneSelectionnee.prixM2 - deptStats.min) / (deptStats.max - deptStats.min)) * 100, 2), 98)}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] font-medium">
                            <span className="text-emerald-600">{formatMontant(deptStats.min)} €/m²</span>
                            <span className="text-slate-400">médian {formatMontant(deptStats.median)}</span>
                            <span className="text-red-500">{formatMontant(deptStats.max)} €/m²</span>
                          </div>
                        </div>

                        {zoneSelectionnee.evolutionPrix1an !== undefined && zoneSelectionnee.evolutionPrix1an !== 0 && (
                          <div className="flex items-center gap-1.5">
                            {zoneSelectionnee.evolutionPrix1an < 0 ? (
                              <TrendingDown className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <TrendingUp className="w-3 h-3 text-red-500" />
                            )}
                            <span className={`text-[10px] font-semibold ${
                              zoneSelectionnee.evolutionPrix1an < 0 ? 'text-emerald-600' : 'text-red-500'
                            }`}>
                              {zoneSelectionnee.evolutionPrix1an > 0 ? '+' : ''}{zoneSelectionnee.evolutionPrix1an.toFixed(1)}% sur 1 an
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center rounded-lg py-4 bg-slate-50">
                    <p className="text-sm text-slate-500">Données insuffisantes</p>
                    <p className="text-xs mt-1 text-slate-400">Aucune vente enregistrée récemment</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 pb-3 pt-0.5 flex gap-2">
                <Button
                  className="flex-1 h-9 text-sm bg-aquiz-green hover:bg-aquiz-green/90 text-aquiz-black font-semibold"
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
                  className="h-9 px-4 text-sm border-slate-200 hover:bg-slate-50"
                  onClick={() => setZoneSelectionnee(null)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
          )
        })()}
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
