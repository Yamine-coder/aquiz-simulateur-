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
    isDomainCircuitOpen,
    protectedFetch,
    randomDelay,
    recordDomainFailure,
    recordDomainSuccess,
    recordRequest,
    setCachedResult,
    waitForDomainThrottle,
} from '@/lib/scraping/antiBlock'
import { completerDonnees } from '@/lib/scraping/completerDonnees'
import {
    detecterSource,
    extractFromHTML,
    isLocationUrl,
    parseNextData,
} from '@/lib/scraping/extracteur'
import { recordExtraction } from '@/lib/scraping/healthMonitor'
import { compterChampsExtraits, parseTexteAnnonce } from '@/lib/scraping/parseTexteAnnonce'
import { tryPlaywrightChrome } from '@/lib/scraping/playwrightScraper'
import { NextRequest, NextResponse } from 'next/server'
import dns from 'node:dns/promises'

/** Vercel Pro : timeout max 60s (on garde 55s de marge dans la cascade) */
export const maxDuration = 60

/** Détection environnement Vercel (IP datacenter AWS bloquées par LeBonCoin, SeLoger, etc.) */
const IS_VERCEL = !!process.env.VERCEL

/** Seuil minimum de champs extraits pour considérer l'extraction réussie */
const MIN_FIELDS = 3

/** Résultat d'extraction structuré (avant conversion en NextResponse) */
interface ExtractionResponse {
  success: true
  source: string
  data: Record<string, unknown>
  fieldsExtracted?: number
  method: string
  message: string
}

/** Entrée du journal d'extraction — une par étape de la cascade */
interface ExtractionLogEntry {
  level: string
  method: string
  durationMs: number
  status: 'success' | 'fail' | 'skipped'
  fieldsExtracted?: number
  detail?: string
}

/** Sites pour lesquels ScrapingBee doit activer premium_proxy (DataDome/Cloudflare) */
const PREMIUM_PROXY_SITES = ['seloger', 'leboncoin', 'pap', 'logic-immo', 'ouestfrance', 'figaro', 'orpi']

/** Sites protégés par anti-bot lourd (DataDome, Cloudflare) ou SPA → Playwright en priorité */
const SITES_CHROME_FIRST = ['pap', 'logic-immo', 'foncia', 'nexity']

/** Sites dont les APIs sont bloquées sur IPs datacenter → skip N2 Direct Fetch, N4 Playwright/Proxies */
const SITES_DATACENTER_BLOCKED = ['pap', 'orpi']

// ═══════════════════════════════════════════════════════
// PROXY FETCH — Route les requêtes via Railway (IP non-AWS)
// Utilisé sur Vercel pour bypasser les blocages IP datacenter
// sans consommer de quota ScrapingBee/Firecrawl.
// ═══════════════════════════════════════════════════════
const SCRAPER_URL = process.env.SCRAPER_URL
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || ''
const hasProxy = !!SCRAPER_URL

/**
 * Exécute un fetch HTTP via le proxy Railway (aquiz-scraper /proxy-fetch).
 * Retourne la même structure que fetch() : { status, headers, body }.
 * Si le proxy n'est pas configuré ou échoue, retourne null.
 */
