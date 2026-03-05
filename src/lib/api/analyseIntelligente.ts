/**
 * Service Analyse Intelligente (Client-Side)
 * 
 * Agrège toutes les sources de données via les routes API Next.js :
 * - /api/analyse/dvf : Prix du marché immobilier
 * - /api/analyse/georisques : Risques naturels et technologiques
 * - /api/analyse/quartier : Score quartier (OpenStreetMap)
 * - /api/analyse/geocode : Géocodage adresse
 * 
 * Toutes les APIs sont 100% GRATUITES
 */

// ============================================
// TYPES
// ============================================

export interface BienAnalyse {
  id: string
  adresse?: string
  codePostal: string
  ville?: string
  prix: number
  surface: number
  typeBien: 'appartement' | 'maison'
  prixM2: number
  dpe?: string
  etage?: number
  hasAscenseur?: boolean
  hasBalcon?: boolean
  hasParking?: boolean
  hasCave?: boolean
  /** Latitude GPS (si fournie directement par la plateforme) */
  latitude?: number
  /** Longitude GPS (si fournie directement par la plateforme) */
  longitude?: number
}

export interface AnalyseMarche {
  success: boolean
  prixMedianMarche?: number
  prixM2MedianMarche?: number
  ecartPrix?: number // % par rapport au marché
  ecartPrixM2?: number
  nbTransactions?: number
  evolution12Mois?: number
  verdict?: 'excellent' | 'bon' | 'correct' | 'cher' | 'tres_cher'
  message?: string
  /** Source des données (DVF cquest.org ou DVF local) */
  sourceData?: string
  /** Avertissement si données potentiellement incohérentes */
  avertissement?: string
}

export interface AnalyseRisques {
  success: boolean
  scoreRisque?: number // 0-100 (100 = peu risqué)
  risquesNaturels?: string[]
  risquesTechnos?: string[]
  zoneInondable?: boolean
  niveauRadon?: number
  verdict?: 'sûr' | 'vigilance' | 'risqué'
  message?: string
}

export interface TransportProche {
  type: string
  /** Type enrichi: metro | rer | train | tram | bus | velo */
  typeTransport: string
  nom: string
  distance: number
  /** Temps de marche estimé (minutes, ~4.5 km/h) */
  walkMin?: number
  /** Numéros/noms de lignes (ex: ["1", "4", "7"]) */
  lignes?: string[]
  /** Opérateur (RATP, SNCF, Keolis…) */
  operateur?: string
  /** Couleur hex de la ligne */
  couleur?: string
}

export interface AnalyseQuartier {
  success: boolean
  scoreQuartier?: number // 0-100
  transports?: number
  commerces?: number
  ecoles?: number
  sante?: number
  espaceVerts?: number
  transportsProches?: TransportProche[]
  verdict?: 'excellent' | 'bon' | 'moyen' | 'faible'
  message?: string
}

export interface AnalyseComplete {
  bien: BienAnalyse
  marche: AnalyseMarche
  risques: AnalyseRisques
  quartier: AnalyseQuartier
  scoreGlobal: number // 0-100
  recommandation: 'fortement_recommande' | 'recommande' | 'prudence' | 'deconseille'
  points: {
    positifs: string[]
    negatifs: string[]
    vigilance: string[]
  }
  /** Niveau de précision de l'analyse basé sur les données disponibles */
  precision: {
    /** Adresse complète disponible (rue + numéro) */
    adresseComplete: boolean
    /** Analyse basée sur code postal uniquement */
    codePostalUniquement: boolean
    /** Message explicatif */
    message: string
  }
}

// ============================================
// GÉOCODAGE
// ============================================

async function geocoderAdresse(
  adresse: string,
  codePostal: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    const params = new URLSearchParams()
    if (adresse) params.set('adresse', adresse)
    if (codePostal) params.set('code_postal', codePostal)
    
    const response = await fetch(`/api/analyse/geocode?${params.toString()}`)
    const result = await response.json()
    
    if (result.success && result.data) {
      return { lat: result.data.lat, lon: result.data.lon }
    }
    return null
  } catch {
    return null
  }
}

// ============================================
// ANALYSE PRINCIPALE
// ============================================

/**
 * Analyse complète d'un bien immobilier
 * Combine toutes les sources de données gratuites
 */
