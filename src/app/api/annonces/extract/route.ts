/**
 * API Route pour extraire les données d'une annonce depuis son URL
 * POST /api/annonces/extract
 * 
 * Cascade d'extraction 100% gratuite :
 * NIVEAU 1 — APIs internes (JSON, bypass anti-bot) : SeLoger, LeBonCoin, Bien'ici, Laforêt, Orpi
 * NIVEAU 2 — Fetch direct + parsing HTML/JSON-LD/meta : Century21, ParuVendu, tout site
 * NIVEAU 3 — Jina Reader (extraction texte IA)
 * NIVEAU 4 — Google Cache, Playwright Chrome stealth, proxies gratuits, Archive.org
 * NIVEAU 5 — Services payants optionnels (ScrapingBee, Firecrawl)
 * 
 * Protections anti-blocage :
 * - Cache URL (même annonce = 0 requête pendant 2h)
 * - Throttle par domaine (max 1 req / 3-5s par site)
 * - Retry avec backoff exponentiel
 * - Rotation User-Agent (22 vrais navigateurs)
 * - Délais aléatoires entre stratégies
 * - Détection automatique challenge/captcha
 */

import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import {
    getCachedResult,
    getRandomUserAgent,
    isBlockedResponse,
    protectedFetch,
    randomDelay,
    recordRequest,
    setCachedResult,
    waitForDomainThrottle,
} from '@/lib/scraping/antiBlock'
import {
    detecterSource,
    extractFromHTML,
} from '@/lib/scraping/extracteur'
import { compterChampsExtraits, parseTexteAnnonce } from '@/lib/scraping/parseTexteAnnonce'
import { tryPlaywrightChrome } from '@/lib/scraping/playwrightScraper'
import { NextRequest, NextResponse } from 'next/server'

/** Seuil minimum de champs extraits pour considérer l'extraction réussie */
const MIN_FIELDS = 2

/** Résultat d'extraction structuré (avant conversion en NextResponse) */
interface ExtractionResponse {
  success: true
  source: string
  data: Record<string, unknown>
  fieldsExtracted?: number
  method: string
  message: string
}

/** Sites pour lesquels ScrapingBee doit activer premium_proxy (DataDome/Cloudflare) */
const PREMIUM_PROXY_SITES = ['seloger', 'leboncoin', 'pap', 'logic-immo', 'ouestfrance', 'figaro']

/** Sites protégés par anti-bot lourd (DataDome, Cloudflare) → Playwright en priorité */
const SITES_CHROME_FIRST = ['logic-immo']
export async function POST(request: NextRequest) {
  // ── Global cascade timeout (55s — under Vercel's 60s Pro limit) ──
  const GLOBAL_TIMEOUT_MS = 55_000
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), GLOBAL_TIMEOUT_MS)

  try {
    const result = await Promise.race([
      handleExtraction(request),
      new Promise<NextResponse>((_, reject) => {
        timeoutController.signal.addEventListener('abort', () =>
          reject(new Error('GLOBAL_TIMEOUT'))
        )
      }),
    ])
    return result
  } catch (err) {
    if (err instanceof Error && err.message === 'GLOBAL_TIMEOUT') {
      return NextResponse.json(
        {
          success: false,
          error: 'L\'extraction a pris trop de temps. Essayez de coller le texte de l\'annonce.',
          autoFallback: true,
        },
        { status: 504 }
      )
    }
    console.error('Erreur extraction annonce (global):', err)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de l\'extraction' },
      { status: 500 }
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

async function handleExtraction(request: NextRequest): Promise<NextResponse> {
  try {
    // ── Rate Limiting ─────────────────────────────────────
    const ip = getClientIP(request.headers)
    const rateCheck = checkRateLimit(`extract:${ip}`, RATE_LIMITS.extract)
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Trop de requêtes d\'extraction. Veuillez patienter.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      )
    }

    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL requise' },
        { status: 400 }
      )
    }
    
    // Valider l'URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, error: 'URL invalide' },
        { status: 400 }
      )
    }

    // ── Protection SSRF : bloquer les URL internes ──────
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']
    const blockedPrefixes = ['10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.', '169.254.']
    const hostname = parsedUrl.hostname.toLowerCase()
    if (
      parsedUrl.protocol !== 'https:' ||
      blockedHosts.includes(hostname) ||
      blockedPrefixes.some(p => hostname.startsWith(p)) ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return NextResponse.json(
        { success: false, error: 'URL non autorisée' },
        { status: 400 }
      )
    }
    
    // Détecter la source
    const source = detecterSource(url)
    
    // ═══════════════════════════════════════════════════════
    // CACHE : Vérifier si cette URL a déjà été scrapée récemment
    // ═══════════════════════════════════════════════════════
    const cached = getCachedResult(url)
    if (cached) {
      recordRequest(url, 'cache-hit')
      return NextResponse.json({
        success: true,
        source: cached.source,
        data: cached.data,
        fieldsExtracted: cached.fieldsExtracted,
        method: `${cached.method} (cache)`,
        message: `${cached.message} [cache]`,
        fromCache: true,
      })
    }
    
    let extractionResult: ExtractionResponse | null = null
    let triedChrome = false
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 1 : APIs internes (GRATUIT, JSON, le plus fiable)
    // Chaque grand site FR a une API propriétaire qu'on appelle directement
    // → Bypass total des protections anti-bot
    // ═══════════════════════════════════════════════════════
    if (source === 'seloger') {
      extractionResult = await trySeLogerAPI(url)
    }
    if (!extractionResult && source === 'leboncoin') {
      extractionResult = await tryLeBonCoinAPI(url)
    }
    if (!extractionResult && source === 'bienici') {
      extractionResult = await tryBienIciAPI(url)
    }
    if (!extractionResult && source === 'laforet') {
      extractionResult = await tryLaforetAPI(url)
    }
    if (!extractionResult && source === 'orpi') {
      extractionResult = await tryOrpiAPI(url)
    }
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 1.5 : Chrome stealth (pour sites très protégés sans API)
    // Uniquement Logic-Immo et sites DataDome/Cloudflare sans API connue
    // ═══════════════════════════════════════════════════════
    if (!extractionResult && source && SITES_CHROME_FIRST.includes(source)) {
      extractionResult = await tryPlaywrightChrome(url, source)
      triedChrome = true
    }
    
    // ── Délai aléatoire entre stratégies ──
    if (!extractionResult) await randomDelay(500, 1500)
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 2 : Fetch direct + parsing HTML/JSON-LD/meta
    // Fonctionne pour tout site sans protection anti-bot :
    // Century21, ParuVendu, agences indépendantes, etc.
    // ═══════════════════════════════════════════════════════
    if (!extractionResult) {
      extractionResult = await tryDirectFetch(url, source)
    }
    
    // ── Délai aléatoire ──
    if (!extractionResult) await randomDelay(500, 1500)
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 3 : Jina Reader (extraction texte IA, gratuit)
    // ═══════════════════════════════════════════════════════
    if (!extractionResult) {
      extractionResult = await tryJinaReader(url, source)
    }
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 4 : Fallbacks gratuits
    // Google Cache → Playwright fallback → Proxies → Archive.org
    // ═══════════════════════════════════════════════════════
    if (!extractionResult) {
      extractionResult = await tryGoogleCache(url, source)
    }
    
    if (!extractionResult && !triedChrome) {
      await randomDelay(1000, 2500)
      extractionResult = await tryPlaywrightChrome(url, source)
    }
    
    if (!extractionResult) {
      extractionResult = await tryFreeProxies(url, source)
    }
    
    if (!extractionResult) {
      extractionResult = await tryArchiveOrg(url, source)
    }
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 5 : Services payants (optionnels, dernier recours)
    // ═══════════════════════════════════════════════════════
    if (!extractionResult) {
      extractionResult = await tryScrapingBee(url, source)
    }
    if (!extractionResult) {
      extractionResult = await tryFirecrawl(url, source)
    }
    
    // ===== TOUT A ÉCHOUÉ =====
    if (!extractionResult) {
      recordRequest(url, 'blocked')
      
      const HEAVILY_PROTECTED = ['pap', 'logic-immo', 'ouestfrance', 'figaro']
      const isHeavilyProtected = source !== null && HEAVILY_PROTECTED.includes(source)
      
      const siteNames: Record<string, string> = {
        'logic-immo': 'Logic-Immo', pap: 'PAP.fr',
        ouestfrance: 'Ouest-France Immo', figaro: 'Figaro Immo'
      }
      const siteName = (source && siteNames[source]) || 'Ce site'
      
      return NextResponse.json({
        success: false,
        error: isHeavilyProtected
          ? `${siteName} bloque l'extraction automatique (protection anti-bot).`
          : 'Impossible de récupérer les données de cette annonce.',
        hint: 'Copiez le texte de la page depuis votre navigateur',
        protectedSite: isHeavilyProtected,
        autoFallback: true,
      }, { status: 502 })
    }
    
    // ===== ENRICHIR AVEC IMAGE SI MANQUANTE =====
    if (!extractionResult.data.imageUrl) {
      const imageUrl = await fetchOgImage(url)
      if (imageUrl) {
        extractionResult.data.imageUrl = imageUrl
      }
    }
    
    // ===== STOCKER EN CACHE + STATS =====
    recordRequest(url, 'success')
    setCachedResult(
      url,
      extractionResult.data,
      extractionResult.method,
      extractionResult.source,
      extractionResult.fieldsExtracted || 0,
      extractionResult.message,
    )
    
    return NextResponse.json(extractionResult)
    
  } catch (error) {
    console.error('Erreur extraction annonce:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de l\'extraction' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────
// Stratégie Bien'ici : Fetch direct + parsing intelligent
// Bien'ici est un SPA React/Next.js. On fetch la page avec rotation UA
// et on parse __NEXT_DATA__, JSON-LD, HTML et inline JS state.
// ─────────────────────────────────────
async function tryBienIciAPI(url: string): Promise<ExtractionResponse | null> {
  try {
    // Extraire l'ID de l'annonce depuis l'URL
    // Format: /annonce/vente/paris-18e-75018/appartement/3pieces/ag-23-3605534
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    const adId = pathParts[pathParts.length - 1]
    
    if (!adId || adId.length < 3) {
      console.warn('Bien\'ici: impossible d\'extraire l\'ID depuis', url)
      return null
    }
    
    // Stratégie 1 : API JSON directe
    try {
      await waitForDomainThrottle(`https://www.bienici.com/`)
      const jsonResp = await fetch(`https://www.bienici.com/realEstateAd.json?id=${encodeURIComponent(adId)}`, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          'Referer': 'https://www.bienici.com/',
          'Origin': 'https://www.bienici.com',
        },
        signal: AbortSignal.timeout(10000),
      })
      
      if (jsonResp.ok) {
        const json = await jsonResp.json() as Record<string, unknown>
        if (json && (json.price || json.surfaceArea || json.surface)) {
          const data = parseBienIciData(json, url)
          if (data) return data
        }
      }
    } catch { /* JSON API failed, try page fetch */ }
    
    // Stratégie 2 : Fetch de la page HTML (protégé avec throttle + rotation UA)
    const response = await protectedFetch(url, { timeoutMs: 12000 })
    
    const html = await response.text()
    
    // Détecter challenge/blocage
    if (isBlockedResponse(html)) {
      console.warn('Bien\'ici: challenge anti-bot détecté')
      return null
    }
    
    // Pipeline centralisé : toutes couches d'extraction en 1 appel
    const data: Record<string, unknown> = extractFromHTML(html, url)
    
    // Chercher des données inline JS (window.__INITIAL_STATE__, __APP_STATE__, etc.)
    const inlinePatterns = [
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
      /window\.__APP_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
      /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
      /window\.__REDUX_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
    ]
    
    for (const pattern of inlinePatterns) {
      const match = html.match(pattern)
      if (match) {
        try {
          const inlineJson = JSON.parse(match[1]) as Record<string, unknown>
          const extracted = extractRealEstateFromJson(inlineJson)
          if (extracted) {
            for (const [key, value] of Object.entries(extracted)) {
              if (value !== undefined && value !== null && (data[key] === undefined || data[key] === null || data[key] === 'NC')) {
                data[key] = value
              }
            }
          }
        } catch { /* JSON parse failed */ }
        break
      }
    }
    
    // Toujours compléter avec le texte brut pour les champs manquants
    // (déjà fait par extractFromHTML, mais les inline JS ont pu ajouter des seedData)
    
    if (!data.prix && !data.surface) return null
    
    completerDonnees(data)
    
    const fieldsCount = Object.keys(data).filter(k =>
      k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
    ).length
    
    return {
      success: true,
      source: 'bienici',
      data,
      fieldsExtracted: fieldsCount,
      method: 'bienici-direct',
      message: `${fieldsCount} données extraites depuis Bien'ici (scraping maison)`
    }
  } catch (err) {
    console.warn('Bien\'ici échoué:', err)
    return null
  }
}

