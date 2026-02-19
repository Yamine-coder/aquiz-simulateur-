/**
 * Rate limiter simple en mémoire pour les API routes
 * 
 * Utilise un Map avec TTL pour limiter les requêtes par IP.
 * Suffisant pour un déploiement Vercel (serverless) car chaque
 * cold start remet le compteur à zéro — protection contre le spam
 * basique mais efficace pour un site vitrine.
 * 
 * Pour un rate limiting plus robuste en prod : Vercel WAF ou Upstash Redis.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Nettoyage périodique pour éviter les fuites mémoire
const CLEANUP_INTERVAL = 60_000 // 1 min
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

interface RateLimitConfig {
  /** Nombre max de requêtes dans la fenêtre */
  maxRequests: number
  /** Fenêtre de temps en millisecondes */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * Vérifie si une requête est autorisée pour une clé donnée (IP ou autre).
 * 
 * @example
 * ```ts
 * const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
 * const result = checkRateLimit(ip, { maxRequests: 5, windowMs: 60_000 })
 * if (!result.success) {
 *   return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
 * }
 * ```
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  // Première requête ou fenêtre expirée
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { success: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  // Incrémenter le compteur
  entry.count++

  if (entry.count > config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

/** Configs prédéfinies par type d'API */
export const RATE_LIMITS = {
  /** Formulaire de contact : 5 requêtes / 15 min */
  contact: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  /** Demande de rappel : 3 requêtes / 15 min */
  rappel: { maxRequests: 3, windowMs: 15 * 60 * 1000 },
  /** Extraction d'annonce : 10 requêtes / 5 min */
  extract: { maxRequests: 10, windowMs: 5 * 60 * 1000 },
  /** API analyse (DVF, géorisques, quartier) : 30 requêtes / min */
  analyse: { maxRequests: 30, windowMs: 60 * 1000 },
} as const

/**
 * Extrait l'IP du client depuis les headers Next.js
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  )
}