export async function analyserBien(bien: BienAnalyse): Promise<AnalyseComplete> {
  // 1. Coordonnées GPS : utiliser celles de la plateforme si dispo, sinon géocoder
  let latitude: number | undefined = bien.latitude
  let longitude: number | undefined = bien.longitude
  
  if (!latitude || !longitude) {
    // Géocoder l'adresse pour avoir les coordonnées
    const geo = await geocoderAdresse(
      bien.adresse || '', 
      bien.codePostal
    )
    if (geo) {
      latitude = geo.lat
      longitude = geo.lon
    }
  }
  
  // 2. Lancer les 3 analyses en parallèle
  const [marcheResult, risquesResult, quartierResult] = await Promise.all([
    analyserMarche(bien),
    latitude && longitude ? analyserRisques(latitude, longitude) : Promise.resolve(null),
    latitude && longitude ? analyserQuartier(latitude, longitude) : Promise.resolve(null)
  ])
  
  // 3. Construire les résultats
  const marche = marcheResult || { success: false }
  const risques = risquesResult || { success: false }
  const quartier = quartierResult || { success: false }
  
  // 4. Calculer le score global et les recommandations
  const { scoreGlobal, recommandation, points } = calculerScoreGlobal(
    bien,
    marche,
    risques,
    quartier
  )
  
  // 5. Déterminer la précision de l'analyse
  const adresseComplete = Boolean(bien.adresse && bien.adresse.length > 5)
  const precision = {
    adresseComplete,
    codePostalUniquement: !adresseComplete,
    message: adresseComplete 
      ? 'Analyse précise basée sur l\'adresse complète'
      : 'Analyse approximative basée sur le code postal (l\'adresse exacte n\'est pas disponible)'
  }
  
  return {
    bien,
    marche,
    risques,
    quartier,
    scoreGlobal,
    recommandation,
    points,
    precision
  }
}

// ============================================
// ANALYSE MARCHÉ (DVF via API route)
// ============================================

async function analyserMarche(bien: BienAnalyse): Promise<AnalyseMarche> {
  try {
    // Appeler la route API interne
    // Fourchette de surface proportionnelle : ±30% avec plancher 15 m²
    const margin = Math.max(15, Math.round(bien.surface * 0.3))
    const surfaceMin = Math.max(9, bien.surface - margin)
    const surfaceMax = bien.surface + margin
    
    const params = new URLSearchParams({
      code_postal: bien.codePostal,
      type_local: bien.typeBien === 'maison' ? 'Maison' : 'Appartement',
      surface_min: surfaceMin.toString(),
      surface_max: surfaceMax.toString()
    })
    
    const response = await fetch(`/api/analyse/dvf?${params.toString()}`)
    const result = await response.json()
    
    if (!result.success || !result.data) {
      return { success: false, message: result.error || 'Données de marché non disponibles' }
    }
    
    const stats = result.data
    
    // Calculer l'écart au marché (par m²)
    const ecartPrixM2 = Math.round(((bien.prixM2 - stats.prixM2Median) / stats.prixM2Median) * 100)
    // Écart sur le prix total (diffère du m² si la surface est atypique)
    const ecartPrix = stats.prixMedian
      ? Math.round(((bien.prix - stats.prixMedian) / stats.prixMedian) * 100)
      : ecartPrixM2 // fallback quand prixMedian indisponible
    
    // Le verdict est basé sur l'écart au m² (plus fiable)
    const ecart = ecartPrixM2
    
    // Déterminer le verdict
    let verdict: AnalyseMarche['verdict']
    let message: string
    
    if (ecart <= -10) {
      verdict = 'excellent'
      message = `💰 Bonne affaire ! ${Math.abs(ecart)}% en dessous du marché`
    } else if (ecart <= 0) {
      verdict = 'bon'
      message = `✅ Prix dans la moyenne du marché`
    } else if (ecart <= 10) {
      verdict = 'correct'
      message = `📊 Légèrement au-dessus du marché (+${ecart}%)`
    } else if (ecart <= 20) {
      verdict = 'cher'
      message = `⚠️ Au-dessus du marché (+${ecart}%)`
    } else {
      verdict = 'tres_cher'
      message = `🚨 Prix très élevé (+${ecart}% vs marché)`
    }
    
    // Avertissement si écart trop important (données potentiellement incohérentes)
    let avertissement: string | undefined
    if (Math.abs(ecart) > 50) {
      avertissement = `Écart important (${Math.abs(ecart)}%) - vérifiez que le type de bien et la localisation sont corrects`
    }
    // Propager l'avertissement de la source DVF (ex. "toutes surfaces confondues")
    if (stats.avertissement && !avertissement) {
      avertissement = stats.avertissement as string
    }
    
    return {
      success: true,
      prixMedianMarche: stats.prixMedian,
      prixM2MedianMarche: stats.prixM2Median,
      ecartPrix,
      ecartPrixM2,
      nbTransactions: stats.nbTransactions,
      evolution12Mois: stats.evolution12Mois ?? undefined,
      verdict,
      message,
      sourceData: result.source,
      avertissement
    }
    
  } catch (error) {
    console.error('Erreur analyse marché:', error)
    return { success: false, message: 'Erreur lors de l\'analyse du marché' }
  }
}