/**
 * Parse les données JSON d'une annonce Bien'ici
 * Gère les différents formats de leur API interne
 */
function parseBienIciData(json: Record<string, unknown>, url: string): ExtractionResponse | null {
  const data: Record<string, unknown> = { url }
  
  // Prix
  if (typeof json.price === 'number') data.prix = json.price
  else if (typeof json.price === 'string') { const p = parseFloat(json.price); if (!isNaN(p)) data.prix = p }
  
  // Surface
  const surface = json.surfaceArea || json.surface
  if (typeof surface === 'number') data.surface = surface
  
  // Pièces / Chambres / SDB
  const rooms = json.roomsQuantity || json.rooms || json.nbRooms
  if (typeof rooms === 'number') data.pieces = rooms
  
  const bedrooms = json.bedroomsQuantity || json.bedrooms || json.nbBedrooms
  if (typeof bedrooms === 'number') data.chambres = bedrooms
  
  const bathrooms = json.bathroomsQuantity || json.bathrooms || json.nbBathrooms
  if (typeof bathrooms === 'number') data.nbSallesBains = bathrooms
  
  // DPE / GES
  const dpe = json.energyClassification || json.energyValue || json.dpeValue || json.energyPerformanceDiagnostic
  if (typeof dpe === 'string' && /^[A-G]$/i.test(dpe)) data.dpe = dpe.toUpperCase()
  
  const ges = json.greenhouseGasClassification || json.gesValue || json.ghgValue || json.greenhouseGasEmission
  if (typeof ges === 'string' && /^[A-G]$/i.test(ges)) data.ges = ges.toUpperCase()
  
  // Localisation
  if (typeof json.city === 'string') data.ville = json.city
  const cp = json.postalCode || json.zipCode
  if (typeof cp === 'string') data.codePostal = cp
  else if (typeof cp === 'number') data.codePostal = String(cp)
  
  // Type de bien
  const propType = (json.propertyType || json.adType || '') as string
  if (/house|maison|villa|pavillon/i.test(propType)) data.type = 'maison'
  else if (propType) data.type = 'appartement'
  
  // Photos
  if (Array.isArray(json.photos)) {
    const photos = (json.photos as Array<string | Record<string, unknown>>)
      .map(p => typeof p === 'string' ? p : String(p.url || p.originalUrl || p.url_photo || ''))
      .filter(p => p.startsWith('http'))
    if (photos.length > 0) {
      data.imageUrl = photos[0]
      data.images = photos.slice(0, 20)
    }
  }
  
  // Détails
  if (typeof json.floor === 'number') data.etage = json.floor
  if (typeof json.floorsQuantity === 'number') data.etagesTotal = json.floorsQuantity
  if (json.hasElevator === true) data.ascenseur = true
  if (json.hasCellar === true) data.cave = true
  if (json.hasParking === true || (typeof json.parkingPlacesQuantity === 'number' && json.parkingPlacesQuantity > 0)) data.parking = true
  // Balcon / Terrasse / Loggia (manquant auparavant)
  if (json.hasBalcony === true || json.hasTerrace === true || json.hasLoggia === true ||
      json.balcony === true || json.terrace === true) data.balconTerrasse = true
  // Orientation / Exposition
  const exposure = json.exposure || json.orientation
  if (typeof exposure === 'string' && exposure.length > 0 && exposure.length <= 30) {
    data.orientation = exposure
  } else if (Array.isArray(exposure)) {
    // Bien'ici renvoie parfois ["Sud", "Ouest"]
    data.orientation = (exposure as string[]).filter(e => typeof e === 'string').join('/').substring(0, 30)
  }
  // Adresse
  const street = json.streetAddress || json.street || json.address
  if (typeof street === 'string' && street.length >= 3 && street.length <= 100) {
    data.adresse = street
  }
  if (typeof json.yearOfConstruction === 'number') data.anneeConstruction = json.yearOfConstruction
  if (typeof json.propertyTax === 'number') data.taxeFonciere = json.propertyTax
  if (typeof json.condominiumFees === 'number') data.chargesMensuelles = Math.round(json.condominiumFees)
  // Charges mensuelles — aussi chercher dans "charges"
  if (!data.chargesMensuelles) {
    const charges = json.charges || json.monthlyCharges
    if (typeof charges === 'number' && charges > 0) {
      data.chargesMensuelles = charges > 500 ? Math.round(charges / 12) : Math.round(charges)
    }
  }
  if (typeof json.description === 'string') data.description = (json.description as string).substring(0, 1000)
  if (typeof json.title === 'string') data.titre = json.title
  
  // Compléter avec le parsing texte de la description (taxe foncière, orientation, DPE, etc.)
  if (data.description) {
    const textData = parseTexteAnnonce(data.description as string)
    const textRecord = textData as unknown as Record<string, unknown>
    for (const [key, value] of Object.entries(textRecord)) {
      if (value === undefined || value === null || value === 'NC') continue
      if (data[key] === undefined || data[key] === null || data[key] === 'NC') {
        data[key] = value
      }
    }
  }
  
  if (!data.prix && !data.surface) return null
  
  completerDonnees(data)
  
  const fieldsCount = Object.keys(data).filter(k =>
    k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
  ).length
  
  return {
    success: true,
    source: 'bienici',
    data,
    fieldsExtracted: fieldsCount,
    method: 'bienici-api',
    message: `${fieldsCount} données extraites depuis Bien'ici (API directe)`
  }
}

/**
 * Recherche récursive de données immobilières dans un objet JSON imbriqué
 * Utilisé pour parser les __INITIAL_STATE__ et autres données inline
 */
function extractRealEstateFromJson(obj: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 6 || !obj || typeof obj !== 'object') return null
  
  const o = obj as Record<string, unknown>
  
  // Vérifier si cet objet ressemble à une annonce immobilière
  if ((o.price || o.prix) && (o.surfaceArea || o.surface || o.livingArea)) {
    const result: Record<string, unknown> = {}
    
    const prix = o.price || o.prix
    if (typeof prix === 'number') result.prix = prix
    
    const surf = o.surfaceArea || o.surface || o.livingArea
    if (typeof surf === 'number') result.surface = surf
    
    const rooms = o.roomsQuantity || o.rooms || o.nbRooms
    if (typeof rooms === 'number') result.pieces = rooms
    
    const beds = o.bedroomsQuantity || o.bedrooms
    if (typeof beds === 'number') result.chambres = beds
    
    const baths = o.bathroomsQuantity || o.bathrooms
    if (typeof baths === 'number') result.nbSallesBains = baths
    
    const dpe = o.energyClassification || o.energyValue || o.dpe
    if (typeof dpe === 'string' && /^[A-G]$/i.test(dpe)) result.dpe = dpe.toUpperCase()
    
    const ges = o.greenhouseGasClassification || o.gesValue || o.ges
    if (typeof ges === 'string' && /^[A-G]$/i.test(ges)) result.ges = ges.toUpperCase()
    
    if (typeof o.city === 'string') result.ville = o.city
    if (typeof o.postalCode === 'string') result.codePostal = o.postalCode
    if (typeof o.zipCode === 'string' && !result.codePostal) result.codePostal = o.zipCode
    
    if (typeof o.description === 'string') result.description = (o.description as string).substring(0, 1000)
    if (typeof o.title === 'string') result.titre = o.title
    
    return Object.keys(result).length >= 2 ? result : null
  }
  
  // Parcourir les propriétés récursivement
  for (const value of Object.values(o)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = extractRealEstateFromJson(item, depth + 1)
        if (found) return found
      }
    } else {
      const found = extractRealEstateFromJson(value, depth + 1)
      if (found) return found
    }
  }
  
  return null
}

