#!/usr/bin/env node

/**
 * AQUIZ — Génération du sitemap statique (public/sitemap.xml)
 *
 * Exécuté au build (`npm run build`) AVANT `next build`.
 * Lit les articles blog depuis src/data/blog-articles.ts pour
 * générer un fichier statique servi directement par le CDN,
 * sans passer par Next.js (évite les headers Vary internes).
 *
 * Usage : node scripts/generate-sitemap.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const BASE_URL = 'https://www.aquiz.eu'
const TODAY = new Date().toISOString().split('T')[0]

// ── Pages statiques ──────────────────────────────────
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

// ── Extraction blog articles depuis le fichier TS ────
function extractBlogData() {
  const filePath = join(process.cwd(), 'src', 'data', 'blog-articles.ts')
  const content = readFileSync(filePath, 'utf-8')

  // Regex pour extraire chaque bloc d'article (slug, category, publishedAt, updatedAt)
  const slugRegex = /slug:\s*'([^']+)'/g
  const categoryRegex = /category:\s*'([^']+)'/g
  const publishedRegex = /publishedAt:\s*'([^']+)'/g
  const updatedRegex = /updatedAt:\s*'([^']+)'/g

  const slugs = [...content.matchAll(slugRegex)].map((m) => m[1])
  const categories = [...content.matchAll(categoryRegex)].map((m) => m[1])
  const published = [...content.matchAll(publishedRegex)].map((m) => m[1])
  const updated = [...content.matchAll(updatedRegex)].map((m) => m[1])

  // Articles
  const articles = slugs.map((slug, i) => ({
    path: `/blog/${slug}`,
    lastmod: updated[i] ?? published[i] ?? TODAY,
    changefreq: 'monthly',
    priority: 0.7,
  }))

  // Catégories uniques
  const uniqueCategories = [...new Set(categories)]
  const categoryPages = uniqueCategories.map((cat) => ({
    path: `/blog/categorie/${cat}`,
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.5,
  }))

  return { articles, categoryPages }
}

// ── Génération XML ───────────────────────────────────
function buildSitemapXml(entries) {
  const urls = entries
    .map(
      (e) => `  <url>
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

// ── Main ─────────────────────────────────────────────
const { articles, categoryPages } = extractBlogData()

const allEntries = [
  ...STATIC_PAGES.map((p) => ({ ...p, lastmod: TODAY })),
  ...articles,
  ...categoryPages,
]

const xml = buildSitemapXml(allEntries)
const outputPath = join(process.cwd(), 'public', 'sitemap.xml')
writeFileSync(outputPath, xml, 'utf-8')

console.log(`✅ Sitemap généré : ${outputPath} (${allEntries.length} URLs)`)
