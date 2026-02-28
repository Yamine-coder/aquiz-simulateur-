'use client'

/**
 * Mini carte IDF réaliste avec Leaflet
 * Charge les vrais contours GeoJSON officiels des départements (source: France-GeoJSON)
 */

import { logger } from '@/lib/logger'
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
  onExplore?: () => void
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

// Couleur selon surface accessible — palette moderne et contrastée (4 niveaux)
function getSurfaceColor(surface: number): string {
  if (surface >= 80) return '#059669'     // Vert émeraude foncé — très grand
  if (surface >= 40) return '#34d399'     // Vert émeraude — confortable
  if (surface >= 25) return '#fbbf24'     // Ambre doré — studio/T1
  return '#f87171'                         // Rouge corail — difficile
}

function getSurfaceBorderColor(_surface: number): string {
  return '#1e4038'  // Bordure foncée uniforme — plus propre
}

function getSurfaceHoverColor(surface: number): string {
  if (surface >= 80) return '#047857'
  if (surface >= 40) return '#10b981'
  if (surface >= 25) return '#f59e0b'
  return '#ef4444'
}

// Opacité selon surface pour créer un effet de profondeur
function getSurfaceOpacity(surface: number): number {
  if (surface >= 80) return 0.65
  if (surface >= 40) return 0.50
  if (surface >= 25) return 0.55
  return 0.60
}

