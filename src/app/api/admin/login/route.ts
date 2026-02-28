import { COOKIE_NAME, createAdminToken } from '@/lib/adminJwt'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

/** Rate limit strict pour le login admin : 5 tentatives / 15 min par IP */
const ADMIN_LOGIN_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 }

/**
 * Décode le hash bcrypt depuis la variable d'env encodée en base64.
 * Base64 évite les problèmes d'expansion des `$` par dotenv-expand de Next.js.
 */
function getPasswordHash(): string | undefined {
  const b64 = process.env.ADMIN_PASSWORD_HASH_B64
  if (!b64) return undefined
  return Buffer.from(b64, 'base64').toString('utf-8')
}

/**
 * POST /api/admin/login
 * 
 * Body: { password: string }
 * 
 * Vérifie le mot de passe contre ADMIN_PASSWORD_HASH_B64 (bcrypt hash encodé en base64).
 * Si valide → crée un JWT signé et le set en cookie HttpOnly.
 * 
 * Variables d'env requises :
 * - ADMIN_PASSWORD_HASH_B64 : hash bcrypt encodé en base64
 *   (générer avec : node -e "require('bcryptjs').hash('pwd', 12).then(h => console.log(Buffer.from(h).toString('base64')))")
 * - ADMIN_JWT_SECRET : clé de signature JWT (optionnel)
 */
export async function POST(request: NextRequest) {
  // Rate limiting anti brute-force
  const ip = getClientIP(request.headers)
  const rl = checkRateLimit(`admin_login_${ip}`, ADMIN_LOGIN_LIMIT)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = (await request.json()) as { password?: string }

    if (!body.password || typeof body.password !== 'string') {
      return NextResponse.json(
        { error: 'Mot de passe requis' },
        { status: 400 }
      )
    }

    const passwordHash = getPasswordHash()

    // En dev sans hash configuré → accès avec n'importe quel mot de passe
    if (!passwordHash) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'ADMIN_PASSWORD_HASH_B64 non configuré' },
          { status: 500 }
        )
      }
      // Dev fallback : accepter tout
      const token = await createAdminToken()
      const response = NextResponse.json({ success: true })
      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        maxAge: 8 * 60 * 60, // 8h
      })
      return response
    }

    // Vérifier le mot de passe avec bcrypt
    const valid = await bcrypt.compare(body.password, passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Créer le token JWT
    const token = await createAdminToken()

    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60, // 8h
    })

    return response
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
