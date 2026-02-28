/**
 * Enrichissement PDF — Appelle DVF + Quartier + Synthèse IA en parallèle
 *
 * Utilisé côté client juste avant la génération PDF pour ajouter
 * les sections premium : étude de marché locale + synthèse IA.
 *
 * Toutes les étapes sont optionnelles (graceful degradation).
 */

// ============================================
// TYPES
// ============================================

export interface DonneesMarcheLocal {
  prixM2Median: number
  prixM2Moyen: number
  prixMin: number | null
  prixMax: number | null
  nbTransactions: number
  evolution12Mois: number | null
  surfaceEstimee: number
  codePostal: string
}

export interface DonneesQuartier {
  scoreGlobal: number
  transports: number
  commerces: number
  ecoles: number
  sante: number
  espaceVerts: number
  synthese: string
  // ── Enrichissements (optionnels) ──
  /** Score risques 0-10 (10 = très sûr, 0 = très exposé) — source Géorisques */
  risques?: number | null
  risquesDetail?: string | null
  /** Score niveau de vie 0-10 — source INSEE Filosofi (revenu médian) */
  niveauVie?: number | null
  niveauVieLabel?: string | null
  /** Score qualité de l'air 0-10 — source ATMO */
  qualiteAir?: number | null
  qualiteAirLabel?: string | null
}

export interface SyntheseIA {
  synthese: string
  economieEstimee: number | null
  cliffhanger: string
  source: string
}

export interface EnrichissementPDF {
  marche: DonneesMarcheLocal | null
  quartier: DonneesQuartier | null
  syntheseIA: SyntheseIA | null
}

// ============================================
// PARAMÈTRES
// ============================================

interface EnrichissementParams {
  // Mode
  mode: 'A' | 'B'
  // Localisation
  codePostal?: string
  typeBien?: 'neuf' | 'ancien'
  typeLogement?: 'appartement' | 'maison'
  nomCommune?: string
  // Profil (optionnel en Mode B)
  age?: number
  statutProfessionnel?: string
  situationFoyer?: string
  nombreEnfants?: number
  // Revenus
  revenusMensuels: number
  chargesMensuelles: number
  // Simulation
  prixAchatMax: number
  capitalEmpruntable: number
  apport: number
  dureeAns: number
  tauxInteret: number
  mensualite: number
  // Score
  scoreFaisabilite: number
  tauxEndettement: number
  resteAVivre: number
}

// ============================================
// FONCTIONS
// ============================================

/**
 * Récupère les données marché DVF pour un code postal
 */
