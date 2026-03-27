#!/usr/bin/env node

/**
 * AQUIZ — Ping IndexNow (Bing, Yandex, Naver, Seznam)
 * 
 * Soumet toutes les URLs du sitemap à IndexNow pour
 * une indexation quasi-instantanée sur Bing et Yandex.
 * Google n'a pas implémenté IndexNow officiellement mais
 * récupère les données via Bing.
 *
 * Usage : node scripts/ping-indexnow.mjs
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const BASE_URL = 'https://www.aquiz.eu'
const INDEXNOW_KEY = 'de9e154940364329ada6694c6c79576c'

// Lire le sitemap et extraire les URLs
const sitemapPath = join(process.cwd(), 'public', 'sitemap.xml')
const sitemapContent = readFileSync(sitemapPath, 'utf-8')
const urlMatches = [...sitemapContent.matchAll(/<loc>([^<]+)<\/loc>/g)]
const urls = urlMatches.map((m) => m[1])

console.log(`📡 IndexNow — ${urls.length} URLs à soumettre\n`)

// Endpoints IndexNow
const engines = [
  { name: 'Bing', endpoint: 'https://www.bing.com/indexnow' },
  { name: 'Yandex', endpoint: 'https://yandex.com/indexnow' },
]

for (const engine of engines) {
  try {
    const body = JSON.stringify({
      host: 'www.aquiz.eu',
      key: INDEXNOW_KEY,
      keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    })

    const response = await fetch(engine.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
    })

    console.log(`${engine.name}: ${response.status} ${response.statusText}`)
  } catch (error) {
    console.error(`${engine.name}: ERREUR — ${error.message}`)
  }
}

console.log(`\n✅ IndexNow ping terminé pour ${urls.length} URLs`)
