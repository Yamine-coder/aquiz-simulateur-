/**
 * API Route - Proxy Score Quartier (OpenStreetMap)
 * Appelle l'API Overpass côté serveur
 */

import { NextRequest, NextResponse } from 'next/server';

// Route dynamique (appelée côté client)

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Cache serveur — POIs changent rarement (TTL 24h)
const quartierCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000

// Catégories et leur poids dans le score
const CATEGORIES = {
  transport: {
    label: 'Transports',
    poids: 25,
    amenities: ['bus_stop', 'tram_stop', 'subway_entrance', 'train_station', 'bicycle_rental']
  },
  commerce: {
    label: 'Commerces',
    poids: 20,
    amenities: ['supermarket', 'bakery', 'pharmacy', 'bank', 'post_office', 'convenience']
  },
  education: {
    label: 'Éducation',
    poids: 20,
    amenities: ['school', 'kindergarten', 'college', 'university', 'library']
  },
  sante: {
    label: 'Santé',
    poids: 15,
    amenities: ['hospital', 'clinic', 'doctors', 'dentist', 'pharmacy']
  },
  loisirs: {
    label: 'Loisirs',
    poids: 10,
    amenities: ['cinema', 'theatre', 'restaurant', 'cafe', 'bar', 'sports_centre', 'gym']
  },
  vert: {
    label: 'Espaces verts',
    poids: 10,
    amenities: ['park', 'garden', 'playground']
  }
}

interface POI {
  type: string
  categorie: string
  distance: number
}

function calculerDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Rayon de la Terre en mètres
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function determinerCategorie(amenity: string): string {
  for (const [cat, config] of Object.entries(CATEGORIES)) {
    if (config.amenities.includes(amenity)) {
      return cat
    }
  }
  if (['park', 'garden', 'playground'].includes(amenity)) return 'vert'
  if (['station', 'tram_stop', 'subway_entrance', 'bus_stop'].includes(amenity)) return 'transport'
  if (['supermarket', 'bakery', 'convenience'].includes(amenity)) return 'commerce'
  return 'loisirs'
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lon = parseFloat(searchParams.get('lon') || '0')
  const rayon = parseInt(searchParams.get('rayon') || '800')
  
  if (!lat || !lon) {
    return NextResponse.json(
      { success: false, error: 'Coordonnées manquantes' },
      { status: 400 }
    )
  }
  
  try {
    // Vérifier le cache serveur
    const cacheKey = `${lat}_${lon}_${rayon}`
    const cached = quartierCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    // Construire la requête Overpass
    const allAmenities = Object.values(CATEGORIES)
      .flatMap(cat => cat.amenities)
      .join('|')
    
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"${allAmenities}"](around:${rayon},${lat},${lon});
        way["amenity"~"${allAmenities}"](around:${rayon},${lat},${lon});
        node["leisure"~"park|garden|playground"](around:${rayon},${lat},${lon});
        way["leisure"~"park|garden|playground"](around:${rayon},${lat},${lon});
        node["railway"~"station|tram_stop|subway_entrance"](around:${rayon},${lat},${lon});
        node["highway"="bus_stop"](around:${rayon},${lat},${lon});
        node["shop"~"supermarket|bakery|convenience"](around:${rayon},${lat},${lon});
      );
      out center;
    `
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // Overpass peut être lent

    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'API OpenStreetMap indisponible (HTTP ' + response.status + ')' },
        { status: 502 }
      )
    }
    
    const result = await response.json()
    
    // Parser les POIs
    const pois: POI[] = []
    
    if (result.elements) {
      for (const element of result.elements) {
        const tags = element.tags || {}
        let poiLat = element.lat
        let poiLon = element.lon
        
        if (!poiLat && element.center) {
          poiLat = element.center.lat
          poiLon = element.center.lon
        }
        
        if (!poiLat) continue
        
        const amenity = tags.amenity || tags.leisure || tags.railway || tags.highway || tags.shop
        if (!amenity) continue
        
        const distance = calculerDistance(lat, lon, poiLat, poiLon)
        const categorie = determinerCategorie(amenity)
        
        pois.push({ type: amenity, categorie, distance: Math.round(distance) })
      }
    }
    
    // Calculer les scores par catégorie
    const categories: { categorie: string; score: number; count: number }[] = []
    
    for (const [catKey, config] of Object.entries(CATEGORIES)) {
      const poisCat = pois.filter(p => p.categorie === catKey)
      
      let score = 0
      if (poisCat.length > 0) {
        const countScore = Math.min(poisCat.length * 15, 60)
        const avgDistance = poisCat.reduce((sum, p) => sum + p.distance, 0) / poisCat.length
        const proximityScore = Math.max(0, 40 * (1 - avgDistance / rayon))
        score = Math.round(Math.min(100, countScore + proximityScore))
      }
      
      categories.push({
        categorie: catKey,
        score,
        count: poisCat.length
      })
    }
    
    // Score global pondéré
    const scoreGlobal = Math.round(
      categories.reduce((sum, cat) => {
        const poids = CATEGORIES[cat.categorie as keyof typeof CATEGORIES]?.poids || 10
        return sum + (cat.score * poids / 100)
      }, 0)
    )
    
    // Synthèse
    let synthese: string
    if (scoreGlobal >= 80) {
      synthese = '🌟 Quartier très bien équipé'
    } else if (scoreGlobal >= 60) {
      synthese = '👍 Quartier bien desservi'
    } else if (scoreGlobal >= 40) {
      synthese = '🚗 Véhicule conseillé'
    } else {
      synthese = '🏡 Zone calme, éloignée des services'
    }
    
    // Extraire les scores simplifiés
    const getScore = (cat: string) => categories.find(c => c.categorie === cat)?.score || 0
    
    const responseData = {
      success: true,
      data: {
        scoreGlobal,
        transports: getScore('transport'),
        commerces: getScore('commerce'),
        ecoles: getScore('education'),
        sante: getScore('sante'),
        espaceVerts: getScore('vert'),
        synthese
      },
      source: 'OpenStreetMap'
    }

    // Stocker en cache
    quartierCache.set(cacheKey, { data: responseData, timestamp: Date.now() })

    return NextResponse.json(responseData)
    
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'API OpenStreetMap timeout (15s)'
      : 'Erreur de connexion OpenStreetMap'
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    )
  }
}
