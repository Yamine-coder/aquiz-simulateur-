/**
 * Module anti-blocage pour le scraping en production
 * 
 * Empêche les sites immobiliers de détecter et bloquer nos requêtes.
 * 
 * Stratégies implémentées :
 * 1. **Cache URL** — Même URL = même résultat, 0 requête supplémentaire
 * 2. **Throttle par domaine** — Max 1 requête / N secondes par domaine
 * 3. **Retry avec backoff exponentiel** — Reprend après 429/503/timeout
 * 4. **Délai aléatoire** — Simule un comportement humain entre les requêtes
 * 5. **Fetch protégé** — Wrapper fetch avec proxy, timeout, retry intégrés
 * 6. **Rotation User-Agent** — Pool large de vrais navigateurs
 * 
 * @module antiBlock
 */

// ═══════════════════════════════════════════════════════
// 1. CACHE URL — Évite de re-scraper la même annonce
// ═══════════════════════════════════════════════════════

interface CacheEntry {
  data: Record<string, unknown>
  method: string
  source: string
  fieldsExtracted: number
  message: string
  cachedAt: number
  expiresAt: number
}

/** Durée de cache par défaut : 2 heures */
const DEFAULT_CACHE_TTL_MS = 2 * 60 * 60 * 1000

/** Taille max du cache en mémoire (évite les fuites) */
const MAX_CACHE_SIZE = 500

const urlCache = new Map<string, CacheEntry>()

/** Nettoyage automatique des entrées expirées */
function cleanupCache(): void {
  const now = Date.now()
  for (const [key, entry] of urlCache) {
    if (now > entry.expiresAt) urlCache.delete(key)
  }
  // Si toujours trop gros, supprimer les plus anciennes
  if (urlCache.size > MAX_CACHE_SIZE) {
    const entries = [...urlCache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)
    const toDelete = entries.slice(0, urlCache.size - MAX_CACHE_SIZE)
    for (const [key] of toDelete) urlCache.delete(key)
  }
}

/** Normalise une URL pour le cache (supprime fragment, trailing slash, paramètres tracking) */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    // Supprimer les paramètres de tracking courants
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'msclkid', 'ref', 'src']
    for (const p of trackingParams) u.searchParams.delete(p)
    // Normaliser les trailing slashes
    u.pathname = u.pathname.replace(/\/+$/, '')
    return u.toString()
  } catch {
    return url.toLowerCase().trim()
  }
}

/**
 * Récupère les données en cache pour une URL (si disponibles et non expirées).
 * 
 * @returns Les données en cache ou null si absentes/expirées
 */
export function getCachedResult(url: string): CacheEntry | null {
  cleanupCache()
  const key = normalizeUrl(url)
  const entry = urlCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    urlCache.delete(key)
    return null
  }
  return entry
}

/**
 * Stocke le résultat d'extraction dans le cache.
 * 
 * @param url URL de l'annonce
 * @param data Données extraites
 * @param method Méthode utilisée (ex: 'leboncoin-api', 'direct-fetch')
 * @param source Source détectée (ex: 'seloger', 'leboncoin')
 * @param fieldsExtracted Nombre de champs extraits
 * @param message Message descriptif
 * @param ttlMs Durée de cache en ms (défaut: 2h)
 */
export function setCachedResult(
  url: string,
  data: Record<string, unknown>,
  method: string,
  source: string,
  fieldsExtracted: number,
  message: string,
  ttlMs: number = DEFAULT_CACHE_TTL_MS
): void {
  const now = Date.now()
  const key = normalizeUrl(url)
  urlCache.set(key, {
    data,
    method,
    source,
    fieldsExtracted,
    message,
    cachedAt: now,
    expiresAt: now + ttlMs,
  })
}

/** Nombre d'entrées actuellement en cache */
export function getCacheSize(): number {
  return urlCache.size
}

/** Vide entièrement le cache */
export function clearCache(): void {
  urlCache.clear()
}


// ═══════════════════════════════════════════════════════
// 2. THROTTLE PAR DOMAINE — Limite les requêtes par site
// ═══════════════════════════════════════════════════════

/** Dernière requête par domaine (timestamp) */
const domainLastRequest = new Map<string, number>()

/** Délai minimum entre 2 requêtes au même domaine (en ms) */
const DOMAIN_MIN_DELAYS: Record<string, number> = {
  'www.seloger.com':       5000,   // SeLoger très agressif en blocage
  'www.leboncoin.fr':      3000,   // LeBonCoin modéré
  'api.leboncoin.fr':      2000,   // API LBC
  'www.bienici.com':       3000,   // Bien'ici
  'www.logic-immo.com':    3000,   // Logic-Immo
  'www.pap.fr':            2000,   // PAP
  'www.orpi.com':          2000,   // Orpi
  'www.century21.fr':      2000,   // Century 21
  'www.laforet.com':       2000,   // Laforêt
  'www.green-acres.fr':    2000,
  'www.paruvendu.fr':      2000,   // ParuVendu
  'www.guyhoquet.com':     2000,   // Guy Hoquet
  'www.stephaneplazaimmobilier.com': 2000, // Stéphane Plaza
  'default':               1500,   // Tous les autres sites
}