export default function MiniCarteIDF({ departements, className = '', onExplore }: MiniCarteIDFProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [map, setMap] = useState<L.Map | null>(null)
  const [hoveredDept, setHoveredDept] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null)
  const layersRef = useRef<Map<string, L.Layer>>(new Map())
  const labelMarkersRef = useRef<L.Marker[]>([])
  const boundsRef = useRef<L.LatLngBounds | null>(null)

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
      .catch(err => logger.error('Erreur chargement GeoJSON:', err))
  }, [isMounted])

  // Initialiser la carte Leaflet
  useEffect(() => {
    if (!isMounted || !mapRef.current || !geoData) return
    // Ne pas réinitialiser si déjà fait
    if (mapInstanceRef.current) return

    let cancelled = false

    /** Recalcule la taille de la carte ET recadre sur les bounds IDF (sans animation) */
    const refreshMap = () => {
      const m = mapInstanceRef.current
      if (!m) return
      m.invalidateSize()
      if (boundsRef.current) {
        m.fitBounds(boundsRef.current, { padding: [15, 15], animate: false })
      }
    }

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default
        // @ts-expect-error -- CSS import has no type declarations
        await import('leaflet/dist/leaflet.css')

        if (cancelled || !mapRef.current) return

        // Désactiver le drag sur mobile pour ne pas capturer le scroll tactile
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

        const leafletMap = L.map(mapRef.current, {
          center: [48.7, 2.5],
          zoom: 9,
          zoomControl: false,
          scrollWheelZoom: false,
          dragging: !isTouchDevice,
          touchZoom: false,
          doubleClickZoom: false,
          attributionControl: false,
        })

        // Fond de carte CartoDB Voyager (plus lisible, labels inclus)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(leafletMap)

        if (cancelled) {
          leafletMap.remove()
          return
        }

        mapInstanceRef.current = leafletMap
        setMap(leafletMap)
        setIsLoaded(true)

        // Forcer invalidateSize + fitBounds avec des délais progressifs
        // pour garantir la bonne taille après navigation/transitions
        setTimeout(refreshMap, 150)
        setTimeout(refreshMap, 400)
        setTimeout(refreshMap, 800)
        setTimeout(refreshMap, 1500)
      } catch (error) {
        logger.error('Erreur initialisation carte:', error)
        setIsLoaded(true)
      }
    }

    // Petit délai pour s'assurer que le DOM est prêt
    const timer = setTimeout(initMap, 50)

    // Debounce pour éviter les appels multiples pendant le redimensionnement
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null
    const debouncedRefresh = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const m = mapInstanceRef.current
        if (!m) return
        m.invalidateSize()
        if (boundsRef.current) {
          m.fitBounds(boundsRef.current, { padding: [15, 15], animate: false })
        }
      }, 150)
    }

    // ResizeObserver pour détecter les changements de taille du conteneur
    let resizeObserver: ResizeObserver | null = null
    if (mapRef.current) {
      resizeObserver = new ResizeObserver(() => {
        debouncedRefresh()
      })
      resizeObserver.observe(mapRef.current)
    }

    // window resize : recadrer quand la fenêtre / le viewport change
    // (couvre le cas DevTools responsive ↔ desktop)
    const handleWindowResize = () => {
      debouncedRefresh()
    }
    window.addEventListener('resize', handleWindowResize)

    // pageshow : recadrer après retour via bfcache (bouton retour navigateur)
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setTimeout(refreshMap, 100)
        setTimeout(refreshMap, 500)
      }
    }

    // visibilitychange : recadrer quand l'onglet redevient visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(refreshMap, 100)
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleWindowResize)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibility)
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

      // Supprimer les anciens labels pour éviter la duplication
      labelMarkersRef.current.forEach(marker => map.removeLayer(marker))
      labelMarkersRef.current = []

      // Créer une couche GeoJSON avec les vrais contours officiels
      const geoJsonLayer = L.geoJSON(geoData, {
        style: (feature) => {
          const code = feature?.properties?.code
          const data = dataByCode.get(code)
          const surface = data?.surface || 0

          return {
            fillColor: getSurfaceColor(surface),
            fillOpacity: getSurfaceOpacity(surface),
            color: getSurfaceBorderColor(surface),
            weight: 1.8,
            opacity: 0.7,
          }
        },
        onEachFeature: (feature, layer) => {
          const code = feature.properties?.code
          const data = dataByCode.get(code)
          const surface = data?.surface || 0

          // Tooltip au survol avec nom du département et infos
          if (data) {
            const colorDot = getSurfaceColor(surface)
            const tooltipContent = `<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:2px 0;">
              <div style="width:8px;height:8px;border-radius:50%;background:${colorDot};flex-shrink:0;"></div>
              <div>
                <div style="font-weight:700;color:#0f172a;font-size:13px;">${DEPT_NAMES[code] || code}</div>
                <div style="color:#64748b;font-size:11px;margin-top:1px;">${data.surface} m² • ${formatMontant(data.prixM2)}/m²</div>
              </div>
            </div>`
            layer.bindTooltip(tooltipContent, {
              direction: 'top',
              sticky: !('ontouchstart' in window),
              className: 'dept-tooltip',
              opacity: 1,
            })
          }

          layer.on('mouseover', () => {
            setHoveredDept(code)
            ;(layer as L.Path).setStyle({
              weight: 2.5,
              color: '#0d9488',
              fillColor: getSurfaceHoverColor(surface),
              fillOpacity: 0.7,
            })
            ;(layer as L.Path).bringToFront()
          })

          layer.on('mouseout', () => {
            setHoveredDept(null)
            ;(layer as L.Path).setStyle({
              weight: 1.8,
              color: getSurfaceBorderColor(surface),
              fillColor: getSurfaceColor(surface),
              fillOpacity: getSurfaceOpacity(surface),
            })
          })

          layersRef.current.set(code, layer)
        }
      }).addTo(map)

      // Ajouter les noms des départements — labels intelligents
      // Offsets manuels pour éviter le chevauchement en petite couronne
      const LABEL_OFFSETS: Record<string, [number, number]> = {
        '75': [0, 0],        // Paris : au centre
        '92': [-0.06, 0.01], // Hauts-de-Seine : décalé à gauche
        '93': [0.04, -0.03], // Seine-Saint-Denis : décalé en haut-droite
        '94': [0.04, 0.04],  // Val-de-Marne : décalé en bas-droite
      }
      // Labels courts pour petite couronne
      const SHORT_NAMES: Record<string, string> = {
        '75': '75',
        '92': '92',
        '93': '93',
        '94': '94',
      }

      geoData.features.forEach(feature => {
        const code = feature.properties?.code;
        const data = dataByCode.get(code);
        if (!data) return;
        const bounds = L.geoJSON(feature).getBounds();
        const center = bounds.getCenter();
        const offset = LABEL_OFFSETS[code] || [0, 0];
        const adjustedCenter = L.latLng(center.lat + offset[1], center.lng + offset[0]);

        const isSmall = ['75', '92', '93', '94'].includes(code);
        const displayName = SHORT_NAMES[code] || DEPT_NAMES[code] || code;

        const label = L.divIcon({
          className: 'dept-label',
          html: `<div style="text-align:center;pointer-events:none;white-space:nowrap;
            font-size:${isSmall ? '10px' : '12px'};
            font-weight:${isSmall ? '800' : '700'};
            color:${isSmall ? '#374151' : '#1e293b'};
            text-shadow:0 0 4px rgba(255,255,255,0.95), 0 0 4px rgba(255,255,255,0.95), 0 1px 2px rgba(255,255,255,0.9);
            letter-spacing:${isSmall ? '0.5px' : '-0.2px'};
          ">${displayName}</div>`,
          iconSize: [isSmall ? 28 : 110, 18],
          iconAnchor: [isSmall ? 14 : 55, 9],
        });
        const labelMarker = L.marker(adjustedCenter, { icon: label, interactive: false }).addTo(map);
        labelMarkersRef.current.push(labelMarker);
      });

      // Ajuster la vue sur les vrais bounds du GeoJSON
      const layerBounds = geoJsonLayer.getBounds()
      boundsRef.current = layerBounds
      map.invalidateSize()
      map.fitBounds(layerBounds, { padding: [15, 15] })
      // Re-fit avec délais pour couvrir les transitions de layout
      setTimeout(() => {
        map.invalidateSize()
        map.fitBounds(layerBounds, { padding: [15, 15] })
      }, 250)
      setTimeout(() => {
        map.invalidateSize()
        map.fitBounds(layerBounds, { padding: [15, 15] })
      }, 700)
    }

    addLayers()
  }, [map, isLoaded, geoData, dataByCode])

  // Placeholder de chargement
  if (!isMounted || !geoData) {
    return (
      <div className={`w-full h-[320px] sm:h-[400px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden ${className}`}>
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
    <div className={`relative z-0 ${className}`}>
      {/* Carte Leaflet */}
      <div 
        ref={mapRef} 
        className="w-full h-[320px] sm:h-[420px] overflow-hidden"
        style={{ background: '#f1f5f9', zIndex: 0 }}
      />

      {/* Indicateur de chargement pendant init Leaflet */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-50 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-500">Initialisation...</span>
          </div>
        </div>
      )}

      {/* Panel info au survol */}
      {hoveredData && (
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/60 p-3.5 z-[5] min-w-[190px] transition-all duration-200 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: getSurfaceColor(hoveredData.surface) }} />
            <p className="text-sm font-bold text-slate-900">{DEPT_NAMES[hoveredDept!] || hoveredDept}</p>
          </div>
          <div className="space-y-1 text-[11px] text-slate-500 pl-[18px]">
            <p>Surface accessible : <span className="font-semibold text-slate-800">{hoveredData.surface} m²</span></p>
            <p>Prix moyen : <span className="font-semibold text-slate-800">{formatMontant(hoveredData.prixM2)}/m²</span></p>
            {(hoveredData.nbOpportunites || 0) > 0 && (
              <p className="text-emerald-600 font-medium">{hoveredData.nbOpportunites} commune{(hoveredData.nbOpportunites || 0) > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      )}

      {/* Légende — compacte, fond glass */}
      <div className="absolute bottom-3 left-3 bg-white/85 backdrop-blur-md rounded-xl shadow-lg border border-white/50 px-2.5 sm:px-3 py-1.5 sm:py-2 z-[5]">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#059669' }} />
            <span className="text-[9px] text-slate-600 font-medium">≥80m²</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#34d399' }} />
            <span className="text-[9px] text-slate-600 font-medium">40-80m²</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#fbbf24' }} />
            <span className="text-[9px] text-slate-600 font-medium">25-40m²</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#f87171' }} />
            <span className="text-[9px] text-slate-600 font-medium">&lt;25m²</span>
          </div>
        </div>
      </div>

      {/* Bouton Explorer la carte */}
      {onExplore && (
        <button
          type="button"
          onClick={onExplore}
          className="absolute top-3 left-3 flex items-center gap-1.5 bg-gradient-to-r from-aquiz-green to-emerald-500 hover:from-emerald-600 hover:to-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg shadow-aquiz-green/25 hover:shadow-aquiz-green/40 hover:scale-[1.02] active:scale-[0.97] transition-all z-[5] cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
          Explorer la carte
        </button>
      )}

      {/* Badge flottant — découverte communes */}
      {onExplore && isLoaded && (
        <button
          type="button"
          onClick={onExplore}
          className="absolute bottom-14 sm:bottom-12 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-emerald-700 text-[10px] font-bold px-2.5 py-1.5 rounded-full shadow-lg border border-emerald-200 z-[5] cursor-pointer hover:bg-emerald-50 transition-all group"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {departements.reduce((sum, d) => sum + (d.nbOpportunites || 0), 0)} communes accessibles
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-emerald-500 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      )}

      {/* Source */}
      <div className="absolute bottom-3 right-3 text-[8px] text-slate-400 bg-white/70 px-1.5 py-0.5 rounded z-[5]">
data.gouv.fr • France-GeoJSON
      </div>

      {/* CSS pour tooltips et labels */}
      <style jsx global>{`
        .leaflet-container {
          font-family: inherit !important;
          z-index: 0 !important;
        }
        .leaflet-pane {
          z-index: 0 !important;
        }
        .leaflet-tile-pane {
          z-index: 0 !important;
        }
        .leaflet-overlay-pane {
          z-index: 1 !important;
        }
        .leaflet-marker-pane,
        .leaflet-tooltip-pane,
        .leaflet-popup-pane,
        .leaflet-shadow-pane {
          z-index: 2 !important;
        }
        .leaflet-top,
        .leaflet-bottom {
          z-index: 3 !important;
        }
        .dept-label {
          background: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .dept-tooltip {
          background: white !important;
          border-radius: 10px !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06) !important;
          padding: 8px 12px !important;
        }
        .dept-tooltip::before {
          border-top-color: white !important;
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
