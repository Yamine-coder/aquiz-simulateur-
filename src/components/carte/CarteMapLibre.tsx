'use client'

/**
 * CarteMapLibre — Carte interactive professionnelle (WebGL)
 *
 * Fonctionnalités :
 * - Rendu GPU (MapLibre GL) — fluide, zoomable, responsive
 * - Heatmap des prix avec gradient vert → rouge
 * - Clustering intelligent avec badges de comptage
 * - Marqueurs colorés vert/orange/rouge selon le budget
 * - Labels de surface au zoom élevé
 * - Popups riches au survol
 * - Fly-to animation (recherche, sélection)
 * - Contrôles de zoom custom
 */

import { cn } from '@/lib/utils'
import { formatMontant } from '@/lib/utils/formatters'
import type { ZoneCalculee } from '@/types/carte'
import { Minus, Navigation, Plus } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'

// ─── Types ──────────────────────────────────────────────────
interface CarteMapLibreProps {
  zonesCalculees: ZoneCalculee[]
  onSelectZone?: (zone: ZoneCalculee | null) => void
  zoneSelectionnee?: ZoneCalculee | null
  className?: string
  centreInitial?: { lat: number; lng: number }
  zoomInitial?: number
  showHeatmap?: boolean
  /** Coordonnées vers lesquelles voler (recherche, etc.) */
  flyToCoords?: { lat: number; lng: number; zoom?: number } | null
}

// ─── Helpers ────────────────────────────────────────────────

/** Convertit les zones calculées en GeoJSON pour MapLibre */
function zonesToGeoJSON(zones: ZoneCalculee[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map((zone, i) => ({
      type: 'Feature' as const,
      id: i,
      geometry: {
        type: 'Point' as const,
        coordinates: [zone.centre.lng, zone.centre.lat],
      },
      properties: {
        zoneId: zone.id,
        nom: zone.nom,
        prixM2: zone.prixM2,
        surfaceMax: zone.surfaceMax,
        statut: zone.statut,
        departement: zone.departement,
        codeDepartement: zone.codeDepartement,
        codePostal: zone.codePostal,
        commentaireLogement: zone.commentaireLogement || '',
      },
    })),
  }
}

/** Génère un style MapLibre (raster tiles CartoDB light) */
function makeStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: {
      carto: {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        ],
        tileSize: 256,
        attribution:
          '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      },
    },
    layers: [
      {
        id: 'carto-tiles',
        type: 'raster',
        source: 'carto',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  }
}

/** queryRenderedFeatures sûr (ne throw pas si le layer n'existe pas encore) */
function safeQuery(
  map: maplibregl.Map,
  point: maplibregl.PointLike,
  layers: string[],
): maplibregl.MapGeoJSONFeature[] {
  try {
    return map.queryRenderedFeatures(point, { layers })
  } catch {
    return []
  }
}

// ─── Composant ──────────────────────────────────────────────

