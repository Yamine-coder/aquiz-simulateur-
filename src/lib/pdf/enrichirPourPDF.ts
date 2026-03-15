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

export interface TransportProche {
  type: string
  typeTransport: string
  nom: string
  distance: number
  walkMin: number
  lat: number
  lon: number
  lignes?: string[]
  operateur?: string
  couleur?: string
}

export interface DonneesQuartier {
  scoreGlobal: number
  transports: number
  commerces: number
  ecoles: number
  sante: number
  espaceVerts: number
  synthese: string
  // ── Transports proches (source OSM) ──
  transportsProches?: TransportProche[]
  /** Agrégation de tous les transports du rayon (toutes lignes, tous arrêts) */
  transportSummary?: Array<{ type: string; lignes: string[]; count: number; nearestWalkMin?: number }>
  /** Coordonnées GPS du bien (centre de la recherche) */
  bienLat?: number
  bienLon?: number
  /** URL de la carte statique des transports */
  mapImageUrl?: string
  /** Comptages bruts de POIs par catégorie (rayon 800m) */
  counts?: {
    transport: number
    commerce: number
    education: number
    sante: number
    loisirs: number
    vert: number
  }
  /** Comptages détaillés par type d'amenity dans chaque catégorie */
  detailedCounts?: Record<string, Array<{ type: string; label: string; count: number }>>
  // ── Enrichissements (optionnels) ──
  /** Score risques 0-10 (10 = très sûr, 0 = très exposé) — source Géorisques */
  risques?: number | null
  risquesDetail?: string | null
  /** Score niveau de vie 0-10 — source INSEE Filosofi (revenu médian) */
  niveauVie?: number | null
  niveauVieLabel?: string | null
  /** Revenu médian annuel en euros — source INSEE Filosofi */
  revenuMedian?: number | null
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
async function fetchQuartier(codePostal: string, nomCommune?: string): Promise<DonneesQuartier | null> {
  try {
    // 1. Géocoder avec commune + code postal pour cibler la bonne localisation
    const geoParams = new URLSearchParams()
    geoParams.set('code_postal', codePostal)
    if (nomCommune) geoParams.set('adresse', nomCommune)
    const geoRes = await fetch(
      `/api/analyse/geocode?${geoParams.toString()}`,
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

    // Si même le score OSM a échoué, on ne renvoie pas de données quartier
    if (!quartierData) {
      return null
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
          quartierData.revenuMedian = inseeJson.data.revenuMedian ?? null
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
      { score: osmScore > 0 ? osmScore : null, poids: 55 },
      { score: risquesScore, poids: 12 },
      { score: niveauVieScore, poids: 20 },
      { score: airScore, poids: 13 },
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

    // 9. Stocker les coordonnées du bien pour la carte statique
    quartierData.bienLat = lat
    quartierData.bienLon = lon

    // 10. Générer l'URL de la carte statique OpenStreetMap
    if (quartierData.transportsProches && quartierData.transportsProches.length > 0) {
      const transports = quartierData.transportsProches.filter(
        (tp: TransportProche) => !/^(Gare|Station|Arrêt|Transport)$/i.test(tp.nom.trim())
      )
      if (transports.length > 0) {
        // Construire les marqueurs pour l'API staticmap.openstreetmap.de
        // Marqueur rouge pour le bien
        const markers: string[] = [`${lat},${lon},red-pushpin`]
        // Marqueurs bleus pour les stations
        for (const tp of transports) {
          if (tp.lat && tp.lon) {
            markers.push(`${tp.lat},${tp.lon},blue-pushpin`)
          }
        }
        // Calculer un bbox englobant tous les points avec marge
        const allLats = [lat, ...transports.filter((t: TransportProche) => t.lat).map((t: TransportProche) => t.lat)]
        const allLons = [lon, ...transports.filter((t: TransportProche) => t.lon).map((t: TransportProche) => t.lon)]
        const minLat = Math.min(...allLats) - 0.002
        const maxLat = Math.max(...allLats) + 0.002
        const minLon = Math.min(...allLons) - 0.003
        const maxLon = Math.max(...allLons) + 0.003
        quartierData.mapImageUrl =
          `https://staticmap.openstreetmap.de/staticmap.php?bbox=${minLon},${minLat},${maxLon},${maxLat}&size=500x300&maptype=osmarenderer&markers=${markers.join('|')}`
      }
    }

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
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => 'no body')
      console.error('[enrichirPourPDF] synthese-ia API error:', res.status, errText)
      return null
    }
    const json = await res.json()
    if (!json.success || !json.data) {
      console.warn('[enrichirPourPDF] synthese-ia API returned:', { success: json.success, source: json.source, hasData: !!json.data })
      return null
    }

    console.info('[enrichirPourPDF] Synthèse IA source:', json.source)
    return {
      synthese: json.data.synthese,
      economieEstimee: json.data.economieEstimee,
      cliffhanger: json.data.cliffhanger,
      source: json.source ?? 'unknown',
    }
  } catch (err) {
    console.error('[enrichirPourPDF] fetchSyntheseIA failed:', err)
    return null
  }
}

// ============================================
// FALLBACK CLIENT (quand l'API est injoignable)
// ============================================

/**
 * Synthèse déterministe côté client, utilisée si l'API IA est indisponible.
 * Garantit que la section IA apparaît TOUJOURS dans le PDF.
 */
function generateClientFallbackSyntheseIA(
  params: EnrichissementParams,
  marche: DonneesMarcheLocal | null,
  quartier: DonneesQuartier | null
): SyntheseIA {
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
  const pctApport = params.prixAchatMax > 0 ? Math.round((params.apport / params.prixAchatMax) * 100) : 0

  if (params.mode === 'B') {
    const parts: string[] = []

    if (marche && marche.surfaceEstimee > 0 && marche.prixM2Median > 0) {
      const prixM2Bien = params.prixAchatMax / marche.surfaceEstimee
      const ecart = Math.round(((prixM2Bien / marche.prixM2Median) - 1) * 100)
      if (ecart > 5) {
        parts.push('Ce bien se situe au-dessus du prix médian du secteur — une analyse approfondie permettra de déterminer si cet écart est justifié ou s\'il existe une marge de négociation.')
      } else if (ecart < -3) {
        parts.push('Ce bien est positionné en-dessous du marché local, ce qui peut représenter une opportunité — à condition de vérifier l\'état réel du bien et les éventuels travaux à prévoir.')
      } else {
        parts.push('Ce bien est dans la fourchette du marché local. Au-delà du prix, c\'est l\'adéquation avec votre projet de vie et le potentiel de valorisation qui feront la différence.')
      }
    } else {
      parts.push('L\'analyse de ce bien nécessite une mise en perspective avec le marché local et les critères de qualité du quartier pour évaluer sa juste valeur.')
    }

    if (params.typeBien === 'ancien') {
      parts.push('En ancien, les documents de copropriété et les diagnostics techniques révèlent souvent des coûts cachés que le prix affiché ne reflète pas.')
    } else {
      parts.push('En neuf, au-delà du prix, la réputation du promoteur et les prestations incluses déterminent la vraie valeur de l\'investissement.')
    }

    if (quartier && quartier.risques != null && quartier.risques < 5) {
      parts.push('Attention : la zone présente des risques identifiés qui méritent une analyse approfondie avant toute offre.')
    }

    parts.push('Un conseiller AQUIZ analyse le bien dans sa globalité — état, copropriété, quartier, négociation et financement — pour sécuriser votre achat.')

    const negoEconomie = marche ? Math.round(params.prixAchatMax * 0.04) : 0
    const financeEconomie = Math.round(params.capitalEmpruntable * 0.002 * params.dureeAns)

    return {
      synthese: parts.join(' '),
      economieEstimee: negoEconomie + financeEconomie,
      cliffhanger: 'Avez-vous vérifié les diagnostics et les PV de copropriété avant de faire une offre ? Un conseiller AQUIZ peut les analyser pour vous.',
      source: 'deterministe-client',
    }
  }

  // Mode A
  const parts: string[] = []

  if (pctApport >= 20) {
    parts.push('Votre niveau d\'apport vous donne une vraie liberté de choix — non seulement pour le financement, mais aussi pour cibler des biens nécessitant des travaux où la négociation est plus forte.')
  } else if (pctApport < 10) {
    parts.push('Avec un apport modeste, la stratégie d\'achat doit être ciblée : privilégiez les biens au juste prix dans des secteurs porteurs pour sécuriser votre investissement.')
  } else {
    parts.push(`Votre apport de ${fmt(params.apport)} EUR (${pctApport}%) vous place dans une position correcte — l'enjeu est maintenant de choisir le bon bien au bon prix.`)
  }

  parts.push('Quel que soit le budget, la vraie différence se fait sur le choix du bien : un DPE défavorable, des travaux de copropriété imprévus ou un quartier mal desservi peuvent transformer une opportunité en mauvais investissement.')

  parts.push('Un conseiller AQUIZ vous accompagne sur tout le parcours — analyse des biens, vérification des documents, négociation et montage financier.')

  return {
    synthese: parts.join(' '),
    economieEstimee: Math.round(params.capitalEmpruntable * 0.002 * params.dureeAns) + Math.round(params.mensualite * 0.15 * params.dureeAns * 12),
    cliffhanger: 'Savez-vous quels critères vérifier en priorité avant de faire une offre ? Un conseiller AQUIZ peut vous guider.',
    source: 'deterministe-client',
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
      fetchQuartier(params.codePostal, params.nomCommune),
    ])
    result.marche = marche
    result.quartier = quartier
  }

  // Étape 2 : Synthèse IA (avec les données marché/quartier si disponibles)
  const syntheseIA = await fetchSyntheseIA(params, result.marche, result.quartier)
  
  // Fallback client : si l'API échoue (timeout, réseau), générer une synthèse déterministe
  if (syntheseIA) {
    result.syntheseIA = syntheseIA
  } else {
    result.syntheseIA = generateClientFallbackSyntheseIA(params, result.marche, result.quartier)
  }

  return result
}
