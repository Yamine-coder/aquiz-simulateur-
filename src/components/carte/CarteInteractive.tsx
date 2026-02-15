'use client'

/**
 * Composant de carte interactive - Charte AQUIZ v2
 * Affiche les zones d'achat colorées selon le budget
 * 
 * Design: Moderne, immersif - sans popup Leaflet (panneau externe)
 * Source données: DVF - data.gouv.fr
 */

import { cn } from '@/lib/utils'
import type { StatutZone, TypeBienCarte, ZoneCalculee } from '@/types/carte'
import type L from 'leaflet'
import { Minus, Navigation, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

interface CarteInteractiveProps {
  zonesCalculees: ZoneCalculee[]
  onSelectZone?: (zone: ZoneCalculee | null) => void
  zoneSelectionnee?: ZoneCalculee | null
  filtreStatuts?: StatutZone[]
  typeBien?: TypeBienCarte
  className?: string
  centreInitial?: { lat: number; lng: number }
  zoomInitial?: number
}

// Couleurs charte AQUIZ
const COULEURS_AQUIZ = {
  vert: '#22c55e',
  orange: '#f59e0b',
  rouge: '#ef4444',
  noir: '#1a1a1a',
  gris: '#6b7280',
}

export default function CarteInteractive({
  zonesCalculees,
  onSelectZone,
  zoneSelectionnee,
  filtreStatuts,
  typeBien = 'appartement',
  className,
  centreInitial = { lat: 48.8566, lng: 2.3522 },
  zoomInitial = 10,
}: CarteInteractiveProps) {
  const [isMounted, setIsMounted] = useState(false)
  const mapRef = useRef<L.Map | null>(null)
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: typeof import('react-leaflet').MapContainer
    TileLayer: typeof import('react-leaflet').TileLayer
    CircleMarker: typeof import('react-leaflet').CircleMarker
    Tooltip: typeof import('react-leaflet').Tooltip
    useMap: typeof import('react-leaflet').useMap
  } | null>(null)

  useEffect(() => {
    const loadLeaflet = async () => {
      const { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } = await import('react-leaflet')
      setMapComponents({ MapContainer, TileLayer, CircleMarker, Tooltip, useMap })
      setIsMounted(true)
    }
    loadLeaflet()
  }, [])

  const zonesFiltrees = useMemo(() => {
    if (!filtreStatuts || filtreStatuts.length === 0) return zonesCalculees
    return zonesCalculees.filter((z) => filtreStatuts.includes(z.statut))
  }, [zonesCalculees, filtreStatuts])

  // Handlers zoom
  const handleZoomIn = () => mapRef.current?.zoomIn()
  const handleZoomOut = () => mapRef.current?.zoomOut()
  const handleReset = () => {
    if (mapRef.current) {
      mapRef.current.setView([centreInitial.lat, centreInitial.lng], zoomInitial)
    }
  }

  // Placeholder de chargement - Style moderne
  if (!isMounted || !MapComponents) {
    return (
      <div className={cn(
        'w-full h-full min-h-[400px] bg-gradient-to-br from-aquiz-gray-lightest to-white flex items-center justify-center',
        className
      )}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-aquiz-gray-lighter rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-aquiz-green border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-aquiz-black">Chargement de la carte...</p>
            <p className="text-xs text-aquiz-gray mt-1">Analyse des {zonesCalculees.length} zones en cours</p>
          </div>
        </div>
      </div>
    )
  }

  const { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } = MapComponents

  // Composant interne pour synchro map ref
  const MapRefSync = () => {
    const map = useMap()
    useEffect(() => {
      mapRef.current = map
    }, [map])
    return null
  }

  return (
    <div className={cn('relative w-full h-full min-h-[400px]', className)}>
      <MapContainer
        center={[centreInitial.lat, centreInitial.lng]}
        zoom={zoomInitial}
        className="w-full h-full"
        scrollWheelZoom={true}
        zoomControl={false}
        doubleClickZoom={true}
        touchZoom={true}
        dragging={true}
      >
        <MapRefSync />
        
        {/* Fond de carte sobre (CartoDB Positron) */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Marqueurs des zones */}
        {zonesFiltrees.map((zoneCalc) => {
          const isSelected = zoneSelectionnee?.id === zoneCalc.id
          const couleur = COULEURS_AQUIZ[zoneCalc.statut]
          
          // Taille basée sur la surface
          const baseRadius = Math.min(Math.max(zoneCalc.surfaceMax / 10, 6), 16)
          const radius = isSelected ? baseRadius + 4 : baseRadius
          
          return (
            <CircleMarker
              key={zoneCalc.id}
              center={[zoneCalc.centre.lat, zoneCalc.centre.lng]}
              radius={radius}
              pathOptions={{
                fillColor: couleur,
                color: isSelected ? COULEURS_AQUIZ.noir : '#ffffff',
                fillOpacity: isSelected ? 0.95 : 0.75,
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{
                click: () => onSelectZone?.(zoneCalc),
              }}
            >
              {/* Tooltip léger au hover */}
              <Tooltip 
                direction="top" 
                offset={[0, -10]} 
                opacity={1}
                className="aquiz-tooltip"
              >
                <div className="text-center px-1">
                  <p className="font-semibold text-aquiz-black text-sm">{zoneCalc.nom}</p>
                  <p className="text-aquiz-gray text-xs">{zoneCalc.surfaceMax} m² accessibles</p>
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Contrôles de zoom custom - En dehors de MapContainer */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-white rounded-lg shadow-lg border border-aquiz-gray-lighter flex items-center justify-center hover:bg-aquiz-gray-lightest transition-colors"
          aria-label="Zoom avant"
        >
          <Plus className="w-5 h-5 text-aquiz-black" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-white rounded-lg shadow-lg border border-aquiz-gray-lighter flex items-center justify-center hover:bg-aquiz-gray-lightest transition-colors"
          aria-label="Zoom arrière"
        >
          <Minus className="w-5 h-5 text-aquiz-black" />
        </button>
        <button
          onClick={handleReset}
          className="w-10 h-10 bg-white rounded-lg shadow-lg border border-aquiz-gray-lighter flex items-center justify-center hover:bg-aquiz-gray-lightest transition-colors mt-2"
          aria-label="Recentrer"
        >
          <Navigation className="w-4 h-4 text-aquiz-black" />
        </button>
      </div>
    </div>
  )
}
