/**
 * Service Score Quartier
 * 
 * Utilise OpenStreetMap (Overpass API) pour analyser les commodités
 * Source: OpenStreetMap - 100% GRATUIT et Open Source
 * 
 * Évalue la qualité de vie du quartier :
 * - Transports en commun
 * - Commerces de proximité
 * - Écoles et crèches
 * - Espaces verts
 * - Santé
 * - Loisirs et culture
 */

// ============================================
// TYPES
// ============================================

export interface POI {
  type: string
  nom: string
  distance: number // en mètres
  categorie: 'transport' | 'commerce' | 'education' | 'sante' | 'loisirs' | 'vert'
}

export interface ScoreCategorie {
  categorie: string
  score: number // 0-100
  count: number
  details: string[]
}

export interface ScoreQuartierResult {
  success: boolean
  data?: {
    scoreGlobal: number // 0-100
    categories: ScoreCategorie[]
    pois: POI[]
    synthese: string
    points: string[]
  }
  error?: string
  source: string
}

// ============================================
// CONFIGURATION OVERPASS
// ============================================

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Catégories et leur poids dans le score
const CATEGORIES = {
  transport: {
    label: '🚇 Transports',
    poids: 25,
    amenities: ['bus_stop', 'tram_stop', 'subway_entrance', 'train_station', 'bicycle_rental']
  },
  commerce: {
    label: '🛒 Commerces',
    poids: 20,
    amenities: ['supermarket', 'bakery', 'pharmacy', 'bank', 'post_office', 'convenience']
  },
  education: {
    label: '🏫 Éducation',
    poids: 20,
    amenities: ['school', 'kindergarten', 'college', 'university', 'library']
  },
  sante: {
    label: '🏥 Santé',
    poids: 15,
    amenities: ['hospital', 'clinic', 'doctors', 'dentist', 'pharmacy']
  },
  loisirs: {
    label: '🎭 Loisirs',
    poids: 10,
    amenities: ['cinema', 'theatre', 'restaurant', 'cafe', 'bar', 'sports_centre', 'gym']
  },
  vert: {
    label: '🌳 Espaces verts',
    poids: 10,
    amenities: ['park', 'garden', 'playground']
  }
}

// ============================================
// API OVERPASS (OpenStreetMap)
// ============================================

/**
 * Récupère le score quartier pour une position
 * 100% GRATUIT - OpenStreetMap
 */
export async function fetchScoreQuartier(
  latitude: number,
  longitude: number,
  rayon: number = 800 // mètres
): Promise<ScoreQuartierResult> {
  try {
    // Construire la requête Overpass
    const query = buildOverpassQuery(latitude, longitude, rayon)
    
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 86400 * 7 } // Cache 7 jours
    })
    
    if (!response.ok) {
      return {
        success: false,
        error: 'API OpenStreetMap temporairement indisponible',
        source: 'OpenStreetMap'
      }
    }
    
    const result = await response.json()
    
    // Parser les résultats
    const pois = parseOverpassResult(result, latitude, longitude)
    
    // Calculer les scores par catégorie
    const categories = calculerScoresCategories(pois, rayon)
    
    // Score global pondéré
    const scoreGlobal = Math.round(
      categories.reduce((sum, cat) => {
        const poids = CATEGORIES[cat.categorie as keyof typeof CATEGORIES]?.poids || 10
        return sum + (cat.score * poids / 100)
      }, 0)
    )
    
    // Générer la synthèse
    const { synthese, points } = genererSyntheseQuartier(categories, scoreGlobal)
    
    return {
      success: true,
      data: {
        scoreGlobal,
        categories,
        pois: pois.slice(0, 20), // Top 20 POIs
        synthese,
        points
      },
      source: 'OpenStreetMap'
    }
    
  } catch (error) {
    console.error('Erreur Score Quartier:', error)
    return {
      success: false,
      error: 'Erreur de connexion à OpenStreetMap',
      source: 'OpenStreetMap'
    }
  }
}

/**
 * Construit la requête Overpass
 */
