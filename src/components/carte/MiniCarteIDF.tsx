'use client'

/**
 * Mini carte IDF réaliste avec Leaflet
 * Charge les vrais contours GeoJSON officiels des départements (source: France-GeoJSON)
 */

import { formatMontant } from '@/lib/utils/formatters'
import { useEffect, useMemo, useRef, useState } from 'react'

interface DepartementData {
  codeDept: string
  nom: string
  prixM2: number
  surface: number
  nbOpportunites?: number
}

interface MiniCarteIDFProps {
  departements: DepartementData[]
  className?: string
}

// Mapping code département -> nom
const DEPT_NAMES: Record<string, string> = {
  '75': 'Paris',
  '77': 'Seine-et-Marne',
  '78': 'Yvelines',
  '91': 'Essonne',
  '92': 'Hauts-de-Seine',
  '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne',
  '95': "Val-d'Oise"
}

// Couleur selon prix au m² (palette avec vert pour les prix bas)
function getPriceColor(prixM2: number): string {
  if (prixM2 >= 12000) return '#7d1d1d'  // Rouge très foncé
  if (prixM2 >= 10500) return '#b91c1c'  // Rouge foncé
  if (prixM2 >= 9000) return '#dc2626'   // Rouge
  if (prixM2 >= 7500) return '#f97316'   // Orange foncé
  if (prixM2 >= 6000) return '#fb923c'   // Orange
  if (prixM2 >= 4500) return '#fcd34d'   // Jaune
  if (prixM2 >= 3500) return '#fef08a'   // Jaune clair
  if (prixM2 >= 3000) return '#fef9c3'   // Jaune très clair
  if (prixM2 >= 2500) return '#bbf7d0'   // Vert clair
  return '#86efac'                        // Vert
}

// Couleur selon surface accessible (ce qui intéresse l'utilisateur)
// 3 niveaux : vert (≥40m²), orange (25-40m²), rouge (<25m²)
function getSurfaceColor(surface: number): string {
  if (surface >= 40) return '#10b981'    // Vert - T2/T3+ confortable
  if (surface >= 25) return '#f59e0b'    // Orange - Studio/T1
  return '#ef4444'                        // Rouge - Difficile (<25m²)
}

// Couleur de bordure selon surface
function getSurfaceBorderColor(surface: number): string {
  if (surface >= 40) return '#047857'    // Vert foncé
  if (surface >= 25) return '#b45309'    // Orange foncé
  return '#b91c1c'                        // Rouge foncé
}