export default function CarteMapLibre({
  zonesCalculees,
  onSelectZone,
  zoneSelectionnee,
  className,
  centreInitial = { lat: 48.8566, lng: 2.3522 },
  zoomInitial = 10,
  showHeatmap = true,
  flyToCoords,
}: CarteMapLibreProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  // Refs pour les valeurs qui changent sans recréer la map
  const geojsonRef = useRef(zonesToGeoJSON(zonesCalculees))
  const showHeatmapRef = useRef(showHeatmap)
  const onSelectZoneRef = useRef(onSelectZone)
  const zonesLookupRef = useRef(new Map<string, ZoneCalculee>())

  // ─── Sync refs ───────────────────────────────────────────
  useEffect(() => {
    onSelectZoneRef.current = onSelectZone
  }, [onSelectZone])

  useEffect(() => {
    geojsonRef.current = zonesToGeoJSON(zonesCalculees)
    const lookup = new Map<string, ZoneCalculee>()
    zonesCalculees.forEach((z) => lookup.set(z.id, z))
    zonesLookupRef.current = lookup

    // Mettre à jour les données sur la carte existante
    if (mapRef.current?.isStyleLoaded()) {
      const src = mapRef.current.getSource('zones') as maplibregl.GeoJSONSource | undefined
      src?.setData(geojsonRef.current)
    }
  }, [zonesCalculees])

  // ─── Inject popup CSS ────────────────────────────────────
  useEffect(() => {
    const id = 'aquiz-maplibre-css'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      .aquiz-gl-popup .maplibregl-popup-content {
        border-radius: 14px;
        padding: 12px 14px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        border: 1px solid rgba(0,0,0,0.06);
        font-family: system-ui, -apple-system, sans-serif;
      }
      .aquiz-gl-popup .maplibregl-popup-tip {
        border-top-color: white;
      }
    `
    document.head.appendChild(style)
  }, [])

  // ─── Fonction d'ajout des couches ────────────────────────
  const addLayers = (map: maplibregl.Map) => {
    if (map.getSource('zones')) return // déjà ajouté

    // Source GeoJSON — pas de clustering, points directs
    map.addSource('zones', {
      type: 'geojson',
      data: geojsonRef.current,
    })

    // ═══ HEATMAP (gradient de tension des prix) ═══
    map.addLayer({
      id: 'zones-heatmap',
      type: 'heatmap',
      source: 'zones',
      maxzoom: 15,
      layout: {
        visibility: showHeatmapRef.current ? 'visible' : 'none',
      },
      paint: {
        // Poids basé sur le prix/m² — les zones chères pèsent plus (= plus rouges)
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'prixM2'],
          1500, 0,
          3000, 0.15,
          5000, 0.35,
          7000, 0.55,
          10000, 0.8,
          15000, 1,
        ],
        // Intensité progressive avec le zoom
        'heatmap-intensity': [
          'interpolate', ['linear'], ['zoom'],
          7, 0.3, 9, 0.6, 11, 1, 13, 1.8,
        ],
        // Dégradé : transparent → vert froid → jaune → orange → rouge vif
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,    'rgba(0, 0, 0, 0)',
          0.05, 'rgba(34, 197, 94, 0.04)',
          0.15, 'rgba(34, 197, 94, 0.15)',
          0.30, 'rgba(74, 222, 128, 0.25)',
          0.45, 'rgba(250, 204, 21, 0.35)',
          0.60, 'rgba(251, 146, 60, 0.45)',
          0.75, 'rgba(239, 68, 68, 0.52)',
          0.90, 'rgba(220, 38, 38, 0.60)',
          1,    'rgba(185, 28, 28, 0.68)',
        ],
        // Rayon large pour un rendu fluide
        'heatmap-radius': [
          'interpolate', ['linear'], ['zoom'],
          7, 18, 9, 28, 11, 42, 13, 58, 15, 70,
        ],
        // Disparition progressive aux zooms élevés
        'heatmap-opacity': [
          'interpolate', ['linear'], ['zoom'],
          9, 0.85, 12, 0.55, 14, 0.2, 15, 0,
        ],
      },
    })

    // ═══ MARQUEURS INDIVIDUELS (vert/orange/rouge) ═══
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'zones',
      paint: {
        'circle-color': [
          'match',
          ['get', 'statut'],
          'vert', '#22c55e',
          'orange', '#f59e0b',
          'rouge', '#ef4444',
          '#6b7280',
        ],
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          7, 3.5, 9, 5, 11, 8, 13, 11, 15, 15,
        ],
        'circle-stroke-width': [
          'interpolate', ['linear'], ['zoom'],
          7, 0.8, 11, 1.5, 14, 2.5,
        ],
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.88,
      },
    })

    // ═══ LABELS DE SURFACE (zoom élevé) ═══
    map.addLayer({
      id: 'point-labels',
      type: 'symbol',
      source: 'zones',
      minzoom: 12.5,
      layout: {
        'text-field': ['concat', ['to-string', ['get', 'surfaceMax']], 'm²'],
        'text-font': ['Open Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 12.5, 10, 15, 13],
        'text-offset': [0, 1.8],
        'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#334155',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    })
  }

  // ─── Initialisation de la carte (une seule fois) ─────────
  useEffect(() => {
    if (!containerRef.current) return

    // Log container dimensions for debugging
    const rect = containerRef.current.getBoundingClientRect()
    console.log(`[MapLibre] Container: ${rect.width}x${rect.height} at (${rect.left},${rect.top})`)

    // Safety: if container has no dimensions, force a minimum
    if (rect.height < 10) {
      console.warn('[MapLibre] Container has no height, forcing 100vh')
      containerRef.current.style.height = '100vh'
    }

    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: makeStyle(),
        center: [centreInitial.lng, centreInitial.lat],
        zoom: zoomInitial,
        minZoom: 6,
        maxZoom: 18,
        attributionControl: false,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[MapLibre] Failed to create map:', msg)
      setMapError(msg)
      return
    }

    console.log('[MapLibre] Map instance created')

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    )

    // Ajout des couches au chargement initial ET après setStyle
    let loadFired = false

    map.on('style.load', () => {
      console.log('[MapLibre] EVENT: style.load')
      // Re-crée les couches après changement de style (dark/light)
      try { addLayers(map) } catch (e) { console.warn('[MapLibre] addLayers in style.load failed:', e) }
    })

    map.on('load', () => {
      console.log('[MapLibre] EVENT: load')
      loadFired = true
      clearTimeout(fallback)
      map.resize()
      try { addLayers(map) } catch (e) { console.warn('[MapLibre] addLayers in load failed:', e) }
      // ALWAYS set ready — even if addLayers fails, the base map renders
      setIsReady(true)
    })

    // Fallback : si le load event ne fire pas après 8s
    const fallback = setTimeout(() => {
      if (loadFired || !mapRef.current) return
      console.warn('[MapLibre] load event did not fire after 8s — forcing ready')
      setIsReady(true)
      try { addLayers(mapRef.current) } catch { /* sera chargé plus tard via style.load */ }
    }, 8000)

    // Delayed resize — catches layout timing issues
    const resizeTimer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize()
        console.log('[MapLibre] Delayed resize executed')
      }
    }, 500)

    // Les erreurs de tuiles/polices ne sont PAS fatales
    map.on('error', (e) => {
      console.warn('[MapLibre] error:', e.error?.message || e)
    })

    // ═══ INTERACTIONS (déclarées une seule fois sur la map) ═══

    // Curseur pointer
    map.on('mousemove', (e) => {
      const pts = safeQuery(map, e.point, ['unclustered-point'])
      map.getCanvas().style.cursor = pts.length > 0 ? 'pointer' : ''

      // Popup au survol
      if (pts.length > 0) {
        const f = pts[0]
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
        const p = f.properties || {}
        const prixM2 = Number(p.prixM2) || 0
        const surfaceMax = Number(p.surfaceMax) || 0
        const statut = String(p.statut || 'rouge')
        const couleur =
          statut === 'vert' ? '#22c55e' : statut === 'orange' ? '#f59e0b' : '#ef4444'

        if (!popupRef.current) {
          popupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 15,
            className: 'aquiz-gl-popup',
          })
        }

        popupRef.current
          .setLngLat(coords)
          .setHTML(
            `<div style="min-width:170px;">
              <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:5px;">
                ${String(p.nom || '')}
              </div>
              <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;">
                <span style="font-size:12px;color:#64748b;">${formatMontant(prixM2)} €/m²</span>
                <span style="font-weight:700;font-size:15px;color:${couleur};">${surfaceMax} m²</span>
              </div>
              <div style="font-size:10px;color:#94a3b8;margin-top:4px;">
                ${String(p.commentaireLogement || '')} · ${String(p.codePostal || '')}
              </div>
            </div>`,
          )
          .addTo(map)
      } else {
        popupRef.current?.remove()
      }
    })

    // Click sur un point → sélection
    map.on('click', (e) => {
      const pts = safeQuery(map, e.point, ['unclustered-point'])
      if (pts.length > 0) {
        const zoneId = String(pts[0].properties?.zoneId || '')
        const zone = zonesLookupRef.current.get(zoneId)
        if (zone) onSelectZoneRef.current?.(zone)
      }
    })

    mapRef.current = map

    return () => {
      clearTimeout(fallback)
      clearTimeout(resizeTimer)
      popupRef.current?.remove()
      map.remove()
      mapRef.current = null
      setIsReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // création unique

  // ─── Toggle heatmap ──────────────────────────────────────
  useEffect(() => {
    showHeatmapRef.current = showHeatmap
    if (!mapRef.current || !isReady) return
    try {
      if (mapRef.current.getLayer('zones-heatmap')) {
        mapRef.current.setLayoutProperty(
          'zones-heatmap',
          'visibility',
          showHeatmap ? 'visible' : 'none',
        )
      }
    } catch { /* style pas encore chargé */ }
  }, [showHeatmap, isReady])

  // ─── Fly to zone sélectionnée ────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !zoneSelectionnee) return
    mapRef.current.flyTo({
      center: [zoneSelectionnee.centre.lng, zoneSelectionnee.centre.lat],
      zoom: Math.max(mapRef.current.getZoom(), 12.5),
      duration: 1200,
      essential: true,
    })
  }, [zoneSelectionnee])

  // ─── Fly to (recherche) ──────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !flyToCoords) return
    mapRef.current.flyTo({
      center: [flyToCoords.lng, flyToCoords.lat],
      zoom: flyToCoords.zoom || 13,
      duration: 1500,
      essential: true,
    })
  }, [flyToCoords])

  // ─── Contrôles ───────────────────────────────────────────
  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 300 })
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 300 })
  const handleReset = () => {
    mapRef.current?.flyTo({
      center: [centreInitial.lng, centreInitial.lat],
      zoom: zoomInitial,
      duration: 1000,
    })
  }

  // ─── Rendu ───────────────────────────────────────────────
  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Canvas WebGL */}
      <div ref={containerRef} className="absolute inset-0" style={{ width: '100%', height: '100%', minHeight: '300px' }} />

      {/* Erreur d'init */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-20">
          <div className="text-center max-w-md px-6">
            <p className="text-lg font-bold text-red-600 mb-2">Erreur carte WebGL</p>
            <p className="text-sm text-red-500 mb-4 font-mono break-all">{mapError}</p>
            <button
              onClick={() => { setMapError(null); window.location.reload() }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {!isReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-slate-200 rounded-full" />
              <div className="absolute inset-0 w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 font-medium">Initialisation de la carte...</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {zonesCalculees.length} zones · Moteur WebGL
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contrôles de zoom */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 rounded-lg shadow-lg border bg-white/95 backdrop-blur border-slate-200/80 hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors"
          aria-label="Zoom avant"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 rounded-lg shadow-lg border bg-white/95 backdrop-blur border-slate-200/80 hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors"
          aria-label="Zoom arrière"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="w-9 h-9 rounded-lg shadow-lg border bg-white/95 backdrop-blur border-slate-200/80 hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors mt-1.5"
          aria-label="Recentrer"
        >
          <Navigation className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
