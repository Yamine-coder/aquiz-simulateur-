import { COOKIE_NAME, verifyAdminToken } from '@/lib/adminJwt'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Vérifie l'authentification admin via cookie JWT HttpOnly.
 * 
 * Flux :
 * 1. L'admin se connecte via POST /api/admin/login → reçoit un cookie HttpOnly
 * 2. Toutes les requêtes /api/admin/* envoient automatiquement le cookie
 * 3. Cette fonction vérifie le JWT du cookie
 * 
 * En dev sans ADMIN_PASSWORD_HASH_B64 configuré → accès libre.
 */
export async function checkAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const hashB64 = process.env.ADMIN_PASSWORD_HASH_B64

  // En dev sans hash configuré → accès libre
  if (!hashB64) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'ADMIN_PASSWORD_HASH_B64 non configuré. Accès refusé.' },
        { status: 500 }
      )
    }
    return null // Autorisé en dev
  }

  // Vérifier le cookie JWT
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    )
  }

  const valid = await verifyAdminToken(token)
  if (!valid) {
    return NextResponse.json(
      { error: 'Session expirée ou invalide' },
      { status: 401 }
    )
  }

  return null // Autorisé
}