// ─────────────────────────────────────
// Stratégie LeBonCoin : API interne (gratuit, rapide, données complètes)
// L'API /finder/classified/<id> retourne le JSON complet de l'annonce
// avec prix, surface, pièces, DPE, GES, chambres, SDB, taxe foncière, etc.
// ─────────────────────────────────────
async function tryLeBonCoinAPI(url: string): Promise<ExtractionResponse | null> {
  try {
    // Extraire l'ID de l'annonce depuis l'URL
    // Formats: /ad/ventes_immobilieres/3131701667, /ad/3131701667, etc.
    const idMatch = url.match(/\/(\d{8,12})(?:\?|$|#)/) || url.match(/\/(\d{8,12})/)
    if (!idMatch) {
      console.warn('LeBonCoin API: impossible d\'extraire l\'ID depuis', url)
      return null
    }
    const adId = idMatch[1]
    
    await waitForDomainThrottle(`https://api.leboncoin.fr/`)
    const response = await fetch(`https://api.leboncoin.fr/finder/classified/${adId}`, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': 'https://www.leboncoin.fr/',
        'Origin': 'https://www.leboncoin.fr',
        'api_key': process.env.LEBONCOIN_API_KEY || '',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
      },
      signal: AbortSignal.timeout(10000),
    })
    
    if (!response.ok) {
      console.warn(`LeBonCoin API HTTP ${response.status} pour annonce ${adId}`)
      return null
    }
    
    const json = await response.json() as Record<string, unknown>
    
    // Vérifier que c'est bien une annonce (pas un captcha redirect)
    if (!json.list_id && !json.subject) {
      console.warn('LeBonCoin API: réponse captcha ou invalide')
      return null
    }
    
    const data: Record<string, unknown> = { url }
    
    // ── Données de base ──
    data.titre = json.subject as string || undefined
    data.description = (json.body as string || '')
      .replace(/\\n/g, '\n')
      .substring(0, 1000)
    
    // Prix (format: [595000])
    const priceArr = json.price as number[] | undefined
    if (Array.isArray(priceArr) && priceArr.length > 0) {
      data.prix = priceArr[0]
    }
    
    // Images
    const images = json.images as Record<string, unknown> | undefined
    if (images) {
      const urls = (images.urls as string[]) || []
      if (urls.length > 0) {
        data.imageUrl = urls[0]
        data.images = urls.slice(0, 20)
      }
    }
    
    // Location
    const loc = json.location as Record<string, unknown> | undefined
    if (loc) {
      data.ville = loc.city_label
        ? String(loc.city_label).replace(/\s*\d{5}\s*$/, '').trim()
        : loc.city || undefined
      data.codePostal = loc.zipcode ? String(loc.zipcode) : undefined
      // Adresse (LeBonCoin peut fournir l'adresse dans location)
      if (typeof loc.address === 'string' && (loc.address as string).length >= 3) {
        data.adresse = loc.address
      }
      // Coordonnées GPS (précises au quartier/rue)
      if (typeof loc.lat === 'number' && typeof loc.lng === 'number' && loc.lat !== 0 && loc.lng !== 0) {
        data.latitude = loc.lat as number
        data.longitude = loc.lng as number
      }
    }
    
    // ── Attributes (le plus important — contient tout) ──
    const attributes = json.attributes as Array<Record<string, unknown>> | undefined
    if (attributes && Array.isArray(attributes)) {
      for (const attr of attributes) {
        const key = String(attr.key || '').toLowerCase()
        const value = String(attr.value ?? '')
        const valueLabel = String(attr.value_label ?? '')
        
        switch (key) {
          case 'real_estate_type':
            if (/maison|villa|pavillon/i.test(valueLabel)) data.type = 'maison'
            else data.type = 'appartement'
            break
          case 'square':
            { const s = parseFloat(value); if (s >= 9 && s <= 2000) data.surface = s; }
            break
          case 'rooms':
            { const r = parseInt(value); if (r >= 1 && r <= 20) data.pieces = r; }
            break
          case 'bedrooms':
            { const b = parseInt(value); if (b >= 0 && b <= 20) data.chambres = b; }
            break
          case 'nb_bathrooms':
          case 'nb_shower_room':
            { const sdb = parseInt(value)
              if (sdb >= 1 && sdb <= 10) {
                data.nbSallesBains = ((data.nbSallesBains as number) || 0) + sdb
              }
            }
            break
          case 'energy_rate':
            if (/^[a-g]$/i.test(valueLabel)) data.dpe = valueLabel.toUpperCase()
            else if (/^[a-g]$/i.test(value)) data.dpe = value.toUpperCase()
            break
          case 'ges':
            if (/^[a-g]$/i.test(valueLabel)) data.ges = valueLabel.toUpperCase()
            else if (/^[a-g]$/i.test(value)) data.ges = value.toUpperCase()
            break
          case 'property_tax':
            { const tax = parseFloat(value); if (tax > 0 && tax < 20000) data.taxeFonciere = Math.round(tax); }
            break
          case 'charges':
          case 'monthly_charges':
            { const ch = parseFloat(value)
              if (ch > 0 && ch < 50000) data.chargesMensuelles = ch > 500 ? Math.round(ch / 12) : Math.round(ch)
            }
            break
          case 'floor_number':
            { const fl = parseInt(value); if (fl >= 0 && fl <= 50) data.etage = fl; }
            break
          case 'nb_floors_building':
            { const nf = parseInt(value); if (nf >= 1 && nf <= 60) data.etagesTotal = nf; }
            break
          case 'elevator':
            if (value === '1' || /oui/i.test(valueLabel)) data.ascenseur = true
            break
          case 'outside_access':
            if (/balcon|terrasse|loggia|jardin/i.test(valueLabel)) data.balconTerrasse = true
            break
          case 'nb_parking':
            { const np = parseInt(value); if (np >= 1) data.parking = true; }
            break
          case 'cellar':
            if (value === '1' || /oui/i.test(valueLabel)) data.cave = true
            break
          case 'specificities':
            // Ex: "Plusieurs toilettes", "Piscine", "Vue mer"
            break
          case 'immo_sell_type':
            // "old" = ancien, "new" = neuf
            break
          case 'exposure':
          case 'orientation':
            if (!data.orientation && valueLabel && valueLabel !== 'undefined') {
              data.orientation = valueLabel.substring(0, 30)
            }
            break
          case 'construction_year':
          case 'year_of_construction':
            if (!data.anneeConstruction) {
              const yr = parseInt(value)
              if (yr >= 1800 && yr <= 2030) data.anneeConstruction = yr
            }
            break
          case 'estimated_notary_fees':
          case 'estimated_total_property_price':
          case 'price_per_square_meter':
            // Infos complémentaires intéressantes mais pas mappées directement
            break
          default:
            break
        }
      }
    }
    
    // Extraire année construction depuis la description
    if (!data.anneeConstruction && data.description) {
      const desc = data.description as string
      const yearMatch = desc.match(/(?:construite?|construction|bâtie?|édifié|livré|livrée?)\s*(?:en\s*)?((?:19|20)\d{2})/i) ||
                        desc.match(/(?:immeuble|résidence|copropriété|programme)\s+(?:de|du)\s+((?:19|20)\d{2})/i) ||
                        desc.match(/livraison\s*(?:prévue\s*)?(?:T\d\s*)?((?:19|20)\d{2})/i) ||
                        desc.match(/datant\s+(?:de\s+)?((?:19|20)\d{2})/i) ||
                        desc.match(/(?:normes?\s+)?(?:BBC|RT)\s*(?:20\d{2})\b[^.]*?((?:19|20)\d{2})/i) ||
                        desc.match(/(?:année\s*(?:de\s*)?construction)\s*:?\s*((?:18|19|20)\d{2})/i)
      if (yearMatch) {
        const year = parseInt(yearMatch[1])
        if (year >= 1800 && year <= 2030) data.anneeConstruction = year
      }
    }
    
    // Compléter avec le parsing texte de la description (tous les champs manquants)
    if (data.description) {
      const textData = parseTexteAnnonce(data.description as string)
      const textRecord = textData as unknown as Record<string, unknown>
      for (const [key, value] of Object.entries(textRecord)) {
        if (value === undefined || value === null || value === 'NC') continue
        if (data[key] === undefined || data[key] === null || data[key] === 'NC') {
          data[key] = value
        }
      }
    }
    
    if (!data.dpe) data.dpe = 'NC'
    
    // Compléter les données manquantes
    completerDonnees(data)
    
    const fieldsCount = Object.keys(data).filter(k =>
      k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
    ).length
    
    return {
      success: true,
      source: 'leboncoin',
      data,
      fieldsExtracted: fieldsCount,
      method: 'leboncoin-api',
      message: `${fieldsCount} données extraites depuis LeBonCoin (API directe)`
    }
  } catch (err) {
    console.warn('LeBonCoin API échoué:', err)
    // Fallback : tenter l'endpoint alternatif
    return await tryLeBonCoinFallback(url)
  }
}

/**
 * Plan B LeBonCoin : essayer des endpoints alternatifs de l'API LBC
 * Si l'endpoint /finder/classified/ a échoué (rate limit, captcha, etc.)
 * on tente /api/adfinder/v1/classified/ ou /api/offer/v1/get/
 */
