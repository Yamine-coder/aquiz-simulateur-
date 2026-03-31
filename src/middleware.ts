import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { BLOG_ARTICLES } from '@/data/blog-articles'

const COOKIE_NAME = 'admin_token'
const BASE_URL = 'https://www.aquiz.eu'

/**
 * Génère le XML du sitemap. Exécuté dans le middleware (Edge Runtime)
 * pour bypasser les headers RSC de Next.js qui bloquent GSC.
 */
function buildSitemapXml(): string {
  const now = new Date().toISOString().split('T')[0]

  const pages = [
    { loc: BASE_URL, lastmod: now, changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/simulateur`, lastmod: now, changefreq: 'weekly', priority: '0.95' },
    { loc: `${BASE_URL}/simulateur/mode-a`, lastmod: now, changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/simulateur/mode-b`, lastmod: now, changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/comparateur`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
    { loc: `${BASE_URL}/carte`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
    { loc: `${BASE_URL}/aides`, lastmod: now, changefreq: 'monthly', priority: '0.7' },
    { loc: `${BASE_URL}/blog`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
    { loc: `${BASE_URL}/a-propos`, lastmod: now, changefreq: 'monthly', priority: '0.5' },
    { loc: `${BASE_URL}/contact`, lastmod: now, changefreq: 'monthly', priority: '0.5' },
    { loc: `${BASE_URL}/mentions-legales`, lastmod: now, changefreq: 'yearly', priority: '0.3' },
  ]

  for (const article of BLOG_ARTICLES) {
    pages.push({
      loc: `${BASE_URL}/blog/${article.slug}`,
      lastmod: article.updatedAt ?? article.publishedAt,
      changefreq: 'monthly',
      priority: '0.7',
    })
  }

  const categories = [...new Set(BLOG_ARTICLES.map((a) => a.category))]
  for (const cat of categories) {
    pages.push({
      loc: `${BASE_URL}/blog/categorie/${cat}`,
      lastmod: now,
      changefreq: 'monthly',
      priority: '0.5',
    })
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`
}

/**
 * Middleware Next.js — CSP nonce + protection admin + sitemap.
 */
export async function middleware(request: NextRequest) {
  // ── Sitemap — réponse brute sans headers Next.js ────
  if (request.nextUrl.pathname === '/sitemap.xml') {
    const xml = buildSitemapXml()
    const body = new TextEncoder().encode(xml)
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Length': body.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  }
  // ── CSP Nonce ───────────────────────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://*.sentry.io`,
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https://fonts.openmaptiles.org",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "connect-src 'self' data: blob: https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://fonts.openmaptiles.org https://api-adresse.data.gouv.fr https://geo.api.gouv.fr https://georisques.gouv.fr https://overpass-api.de https://api.cquest.org https://files.data.gouv.fr https://*.ingest.sentry.io",
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
    // Sitemap — intercepté par le middleware pour bypasser les headers RSC
    '/sitemap.xml',
    // Match all routes except static files, images and robots
    {
      source: '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
