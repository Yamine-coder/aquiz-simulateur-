/**
 * API Route - Proxy Score Quartier (OpenStreetMap)
 * Appelle l'API Overpass côté serveur
 */

import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { ServerCache } from '@/lib/serverCache';
import { NextRequest, NextResponse } from 'next/server';

// Route dynamique (appelée côté client)

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const OVERPASS_FALLBACK_URL = 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'

// Cache serveur borné — POIs changent rarement (TTL 24h, max 200 entrées)
const quartierCache = new ServerCache<unknown>({ ttlMs: 24 * 60 * 60 * 1000, maxSize: 200 })

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
    // Commerces de proximité + courses quotidiennes
    amenities: ['supermarket', 'bakery', 'bank', 'post_office', 'convenience', 'marketplace', 'restaurant', 'cafe', 'butcher', 'tobacco', 'newsagent']
  },
  education: {
    label: 'Éducation',
    poids: 20,
    // Crèche (childcare) ajoutée — critère majeur pour familles
    amenities: ['school', 'kindergarten', 'college', 'university', 'library', 'childcare']
  },
  sante: {
    label: 'Santé',
    poids: 15,
    // Inclut amenity=* ET healthcare=* (doctor = healthcare:doctor, doctors = amenity:doctors)
    amenities: ['hospital', 'clinic', 'doctors', 'doctor', 'dentist', 'pharmacy']
  },
  loisirs: {
    label: 'Loisirs & Culture',
    poids: 10,
    // Culture, sport, monuments (restaurant/café/bar ici pour l'affichage Bien'ici)
    amenities: ['cinema', 'theatre', 'bar', 'sports_centre', 'fitness_centre', 'monument', 'memorial', 'museum']
  },
  vert: {
    label: 'Espaces verts',
    poids: 10,
    amenities: ['park', 'garden', 'playground']
  }
}

interface POI {
  type: string
  nom?: string
  categorie: string
  distance: number
  /** Coordonnées GPS du POI */
  lat: number
  lon: number
  /** Lignes de transport (parsées depuis route_ref) */
  lignes?: string[]
  /** Opérateur (RATP, SNCF, Keolis…) */
  operateur?: string
  /** Couleur de la ligne (hex) */
  couleur?: string
  /** Type OSM original avant reclassification (pour filtrage subway_entrance) */
  originalType?: string
}

/** Type de transport enrichi pour l'affichage */
type TypeTransport = 'metro' | 'rer' | 'train' | 'tram' | 'bus' | 'velo' | 'velib'

/** Rayon max par mode de transport (norme urbanisme APUR) */
const RAYON_PAR_MODE: Record<string, number> = {
  bus_stop: 500,
  bicycle_rental: 500,
  tram_stop: 1200,
  subway_entrance: 1000,
  rer_station: 2000,
  station: 2000,
  halt: 2000,
  train_station: 2000,
}

/** Vitesse piéton moyenne : ~4.5 km/h → 75 m/min */
const VITESSE_PIETON_M_PAR_MIN = 75

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
  if (['station', 'halt', 'tram_stop', 'subway_entrance', 'bus_stop', 'rer_station', 'stop_position', 'platform', 'stop'].includes(amenity)) return 'transport'
  if (['supermarket', 'bakery', 'convenience', 'marketplace', 'restaurant', 'cafe'].includes(amenity)) return 'commerce'
  // healthcare tags: doctor (sans s) = healthcare:doctor dans OSM
  if (['doctor', 'doctors', 'dentist', 'clinic', 'hospital'].includes(amenity)) return 'sante'
  if (['childcare'].includes(amenity)) return 'education'
  if (['fitness_centre', 'sports_centre'].includes(amenity)) return 'loisirs'
  if (['monument', 'memorial', 'museum'].includes(amenity)) return 'loisirs'
  if (['butcher', 'tobacco', 'newsagent'].includes(amenity)) return 'commerce'
  if (amenity === 'fuel') return 'commerce'
  // Amenities non reconnues : ignorer (évite d'inclure ferry_terminal, etc.)
  return ''
}

