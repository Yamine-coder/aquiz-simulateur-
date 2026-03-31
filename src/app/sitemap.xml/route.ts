import { BLOG_ARTICLES } from '@/data/blog-articles'

const BASE_URL = 'https://www.aquiz.eu'

// Force dynamic rendering — empêche le prerender static de Vercel
export const dynamic = 'force-dynamic'

/**
 * Route Handler pour /sitemap.xml
 * Contrôle total des headers — élimine les headers RSC parasites
 * qui empêchent Google Search Console de lire le sitemap.
 */
export function GET() {
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

  // Articles de blog
  for (const article of BLOG_ARTICLES) {
    pages.push({
      loc: `${BASE_URL}/blog/${article.slug}`,
      lastmod: article.updatedAt ?? article.publishedAt,
      changefreq: 'monthly',
      priority: '0.7',
    })
  }

  // Catégories de blog
  const categories = [...new Set(BLOG_ARTICLES.map((a) => a.category))]
  for (const cat of categories) {
    pages.push({
      loc: `${BASE_URL}/blog/categorie/${cat}`,
      lastmod: now,
      changefreq: 'monthly',
      priority: '0.5',
    })
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
