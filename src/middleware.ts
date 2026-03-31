import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { BLOG_ARTICLES, getActiveCategories } from '@/data/blog-articles'

const COOKIE_NAME = 'admin_token'
const BASE_URL = 'https://www.aquiz.eu'

// ── Sitemap statique (pages) ──────────────────────────
const STATIC_PAGES = [
  { path: '', changefreq: 'weekly', priority: 1.0 },
  { path: '/blog', changefreq: 'weekly', priority: 0.8 },
  { path: '/simulateur', changefreq: 'weekly', priority: 0.95 },
  { path: '/simulateur/mode-a', changefreq: 'weekly', priority: 0.9 },
  { path: '/simulateur/mode-b', changefreq: 'weekly', priority: 0.9 },
  { path: '/comparateur', changefreq: 'weekly', priority: 0.8 },
  { path: '/carte', changefreq: 'weekly', priority: 0.8 },
  { path: '/aides', changefreq: 'monthly', priority: 0.7 },
  { path: '/mentions-legales', changefreq: 'yearly', priority: 0.3 },
]

function buildSitemapXml(): string {
  const today = new Date().toISOString().split('T')[0]

  const entries: Array<{ path: string; lastmod: string; changefreq: string; priority: number }> = [
    ...STATIC_PAGES.map(p => ({ ...p, lastmod: today })),
    ...BLOG_ARTICLES.map(a => ({
      path: `/blog/${a.slug}`,
      lastmod: a.updatedAt ?? a.publishedAt,
      changefreq: 'monthly',
      priority: 0.7,
    })),
    ...getActiveCategories().map(cat => ({
      path: `/blog/categorie/${cat}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: 0.5,
    })),
  ]

  const urls = entries
    .map(
      e => `  <url>
    <loc>${BASE_URL}${e.path}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

/**
 * Middleware Next.js — Sitemap Edge + CSP nonce + protection admin.
 */
export async function middleware(request: NextRequest) {
  // ── Sitemap (Edge Response — zéro header parasite) ──
  if (request.nextUrl.pathname === '/sitemap.xml') {
    const xml = buildSitemapXml()
    const encoder = new TextEncoder()
    const body = encoder.encode(xml)
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
        'Content-Length': String(body.byteLength),
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
    // Sitemap — handled directly by Edge Runtime
    '/sitemap.xml',
    // Match all routes except static files, images, robots
    {
      source: '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