// ============================================
// ANALYSE RISQUES (Géorisques via API route)
// ============================================

async function analyserRisques(
  latitude: number,
  longitude: number
): Promise<AnalyseRisques> {
  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      rayon: '1000'
    })
    
    const response = await fetch(`/api/analyse/georisques?${params.toString()}`)
    const result = await response.json()
    
    if (!result.success || !result.data) {
      return { success: false, message: 'Données risques non disponibles' }
    }
    
    const { risquesNaturels, risquesTechnologiques, zoneInondable, niveauRadon, scoreGlobal } = result.data
    
    // Convertir les objets risques en strings pour l'affichage
    const risquesNaturelsStr = risquesNaturels?.map((r: { description?: string; type: string }) => r.description || r.type) || []
    const risquesTechnosStr = risquesTechnologiques?.map((r: { description?: string; type: string }) => r.description || r.type) || []
    
    // Verdict
    let verdict: AnalyseRisques['verdict']
    let message: string
    
    const totalRisques = (risquesNaturels?.length || 0) + (risquesTechnologiques?.length || 0)
    
    if (totalRisques === 0 && !zoneInondable) {
      verdict = 'sûr'
      message = '✅ Zone sans risque majeur identifié'
    } else if (totalRisques <= 2 && !zoneInondable) {
      verdict = 'vigilance'
      message = `⚠️ ${totalRisques} risque(s) identifié(s) - vigilance recommandée`
    } else {
      verdict = 'risqué'
      message = `🚨 Zone à risques : ${totalRisques} risque(s) identifié(s)`
    }
    
    return {
      success: true,
      scoreRisque: scoreGlobal,
      risquesNaturels: risquesNaturelsStr,
      risquesTechnos: risquesTechnosStr,
      zoneInondable,
      niveauRadon: niveauRadon ?? undefined,
      verdict,
      message
    }
    
  } catch (error) {
    console.error('Erreur analyse risques:', error)
    return { success: false, message: 'Erreur lors de l\'analyse des risques' }
  }
}

// ============================================
// ANALYSE QUARTIER (OpenStreetMap via API route)
// ============================================

async function analyserQuartier(
  latitude: number,
  longitude: number
): Promise<AnalyseQuartier> {
  const params = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
    rayon: '800'
  })
  const url = `/api/analyse/quartier?${params.toString()}`

  // Retry avec backoff exponentiel (2 tentatives max)
  const MAX_RETRIES = 2
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url)
      const result = await response.json()

      if (!result.success || !result.data) {
        // Si erreur serveur (502/503/504), retenter
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
        return { success: false, message: 'Analyse quartier non disponible' }
      }

      const { scoreGlobal, transports, commerces, ecoles, sante, espaceVerts, synthese, transportsProches } = result.data

      // Verdict
      let verdict: AnalyseQuartier['verdict']
      const message: string = synthese

      if (scoreGlobal >= 75) {
        verdict = 'excellent'
      } else if (scoreGlobal >= 50) {
        verdict = 'bon'
      } else if (scoreGlobal >= 25) {
        verdict = 'moyen'
      } else {
        verdict = 'faible'
      }

      return {
        success: true,
        scoreQuartier: scoreGlobal,
        transports,
        commerces,
        ecoles,
        sante,
        espaceVerts,
        transportsProches: transportsProches ?? [],
        verdict,
        message
      }

    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      console.error('Erreur analyse quartier:', error)
      return { success: false, message: 'Erreur lors de l\'analyse du quartier' }
    }
  }
  return { success: false, message: 'Analyse quartier non disponible après retries' }
}

