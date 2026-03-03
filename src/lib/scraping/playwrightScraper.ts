/**
 * Scraping via Playwright + Chrome réel (stealth mode)
 * 
 * Utilise le vrai Chrome installé sur la machine (channel: 'chrome')
 * avec des techniques anti-détection pour bypasser DataDome, Cloudflare, etc.
 * 
 * Avantages :
 * - 100% GRATUIT (pas d'API payante)
 * - Bypass DataDome (SeLoger), Cloudflare, etc.
 * - Exécute le JavaScript (SPA React/Next.js)
 * - IP résidentielle de l'utilisateur
 * 
 * Limitations :
 * - Chrome doit être installé sur la machine
 * - Plus lent (~5-10s) que les API directes
 * - Indisponible sur Vercel serverless (pas de Chrome, binaire trop lourd)
 * - Fonctionne en local + VPS/Docker (Chrome installé)
 */

import {
    getRandomUserAgent,
    isBlockedResponse,
    waitForDomainThrottle,
} from '@/lib/scraping/antiBlock'
import {
    extractFromHTML,
} from '@/lib/scraping/extracteur'

/** Seuil minimum de champs */
const MIN_FIELDS = 2

/** Résultat d'extraction */
interface ExtractionResponse {
  success: true
  source: string
  data: Record<string, unknown>
  fieldsExtracted?: number
  method: string
  message: string
}

/**
 * Vérifie si Playwright + Chrome sont disponibles dans l'environnement actuel.
 * Retourne false sur Vercel serverless (pas de Chrome installé).
 */
function isPlaywrightAvailable(): boolean {
  // Vercel serverless → pas de Chrome
  if (process.env.VERCEL) return false
  // AWS Lambda → pas de Chrome non plus
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return false
  // Netlify Functions
  if (process.env.NETLIFY) return false
  // Variable d'env explicite pour désactiver
  if (process.env.DISABLE_PLAYWRIGHT === 'true') return false
  return true
}

/**
 * Tente d'extraire les données d'une annonce via Playwright + Chrome réel.
 * Fonctionne pour les sites fortement protégés (SeLoger, Logic-Immo, etc.)
 * 
 * - En local / VPS : utilise Playwright + Chrome directement
 * - Sur Vercel : appelle le micro-service distant (aquiz-scraper sur Railway)
 */
export async function tryPlaywrightChrome(
  url: string,
  source: string | null
): Promise<ExtractionResponse | null> {
  // ── Sur Vercel/serverless → appeler le micro-service distant ──
  if (!isPlaywrightAvailable()) {
    return tryRemoteScraper(url, source)
  }
  
  // ── En local / VPS → Playwright direct ──
  return tryLocalPlaywright(url, source)
}

/**
 * Appelle le micro-service scraper distant (Railway/Render)
 * Utilisé quand Playwright n'est pas disponible (Vercel serverless)
 */
