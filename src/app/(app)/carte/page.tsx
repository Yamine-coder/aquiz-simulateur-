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
    Building2,
    Filter,
    Home,
    Loader2,
    X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

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

export default function CartePage() {
  const router = useRouter()
  const isHydrated = useHydration()
  const { resultats, parametresModeA, setZoneSelectionnee: saveZoneToStore } = useSimulateurStore()
  
  // États
  const [typeBien, setTypeBien] = useState<TypeBienCarte>('appartement')
  const [filtreStatuts, setFiltreStatuts] = useState<StatutZone[]>([])
  const [filtreDepartements, setFiltreDepartements] = useState<string[]>([])
  const [zoneSelectionnee, setZoneSelectionnee] = useState<ZoneCalculee | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // DVF Data
  const departementsIDF = ['75', '77', '78', '91', '92', '93', '94', '95']
  const { zones: zonesReelles, isLoading: dvfLoading } = useDVFData(departementsIDF)

  // Effacer la sélection si la zone n'a plus de données valides
  useEffect(() => {
    if (zoneSelectionnee && zoneSelectionnee.prixM2 === 0) {
      setZoneSelectionnee(null)
    }
  }, [zoneSelectionnee, typeBien])

  // CSS Leaflet
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
    link.crossOrigin = ''
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  // Budget utilisateur
  const budget = useMemo(() => {
    if (!isHydrated) return 300000
    return resultats?.prixAchatMax || 300000
  }, [isHydrated, resultats])

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
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] flex flex-col bg-white overflow-hidden">
      
      {/* ============================================ */}
      {/* BARRE CONTEXTUELLE (Budget + Filtres)       */}
      {/* ============================================ */}
      <div className="shrink-0 bg-white border-b border-aquiz-gray-lighter relative z-[1002]">
        <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center justify-between">
          
          {/* Gauche: Titre */}
          <h1 className="text-sm font-semibold text-aquiz-black">
            Carte des opportunités
          </h1>

          {/* Droite: Budget + Filtres */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-aquiz-gray">
              <span>Budget</span>
              <span className="font-semibold text-aquiz-black">{formatMontant(budget)} €</span>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${showFilters 
                  ? 'bg-aquiz-black text-white' 
                  : 'bg-aquiz-gray-lightest text-aquiz-black hover:bg-aquiz-gray-lighter'
                }
              `}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtres</span>
              {(filtreStatuts.length > 0 || filtreDepartements.length > 0) && (
                <span className="w-5 h-5 rounded-full bg-aquiz-green text-aquiz-black text-xs flex items-center justify-center font-bold">
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
      <main className="flex-1 relative">
        
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

        {/* Légende discrète */}
        <div className="absolute bottom-4 left-4 z-[1000]">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-aquiz-gray-lighter p-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-aquiz-green" />
                <span className="text-aquiz-gray">Confort</span>
                <span className="text-aquiz-black font-medium">{stats.vertes}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-aquiz-orange" />
                <span className="text-aquiz-gray">Accessible</span>
                <span className="text-aquiz-black font-medium">{stats.oranges}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-aquiz-red" />
                <span className="text-aquiz-gray">Limité</span>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle type bien */}
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="bg-white rounded-lg shadow-lg border border-aquiz-gray-lighter p-1 flex">
            <button
              onClick={() => setTypeBien('appartement')}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${typeBien === 'appartement' 
                  ? 'bg-aquiz-black text-white' 
                  : 'text-aquiz-gray hover:text-aquiz-black'
                }
              `}
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Appartement</span>
            </button>
            <button
              onClick={() => setTypeBien('maison')}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${typeBien === 'maison' 
                  ? 'bg-aquiz-black text-white' 
                  : 'text-aquiz-gray hover:text-aquiz-black'
                }
              `}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Maison</span>
            </button>
          </div>
        </div>

        {/* Panel Filtres */}
        {showFilters && (
          <div className="absolute top-4 right-4 z-[1001] w-72">
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
          <div className="absolute bottom-0 left-0 right-0 z-[1001] sm:left-auto sm:right-4 sm:bottom-4 sm:w-96">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-aquiz-gray-lighter overflow-hidden animate-in slide-in-from-bottom duration-300">
              
              {/* Header zone */}
              <div className="px-5 py-4 border-b border-aquiz-gray-lighter">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
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
                      <h3 className="font-semibold text-aquiz-black">{zoneSelectionnee.nom}</h3>
                      <p className="text-sm text-aquiz-gray">
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
              <div className="px-5 py-4">
                {zoneSelectionnee.prixM2 > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center bg-aquiz-gray-lightest rounded-xl py-3">
                      <p className="text-2xl font-bold text-aquiz-black">{zoneSelectionnee.surfaceMax}</p>
                      <p className="text-xs text-aquiz-gray">m² max</p>
                    </div>
                    <div className="text-center bg-aquiz-gray-lightest rounded-xl py-3">
                      <p className="text-xl font-bold text-aquiz-black">{formatMontant(zoneSelectionnee.prixM2)}</p>
                      <p className="text-xs text-aquiz-gray">€/m² médian</p>
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
              <div className="px-5 pb-5 flex gap-3">
                <Button
                  className="flex-1 h-11 bg-aquiz-green hover:bg-aquiz-green/90 text-aquiz-black font-semibold"
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
                    router.push('/aides')
                  }}
                >
                  Simuler mes aides
                </Button>
                <Button
                  variant="outline"
                  className="h-11 border-aquiz-gray-lighter"
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