// ============================================
// SCORE GLOBAL
// ============================================

function calculerScoreGlobal(
  bien: BienAnalyse,
  marche: AnalyseMarche,
  risques: AnalyseRisques,
  quartier: AnalyseQuartier
): {
  scoreGlobal: number
  recommandation: AnalyseComplete['recommandation']
  points: AnalyseComplete['points']
} {
  const positifs: string[] = []
  const negatifs: string[] = []
  const vigilance: string[] = []
  
  // Score pondéré : chaque axe contribue de 0 à son poids max (40/30/30)
  // Les bonus/malus du bien (DPE, équipements, étage) s'appliquent APRÈS normalisation
  let score = 0
  let poids = 0
  
  // === MARCHÉ (40% du score) ===
  if (marche.success && marche.verdict) {
    poids += 40
    switch (marche.verdict) {
      case 'excellent':
        score += 40
        positifs.push(`💰 Prix excellent (${Math.abs(marche.ecartPrixM2 || 0).toFixed(0)}% sous le marché)`)
        break
      case 'bon':
        score += 30
        positifs.push('✅ Prix dans la moyenne du marché')
        break
      case 'correct':
        score += 20
        vigilance.push(`📊 Prix légèrement élevé (+${marche.ecartPrixM2?.toFixed(0)}%)`)
        break
      case 'cher':
        score += 8
        negatifs.push(`⚠️ Prix au-dessus du marché (+${marche.ecartPrixM2?.toFixed(0)}%)`)
        break
      case 'tres_cher':
        score += 0
        negatifs.push(`🚨 Prix très élevé (+${marche.ecartPrixM2?.toFixed(0)}%)`)
        break
    }
    
    // Évolution du marché
    if (marche.evolution12Mois !== undefined) {
      if (marche.evolution12Mois > 5) {
        positifs.push(`📈 Marché en hausse (+${marche.evolution12Mois.toFixed(1)}% sur 12 mois)`)
      } else if (marche.evolution12Mois < -5) {
        vigilance.push(`📉 Marché en baisse (${marche.evolution12Mois.toFixed(1)}% sur 12 mois)`)
      }
    }
  }
  
  // === RISQUES (30% du score) ===
  if (risques.success && risques.scoreRisque !== undefined) {
    poids += 30
    const scoreRisque = risques.scoreRisque
    
    if (scoreRisque >= 80) {
      score += 30
      positifs.push('🛡️ Zone sûre, pas de risque majeur')
    } else if (scoreRisque >= 60) {
      score += 20
      vigilance.push('⚠️ Quelques risques à surveiller')
    } else if (scoreRisque >= 40) {
      score += 10
      negatifs.push('🚨 Zone à risques identifiés')
    } else {
      negatifs.push('❌ Zone à risques multiples')
    }
    
    // Détails risques
    if (risques.zoneInondable) {
      negatifs.push('🌊 Zone inondable')
    }
    if (risques.niveauRadon && risques.niveauRadon >= 3) {
      vigilance.push('☢️ Potentiel radon élevé')
    }
  }
  
  // === QUARTIER (30% du score) ===
  if (quartier.success && quartier.scoreQuartier !== undefined) {
    poids += 30
    const scoreQ = quartier.scoreQuartier
    
    if (scoreQ >= 75) {
      score += 30
      positifs.push('🌟 Quartier très bien équipé')
    } else if (scoreQ >= 50) {
      score += 20
      positifs.push('👍 Bonne desserte en services')
    } else if (scoreQ >= 25) {
      score += 10
      vigilance.push('🚗 Véhicule conseillé')
    } else {
      negatifs.push('🏡 Peu de services à proximité')
    }
    
    // Détails quartier
    if (quartier.transports && quartier.transports >= 70) {
      positifs.push('🚇 Bien desservi en transports')
    }
    if (quartier.commerces && quartier.commerces >= 70) {
      positifs.push('🛒 Commerces à proximité')
    }
    if (quartier.ecoles && quartier.ecoles >= 70) {
      positifs.push('🏫 Écoles accessibles')
    }
  }
  
  // === CARACTÉRISTIQUES DU BIEN (bonus/malus appliqués après normalisation) ===
  let bonusPoints = 0
  
  // DPE
  if (bien.dpe) {
    if (['A', 'B', 'C'].includes(bien.dpe)) {
      positifs.push(`🌱 Bon DPE (${bien.dpe})`)
      bonusPoints += 5
    } else if (['F', 'G'].includes(bien.dpe)) {
      negatifs.push(`⚡ Passoire énergétique (DPE ${bien.dpe})`)
      bonusPoints -= 10
    }
  }
  
  // Équipements
  const equipements = [
    bien.hasBalcon && 'balcon',
    bien.hasParking && 'parking',
    bien.hasCave && 'cave'
  ].filter(Boolean)
  
  if (equipements.length >= 2) {
    positifs.push(`✨ Bien équipé (${equipements.join(', ')})`)
    bonusPoints += 3
  }
  
  // Étage sans ascenseur
  if (bien.etage && bien.etage >= 4 && !bien.hasAscenseur) {
    negatifs.push(`🚶 Étage ${bien.etage} sans ascenseur`)
    bonusPoints -= 5
  }
  
  // Normaliser le score : ratio pondéré (0-100) + bonus/malus du bien
  // Si aucun axe disponible → score neutre 50
  let scoreGlobal = poids > 0
    ? Math.round((score / poids) * 100 + bonusPoints)
    : 50
  
  // Pénalité de confiance : si moins de 2 sources dispo, atténuer vers 50
  const nbSourcesDisponibles = [marche.success, risques.success, quartier.success].filter(Boolean).length
  if (nbSourcesDisponibles < 2) {
    const facteur = 0.5 + (nbSourcesDisponibles / 6) // 1 source → 0.67, 0 source → 0.5
    scoreGlobal = Math.round(50 + (scoreGlobal - 50) * facteur)
  }
  
  scoreGlobal = Math.max(0, Math.min(100, scoreGlobal))
  
  // Recommandation
  let recommandation: AnalyseComplete['recommandation']
  if (scoreGlobal >= 75) {
    recommandation = 'fortement_recommande'
  } else if (scoreGlobal >= 55) {
    recommandation = 'recommande'
  } else if (scoreGlobal >= 35) {
    recommandation = 'prudence'
  } else {
    recommandation = 'deconseille'
  }
  
  return {
    scoreGlobal,
    recommandation,
    points: { positifs, negatifs, vigilance }
  }
}