async function tryRemoteScraper(
  url: string,
  source: string | null
): Promise<ExtractionResponse | null> {
  const scraperUrl = process.env.SCRAPER_URL
  if (!scraperUrl) return null // Pas de micro-service configuré
  
  const apiKey = process.env.SCRAPER_API_KEY || ''
  
  try {
    const response = await fetch(`${scraperUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(90000), // 90s max (Chrome + warming + rendering)
    })
    
    if (!response.ok) {
      console.warn(`Remote scraper: ${response.status} pour ${source || url}`)
      return null
    }
    
    const result = await response.json() as {
      success: boolean
      source?: string
      data?: Record<string, unknown>
      fieldsExtracted?: number
      method?: string
      message?: string
    }
    
    if (!result.success || !result.data) return null
    
    return {
      success: true,
      source: result.source || source || 'web',
      data: result.data,
      fieldsExtracted: result.fieldsExtracted,
      method: 'remote-chrome-stealth',
      message: result.message || `Données extraites via scraper distant`,
    }
  } catch (err) {
    console.warn('Remote scraper échoué:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Scraping local via Playwright + Chrome réel
 */
async function tryLocalPlaywright(
  url: string,
  source: string | null
): Promise<ExtractionResponse | null> {
  let browser: import('playwright').Browser | null = null
  
  try {
    // Import dynamique pour éviter les erreurs si Playwright n'est pas installé
    const { chromium } = await import('playwright')
    
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome', // Utilise le VRAI Chrome installé (pas Chromium Playwright)
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--lang=fr-FR',
      ],
    })
    
    // Rotation UA + viewport aléatoire pour éviter le fingerprint statique
    const ua = getRandomUserAgent()
    const viewportWidths = [1366, 1440, 1536, 1680, 1920]
    const viewportHeights = [768, 900, 864, 1050, 1080]
    const vpIdx = Math.floor(Math.random() * viewportWidths.length)
    
    const context = await browser.newContext({
      userAgent: ua,
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
      viewport: { width: viewportWidths[vpIdx], height: viewportHeights[vpIdx] },
    })
    
    // ── Scripts anti-détection ──
    await context.addInitScript(() => {
      // Supprimer le flag webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      
      // Simuler Chrome runtime
      // @ts-expect-error - Chrome runtime stub for anti-detection
      window.chrome = {
        runtime: { id: undefined },
        loadTimes: () => ({ commitLoadTime: Date.now() / 1000 }),
        csi: () => ({ startE: Date.now() }),
      }
      
      // Plugins Chrome par défaut
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin' },
          { name: 'Chrome PDF Viewer' },
          { name: 'Native Client' },
        ],
      })
      
      // Langues FR
      Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] })
    })
    
    const page = await context.newPage()
    
    // ── Warming : visiter une page du même site pour construire la session/cookies ──
    // Cela permet de passer les challenges DataDome de SeLoger/Logic-Immo
    const SITES_NEED_WARMING: Record<string, string> = {
      seloger: 'https://www.seloger.com/immobilier/achat/immo-paris-75/',
      'logic-immo': 'https://www.logic-immo.com/vente-immobilier-paris-75,100_1/',
    }
    
    const warmingUrl = source ? SITES_NEED_WARMING[source] : null
    if (warmingUrl) {
      try {
        await page.goto(warmingUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
        // Attendre que les scripts anti-bot s'exécutent et posent les cookies
        await page.waitForTimeout(3000)
      } catch {
        // Le warming a échoué mais on continue quand même
        console.warn('Playwright: warming échoué pour', source)
      }
    }
    
    // ── Navigation vers la page cible (avec throttle par domaine) ──
    await waitForDomainThrottle(url)
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    })
    
    const status = response?.status() ?? 0
    
    // Si 403/captcha, attendre un peu (DataDome peut résoudre le challenge JS)
    if (status === 403) {
      await page.waitForTimeout(5000)
      // Recharger
      const retry = await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 })
      if (retry && retry.status() === 403) {
        console.warn('Playwright Chrome: toujours 403 après retry pour', source || url)
        await browser.close()
        return null
      }
    }
    
    // Attendre le rendu JS (important pour les SPA React/Next.js)
    await page.waitForTimeout(3000)
    
    // ── Vérifier si on a du contenu utile ──
    const html = await page.content()
    
    if (html.length < 1000) {
      console.warn('Playwright Chrome: page trop courte', html.length)
      await browser.close()
      return null
    }
    
    // Détecter captcha/challenge via la détection centralisée
    if (isBlockedResponse(html)) {
      console.warn('Playwright Chrome: blocage détecté pour', source || url)
      await browser.close()
      return null
    }
    
    // 410 Gone = annonce expirée
    if (status === 410) {
      console.warn('Playwright Chrome: annonce expirée (410) pour', url)
      await browser.close()
      return null
    }
    
    // ── Pipeline centralisé d'extraction ──
    const data: Record<string, unknown> = extractFromHTML(html, url)
    
    // ── Extraction DOM avancée (spécifique aux SPA) ──
    try {
      const domData = await page.evaluate(() => {
        const getText = (selectors: string[]): string | null => {
          for (const sel of selectors) {
            const el = document.querySelector(sel)
            if (el?.textContent?.trim()) return el.textContent.trim()
          }
          return null
        }
        
        return {
          title: document.title,
          h1: document.querySelector('h1')?.textContent?.trim()?.substring(0, 300),
          // Extraire prix/surface/pièces du DOM
          priceText: getText([
            '[data-testid*="rice"]', '[data-test*="rice"]',
            '[class*="Price"]', '[class*="price"]', '.price',
          ]),
          surfaceText: getText([
            '[data-testid*="urface"]', '[data-test*="urface"]',
            '[class*="Surface"]', '[class*="surface"]', '.surface',
          ]),
        }
      })
      
      // Extraire depuis le titre de la page (souvent très complet pour SeLoger)
      // Format: "Appartement à vendre T4/F4 86 m² 765000 € Emeriau-Zola Paris (75015)"
      const title = domData.title || domData.h1 || ''
      
      if (title && !data.prix) {
        const titlePrice = title.match(/(\d[\d\s.]+)\s*€/)
        if (titlePrice) {
          const prix = parseFloat(titlePrice[1].replace(/[\s.]/g, ''))
          if (prix >= 10000 && prix <= 50000000) data.prix = prix
        }
      }
      
      if (title && !data.surface) {
        const titleSurf = title.match(/(\d{2,4})\s*m[²2]/)
        if (titleSurf) {
          const surf = parseFloat(titleSurf[1])
          if (surf >= 9 && surf <= 2000) data.surface = surf
        }
      }
      
      // Extraire type + pièces + chambres depuis le h1
      // "Appartement à vendre765000 €4 pièces  •  3 chambres  •  86 m²  •  Étage 2/1Emeriau-Zola, Paris 15ème"
      const h1 = domData.h1 || ''
      if (h1) {
        if (!data.pieces) {
          const piecesMatch = h1.match(/(\d+)\s*pi[eè]ces?/i)
          if (piecesMatch) data.pieces = parseInt(piecesMatch[1])
        }
        if (!data.chambres) {
          const chambresMatch = h1.match(/(\d+)\s*chambres?/i)
          if (chambresMatch) data.chambres = parseInt(chambresMatch[1])
        }
        if (!data.type) {
          if (/appartement/i.test(h1)) data.type = 'appartement'
          else if (/maison|villa|pavillon/i.test(h1)) data.type = 'maison'
        }
        if (!data.etage) {
          const etageMatch = h1.match(/[eé]tage\s*(\d+)/i)
          if (etageMatch) data.etage = parseInt(etageMatch[1])
        }
        
        // Extraire ville/quartier depuis le titre
        if (!data.ville) {
          // "Paris 15ème arrondissement (75015)"
          const villeMatch = title.match(/([A-ZÀ-Ú][a-zà-ú]+(?:\s+\d+[eè](?:me)?)?)\s*\((\d{5})\)/i)
          if (villeMatch) {
            data.ville = villeMatch[1].trim()
            if (!data.codePostal) data.codePostal = villeMatch[2]
          }
        }
      }
      
      // Prix/surface depuis le DOM si toujours manquants
      if (!data.prix && domData.priceText) {
        const pm = domData.priceText.match(/(\d[\d\s.]+)/)
        if (pm) {
          const prix = parseFloat(pm[1].replace(/[\s.]/g, ''))
          if (prix >= 10000 && prix <= 50000000) data.prix = prix
        }
      }
      if (!data.surface && domData.surfaceText) {
        const sm = domData.surfaceText.match(/(\d[\d.,]+)/)
        if (sm) {
          const surf = parseFloat(sm[1].replace(',', '.'))
          if (surf >= 9 && surf <= 2000) data.surface = surf
        }
      }
    } catch {
      // DOM evaluation failed, continue with HTML-parsed data
    }
    
    // ── Extraire images ──
    if (!data.images || (data.images as string[])?.length === 0) {
      try {
        const images = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('img[src]'))
            .map(img => img.getAttribute('src') || '')
            .filter(src => 
              src.startsWith('http') && 
              (src.includes('seloger') || src.includes('ubiflow') || src.includes('avendrealouer')) &&
              !src.includes('logo') && !src.includes('icon') && !src.includes('avatar') &&
              (src.includes('/photo/') || src.includes('/image/') || /\/\d+_\d+/.test(src))
            )
        })
        if (images.length > 0) {
          data.imageUrl = images[0]
          data.images = images.slice(0, 20)
        }
      } catch {
        // Image extraction failed
      }
    }
    
    await browser.close()
    browser = null
    
    // ── Vérifier qu'on a au moins prix ou surface ──
    if (!data.prix && !data.surface) return null
    
    // Compléter les données manquantes
    completerDonnees(data)
    
    const fieldsCount = Object.keys(data).filter(k =>
      k !== 'url' && data[k] !== undefined && data[k] !== null && data[k] !== 'NC'
    ).length
    
    if (fieldsCount < MIN_FIELDS) return null
    
    return {
      success: true,
      source: source || 'web',
      data,
      fieldsExtracted: fieldsCount,
      method: 'chrome-stealth',
      message: `${fieldsCount} données extraites depuis ${source || 'la page'} (Chrome stealth)`
    }
    
  } catch (err) {
    console.warn('Playwright Chrome échoué:', err instanceof Error ? err.message : err)
    return null
  } finally {
    if (browser) {
      try { await browser.close() } catch { /* ignore */ }
    }
  }
}

/** Complète les champs manquants avec des estimations raisonnables */
function completerDonnees(data: Record<string, unknown>) {
  if (!data.pieces && data.surface) {
    data.pieces = Math.max(1, Math.round((data.surface as number) / 22))
  }
  if (!data.chambres && data.pieces) {
    data.chambres = Math.max(0, (data.pieces as number) - 1)
  }
  if (!data.dpe) data.dpe = 'NC'
  if (!data.type) data.type = 'appartement'
  if (data.codePostal && !data.departement) {
    const cp = data.codePostal as string
    if (cp.startsWith('97')) data.departement = cp.substring(0, 3)
    else if (cp.startsWith('20')) {
      const num = parseInt(cp)
      data.departement = num < 20200 ? '2A' : '2B'
    } else {
      data.departement = cp.substring(0, 2)
    }
  }
}