/** Extrait le domaine d'une URL */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return 'unknown'
  }
}

/**
 * Attend le temps nécessaire pour respecter le throttle du domaine.
 * Retourne immédiatement si le délai est déjà passé.
 * 
 * @param url URL cible
 * @returns Temps d'attente effectif (ms), 0 si pas d'attente
 */
export async function waitForDomainThrottle(url: string): Promise<number> {
  const domain = extractDomain(url)
  const minDelay = DOMAIN_MIN_DELAYS[domain] || DOMAIN_MIN_DELAYS['default']
  const lastRequest = domainLastRequest.get(domain)
  const now = Date.now()

  if (lastRequest) {
    const elapsed = now - lastRequest
    if (elapsed < minDelay) {
      const waitTime = minDelay - elapsed
      await sleep(waitTime)
      domainLastRequest.set(domain, Date.now())
      return waitTime
    }
  }

  domainLastRequest.set(domain, now)
  return 0
}

/**
 * Enregistre qu'une requête vient d'être faite à ce domaine
 * (sans attendre — pour les cas où l'attente est gérée en amont)
 */
export function markDomainRequest(url: string): void {
  const domain = extractDomain(url)
  domainLastRequest.set(domain, Date.now())
}


// ═══════════════════════════════════════════════════════
// 3. RETRY AVEC BACKOFF EXPONENTIEL
// ═══════════════════════════════════════════════════════

interface RetryOptions {
  /** Nombre max de tentatives (incluant la première) */
  maxAttempts?: number
  /** Délai initial avant la première relance (ms) */
  initialDelayMs?: number
  /** Multiplicateur du délai à chaque tentative */
  backoffMultiplier?: number
  /** Délai maximum entre deux tentatives (ms) */
  maxDelayMs?: number
  /** Codes HTTP qui déclenchent un retry (défaut: 429, 502, 503, 504) */
  retryableStatusCodes?: number[]
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 2,          // 1 tentative + 1 retry = 2 total (pas trop agressif)
  initialDelayMs: 2000,    // 2s
  backoffMultiplier: 2,    // 2s → 4s → 8s …
  maxDelayMs: 10000,       // Cap à 10s
  retryableStatusCodes: [429, 502, 503, 504],
}

/** Erreur avec code HTTP pour distinguer les retryable des non-retryable */
class FetchError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message)
    this.name = 'FetchError'
  }
}

/**
 * Exécute une fonction avec retry et backoff exponentiel.
 * Ajoute un jitter aléatoire pour éviter le "thundering herd".
 * 
 * @example
 * ```ts
 * const html = await retryWithBackoff(
 *   () => fetchWithProtection(url, options),
 *   { maxAttempts: 3 }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Ne pas retry si c'est le dernier essai
      if (attempt >= opts.maxAttempts) break

      // Ne pas retry pour les erreurs non-retryable
      if (error instanceof FetchError) {
        if (!opts.retryableStatusCodes.includes(error.statusCode)) break
      }

      // Calcul du délai avec backoff + jitter
      const baseDelay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      )
      // Jitter = ±30% du délai pour éviter les patterns
      const jitter = baseDelay * 0.3 * (Math.random() * 2 - 1)
      const delay = Math.round(baseDelay + jitter)

      console.warn(
        `[antiBlock] Tentative ${attempt}/${opts.maxAttempts} échouée` +
        `${error instanceof FetchError ? ` (HTTP ${error.statusCode})` : ''}, ` +
        `retry dans ${delay}ms…`
      )
      await sleep(delay)
    }
  }

  throw lastError ?? new Error('Retry épuisé')
}


// ═══════════════════════════════════════════════════════
// 4. DÉLAI ALÉATOIRE — Simulation comportement humain
// ═══════════════════════════════════════════════════════

/**
 * Attend un délai aléatoire entre min et max millisecondes.
 * Suit une distribution gaussienne centrée pour plus de réalisme.
 */
export async function randomDelay(minMs: number = 500, maxMs: number = 2500): Promise<number> {
  // Distribution plus naturelle (pics au centre)
  const r = (Math.random() + Math.random()) / 2 // pseudo-gaussien
  const delay = Math.round(minMs + r * (maxMs - minMs))
  await sleep(delay)
  return delay
}