async function proxyFetch(
  url: string,
  options?: { method?: string; headers?: Record<string, string>; body?: string; timeout?: number }
): Promise<{ status: number; headers: Record<string, string>; body: unknown } | null> {
  if (!hasProxy) return null
  try {
    const resp = await fetch(`${SCRAPER_URL}/proxy-fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SCRAPER_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        method: options?.method || 'GET',
        headers: options?.headers || {},
        body: options?.body,
        timeout: options?.timeout || 15000,
      }),
      signal: AbortSignal.timeout(35000), // proxy overhead
    })
    if (!resp.ok) return null
    return await resp.json() as { status: number; headers: Record<string, string>; body: unknown }
  } catch (err) {
    console.warn('proxyFetch error:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Exécute une étape de la cascade avec chronométrage et journalisation.
 * Retourne le résultat de l'extraction (ou null si échec).
 */
async function runCascadeStep(
  log: ExtractionLogEntry[],
  level: string,
  method: string,
  fn: () => Promise<ExtractionResponse | null>,
  site?: string,
): Promise<ExtractionResponse | null> {
  const t0 = performance.now()
  try {
    const result = await fn()
    const durationMs = Math.round(performance.now() - t0)
    if (result) {
      log.push({ level, method, durationMs, status: 'success', fieldsExtracted: result.fieldsExtracted })
      console.log(`✅ [${level}] ${method} → ${result.fieldsExtracted ?? '?'} champs en ${durationMs}ms`)
      // ── Health Monitor ──
      if (site) {
        recordExtraction({ site, method, level, success: true, fieldsExtracted: result.fieldsExtracted ?? 0, durationMs, timestamp: Date.now() })
      }
    } else {
      log.push({ level, method, durationMs, status: 'fail' })
      console.log(`❌ [${level}] ${method} → échec en ${durationMs}ms`)
      if (site) {
        recordExtraction({ site, method, level, success: false, fieldsExtracted: 0, durationMs, timestamp: Date.now() })
      }
    }
    return result
  } catch (err) {
    const durationMs = Math.round(performance.now() - t0)
    const detail = err instanceof Error ? err.message : String(err)
    log.push({ level, method, durationMs, status: 'fail', detail })
    console.log(`❌ [${level}] ${method} → erreur en ${durationMs}ms: ${detail}`)
    if (site) {
      recordExtraction({ site, method, level, success: false, fieldsExtracted: 0, durationMs, timestamp: Date.now(), error: detail })
    }
    return null
  }
}

/**
 * Extrait le code postal depuis l'URL de l'annonce.
 * Fiable pour les sites qui encodent l'arrondissement dans le slug :
 * - SeLoger:  /paris-17eme-75/  → 75017
 * - Bien'ici: /paris-18e-75018/ → 75018
 * - Générique: tout segment contenant un CP 5 chiffres
 *
 * Pour Paris (75), Lyon (69), Marseille (13), reconstruit le CP
 * depuis le numéro d'arrondissement dans le slug.
 */
function extraireCPDepuisUrl(url: string): string | undefined {
  try {
    const pathname = new URL(url).pathname.toLowerCase()

    // Pattern 1 : "paris-17eme-75" / "lyon-3eme-69" / "marseille-8eme-13"
    //             "paris-1er-75"
    const arrMatch = pathname.match(
      /\/(paris|lyon|marseille)-(\d{1,2})(?:er?|[eè]me)-(\d{2})\//
    )
    if (arrMatch) {
      const num = parseInt(arrMatch[2])
      const dept = arrMatch[3]
      if (num >= 1 && num <= 20 && ['75', '69', '13'].includes(dept)) {
        return `${dept}${String(num).padStart(3, '0')}`
      }
    }

    // Pattern 2 : CP 5 chiffres déjà dans le slug (Bien'ici : "paris-18e-75018")
    const cpMatch = pathname.match(/\/[a-z0-9-]+-(\d{5})\//)
    if (cpMatch) {
      const cp = cpMatch[1]
      const dept = parseInt(cp.substring(0, 2))
      if (dept >= 1 && dept <= 98) return cp
    }

    return undefined
  } catch {
    return undefined
  }
}

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
    // ── Bypass rate limit pour les probes internes (cron health check) ──
    const cronProbe = request.headers.get('x-cron-probe')
    const cronSecret = process.env.CRON_SECRET
    const isCronProbe = !!cronSecret && cronProbe === cronSecret

    // ── Rate Limiting ─────────────────────────────────────
    if (!isCronProbe) {
      const ip = getClientIP(request.headers)
      const rateCheck = checkRateLimit(`extract:${ip}`, RATE_LIMITS.extract)
      if (!rateCheck.success) {
        return NextResponse.json(
          { success: false, error: 'Trop de requêtes d\'extraction. Veuillez patienter.' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
        )
      }
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

    // ── Protection SSRF : résolution DNS pour bloquer le rebinding ──
    const isPrivateIPv4 = (ip: string) =>
      ip.startsWith('127.') ||
      ip.startsWith('10.') ||
      ip.startsWith('0.') ||
      ip.startsWith('169.254.') ||
      ip.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(ip)

    const isPrivateIPv6 = (ip: string) => {
      const lower = ip.toLowerCase()
      // Loopback ::1, link-local fe80::, unique local fc00::/fd00::, IPv4-mapped ::ffff:x.x.x.x
      if (lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc00:') || lower.startsWith('fd00:')) return true
      // IPv4-mapped IPv6 (::ffff:10.0.0.1)
      const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
      if (v4Mapped && isPrivateIPv4(v4Mapped[1])) return true
      return false
    }

    try {
      // Check both IPv4 and IPv6 to prevent SSRF via IPv6 rebinding
      const [v4Addresses, v6Addresses] = await Promise.allSettled([
        dns.resolve4(hostname),
        dns.resolve6(hostname),
      ])
      const allAddresses: { ip: string; isV6: boolean }[] = []
      if (v4Addresses.status === 'fulfilled') {
        allAddresses.push(...v4Addresses.value.map(ip => ({ ip, isV6: false })))
      }
      if (v6Addresses.status === 'fulfilled') {
        allAddresses.push(...v6Addresses.value.map(ip => ({ ip, isV6: true })))
      }

      const hasPrivate = allAddresses.some(({ ip, isV6 }) =>
        isV6 ? isPrivateIPv6(ip) : isPrivateIPv4(ip)
      )
      if (hasPrivate) {
        return NextResponse.json(
          { success: false, error: 'URL non autorisée' },
          { status: 400 }
        )
      }

      // If neither resolved, allow through with caution (transient DNS failure)
      if (allAddresses.length === 0) {
        console.warn(`⚠️ DNS resolution failed for ${hostname} — allowing through with caution`)
      }
    } catch {
      console.warn(`⚠️ DNS resolution failed for ${hostname} — allowing through with caution`)
    }

    // ── Détection page de recherche (pas une annonce individuelle) ──
    const pathLower = parsedUrl.pathname.toLowerCase()
    const searchParams = parsedUrl.search.toLowerCase()
    const isSearchPage = (
      pathLower.includes('/recherche') ||
      pathLower.includes('/search') ||
      pathLower.includes('/list.htm') ||
      (pathLower.includes('/annonces/') && !pathLower.match(/\d{5,}/) && !pathLower.match(/-r\d{5,}/)) ||
      searchParams.includes('idtypebien=') ||
      (searchParams.includes('tri=') && searchParams.includes('localities=')) ||
      (searchParams.includes('category=') && searchParams.includes('locations='))
    )
    if (isSearchPage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cette URL est une page de recherche, pas une annonce individuelle.',
          hint: 'Ouvrez une annonce spécifique et copiez son URL (ex: seloger.com/annonces/.../12345.htm)',
        },
        { status: 400 }
      )
    }

    // ── Protection : bloquer les annonces de location ──
    if (isLocationUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cette annonce est une location. Le comparateur AQUIZ est réservé aux biens à l\'achat.',
          isLocation: true,
        },
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
        extractionLog: [{ level: 'cache', method: 'cache-hit', durationMs: 0, status: 'success' as const, fieldsExtracted: cached.fieldsExtracted }],
        totalDurationMs: 0,
      })
    }
    
    let extractionResult: ExtractionResponse | null = null
    let triedChrome = false
    const extractionLog: ExtractionLogEntry[] = []
    const cascadeStart = performance.now()
    
    console.log(`\n🔍 ══════ EXTRACTION CASCADE ══════`)
    console.log(`📎 URL: ${url}`)
    console.log(`🏷️  Source: ${source ?? 'inconnue'}`)
    console.log(`🌐 Env: ${IS_VERCEL ? 'Vercel' : 'local'} | Proxy: ${hasProxy ? 'oui' : 'non'}`)
    
    // ═══════════════════════════════════════════════════════
    // FAST-FAIL : Sites DataDome impossible à scraper côté serveur
    // selogerneuf.com utilise DataDome avec vérification IP côté CDN.
    // Aucune méthode serveur (fetch, Playwright, Jina, ScrapingBee) ne fonctionne.
    // → Répondre immédiatement en mode assistant (coller le texte) en <1s
    //   au lieu de gaspiller 26s sur la cascade complète.
    // ═══════════════════════════════════════════════════════
    if (url.includes('selogerneuf.com')) {
      console.log(`🏗️ SeLoger Neuf: fast-fail → mode assistant pour ${url.substring(0, 80)}`)
      extractionLog.push({ level: 'N/A', method: 'fast-fail selogerneuf', durationMs: 0, status: 'skipped', detail: 'DataDome' })
      return NextResponse.json({
        success: false,
        error: 'SeLoger Neuf bloque l\'extraction automatique (protection DataDome).',
        hint: 'Copiez le texte de la page depuis votre navigateur',
        protectedSite: true,
        autoFallback: true,
        extractionLog,
      }, { status: 502 })
    }
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 1 : APIs internes (GRATUIT, JSON, le plus fiable)
    // Chaque grand site FR a une API propriétaire qu'on appelle directement
    // → Bypass total des protections anti-bot
    //
    // ⚠️ Sur Vercel, les IP datacenter AWS sont bloquées par les grands
    // sites (LeBonCoin, SeLoger, PAP…). Si un proxy Railway est configuré
    // (SCRAPER_URL + SCRAPER_API_KEY), les appels API passent par Railway
    // (IP non-AWS, non bloquées). Sinon, on skip à ScrapingBee (Level 5).
    // ═══════════════════════════════════════════════════════
    const isPremiumSite = source !== null && PREMIUM_PROXY_SITES.includes(source)
    // Sur Vercel sans proxy → skip direct à ScrapingBee
    // Sur Vercel avec proxy → tenter les APIs via proxy d'abord
    const vercelSkipToScrapingBee = IS_VERCEL && isPremiumSite && !hasProxy
    const vercelUseProxy = IS_VERCEL && isPremiumSite && hasProxy
    
    if (vercelSkipToScrapingBee) {
      console.log(`⚡ Vercel: ${source} → skip niveaux 1-4, direct ScrapingBee (pas de proxy configuré)`)
      extractionLog.push({ level: 'N1-N4', method: 'skip (Vercel sans proxy)', durationMs: 0, status: 'skipped' })
    }
    if (vercelUseProxy) {
      console.log(`🔀 Vercel: ${source} → APIs via proxy Railway (${SCRAPER_URL})`)
    }
    
    if (!vercelSkipToScrapingBee) {
      if (source === 'seloger') {
        extractionResult = await runCascadeStep(extractionLog, 'N1', 'SeLoger API', () => trySeLogerAPI(url, vercelUseProxy), source)
      }
      if (!extractionResult && source === 'leboncoin') {
        extractionResult = await runCascadeStep(extractionLog, 'N1', 'LeBonCoin API', () => tryLeBonCoinAPI(url, vercelUseProxy), source)
      }
      if (!extractionResult && source === 'bienici') {
        extractionResult = await runCascadeStep(extractionLog, 'N1', 'Bien\'ici API', () => tryBienIciAPI(url), source)
      }
      if (!extractionResult && source === 'laforet') {
        extractionResult = await runCascadeStep(extractionLog, 'N1', 'Laforêt API', () => tryLaforetAPI(url), source)
      }
      if (!extractionResult && source === 'orpi') {
        extractionResult = await runCascadeStep(extractionLog, 'N1', 'Orpi API', () => tryOrpiAPI(url, vercelUseProxy), source)
      }
      if (!extractionResult && source === 'century21') {
        extractionResult = await runCascadeStep(extractionLog, 'N1', 'Century21', () => tryCentury21(url), source)
      }
      // ── Sites avec HTML accessible (pas de DataDome) → tryAgenceHTML ──
      // Agences, mandataires, portails : fetch HTML + __NEXT_DATA__ + JSON-LD + meta
      const SITES_AGENCE_HTML = ['guyhoquet', 'stephaneplaza', 'iad', 'capifrance', 'safti', 'optimhome', 'paruvendu', 'superimmo', 'avendrealouer', 'greenacres', 'meilleursagents', 'hosman', 'bouygues', 'kaufman', 'foncia', 'nexity']
      if (!extractionResult && source && SITES_AGENCE_HTML.includes(source)) {
        extractionResult = await runCascadeStep(extractionLog, 'N1', `Agence HTML (${source})`, () => tryAgenceHTML(url, source), source)
      }
    }
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 1.5 : Chrome stealth (pour sites très protégés sans API)
    // Uniquement Logic-Immo et sites DataDome/Cloudflare sans API connue
    // ═══════════════════════════════════════════════════════
    if (!extractionResult && !vercelSkipToScrapingBee && source && SITES_CHROME_FIRST.includes(source)) {
      extractionResult = await runCascadeStep(extractionLog, 'N1.5', `Playwright Chrome (${source})`, () => tryPlaywrightChrome(url, source), source)
      triedChrome = true
    }
    
    // SeLoger Neuf fast-fail en amont (L225-235) → pas besoin de retry Chrome ici
    
    // ── Fast-path : sites bloqués sur datacenter ──
    // skipDirectFetch = skip uniquement les étapes qui utilisent NOTRE IP (N2 Direct Fetch, N4 Playwright/Proxies)
    // Jina (N3), Google Cache et Archive.org (N4) utilisent des IPs EXTERNES → pas bloqués par DataDome
    const skipDirectFetch = source !== null && SITES_DATACENTER_BLOCKED.includes(source) && IS_VERCEL
    
    /** Garde-fou : temps max avant de sauter aux services payants (N5) */
    const CASCADE_BUDGET_MS = 40_000
    const isBudgetExhausted = () => (performance.now() - cascadeStart) > CASCADE_BUDGET_MS
    
    // ── Délai aléatoire entre stratégies ──
    if (!extractionResult && !vercelSkipToScrapingBee && !skipDirectFetch) await randomDelay(500, 1500)
    
    // ── Circuit breaker : si ce domaine bloque trop, on skip les fetch directs ──
    const circuitOpen = isDomainCircuitOpen(url)
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 2 : Fetch direct + parsing HTML/JSON-LD/meta
    // Fonctionne pour tout site sans protection anti-bot :
    // Century21, ParuVendu, agences indépendantes, etc.
    // ═══════════════════════════════════════════════════════
    if (!extractionResult && !circuitOpen && !vercelSkipToScrapingBee && !skipDirectFetch) {
      extractionResult = await runCascadeStep(extractionLog, 'N2', 'Direct Fetch + HTML', () => tryDirectFetch(url, source), source ?? undefined)
    } else if ((circuitOpen || skipDirectFetch) && !vercelSkipToScrapingBee) {
      extractionLog.push({ level: 'N2', method: 'Direct Fetch', durationMs: 0, status: 'skipped', detail: skipDirectFetch ? 'datacenter-blocked site' : 'circuit breaker open' })
    }
    
    // ── Délai aléatoire ──
    if (!extractionResult && !vercelSkipToScrapingBee && !isBudgetExhausted()) await randomDelay(500, 1500)
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 3 : Jina Reader (extraction texte IA, gratuit)
    // Utilise les serveurs Jina (IP externe) → pas bloqué par DataDome
    // ═══════════════════════════════════════════════════════
    if (!extractionResult && !vercelSkipToScrapingBee && !isBudgetExhausted()) {
      extractionResult = await runCascadeStep(extractionLog, 'N3', 'Jina Reader', () => tryJinaReader(url, source), source ?? undefined)
    }
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 4 : Fallbacks gratuits
    // Google Cache → Playwright fallback → Proxies → Archive.org
    // Google Cache et Archive.org utilisent des IPs externes → toujours essayer
    // Playwright et Proxies utilisent notre IP → skip si datacenter-blocked
    // ═══════════════════════════════════════════════════════
    if (!extractionResult && !vercelSkipToScrapingBee && !isBudgetExhausted()) {
      extractionResult = await runCascadeStep(extractionLog, 'N4', 'Google Cache', () => tryGoogleCache(url, source), source ?? undefined)
    }
    
    if (!extractionResult && !triedChrome && !vercelSkipToScrapingBee && !skipDirectFetch && !isBudgetExhausted()) {
      await randomDelay(1000, 2500)
      extractionResult = await runCascadeStep(extractionLog, 'N4', 'Playwright Chrome (fallback)', () => tryPlaywrightChrome(url, source), source ?? undefined)
    }
    
    if (!extractionResult && !vercelSkipToScrapingBee && !skipDirectFetch && !isBudgetExhausted()) {
      extractionResult = await runCascadeStep(extractionLog, 'N4', 'Free Proxies', () => tryFreeProxies(url, source), source ?? undefined)
    }
    
    if (!extractionResult && !vercelSkipToScrapingBee && !isBudgetExhausted()) {
      extractionResult = await runCascadeStep(extractionLog, 'N4', 'Archive.org', () => tryArchiveOrg(url, source), source ?? undefined)
    }
    
    // Log si budget dépassé
    if (!extractionResult && isBudgetExhausted() && !vercelSkipToScrapingBee) {
      const elapsed = Math.round(performance.now() - cascadeStart)
      console.log(`⏱️ Budget cascade dépassé (${elapsed}ms > ${CASCADE_BUDGET_MS}ms) → saut direct à N5`)
      extractionLog.push({ level: 'N3-N4', method: 'skip (budget temps)', durationMs: 0, status: 'skipped', detail: `${elapsed}ms elapsed` })
    }
    
    // ═══════════════════════════════════════════════════════
    // NIVEAU 5 : Services payants (optionnels, dernier recours)
    // Sur Vercel + proxy Railway : atteint seulement si tous les niveaux 1-4 ont échoué
    // Sur Vercel SANS proxy : c'est le SEUL niveau exécuté pour les sites premium
    // ═══════════════════════════════════════════════════════
    if (!extractionResult) {
      extractionResult = await runCascadeStep(extractionLog, 'N5', 'ScrapingBee', () => tryScrapingBee(url, source), source ?? undefined)
    }
    if (!extractionResult) {
      extractionResult = await runCascadeStep(extractionLog, 'N5', 'Firecrawl', () => tryFirecrawl(url, source), source ?? undefined)
    }
    
    // ===== LOG RÉSUMÉ CASCADE =====
    const totalDuration = Math.round(performance.now() - cascadeStart)
    const winner = extractionLog.find(e => e.status === 'success')
    console.log(`\n📊 ══════ RÉSUMÉ CASCADE ══════`)
    console.log(`⏱️  Durée totale: ${totalDuration}ms`)
    console.log(`🏆 Méthode gagnante: ${winner ? `${winner.method} (${winner.level})` : 'AUCUNE'}`)
    console.log(`📋 Étapes:`)
    for (const entry of extractionLog) {
      const icon = entry.status === 'success' ? '✅' : entry.status === 'skipped' ? '⏭️' : '❌'
      console.log(`   ${icon} [${entry.level}] ${entry.method} — ${entry.durationMs}ms${entry.detail ? ` (${entry.detail})` : ''}`)
    }
    console.log(`══════════════════════════════\n`)

    // ===== TOUT A ÉCHOUÉ =====
    if (!extractionResult) {
      recordRequest(url, 'blocked')
      recordDomainFailure(url)
      
      const HEAVILY_PROTECTED = ['pap', 'logic-immo', 'ouestfrance', 'figaro']
      const isSeLogerNeuf = url.includes('selogerneuf.com')
      const isHeavilyProtected = isSeLogerNeuf || (source !== null && HEAVILY_PROTECTED.includes(source))
      
      const siteNames: Record<string, string> = {
        'logic-immo': 'Logic-Immo', pap: 'PAP.fr',
        ouestfrance: 'Ouest-France Immo', figaro: 'Figaro Immo',
        seloger: 'SeLoger', leboncoin: 'LeBonCoin', bienici: "Bien'ici",
        laforet: 'Laforêt', orpi: 'Orpi', century21: 'Century 21',
        guyhoquet: 'Guy Hoquet', stephaneplaza: 'Stéphane Plaza',
        iad: 'IAD France', capifrance: 'Capifrance', safti: 'Safti',
        optimhome: 'OptimHome',
        paruvendu: 'ParuVendu', superimmo: 'SuperImmo',
        avendrealouer: 'AVendreALouer', greenacres: 'Green-Acres',
        meilleursagents: 'MeilleursAgents', hosman: 'Hosman',
        nexity: 'Nexity', bouygues: 'Bouygues Immobilier',
        kaufman: 'Kaufman & Broad', foncia: 'Foncia',
      }
      const siteName = isSeLogerNeuf ? 'SeLoger Neuf' : (source && siteNames[source]) || 'Ce site'
      
      return NextResponse.json({
        success: false,
        error: isHeavilyProtected
          ? `${siteName} bloque l'extraction automatique (protection anti-bot).`
          : 'Impossible de récupérer les données de cette annonce.',
        hint: 'Copiez le texte de la page depuis votre navigateur',
        protectedSite: isHeavilyProtected,
        autoFallback: true,
        extractionLog,
        totalDurationMs: totalDuration,
      }, { status: 502 })
    }
    
    // ===== DÉTECTION DE PAGES D'ERREUR / REDIRECTIONS =====
    // Certains sites redirigent vers la homepage ou affichent une page 404
    // quand l'annonce est expirée. L'extraction peut "réussir" avec des données
    // du template de la page d'erreur → il faut détecter et rejeter.
    const extractedTitle = (extractionResult.data.titre as string) || ''
    const extractedVille = (extractionResult.data.ville as string) || ''
    const extractedDesc = (extractionResult.data.description as string) || ''
    const titleLower = extractedTitle.toLowerCase()
    const villeLower = extractedVille.toLowerCase()
    
    const ERROR_PATTERNS = [
      /erreur\s*404/i, /page\s*(non\s*)?trouv/i, /not\s*found/i,
      /annonce\s*(supprim|expir|retir|désactiv)/i,
      /cette\s*annonce\s*(n'est\s*plus|a\s*été)/i,
      /bien\s*(n'est\s*plus|a\s*été\s*vendu)/i,
      /page\s*(introuvable|inexistante)/i,
      /été\s*vendu/i,  // LeBonCoin "Ce bien a été vendu" (or truncated "été vendu")
      /ce\s*bien\s*a\s*été/i,
    ]
    
    const isErrorPage = ERROR_PATTERNS.some(p => 
      p.test(titleLower) || 
      p.test(extractedDesc.substring(0, 500).toLowerCase()) ||
      p.test(villeLower)
    )
    const isHomepageRedirect = (
      // Ville contient une description générique au lieu d'un vrai nom de ville
      villeLower.length > 50 ||
      // Surface aberrante (ex: surface=404 parsée depuis "erreur 404")
      (extractionResult.data.surface as number) === 404 ||
      // Prix absent + aucune surface → données vides d'une page générique
      (!extractionResult.data.prix && !extractionResult.data.surface && villeLower.length > 30) ||
      // Titre est la baseline du site, pas un titre d'annonce
      titleLower.includes('toutes les annonces') ||
      titleLower.includes('annonces immobilières de vente de biens') ||
      titleLower.includes('trouver logement')
    )
    
    if (isErrorPage || isHomepageRedirect) {
      console.log(`🚫 Annonce expirée/404 détectée: titre="${extractedTitle.substring(0, 80)}", ville="${extractedVille.substring(0, 40)}"`)
      recordRequest(url, 'blocked')
      
      return NextResponse.json({
        success: false,
        error: 'Cette annonce semble expirée ou supprimée.',
        hint: 'L\'annonce a probablement été vendue ou retirée du site.',
        extractionLog,
        totalDurationMs: totalDuration,
      }, { status: 200 })
    }

    // ===== CORRIGER CODE POSTAL DEPUIS L'URL =====
    // L'URL est la source la plus fiable pour les arrondissements (Paris/Lyon/Marseille).
    // Le parsing texte peut capturer un mauvais CP (ex: 75001 au lieu de 75017
    // à cause d'une section "prix au m²" dans le markdown).
    const urlCP = extraireCPDepuisUrl(url)
    if (urlCP && extractionResult.data.codePostal) {
      const parsedCP = extractionResult.data.codePostal as string
      const urlDept = urlCP.substring(0, 2)
      const parsedDept = parsedCP.substring(0, 2)
      // Corriger uniquement si même département (éviter de casser un CP correct
      // pour un site inconnu) et si l'arrondissement diffère
      if (urlDept === parsedDept && urlCP !== parsedCP) {
        console.log(`📍 CP corrigé depuis URL: ${parsedCP} → ${urlCP}`)
        extractionResult.data.codePostal = urlCP
      }
    } else if (urlCP && !extractionResult.data.codePostal) {
      extractionResult.data.codePostal = urlCP
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
    recordDomainSuccess(url)
    setCachedResult(
      url,
      extractionResult.data,
      extractionResult.method,
      extractionResult.source,
      extractionResult.fieldsExtracted || 0,
      extractionResult.message,
    )
    
    return NextResponse.json({ ...extractionResult, extractionLog, totalDurationMs: totalDuration })
    
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
      // Seuil 1200€ : à Paris charges mensuelles > 500€ sont courantes
      data.chargesMensuelles = charges > 1200 ? Math.round(charges / 12) : Math.round(charges)
    }
  }
  if (typeof json.description === 'string') data.description = (json.description as string).substring(0, 1000)
  if (typeof json.title === 'string') data.titre = json.title
  
  // Coordonnées GPS — BienIci utilise 'blurredLocation' ou 'blurredCoordinates' selon la version API
  // 'district' est un objet {name, id} non géographique, ne pas l'inclure
  const gpsCandidates = [
    json.blurredLocation,      // champ principal BienIci (testé en premier)
    json.blurredCoordinates,   // ancienne variante
    json.coordinates,
    json.location,             // certaines APIs renvoient tout dans location
    json.position,
    json.geo,
  ]
  for (const c of gpsCandidates) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) continue
    const obj = c as Record<string, unknown>
    const latRaw = obj.lat ?? obj.latitude
    const lngRaw = obj.lng ?? obj.longitude ?? obj.lon
    const lat = typeof latRaw === 'number' ? latRaw : typeof latRaw === 'string' ? parseFloat(latRaw) : NaN
    const lng = typeof lngRaw === 'number' ? lngRaw : typeof lngRaw === 'string' ? parseFloat(lngRaw) : NaN
    // Validation : coordonnées dans la zone France (métropole + DOM-TOM) + non nulles
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 &&
        lat >= -22 && lat <= 52 && lng >= -62 && lng <= 56) {
      data.latitude = lat
      data.longitude = lng
      break
    }
  }
  // Fallback : coordonnées directement à la racine du JSON (certaines APIs BienIci)
  if (!data.latitude || !data.longitude) {
    const latRaw = json.latitude ?? json.lat
    const lngRaw = json.longitude ?? json.lng ?? json.lon
    const lat = typeof latRaw === 'number' ? latRaw : typeof latRaw === 'string' ? parseFloat(String(latRaw)) : NaN
    const lng = typeof lngRaw === 'number' ? lngRaw : typeof lngRaw === 'string' ? parseFloat(String(lngRaw)) : NaN
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 &&
        lat >= -22 && lat <= 52 && lng >= -62 && lng <= 56) {
      data.latitude = lat
      data.longitude = lng
    }
  }
  
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
// LeBonCoin : fonctions partagées (factorisées) pour parser les données API
// ─────────────────────────────────────

