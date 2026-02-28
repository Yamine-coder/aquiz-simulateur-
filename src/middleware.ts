import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'admin_token'

/**
 * Middleware Next.js — CSP nonce + protection admin.
 *
 * 1. Génère un nonce CSP unique par requête (remplace 'unsafe-inline' pour les scripts)
 * 2. Protège les pages /admin par JWT
 */
export async function middleware(request: NextRequest) {
  // ── CSP Nonce ───────────────────────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com https://*.sentry.io`,
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://api-adresse.data.gouv.fr https://geo.api.gouv.fr https://georisques.gouv.fr https://overpass-api.de https://api.cquest.org https://files.data.gouv.fr https://*.ingest.sentry.io",
    "frame-src https://www.google.com/maps/",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]

  const cspHeader = cspDirectives.join('; ')

  // ── Admin auth ──────────────────────────────────────
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  if (isAdminRoute) {
    const hashB64 = process.env.ADMIN_PASSWORD_HASH_B64

    // En dev sans hash configuré → accès libre
    if (!hashB64) {
      const response = NextResponse.next()
      response.headers.set('x-nonce', nonce)
      response.headers.set('Content-Security-Policy', cspHeader)
      return response
    }

    // Route login → toujours accessible
    if (request.nextUrl.pathname === '/admin/login') {
      const response = NextResponse.next()
      response.headers.set('x-nonce', nonce)
      response.headers.set('Content-Security-Policy', cspHeader)
      return response
    }

    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.headers.set('Content-Security-Policy', cspHeader)
      return response
    }

    try {
      const secret = new TextEncoder().encode(
        process.env.ADMIN_JWT_SECRET ?? hashB64
      )
      await jwtVerify(token, secret)
    } catch {
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
      response.headers.set('Content-Security-Policy', cspHeader)
      return response
    }
  }

  // ── Default response with CSP ───────────────────────
  const response = NextResponse.next()
  response.headers.set('x-nonce', nonce)
  response.headers.set('Content-Security-Policy', cspHeader)
  return response
}

export const config = {
  matcher: [
    // Match all routes except static files and images
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