async function tryLeBonCoinFallback(url: string): Promise<ExtractionResponse | null> {
  try {
    const idMatch = url.match(/\/(\d{8,12})(?:\?|$|#)/) || url.match(/\/(\d{8,12})/)
    if (!idMatch) return null
    const adId = idMatch[1]

    await randomDelay(1500, 3500) // Pause plus longue avant retry
    await waitForDomainThrottle('https://api.leboncoin.fr/')

    console.log(`🔄 LeBonCoin fallback: retry pour ${adId}`)

    // Endpoint alternatif 1 : /api/adfinder/v1/
    const altEndpoints = [
      `https://api.leboncoin.fr/api/adfinder/v1/classified/${adId}`,
      `https://api.leboncoin.fr/finder/classified/${adId}`,
    ]

    for (const endpoint of altEndpoints) {
      try {
        const ua = getRandomUserAgent()
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': ua,
            'Accept': 'application/json',
            'Accept-Language': 'fr-FR,fr;q=0.9',
            'Referer': 'https://www.leboncoin.fr/',
            'Origin': 'https://www.leboncoin.fr',
            'api_key': process.env.LEBONCOIN_API_KEY || '',
          },
          signal: AbortSignal.timeout(10000),
        })

        if (response.ok) {
          const json = await response.json() as Record<string, unknown>
          if (json.list_id || json.subject) {
            console.log(`✅ LeBonCoin fallback réussi via ${new URL(endpoint).pathname}`)
            // Re-parse avec la même logique que tryLeBonCoinAPI
            // On utilise tryLeBonCoinAPI qui re-fera le fetch — mais l'API a déjà répondu
            // Donc on fait un mini-parse ici
            const data: Record<string, unknown> = { url }
            data.titre = json.subject as string || undefined
            data.description = (json.body as string || '').replace(/\\n/g, '\n').substring(0, 1000)

            const priceArr = json.price as number[] | undefined
            if (Array.isArray(priceArr) && priceArr.length > 0) data.prix = priceArr[0]

            const images = json.images as Record<string, unknown> | undefined
            if (images) {
              const urls = (images.urls as string[]) || []
              if (urls.length > 0) {
                data.imageUrl = urls[0]
                data.images = urls.slice(0, 20)
              }
            }

            // Location
            const location = json.location as Record<string, unknown> | undefined
            if (location) {
              data.ville = location.city as string || undefined
              data.codePostal = location.zipcode as string || undefined
              data.departement = location.department_name as string || undefined
              // Coordonnées GPS
              if (typeof location.lat === 'number' && typeof location.lng === 'number' && location.lat !== 0 && location.lng !== 0) {
                data.latitude = location.lat as number
                data.longitude = location.lng as number
              }
            }

            // Attributs immobiliers (parsing complet — identique au parser principal)
            const attrs = json.attributes as Array<Record<string, unknown>> | undefined
            if (Array.isArray(attrs)) {
              for (const attr of attrs) {
                const key = String(attr.key || '').toLowerCase()
                const val = String(attr.value ?? '')
                const valLabel = String(attr.value_label ?? '')
                if (!key || !val) continue
                switch (key) {
                  case 'real_estate_type':
                    if (/maison|villa|pavillon/i.test(valLabel)) data.type = 'maison'
                    else data.type = 'appartement'
                    break
                  case 'square': { const s = parseFloat(val); if (s >= 9 && s <= 2000) data.surface = s; } break
                  case 'rooms': { const r = parseInt(val); if (r >= 1 && r <= 20) data.pieces = r; } break
                  case 'bedrooms': { const b = parseInt(val); if (b >= 0 && b <= 20) data.chambres = b; } break
                  case 'nb_bathrooms':
                  case 'nb_shower_room': {
                    const sdb = parseInt(val)
                    if (sdb >= 1 && sdb <= 10) data.nbSallesBains = ((data.nbSallesBains as number) || 0) + sdb
                  } break
                  case 'energy_rate':
                    if (/^[a-g]$/i.test(valLabel)) data.dpe = valLabel.toUpperCase()
                    else if (/^[a-g]$/i.test(val)) data.dpe = val.toUpperCase()
                    break
                  case 'ges':
                    if (/^[a-g]$/i.test(valLabel)) data.ges = valLabel.toUpperCase()
                    else if (/^[a-g]$/i.test(val)) data.ges = val.toUpperCase()
                    break
                  case 'property_tax': { const tax = parseFloat(val); if (tax > 0 && tax < 20000) data.taxeFonciere = Math.round(tax); } break
                  case 'charges':
                  case 'monthly_charges': {
                    const ch = parseFloat(val)
                    if (ch > 0 && ch < 50000) data.chargesMensuelles = ch > 500 ? Math.round(ch / 12) : Math.round(ch)
                  } break
                  case 'floor_number': { const fl = parseInt(val); if (fl >= 0 && fl <= 50) data.etage = fl; } break
                  case 'nb_floors_building': { const nf = parseInt(val); if (nf >= 1 && nf <= 60) data.etagesTotal = nf; } break
                  case 'elevator':
                    if (val === '1' || /oui/i.test(valLabel)) data.ascenseur = true
                    break
                  case 'outside_access':
                    if (/balcon|terrasse|loggia|jardin/i.test(valLabel)) data.balconTerrasse = true
                    break
                  case 'nb_parking': { const np = parseInt(val); if (np >= 1) data.parking = true; } break
                  case 'cellar':
                    if (val === '1' || /oui/i.test(valLabel)) data.cave = true
                    break
                  case 'exposure':
                  case 'orientation':
                    if (!data.orientation && valLabel && valLabel !== 'undefined') data.orientation = valLabel.substring(0, 30)
                    break
                  case 'construction_year':
                  case 'year_of_construction': {
                    const yr = parseInt(val)
                    if (yr >= 1800 && yr <= 2030) data.anneeConstruction = yr
                  } break
                  default: break
                }
              }
            }

            // Enrichir avec le parsing texte de la description
            if (data.description) {
              const textData = parseTexteAnnonce(data.description as string)
              const textRecord = textData as unknown as Record<string, unknown>
              for (const [key, value] of Object.entries(textRecord)) {
                if (value === undefined || value === null || value === 'NC') continue
                if (data[key] === undefined || data[key] === null || data[key] === 'NC') {
                  data[key] = value
                }
              }
            }

            completerDonnees(data)
            const fieldsCount = Object.keys(data).filter(k =>
              k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
            ).length

            return {
              success: true,
              source: 'leboncoin',
              data,
              fieldsExtracted: fieldsCount,
              method: 'leboncoin-api-fallback',
              message: `${fieldsCount} données extraites depuis LeBonCoin (fallback API)`
            }
          }
        }
      } catch { /* cet endpoint a échoué, essayer le suivant */ }

      await randomDelay(500, 1500)
    }

    console.warn('LeBonCoin: tous les fallbacks API échoués')
    return null
  } catch {
    return null
  }
}