/**
 * Parse les attributs LeBonCoin (surface, pièces, DPE, etc.)
 * Factorisation du switch/case utilisé par tryLeBonCoinAPI et tryLeBonCoinFallback.
 */
function parseLeBonCoinAttributes(data: Record<string, unknown>, attributes: Array<Record<string, unknown>>): void {
  for (const attr of attributes) {
    const key = String(attr.key || '').toLowerCase()
    const value = String(attr.value ?? '')
    const valueLabel = String(attr.value_label ?? '')
    if (!key) continue

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
          if (ch > 0 && ch < 50000) data.chargesMensuelles = ch > 1200 ? Math.round(ch / 12) : Math.round(ch)
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
      default:
        break
    }
  }
}

/**
 * Parse les données de base d'une réponse JSON LeBonCoin.
 * Retourne un objet data partiellement rempli (titre, description, prix, images, location, attributes).
 */
function parseLeBonCoinBaseData(json: Record<string, unknown>, url: string): Record<string, unknown> {
  const data: Record<string, unknown> = { url }

  // Titre & description
  data.titre = json.subject as string || undefined
  data.description = (json.body as string || '').replace(/\\n/g, '\n').substring(0, 1000)

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
    if (typeof loc.department_name === 'string') data.departement = loc.department_name
    if (typeof loc.address === 'string' && (loc.address as string).length >= 3) {
      data.adresse = loc.address
    }
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number' && loc.lat !== 0 && loc.lng !== 0) {
      data.latitude = loc.lat as number
      data.longitude = loc.lng as number
    }
  }

  // Attributes
  const attributes = json.attributes as Array<Record<string, unknown>> | undefined
  if (Array.isArray(attributes)) {
    parseLeBonCoinAttributes(data, attributes)
  }

  // Année construction depuis description
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

  // Enrichir avec parsing texte description
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

  completerDonnees(data)

  return data
}