/** Simple sleep async */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}


// ═══════════════════════════════════════════════════════
// 5. FETCH PROTÉGÉ — Wrapper fetch avec toutes les protections
// ═══════════════════════════════════════════════════════

/** Pool étendu de User-Agents réalistes (desktop + mobile, 2024-2025) */
const USER_AGENT_POOL = [
  // Chrome Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  // Chrome Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  // Firefox Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  // Firefox Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
  // Safari Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  // Edge Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  // Chrome Linux
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  // Mobile (iOS)
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  // Mobile (Android)
  'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
]

/** Sélectionne un User-Agent aléatoire du pool élargi */
export function getRandomUserAgent(): string {
  return USER_AGENT_POOL[Math.floor(Math.random() * USER_AGENT_POOL.length)]
}

/** Génère des headers Sec-CH-UA cohérents avec le User-Agent choisi */
function getSecChUaHeaders(ua: string): Record<string, string> {
  if (ua.includes('Edg/')) {
    const ver = ua.match(/Edg\/(\d+)/)?.[1] || '131'
    return {
      'Sec-Ch-Ua': `"Microsoft Edge";v="${ver}", "Chromium";v="${ver}", "Not-A.Brand";v="99"`,
      'Sec-Ch-Ua-Mobile': ua.includes('Mobile') ? '?1' : '?0',
      'Sec-Ch-Ua-Platform': ua.includes('Windows') ? '"Windows"' : ua.includes('Mac') ? '"macOS"' : '"Linux"',
    }
  }
  if (ua.includes('Chrome/')) {
    const ver = ua.match(/Chrome\/(\d+)/)?.[1] || '131'
    return {
      'Sec-Ch-Ua': `"Chromium";v="${ver}", "Google Chrome";v="${ver}", "Not-A.Brand";v="99"`,
      'Sec-Ch-Ua-Mobile': ua.includes('Mobile') ? '?1' : '?0',
      'Sec-Ch-Ua-Platform': ua.includes('Windows') ? '"Windows"' : ua.includes('Mac') ? '"macOS"' : ua.includes('Linux') ? '"Linux"' : '"Android"',
    }
  }
  // Firefox / Safari → pas de Sec-CH-UA
  return {}
}

/** Options pour le fetch protégé */
interface ProtectedFetchOptions {
  /** Timeout en ms (défaut: 12000) */
  timeoutMs?: number
  /** Headers supplémentaires */
  extraHeaders?: Record<string, string>
  /** Suivre les redirections (défaut: true) */
  followRedirects?: boolean
  /** Méthode HTTP (défaut: GET) */
  method?: string
  /** Body (pour POST) */
  body?: string
  /** Content-Type (pour POST, défaut: application/json) */
  contentType?: string
  /** Accept header (défaut: text/html) */
  accept?: string
  /** Appliquer le throttle par domaine (défaut: true) */
  throttle?: boolean
  /** Retry automatique (défaut: true) */
  retry?: boolean
  /** Options de retry */
  retryOptions?: RetryOptions
}

/**
 * Fetch protégé avec toutes les protections anti-blocage intégrées :
 * - Rotation User-Agent cohérente (UA + Sec-CH-UA alignés)
 * - Headers réalistes de navigateur
 * - Throttle par domaine automatique
 * - Retry avec backoff sur erreurs retryable
 * - Détection automatique des challenges/captchas
 * 
 * @throws FetchError si la réponse n'est pas OK après retries
 */
export async function protectedFetch(
  url: string,
  options?: ProtectedFetchOptions
): Promise<Response> {
  const opts: Required<ProtectedFetchOptions> = {
    timeoutMs: 12000,
    extraHeaders: {},
    followRedirects: true,
    method: 'GET',
    body: '',
    contentType: 'application/json',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    throttle: true,
    retry: true,
    retryOptions: {},
    ...options,
  }

  const doFetch = async (): Promise<Response> => {
    // Throttle par domaine
    if (opts.throttle) {
      await waitForDomainThrottle(url)
    }

    const ua = getRandomUserAgent()
    const secChUa = getSecChUaHeaders(ua)
    const parsedUrl = new URL(url)

    const headers: Record<string, string> = {
      'User-Agent': ua,
      'Accept': opts.accept,
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Referer': `${parsedUrl.protocol}//${parsedUrl.hostname}/`,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      ...secChUa,
      ...opts.extraHeaders,
    }

    // Pour les requêtes POST/API, adapter les headers
    if (opts.method !== 'GET') {
      headers['Content-Type'] = opts.contentType
      headers['Sec-Fetch-Dest'] = 'empty'
      headers['Sec-Fetch-Mode'] = 'cors'
      headers['Sec-Fetch-Site'] = 'same-site'
      delete headers['Upgrade-Insecure-Requests']
    }

    const fetchOptions: RequestInit = {
      method: opts.method,
      headers,
      signal: AbortSignal.timeout(opts.timeoutMs),
      redirect: opts.followRedirects ? 'follow' : 'manual',
    }

    if (opts.body && opts.method !== 'GET') {
      fetchOptions.body = opts.body
    }

    const response = await fetch(url, fetchOptions)

    // Marquer la requête comme effectuée
    markDomainRequest(url)

    if (!response.ok) {
      throw new FetchError(
        `HTTP ${response.status} pour ${parsedUrl.hostname}${parsedUrl.pathname.substring(0, 50)}`,
        response.status
      )
    }

    return response
  }

  if (opts.retry) {
    return retryWithBackoff(doFetch, opts.retryOptions)
  }

  return doFetch()
}