// ─────────────────────────────────────
// Stratégie SeLoger : API mobile interne (GRATUIT, bypass DataDome)
// L'API Groupe SeLoger accepte les requêtes avec le User-Agent de l'app iOS SeLoger
// Retourne le JSON complet de l'annonce : prix, surface, pièces, DPE, GES, photos, etc.
// ─────────────────────────────────────
async function trySeLogerAPI(url: string): Promise<ExtractionResponse | null> {
  try {
    // Extraire l'ID de l'annonce depuis l'URL
    // Format: /annonces/achat/appartement/paris-17eme-75/.../260515181.htm
    const idMatch = url.match(/\/(\d{6,12})\.htm/) || url.match(/\/(\d{6,12})(?:\?|$|#)/)
    if (!idMatch) {
      console.warn('SeLoger API: impossible d\'extraire l\'ID depuis', url)
      return null
    }
    const adId = idMatch[1]

    // ── Rotation de User-Agents d'app mobile SeLoger ──
    const SELOGER_APP_UAS = [
      'SeLoger/12.4.0 CFNetwork/1562 Darwin/24.0.0',
      'SeLoger/12.3.1 CFNetwork/1560 Darwin/23.6.0',
      'SeLoger/12.2.0 CFNetwork/1559 Darwin/23.5.0',
      'SeLoger/11.9.0 CFNetwork/1496 Darwin/23.4.0',
      'SeLoger/12.4.0 (iPhone; iOS 18.0; Scale/3.0)',
      'SeLoger/12.3.1 (iPhone; iOS 17.5; Scale/3.0)',
    ]
    const appUA = SELOGER_APP_UAS[Math.floor(Math.random() * SELOGER_APP_UAS.length)]

    await waitForDomainThrottle(`https://api-seloger.svc.groupe-seloger.com/`)
    const response = await fetch(
      `https://api-seloger.svc.groupe-seloger.com/api/v1/listings/${adId}`,
      {
        headers: {
          'User-Agent': appUA,
          'Accept': 'application/json',
          'Accept-Language': 'fr-FR',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        signal: AbortSignal.timeout(12000),
      }
    )

    if (!response.ok) {
      console.warn(`SeLoger API HTTP ${response.status} pour annonce ${adId}`)
      return null
    }

    const json = await response.json() as Record<string, unknown>

    // Vérifier que c'est bien une annonce (pas un redirect/erreur)
    if (!json.id && !json.price && !json.livingArea) {
      console.warn('SeLoger API: réponse invalide pour', adId)
      return null
    }

    return parseSeLogerData(json, url)
  } catch (err) {
    console.warn('SeLoger API échoué:', err instanceof Error ? err.message : err)
    // Fallback : tenter avec un autre User-Agent mobile
    return await trySeLogerAPIFallback(url)
  }
}

/**
 * Plan B SeLoger : retry avec un User-Agent alternatif (Android au lieu d'iOS)
 * + tentative via l'endpoint /api/v2/ si v1 a échoué
 * Si ça échoue aussi, on laisse la cascade générique prendre le relais
 * (Jina Reader et Google Cache sont les meilleurs fallbacks pour DataDome)
 */
async function trySeLogerAPIFallback(url: string): Promise<ExtractionResponse | null> {
  try {
    const idMatch = url.match(/\/(\d{6,12})\.htm/) || url.match(/\/(\d{6,12})(?:\?|$|#)/)
    if (!idMatch) return null
    const adId = idMatch[1]

    // Strategy A : User-Agent Android SeLoger (différent pipeline anti-bot côté serveur)
    const ANDROID_UAS = [
      'SeLoger/12.2.0 (Android 14; SM-S928B; Build/UP1A.231005.007)',
      'SeLoger/12.1.0 (Android 13; Pixel 7; Build/TQ3A.230901.001)',
      'Dalvik/2.1.0 (Linux; U; Android 14; SM-S928B Build/UP1A.231005.007)',
    ]
    const androidUA = ANDROID_UAS[Math.floor(Math.random() * ANDROID_UAS.length)]

    await randomDelay(1000, 3000) // Attendre un peu avant de retenter
    await waitForDomainThrottle('https://api-seloger.svc.groupe-seloger.com/')

    console.log(`🔄 SeLoger fallback: retry avec UA Android pour ${adId}`)

    const response = await fetch(
      `https://api-seloger.svc.groupe-seloger.com/api/v1/listings/${adId}`,
      {
        headers: {
          'User-Agent': androidUA,
          'Accept': 'application/json',
          'Accept-Language': 'fr-FR',
          'X-App-Version': '12.2.0',
          'X-Device-Type': 'android',
        },
        signal: AbortSignal.timeout(12000),
      }
    )

    if (response.ok) {
      const json = await response.json() as Record<string, unknown>
      if (json.id || json.price || json.livingArea) {
        console.log('✅ SeLoger fallback Android réussi')
        return parseSeLogerData(json, url)
      }
    }

    // Strategy B : Essayer l'endpoint /api/v2/ (parfois disponible)
    try {
      const v2Response = await fetch(
        `https://api-seloger.svc.groupe-seloger.com/api/v2/listings/${adId}`,
        {
          headers: {
            'User-Agent': androidUA,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        }
      )
      if (v2Response.ok) {
        const json = await v2Response.json() as Record<string, unknown>
        if (json.id || json.price || json.livingArea) {
          console.log('✅ SeLoger fallback v2 réussi')
          return parseSeLogerData(json, url)
        }
      }
    } catch { /* v2 non disponible, on continue */ }

    console.warn('SeLoger: tous les fallbacks API échoués, cascade générique prendra le relais')
    return null
  } catch {
    return null
  }
}

/**
 * Parse les données JSON de l'API SeLoger mobile
 * Mappe tous les champs disponibles vers notre format standard
 */
function parseSeLogerData(json: Record<string, unknown>, url: string): ExtractionResponse | null {
  const data: Record<string, unknown> = { url }

  // ── Prix ──
  if (typeof json.price === 'number' && json.price > 0) {
    data.prix = json.price
  } else {
    // Prix dans alur
    const alur = json.alur as Record<string, unknown> | undefined
    if (alur && typeof alur.price === 'number' && alur.price > 0) {
      data.prix = alur.price
    }
  }

  // ── Surface ──
  if (typeof json.livingArea === 'number' && json.livingArea > 0) {
    data.surface = json.livingArea
  }

  // ── Pièces / Chambres ──
  if (typeof json.rooms === 'number' && json.rooms > 0) data.pieces = json.rooms
  if (typeof json.bedrooms === 'number' && json.bedrooms >= 0) data.chambres = json.bedrooms

  // ── Type de bien ──
  const realtyType = json.realtyType as number | undefined
  if (realtyType === 1) data.type = 'appartement'
  else if (realtyType === 2) data.type = 'maison'
  else data.type = 'appartement'

  // ── Localisation ──
  if (typeof json.city === 'string') data.ville = json.city
  if (typeof json.zipCode === 'string') data.codePostal = json.zipCode
  else if (typeof json.zipCode === 'number') data.codePostal = String(json.zipCode)

  // ── DPE / GES ──
  const energy = json.energy as Record<string, unknown> | undefined
  if (energy && typeof energy.grade === 'string' && /^[A-G]$/i.test(energy.grade)) {
    data.dpe = energy.grade.toUpperCase()
  }
  const ghg = json.greenhouseGas as Record<string, unknown> | undefined
  if (ghg && typeof ghg.grade === 'string' && /^[A-G]$/i.test(ghg.grade)) {
    data.ges = ghg.grade.toUpperCase()
  }
  // Fallback: energyBalance
  const eb = json.energyBalance as Record<string, unknown> | undefined
  if (eb) {
    if (!data.dpe) {
      const dpe = eb.dpe as Record<string, unknown> | undefined
      if (dpe && typeof dpe.category === 'string' && /^[A-G]$/i.test(dpe.category)) {
        data.dpe = dpe.category.toUpperCase()
      }
    }
    if (!data.ges) {
      const ges = eb.ges as Record<string, unknown> | undefined
      if (ges && typeof ges.category === 'string' && /^[A-G]$/i.test(ges.category)) {
        data.ges = ges.category.toUpperCase()
      }
    }
  }

  // ── Description ──
  if (typeof json.description === 'string') {
    data.description = (json.description as string).substring(0, 1000)
  }

  // ── Titre ──
  if (typeof json.title === 'string') data.titre = json.title

  // ── Photos ──
  const photos = json.photos as string[] | undefined
  if (Array.isArray(photos) && photos.length > 0) {
    const validPhotos = photos.filter(p => typeof p === 'string' && p.startsWith('http'))
    if (validPhotos.length > 0) {
      data.imageUrl = validPhotos[0]
      data.images = validPhotos.slice(0, 20)
    }
  }

  // ── Charges copropriété ──
  if (typeof json.condoAnnualCharges === 'number' && json.condoAnnualCharges > 0) {
    data.chargesMensuelles = Math.round(json.condoAnnualCharges / 12)
  }

  // ── Features (très riche : étage, ascenseur, terrasse, cave, orientation, etc.) ──
  const features = json.features as Array<Record<string, unknown>> | undefined
  if (Array.isArray(features)) {
    for (const feat of features) {
      const label = String(feat.label || '').trim()
      if (!label) continue

      // Étage
      const etageMatch = label.match(/^Au\s+(\d+)[eè](?:me)?\s+étage$/i)
      if (etageMatch && !data.etage) {
        data.etage = parseInt(etageMatch[1])
        continue
      }

      // Étages total (bâtiment)
      const etTotalMatch = label.match(/^Bâtiment\s+de\s+(\d+)\s+étages?$/i)
      if (etTotalMatch && !data.etagesTotal) {
        data.etagesTotal = parseInt(etTotalMatch[1])
        continue
      }

      // Surface (fallback)
      const surfMatch = label.match(/^Surface\s+de\s+(\d+)\s*m²$/i)
      if (surfMatch && !data.surface) {
        data.surface = parseInt(surfMatch[1])
        continue
      }

      // Pièces (fallback)
      const piecesMatch = label.match(/^(\d+)\s+Pi[eè]ces?$/i)
      if (piecesMatch && !data.pieces) {
        data.pieces = parseInt(piecesMatch[1])
        continue
      }

      // Chambres (fallback)
      const chambresMatch = label.match(/^(\d+)\s+Chambres?$/i)
      if (chambresMatch && !data.chambres) {
        data.chambres = parseInt(chambresMatch[1])
        continue
      }

      // Année de construction
      const anneeMatch = label.match(/^Année\s+de\s+construction\s+(\d{4})$/i)
      if (anneeMatch && !data.anneeConstruction) {
        const year = parseInt(anneeMatch[1])
        if (year >= 1800 && year <= 2030) data.anneeConstruction = year
        continue
      }

      // Ascenseur
      if (/^Ascenseur$/i.test(label)) { data.ascenseur = true; continue }

      // Cave
      if (/cave/i.test(label) && !data.cave) { data.cave = true; continue }

      // Terrasse / Balcon
      if (/terrasse|balcon|loggia/i.test(label) && !data.balconTerrasse) {
        data.balconTerrasse = true
        continue
      }

      // Parking / Garage
      if (/parking|garage|stationnement/i.test(label) && !data.parking) {
        data.parking = true
        continue
      }

      // Orientation
      const orientMatch = label.match(/^Orientation\s+(.+)$/i)
      if (orientMatch && !data.orientation) {
        data.orientation = orientMatch[1].substring(0, 30)
        continue
      }

      // Salles de bain / d'eau
      const sdbMatch = label.match(/^(\d+)\s+Salle\s+d[''](?:eau|bain)/i)
      if (sdbMatch && !data.nbSallesBains) {
        data.nbSallesBains = parseInt(sdbMatch[1])
        continue
      }

      // Gardien
      if (/^Gardien$/i.test(label)) { data.gardien = true; continue }

      // Digicode / Interphone
      if (/^Digicode$/i.test(label)) { data.digicode = true; continue }
      if (/^Interphone$/i.test(label)) { data.interphone = true; continue }

      // Cuisine
      if (/cuisine.*équipée/i.test(label) && !data.cuisineEquipee) {
        data.cuisineEquipee = true
        continue
      }
    }
  }

  // ── Extraire taxe foncière + orientation + détails depuis la description ──
  if (data.description) {
    const textData = parseTexteAnnonce(data.description as string)
    const textRecord = textData as unknown as Record<string, unknown>
    for (const [key, value] of Object.entries(textRecord)) {
      if (value === undefined || value === null || value === 'NC') continue
      if (data[key] === undefined || data[key] === null || data[key] === 'NC') {
        data[key] = value
      }
    }
  }

  // ── Prix au m² ──
  if (typeof json.zoneSquareMeterPrice === 'number') {
    data.prixM2Zone = json.zoneSquareMeterPrice
  }

  // ── Coordonnées GPS ──
  const coords = json.coordinates as Record<string, unknown> | undefined
  if (coords) {
    if (typeof coords.latitude === 'number') data.latitude = coords.latitude
    if (typeof coords.longitude === 'number') data.longitude = coords.longitude
  }

  // ── Agent / Professionnel ──
  const professionals = json.professionals as Array<Record<string, unknown>> | undefined
  if (Array.isArray(professionals) && professionals.length > 0) {
    const pro = professionals[0]
    if (typeof pro.name === 'string') data.agence = pro.name
    if (typeof pro.phoneNumber === 'string') data.telephone = pro.phoneNumber
  }

  // Vérification minimum
  if (!data.prix && !data.surface) return null

  completerDonnees(data)

  const fieldsCount = Object.keys(data).filter(k =>
    k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
  ).length

  return {
    success: true,
    source: 'seloger',
    data,
    fieldsExtracted: fieldsCount,
    method: 'seloger-api',
    message: `${fieldsCount} données extraites depuis SeLoger (API directe)`
  }
}

// ─────────────────────────────────────
// Stratégie Laforêt : API REST ouverte (GRATUIT, aucune auth)
// GET https://www.laforet.com/api/immo/properties/{immo_id}
// Retourne JSON complet : prix, surface, pièces, DPE, GES, photos, étage, etc.
// ─────────────────────────────────────
async function tryLaforetAPI(url: string): Promise<ExtractionResponse | null> {
  try {
    // Extraire l'ID depuis l'URL Laforêt
    // Format: /detail-vente-appartement-VILLE-4-pieces-REF.htm
    // ou: /acheter/appartement/ville/ref/123456
    // L'immo_id est souvent dans le slug ou le path
    const urlObj = new URL(url)
    const path = urlObj.pathname

    // Essayer d'abord le format .htm avec reference
    // Ex: /detail-vente-appartement-nice-4-pieces-12345.htm → id = 12345
    let immoId: string | null = null

    // Format 1: ID numérique en fin de slug
    const numericMatch = path.match(/[-/](\d{4,10})(?:\.htm|$)/)
    if (numericMatch) {
      immoId = numericMatch[1]
    }

    // Format 2: référence alphanumérique dans le path
    if (!immoId) {
      // Laforêt utilise parfois une ref comme "123ABC" dans l'URL
      const refMatch = path.match(/\/([A-Z0-9]{4,15})(?:\.htm|$)/i)
      if (refMatch) {
        immoId = refMatch[1]
      }
    }

    if (!immoId) {
      console.warn('Laforêt API: impossible d\'extraire l\'ID depuis', url)
      // Fallback: essayer de trouver l'ID via la page HTML
      return await tryLaforetHTMLFallback(url)
    }

    await waitForDomainThrottle('laforet.com')

    console.log(`🏠 Laforêt API: tentative avec ID ${immoId}`)

    const response = await fetch(`https://www.laforet.com/api/immo/properties/${immoId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': getRandomUserAgent(),
        'Referer': 'https://www.laforet.com/',
        'Origin': 'https://www.laforet.com',
      },
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) {
      console.warn(`Laforêt API: HTTP ${response.status}`)
      return await tryLaforetHTMLFallback(url)
    }

    const json = await response.json() as Record<string, unknown>

    if (!json || typeof json !== 'object') {
      return null
    }

    return parseLaforetData(json, url)
  } catch (error) {
    console.warn('Laforêt API échouée:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Fallback : fetch la page HTML Laforêt et extraire via extractFromHTML
 * Laforêt n'a pas de protection anti-bot forte
 */
async function tryLaforetHTMLFallback(url: string): Promise<ExtractionResponse | null> {
  try {
    const response = await protectedFetch(url, {
      timeoutMs: 15000,
      throttle: true,
    })

    const html = await response.text()
    if (isBlockedResponse(html)) return null

    const data = extractFromHTML(html, url)
    if (!data) return null

    const fieldsCount = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length
    if (fieldsCount < 3) return null

    console.log(`🏠 Laforêt HTML: ${fieldsCount} champs extraits`)
    return {
      success: true,
      source: 'laforet',
      data,
      fieldsExtracted: fieldsCount,
      method: 'laforet-html',
      message: `${fieldsCount} données extraites depuis Laforêt (HTML)`
    }
  } catch {
    return null
  }
}

/**
 * Parse les données JSON de l'API Laforêt vers notre format ExtractionResponse
 */
function parseLaforetData(json: Record<string, unknown>, url: string): ExtractionResponse | null {
  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const j = json as any

    // Les champs peuvent varier selon la structure exacte de l'API
    // On fait du mapping défensif avec fallbacks
    const prix = j.price ?? j.prix ?? j.amount ?? null
    const surface = j.surface ?? j.area ?? j.living_area ?? null
    const pieces = j.rooms ?? j.nb_rooms ?? j.nbRooms ?? null
    const chambres = j.bedrooms ?? j.nb_bedrooms ?? j.nbBedrooms ?? null
    const salleDeBain = j.bathrooms ?? j.nb_bathrooms ?? null

    // Localisation
    const ville = j.city ?? j.location?.city ?? j.commune ?? null
    const codePostal = j.zipcode ?? j.postal_code ?? j.location?.zipcode ?? null
    const adresse = j.address ?? j.location?.address ?? null
    const departement = j.department ?? null

    // DPE / GES
    const dpe = j.dpe_level ?? j.energy_class ?? j.dpe?.level ?? j.dpeLevel ?? null
    const dpeValeur = j.dpe_value ?? j.dpe?.value ?? j.energy_value ?? null
    const ges = j.ges_level ?? j.greenhouse_gas_class ?? j.ges?.level ?? j.gesLevel ?? null
    const gesValeur = j.ges_value ?? j.ges?.value ?? null

    // Détails
    const etage = j.floor ?? j.level ?? null
    const etagesTotal = j.total_floors ?? j.nb_floors ?? j.floors_number ?? null
    const anneeConstruction = j.year_of_construction ?? j.construction_year ?? j.yearBuilt ?? null
    const charges = j.charges ?? j.monthly_charges ?? null
    const taxeFonciere = j.property_tax ?? j.taxe_fonciere ?? null

    // Type de bien
    const typeFromApi = j.type ?? j.property_type ?? j.category ?? null
    let typeBien: string | null = null
    if (typeof typeFromApi === 'string') {
      const t = typeFromApi.toLowerCase()
      if (t.includes('appartement') || t.includes('apartment') || t.includes('flat')) typeBien = 'Appartement'
      else if (t.includes('maison') || t.includes('house')) typeBien = 'Maison'
      else if (t.includes('terrain') || t.includes('land')) typeBien = 'Terrain'
      else if (t.includes('local') || t.includes('commercial')) typeBien = 'Local commercial'
      else typeBien = typeFromApi
    }

    // Photos
    let photos: string[] = []
    const photoArrays = [j.photos, j.images, j.pictures, j.medias]
    for (const arr of photoArrays) {
      if (Array.isArray(arr) && arr.length > 0) {
        photos = arr
          .map((p: any) => {
            if (typeof p === 'string') return p
            return p?.url ?? p?.src ?? p?.original ?? p?.large ?? null
          })
          .filter(Boolean)
        if (photos.length > 0) break
      }
    }

    // Description
    const description = j.description ?? j.text ?? j.ad_text ?? null

    // Équipements & extras
    const hasAscenseur = j.has_lift ?? j.elevator ?? j.ascenseur ?? null
    const hasBalcon = j.balconies != null ? Number(j.balconies) > 0 : (j.has_balcony ?? null)
    const hasTerrasse = j.terraces != null ? Number(j.terraces) > 0 : (j.has_terrace ?? null)
    const hasCave = j.cellars != null ? Number(j.cellars) > 0 : (j.has_cellar ?? null)
    const parking = j.parking ?? j.parking_type ?? j.has_garage ?? null
    const chauffage = j.heating ?? j.heating_type ?? null
    const cuisine = j.kitchen_type ?? j.kitchen ?? null
    const orientation = j.orientation ?? j.exposure ?? null

    // Transaction
    const transactionType = j.transaction ?? j.transaction_type ?? null
    let transaction: string | null = null
    if (typeof transactionType === 'string') {
      const tr = transactionType.toLowerCase()
      if (tr.includes('vente') || tr.includes('sale') || tr.includes('buy')) transaction = 'Vente'
      else if (tr.includes('location') || tr.includes('rent')) transaction = 'Location'
    }

    // Agence
    const nomAgence = j.agency?.name ?? j.agency_name ?? j.agence ?? null

    const data: Record<string, unknown> = {}

    if (prix) data.prix = Number(prix)
    if (surface) data.surface = Number(surface)
    if (pieces) data.pieces = Number(pieces)
    if (chambres) data.chambres = Number(chambres)
    if (salleDeBain) data.nbSallesBains = Number(salleDeBain)
    // type doit être 'appartement' ou 'maison' (minuscule, pas 'Appartement')
    if (typeBien) {
      const t = typeBien.toLowerCase()
      if (t.includes('appartement') || t.includes('apartment') || t.includes('flat')) data.type = 'appartement'
      else if (t.includes('maison') || t.includes('house')) data.type = 'maison'
      else data.type = 'appartement' // fallback
    }
    if (transaction) data.typeTransaction = transaction
    if (ville) data.ville = ville
    if (codePostal) data.codePostal = String(codePostal)
    if (adresse) data.adresse = adresse
    if (departement) data.departement = departement
    if (dpe) data.dpe = String(dpe).toUpperCase()
    if (dpeValeur) data.dpeValeur = Number(dpeValeur)
    if (ges) data.ges = String(ges).toUpperCase()
    if (gesValeur) data.gesValeur = Number(gesValeur)
    if (etage != null) data.etage = Number(etage)
    if (etagesTotal != null) data.etagesTotal = Number(etagesTotal)
    if (anneeConstruction) data.anneeConstruction = Number(anneeConstruction)
    if (charges) data.chargesMensuelles = Number(charges)
    if (taxeFonciere) data.taxeFonciere = Number(taxeFonciere)
    if (description) data.description = String(description)
    if (photos.length > 0) {
      data.imageUrl = photos[0]
      data.images = photos.slice(0, 20)
    }
    if (nomAgence) data.agence = nomAgence
    if (hasAscenseur != null) data.ascenseur = Boolean(hasAscenseur)
    // Fusionner balcon + terrasse en un seul champ balconTerrasse
    if (hasBalcon || hasTerrasse) data.balconTerrasse = true
    if (hasCave != null) data.cave = Boolean(hasCave)
    if (parking) data.parking = typeof parking === 'boolean' ? parking : true
    if (chauffage) data.chauffage = String(chauffage)
    if (cuisine) data.cuisine = String(cuisine)
    if (orientation) data.orientation = String(orientation)
    data.url = url

    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Enrichir avec le parsing texte de la description (charges, taxe, orientation...)
    if (data.description) {
      const textData = parseTexteAnnonce(data.description as string)
      const textRecord = textData as unknown as Record<string, unknown>
      for (const [key, value] of Object.entries(textRecord)) {
        if (value === undefined || value === null || value === 'NC') continue
        if (data[key] === undefined || data[key] === null || data[key] === 'NC') {
          data[key] = value
        }
      }
    }

    // Compléter les champs manquants (type, pieces, chambres, dpe, département)
    completerDonnees(data)

    const fieldsCount = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length
    if (fieldsCount < 3) return null

    console.log(`🏠 Laforêt API: ${fieldsCount} champs extraits avec succès`)

    return {
      success: true,
      source: 'laforet',
      data,
      fieldsExtracted: fieldsCount,
      method: 'laforet-api',
      message: `${fieldsCount} données extraites depuis Laforêt (API directe)`
    }
  } catch (error) {
    console.warn('Laforêt parse error:', error instanceof Error ? error.message : error)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie Orpi : page HTML avec JSON embarqué (GRATUIT)
// Les pages Orpi contiennent des données JSON dans les attributs data-result
// ou dans des scripts __NEXT_DATA__ / window.__INITIAL_STATE__
// ─────────────────────────────────────
async function tryOrpiAPI(url: string): Promise<ExtractionResponse | null> {
  try {
    await waitForDomainThrottle('orpi.com')

    console.log(`🏢 Orpi: tentative fetch HTML avec JSON embarqué`)

    const response = await protectedFetch(url, {
      timeoutMs: 15000,
      throttle: true,
    })

    const html = await response.text()
    if (isBlockedResponse(html)) return null

    // ── Méthode 1 : Chercher data-result dans les divs Orpi ──
    // <div data-component="estate-result" data-result="{ ... JSON ... }">
    const dataResultMatch = html.match(/data-result="([^"]+)"/) || html.match(/data-result='([^']+)'/)
    if (dataResultMatch) {
      try {
        // Les entités HTML doivent être décodées
        const decoded = dataResultMatch[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'")

        const orpiJson = JSON.parse(decoded) as Record<string, unknown>
        const result = parseOrpiData(orpiJson, url)
        if (result) return result
      } catch (e) {
        console.warn('Orpi: échec parsing data-result:', e instanceof Error ? e.message : e)
      }
    }

    // ── Méthode 2 : Chercher __NEXT_DATA__ (Orpi utilise Next.js) ──
    const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]) as Record<string, unknown>
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const pageProps = (nextData as any)?.props?.pageProps
        if (pageProps?.estate || pageProps?.property || pageProps?.ad) {
          const estate = pageProps.estate ?? pageProps.property ?? pageProps.ad
          const result = parseOrpiData(estate as Record<string, unknown>, url)
          if (result) return result
        }
        /* eslint-enable @typescript-eslint/no-explicit-any */
      } catch (e) {
        console.warn('Orpi: échec parsing __NEXT_DATA__:', e instanceof Error ? e.message : e)
      }
    }

    // ── Méthode 3 : Chercher JSON-LD dans la page ──
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)
    if (jsonLdMatch) {
      for (const script of jsonLdMatch) {
        const content = script.match(/<script[^>]*>([\s\S]*?)<\/script>/)
        if (content) {
          try {
            const ld = JSON.parse(content[1]) as Record<string, unknown>
            if (ld['@type'] === 'Product' || ld['@type'] === 'RealEstateListing' || ld['@type'] === 'Offer') {
              // Passer par extractFromHTML qui gère bien JSON-LD
              break
            }
          } catch { /* skip */ }
        }
      }
    }

    // ── Méthode 4 : Fallback extractFromHTML standard ──
    const data = extractFromHTML(html, url)
    if (!data) return null

    const fieldsCount = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length
    if (fieldsCount < 3) return null

    console.log(`🏢 Orpi HTML fallback: ${fieldsCount} champs extraits`)
    return {
      success: true,
      source: 'orpi',
      data,
      fieldsExtracted: fieldsCount,
      method: 'orpi-html',
      message: `${fieldsCount} données extraites depuis Orpi (HTML)`
    }
  } catch (error) {
    console.warn('Orpi extraction échouée:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Parse les données JSON Orpi vers notre format ExtractionResponse
 */
function parseOrpiData(json: Record<string, unknown>, url: string): ExtractionResponse | null {
  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const j = json as any

    const prix = j.price ?? j.prix ?? j.amount ?? null
    const surface = j.surface ?? j.area ?? j.livingArea ?? j.lotSurface ?? null
    const pieces = j.nbRooms ?? j.rooms ?? j.nbPieces ?? null
    const chambres = j.nbBedrooms ?? j.bedrooms ?? null
    const salleDeBain = j.nbBathrooms ?? j.bathrooms ?? null
    const ville = j.city ?? j.commune ?? j.location?.city ?? null
    const codePostal = j.zipCode ?? j.postalCode ?? j.location?.zipCode ?? null
    const adresse = j.address ?? j.location?.address ?? null

    // DPE / GES
    const dpe = j.energyClass ?? j.dpeLevel ?? j.dpe ?? null
    const dpeValeur = j.energyValue ?? j.dpeValue ?? null
    const ges = j.ghgClass ?? j.gesLevel ?? j.ges ?? null
    const gesValeur = j.ghgValue ?? j.gesValue ?? null

    const etage = j.floor ?? j.level ?? null
    const etagesTotal = j.nbFloors ?? j.totalFloors ?? null
    const charges = j.charges ?? j.monthlyCharges ?? null
    const anneeConstruction = j.constructionYear ?? j.yearBuilt ?? null

    // Type
    const typeStr = j.type ?? j.estateType ?? j.propertyType ?? null
    let typeBien: string | null = null
    if (typeof typeStr === 'string') {
      const t = typeStr.toLowerCase()
      if (t.includes('appartement') || t.includes('apartment')) typeBien = 'Appartement'
      else if (t.includes('maison') || t.includes('house')) typeBien = 'Maison'
      else if (t.includes('terrain')) typeBien = 'Terrain'
      else typeBien = typeStr
    }

    // Photos
    let photos: string[] = []
    const photoArrays = [j.images, j.photos, j.medias, j.pictures]
    for (const arr of photoArrays) {
      if (Array.isArray(arr) && arr.length > 0) {
        photos = arr
          .map((p: any) => {
            if (typeof p === 'string') return p.startsWith('http') ? p : `https://www.orpi.com${p}`
            return p?.url ?? p?.src ?? p?.fullUrl ?? null
          })
          .filter(Boolean)
        if (photos.length > 0) break
      }
    }

    const description = j.longAd ?? j.description ?? j.text ?? j.shortAd ?? null
    const nomAgence = j.agency?.name ?? j.agencyName ?? j.agence ?? null

    const data: Record<string, unknown> = {}
    if (prix) data.prix = Number(prix)
    if (surface) data.surface = Number(surface)
    if (pieces) data.pieces = Number(pieces)
    if (chambres) data.chambres = Number(chambres)
    if (salleDeBain) data.nbSallesBains = Number(salleDeBain)
    // type doit être 'appartement' ou 'maison' (minuscule)
    if (typeBien) {
      const t = typeBien.toLowerCase()
      if (t.includes('appartement') || t.includes('apartment')) data.type = 'appartement'
      else if (t.includes('maison') || t.includes('house')) data.type = 'maison'
      else data.type = 'appartement'
    }
    if (ville) data.ville = ville
    if (codePostal) data.codePostal = String(codePostal)
    if (adresse) data.adresse = adresse
    if (dpe) data.dpe = String(dpe).toUpperCase()
    if (dpeValeur) data.dpeValeur = Number(dpeValeur)
    if (ges) data.ges = String(ges).toUpperCase()
    if (gesValeur) data.gesValeur = Number(gesValeur)
    if (etage != null) data.etage = Number(etage)
    if (etagesTotal != null) data.etagesTotal = Number(etagesTotal)
    if (charges) data.chargesMensuelles = Number(charges)
    if (anneeConstruction) data.anneeConstruction = Number(anneeConstruction)
    if (description) data.description = String(description)
    if (photos.length > 0) {
      data.imageUrl = photos[0]
      data.images = photos.slice(0, 20)
    }
    if (nomAgence) data.agence = nomAgence
    data.url = url

    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Enrichir avec le parsing texte de la description
    if (data.description) {
      const textData = parseTexteAnnonce(data.description as string)
      const textRecord = textData as unknown as Record<string, unknown>
      for (const [key, value] of Object.entries(textRecord)) {
        if (value === undefined || value === null || value === 'NC') continue
        if (data[key] === undefined || data[key] === null || data[key] === 'NC') {
          data[key] = value
        }
      }
    }

    // Compléter les champs manquants
    completerDonnees(data)

    const fieldsCount = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length
    if (fieldsCount < 3) return null

    console.log(`🏢 Orpi API: ${fieldsCount} champs extraits avec succès`)

    return {
      success: true,
      source: 'orpi',
      data,
      fieldsExtracted: fieldsCount,
      method: 'orpi-json',
      message: `${fieldsCount} données extraites depuis Orpi (JSON embarqué)`
    }
  } catch (error) {
    console.warn('Orpi parse error:', error instanceof Error ? error.message : error)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie : ScrapingBee (headless Chrome + anti-bot + proxies résidentiels)
// Gère : JS rendering, DataDome, Cloudflare, captchas
// Coût : 1 crédit (basique), 5 (JS), 10 (premium proxy), ~25 (JS+premium)
// Free tier : 1000 crédits/mois → ~40-200 requêtes selon config
// ─────────────────────────────────────
async function tryScrapingBee(url: string, source: string | null): Promise<ExtractionResponse | null> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY
  if (!apiKey) return null // Pas configuré, on skip
  
  try {
    // Options adaptées au site
    const usePremiumProxy = source !== null && PREMIUM_PROXY_SITES.includes(source)
    
    const params = new URLSearchParams({
      api_key: apiKey,
      url: url,
      render_js: 'true',
      premium_proxy: String(usePremiumProxy),
      country_code: 'fr',       // Proxies français pour sites FR
      block_ads: 'true',        // Bloquer les pubs pour accélérer
      block_resources: 'false', // Garder les ressources (certains sites en ont besoin)
      wait: '3000',             // Attendre 3s après le chargement JS
    })
    
    const response = await fetch(`https://app.scrapingbee.com/api/v1/?${params}`, {
      signal: AbortSignal.timeout(35000), // 35s timeout (JS rendering = lent)
    })
    
    if (!response.ok) {
      console.warn(`ScrapingBee HTTP ${response.status} pour ${source || url}`)
      return null
    }
    
    const html = await response.text()
    if (html.length < 200) return null
    
    // Pipeline centralisé
    const data: Record<string, unknown> = extractFromHTML(html, url)
    
    if (!data.prix && !data.surface) return null
    
    const fieldsCount = Object.keys(data).filter(k => 
      k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
    ).length
    
    completerDonnees(data)
    
    return {
      success: true,
      source: source || 'web',
      data,
      fieldsExtracted: fieldsCount,
      method: 'scrapingbee',
      message: `${fieldsCount} données extraites depuis ${source || 'la page'} (ScrapingBee)`
    }
  } catch (err) {
    console.warn('ScrapingBee échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie 1 : Jina AI Reader (JSON mode pour récupérer image + texte)
// ─────────────────────────────────────
async function tryJinaReader(url: string, source: string | null): Promise<ExtractionResponse | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`
    const jinaApiKey = process.env.JINA_API_KEY
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Return-Format': 'json',
    }
    if (jinaApiKey) {
      headers['Authorization'] = `Bearer ${jinaApiKey}`
    }
    const response = await fetch(jinaUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
    })
    
    if (!response.ok) return null
    
    const json = await response.json()
    const texte = json?.data?.content || json?.data?.text || ''
    if (!texte || texte.length < 100) return null
    
    const data = parseTexteAnnonce(texte)
    const count = compterChampsExtraits(data)
    if (count < MIN_FIELDS) return null
    
    const dataRecord = data as unknown as Record<string, unknown>
    completerDonnees(dataRecord)
    
    // --- Récupération de l'image ---
    // 1. Image depuis Jina (premier élément d'images ou og:image)
    if (!dataRecord.imageUrl) {
      const jinaImage = json?.data?.images?.[0]?.src 
        || json?.data?.images?.[0]?.url
        || json?.data?.images?.[0]
      if (typeof jinaImage === 'string' && jinaImage.startsWith('http')) {
        dataRecord.imageUrl = jinaImage
      }
    }
    // 2. Titre depuis Jina si manquant
    if (!dataRecord.titre && json?.data?.title) {
      dataRecord.titre = (json.data.title as string).substring(0, 200)
    }
    // 3. Description depuis Jina si manquante
    if (!dataRecord.description && json?.data?.description) {
      const desc = json.data.description as string
      if (desc.length >= 30) {
        dataRecord.description = desc.substring(0, 1000)
      }
    }
    // 4. og:image depuis la description Jina (certaines réponses l'incluent)
    if (!dataRecord.imageUrl && json?.data?.description) {
      const ogMatch = (json.data.description as string).match(/!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)[^\s)]*)\)/i)
      if (ogMatch) {
        dataRecord.imageUrl = ogMatch[1]
      }
    }
    
    return {
      success: true,
      source: source || 'web',
      data: { url, ...dataRecord },
      fieldsExtracted: count,
      method: 'jina-reader',
      message: `${count} données extraites depuis ${source || 'la page'}`
    }
  } catch (err) {
    console.warn('Jina Reader échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie 2 : Firecrawl (avec waitFor pour laisser le JS se charger)
// ─────────────────────────────────────
async function tryFirecrawl(url: string, source: string | null): Promise<ExtractionResponse | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return null // Pas configuré, on skip
  
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html', 'metadata'],
        onlyMainContent: false,  // On veut tout le HTML pour JSON-LD
        timeout: 15000,
        waitFor: 2000,           // Attendre 2s pour le JS
      }),
      signal: AbortSignal.timeout(20000),
    })
    
    if (!response.ok) {
      console.warn('Firecrawl HTTP error:', response.status)
      return null
    }
    
    const result = await response.json()
    
    if (!result.success) return null
    
    // Essayer d'abord le HTML complet (avec JSON-LD) si disponible
    const htmlContent = result.data?.html as string | undefined
    const texte = (result.data?.markdown || '') as string
    
    let dataRecord: Record<string, unknown> = { url }
    
    // Pipeline centralisé sur le HTML si disponible
    if (htmlContent && htmlContent.length > 200) {
      dataRecord = extractFromHTML(htmlContent, url)
    }
    
    // Compléter avec le parsing texte du markdown (Firecrawl-spécifique)
    if (texte.length >= 50) {
      const textData = parseTexteAnnonce(texte)
      const textRecord = textData as unknown as Record<string, unknown>
      // Fusionner sans écraser les données HTML/JSON-LD
      for (const [key, value] of Object.entries(textRecord)) {
        if (value !== undefined && value !== null && (dataRecord[key] === undefined || dataRecord[key] === null || dataRecord[key] === 'NC')) {
          if (value === 'NC') continue
          dataRecord[key] = value
        }
      }
    }
    
    const count = Object.keys(dataRecord).filter(k => 
      k !== 'url' && dataRecord[k] !== undefined && dataRecord[k] !== null && dataRecord[k] !== 'NC'
    ).length
    if (count < MIN_FIELDS) return null
    
    completerDonnees(dataRecord)
    
    // --- Récupération de l'image via métadonnées Firecrawl ---
    if (!dataRecord.imageUrl) {
      const metadata = result.data?.metadata as Record<string, unknown> | undefined
      const ogImage = metadata?.ogImage || metadata?.['og:image'] || metadata?.image
      if (typeof ogImage === 'string' && ogImage.startsWith('http')) {
        dataRecord.imageUrl = ogImage
      }
    }
    // Titre depuis métadonnées Firecrawl si manquant
    if (!dataRecord.titre) {
      const metadata = result.data?.metadata as Record<string, unknown> | undefined
      const ogTitle = metadata?.ogTitle || metadata?.['og:title'] || metadata?.title
      if (typeof ogTitle === 'string') {
        dataRecord.titre = ogTitle.substring(0, 200)
      }
    }
    // Extraire image depuis le markdown (pattern ![alt](url))
    if (!dataRecord.imageUrl && texte) {
      const imgMatch = texte.match(/!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)[^\s)]*)\)/i)
      if (imgMatch) {
        dataRecord.imageUrl = imgMatch[1]
      }
    }
    
    return {
      success: true,
      source: source || 'web',
      data: { ...dataRecord },
      fieldsExtracted: count,
      method: 'firecrawl',
      message: `${count} données extraites depuis ${source || 'la page'}`
    }
  } catch (err) {
    console.warn('Firecrawl échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie 3 : Fetch direct protégé (throttle + rotation UA + retry + anti-blocage)
// ─────────────────────────────────────
async function tryDirectFetch(url: string, source: string | null): Promise<ExtractionResponse | null> {
  try {
    const response = await protectedFetch(url, {
      timeoutMs: 12000,
      retry: true,
      retryOptions: { maxAttempts: 2 },
    })
    
    const html = await response.text()
    
    // Détecter les pages de challenge/captcha
    if (isBlockedResponse(html)) {
      console.warn(`Direct fetch: anti-bot détecté pour ${source || url}`)
      return null
    }
    
    // Pipeline centralisé
    const data: Record<string, unknown> = extractFromHTML(html, url)
    
    if (!data.prix && !data.surface) return null
    
    completerDonnees(data)
    
    const fieldsCount = Object.keys(data).filter(k => 
      k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
    ).length
    
    return {
      success: true,
      source: source || 'web',
      data,
      fieldsExtracted: fieldsCount,
      method: 'direct-fetch',
      message: `${fieldsCount} données extraites depuis ${source || 'la page'} (scraping maison)`
    }
  } catch (err) {
    console.warn('Fetch direct échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie Google Cache (GRATUIT) : version en cache de Google
// Permet d'accéder au contenu de pages protégées via le cache Google
// ─────────────────────────────────────
async function tryGoogleCache(url: string, source: string | null): Promise<ExtractionResponse | null> {
  try {
    // Google Cache URL
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}&hl=fr`
    
    const response = await protectedFetch(cacheUrl, {
      timeoutMs: 10000,
      retry: false, // Google Cache ne retry pas (si c'est pas en cache, c'est pas en cache)
    })
    
    const html = await response.text()
    if (isBlockedResponse(html)) return null
    
    // Pipeline centralisé
    const data: Record<string, unknown> = extractFromHTML(html, url)
    
    if (!data.prix && !data.surface) return null
    
    completerDonnees(data)
    
    const fieldsCount = Object.keys(data).filter(k =>
      k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
    ).length
    
    return {
      success: true,
      source: source || 'web',
      data,
      fieldsExtracted: fieldsCount,
      method: 'google-cache',
      message: `${fieldsCount} données extraites via Google Cache`
    }
  } catch (err) {
    console.warn('Google Cache échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie : Proxy publics gratuits (AllOrigins, etc.)
// Ces services font un fetch côté serveur et renvoient le résultat
// → IP différente, bypass des bans IP, 100% GRATUIT
// ─────────────────────────────────────
async function tryFreeProxies(url: string, source: string | null): Promise<ExtractionResponse | null> {
  // Liste de proxy gratuits publics (on les essaie dans l'ordre)
  const proxies = [
    {
      name: 'allorigins',
      buildUrl: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    },
    {
      name: 'corsproxy',
      buildUrl: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
    },
    {
      name: '1mdb',
      buildUrl: (target: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
    },
  ]
  
  for (const proxy of proxies) {
    try {
      const proxyUrl = proxy.buildUrl(url)
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,*/*',
        },
        signal: AbortSignal.timeout(12000),
      })
      
      if (!response.ok) continue
      
      const html = await response.text()
      if (!html || html.length < 300) continue
      if (isBlockedResponse(html)) continue
      
      // Pipeline centralisé
      const data: Record<string, unknown> = extractFromHTML(html, url)
      
      if (!data.prix && !data.surface) continue
      
      completerDonnees(data)
      
      const fieldsCount = Object.keys(data).filter(k =>
        k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
      ).length
      
      return {
        success: true,
        source: source || 'web',
        data,
        fieldsExtracted: fieldsCount,
        method: `free-proxy-${proxy.name}`,
        message: `${fieldsCount} données extraites via proxy gratuit (${proxy.name})`
      }
    } catch {
      // Ce proxy a échoué, essayer le suivant
      continue
    }
  }
  
  return null
}

// ─────────────────────────────────────
// Stratégie : Archive.org Wayback Machine (GRATUIT)
// Récupère la dernière snapshot archivée de la page
// Très utile si l'annonce est encore récente et a été indexée
// ─────────────────────────────────────
async function tryArchiveOrg(url: string, source: string | null): Promise<ExtractionResponse | null> {
  try {
    // 1. Trouver la dernière snapshot disponible
    const availResp = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}&timestamp=${new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14)}`,
      {
        headers: { 'User-Agent': getRandomUserAgent() },
        signal: AbortSignal.timeout(8000),
      }
    )
    
    if (!availResp.ok) return null
    
    const availJson = await availResp.json() as {
      archived_snapshots?: {
        closest?: { available?: boolean; url?: string; timestamp?: string; status?: string }
      }
    }
    
    const snapshot = availJson.archived_snapshots?.closest
    if (!snapshot?.available || !snapshot.url || snapshot.status !== '200') return null
    
    // Vérifier que le snapshot n'est pas trop vieux (max 90 jours)
    if (snapshot.timestamp) {
      const year = parseInt(snapshot.timestamp.substring(0, 4))
      const month = parseInt(snapshot.timestamp.substring(4, 6))
      const day = parseInt(snapshot.timestamp.substring(6, 8))
      const snapshotDate = new Date(year, month - 1, day)
      const daysSinceSnapshot = (Date.now() - snapshotDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceSnapshot > 90) {
        console.warn(`Archive.org: snapshot trop ancien (${Math.round(daysSinceSnapshot)}j)`)
        return null
      }
    }
    
    // 2. Récupérer le HTML archivé
    const archiveResp = await fetch(snapshot.url, {
      headers: { 'User-Agent': getRandomUserAgent() },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    
    if (!archiveResp.ok) return null
    
    let html = await archiveResp.text()
    if (html.length < 500) return null
    
    // Supprimer le bandeau Wayback Machine injecté par Archive.org
    html = html.replace(/<!-- BEGIN WAYBACK TOOLBAR INSERT -->[\s\S]*?<!-- END WAYBACK TOOLBAR INSERT -->/gi, '')
    
    // Pipeline centralisé
    const data: Record<string, unknown> = extractFromHTML(html, url)
    
    if (!data.prix && !data.surface) return null
    
    completerDonnees(data)
    
    const fieldsCount = Object.keys(data).filter(k =>
      k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
    ).length
    
    return {
      success: true,
      source: source || 'web',
      data,
      fieldsExtracted: fieldsCount,
      method: 'archive-org',
      message: `${fieldsCount} données extraites via Archive.org`
    }
  } catch (err) {
    console.warn('Archive.org échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Helpers
// ─────────────────────────────────────

/** Complète les champs manquants avec des estimations raisonnables */
function completerDonnees(data: Record<string, unknown>) {
  if (!data.pieces && data.surface) {
    data.pieces = Math.max(1, Math.round((data.surface as number) / 22))
  }
  if (!data.chambres && data.pieces) {
    data.chambres = Math.max(0, (data.pieces as number) - 1)
  }
  if (!data.dpe) {
    data.dpe = 'NC'
  }
  if (!data.type) {
    data.type = 'appartement'
  }
  // Déduire le département depuis le code postal
  if (data.codePostal && !data.departement) {
    const cp = data.codePostal as string
    if (cp.startsWith('97')) {
      data.departement = cp.substring(0, 3) // DOM-TOM
    } else if (cp.startsWith('20')) {
      // Corse : 20000-20190 = 2A, 20200+ = 2B
      const num = parseInt(cp)
      data.departement = num < 20200 ? '2A' : '2B'
    } else {
      data.departement = cp.substring(0, 2)
    }
  }
}

/**
 * Fallback : fetch léger de la page originale pour extraire og:image
 * Ne récupère que le <head> (premiers 50KB) pour limiter la bande passante
 */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AQUIZBot/1.0)',
        'Accept': 'text/html',
        'Range': 'bytes=0-51200', // Ne lire que les 50 premiers KB (contient le <head>)
      },
      signal: AbortSignal.timeout(5000),
    })
    
    if (!response.ok && response.status !== 206) return null
    
    const html = await response.text()
    
    // Chercher og:image dans le <head>
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
      /"image(?:Url)?"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
    ]
    
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1].startsWith('http')) {
        return match[1]
      }
    }
    
    return null
  } catch {
    return null
  }
}