function buildOverpassQuery(lat: number, lon: number, rayon: number): string {
  const allAmenities = Object.values(CATEGORIES)
    .flatMap(cat => cat.amenities)
    .join('|')
  
  return `
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
}

/**
 * Parse les résultats Overpass
 */
function parseOverpassResult(
  result: { elements?: Array<Record<string, unknown>> },
  centerLat: number,
  centerLon: number
): POI[] {
  if (!result.elements) return []
  
  return result.elements
    .map(element => {
      const tags = element.tags as Record<string, string> | undefined
      if (!tags) return null
      
      // Déterminer les coordonnées
      let lat = element.lat as number
      let lon = element.lon as number
      if (!lat && element.center) {
        const center = element.center as { lat: number; lon: number }
        lat = center.lat
        lon = center.lon
      }
      if (!lat) return null
      
      // Calculer la distance
      const distance = calculerDistance(centerLat, centerLon, lat, lon)
      
      // Déterminer le type et la catégorie
      const amenity = tags.amenity || tags.leisure || tags.railway || tags.highway || tags.shop
      const categorie = determinerCategorie(amenity)
      
      return {
        type: amenity,
        nom: tags.name || formatAmenityName(amenity),
        distance: Math.round(distance),
        categorie
      }
    })
    .filter((poi): poi is POI => poi !== null)
    .sort((a, b) => a.distance - b.distance)
}

/**
 * Calcule la distance entre deux points (formule de Haversine)
 */
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

/**
 * Détermine la catégorie d'un POI
 */
function determinerCategorie(amenity: string): POI['categorie'] {
  for (const [cat, config] of Object.entries(CATEGORIES)) {
    if (config.amenities.includes(amenity)) {
      return cat as POI['categorie']
    }
  }
  // Cas spéciaux
  if (['park', 'garden', 'playground'].includes(amenity)) return 'vert'
  if (['station', 'tram_stop', 'subway_entrance', 'bus_stop'].includes(amenity)) return 'transport'
  if (['supermarket', 'bakery', 'convenience'].includes(amenity)) return 'commerce'
  return 'loisirs'
}

/**
 * Formate le nom d'un amenity
 */
function formatAmenityName(amenity: string): string {
  const noms: Record<string, string> = {
    bus_stop: 'Arrêt de bus',
    tram_stop: 'Arrêt de tram',
    subway_entrance: 'Métro',
    train_station: 'Gare',
    station: 'Gare',
    supermarket: 'Supermarché',
    bakery: 'Boulangerie',
    pharmacy: 'Pharmacie',
    bank: 'Banque',
    post_office: 'La Poste',
    convenience: 'Épicerie',
    school: 'École',
    kindergarten: 'Crèche/Maternelle',
    college: 'Collège',
    university: 'Université',
    library: 'Bibliothèque',
    hospital: 'Hôpital',
    clinic: 'Clinique',
    doctors: 'Cabinet médical',
    dentist: 'Dentiste',
    cinema: 'Cinéma',
    theatre: 'Théâtre',
    restaurant: 'Restaurant',
    cafe: 'Café',
    sports_centre: 'Centre sportif',
    gym: 'Salle de sport',
    park: 'Parc',
    garden: 'Jardin',
    playground: 'Aire de jeux'
  }
  return noms[amenity] || amenity.replace(/_/g, ' ')
}

/**
 * Calcule les scores par catégorie
 */
function calculerScoresCategories(pois: POI[], rayon: number): ScoreCategorie[] {
  const categories: ScoreCategorie[] = []
  
  for (const [catKey, config] of Object.entries(CATEGORIES)) {
    const poisCategorie = pois.filter(p => p.categorie === catKey)
    
    // Score basé sur le nombre et la proximité
    let score = 0
    const details: string[] = []
    
    if (poisCategorie.length > 0) {
      // Plus il y en a, mieux c'est (plafonné)
      const countScore = Math.min(poisCategorie.length * 15, 60)
      
      // Plus c'est proche, mieux c'est
      const avgDistance = poisCategorie.reduce((sum, p) => sum + p.distance, 0) / poisCategorie.length
      const proximityScore = Math.max(0, 40 * (1 - avgDistance / rayon))
      
      score = Math.round(countScore + proximityScore)
      
      // Détails
      const closest = poisCategorie[0]
      details.push(`${poisCategorie.length} lieu(x) à moins de ${rayon}m`)
      details.push(`Le plus proche : ${closest.nom} à ${closest.distance}m`)
    }
    
    categories.push({
      categorie: catKey,
      score: Math.min(100, score),
      count: poisCategorie.length,
      details
    })
  }
  
  return categories
}

/**
 * Génère la synthèse du quartier
 */
function genererSyntheseQuartier(
  categories: ScoreCategorie[],
  scoreGlobal: number
): { synthese: string; points: string[] } {
  const points: string[] = []
  
  // Points forts (score >= 70)
  const pointsForts = categories.filter(c => c.score >= 70)
  for (const cat of pointsForts) {
    const config = CATEGORIES[cat.categorie as keyof typeof CATEGORIES]
    points.push(`✅ ${config.label} : Bien desservi (${cat.count} lieu${cat.count > 1 ? 'x' : ''})`)
  }
  
  // Points faibles (score < 30)
  const pointsFaibles = categories.filter(c => c.score < 30 && c.score > 0)
  for (const cat of pointsFaibles) {
    const config = CATEGORIES[cat.categorie as keyof typeof CATEGORIES]
    points.push(`⚠️ ${config.label} : Limité à proximité`)
  }
  
  // Absents (score = 0)
  const absents = categories.filter(c => c.score === 0)
  if (absents.length > 0) {
    const labels = absents.map(c => CATEGORIES[c.categorie as keyof typeof CATEGORIES].label)
    points.push(`❌ Non trouvé à proximité : ${labels.join(', ')}`)
  }
  
  // Synthèse globale
  let synthese: string
  if (scoreGlobal >= 80) {
    synthese = '🌟 Quartier très bien équipé avec toutes les commodités à proximité'
  } else if (scoreGlobal >= 60) {
    synthese = '👍 Quartier bien desservi, quelques services à distance'
  } else if (scoreGlobal >= 40) {
    synthese = '🚗 Quartier résidentiel, véhicule conseillé pour certains services'
  } else {
    synthese = '🏡 Zone calme mais éloignée des commodités principales'
  }
  
  return { synthese, points }
}

/**
 * Analyse rapide avec les principales commodités
 */
export async function analyseRapideQuartier(
  latitude: number,
  longitude: number
): Promise<{
  transports: number
  commerces: number
  ecoles: number
  synthese: string
} | null> {
  const result = await fetchScoreQuartier(latitude, longitude, 500)
  
  if (!result.success || !result.data) return null
  
  const getScore = (cat: string) => 
    result.data!.categories.find(c => c.categorie === cat)?.score || 0
  
  return {
    transports: getScore('transport'),
    commerces: getScore('commerce'),
    ecoles: getScore('education'),
    synthese: result.data.synthese
  }
}