async function fetchMarche(
  codePostal: string,
  typeLogement: string,
  prixAchatMax: number
): Promise<DonneesMarcheLocal | null> {
  try {
    const params = new URLSearchParams({
      code_postal: codePostal,
      type_local: typeLogement === 'maison' ? 'Maison' : 'Appartement',
    })
    const res = await fetch(`/api/analyse/dvf?${params}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const json = await res.json()
    if (!json.success || !json.data) return null

    const d = json.data as {
      prixM2Median: number
      prixM2Moyen: number
      prixMin: number | null
      prixMax: number | null
      nbTransactions: number
      evolution12Mois: number | null
    }

    // Estimer la surface accessible
    const surfaceEstimee = d.prixM2Median > 0 ? Math.round(prixAchatMax / d.prixM2Median) : 0

    return {
      ...d,
      surfaceEstimee,
      codePostal,
    }
  } catch {
    return null
  }
}

/**
 * Récupère le score quartier via géocodage + analyse OSM + Géorisques + INSEE + ATMO
 */
async function fetchQuartier(codePostal: string): Promise<DonneesQuartier | null> {
  try {
    // 1. Géocoder le code postal
    const geoRes = await fetch(
      `/api/analyse/geocode?code_postal=${encodeURIComponent(codePostal)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!geoRes.ok) return null
    const geoJson = await geoRes.json()
    if (!geoJson.success || !geoJson.data) return null

    const { lat, lon } = geoJson.data as { lat: number; lon: number }

    // 2. Appels en parallèle : OSM + Géorisques + INSEE + ATMO
    const [qRes, geoRisquesRes, inseeRes, atmoRes] = await Promise.all([
      fetch(`/api/analyse/quartier?lat=${lat}&lon=${lon}&rayon=800`, {
        signal: AbortSignal.timeout(15000),
      }).catch(() => null),
      fetch(`/api/analyse/georisques?lat=${lat}&lon=${lon}`, {
        signal: AbortSignal.timeout(10000),
      }).catch(() => null),
      fetch(`/api/analyse/insee-revenus?codePostal=${codePostal}`, {
        signal: AbortSignal.timeout(10000),
      }).catch(() => null),
      fetch(`/api/analyse/qualite-air?lat=${lat}&lon=${lon}`, {
        signal: AbortSignal.timeout(10000),
      }).catch(() => null),
    ])

    // 3. Parser le score quartier OSM (base)
    let quartierData: DonneesQuartier | null = null
    if (qRes && qRes.ok) {
      const qJson = await qRes.json()
      if (qJson.success && qJson.data) {
        quartierData = qJson.data as DonneesQuartier
      }
    }

    // Si même le score OSM a échoué, on construit un objet minimal
    if (!quartierData) {
      quartierData = {
        scoreGlobal: 0,
        transports: 0,
        commerces: 0,
        ecoles: 0,
        sante: 0,
        espaceVerts: 0,
        synthese: '',
      }
    }

    // 4. Enrichir avec Géorisques
    if (geoRisquesRes && geoRisquesRes.ok) {
      try {
        const grJson = await geoRisquesRes.json()
        if (grJson.success && grJson.data) {
          // scoreGlobal Géorisques est 0-100, on normalise en 0-10
          const scoreRisques = Math.round((grJson.data.scoreGlobal / 10) * 10) / 10
          quartierData.risques = scoreRisques
          quartierData.risquesDetail = grJson.data.synthese || null
        }
      } catch {
        // Géorisques parsing échoué — OK
      }
    }

    // 5. Enrichir avec INSEE revenu médian
    if (inseeRes && inseeRes.ok) {
      try {
        const inseeJson = await inseeRes.json()
        if (inseeJson.success && inseeJson.data) {
          quartierData.niveauVie = inseeJson.data.score ?? null
          quartierData.niveauVieLabel = inseeJson.data.niveauVie ?? null
        }
      } catch {
        // INSEE parsing échoué — OK
      }
    }

    // 6. Enrichir avec qualité de l'air
    if (atmoRes && atmoRes.ok) {
      try {
        const atmoJson = await atmoRes.json()
        if (atmoJson.success && atmoJson.data) {
          quartierData.qualiteAir = atmoJson.data.score ?? null
          quartierData.qualiteAirLabel = atmoJson.data.label ?? null
        }
      } catch {
        // ATMO parsing échoué — OK
      }
    }

    // 7. Recalculer le score global en intégrant les nouvelles sources
    // Pondération : OSM existant (70%) + Risques (12%) + Niveau de vie (10%) + Air (8%)
    const osmScore = quartierData.scoreGlobal // 0-100
    const risquesScore = quartierData.risques != null ? quartierData.risques * 10 : null // 0-100
    const niveauVieScore = quartierData.niveauVie != null ? quartierData.niveauVie * 10 : null
    const airScore = quartierData.qualiteAir != null ? quartierData.qualiteAir * 10 : null

    // Calcul pondéré adaptatif (si une source manque, redistribuer son poids)
    let totalPoids = 0
    let totalScore = 0
    const sources: Array<{ score: number | null; poids: number }> = [
      { score: osmScore > 0 ? osmScore : null, poids: 70 },
      { score: risquesScore, poids: 12 },
      { score: niveauVieScore, poids: 10 },
      { score: airScore, poids: 8 },
    ]
    for (const src of sources) {
      if (src.score != null) {
        totalPoids += src.poids
        totalScore += src.score * src.poids
      }
    }
    if (totalPoids > 0) {
      quartierData.scoreGlobal = Math.round(totalScore / totalPoids)
    }

    // 8. Mettre à jour la synthèse texte (sans emojis — incompatibles @react-pdf)
    const parts: string[] = []
    if (quartierData.scoreGlobal >= 80) parts.push('Quartier très bien équipé')
    else if (quartierData.scoreGlobal >= 60) parts.push('Quartier bien desservi')
    else if (quartierData.scoreGlobal >= 40) parts.push('Véhicule conseillé')
    else parts.push('Zone calme, éloignée des services')

    if (quartierData.risques != null) {
      if (quartierData.risques >= 8) parts.push('Peu de risques identifiés')
      else if (quartierData.risques >= 5) parts.push('Quelques risques à noter')
      else parts.push('Zone exposée à des risques')
    }
    if (quartierData.qualiteAirLabel) {
      parts.push(`Air : ${quartierData.qualiteAirLabel}`)
    }
    if (quartierData.niveauVieLabel) {
      const labelMap: Record<string, string> = {
        aise: 'Niveau de vie aisé',
        confortable: 'Niveau de vie confortable',
        moyen: 'Niveau de vie moyen',
        modeste: 'Niveau de vie modeste',
      }
      parts.push(labelMap[quartierData.niveauVieLabel] || quartierData.niveauVieLabel)
    }
    quartierData.synthese = parts.join(' - ')

    return quartierData
  } catch {
    return null
  }
}

/**
 * Appelle l'API synthèse IA
 */
async function fetchSyntheseIA(
  params: EnrichissementParams,
  marche: DonneesMarcheLocal | null,
  quartier: DonneesQuartier | null
): Promise<SyntheseIA | null> {
  try {
    const res = await fetch('/api/analyse/synthese-ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: params.mode,
        age: params.age,
        statutProfessionnel: params.statutProfessionnel,
        situationFoyer: params.situationFoyer,
        nombreEnfants: params.nombreEnfants,
        revenusMensuels: params.revenusMensuels,
        chargesMensuelles: params.chargesMensuelles,
        prixAchatMax: params.prixAchatMax,
        capitalEmpruntable: params.capitalEmpruntable,
        apport: params.apport,
        dureeAns: params.dureeAns,
        tauxInteret: params.tauxInteret,
        mensualite: params.mensualite,
        scoreFaisabilite: params.scoreFaisabilite,
        tauxEndettement: params.tauxEndettement,
        resteAVivre: params.resteAVivre,
        // Données bien (Mode B)
        typeBien: params.typeBien,
        typeLogement: params.typeLogement,
        nomCommune: params.nomCommune,
        marche: marche
          ? {
              prixM2Median: marche.prixM2Median,
              evolution12Mois: marche.evolution12Mois,
              nbTransactions: marche.nbTransactions,
              surfaceEstimee: marche.surfaceEstimee,
              codePostal: marche.codePostal,
            }
          : undefined,
        quartier: quartier
          ? {
              scoreGlobal: quartier.scoreGlobal,
              transports: quartier.transports,
              commerces: quartier.commerces,
              ecoles: quartier.ecoles,
              sante: quartier.sante,
              synthese: quartier.synthese,
              risques: quartier.risques,
              risquesDetail: quartier.risquesDetail,
              niveauVie: quartier.niveauVie,
              niveauVieLabel: quartier.niveauVieLabel,
              qualiteAir: quartier.qualiteAir,
              qualiteAirLabel: quartier.qualiteAirLabel,
            }
          : undefined,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (!json.success || !json.data) return null

    return {
      synthese: json.data.synthese,
      economieEstimee: json.data.economieEstimee,
      cliffhanger: json.data.cliffhanger,
      source: json.source ?? 'unknown',
    }
  } catch {
    return null
  }
}

// ============================================
// ORCHESTRATEUR
// ============================================

/**
 * Enrichit les données pour le PDF premium.
 * Appelle DVF + Quartier en parallèle, puis Synthèse IA (qui a besoin des 2).
 *
 * Timeout total : ~15s max. Chaque étape est optionnelle.
 */
export async function enrichirPourPDF(params: EnrichissementParams): Promise<EnrichissementPDF> {
  const result: EnrichissementPDF = {
    marche: null,
    quartier: null,
    syntheseIA: null,
  }

  // Étape 1 : DVF + Quartier en parallèle (si code postal fourni)
  if (params.codePostal) {
    const typeLogement = params.typeLogement || 'appartement'
    const [marche, quartier] = await Promise.all([
      fetchMarche(params.codePostal, typeLogement, params.prixAchatMax),
      fetchQuartier(params.codePostal),
    ])
    result.marche = marche
    result.quartier = quartier
  }

  // Étape 2 : Synthèse IA (avec les données marché/quartier si disponibles)
  result.syntheseIA = await fetchSyntheseIA(params, result.marche, result.quartier)

  return result
}