export async function GET(request: NextRequest) {
  // ── Rate Limiting ─────────────────────────────────────
  const ip = getClientIP(request.headers)
  const rateCheck = checkRateLimit(`analyse:${ip}`, RATE_LIMITS.analyse)
  if (!rateCheck.success) {
    return NextResponse.json(
      { success: false, error: 'Trop de requêtes. Veuillez patienter.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lon = parseFloat(searchParams.get('lon') || '0')
  const rayon = parseInt(searchParams.get('rayon') || '500')
  
  // ── Validation lat/lon ────────────────────────────────
  if (!lat || !lon || isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { success: false, error: 'Coordonnées invalides' },
      { status: 400 }
    )
  }
  
  try {
    // Vérifier le cache serveur (v2 : inclut rayon transport lourd dans la clé)
    const cacheKey = `v36_${lat}_${lon}_${rayon}`
    const cached = quartierCache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Construire la requête Overpass
    // IMPORTANT : ancrer les regex avec ^(...)$ pour éviter les faux positifs
    // Sans ancrage, "cafe" matche "internet_cafe", "school" matche "music_school", etc.
    const allAmenities = '^(' + Object.values(CATEGORIES)
      .flatMap(cat => cat.amenities)
      .join('|') + ')$'
    
    // Rayon élargi pour le transport lourd (RER, métro, gare) — on marche/prend un bus pour un RER
    const rayonTransportLourd = Math.max(rayon, 2000)
    
    // ── 3 requêtes séparées pour éviter les 429 (rate-limit) ──────────────
    
    // Requête 1 : POIs standards + bus + shops + vélos + gares proches (rayon normal)
    const queryBase = `
      [out:json][timeout:15];
      (
        node["amenity"~"${allAmenities}"](around:${rayon},${lat},${lon});
        way["amenity"~"${allAmenities}"](around:${rayon},${lat},${lon});
        node["healthcare"~"^(doctor|clinic|dentist|hospital|pharmacy)$"](around:${rayon},${lat},${lon});
        way["healthcare"~"^(doctor|clinic|dentist|hospital|pharmacy)$"](around:${rayon},${lat},${lon});
        node["leisure"~"^(park|garden|playground|fitness_centre|sports_centre)$"](around:${rayon},${lat},${lon});
        way["leisure"~"^(park|garden|playground|fitness_centre|sports_centre)$"](around:${rayon},${lat},${lon});
        node["highway"="bus_stop"](around:${rayon},${lat},${lon});
        node["shop"~"^(supermarket|bakery|convenience|butcher|tobacco|newsagent)$"](around:${rayon},${lat},${lon});
        node["amenity"="marketplace"](around:${rayon},${lat},${lon});
        node["historic"~"^(monument|memorial)$"](around:${rayon},${lat},${lon});
        way["historic"~"^(monument|memorial)$"](around:${rayon},${lat},${lon});
        node["tourism"="museum"](around:${rayon},${lat},${lon});
        way["tourism"="museum"](around:${rayon},${lat},${lon});
        node["amenity"="childcare"](around:${rayon},${lat},${lon});
        node["social_facility"="day_care"](around:${rayon},${lat},${lon});
        node["amenity"="bicycle_rental"](around:${rayon},${lat},${lon});
        node["amenity"="fuel"](around:${rayon},${lat},${lon});
        way["amenity"="fuel"](around:${rayon},${lat},${lon});
        node["railway"~"^(station|halt)$"](around:${rayon},${lat},${lon});
      );
      out center;
    `
    
    // Requête 2 : Nœuds transport lourd + tram + stop_positions (rayon élargi)
    // Les stop_position (railway=stop) sont les nœuds sur les voies référencés
    // par les relations de route — nécessaires pour le mapping stationToLines
    const queryTransportNodes = `
      [out:json][timeout:15];
      (
        node["railway"~"^(station|halt|tram_stop|subway_entrance|stop)$"](around:${rayonTransportLourd},${lat},${lon});
        node["public_transport"="station"](around:${rayonTransportLourd},${lat},${lon});
        node["public_transport"="platform"]["tram"="yes"](around:${rayonTransportLourd},${lat},${lon});
        node["public_transport"="stop_position"]["tram"="yes"](around:${rayonTransportLourd},${lat},${lon});
        node["station"~"^(subway|metro)$"](around:${rayonTransportLourd},${lat},${lon});
      );
      out tags center;
    `
    
    // Requête 3 : Relations de route (enrichissement lignes — optionnel)
    // Inclut "bus" en rayon réduit pour récupérer TOUTES les lignes de bus (pas juste les tags directs)
    const queryRelations = `
      [out:json][timeout:20];
      (
        rel["route"~"^(train|subway|light_rail|tram)$"]["ref"](around:${rayonTransportLourd},${lat},${lon});
        rel["route"="bus"]["ref"](around:${rayon},${lat},${lon});
      );
      out body;
    `

    // ── Pool de serveurs Overpass avec gestion 429 ──────────────────────
    const SERVERS = [OVERPASS_URL, OVERPASS_FALLBACK_URL]
    // Tracker les serveurs 429-bloqués pour cette requête
    const blocked429 = new Set<string>()

    async function fetchOverpass(query: string, timeoutMs: number, serverUrl: string): Promise<{ elements: unknown[] }> {
      const ctrl = new AbortController()
      const tid = setTimeout(() => ctrl.abort(), timeoutMs)
      try {
        const res = await fetch(serverUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: ctrl.signal,
        })
        clearTimeout(tid)
        if (res.status === 429) {
          blocked429.add(serverUrl)
          throw new Error(`429 rate-limited`)
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.json()
      } catch (e) {
        clearTimeout(tid)
        throw e
      }
    }

    /**
     * Fetch robuste avec rotation de serveurs :
     * 1. Essaie chaque serveur non-bloqué dans l'ordre
     * 2. Sur 429, marque le serveur comme bloqué et passe au suivant
     * 3. Délai de 1s entre les tentatives pour ne pas saturer
     */
    async function fetchWithRotation(query: string, timeoutMs: number, label: string): Promise<{ elements: unknown[] }> {
      const errors: string[] = []
      for (const server of SERVERS) {
        if (blocked429.has(server)) continue
        try {
          return await fetchOverpass(query, timeoutMs, server)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`${server}: ${msg}`)
          // Petit délai avant d'essayer le serveur suivant
          await new Promise(r => setTimeout(r, 1000))
        }
      }
      // Si tous les serveurs ont échoué, réessayer une dernière fois le fallback
      // même s'il a eu un 429 (il a peut-être récupéré)
      try {
        await new Promise(r => setTimeout(r, 2000))
        return await fetchOverpass(query, timeoutMs, OVERPASS_FALLBACK_URL)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`last-resort: ${msg}`)
      }
      console.error(`[Quartier API] ${label} failed on all servers:`, errors.join(' | '))
      return { elements: [] }
    }

    // ── Lancer les 3 requêtes : base (obligatoire), transport nodes + relations (best effort) ──
    // Base : obligatoire, lance en premier
    const basePromise = fetchWithRotation(queryBase, 18000, 'Base')
    
    // Transport nodes : décalé de 500ms pour éviter de saturer
    const transportNodesPromise = new Promise<{ elements: unknown[] }>(resolve => {
      setTimeout(() => {
        fetchWithRotation(queryTransportNodes, 18000, 'TransportNodes').then(resolve)
      }, 500)
    })
    
    // Relations : décalé de 1.5s, sur le serveur fallback de préférence (plus permissif)
    const relationsPromise = new Promise<{ elements: unknown[] }>(resolve => {
      setTimeout(() => {
        fetchWithRotation(queryRelations, 22000, 'Relations').then(resolve)
      }, 1500)
    })

    const [baseResult, transportNodesResult, relationsResult] = await Promise.all([
      basePromise, transportNodesPromise, relationsPromise
    ])

    // ── Assembler les résultats ──
    const routeRelations = ((relationsResult.elements || []) as Array<Record<string, unknown>>)
      .filter(e => e.type === 'relation')
    const transportNodes = (transportNodesResult.elements || []) as Array<Record<string, unknown>>

    // Construire le mapping stationNodeId → lignes depuis les relations de route
    const stationToLines = new Map<number, Set<string>>()
    // Regex pour valider un identifiant de ligne de transport (bus: "34", "124", "N12", "T3a", RER: "A", etc.)
    const VALID_LINE_REF = /^[A-Za-z]?\d{1,4}[A-Za-z]?(?:bis)?$/
    const VALID_RAIL_REF = /^[A-Z0-9]{1,4}(?:bis)?$/i
    for (const rel of routeRelations as Array<{ tags?: Record<string, string>; members?: Array<{ type: string; ref: number; role: string }> }>) {
      const ref = rel.tags?.ref // ex: "C", "A", "1", "T3a", "H", "J"
      if (!ref) continue
      // Valider le ref : doit être un identifiant court (pas "Selected", pas une phrase)
      const routeType = rel.tags?.route || ''
      const isRailRoute = ['train', 'subway', 'light_rail', 'tram'].includes(routeType)
      const refPattern = isRailRoute ? VALID_RAIL_REF : VALID_LINE_REF
      if (!refPattern.test(ref.trim())) continue
      const cleanRef = ref.trim()
      const members = rel.members || []
      for (const m of members) {
        if (m.type === 'node' && (m.role === 'stop' || m.role === 'stop_entry_only' || m.role === 'stop_exit_only' || m.role === '')) {
          if (!stationToLines.has(m.ref)) stationToLines.set(m.ref, new Set())
          stationToLines.get(m.ref)!.add(cleanRef)
        }
      }
    }

    const allElements = [...(baseResult.elements || []), ...transportNodes]
    
    // Parser les POIs (dédupliqués par ID d'élément OSM)
    const pois: POI[] = []
    const seenIds = new Set<number>()
    
    for (const element of allElements as Array<{ id?: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }>) {
        // Dédupliquer les éléments OSM qui apparaissent dans les 2 requêtes
        if (element.id && seenIds.has(element.id)) continue
        if (element.id) seenIds.add(element.id)
        
        const tags = element.tags || {}
        let poiLat = element.lat
        let poiLon = element.lon
        
        if (!poiLat && element.center) {
          poiLat = element.center.lat
          poiLon = element.center.lon
        }
        
        if (!poiLat || !poiLon) continue
        
        const amenity = tags.amenity || tags.healthcare || tags.leisure || tags.railway || tags.highway || tags.shop || tags.public_transport
          || tags.historic || tags.tourism
          || (tags.social_facility === 'day_care' ? 'childcare' : undefined)
        if (!amenity) continue
        
        // Ignorer les entrées de gare (ce sont des accès, pas des stations)
        if (amenity === 'train_station_entrance') continue
        
        const distance = calculerDistance(lat, lon, poiLat, poiLon)
        const categorie = determinerCategorie(amenity)
        if (!categorie) continue // Amenity non reconnue → ignorer
        const nom = tags.name || undefined

        // Déterminer le sous-type de station (metro, RER) via tags additionnels
        const stationTag = tags.station || ''
        const networkTag = tags.network || ''
        const typeRATP = (tags['type:RATP'] || '').toLowerCase()
        const isSubway = stationTag === 'subway' || stationTag === 'metro' || tags.subway === 'yes'
          || typeRATP === 'metro'
        const isRER = networkTag.toUpperCase().includes('RER') || stationTag === 'RER'
          || typeRATP === 'rer'
          || Object.keys(tags).some(k => /^ref:FR:RER/i.test(k))

        // Enrichir le type pour metro/RER/tram quand c'est un tag générique
        let enrichedType = amenity
        if ((amenity === 'station' || amenity === 'halt') && isSubway) {
          enrichedType = 'subway_entrance' // Traité comme métro
        } else if ((amenity === 'station' || amenity === 'halt') && isRER) {
          enrichedType = 'rer_station'
        } else if (amenity === 'platform' || amenity === 'stop_position' || amenity === 'stop') {
          if (tags.tram === 'yes' || tags.railway === 'tram_stop') {
            enrichedType = 'tram_stop'
          } else if (tags.subway === 'yes' || isSubway) {
            enrichedType = 'subway_entrance'
          } else if (tags.train === 'yes') {
            enrichedType = isRER ? 'rer_station' : 'train_station'
          } else if (tags.bus === 'yes') {
            enrichedType = 'bus_stop'
          }
        }

        // Capturer les métadonnées transport (lignes, opérateur, couleur)
        // Ne pas utiliser `ref` pour bicycle_rental (c'est le n° de borne Vélib', pas une ligne)
        // Ne pas utiliser `ref` pour subway_entrance (c'est le n° de sortie, ex: "1", pas la ligne)
        const routeRef = tags.route_ref || tags.line || tags['route_ref:bus'] || tags['route_ref:tram'] || undefined
        const skipRef = enrichedType === 'bicycle_rental' || amenity === 'subway_entrance' || enrichedType === 'subway_entrance'
        const ligneTag = !skipRef ? (tags.ref || undefined) : undefined
        // Mots à ignorer dans les lignes (ce ne sont pas des identifiants de ligne)
        const IGNORED_LINE_WORDS = new Set(['NAVETTE', 'NOCTILIEN', 'EXPRESS', 'DIRECT', 'SPECIAL', 'SCOLAIRE', 'TAD', 'FLEXO', 'FILEO', 'SELECTED', 'NULL', 'UNDEFINED', 'NONE', 'TEST'])
        const isIgnoredLine = (l: string): boolean => {
          const upper = l.toUpperCase()
          // Ignorer si le mot complet ou un de ses mots est dans la liste
          return IGNORED_LINE_WORDS.has(upper) || upper.split(/\s+/).some(w => IGNORED_LINE_WORDS.has(w))
        }
        let rawLignes = routeRef 
          ? routeRef.split(';').map((l: string) => l.trim()).filter(l => l && !isIgnoredLine(l)) 
          : ligneTag ? [ligneTag] : undefined

        // ── Enrichir les lignes depuis le tag `network` ("RER C; Transilien H" → ["C", "H"]) ──
        if ((!rawLignes || rawLignes.length === 0) && networkTag && categorie === 'transport') {
          const networkLines: string[] = []
          // Extraire les lettres/numéros après "RER", "Transilien", "Métro", "Tram"
          for (const part of networkTag.split(';').map(s => s.trim())) {
            const m = part.match(/(?:RER|Transilien|Métro|Tram)\s+([A-Z0-9][A-Za-z0-9]*)/i)
            if (m) networkLines.push(m[1].toUpperCase())
          }
          if (networkLines.length > 0) rawLignes = networkLines
        }

        // ── Enrichir les lignes depuis les tags spécifiques FR (ref:FR:RER, ref:FR:Transilien) ──
        // ATTENTION : ref:FR:RATP et ref:FR:SNCF sont des codes de STATION (ex: 1762), PAS des lignes !
        if ((!rawLignes || rawLignes.length === 0) && categorie === 'transport') {
          const frLines: string[] = []
          for (const [k, v] of Object.entries(tags)) {
            if (/^ref:FR:(RER|Transilien|Ligne)/i.test(k) && v) {
              frLines.push(...v.split(';').map(s => s.trim()).filter(Boolean))
            }
          }
          if (frLines.length > 0) rawLignes = frLines
        }

        // ── Enrichir depuis les relations de route (stationToLines) ──
        if ((!rawLignes || rawLignes.length === 0) && element.id && stationToLines.has(element.id)) {
          rawLignes = [...stationToLines.get(element.id)!]
        }

        // Extraire la ligne depuis le nom : "Gare Ermont (RER C)" → "C"
        if ((!rawLignes || rawLignes.length === 0) && nom) {
          const nameMatch = nom.match(/\((?:RER|ligne|Métro|Tram)\s+([A-Z0-9][A-Za-z0-9]*)\)/i)
          if (nameMatch) rawLignes = [nameMatch[1].toUpperCase()]
        }

        // Fallback : extraire la ligne depuis le tag wikipedia ("fr:Gare de ... (ligne A du RER)")
        if ((!rawLignes || rawLignes.length === 0) && tags.wikipedia) {
          const wikiMatch = tags.wikipedia.match(/ligne\s+([A-Z0-9])\s+du\s+(?:RER|métro|tramway)/i)
          if (wikiMatch) rawLignes = [wikiMatch[1].toUpperCase()]
        }
        // Dédupliquer et normaliser les lignes ("124 Vincennes" → "124" si "124" existe déjà)
        const lignes = rawLignes ? [...new Set(rawLignes)].reduce<string[]>((acc, l) => {
          // Extraire l'identifiant de ligne (partie alphanumérique avant la destination)
          const match = l.match(/^([A-Za-z]?\d+[A-Za-z]?)(?:\s|$)/)
          const lineId = match ? match[1] : null
          // Si c'est une variante directionnelle (ex: "124 Vincennes") et que le numéro existe déjà, skip
          if (lineId && l !== lineId && acc.includes(lineId)) return acc
          // Si on a déjà une variante et qu'on ajoute le numéro court, remplacer
          if (lineId && l === lineId) {
            const idx = acc.findIndex(a => a.startsWith(lineId + ' '))
            if (idx >= 0) acc[idx] = lineId
            else if (!acc.includes(l)) acc.push(l)
            return acc
          }
          if (!acc.includes(l)) acc.push(l)
          return acc
        }, []) : undefined
        const operateur = tags.operator || tags.network || undefined
        const couleur = tags.colour || tags.color || undefined
        
        pois.push({ type: enrichedType, nom, categorie, distance: Math.round(distance), lat: poiLat, lon: poiLon!, lignes, operateur, couleur, originalType: amenity })
    }

    // ── Post-traitement : filtrer les "garden" sans nom (pelouses HLM, jardins privés) ──
    // OSM contient des centaines de micro-jardins résidentiels non pertinents
    const beforeGarden = pois.length
    const filteredPois = pois.filter(p => {
      if (p.type === 'garden' && (!p.nom || p.nom === 'garden')) return false
      return true
    })
    if (filteredPois.length < beforeGarden) {
      pois.length = 0
      pois.push(...filteredPois)
    }

    // ── Post-traitement : dédupliquer node/way pour un même POI ──
    // OSM modélise souvent un lieu comme node (point) ET way (bâtiment) → 2 entrées
    // pour le même commerce. On fusionne par :
    // - (type + nom identique) si distance < 30m (même lieu nommé)
    // - (type identique) si distance < 15m quand les deux sont sans nom (node vs way center)
    const nonTransportPois = pois.filter(p => p.categorie !== 'transport')
    const dedupTransportPois = pois.filter(p => p.categorie === 'transport')
    const dedupedNonTransport: POI[] = []
    for (const poi of nonTransportPois) {
      const isDup = dedupedNonTransport.some(existing => {
        if (existing.type !== poi.type) return false
        const dist = calculerDistance(existing.lat, existing.lon, poi.lat, poi.lon!)
        // Même nom + même type + < 30m
        if (existing.nom && poi.nom && existing.nom === poi.nom && dist < 30) return true
        // Même type + très proches (< 15m) = node vs way du même lieu
        if (dist < 15) return true
        return false
      })
      if (!isDup) dedupedNonTransport.push(poi)
    }
    pois.length = 0
    pois.push(...dedupedNonTransport, ...dedupTransportPois)

    // ── Post-traitement : dédupliquer les arrêts de bus proches (< 50m) ──
    // Un même arrêt physique génère 2+ nœuds OSM (un par direction)
    const busStops = pois.filter(p => p.type === 'bus_stop' && p.categorie === 'transport')
    const removedBusIds = new Set<number>()
    for (let i = 0; i < busStops.length; i++) {
      if (removedBusIds.has(i)) continue
      for (let j = i + 1; j < busStops.length; j++) {
        if (removedBusIds.has(j)) continue
        // Même arrêt si distance inter-nœuds < 50m (approximation via distance au centre)
        const distDiff = Math.abs(busStops[i].distance - busStops[j].distance)
        const sameName = busStops[i].nom && busStops[j].nom && busStops[i].nom === busStops[j].nom
        if (sameName || distDiff < 50) {
          // Fusionner les lignes dans le survivant
          if (busStops[j].lignes) {
            if (!busStops[i].lignes) busStops[i].lignes = []
            const lignesJ = busStops[j].lignes!
            for (const l of lignesJ) {
              if (!busStops[i].lignes!.includes(l)) busStops[i].lignes!.push(l)
            }
          }
          removedBusIds.add(j)
        }
      }
    }
    // Retirer les bus stops dédupliqués
    const busStopsToRemove = new Set(removedBusIds)
    const busStopIndices = busStops.map((_, idx) => idx)
    const busStopsInPois = pois.filter(p => p.type === 'bus_stop' && p.categorie === 'transport')
    for (let idx = busStopIndices.length - 1; idx >= 0; idx--) {
      if (busStopsToRemove.has(idx)) {
        const poiIdx = pois.indexOf(busStopsInPois[idx])
        if (poiIdx >= 0) pois.splice(poiIdx, 1)
      }
    }

    // ── Post-traitement : reclassifier les subway_entrance proches d'une gare RER ──
    // Les entrées physiques (subway_entrance) d'une gare RER doivent être typées RER, pas métro
    const rerStations = pois.filter(p => p.type === 'rer_station' || p.type === 'station' || p.type === 'halt')
    for (const poi of pois) {
      if (poi.type === 'subway_entrance' && poi.categorie === 'transport') {
        // Trouver une gare RER/station réellement proche (Haversine entre POIs)
        // On utilise la distance au centre comme proxy max — deux POIs à d1 et d2 du centre
        // sont au max à d1+d2 l'un de l'autre (inégalité triangulaire)
        const nearbyRERStation = rerStations.find(s => {
          if (s === poi) return false
          const op = (s.operateur || '').toUpperCase()
          const isRERType = op.includes('RER') || op.includes('TRANSILIEN') || s.type === 'rer_station'
          if (!isRERType) return false
          // Distance max entre les 2 POIs ≤ d1 + d2 (inégalité triangulaire)
          // Si la borne sup < 400m, ils sont certainement proches
          const maxDist = Math.abs(s.distance - poi.distance)
          return maxDist < 400
        })
        if (nearbyRERStation) {
          poi.type = 'rer_station'
          // Hériter les lignes de la gare parente si pas de lignes propres
          if ((!poi.lignes || poi.lignes.length === 0) && nearbyRERStation.lignes && nearbyRERStation.lignes.length > 0) {
            poi.lignes = [...nearbyRERStation.lignes]
          }
        }
      }
    }

    // ── Post-traitement 2 : propager les lignes entre stations RER proches ──
    // Si "Neuilly-Plaisance" est RER sans ligne, mais "Val-de-Fontenay (RER A)" 
    // à proximité a la ligne "A", propager "A" vers Neuilly-Plaisance
    const rerPois = pois.filter(p => p.type === 'rer_station' && p.categorie === 'transport')
    for (const poi of rerPois) {
      if (poi.lignes && poi.lignes.length > 0) continue // déjà des lignes
      // Chercher d'autres stations RER proches qui ont des lignes
      const donors = rerPois.filter(s => 
        s !== poi && s.lignes && s.lignes.length > 0 &&
        Math.abs(s.distance - poi.distance) < 2000
      )
      if (donors.length > 0) {
        // Prendre les lignes de la station la plus proche
        const closest = donors.sort((a, b) => a.distance - b.distance)[0]
        poi.lignes = [...(closest.lignes ?? [])]
      }
    }
    
    // ── Poids de comptage par mode de transport (logique métier immobilier FR) ──
    // Métro/RER = impact majeur sur la valeur (+5-15% prix), bus = marginal
    const POIDS_COUNT_TRANSPORT: Record<string, number> = {
      subway_entrance: 25,  // Métro = premium mobilité
      rer_station: 25,      // RER = premium mobilité
      station: 20,          // Gare Transilien/TER
      halt: 20,             // Halte ferroviaire
      train_station: 20,    // Gare grandes lignes
      tram_stop: 18,        // Tramway = bonne desserte
      bus_stop: 8,          // Bus = desserte de base
      bicycle_rental: 5,    // Vélo en libre-service
    }

    // Calculer les scores par catégorie
    const categories: { categorie: string; score: number; count: number }[] = []
    
    for (const [catKey, config] of Object.entries(CATEGORIES)) {
      const poisCat = pois.filter(p => p.categorie === catKey)
      
      let score = 0
      if (poisCat.length > 0) {
        let countScore: number
        let proximityScore: number

        if (catKey === 'transport') {
          // Score de comptage pondéré par mode (métro/RER vaut plus qu'un bus)
          const weightedCount = poisCat.reduce((sum, p) => {
            return sum + (POIDS_COUNT_TRANSPORT[p.type] ?? 10)
          }, 0)
          countScore = Math.min(weightedCount, 60)

          // Score de proximité pondéré par mode
          const withProx = poisCat.map(p => {
            const maxDist = RAYON_PAR_MODE[p.type] ?? rayon
            return Math.max(0, 1 - p.distance / maxDist)
          })
          proximityScore = withProx.length > 0
            ? 40 * (withProx.reduce((s, v) => s + v, 0) / withProx.length)
            : 0
        } else {
          // Catégories non-transport : scoring logarithmique pour mieux différencier
          // Les petits nombres comptent beaucoup, les grands saturent progressivement
          const COUNT_THRESHOLDS: Record<string, number> = {
            commerce: 40,    // 40 commerces = score max (centre-ville dense IDF)
            education: 12,   // 12 écoles = score max
            sante: 12,       // 12 établissements = score max
            loisirs: 8,      // 8 lieux = score max
            vert: 10,        // 10 espaces verts = score max
          }
          const threshold = COUNT_THRESHOLDS[catKey] ?? 15
          // Courbe logarithmique : progression rapide au début, lente ensuite
          // À threshold/2 POIs → ~70% du score, à threshold → ~90%
          countScore = Math.round(60 * Math.min(1, Math.log(1 + poisCat.length) / Math.log(1 + threshold)))
          const avgDistance = poisCat.reduce((sum, p) => sum + p.distance, 0) / poisCat.length
          proximityScore = Math.max(0, 40 * (1 - avgDistance / rayon))
        }
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
    
    // Synthèse (sans emojis — incompatibles @react-pdf/renderer)
    let synthese: string
    if (scoreGlobal >= 80) {
      synthese = 'Quartier très bien équipé'
    } else if (scoreGlobal >= 60) {
      synthese = 'Quartier bien desservi'
    } else if (scoreGlobal >= 40) {
      synthese = 'Véhicule conseillé'
    } else {
      synthese = 'Zone calme, éloignée des services'
    }
    
    // Extraire les scores simplifiés
    const getScore = (cat: string) => categories.find(c => c.categorie === cat)?.score || 0
    
    // Construire la liste de transports proches enrichie (dédupliqués par nom)
    // Filtrer les subway_entrance qui sont des doublons d'entrées physiques
    // d'une gare/station déjà capturée à proximité
    const heavyStationTypes = ['rer_station', 'station', 'halt', 'train_station']
    const transportPois = pois
      .filter(p => p.categorie === 'transport')
      .filter(p => {
        // Garder tous les POIs qui n'étaient pas à l'origine des subway_entrance
        if (p.originalType !== 'subway_entrance') return true
        // subway_entrance (même reclassé en rer_station) : garder seulement
        // s'il n'y a PAS de gare/station «parente» à proximité
        const hasParentStation = pois.some(s => 
          s !== p && s.originalType !== 'subway_entrance' &&
          heavyStationTypes.includes(s.type) && s.categorie === 'transport' &&
          Math.abs(s.distance - p.distance) < 600
        )
        return !hasParentStation
      })
      .sort((a, b) => a.distance - b.distance)

    // Fusionner les arrêts proches portant le même nom (ex: 2 quais d'un même arrêt)
    const stationMap = new Map<string, {
      type: string
      nom: string
      distance: number
      lat: number
      lon: number
      lignes: string[]
      operateur?: string
      couleur?: string
    }>()

    // Groupe de transport pour la fusion par nom :
    // Séparer metro / RER+train / tram / bus / velo
    // On ne fusionne JAMAIS un métro avec une gare RER du même nom
    function getTransportGroup(type: string): string {
      if (type === 'subway_entrance') return 'metro'
      if (['rer_station', 'station', 'halt', 'train_station'].includes(type)) return 'rer_train'
      if (type === 'tram_stop') return 'tram'
      if (type === 'bicycle_rental') return 'velo'
      return 'bus'
    }

    for (const p of transportPois) {
      // Ignorer les entrées sans nom (doublons physiques ou bus stops inutiles)
      if (!p.nom && (p.type === 'subway_entrance' || p.type === 'rer_station' || p.type === 'bus_stop')) continue

      // Normaliser le nom pour fusionner les doublons :
      // "Val-de-Fontenay (RER A)" et "Val de Fontenay" → même clé "val de fontenay"
      const rawName = (p.nom || getLabelTransport(p.type))
      const normalizedName = rawName
        .toLowerCase()
        .replace(/[-–—]/g, ' ')           // tirets → espaces
        .replace(/\s*\([^)]*\)\s*/g, ' ') // supprimer (RER A), (2019), etc.
        .replace(/\s*(rer|gare)\s*$/i, '') // supprimer suffixe "RER" / "Gare"
        .replace(/\s+/g, ' ')
        .trim()
      // Clé composite : groupe + nom normalisé → empêche bus "Neuilly" de fusionner avec gare "Neuilly"
      const key = `${getTransportGroup(p.type)}:${normalizedName}`
      const existing = stationMap.get(key)
      if (existing) {
        // Fusionner les lignes et garder la distance la plus courte
        if (p.lignes) {
          for (const l of p.lignes) {
            // Vérifier doublon exact ou variante directionnelle ("124 Vincennes" vs "124")
            const match = l.match(/^([A-Za-z]?\d+[A-Za-z]?)(?:\s|$)/)
            const lineId = match ? match[1] : null
            const isDuplicate = existing.lignes.includes(l)
              || (lineId && existing.lignes.includes(lineId))
              || (lineId && existing.lignes.some(el => el.startsWith(lineId + ' ')))
            if (!isDuplicate) existing.lignes.push(l)
          }
        }
        if (p.distance < existing.distance) {
          existing.distance = p.distance
          existing.lat = p.lat
          existing.lon = p.lon
        }
        // Préférer le nom le plus court/propre (sans parenthèses)
        if (rawName.length < existing.nom.length && !rawName.includes('(')) {
          existing.nom = rawName
        }
        // Préférer le type le plus "lourd" (metro > rer > train > tram > bus)
        const prio = ['subway_entrance', 'rer_station', 'station', 'train_station', 'tram_stop', 'bus_stop', 'bicycle_rental']
        if (prio.indexOf(p.type) < prio.indexOf(existing.type)) {
          existing.type = p.type
        }
      } else {
        stationMap.set(key, {
          type: p.type,
          nom: p.nom || getLabelTransport(p.type),
          distance: p.distance,
          lat: p.lat,
          lon: p.lon,
          lignes: p.lignes ? [...p.lignes] : [],
          operateur: p.operateur,
          couleur: p.couleur,
        })
      }
    }

    // Filtrer les stations hors de leur rayon de pertinence par mode
    const filteredStations = [...stationMap.values()].filter(s => {
      const maxDist = RAYON_PAR_MODE[s.type] ?? 800
      return s.distance <= maxDist
    })

    // Sélection intelligente : priorité aux transports lourds,
    // max 6 affichés, max 2 par type, max 1 vélo
    const TYPE_ORDER = ['subway_entrance', 'rer_station', 'station', 'train_station', 'tram_stop', 'bus_stop', 'bicycle_rental']
    // Limites par type (vélo = 1, les autres = 2)
    const MAX_PER_TYPE: Record<string, number> = { bicycle_rental: 1 }
    const MAX_TOTAL = 6

    // Tri : par type (lourds d'abord), puis stations AVEC lignes avant celles sans, puis distance
    const allStations = filteredStations.sort((a, b) => {
      const typeA = TYPE_ORDER.indexOf(a.type) >= 0 ? TYPE_ORDER.indexOf(a.type) : 99
      const typeB = TYPE_ORDER.indexOf(b.type) >= 0 ? TYPE_ORDER.indexOf(b.type) : 99
      if (typeA !== typeB) return typeA - typeB
      // Même type : prioriser ceux qui ont des lignes connues
      const aHasLines = a.lignes.length > 0 ? 0 : 1
      const bHasLines = b.lignes.length > 0 ? 0 : 1
      if (aHasLines !== bHasLines) return aHasLines - bHasLines
      return a.distance - b.distance
    })
    
    const selected: typeof allStations = []
    const countByType = new Map<string, number>()
    
    // Pass 1 : 1 station par type (la plus proche de chaque, sauf vélo en dernier)
    for (const type of TYPE_ORDER) {
      if (selected.length >= MAX_TOTAL) break
      const station = allStations.find(s => s.type === type)
      if (station && !selected.includes(station)) {
        selected.push(station)
        countByType.set(type, 1)
      }
    }
    // Pass 2 : compléter avec les 2e plus proches (transports lourds d'abord)
    for (const s of allStations) {
      if (selected.length >= MAX_TOTAL) break
      if (selected.includes(s)) continue
      const maxForType = MAX_PER_TYPE[s.type] ?? 2
      const count = countByType.get(s.type) || 0
      if (count >= maxForType) continue
      selected.push(s)
      countByType.set(s.type, count + 1)
    }
    // Trier : transports lourds d'abord par type, puis par distance dans chaque type
    const typeWeight = (t: string) => TYPE_ORDER.indexOf(t) >= 0 ? TYPE_ORDER.indexOf(t) : 99
    selected.sort((a, b) => typeWeight(a.type) - typeWeight(b.type) || a.distance - b.distance)

    // Propager les lignes : si une station RER/métro/train n'a pas de lignes,
    // hériter des lignes de la plus proche du même type
    for (const s of selected) {
      if (s.lignes.length === 0 && ['rer_station', 'subway_entrance', 'station', 'train_station'].includes(s.type)) {
        const donor = selected.find(d => d.type === s.type && d.lignes.length > 0)
        if (donor) s.lignes = [...donor.lignes]
      }
    }

    // Reclassifier le type selon les lignes résolues
    // ET nettoyer les lignes qui ne correspondent pas au type
    const KNOWN_METRO = new Set(['1','2','3','3bis','4','5','6','7','7bis','8','9','10','11','12','13','14'])
    const KNOWN_RER = new Set(['A','B','C','D','E'])
    const KNOWN_TRANSILIEN = new Set(['H','J','K','L','N','P','R','U'])
    for (const s of selected) {
      if (s.lignes.length > 0) {
        const allMetro = s.lignes.every(l => KNOWN_METRO.has(l))
        const allRER = s.lignes.every(l => KNOWN_RER.has(l.toUpperCase()))
        if (allMetro && s.type !== 'subway_entrance') {
          s.type = 'subway_entrance' // Reclassifier en métro
        } else if (allRER && s.type !== 'rer_station') {
          s.type = 'rer_station' // Reclassifier en RER
        }
        // Nettoyer les lignes qui ne correspondent pas au type final
        if (s.type === 'subway_entrance') {
          s.lignes = s.lignes.filter(l => KNOWN_METRO.has(l))
        } else if (s.type === 'rer_station') {
          s.lignes = s.lignes.filter(l => KNOWN_RER.has(l.toUpperCase()) || KNOWN_TRANSILIEN.has(l.toUpperCase()))
        } else if (s.type === 'train_station' || s.type === 'station' || s.type === 'halt') {
          s.lignes = s.lignes.filter(l => KNOWN_TRANSILIEN.has(l.toUpperCase()) || KNOWN_RER.has(l.toUpperCase()))
        }
      }
    }

    /** Nettoie le nom d'une station pour l'affichage (supprime suffixes, parenthèses) */
    function cleanStationName(nom: string): string {
      return nom
        .replace(/\s*\([^)]*\)\s*/g, ' ')  // supprimer (RER A), (2019), etc.
        .replace(/\s+(RER|Gare|SNCF|RATP)\s*$/i, '') // supprimer suffixes
        .replace(/\s+/g, ' ')
        .trim()
    }

    const transportsProches = selected
      .map(s => ({
        type: s.type,
        typeTransport: getTypeTransport(s.type, s.operateur) as string,
        nom: cleanStationName(s.nom),
        distance: s.distance,
        lat: s.lat,
        lon: s.lon,
        walkMin: Math.max(1, Math.round(s.distance / VITESSE_PIETON_M_PAR_MIN)),
        lignes: s.lignes.length > 0 ? s.lignes : undefined,
        operateur: s.operateur,
        couleur: s.couleur,
      }))

    // ── Transport summary (agrégation de TOUTES les stations du rayon) ──
    // Utilisé pour la section "Transports à proximité" style Bien'ici dans le PDF
    const summaryMap: Record<string, { lignes: Set<string>; count: number; minWalk: number }> = {}
    for (const s of filteredStations) {
      const t = getTypeTransport(s.type, s.operateur) as string
      if (!summaryMap[t]) summaryMap[t] = { lignes: new Set(), count: 0, minWalk: Infinity }
      summaryMap[t].count++
      const walk = Math.max(1, Math.round(s.distance / VITESSE_PIETON_M_PAR_MIN))
      if (walk < summaryMap[t].minWalk) summaryMap[t].minWalk = walk
      for (const l of s.lignes) {
        const clean = l.split(':')[0].split(' ')[0].trim()
        if (!clean) continue
        // Validate line against type
        if (t === 'metro' && !KNOWN_METRO.has(clean)) continue
        if (t === 'rer' && !KNOWN_RER.has(clean.toUpperCase())) continue
        if (t === 'train' && !KNOWN_TRANSILIEN.has(clean.toUpperCase())) continue
        // Bus/tram: only keep valid short alphanumeric refs (no garbage words like "Selected")
        if ((t === 'bus' || t === 'tram') && !/^[A-Za-z]?\d{1,4}[A-Za-z]?(?:bis)?$/.test(clean)) continue
        summaryMap[t].lignes.add(clean)
      }
    }
    // Count fuel stations (station service)
    const fuelCount = pois.filter(p => p.type === 'fuel').length
    // Count bicycle_rental — split Vélib' (operator=Smovengo) vs generic vélo
    const velibCount = filteredStations.filter(s => {
      if (s.type !== 'bicycle_rental') return false
      const op = (s.operateur || '').toLowerCase()
      return op.includes('vélib') || op.includes('velib') || op.includes('smovengo')
    }).length
    const veloGenericCount = filteredStations.filter(s => {
      if (s.type !== 'bicycle_rental') return false
      const op = (s.operateur || '').toLowerCase()
      return !(op.includes('vélib') || op.includes('velib') || op.includes('smovengo'))
    }).length
    const transportSummary = Object.entries(summaryMap)
      .map(([type, data]) => ({
        type,
        lignes: [...data.lignes].sort(),
        count: type === 'velib' ? velibCount : type === 'velo' ? veloGenericCount : data.count,
        nearestWalkMin: data.minWalk === Infinity ? undefined : data.minWalk,
      }))
      .filter(t => t.count > 0 || t.lignes.length > 0)
    if (fuelCount > 0) {
      transportSummary.push({ type: 'fuel', lignes: [], count: fuelCount, nearestWalkMin: undefined })
    }

    // Extraire les comptages bruts par catégorie
    const getCount = (cat: string) => categories.find(c => c.categorie === cat)?.count || 0

    // Comptages détaillés par type d'amenity (style Bien'ici "Dans le quartier")
    const AMENITY_LABELS: Record<string, string> = {
      // Loisirs & Sorties (affiché sous "Si on sortait ?")
      bar: 'Bar', restaurant: 'Restaurant', cafe: 'Café', cinema: 'Cinéma', theatre: 'Théâtre',
      monument: 'Monument historique', memorial: 'Monument historique', museum: 'Musée',
      park: 'Parc, Jardin et Square', garden: 'Parc, Jardin et Square', playground: 'Parc, Jardin et Square',
      fitness_centre: 'Terrain et Salle de sport', sports_centre: 'Terrain et Salle de sport',
      // Commerces (affiché sous "N'oubliez pas de faire les courses")
      supermarket: 'Supermarché et Hypermarché', bakery: 'Boulangerie', convenience: 'Supérette',
      bank: 'Banque', post_office: 'Bureau de poste', marketplace: 'Marché de quartier',
      butcher: 'Boucherie', tobacco: 'Presse et Tabac', newsagent: 'Presse et Tabac',
      fuel: 'Station service',
      // Éducation
      school: 'École primaire', kindergarten: 'École maternelle', college: 'Collège',
      university: 'Lycée / Université', library: 'Bibliothèque', childcare: 'Crèche',
      // Santé
      hospital: 'Hôpital', clinic: 'Clinique', doctors: 'Médecin',
      doctor: 'Médecin', dentist: 'Dentiste', pharmacy: 'Pharmacie',
      // Transports
      bus_stop: 'Arrêt de bus', tram_stop: 'Arrêt de tram',
      subway_entrance: 'Station de métro', train_station: 'Gare',
      bicycle_rental: 'Vélo en libre-service',
      rer_station: 'Gare RER', station: 'Gare', halt: 'Halte ferroviaire',
      stop_position: 'Arrêt', platform: 'Quai', stop: 'Arrêt',
    }

    /**
     * Sous-catégorise un POI `school` par son nom OSM.
     * Le tag amenity=school dans OSM couvre TOUT : maternelles, primaires,
     * collèges, lycées, groupes scolaires, écoles privées.
     */
    function getSchoolLabel(nom?: string): string {
      if (!nom) return 'École'
      const lower = nom.toLowerCase()
      if (lower.includes('maternelle')) return 'École maternelle'
      if (lower.includes('élémentaire') || lower.includes('elementaire') || lower.includes('primaire')) return 'École primaire'
      if (lower.includes('collège') || lower.includes('college')) return 'Collège'
      if (lower.includes('lycée') || lower.includes('lycee')) return 'Lycée'
      if (lower.includes('université') || lower.includes('universite') || lower.includes('dnmade') || lower.includes('iut') || lower.includes('bts')) return 'Université'
      if (lower.includes('groupe scolaire')) return 'Groupe scolaire'
      return 'École'
    }

    // ── Rayon d'affichage réduit pour les comptages "Dans la commune" ──
    // Rayon d'affichage = rayon de requête (800m ≈ 10 min à pied).
    // Cohérent en zone dense (Paris) et parlant en zone péri-urbaine/rurale.
    const DISPLAY_RADIUS = 800

    // ── Catégories d'affichage (style Bien'ici) ──
    // Différentes des catégories de scoring : restaurant/café/park/sport regroupés en "loisirs"
    const DISPLAY_GROUPS: Record<string, Set<string>> = {
      loisirs: new Set(['bar', 'restaurant', 'cafe', 'cinema', 'theatre', 'monument', 'memorial', 'museum', 'park', 'garden', 'playground', 'sports_centre', 'fitness_centre']),
      commerce: new Set(['supermarket', 'bakery', 'bank', 'post_office', 'convenience', 'marketplace', 'butcher', 'tobacco', 'newsagent', 'fuel']),
      education: new Set(['school', 'kindergarten', 'college', 'university', 'library', 'childcare']),
      sante: new Set(['hospital', 'clinic', 'doctors', 'doctor', 'dentist', 'pharmacy']),
    }

    const detailedCounts: Record<string, Array<{ type: string; label: string; count: number }>> = {}
    for (const [displayKey, typeSet] of Object.entries(DISPLAY_GROUPS)) {
      const maxDist = DISPLAY_RADIUS
      const poisDisplay = pois.filter(p => typeSet.has(p.type) && p.distance <= maxDist)
      // Grouper par label (pas par type brut) pour fusionner types consolidés
      const labelCounts = new Map<string, number>()
      for (const p of poisDisplay) {
        let label: string
        if (p.type === 'school') {
          // Sous-catégoriser école par nom (lycée, collège, primaire, etc.)
          label = getSchoolLabel(p.nom)
        } else {
          label = AMENITY_LABELS[p.type] || p.type
        }
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1)
      }
      detailedCounts[displayKey] = [...labelCounts.entries()]
        .map(([label, count]) => ({ type: label, label, count }))
        .sort((a, b) => b.count - a.count)
    }

    const responseData = {
      success: true,
      data: {
        scoreGlobal,
        transports: getScore('transport'),
        commerces: getScore('commerce'),
        ecoles: getScore('education'),
        sante: getScore('sante'),
        espaceVerts: getScore('vert'),
        synthese,
        transportsProches,
        transportSummary,
        /** Comptages bruts de POIs par catégorie (rayon complet 500m — scoring) */
        counts: {
          transport: getCount('transport'),
          commerce: getCount('commerce'),
          education: getCount('education'),
          sante: getCount('sante'),
          loisirs: getCount('loisirs'),
          vert: getCount('vert'),
        },
        /** Comptages détaillés par type d'amenity — rayon réduit 250m (affichage) */
        detailedCounts,
      },
      source: 'OpenStreetMap'
    }

    // Stocker en cache
    quartierCache.set(cacheKey, responseData)

    return NextResponse.json(responseData)
    
  } catch (error) {
    const errMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.error(`[Quartier] Erreur pour (${request.nextUrl.searchParams.get('lat')}, ${request.nextUrl.searchParams.get('lon')}):`, errMsg)
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'API OpenStreetMap timeout (15s)'
      : `Erreur de connexion OpenStreetMap: ${errMsg}`
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    )
  }
}