// ═══════════════════════════════════════════════════════
// 6. DÉTECTION CHALLENGE / BLOCAGE
// ═══════════════════════════════════════════════════════

/** Patterns indicateurs d'un challenge anti-bot ou blocage */
const CHALLENGE_PATTERNS = [
  'cf-challenge',
  'cf-chl-managed',
  'Just a moment...',
  'Checking your browser',
  'Please Wait... | Cloudflare',
  'datadome',
  'DataDome',
  'captcha',
  'recaptcha',
  'hCaptcha',
  'Attention Required! | Cloudflare',
  'Access denied',
  'Error 1020',
  'Please verify you are a human',
  'Pardon Our Interruption',
  '_dd_s', // DataDome cookie pattern
  'geo.captcha-delivery.com',
  'challenges.cloudflare.com',
]

/**
 * Détecte si un HTML est un challenge anti-bot ou un blocage.
 * 
 * @param html Contenu HTML de la réponse
 * @returns true si c'est un challenge/blocage, false si c'est du vrai contenu
 */
export function isBlockedResponse(html: string): boolean {
  // Page trop courte = probablement un redirect ou blocage
  if (html.length < 500) return true

  const htmlLower = html.toLowerCase()
  
  // Vérifier les patterns de challenge
  for (const pattern of CHALLENGE_PATTERNS) {
    if (htmlLower.includes(pattern.toLowerCase())) {
      return true
    }
  }

  // Heuristique : si le HTML ne contient aucun contenu immobilier typique
  // et est court, c'est probablement un blocage
  if (html.length < 2000) {
    const hasRealContent = /prix|€|surface|m²|chambre|pièce|appartement|maison/i.test(html)
    if (!hasRealContent) return true
  }

  return false
}


// ═══════════════════════════════════════════════════════
// 7. STATISTIQUES ET MONITORING
// ═══════════════════════════════════════════════════════

interface ScrapingStats {
  totalRequests: number
  cacheHits: number
  cacheHitRate: string
  blockedCount: number
  successCount: number
  successRate: string
  byDomain: Record<string, { requests: number; blocked: number; success: number }>
}

const stats = {
  totalRequests: 0,
  cacheHits: 0,
  blockedCount: 0,
  successCount: 0,
  byDomain: new Map<string, { requests: number; blocked: number; success: number }>(),
}

/** Enregistre une requête de scraping pour les statistiques */
export function recordRequest(url: string, result: 'success' | 'blocked' | 'cache-hit' | 'error'): void {
  stats.totalRequests++
  const domain = extractDomain(url)
  
  if (!stats.byDomain.has(domain)) {
    stats.byDomain.set(domain, { requests: 0, blocked: 0, success: 0 })
  }
  const domainStats = stats.byDomain.get(domain)!
  domainStats.requests++

  switch (result) {
    case 'success':
      stats.successCount++
      domainStats.success++
      break
    case 'blocked':
      stats.blockedCount++
      domainStats.blocked++
      break
    case 'cache-hit':
      stats.cacheHits++
      stats.successCount++
      domainStats.success++
      break
    case 'error':
      break
  }
}

/** Retourne les statistiques de scraping */
export function getScrapingStats(): ScrapingStats {
  const byDomain: ScrapingStats['byDomain'] = {}
  for (const [domain, data] of stats.byDomain) {
    byDomain[domain] = { ...data }
  }
  return {
    totalRequests: stats.totalRequests,
    cacheHits: stats.cacheHits,
    cacheHitRate: stats.totalRequests > 0 
      ? `${Math.round((stats.cacheHits / stats.totalRequests) * 100)}%` 
      : '0%',
    blockedCount: stats.blockedCount,
    successCount: stats.successCount,
    successRate: stats.totalRequests > 0 
      ? `${Math.round((stats.successCount / stats.totalRequests) * 100)}%` 
      : '0%',
    byDomain,
  }
}