// ============================================
// COMPARAISON DE BIENS
// ============================================

/**
 * Compare plusieurs biens entre eux avec analyse complète
 */
export async function comparerBiens(biens: BienAnalyse[]): Promise<{
  analyses: AnalyseComplete[]
  classement: Array<{ id: string; rang: number; scoreGlobal: number }>
  meilleurRapportQualitePrix: string | null
  meilleurQuartier: string | null
  moinsCher: string | null
}> {
  // Analyser tous les biens en parallèle
  const analyses = await Promise.all(biens.map(analyserBien))
  
  // Classer par score global
  const classement = analyses
    .map(a => ({
      id: a.bien.id,
      scoreGlobal: a.scoreGlobal
    }))
    .sort((a, b) => b.scoreGlobal - a.scoreGlobal)
    .map((item, index) => ({ ...item, rang: index + 1 }))
  
  // Trouver les meilleurs selon différents critères
  const meilleurRapportQualitePrix = analyses
    .filter(a => a.marche.verdict === 'excellent' || a.marche.verdict === 'bon')
    .sort((a, b) => b.scoreGlobal - a.scoreGlobal)[0]?.bien.id || null
  
  const meilleurQuartier = analyses
    .filter(a => a.quartier.success && a.quartier.scoreQuartier !== undefined)
    .sort((a, b) => (b.quartier.scoreQuartier || 0) - (a.quartier.scoreQuartier || 0))[0]?.bien.id || null
  
  const moinsCher = analyses
    .slice()
    .sort((a, b) => a.bien.prix - b.bien.prix)[0]?.bien.id || null
  
  return {
    analyses,
    classement,
    meilleurRapportQualitePrix,
    meilleurQuartier,
    moinsCher
  }
}
