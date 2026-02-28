import { SignJWT, jwtVerify } from 'jose'

/**
 * Utilitaires JWT pour l'authentification admin.
 * 
 * Utilise `jose` (compatible Edge Runtime pour le middleware Next.js).
 * Le secret de signature est dérivé de ADMIN_JWT_SECRET ou ADMIN_PASSWORD_HASH.
 */

const COOKIE_NAME = 'admin_token'
const TOKEN_TTL = '8h'

/** Récupère la clé de signature (TextEncoder pour jose) */
function getSigningKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET
    ?? process.env.ADMIN_PASSWORD_HASH_B64

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] ADMIN_JWT_SECRET ou ADMIN_PASSWORD_HASH_B64 doit être configuré en production')
    }
    // Dev-only fallback — jamais utilisé en prod grâce au guard ci-dessus
    return new TextEncoder().encode('aquiz-dev-secret-not-for-production')
  }

  return new TextEncoder().encode(secret)
}

/** Crée un JWT signé avec expiration 8h */
export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSigningKey())
}

/** Vérifie un JWT admin. Retourne true si valide. */
export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSigningKey())
    return true
  } catch {
    return false
  }
}

/** Nom du cookie pour les headers Set-Cookie / lecture */
export { COOKIE_NAME }
