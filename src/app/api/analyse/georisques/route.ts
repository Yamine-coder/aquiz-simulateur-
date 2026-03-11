/**
 * API Route - Proxy Géorisques
 * Appelle l'API georisques.gouv.fr côté serveur
 */

import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { ServerCache } from '@/lib/serverCache';
import { NextRequest, NextResponse } from 'next/server';

// Route dynamique (appelée côté client)

// Cache serveur borné — les risques changent rarement (TTL 12h, max 200 entrées)
const risquesCache = new ServerCache<unknown>({ ttlMs: 12 * 60 * 60 * 1000, maxSize: 200 })

interface RisqueNaturel {
  type: string
  niveau: string
  description: string
}

interface RisqueTechnologique {
  type: string
  niveau: string
  description: string
}

interface GASPARRisque {
  libelle_risque_jo?: string
  num_risque?: string
}

/**
 * Détermine le niveau de risque à partir du libellé GASPAR.
 * Les codes num_risque sont des catégories (pas des niveaux de sévérité).
 * On utilise donc le libellé pour détecter des mots-clés de gravité.
 */
function determinerNiveau(risque: GASPARRisque): 'faible' | 'moyen' | 'fort' {
  const libelle = (risque.libelle_risque_jo || '').toLowerCase()
  
  // Mots-clés indiquant un risque fort
  if (libelle.includes('majeur') || libelle.includes('très fort') || libelle.includes('seveso seuil haut')) {
    return 'fort'
  }
  // Mots-clés indiquant un risque moyen
  if (libelle.includes('moyen') || libelle.includes('modéré') || libelle.includes('seveso seuil bas')) {
    return 'moyen'
  }
  // Par défaut, risque identifié → au moins moyen (prudence)
  return 'moyen'
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
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const rayon = searchParams.get('rayon') || '1000'
  
  if (!lat || !lon) {
    return NextResponse.json(
      { success: false, error: 'Coordonnées manquantes' },
      { status: 400 }
    )
  }

  // ── Validation lat/lon ────────────────────────────────
  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)
  if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return NextResponse.json(
      { success: false, error: 'Coordonnées invalides' },
      { status: 400 }
    )
  }
  
  try {
    // Vérifier le cache serveur
    const cacheKey = `${lat}_${lon}_${rayon}`
    const cached = risquesCache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Appel API Géorisques avec timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(
      `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${lat},${lon}&rayon=${rayon}`,
      { headers: { 'Accept': 'application/json' }, signal: controller.signal }
    )

    clearTimeout(timeoutId)
    
    if (!response.ok) {
      // CRITIQUE : ne jamais prétendre qu'une zone est sûre sans données
      return NextResponse.json(
        { success: false, error: 'API Géorisques indisponible (HTTP ' + response.status + ')' },
        { status: 502 }
      )
    }
    
    const result = await response.json()
    
    // Parser les résultats
    const risquesNaturels: RisqueNaturel[] = []
    const risquesTechnologiques: RisqueTechnologique[] = []
    let zoneInondable = false
    
    // Analyser les risques GASPAR
    if (result.data && Array.isArray(result.data)) {
      for (const risque of result.data) {
        const libelle = (risque.libelle_risque_jo?.toLowerCase() || '') as string
        
        if (libelle.includes('inondation')) {
          zoneInondable = true
          risquesNaturels.push({
            type: 'inondation',
            niveau: determinerNiveau(risque),
            description: risque.libelle_risque_jo || 'Risque d\'inondation'
          })
        }
        
        if (libelle.includes('mouvement') || libelle.includes('terrain')) {
          risquesNaturels.push({
            type: 'mouvement_terrain',
            niveau: determinerNiveau(risque),
            description: 'Mouvement de terrain'
          })
        }
        
        if (libelle.includes('séisme') || libelle.includes('sismique')) {
          risquesNaturels.push({
            type: 'seisme',
            niveau: determinerNiveau(risque),
            description: 'Zone sismique'
          })
        }
        
        if (libelle.includes('industriel') || libelle.includes('seveso')) {
          risquesTechnologiques.push({
            type: 'seveso',
            niveau: determinerNiveau(risque),
            description: 'Installation industrielle'
          })
        }
      }
    }
    
    // ── Appel API Radon (best effort, ne bloque pas) ──────
    let niveauRadon: number | null = null
    try {
      const radonCtrl = new AbortController()
      const radonTimeout = setTimeout(() => radonCtrl.abort(), 4000)
      const radonRes = await fetch(
        `https://georisques.gouv.fr/api/v1/radon?latlon=${lat},${lon}`,
        { headers: { 'Accept': 'application/json' }, signal: radonCtrl.signal }
      )
      clearTimeout(radonTimeout)
      if (radonRes.ok) {
        const radonData = await radonRes.json()
        // L'API renvoie un tableau avec classement (1=faible, 2=moyen, 3=élevé)
        if (radonData.data && Array.isArray(radonData.data) && radonData.data.length > 0) {
          const classement = radonData.data[0].classe_potentiel
          if (typeof classement === 'number' && classement >= 1 && classement <= 3) {
            niveauRadon = classement
          }
        }
      }
    } catch {
      // Radon optionnel — on continue sans
    }

    // ── Appel API SIS — Sites et Sols Pollués (best effort) ──────
    let pollutionSols = false
    let nbSitesPollues = 0
    try {
      const sisCtrl = new AbortController()
      const sisTimeout = setTimeout(() => sisCtrl.abort(), 4000)
      const sisRes = await fetch(
        `https://georisques.gouv.fr/api/v1/sis?latlon=${lat},${lon}&rayon=${rayon}`,
        { headers: { 'Accept': 'application/json' }, signal: sisCtrl.signal }
      )
      clearTimeout(sisTimeout)
      if (sisRes.ok) {
        const sisData = await sisRes.json()
        if (sisData.data && Array.isArray(sisData.data) && sisData.data.length > 0) {
          pollutionSols = true
          nbSitesPollues = sisData.data.length
        }
      }
    } catch {
      // SIS optionnel — on continue sans
    }

    // Calculer le score global (100 = sûr, 0 = très risqué)
    // Éviter le double-comptage : les risques inondation sont déjà pénalisés via zoneInondable
    const nonFloodNaturels = risquesNaturels.filter(r => r.type !== 'inondation')
    let scoreGlobal = 100
    scoreGlobal -= nonFloodNaturels.length * 10
    scoreGlobal -= risquesTechnologiques.length * 15
    if (zoneInondable) scoreGlobal -= 20
    if (niveauRadon && niveauRadon >= 3) scoreGlobal -= 10
    if (pollutionSols) scoreGlobal -= Math.min(nbSitesPollues * 10, 25) // Max -25 pour pollution sols
    scoreGlobal = Math.max(0, Math.min(100, scoreGlobal))
    
    // Générer la synthèse
    const totalRisques = risquesNaturels.length + risquesTechnologiques.length
    let synthese = '✅ Aucun risque majeur identifié'
    const alertes: string[] = []
    if (zoneInondable) alertes.push('Zone inondable')
    if (risquesNaturels.length > 0) alertes.push(`${risquesNaturels.length} risque(s) naturel(s)`)
    if (risquesTechnologiques.length > 0) alertes.push(`${risquesTechnologiques.length} risque(s) techno(s)`)
    if (niveauRadon && niveauRadon >= 3) alertes.push('Radon élevé')
    if (pollutionSols) alertes.push(`${nbSitesPollues} site(s) pollué(s)`)
    if (alertes.length > 0) {
      synthese = '⚠️ ' + alertes.join(' • ')
    } else if (niveauRadon && niveauRadon >= 3) {
      synthese = '⚠️ Potentiel radon élevé'
    }
    
    const responseData = {
      success: true,
      data: {
        risquesNaturels,
        risquesTechnologiques,
        zoneInondable,
        niveauRadon,
        pollutionSols,
        nbSitesPollues,
        scoreGlobal,
        synthese
      },
      source: 'Géorisques'
    }

    // Stocker en cache
    risquesCache.set(cacheKey, responseData)

    return NextResponse.json(responseData)
    
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'API Géorisques timeout (8s)'
      : 'Erreur de connexion Géorisques'
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    )
  }
}