/**
 * Compte les champs significatifs extraits d'un objet data LeBonCoin.
 */
function countLeBonCoinFields(data: Record<string, unknown>): number {
  return Object.keys(data).filter(k =>
    k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
  ).length
}

// ─────────────────────────────────────
// Stratégie LeBonCoin : API interne (gratuit, rapide, données complètes)
// L'API /finder/classified/<id> retourne le JSON complet de l'annonce
// avec prix, surface, pièces, DPE, GES, chambres, SDB, taxe foncière, etc.
// ─────────────────────────────────────
async function tryLeBonCoinAPI(url: string, useProxy = false): Promise<ExtractionResponse | null> {
  try {
    const idMatch = url.match(/\/(\d{8,12})(?:[/?#]|$)/) || url.match(/\/(\d{8,12})/)
    if (!idMatch) {
      console.warn('LeBonCoin API: impossible d\'extraire l\'ID depuis', url)
      return null
    }
    const adId = idMatch[1]
    
    await waitForDomainThrottle(`https://api.leboncoin.fr/`)
    
    // Clé API mobile LeBonCoin (publique, extraite du JS frontend LBC)
    // Permet de bypass DataDome depuis n'importe quelle IP (datacenter inclus)
    const LBC_API_KEY = process.env.LEBONCOIN_API_KEY || 'ba0c2dad52b3ec'
    
    const lbcHeaders: Record<string, string> = {
        'User-Agent': 'LBC;Android;14;phone;8.1.1',
        'api_key': LBC_API_KEY,
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR,fr;q=0.9',
    }

    const apiUrl = `https://api.leboncoin.fr/finder/classified/${adId}`
    let json: Record<string, unknown> | null = null

    if (useProxy) {
      // ── Via proxy Railway (Vercel → Railway → API LeBonCoin) ──
      const proxyResult = await proxyFetch(apiUrl, { headers: lbcHeaders, timeout: 10000 })
      if (proxyResult && proxyResult.status === 200) {
        json = proxyResult.body as Record<string, unknown>
      } else {
        console.warn(`LeBonCoin API via proxy: ${proxyResult?.status ?? 'no response'} pour ${adId}, fallback direct…`)
      }
    }

    if (!json) {
      // ── Appel direct (fallback si proxy KO, ou appel principal hors Vercel) ──
      const response = await fetch(apiUrl, {
        headers: lbcHeaders,
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) {
        console.warn(`LeBonCoin API HTTP ${response.status} pour annonce ${adId}`)
        return null
      }
      json = await response.json() as Record<string, unknown>
    }
    
    if (!json.list_id && !json.subject) {
      console.warn('LeBonCoin API: réponse captcha ou invalide')
      return null
    }
    
    const data = parseLeBonCoinBaseData(json, url)
    const fieldsCount = countLeBonCoinFields(data)
    
    return {
      success: true,
      source: 'leboncoin',
      data,
      fieldsExtracted: fieldsCount,
      method: useProxy ? 'leboncoin-api-proxy' : 'leboncoin-api',
      message: `${fieldsCount} données extraites depuis LeBonCoin (${useProxy ? 'proxy' : 'API directe'})`
    }
  } catch (err) {
    console.warn('LeBonCoin API échoué:', err)
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
    const idMatch = url.match(/\/(\d{8,12})(?:[/?#]|$)/) || url.match(/\/(\d{8,12})/)
    if (!idMatch) return null
    const adId = idMatch[1]

    await randomDelay(1500, 3500)
    await waitForDomainThrottle('https://api.leboncoin.fr/')

    console.log(`🔄 LeBonCoin fallback: retry pour ${adId}`)

    const altEndpoints = [
      `https://api.leboncoin.fr/api/adfinder/v1/classified/${adId}`,
      `https://api.leboncoin.fr/finder/classified/${adId}`,
    ]

    for (const endpoint of altEndpoints) {
      try {
        const LBC_API_KEY = process.env.LEBONCOIN_API_KEY || 'ba0c2dad52b3ec'
        const fbHeaders: Record<string, string> = {
            'User-Agent': 'LBC;Android;14;phone;8.1.1',
            'api_key': LBC_API_KEY,
            'Accept': 'application/json',
            'Accept-Language': 'fr-FR,fr;q=0.9',
        }
        const response = await fetch(endpoint, {
          headers: fbHeaders,
          signal: AbortSignal.timeout(10000),
        })

        if (response.ok) {
          const json = await response.json() as Record<string, unknown>
          if (json.list_id || json.subject) {
            console.log(`✅ LeBonCoin fallback réussi via ${new URL(endpoint).pathname}`)
            
            const data = parseLeBonCoinBaseData(json, url)
            const fieldsCount = countLeBonCoinFields(data)

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
  } catch (error) {
    console.warn('LeBonCoin API error:', error instanceof Error ? error.message : 'unknown')
    return null
  }
}

// ─────────────────────────────────────
// Stratégie SeLoger : API mobile interne (GRATUIT, bypass DataDome)
// L'API Groupe SeLoger accepte les requêtes avec le User-Agent de l'app iOS SeLoger
// Retourne le JSON complet de l'annonce : prix, surface, pièces, DPE, GES, photos, etc.
// ─────────────────────────────────────
async function trySeLogerAPI(url: string, useProxy = false): Promise<ExtractionResponse | null> {
  try {
    // Extraire l'ID de l'annonce depuis l'URL
    // Formats: .../260515181.htm  |  .../238947597/  |  .../238947597#
    const idMatch = url.match(/\/(\d{6,12})\.htm/) || url.match(/\/(\d{6,12})(?:[\/?#]|$)/)
    if (!idMatch) {
      console.warn('SeLoger API: impossible d\'extraire l\'ID depuis', url)
      return null
    }
    const adId = idMatch[1]

    // Détecter si c'est un programme neuf (selogerneuf.com ou /neuf/programme/ dans l'URL)
    const isNeuf = url.includes('selogerneuf.com') || url.includes('/neuf/programme/')

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
    const baseHeaders: Record<string, string> = {
      'User-Agent': appUA,
      'Accept': 'application/json',
      'Accept-Language': 'fr-FR',
      'Accept-Encoding': 'gzip, deflate, br',
    }

    await waitForDomainThrottle(`https://api-seloger.svc.groupe-seloger.com/`)

    if (isNeuf) {
      console.log(`🏗️ SeLoger Neuf: programme ${adId} — skip API, cascade générique`)
      return null
    }

    const apiUrl = `https://api-seloger.svc.groupe-seloger.com/api/v1/listings/${adId}`

    let json: Record<string, unknown> | null = null

    if (useProxy) {
      // ── Via proxy Railway (Vercel → Railway → API SeLoger) ──
      const proxyResult = await proxyFetch(apiUrl, { headers: baseHeaders, timeout: 12000 })
      if (proxyResult && proxyResult.status === 200) {
        json = proxyResult.body as Record<string, unknown>
      } else {
        console.warn(`SeLoger API via proxy: ${proxyResult?.status ?? 'no response'} pour ${adId}, fallback direct…`)
      }
    }

    if (!json) {
      // ── Appel direct (local / VPS / fallback si proxy KO) ──
      const response = await fetch(apiUrl, {
        headers: baseHeaders,
        signal: AbortSignal.timeout(12000),
      })
      if (!response.ok) {
        console.warn(`SeLoger API HTTP ${response.status} pour annonce ${adId}`)
        return null
      }
      json = await response.json() as Record<string, unknown>
    }

    if (!json.id && !json.price && !json.livingArea) {
      console.warn('SeLoger API: réponse invalide pour', adId)
      return null
    }

    return parseSeLogerData(json, url)
  } catch (err) {
    console.warn('SeLoger API échoué:', err instanceof Error ? err.message : err)
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
    const idMatch = url.match(/\/(\d{6,12})\.htm/) || url.match(/\/(\d{6,12})(?:[/?#]|$)/)
    if (!idMatch) return null
    const adId = idMatch[1]
    const isNeuf = url.includes('selogerneuf.com') || url.includes('/neuf/programme/')

    // Strategy A : User-Agent Android SeLoger (différent pipeline anti-bot côté serveur)
    const ANDROID_UAS = [
      'SeLoger/12.2.0 (Android 14; SM-S928B; Build/UP1A.231005.007)',
      'SeLoger/12.1.0 (Android 13; Pixel 7; Build/TQ3A.230901.001)',
      'Dalvik/2.1.0 (Linux; U; Android 14; SM-S928B Build/UP1A.231005.007)',
    ]
    const androidUA = ANDROID_UAS[Math.floor(Math.random() * ANDROID_UAS.length)]

    await randomDelay(1000, 3000) // Attendre un peu avant de retenter
    await waitForDomainThrottle('https://api-seloger.svc.groupe-seloger.com/')

    console.log(`🔄 SeLoger fallback: retry avec UA Android pour ${adId}${isNeuf ? ' (programme neuf)' : ''}`)

    // Pour les programmes neufs, l'API mobile SeLoger n'a PAS les données — skip directement
    if (isNeuf) {
      console.log('🔄 SeLoger Neuf: skip fallback API (pas de données programme sur cette API)')
      return null
    }

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
  } catch (error) {
    console.warn('SeLoger API error:', error instanceof Error ? error.message : 'unknown')
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
  // Adresse (SeLoger peut fournir streetName, address, ou dans location)
  const slAddress = json.address ?? json.streetName ?? json.street
  if (typeof slAddress === 'string' && (slAddress as string).length >= 3) {
    data.adresse = (slAddress as string).substring(0, 100)
  }

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

/**
 * Parse les données JSON d'un programme neuf SeLoger
 * Les programmes ont une structure différente des listings classiques :
 * - programName au lieu de title
 * - priceMin/priceMax au lieu de price
 * - lots[] avec les typologies disponibles
 * - promoterName au lieu de professionals
 */
function parseSeLogerProgramData(json: Record<string, unknown>, url: string): ExtractionResponse | null {
  const data: Record<string, unknown> = { url }

  // ── Titre (programName > name > title) ──
  data.titre = (json.programName ?? json.name ?? json.title) as string | undefined

  // ── Prix (priceMin, priceMax, ou price direct) ──
  if (typeof json.priceMin === 'number' && json.priceMin > 0) {
    data.prix = json.priceMin
    if (typeof json.priceMax === 'number' && json.priceMax > json.priceMin) {
      data.prixMax = json.priceMax
      data.titre = `${data.titre || 'Programme neuf'} — à partir de ${json.priceMin.toLocaleString('fr-FR')} €`
    }
  } else if (typeof json.price === 'number' && json.price > 0) {
    data.prix = json.price
  }
  // Fallback: chercher dans lots[]
  if (!data.prix) {
    const lots = json.lots as Array<Record<string, unknown>> | undefined
    if (Array.isArray(lots) && lots.length > 0) {
      const prices = lots
        .map(l => l.price as number || l.priceMin as number)
        .filter(p => typeof p === 'number' && p > 0)
        .sort((a, b) => a - b)
      if (prices.length > 0) {
        data.prix = prices[0]
        if (prices.length > 1) data.prixMax = prices[prices.length - 1]
      }
    }
  }

  // ── Localisation ──
  if (typeof json.city === 'string') data.ville = json.city
  if (typeof json.zipCode === 'string') data.codePostal = json.zipCode
  else if (typeof json.zipCode === 'number') data.codePostal = String(json.zipCode)
  const addr = json.address ?? json.streetName
  if (typeof addr === 'string' && (addr as string).length >= 3) {
    data.adresse = (addr as string).substring(0, 100)
  }

  // ── Surface (du programme ou du premier lot) ──
  if (typeof json.livingArea === 'number' && json.livingArea > 0) {
    data.surface = json.livingArea
  } else {
    const lots = json.lots as Array<Record<string, unknown>> | undefined
    if (Array.isArray(lots) && lots.length > 0) {
      const areas = lots.map(l => l.livingArea as number).filter(a => typeof a === 'number' && a > 0)
      if (areas.length > 0) data.surface = Math.min(...areas)
    }
  }

  // ── Pièces / Chambres ──
  if (typeof json.rooms === 'number' && json.rooms > 0) data.pieces = json.rooms
  if (typeof json.bedrooms === 'number' && json.bedrooms >= 0) data.chambres = json.bedrooms

  // ── Type de bien (programmes neufs = souvent appartements) ──
  const realtyType = json.realtyType as number | undefined
  if (realtyType === 1) data.type = 'appartement'
  else if (realtyType === 2) data.type = 'maison'
  else data.type = 'appartement'

  // ── DPE / GES ──
  const energy = json.energy as Record<string, unknown> | undefined
  if (energy && typeof energy.grade === 'string' && /^[A-G]$/i.test(energy.grade)) {
    data.dpe = energy.grade.toUpperCase()
  }
  const ghg = json.greenhouseGas as Record<string, unknown> | undefined
  if (ghg && typeof ghg.grade === 'string' && /^[A-G]$/i.test(ghg.grade)) {
    data.ges = ghg.grade.toUpperCase()
  }
  // Programme neuf : DPE souvent A ou B, parfois indiqué dans labels
  if (!data.dpe) {
    const labels = json.labels as string[] | undefined
    if (Array.isArray(labels)) {
      for (const label of labels) {
        const dpeMatch = String(label).match(/DPE\s*[:\s]*([A-G])/i)
        if (dpeMatch) { data.dpe = dpeMatch[1].toUpperCase(); break }
      }
    }
  }

  // ── Description ──
  if (typeof json.description === 'string') {
    data.description = (json.description as string).substring(0, 1000)
  } else if (typeof json.marketing === 'object' && json.marketing !== null) {
    const mkt = json.marketing as Record<string, unknown>
    if (typeof mkt.description === 'string') {
      data.description = (mkt.description as string).substring(0, 1000)
    }
  }

  // ── Photos ──
  const photos = (json.photos ?? json.images ?? json.medias) as string[] | Array<Record<string, unknown>> | undefined
  if (Array.isArray(photos) && photos.length > 0) {
    const validPhotos = photos
      .map(p => typeof p === 'string' ? p : (p as Record<string, unknown>)?.url as string)
      .filter(p => typeof p === 'string' && p.startsWith('http'))
    if (validPhotos.length > 0) {
      data.imageUrl = validPhotos[0]
      data.images = validPhotos.slice(0, 20)
    }
  }

  // ── Promoteur ──
  if (typeof json.promoterName === 'string') {
    data.agence = json.promoterName
  } else {
    const pros = json.professionals as Array<Record<string, unknown>> | undefined
    if (Array.isArray(pros) && pros.length > 0 && typeof pros[0].name === 'string') {
      data.agence = pros[0].name
    }
  }

  // ── Coordonnées GPS ──
  const coords = json.coordinates as Record<string, unknown> | undefined
  if (coords) {
    if (typeof coords.latitude === 'number') data.latitude = coords.latitude
    if (typeof coords.longitude === 'number') data.longitude = coords.longitude
  }

  // ── Date de livraison (spécifique programmes neufs) ──
  const deliveryDate = json.deliveryDate ?? json.estimatedDelivery
  if (typeof deliveryDate === 'string') {
    data.dateLivraison = deliveryDate
  }

  // ── Extraire détails depuis la description ──
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

  // Vérification minimum
  if (!data.prix && !data.surface && !data.titre) return null

  completerDonnees(data)

  const fieldsCount = Object.keys(data).filter(k =>
    k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
  ).length

  return {
    success: true,
    source: 'seloger',
    data,
    fieldsExtracted: fieldsCount,
    method: 'seloger-neuf-api',
    message: `${fieldsCount} données extraites depuis SeLoger Neuf (API programme)`
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

    const rawCount = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length
    if (rawCount < 3) return null

    completerDonnees(data)
    const fieldsCount = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length

    console.log(`🏠 Laforêt HTML: ${fieldsCount} champs extraits`)
    return {
      success: true,
      source: 'laforet',
      data,
      fieldsExtracted: fieldsCount,
      method: 'laforet-html',
      message: `${fieldsCount} données extraites depuis Laforêt (HTML)`
    }
  } catch (error) {
    console.warn('Laforêt HTML extraction error:', error instanceof Error ? error.message : 'unknown')
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
    const titre = j.title ?? j.name ?? j.label ?? j.ad_title ?? null

    // Localisation
    // L'API Laforêt retourne city/postcode à null au top-level,
    // mais les vraies données sont dans le sous-objet "address"
    const addressObj = (typeof j.address === 'object' && j.address !== null) ? j.address : null
    const ville = j.city ?? j.location?.city ?? j.commune ?? addressObj?.city ?? null
    const codePostal = j.zipcode ?? j.postal_code ?? j.location?.zipcode ?? addressObj?.postcode ?? null
    const adresse = (typeof j.address === 'string' ? j.address : null) ?? j.location?.address ?? null
    const departement = j.department ?? addressObj?.department_code ?? null

    // Coordonnées GPS (Laforêt fournit lat/lng dans location ou directement)
    const lat = j.latitude ?? j.lat ?? j.location?.latitude ?? j.location?.lat ?? j.coordinates?.lat ?? null
    const lng = j.longitude ?? j.lng ?? j.location?.longitude ?? j.location?.lng ?? j.coordinates?.lng ?? null

    // DPE / GES
    // L'API Laforêt retourne { dpe: { value: 199, letter: "E" }, ges: { value: 34, letter: "D" } }
    const dpe = j.dpe_level ?? j.energy_class ?? j.dpe?.letter ?? j.dpe?.level ?? j.dpeLevel ?? null
    const dpeValeur = j.dpe_value ?? j.dpe?.value ?? j.energy_value ?? null
    const ges = j.ges_level ?? j.greenhouse_gas_class ?? j.ges?.letter ?? j.ges?.level ?? j.gesLevel ?? null
    const gesValeur = j.ges_value ?? j.ges?.value ?? null

    // Détails
    const etage = j.floor ?? j.level ?? null
    const etagesTotal = j.total_floors ?? j.nb_floors ?? j.floors_number ?? j.floors ?? null
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
    if (titre) data.titre = String(titre)
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
    // Coordonnées GPS
    if (typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0) {
      data.latitude = lat
      data.longitude = lng
    }
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
// Stratégie Century21 : fetch HTML + __NEXT_DATA__ / JSON-LD (GRATUIT)
// Century21.fr utilise Next.js → __NEXT_DATA__ contient toutes les données
// URL type : https://www.century21.fr/trouver_logement/detail/XXXXXXX/
// ─────────────────────────────────────
async function tryCentury21(url: string): Promise<ExtractionResponse | null> {
  try {
    await waitForDomainThrottle('century21.fr')
    console.log(`🏠 Century21: tentative fetch HTML + __NEXT_DATA__`)

    const response = await protectedFetch(url, {
      timeoutMs: 15000,
      throttle: true,
    })

    if (!response) {
      console.warn('Century21: pas de réponse')
      recordDomainFailure(url)
      return null
    }

    const html = await response.text()
    if (!html || html.length < 500) return null

    if (isBlockedResponse(html)) {
      console.warn('Century21: réponse bloquée')
      recordDomainFailure(url)
      return null
    }
    recordDomainSuccess(url)

    const data: Record<string, unknown> = { url }

    // ── 1) Essayer __NEXT_DATA__ (le plus riche) ──
    const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">\s*({[\s\S]*?})\s*<\/script>/i)
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        const props = nextData?.props?.pageProps

        // Century21 stocke les données du bien dans pageProps.property ou pageProps.ad
        const property = props?.property || props?.ad || props?.listing || props?.annonce || null

        if (property) {
          console.log('Century21: __NEXT_DATA__ trouvé avec property')

          if (property.title || property.titre) data.titre = String(property.title || property.titre)
          if (property.description) data.description = String(property.description).substring(0, 1000)
          if (property.price || property.prix) data.prix = Number(property.price || property.prix)
          if (property.surface || property.area) data.surface = Number(property.surface || property.area)
          if (property.rooms || property.nbRooms || property.pieces) data.pieces = Number(property.rooms || property.nbRooms || property.pieces)
          if (property.bedrooms || property.nbBedrooms || property.chambres) data.chambres = Number(property.bedrooms || property.nbBedrooms || property.chambres)
          if (property.type) {
            data.type = /maison|villa|pavillon/i.test(String(property.type)) ? 'maison' : 'appartement'
          }

          // DPE / GES
          if (property.dpeValue || property.energyConsumption || property.dpe) {
            const dpeVal = String(property.dpeValue || property.energyConsumption || property.dpe).toUpperCase()
            if (/^[A-G]$/.test(dpeVal)) data.dpe = dpeVal
          }
          if (property.gesValue || property.greenhouseGas || property.ges) {
            const gesVal = String(property.gesValue || property.greenhouseGas || property.ges).toUpperCase()
            if (/^[A-G]$/.test(gesVal)) data.ges = gesVal
          }

          // Localisation
          if (property.city || property.ville) data.ville = String(property.city || property.ville)
          if (property.zipCode || property.postalCode || property.codePostal) {
            data.codePostal = String(property.zipCode || property.postalCode || property.codePostal)
          }
          if (property.address || property.adresse) data.adresse = String(property.address || property.adresse)

          // GPS
          if (typeof property.latitude === 'number' && typeof property.longitude === 'number') {
            data.latitude = property.latitude
            data.longitude = property.longitude
          } else if (typeof property.lat === 'number' && typeof property.lng === 'number') {
            data.latitude = property.lat
            data.longitude = property.lng
          }

          // Images
          const imgs = property.images || property.photos || property.medias
          if (Array.isArray(imgs) && imgs.length > 0) {
            const imageUrls = imgs.map((img: unknown) => {
              if (typeof img === 'string') return img
              if (typeof img === 'object' && img !== null) {
                const imgObj = img as Record<string, unknown>
                return imgObj.url || imgObj.src || imgObj.path || imgObj.uri || null
              }
              return null
            }).filter(Boolean) as string[]
            if (imageUrls.length > 0) {
              data.imageUrl = imageUrls[0]
              data.images = imageUrls.slice(0, 20)
            }
          }

          // Caractéristiques
          if (property.floor !== undefined) data.etage = Number(property.floor)
          if (property.nbFloors) data.etagesTotal = Number(property.nbFloors)
          if (property.hasElevator || property.elevator) data.ascenseur = true
          if (property.hasParking || property.parking) data.parking = true
          if (property.hasBalcony || property.hasTerrace || property.balcony || property.terrace) data.balconTerrasse = true
          if (property.hasCellar || property.cellar || property.cave) data.cave = true
          if (property.constructionYear || property.yearOfConstruction) {
            const yr = Number(property.constructionYear || property.yearOfConstruction)
            if (yr >= 1800 && yr <= 2030) data.anneeConstruction = yr
          }
          if (property.charges || property.monthlyCharges) {
            const ch = Number(property.charges || property.monthlyCharges)
            if (ch > 0 && ch < 50000) data.chargesMensuelles = ch > 1200 ? Math.round(ch / 12) : Math.round(ch)
          }
          if (property.landTax || property.propertyTax || property.taxeFonciere) {
            const tax = Number(property.landTax || property.propertyTax || property.taxeFonciere)
            if (tax > 0 && tax < 20000) data.taxeFonciere = Math.round(tax)
          }
        }
      } catch (e) {
        console.warn('Century21: erreur parsing __NEXT_DATA__', e)
      }
    }

    // ── 2) Compléter avec extractFromHTML (JSON-LD, meta, HTML sémantique) ──
    const htmlData = extractFromHTML(html, url)
    if (htmlData) {
      const htmlRecord = htmlData as unknown as Record<string, unknown>
      for (const [key, value] of Object.entries(htmlRecord)) {
        if (value === undefined || value === null || value === 'NC') continue
        if (data[key] === undefined || data[key] === null || data[key] === 'NC') {
          data[key] = value
        }
      }
    }

    // ── 3) Enrichir avec parsing texte ──
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
    completerDonnees(data)

    const fieldsCount = Object.keys(data).filter(k =>
      k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
    ).length

    if (fieldsCount < MIN_FIELDS) {
      console.warn(`Century21: seulement ${fieldsCount} champ(s) — insuffisant`)
      return null
    }

    return {
      success: true,
      source: 'century21',
      data,
      fieldsExtracted: fieldsCount,
      method: 'century21-html',
      message: `${fieldsCount} données extraites depuis Century21 (HTML + __NEXT_DATA__)`
    }
  } catch (err) {
    console.warn('Century21 parser échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie agences HTML : Guy Hoquet, Stéphane Plaza, et similaires
// Fetch HTML + extractFromHTML (JSON-LD / meta / __NEXT_DATA__)
// Plus générique que Century21 car ces sites varient plus dans leur structure
// ─────────────────────────────────────
async function tryAgenceHTML(url: string, source: string): Promise<ExtractionResponse | null> {
  try {
    const hostname = new URL(url).hostname
    await waitForDomainThrottle(hostname)
    
    const sourceLabel = source === 'guyhoquet' ? 'Guy Hoquet' : source === 'stephaneplaza' ? 'Stéphane Plaza' : source
    console.log(`🏠 ${sourceLabel}: tentative fetch HTML`)

    const response = await protectedFetch(url, {
      timeoutMs: 15000,
      throttle: true,
    })

    if (!response) {
      console.warn(`${sourceLabel}: pas de réponse`)
      recordDomainFailure(url)
      return null
    }

    const html = await response.text()
    if (!html || html.length < 500) return null

    if (isBlockedResponse(html)) {
      console.warn(`${sourceLabel}: réponse bloquée`)
      recordDomainFailure(url)
      return null
    }
    recordDomainSuccess(url)

    const data: Record<string, unknown> = { url }

    // ── 1) Essayer __NEXT_DATA__ (Guy Hoquet est un site Next.js) ──
    const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">\s*({[\s\S]*?})\s*<\/script>/i)
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        const props = nextData?.props?.pageProps

        // Chercher récursivement un objet qui ressemble à une annonce immobilière
        const property = props?.property || props?.ad || props?.listing || props?.annonce
          || props?.data?.property || props?.data?.ad || null

        if (property) {
          console.log(`${sourceLabel}: __NEXT_DATA__ trouvé avec property`)
          
          if (property.title || property.titre || property.name) {
            data.titre = String(property.title || property.titre || property.name)
          }
          if (property.description) data.description = String(property.description).substring(0, 1000)
          if (property.price || property.prix) data.prix = Number(property.price || property.prix)
          if (property.surface || property.area || property.livingArea) {
            data.surface = Number(property.surface || property.area || property.livingArea)
          }
          if (property.rooms || property.nbRooms || property.pieces || property.numberOfRooms) {
            data.pieces = Number(property.rooms || property.nbRooms || property.pieces || property.numberOfRooms)
          }
          if (property.bedrooms || property.nbBedrooms || property.chambres) {
            data.chambres = Number(property.bedrooms || property.nbBedrooms || property.chambres)
          }
          if (property.type || property.propertyType) {
            const t = String(property.type || property.propertyType)
            data.type = /maison|villa|pavillon/i.test(t) ? 'maison' : 'appartement'
          }

          // DPE / GES
          const dpeVal = String(property.dpeValue || property.energyConsumption || property.dpe || property.energyClass || '').toUpperCase()
          if (/^[A-G]$/.test(dpeVal)) data.dpe = dpeVal
          const gesVal = String(property.gesValue || property.greenhouseGas || property.ges || property.greenhouseClass || '').toUpperCase()
          if (/^[A-G]$/.test(gesVal)) data.ges = gesVal

          // Localisation
          if (property.city || property.ville) data.ville = String(property.city || property.ville)
          if (property.zipCode || property.postalCode || property.codePostal) {
            data.codePostal = String(property.zipCode || property.postalCode || property.codePostal)
          }

          // GPS
          if (typeof property.latitude === 'number' && typeof property.longitude === 'number') {
            data.latitude = property.latitude
            data.longitude = property.longitude
          } else if (typeof property.lat === 'number' && typeof property.lng === 'number') {
            data.latitude = property.lat
            data.longitude = property.lng
          }

          // Images
          const imgs = property.images || property.photos || property.medias || property.pictures
          if (Array.isArray(imgs) && imgs.length > 0) {
            const imageUrls = imgs.map((img: unknown) => {
              if (typeof img === 'string') return img
              if (typeof img === 'object' && img !== null) {
                const imgObj = img as Record<string, unknown>
                return imgObj.url || imgObj.src || imgObj.path || imgObj.uri || imgObj.original || null
              }
              return null
            }).filter(Boolean) as string[]
            if (imageUrls.length > 0) {
              data.imageUrl = imageUrls[0]
              data.images = imageUrls.slice(0, 20)
            }
          }
        }
      } catch (e) {
        console.warn(`${sourceLabel}: erreur parsing __NEXT_DATA__`, e)
      }
    }

    // ── 2) Compléter avec extractFromHTML (JSON-LD, meta, HTML sémantique) ──
    const htmlData = extractFromHTML(html, url)
    if (htmlData) {
      const htmlRecord = htmlData as unknown as Record<string, unknown>
      for (const [key, value] of Object.entries(htmlRecord)) {
        if (value === undefined || value === null || value === 'NC') continue
        if (data[key] === undefined || data[key] === null || data[key] === 'NC') {
          data[key] = value
        }
      }
    }

    // ── 3) Enrichir avec parsing texte ──
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
    completerDonnees(data)

    const fieldsCount = Object.keys(data).filter(k =>
      k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
    ).length

    if (fieldsCount < MIN_FIELDS) {
      console.warn(`${sourceLabel}: seulement ${fieldsCount} champ(s) — insuffisant`)
      return null
    }

    return {
      success: true,
      source: source as ExtractionResponse['source'],
      data,
      fieldsExtracted: fieldsCount,
      method: `${source}-html`,
      message: `${fieldsCount} données extraites depuis ${sourceLabel} (HTML)`
    }
  } catch (err) {
    console.warn(`Agence HTML parser échoué (${source}):`, err)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie Orpi : page HTML avec JSON embarqué (GRATUIT)
// Les pages Orpi contiennent des données JSON dans les attributs data-result
// ou dans des scripts __NEXT_DATA__ / window.__INITIAL_STATE__
// ─────────────────────────────────────
async function tryOrpiAPI(url: string, useProxy = false): Promise<ExtractionResponse | null> {
  try {
    await waitForDomainThrottle('orpi.com')

    console.log(`🏢 Orpi: tentative fetch HTML avec JSON embarqué${useProxy ? ' (via proxy)' : ''}`)

    let html: string
    if (useProxy) {
      const proxyResp = await proxyFetch(url, { timeout: 15000 })
      if (!proxyResp) return null
      html = typeof proxyResp.body === 'string' ? proxyResp.body : JSON.stringify(proxyResp.body)
    } else {
      const response = await protectedFetch(url, {
        timeoutMs: 15000,
        throttle: true,
      })
      html = await response.text()
    }
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

    const rawCount = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length
    if (rawCount < 3) return null

    completerDonnees(data)
    const fieldsCount = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length

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
    const titre = j.title ?? j.titre ?? j.shortAd ?? null

    // Équipements (Orpi utilise hasXxx, xxx, ou des noms variés)
    const hasAscenseur = j.hasElevator ?? j.elevator ?? j.ascenseur ?? j.hasLift ?? null
    const hasBalcon = j.hasBalcony ?? j.balcony != null ? Number(j.balcony) > 0 : false
    const hasTerrasse = j.hasTerrace ?? j.terrace != null ? Number(j.terrace) > 0 : false
    const hasParking = j.hasParking ?? j.parking ?? j.hasGarage ?? j.garage ?? (typeof j.parkingPlacesQuantity === 'number' && j.parkingPlacesQuantity > 0) ?? null
    const hasCave = j.hasCellar ?? j.cellar ?? j.cave ?? null
    const orientation = j.orientation ?? j.exposure ?? null
    const taxeFonciere = j.propertyTax ?? j.taxe_fonciere ?? j.property_tax ?? null

    // Coordonnées GPS
    const lat = j.latitude ?? j.lat ?? j.location?.latitude ?? j.location?.lat ?? j.geopoint?.lat ?? null
    const lng = j.longitude ?? j.lng ?? j.location?.longitude ?? j.location?.lng ?? j.geopoint?.lng ?? null

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
    if (titre) data.titre = String(titre)
    if (photos.length > 0) {
      data.imageUrl = photos[0]
      data.images = photos.slice(0, 20)
    }
    if (nomAgence) data.agence = nomAgence
    // Équipements
    if (hasAscenseur != null && hasAscenseur !== false) data.ascenseur = Boolean(hasAscenseur)
    if (hasBalcon || hasTerrasse) data.balconTerrasse = true
    if (hasCave != null && hasCave !== false) data.cave = Boolean(hasCave)
    if (hasParking != null && hasParking !== false) data.parking = Boolean(hasParking)
    if (orientation && typeof orientation === 'string') data.orientation = String(orientation).substring(0, 30)
    if (taxeFonciere != null) { const tf = Number(taxeFonciere); if (tf > 0 && tf < 20000) data.taxeFonciere = Math.round(tf) }
    // Coordonnées GPS
    if (typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0) {
      data.latitude = lat
      data.longitude = lng
    }
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
      const errBody = await response.text().catch(() => '')
      const isQuotaExceeded = errBody.includes('limit reached') || response.status === 429
      console.warn(`ScrapingBee HTTP ${response.status} pour ${source || url}${isQuotaExceeded ? ' ⚠️ QUOTA MENSUEL ÉPUISÉ' : ''}: ${errBody.substring(0, 120)}`)
      return null
    }
    
    const html = await response.text()
    if (html.length < 200) return null
    
    // Pipeline centralisé
    const data: Record<string, unknown> = extractFromHTML(html, url)
    
    // Pour les SPA, compléter avec le parsing texte (le HTML seul est bruité)
    const spaSites = ['leboncoin', 'bienici', 'seloger']
    if (source !== null && spaSites.includes(source)) {
      // Extraire le texte visible du HTML (strip tags)
      const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
      const textData = parseTexteAnnonce(textContent)
      const textRecord = textData as unknown as Record<string, unknown>
      const mdPriorityFields = ['prix', 'codePostal', 'type', 'ville', 'dpe']
      for (const [key, value] of Object.entries(textRecord)) {
        if (value === undefined || value === null || value === 'NC') continue
        const htmlMissing = data[key] === undefined || data[key] === null || data[key] === 'NC'
        if (htmlMissing || mdPriorityFields.includes(key)) {
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
// Pour les sites DataDome (selogerneuf.com), on tente aussi le mode HTML
// car Jina utilise un vrai navigateur et peut contourner la protection.
// ─────────────────────────────────────
async function tryJinaReader(url: string, source: string | null): Promise<ExtractionResponse | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`
    const jinaApiKey = process.env.JINA_API_KEY
    const isDataDomeSite = url.includes('selogerneuf.com') || url.includes('logic-immo.com') || url.includes('pap.fr') || url.includes('leboncoin.fr')
    
    // ── Pour les sites DataDome : tenter d'abord le mode HTML ──
    // Jina peut exécuter le JS et bypasser DataDome grâce à son infra navigateur.
    // Le HTML complet permet d'extraire __NEXT_DATA__, JSON-LD, etc.
    if (isDataDomeSite) {
      try {
        const htmlHeaders: Record<string, string> = {
          'Accept': 'text/html',
          'X-Return-Format': 'html',
          'X-Wait-For-Selector': 'body',
        }
        if (jinaApiKey) {
          htmlHeaders['Authorization'] = `Bearer ${jinaApiKey}`
        }
        const htmlResp = await fetch(jinaUrl, {
          headers: htmlHeaders,
          signal: AbortSignal.timeout(20000),
        })
        if (htmlResp.ok) {
          const html = await htmlResp.text()
          if (html.length > 500 && !isBlockedResponse(html)) {
            // ── LeBonCoin : __NEXT_DATA__ → parseLeBonCoinBaseData (données structurées) ──
            if (source === 'leboncoin') {
              const lbcNextMatch = html.match(/<script[^>]*id\s*=\s*["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/)
              if (lbcNextMatch) {
                try {
                  const nextJson = JSON.parse(lbcNextMatch[1])
                  const adData = nextJson?.props?.pageProps?.ad
                    || nextJson?.props?.pageProps?.classified
                    || nextJson?.props?.pageProps
                  if (adData && (adData.list_id || adData.subject || adData.price)) {
                    const lbcData = parseLeBonCoinBaseData(adData as Record<string, unknown>, url)
                    const fc = countLeBonCoinFields(lbcData)
                    if (fc >= MIN_FIELDS) {
                      console.log(`✅ Jina HTML: ${fc} champs LeBonCoin extraits (__NEXT_DATA__)`)
                      return { success: true, source: 'leboncoin', data: lbcData, fieldsExtracted: fc, method: 'jina-html-nextdata', message: `${fc} données extraites via Jina HTML (__NEXT_DATA__ LeBonCoin)` }
                    }
                  }
                } catch { /* LBC __NEXT_DATA__ parse échoué, fallback extraction générique */ }
              }
            }
            
            // Parser __NEXT_DATA__ en priorité (sites Next.js comme selogerneuf.com)
            const nextData = parseNextData(html) as Record<string, unknown>
            const htmlData = extractFromHTML(html, url) || {} as Record<string, unknown>
            const merged: Record<string, unknown> = { url, ...htmlData, ...nextData }
            completerDonnees(merged)
            const fc = Object.keys(merged).filter(k => k !== 'url' && merged[k] != null).length
            if (fc >= MIN_FIELDS) {
              console.log(`✅ Jina HTML: ${fc} champs extraits pour ${source || 'la page'} (DataDome bypass)`)
              return { success: true, source: source || 'web', data: merged, fieldsExtracted: fc, method: 'jina-html', message: `${fc} données extraites via Jina HTML (DataDome bypass)` }
            }
          }
        }
      } catch { /* HTML mode échoué, on essaye le JSON classique */ }
    }
    
    // ── Mode JSON standard (texte markdown + images) ──
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
    const dataRecord = data as unknown as Record<string, unknown>
    completerDonnees(dataRecord)
    const count = compterChampsExtraits(dataRecord)
    if (count < MIN_FIELDS) return null
    
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
        formats: ['markdown', 'html'],
        onlyMainContent: false,  // On veut tout le HTML pour JSON-LD
        timeout: 15000,
        waitFor: 2000,           // Attendre 2s pour le JS
      }),
      signal: AbortSignal.timeout(25000),
    })
    
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.warn('Firecrawl HTTP error:', response.status, errText.substring(0, 200))
      return null
    }
    
    const result = await response.json()
    
    if (!result.success) return null
    
    // Essayer d'abord le HTML complet (avec JSON-LD) si disponible
    const htmlContent = result.data?.html as string | undefined
    const texte = (result.data?.markdown || '') as string
    
    let dataRecord: Record<string, unknown> = { url }
    
    // Pour les SPA (LeBonCoin, Bien'ici…), le HTML rendu contient du bruit React/Next.js
    // qui perturbe extractFromHTML (faux prix, faux code postal, faux type).
    // Le markdown Firecrawl est nettoyé et structuré → source plus fiable pour ces sites.
    const spaSites = ['leboncoin', 'bienici', 'seloger']
    const isSPA = source !== null && spaSites.includes(source)
    
    // Pipeline centralisé sur le HTML si disponible
    if (htmlContent && htmlContent.length > 200) {
      dataRecord = extractFromHTML(htmlContent, url)
    }
    
    // LeBonCoin SPA : le DPE est rendu en HTML avec la lettre active en h-sz-24
    // (les lettres inactives sont h-sz-16). Extraire DPE + GES.
    if (htmlContent && isSPA) {
      const dpeGesMatches = [...htmlContent.matchAll(/h-sz-24[^>]*>\s*([A-G])\s*</gi)]
      if (dpeGesMatches.length >= 1 && (!dataRecord.dpe || dataRecord.dpe === 'NC')) {
        dataRecord.dpe = dpeGesMatches[0][1].toUpperCase()
      }
      if (dpeGesMatches.length >= 2 && (!dataRecord.ges || dataRecord.ges === 'NC')) {
        dataRecord.ges = dpeGesMatches[1][1].toUpperCase()
      }
    }
    
    // Compléter avec le parsing texte du markdown (Firecrawl-spécifique)
    if (texte.length >= 50) {
      const textData = parseTexteAnnonce(texte)
      const textRecord = textData as unknown as Record<string, unknown>
      
      // Champs critiques où le markdown est plus fiable que le HTML pour les SPA
      // chargesMensuelles : le HTML brut contient souvent la valeur annuelle sans
      // contexte "copropriété" ou "/an" (tags HTML entre label et valeur), alors que
      // le markdown Firecrawl a le texte "Charges de copropriété 2638 €/an" → détecta annual.
      const mdPriorityFields = isSPA
        ? ['prix', 'codePostal', 'type', 'titre', 'ville', 'chargesMensuelles']
        : []
      
      for (const [key, value] of Object.entries(textRecord)) {
        if (value === undefined || value === null || value === 'NC') continue
        const htmlMissing = dataRecord[key] === undefined || dataRecord[key] === null || dataRecord[key] === 'NC'
        // Pour les SPA : les champs prioritaires du markdown ÉCRASENT le HTML
        if (htmlMissing || mdPriorityFields.includes(key)) {
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
    
    // ── LeBonCoin / sites Next.js : extraire __NEXT_DATA__ (données structurées JSON) ──
    if (source === 'leboncoin') {
      const nextDataMatch = html.match(/<script[^>]*id\s*=\s*["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/)
      if (nextDataMatch) {
        try {
          const nextJson = JSON.parse(nextDataMatch[1])
          const adData = nextJson?.props?.pageProps?.ad
            || nextJson?.props?.pageProps?.classified
            || nextJson?.props?.pageProps
          if (adData && (adData.list_id || adData.subject || adData.price)) {
            const lbcData = parseLeBonCoinBaseData(adData as Record<string, unknown>, url)
            const fc = countLeBonCoinFields(lbcData)
            if (fc >= MIN_FIELDS) {
              return {
                success: true,
                source: 'leboncoin',
                data: lbcData,
                fieldsExtracted: fc,
                method: 'google-cache-nextdata',
                message: `${fc} données extraites via Google Cache (__NEXT_DATA__)`
              }
            }
          }
        } catch { /* __NEXT_DATA__ parse échoué, continuer avec extraction générique */ }
      }
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

// completerDonnees importé depuis @/lib/scraping/completerDonnees

/**
 * Fallback : fetch léger de la page originale pour extraire og:image
 * Ne récupère que le <head> (premiers 50KB) pour limiter la bande passante
 */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      signal: AbortSignal.timeout(5000),
    })
    
    if (!response.ok) return null
    
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
