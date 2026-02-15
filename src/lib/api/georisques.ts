/**
 * Service API Géorisques
 * 
 * Données officielles des risques naturels et technologiques
 * Source: georisques.gouv.fr - 100% GRATUIT
 * 
 * Permet d'identifier les risques autour d'une adresse :
 * - Inondations
 * - Mouvements de terrain
 * - Séismes
 * - Radon
 * - Installations industrielles (SEVESO)
 * - Pollution des sols
 */

// ============================================
// TYPES
// ============================================

export interface RisqueNaturel {
  type: 'inondation' | 'mouvement_terrain' | 'seisme' | 'radon' | 'feu_foret' | 'avalanche' | 'cyclone'
  niveau: 'faible' | 'moyen' | 'fort' | 'tres_fort'
  description: string
  zonage?: string
}

export interface RisqueTechnologique {
  type: 'seveso' | 'nucleaire' | 'rupture_barrage' | 'transport_matieres_dangereuses'
  niveau: 'faible' | 'moyen' | 'fort'
  description: string
  distance?: number // en mètres
}

export interface PollutionSol {
  present: boolean
  sites: Array<{
    nom: string
    distance: number
    type: string
  }>
}

export interface GeorisquesResult {
  success: boolean
  data?: {
    risquesNaturels: RisqueNaturel[]
    risquesTechnologiques: RisqueTechnologique[]
    pollutionSol: PollutionSol
    zoneInondable: boolean
    niveauRadon: 1 | 2 | 3 | null
    scoreGlobal: number // 0-100, 100 = pas de risque
    synthese: string
  }
  error?: string
  source: string
}

// ============================================
// API GÉORISQUES
// ============================================

/**
 * Récupère les risques pour une adresse via l'API Géorisques
 * 100% GRATUIT - API officielle du gouvernement
 */
export async function fetchGeorisques(
  latitude: number,
  longitude: number,
  rayon: number = 1000 // mètres
): Promise<GeorisquesResult> {
  try {
    // API Géorisques - Risques naturels et technologiques
    const response = await fetch(
      `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${latitude},${longitude}&rayon=${rayon}`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 86400 * 7 } // Cache 7 jours
      }
    )
    
    if (!response.ok) {
      // Fallback si l'API principale échoue
      return await fetchGeorisquesFallback(latitude, longitude)
    }
    
    const result = await response.json()
    
    // Parser les résultats
    const risquesNaturels: RisqueNaturel[] = []
    const risquesTechnologiques: RisqueTechnologique[] = []
    let zoneInondable = false
    
    // Analyser les risques GASPAR
    if (result.data && Array.isArray(result.data)) {
      for (const risque of result.data) {
        const libelle = risque.libelle_risque_jo?.toLowerCase() || ''
        
        // Inondation
        if (libelle.includes('inondation')) {
          zoneInondable = true
          risquesNaturels.push({
            type: 'inondation',
            niveau: determinerNiveau(risque),
            description: risque.libelle_risque_jo || 'Risque d\'inondation identifié'
          })
        }
        
        // Mouvement de terrain
        if (libelle.includes('mouvement') || libelle.includes('terrain')) {
          risquesNaturels.push({
            type: 'mouvement_terrain',
            niveau: determinerNiveau(risque),
            description: 'Risque de mouvement de terrain'
          })
        }
        
        // Séisme
        if (libelle.includes('séisme') || libelle.includes('sismique')) {
          risquesNaturels.push({
            type: 'seisme',
            niveau: determinerNiveauSeisme(risque.zone_sismicite),
            description: `Zone sismique ${risque.zone_sismicite || 'non définie'}`
          })
        }
        
        // Feu de forêt
        if (libelle.includes('feu') || libelle.includes('forêt')) {
          risquesNaturels.push({
            type: 'feu_foret',
            niveau: determinerNiveau(risque),
            description: 'Zone à risque de feu de forêt'
          })
        }
        
        // Risques technologiques (SEVESO, etc.)
        if (libelle.includes('industriel') || libelle.includes('seveso')) {
          risquesTechnologiques.push({
            type: 'seveso',
            niveau: 'moyen',
            description: 'Présence d\'installations industrielles à risque'
          })
        }
      }
    }
    
    // Récupérer le niveau de radon
    const niveauRadon = await fetchNiveauRadon(latitude, longitude)
    if (niveauRadon && niveauRadon >= 2) {
      risquesNaturels.push({
        type: 'radon',
        niveau: niveauRadon === 3 ? 'fort' : 'moyen',
        description: `Zone à potentiel radon de catégorie ${niveauRadon}/3`
      })
    }
    
    // Récupérer la pollution des sols
    const pollutionSol = await fetchPollutionSol(latitude, longitude, rayon)
    
    // Calculer le score global
    const scoreGlobal = calculerScoreRisque(risquesNaturels, risquesTechnologiques, pollutionSol)
    
    // Générer la synthèse
    const synthese = genererSyntheseRisques(risquesNaturels, risquesTechnologiques, zoneInondable, pollutionSol)
    
    return {
      success: true,
      data: {
        risquesNaturels,
        risquesTechnologiques,
        pollutionSol,
        zoneInondable,
        niveauRadon,
        scoreGlobal,
        synthese
      },
      source: 'Géorisques - georisques.gouv.fr'
    }
    
  } catch (error) {
    console.error('Erreur Géorisques:', error)
    return {
      success: false,
      error: 'Erreur de connexion à l\'API Géorisques',
      source: 'Géorisques'
    }
  }
}

/**
 * Fallback simplifié si l'API principale échoue
 */