export default function MiniCarteIDF({ departements, className = '' }: MiniCarteIDFProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [map, setMap] = useState<L.Map | null>(null)
  const [hoveredDept, setHoveredDept] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null)
  const layersRef = useRef<Map<string, L.Layer>>(new Map())

  // Map des données par code département
  const dataByCode = useMemo(() => {
    const m = new Map<string, DepartementData>()
    departements.forEach(d => m.set(d.codeDept, d))
    return m
  }, [departements])

  const hoveredData = hoveredDept ? dataByCode.get(hoveredDept) : null

  // Monter le composant côté client
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Charger le fichier GeoJSON officiel
  useEffect(() => {
    if (!isMounted) return

    fetch('/geojson/idf-departements.geojson')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Erreur chargement GeoJSON:', err))
  }, [isMounted])

  // Initialiser la carte Leaflet
  useEffect(() => {
    if (!isMounted || !mapRef.current || !geoData) return
    // Ne pas réinitialiser si déjà fait
    if (mapInstanceRef.current) return

    let cancelled = false

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default
        // @ts-ignore - CSS import for Leaflet
        await import('leaflet/dist/leaflet.css')

        if (cancelled || !mapRef.current) return

        const leafletMap = L.map(mapRef.current, {
          center: [48.8566, 2.3522],
          zoom: 9,
          zoomControl: false,
          scrollWheelZoom: false,
          dragging: true,
          doubleClickZoom: false,
          attributionControl: false,
        })

        // Fond de carte CartoDB style clair
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(leafletMap)

        if (cancelled) {
          leafletMap.remove()
          return
        }

        mapInstanceRef.current = leafletMap
        setMap(leafletMap)
        setIsLoaded(true)
      } catch (error) {
        console.error('Erreur initialisation carte:', error)
        setIsLoaded(true) // Marquer comme chargé même en cas d'erreur pour éviter boucle
      }
    }

    // Petit délai pour s'assurer que le DOM est prêt
    const timer = setTimeout(initMap, 100)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isMounted, geoData])

  // Ajouter les vrais contours GeoJSON quand tout est prêt
  useEffect(() => {
    if (!map || !isLoaded || !geoData) return

    const addLayers = async () => {
      const L = (await import('leaflet')).default

      // Supprimer les anciennes couches
      layersRef.current.forEach(layer => map.removeLayer(layer))
      layersRef.current.clear()

      // Créer une couche GeoJSON avec les vrais contours officiels
      const geoJsonLayer = L.geoJSON(geoData, {
        style: (feature) => {
          const code = feature?.properties?.code
          const data = dataByCode.get(code)
          const surface = data?.surface || 0

          return {
            fillColor: getSurfaceColor(surface),
            fillOpacity: 0.6,
            color: getSurfaceBorderColor(surface),
            weight: 2,
            opacity: 1,
          }
        },
        onEachFeature: (feature, layer) => {
          const code = feature.properties?.code
          const nom = feature.properties?.nom || DEPT_NAMES[code] || code
          const data = dataByCode.get(code)
          const prixM2 = data?.prixM2 || 0
          const surface = data?.surface || 0

          // Tooltip au survol avec surface accessible - icônes SVG
          const surfaceColor = surface >= 40 ? '#10b981' : surface >= 25 ? '#f59e0b' : '#ef4444'
          // Icônes SVG inline (Home, Building, Box)
          const homeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${surfaceColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
          const buildingIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${surfaceColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`
          const boxIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${surfaceColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`
          const surfaceIcon = surface >= 40 ? homeIcon : surface >= 25 ? buildingIcon : boxIcon
          
          layer.bindTooltip(`
            <div style="text-align:center;font-weight:700;font-size:13px;color:#1e293b;">
              ${nom}
            </div>
            <div style="text-align:center;font-size:11px;color:#64748b;margin-top:2px;">
              ${formatMontant(prixM2)} €/m²
            </div>
            <div style="display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;margin-top:6px;padding-top:6px;border-top:1px solid #e2e8f0;color:${surfaceColor}">
              ${surfaceIcon} ${surface} m² accessibles
            </div>
          `, {
            permanent: false,
            direction: 'top',
            className: 'dept-tooltip-custom',
            offset: [0, -10]
          })

          layer.on('mouseover', () => {
            setHoveredDept(code)
            // Bordure plus foncée au hover
            const hoverBorderColor = surface >= 40 ? '#065f46' : surface >= 25 ? '#78350f' : '#7f1d1d'
            ;(layer as L.Path).setStyle({
              weight: 3,
              color: hoverBorderColor,
              fillOpacity: 0.8,
            })
            ;(layer as L.Path).bringToFront()
          })

          layer.on('mouseout', () => {
            setHoveredDept(null)
            ;(layer as L.Path).setStyle({
              weight: 2,
              color: getSurfaceBorderColor(surface),
              fillOpacity: 0.6,
            })
          })

          layersRef.current.set(code, layer)
        }
      }).addTo(map)

      // Ajuster la vue sur les vrais bounds du GeoJSON
      map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] })
    }

    addLayers()
  }, [map, isLoaded, geoData, dataByCode])

  // Placeholder de chargement
  if (!isMounted || !geoData) {
    return (
      <div className={`w-full h-[400px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden ${className}`}>
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <span className="text-sm text-slate-500">Chargement de la carte...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Carte Leaflet */}
      <div 
        ref={mapRef} 
        className="w-full h-[400px] rounded-xl overflow-hidden"
        style={{ background: '#f8fafc' }}
      />

      {/* Indicateur de chargement pendant init Leaflet */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-50 rounded-xl flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-500">Initialisation...</span>
          </div>
        </div>
      )}

      {/* Panel info au survol - enrichi */}
      {hoveredData && (
        <div className="absolute top-3 right-3 bg-white rounded-xl shadow-xl border border-slate-200 p-4 min-w-[220px] z-[1000]">
          <div className="border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                hoveredData.surface >= 40 ? 'bg-emerald-500' :
                hoveredData.surface >= 25 ? 'bg-amber-500' : 'bg-rose-500'
              }`}>{hoveredData.codeDept}</div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{hoveredData.nom}</h3>
                <p className="text-[10px] text-slate-400">Données DVF 2025</p>
              </div>
            </div>
          </div>
          
          {/* Surface accessible - mis en avant */}
          <div className={`rounded-lg p-3 mb-3 ${
            hoveredData.surface >= 40 ? 'bg-emerald-50 border border-emerald-200' :
            hoveredData.surface >= 25 ? 'bg-amber-50 border border-amber-200' : 'bg-rose-50 border border-rose-200'
          }`}>
            <p className="text-[10px] text-slate-500 mb-1">Surface accessible</p>
            <p className={`text-2xl font-black ${
              hoveredData.surface >= 40 ? 'text-emerald-600' :
              hoveredData.surface >= 25 ? 'text-amber-600' : 'text-rose-600'
            }`}>{hoveredData.surface} m²</p>
            <p className={`text-[10px] mt-1 ${
              hoveredData.surface >= 40 ? 'text-emerald-600' :
              hoveredData.surface >= 25 ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {hoveredData.surface >= 40 ? '✓ T2/T3+ confortable' :
               hoveredData.surface >= 25 ? '→ Studio/T1' : '⚠ Surface limitée'}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Prix le + bas</span>
              <span className="text-sm font-bold text-slate-800">{formatMontant(hoveredData.prixM2)} €/m²</span>
            </div>
            {(hoveredData.nbOpportunites || 0) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Opportunités</span>
                <span className="text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {hoveredData.nbOpportunites} commune{(hoveredData.nbOpportunites || 0) > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Légende surface accessible */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 p-3 z-[1000]">
        <p className="text-[10px] font-semibold text-slate-700 mb-2 uppercase tracking-wide">Surface accessible</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded border border-emerald-700" style={{ background: '#10b981' }} />
            <span className="text-[9px] text-slate-600">≥40m² • T2/T3+</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded border border-amber-700" style={{ background: '#f59e0b' }} />
            <span className="text-[9px] text-slate-600">25-40m² • Studio/T1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded border border-red-700" style={{ background: '#ef4444' }} />
            <span className="text-[9px] text-slate-600">&lt;25m² • Difficile</span>
          </div>
        </div>
      </div>

      {/* Source */}
      <div className="absolute bottom-3 right-3 text-[9px] text-slate-400 bg-white/80 px-2 py-1 rounded z-[1000]">
        France-GeoJSON • Leaflet
      </div>

      {/* CSS pour tooltips */}
      <style jsx global>{`
        .dept-tooltip-custom {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 6px !important;
          padding: 6px 10px !important;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1) !important;
        }
        .dept-tooltip-custom::before {
          display: none !important;
        }
        .leaflet-container {
          font-family: inherit !important;
        }
      `}</style>
    </div>
  )
}
