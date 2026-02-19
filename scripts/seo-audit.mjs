#!/usr/bin/env node

/**
 * AQUIZ — Audit SEO & Référencement
 * 
 * Script d'analyse complète du référencement du projet.
 * Usage : node scripts/seo-audit.mjs
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const APP = join(SRC, 'app')

// ─────────────────────────────────────────────
// Couleurs terminal
// ─────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgCyan: '\x1b[46m',
  gray: '\x1b[90m',
}

const PASS = `${c.green}✔${c.reset}`
const FAIL = `${c.red}✘${c.reset}`
const WARN = `${c.yellow}⚠${c.reset}`
const INFO = `${c.cyan}ℹ${c.reset}`

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function fileExists(path) {
  return existsSync(join(ROOT, path))
}

function readFile(path) {
  const full = join(ROOT, path)
  if (!existsSync(full)) return null
  return readFileSync(full, 'utf-8')
}

function findFiles(dir, pattern, results = []) {
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      findFiles(full, pattern, results)
    } else if (pattern.test(entry)) {
      results.push(full)
    }
  }
  return results
}

// ─────────────────────────────────────────────
// Audit checks
// ─────────────────────────────────────────────
const results = []
let totalPoints = 0
let maxPoints = 0

function check(category, name, passed, weight = 1, detail = '') {
  maxPoints += weight
  if (passed) totalPoints += weight
  results.push({ category, name, passed, weight, detail })
}

function checkPartial(category, name, score, maxScore, weight = 1, detail = '') {
  maxPoints += weight
  const ratio = score / maxScore
  totalPoints += weight * ratio
  results.push({ 
    category, name, 
    passed: ratio >= 1 ? true : ratio > 0 ? 'partial' : false, 
    weight, 
    detail: detail || `${score}/${maxScore}` 
  })
}

// ═══════════════════════════════════════════════
// 1. FICHIERS TECHNIQUES SEO
// ═══════════════════════════════════════════════

// robots.txt
const robotsFile = readFile('src/app/robots.ts')
check('Fichiers SEO', 'robots.ts existe', !!robotsFile, 2)
if (robotsFile) {
  check('Fichiers SEO', 'robots.ts → disallow /api/', robotsFile.includes('/api/'), 1)
  check('Fichiers SEO', 'robots.ts → sitemap URL', robotsFile.includes('sitemap.xml'), 1)
  check('Fichiers SEO', 'robots.ts → disallow pages privées', 
    robotsFile.includes('/mes-simulations') && robotsFile.includes('/resultats'), 1)
}

// sitemap.xml
const sitemapFile = readFile('src/app/sitemap.ts')
check('Fichiers SEO', 'sitemap.ts existe', !!sitemapFile, 2)
if (sitemapFile) {
  const routes = ['/simulateur', '/carte', '/aides', '/comparateur', '/a-propos', '/mentions-legales']
  let found = 0
  for (const route of routes) {
    if (sitemapFile.includes(route)) found++
  }
  checkPartial('Fichiers SEO', 'sitemap.ts → routes publiques', found, routes.length, 2,
    `${found}/${routes.length} routes couvertes`)
  check('Fichiers SEO', 'sitemap.ts → priority défini', sitemapFile.includes('priority'), 1)
  check('Fichiers SEO', 'sitemap.ts → changeFrequency défini', sitemapFile.includes('changeFrequency'), 1)
  
  // Vérifie pas de route 404
  const has404Route = sitemapFile.includes('/services') && !fileExists('src/app/(vitrine)/services/page.tsx')
  check('Fichiers SEO', 'sitemap.ts → pas de route 404', !has404Route, 2, 
    has404Route ? '/services dans sitemap mais page inexistante' : '')
}

// manifest
const manifestFile = readFile('src/app/manifest.ts')
check('Fichiers SEO', 'manifest.ts (PWA)', !!manifestFile, 1)
if (manifestFile) {
  check('Fichiers SEO', 'manifest → name & short_name', 
    manifestFile.includes('name') && manifestFile.includes('short_name'), 1)
  check('Fichiers SEO', 'manifest → theme_color', manifestFile.includes('theme_color'), 1)
}

// ═══════════════════════════════════════════════
// 2. METADATA & OPEN GRAPH
// ═══════════════════════════════════════════════

// Root layout metadata
const rootLayout = readFile('src/app/layout.tsx')
if (rootLayout) {
  check('Metadata', 'Root layout → metadataBase', rootLayout.includes('metadataBase'), 2)
  check('Metadata', 'Root layout → title template (%s)', rootLayout.includes('%s'), 2)
  check('Metadata', 'Root layout → description', rootLayout.includes('description'), 2)
  check('Metadata', 'Root layout → keywords', rootLayout.includes('keywords'), 1)
  check('Metadata', 'Root layout → openGraph', rootLayout.includes('openGraph'), 2)
  check('Metadata', 'Root layout → twitter card', rootLayout.includes('twitter'), 1)
}

// Per-route metadata layouts
const routeLayouts = [
  { path: 'src/app/(app)/simulateur/layout.tsx', name: '/simulateur' },
  { path: 'src/app/(app)/simulateur/mode-a/layout.tsx', name: '/simulateur/mode-a' },
  { path: 'src/app/(app)/simulateur/mode-b/layout.tsx', name: '/simulateur/mode-b' },
  { path: 'src/app/(app)/carte/layout.tsx', name: '/carte' },
  { path: 'src/app/(app)/aides/layout.tsx', name: '/aides' },
  { path: 'src/app/(app)/comparateur/layout.tsx', name: '/comparateur' },
  { path: 'src/app/(app)/mes-simulations/layout.tsx', name: '/mes-simulations' },
]

let layoutsWithMeta = 0
let layoutsWithOG = 0
let layoutsWithCanonical = 0

for (const route of routeLayouts) {
  const content = readFile(route.path)
  if (content && content.includes('metadata')) layoutsWithMeta++
  if (content && content.includes('openGraph')) layoutsWithOG++
  if (content && content.includes('canonical')) layoutsWithCanonical++
}

checkPartial('Metadata', 'Layouts avec metadata export', layoutsWithMeta, routeLayouts.length, 3,
  `${layoutsWithMeta}/${routeLayouts.length} routes`)
checkPartial('Metadata', 'Layouts avec openGraph', layoutsWithOG, routeLayouts.length - 1, 2,
  `${layoutsWithOG}/${routeLayouts.length - 1} (mes-simulations exclu)`)
checkPartial('Metadata', 'Layouts avec canonical', layoutsWithCanonical, routeLayouts.length - 1, 2,
  `${layoutsWithCanonical}/${routeLayouts.length - 1}`)

// Vitrine pages metadata
const vitrinePages = [
  { path: 'src/app/(vitrine)/page.tsx', name: 'Homepage' },
  { path: 'src/app/(vitrine)/a-propos/page.tsx', name: '/a-propos' },
  { path: 'src/app/(vitrine)/mentions-legales/page.tsx', name: '/mentions-legales' },
]

for (const page of vitrinePages) {
  const content = readFile(page.path)
  if (content) {
    check('Metadata', `${page.name} → metadata`, content.includes('metadata'), 1)
    check('Metadata', `${page.name} → openGraph`, content.includes('openGraph'), 1)
  }
}

// mes-simulations noindex
const mesSimLayout = readFile('src/app/(app)/mes-simulations/layout.tsx')
check('Metadata', '/mes-simulations → robots noindex', 
  mesSimLayout && mesSimLayout.includes('index: false'), 2)

// ═══════════════════════════════════════════════
// 3. IMAGES OPEN GRAPH
// ═══════════════════════════════════════════════

check('Images OG', 'opengraph-image.tsx existe', fileExists('src/app/opengraph-image.tsx'), 3)
check('Images OG', 'twitter-image.tsx existe', fileExists('src/app/twitter-image.tsx'), 2)

const ogImage = readFile('src/app/opengraph-image.tsx')
if (ogImage) {
  check('Images OG', 'OG image → dimensions 1200×630', 
    ogImage.includes('1200') && ogImage.includes('630'), 1)
  check('Images OG', 'OG image → alt text défini', ogImage.includes('alt'), 1)
  check('Images OG', 'OG image → contentType image/png', ogImage.includes('image/png'), 1)
}

// ═══════════════════════════════════════════════
// 4. HIÉRARCHIE DES TITRES (h1)
// ═══════════════════════════════════════════════

const pagesToCheckH1 = [
  { path: 'src/app/(vitrine)/page.tsx', name: 'Homepage', components: ['src/components/vitrine/HeroSection.tsx'] },
  { path: 'src/app/(app)/simulateur/page.tsx', name: '/simulateur' },
  { path: 'src/app/(app)/simulateur/mode-a/page.tsx', name: '/mode-a' },
  { path: 'src/app/(app)/simulateur/mode-b/page.tsx', name: '/mode-b' },
  { path: 'src/app/(app)/carte/page.tsx', name: '/carte' },
  { path: 'src/app/(app)/aides/page.tsx', name: '/aides' },
  { path: 'src/app/(app)/comparateur/page.tsx', name: '/comparateur' },
  { path: 'src/app/(app)/mes-simulations/page.tsx', name: '/mes-simulations' },
]

for (const page of pagesToCheckH1) {
  let allContent = readFile(page.path) || ''
  // Include component files if any
  if (page.components) {
    for (const comp of page.components) {
      allContent += readFile(comp) || ''
    }
  }
  
  // Count h1 tags (including motion.h1)
  const h1Matches = allContent.match(/<(h1|motion\.h1)[\s>]/g) || []
  const h1Count = h1Matches.length
  
  check('Titres (h1)', `${page.name} → exactement 1 h1`, h1Count === 1, 2,
    h1Count === 0 ? 'Aucun h1 trouvé' : h1Count > 1 ? `${h1Count} h1 trouvés (doublon)` : '')
}

// ═══════════════════════════════════════════════
// 5. JSON-LD (STRUCTURED DATA)
// ═══════════════════════════════════════════════

const homePage = readFile('src/app/(vitrine)/page.tsx')
if (homePage) {
  check('JSON-LD', 'Homepage → LocalBusiness', homePage.includes('LocalBusiness'), 2)
  check('JSON-LD', 'Homepage → WebApplication', homePage.includes('WebApplication'), 1)
  check('JSON-LD', 'Homepage → FAQPage', homePage.includes('FAQPage'), 1)
}

const jsonLdLayouts = [
  { path: 'src/app/(app)/simulateur/layout.tsx', name: '/simulateur' },
  { path: 'src/app/(app)/simulateur/mode-a/layout.tsx', name: '/mode-a' },
  { path: 'src/app/(app)/simulateur/mode-b/layout.tsx', name: '/mode-b' },
  { path: 'src/app/(app)/carte/layout.tsx', name: '/carte' },
  { path: 'src/app/(app)/aides/layout.tsx', name: '/aides' },
  { path: 'src/app/(app)/comparateur/layout.tsx', name: '/comparateur' },
]

let jsonLdCount = 0
for (const layout of jsonLdLayouts) {
  const content = readFile(layout.path)
  if (content && content.includes('BreadcrumbList')) jsonLdCount++
}
checkPartial('JSON-LD', 'BreadcrumbList sur pages outils', jsonLdCount, jsonLdLayouts.length, 3,
  `${jsonLdCount}/${jsonLdLayouts.length} pages`)

// ═══════════════════════════════════════════════
// 6. SÉCURITÉ (headers)
// ═══════════════════════════════════════════════

const nextConfig = readFile('next.config.ts')
if (nextConfig) {
  const securityHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'Strict-Transport-Security',
    'X-DNS-Prefetch-Control',
  ]
  
  let headersFound = 0
  for (const header of securityHeaders) {
    if (nextConfig.includes(header)) headersFound++
  }
  checkPartial('Sécurité', 'Headers HTTP sécurité', headersFound, securityHeaders.length, 3,
    `${headersFound}/${securityHeaders.length} headers`)
}

// ═══════════════════════════════════════════════
// 7. ACCESSIBILITÉ SEO
// ═══════════════════════════════════════════════

// Check for empty alt attributes
const allTsx = findFiles(SRC, /\.tsx$/)
let emptyAlts = 0
let totalImages = 0
const emptyAltFiles = []

for (const file of allTsx) {
  const content = readFileSync(file, 'utf-8')
  const imgTags = content.match(/<img[^>]*>/g) || []
  const nextImgTags = content.match(/<Image[^>]*>/g) || []
  const allImgTags = [...imgTags, ...nextImgTags]
  
  for (const tag of allImgTags) {
    totalImages++
    if (tag.includes('alt=""') || (!tag.includes('alt=') && !tag.includes('alt ='))) {
      emptyAlts++
      emptyAltFiles.push(relative(ROOT, file))
    }
  }
}

check('Accessibilité', `Images avec alt text (${totalImages} images)`, emptyAlts === 0, 2,
  emptyAlts > 0 ? `${emptyAlts} image(s) sans alt : ${[...new Set(emptyAltFiles)].join(', ')}` : '')

// Check for Suspense boundaries with useSearchParams
const pagesWithSearchParams = findFiles(join(APP), /page\.tsx$/).filter(f => {
  const content = readFileSync(f, 'utf-8')
  return content.includes('useSearchParams')
})

for (const file of pagesWithSearchParams) {
  const content = readFileSync(file, 'utf-8')
  const hasSuspense = content.includes('Suspense')
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  check('Accessibilité', `Suspense boundary → ${rel.replace('src/app/', '')}`, hasSuspense, 1)
}

// ═══════════════════════════════════════════════
// 8. DESCRIPTIONS (longueur)
// ═══════════════════════════════════════════════

const allMetaFiles = [
  ...routeLayouts.map(r => r.path),
  ...vitrinePages.map(p => p.path),
]

let goodDescs = 0
let totalDescs = 0
const shortDescs = []

for (const path of allMetaFiles) {
  const content = readFile(path)
  if (!content) continue
  
  // Extract description value — supports escaped quotes (e.g. \')
  const descMatch = content.match(/description:\s*\n\s*'((?:[^'\\]|\\.)*)'/s)
    || content.match(/description:\s*'((?:[^'\\]|\\.)*)'/s)
    || content.match(/description:\s*"((?:[^"\\]|\\.)*)"/s)
    || content.match(/description:\s*\n\s*"((?:[^"\\]|\\.)*)"/s)
    || content.match(/description:\s*`([^`]+)`/s)
  
  if (descMatch) {
    totalDescs++
    // Unescape \' and \" for accurate char count
    const desc = descMatch[1].replace(/\\'/g, "'").replace(/\\"/g, '"').trim()
    if (desc.length >= 120 && desc.length <= 160) {
      goodDescs++
    } else {
      shortDescs.push({ path, length: desc.length })
    }
  }
}

if (totalDescs > 0) {
  checkPartial('Descriptions', 'Longueur optimale (120-160 chars)', goodDescs, totalDescs, 2,
    `${goodDescs}/${totalDescs} descriptions optimales`)
}

// ═══════════════════════════════════════════════════
// AFFICHAGE DES RÉSULTATS
// ═══════════════════════════════════════════════════

console.log()
console.log(`${c.bold}${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`)
console.log(`${c.bold}${c.cyan}║          AQUIZ — Audit SEO & Référencement                  ║${c.reset}`)
console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`)
console.log()

// Grouper par catégorie
const categories = [...new Set(results.map(r => r.category))]

for (const cat of categories) {
  const catResults = results.filter(r => r.category === cat)
  const catPassed = catResults.filter(r => r.passed === true).length
  const catPartial = catResults.filter(r => r.passed === 'partial').length
  const catFailed = catResults.filter(r => r.passed === false).length
  
  const catIcon = catFailed === 0 && catPartial === 0 ? PASS 
    : catFailed === 0 ? WARN 
    : FAIL
  
  console.log(`${c.bold}${catIcon}  ${cat}${c.reset} ${c.dim}(${catPassed}/${catResults.length} pass)${c.reset}`)
  
  for (const r of catResults) {
    const icon = r.passed === true ? PASS : r.passed === 'partial' ? WARN : FAIL
    const detail = r.detail ? ` ${c.dim}— ${r.detail}${c.reset}` : ''
    console.log(`   ${icon} ${r.name}${detail}`)
  }
  console.log()
}

// ─────────────────────────────────────────────
// Score final
// ─────────────────────────────────────────────
const score = Math.round((totalPoints / maxPoints) * 100)
const scoreBar = '█'.repeat(Math.round(score / 2.5)) + '░'.repeat(40 - Math.round(score / 2.5))

let scoreColor, scoreBg, scoreLabel
if (score >= 90) {
  scoreColor = c.green
  scoreBg = c.bgGreen
  scoreLabel = 'EXCELLENT'
} else if (score >= 75) {
  scoreColor = c.yellow
  scoreBg = c.bgYellow
  scoreLabel = 'BON'
} else if (score >= 50) {
  scoreColor = c.yellow
  scoreBg = c.bgYellow
  scoreLabel = 'MOYEN'
} else {
  scoreColor = c.red
  scoreBg = c.bgRed
  scoreLabel = 'À AMÉLIORER'
}

console.log(`${c.bold}${c.cyan}──────────────────────────────────────────────────────────────${c.reset}`)
console.log()
console.log(`  ${c.bold}Score SEO :${c.reset}  ${scoreBg}${c.bold} ${score}% ${c.reset}  ${scoreColor}${scoreLabel}${c.reset}`)
console.log()
console.log(`  ${scoreColor}${scoreBar}${c.reset}`)
console.log()
console.log(`  ${c.dim}Points : ${totalPoints.toFixed(1)} / ${maxPoints} (${results.length} vérifications)${c.reset}`)

const passed = results.filter(r => r.passed === true).length
const partial = results.filter(r => r.passed === 'partial').length  
const failed = results.filter(r => r.passed === false).length

console.log(`  ${PASS} ${passed} pass   ${WARN} ${partial} partiel   ${FAIL} ${failed} échoué`)
console.log()

// Recommandations si < 100%
if (failed > 0 || partial > 0) {
  console.log(`${c.bold}${c.yellow}  Recommandations :${c.reset}`)
  for (const r of results) {
    if (r.passed === false) {
      console.log(`  ${FAIL} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
    }
  }
  for (const r of results) {
    if (r.passed === 'partial') {
      console.log(`  ${WARN} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
    }
  }
  console.log()
}

console.log(`${c.dim}  Audit effectué le ${new Date().toLocaleDateString('fr-FR', { 
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
})}${c.reset}`)
console.log()