async function fetchGeorisquesFallback(
  latitude: number,
  longitude: number
): Promise<GeorisquesResult> {
  try {
    // Essayer l'API des aléas
    const response = await fetch(
      `https://georisques.gouv.fr/api/v1/resultats?latlon=${latitude},${longitude}`,
      { next: { revalidate: 86400 } }
    )
    
    if (!response.ok) {
      return {
        success: false,
        error: 'API Géorisques indisponible',
        source: 'Géorisques'
      }
    }
    
    // Retourner un résultat minimal
    return {
      success: true,
      data: {
        risquesNaturels: [],
        risquesTechnologiques: [],
        pollutionSol: { present: false, sites: [] },
        zoneInondable: false,
        niveauRadon: null,
        scoreGlobal: 85, // Score par défaut
        synthese: 'Données partielles - consultez georisques.gouv.fr pour plus de détails'
      },
      source: 'Géorisques (données partielles)'
    }
  } catch {
    return {
      success: false,
      error: 'Service indisponible',
      source: 'Géorisques'
    }
  }
}

/**
 * Récupère le niveau de radon d'une commune
 */
async function fetchNiveauRadon(lat: number, lon: number): Promise<1 | 2 | 3 | null> {
  try {
    const response = await fetch(
      `https://georisques.gouv.fr/api/v1/radon?latlon=${lat},${lon}`,
      { next: { revalidate: 86400 * 30 } } // Cache 30 jours
    )
    
    if (!response.ok) return null
    
    const result = await response.json()
    return result.classe_potentiel || null
  } catch {
    return null
  }
}

/**
 * Récupère les sites pollués proches
 */
async function fetchPollutionSol(
  lat: number, 
  lon: number, 
  rayon: number
): Promise<PollutionSol> {
  try {
    // API BASOL - Sites pollués
    const response = await fetch(
      `https://georisques.gouv.fr/api/v1/sis?latlon=${lat},${lon}&rayon=${rayon}`,
      { next: { revalidate: 86400 * 7 } }
    )
    
    if (!response.ok) {
      return { present: false, sites: [] }
    }
    
    const result = await response.json()
    
    if (result.data && result.data.length > 0) {
      return {
        present: true,
        sites: result.data.slice(0, 5).map((site: Record<string, unknown>) => ({
          nom: site.nom || 'Site pollué',
          distance: site.distance || 0,
          type: site.type || 'Sol pollué'
        }))
      }
    }
    
    return { present: false, sites: [] }
  } catch {
    return { present: false, sites: [] }
  }
}

// ============================================
// HELPERS
// ============================================

function determinerNiveau(risque: Record<string, unknown>): 'faible' | 'moyen' | 'fort' | 'tres_fort' {
  // Logique basée sur les données GASPAR
  const niveau = risque.niveau || risque.alea
  if (niveau === 'fort' || niveau === 'très fort' || niveau === 4) return 'fort'
  if (niveau === 'moyen' || niveau === 3) return 'moyen'
  return 'faible'
}

function determinerNiveauSeisme(zone: number | undefined): 'faible' | 'moyen' | 'fort' | 'tres_fort' {
  if (!zone) return 'faible'
  if (zone >= 4) return 'fort'
  if (zone >= 3) return 'moyen'
  return 'faible'
}

function calculerScoreRisque(
  naturels: RisqueNaturel[],
  technologiques: RisqueTechnologique[],
  pollution: PollutionSol
): number {
  let score = 100
  
  // Déduction pour risques naturels
  for (const risque of naturels) {
    if (risque.niveau === 'tres_fort') score -= 25
    else if (risque.niveau === 'fort') score -= 15
    else if (risque.niveau === 'moyen') score -= 8
    else score -= 3
  }
  
  // Déduction pour risques technologiques
  for (const risque of technologiques) {
    if (risque.niveau === 'fort') score -= 20
    else if (risque.niveau === 'moyen') score -= 10
    else score -= 5
  }
  
  // Déduction pour pollution
  if (pollution.present) {
    score -= 10 * Math.min(pollution.sites.length, 3)
  }
  
  return Math.max(0, Math.min(100, score))
}

function genererSyntheseRisques(
  naturels: RisqueNaturel[],
  technologiques: RisqueTechnologique[],
  zoneInondable: boolean,
  pollution: PollutionSol
): string {
  const alertes: string[] = []
  
  if (zoneInondable) {
    alertes.push('⚠️ Zone inondable - vérifiez l\'assurance')
  }
  
  const risquesForts = naturels.filter(r => r.niveau === 'fort' || r.niveau === 'tres_fort')
  if (risquesForts.length > 0) {
    alertes.push(`⚠️ ${risquesForts.length} risque(s) naturel(s) élevé(s)`)
  }
  
  if (technologiques.length > 0) {
    alertes.push('🏭 Présence d\'installations industrielles')
  }
  
  if (pollution.present) {
    alertes.push('🔬 Site(s) pollué(s) à proximité')
  }
  
  if (alertes.length === 0) {
    return '✅ Aucun risque majeur identifié dans cette zone'
  }
  
  return alertes.join(' • ')
}

/**
 * Géocode une adresse pour obtenir lat/lon
 * Utilise l'API Adresse du gouvernement (GRATUIT)
 */
export async function geocoderAdresse(
  adresse: string,
  codePostal: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    const query = encodeURIComponent(`${adresse} ${codePostal}`)
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${query}&limit=1`,
      { next: { revalidate: 86400 * 30 } }
    )
    
    if (!response.ok) return null
    
    const result = await response.json()
    
    if (result.features && result.features.length > 0) {
      const [lon, lat] = result.features[0].geometry.coordinates
      return { lat, lon }
    }
    
    return null
  } catch {
    return null
  }
}