/** Label lisible pour un type de transport OSM */
function getLabelTransport(type: string): string {
  switch (type) {
    case 'bus_stop': return 'Arrêt de bus'
    case 'tram_stop': return 'Arrêt de tramway'
    case 'subway_entrance': return 'Station de métro'
    case 'rer_station': return 'Gare RER'
    case 'station': return 'Gare'
    case 'halt': return 'Gare'
    case 'train_station': return 'Gare'
    case 'bicycle_rental': return 'Station vélos'
    default: return 'Transport'
  }
}

/** Détermine le type de transport enrichi à partir du type OSM et de l'opérateur */
function getTypeTransport(osmType: string, operateur?: string): TypeTransport {
  const op = (operateur || '').toLowerCase()
  
  // Type explicite RER
  if (osmType === 'rer_station') return 'rer'
  
  // RER / Transilien d\u00e9tect\u00e9 via op\u00e9rateur
  if (op.includes('rer') || op.includes('transilien')) {
    if (osmType === 'train_station' || osmType === 'station' || osmType === 'halt') return 'rer'
  }
  
  switch (osmType) {
    case 'subway_entrance': return 'metro'
    case 'station':
    case 'halt':
    case 'train_station': return 'train'
    case 'tram_stop': return 'tram'
    case 'bus_stop': return 'bus'
    case 'bicycle_rental': {
      // Distinguer Vélib' (Smovengo) des vélos génériques
      const bikeOp = (operateur || '').toLowerCase()
      if (bikeOp.includes('vélib') || bikeOp.includes('velib') || bikeOp.includes('smovengo')) return 'velib'
      return 'velo'
    }
    default: return 'bus'
  }
}
