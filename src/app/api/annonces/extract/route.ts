/**
 * API Route pour extraire les données d'une annonce depuis son URL
 * POST /api/annonces/extract
 * 
 * Stratégie multi-niveaux (du plus fiable au moins fiable) :
 * 1. Jina AI Reader (gratuit, illimité) → texte propre
 * 2. Firecrawl (gratuit, 500 req/mois) → markdown structuré
 * 3. Fetch direct (fallback) → HTML brut, souvent bloqué
 */

import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import {
    detecterSource,
    parseAnnonceHTML,
    parseMetaTags
} from '@/lib/scraping/extracteur'
import { compterChampsExtraits, parseTexteAnnonce } from '@/lib/scraping/parseTexteAnnonce'
import { NextRequest, NextResponse } from 'next/server'

/** Seuil minimum de champs extraits pour considérer l'extraction réussie */
const MIN_FIELDS = 2

/** Résultat d'extraction structuré (avant conversion en NextResponse) */
interface ExtractionResponse {
  success: true
  source: string
  data: Record<string, unknown>
  fieldsExtracted?: number
  method: string
  message: string
}

/**
 * Stratégie d'extraction en 3 étapes :
 * 1. Jina AI Reader (r.jina.ai) → texte propre, gratuit illimité
 * 2. Firecrawl (api.firecrawl.dev) → markdown structuré, 500/mois gratuit
 * 3. Fetch direct (fallback) → HTML brut, peut être bloqué
 */
export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ─────────────────────────────────────
    const ip = getClientIP(request.headers)
    const rateCheck = checkRateLimit(`extract:${ip}`, RATE_LIMITS.extract)
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Trop de requêtes d\'extraction. Veuillez patienter.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      )
    }

    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL requise' },
        { status: 400 }
      )
    }
    
    // Valider l'URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, error: 'URL invalide' },
        { status: 400 }
      )
    }

    // ── Protection SSRF : bloquer les URL internes ──────
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']
    const blockedPrefixes = ['10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.', '169.254.']
    const hostname = parsedUrl.hostname.toLowerCase()
    if (
      parsedUrl.protocol !== 'https:' ||
      blockedHosts.includes(hostname) ||
      blockedPrefixes.some(p => hostname.startsWith(p)) ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return NextResponse.json(
        { success: false, error: 'URL non autorisée' },
        { status: 400 }
      )
    }
    
    // Détecter la source
    const source = detecterSource(url)
    
    // ===== STRATÉGIE 1 : Jina AI Reader (gratuit, illimité) =====
    let extractionResult = await tryJinaReader(url, source)
    
    // ===== STRATÉGIE 2 : Firecrawl (gratuit, 500 req/mois, plus robuste) =====
    if (!extractionResult) {
      extractionResult = await tryFirecrawl(url, source)
    }
    
    // ===== STRATÉGIE 3 : Fetch direct (fallback, souvent bloqué) =====
    if (!extractionResult) {
      extractionResult = await tryDirectFetch(url, source)
    }
    
    // ===== TOUT A ÉCHOUÉ =====
    if (!extractionResult) {
      return NextResponse.json({
        success: false,
        error: 'Impossible de récupérer les données de cette annonce.',
        hint: 'Utilisez l\'onglet "Coller le contenu" : copiez le texte de la page (Ctrl+A → Ctrl+C) puis collez-le.'
      }, { status: 502 })
    }
    
    // ===== ENRICHIR AVEC IMAGE SI MANQUANTE =====
    if (!extractionResult.data.imageUrl) {
      const imageUrl = await fetchOgImage(url)
      if (imageUrl) {
        extractionResult.data.imageUrl = imageUrl
      }
    }
    
    return NextResponse.json(extractionResult)
    
  } catch (error) {
    console.error('Erreur extraction annonce:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de l\'extraction' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────
// Stratégie 1 : Jina AI Reader (JSON mode pour récupérer image + texte)
// ─────────────────────────────────────
async function tryJinaReader(url: string, source: string | null): Promise<ExtractionResponse | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'json',
      },
      signal: AbortSignal.timeout(15000),
    })
    
    if (!response.ok) return null
    
    const json = await response.json()
    const texte = json?.data?.content || json?.data?.text || ''
    if (!texte || texte.length < 100) return null
    
    const data = parseTexteAnnonce(texte)
    const count = compterChampsExtraits(data)
    if (count < MIN_FIELDS) return null
    
    const dataRecord = data as unknown as Record<string, unknown>
    completerDonnees(dataRecord)
    
    // --- Récupération de l'image ---
    // 1. Image depuis Jina (premier élément d'images ou og:image)
    if (!dataRecord.imageUrl) {
      const jinaImage = json?.data?.images?.[0]?.src 
        || json?.data?.images?.[0]?.url
        || json?.data?.images?.[0]
      if (typeof jinaImage === 'string' && jinaImage.startsWith('http')) {
        dataRecord.imageUrl = jinaImage
      }
    }
    // 2. Titre depuis Jina si manquant
    if (!dataRecord.titre && json?.data?.title) {
      dataRecord.titre = (json.data.title as string).substring(0, 200)
    }
    // 3. Description depuis Jina si manquante
    if (!dataRecord.description && json?.data?.description) {
      const desc = json.data.description as string
      if (desc.length >= 30) {
        dataRecord.description = desc.substring(0, 1000)
      }
    }
    // 4. og:image depuis la description Jina (certaines réponses l'incluent)
    if (!dataRecord.imageUrl && json?.data?.description) {
      const ogMatch = (json.data.description as string).match(/!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)[^\s)]*)\)/i)
      if (ogMatch) {
        dataRecord.imageUrl = ogMatch[1]
      }
    }
    
    return {
      success: true,
      source: source || 'web',
      data: { url, ...dataRecord },
      fieldsExtracted: count,
      method: 'jina-reader',
      message: `${count} données extraites depuis ${source || 'la page'}`
    }
  } catch (err) {
    console.warn('Jina Reader échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie 2 : Firecrawl
// ─────────────────────────────────────
async function tryFirecrawl(url: string, source: string | null): Promise<ExtractionResponse | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return null // Pas configuré, on skip
  
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'metadata'],
        onlyMainContent: true,
        timeout: 15000,
      }),
      signal: AbortSignal.timeout(20000),
    })
    
    if (!response.ok) {
      console.warn('Firecrawl HTTP error:', response.status)
      return null
    }
    
    const result = await response.json()
    
    if (!result.success || !result.data?.markdown) return null
    
    const texte = result.data.markdown as string
    if (texte.length < 50) return null
    
    const data = parseTexteAnnonce(texte)
    const count = compterChampsExtraits(data)
    if (count < MIN_FIELDS) return null
    
    const dataRecord = data as unknown as Record<string, unknown>
    completerDonnees(dataRecord)
    
    // --- Récupération de l'image via métadonnées Firecrawl ---
    if (!dataRecord.imageUrl) {
      const metadata = result.data.metadata
      const ogImage = metadata?.ogImage || metadata?.['og:image'] || metadata?.image
      if (typeof ogImage === 'string' && ogImage.startsWith('http')) {
        dataRecord.imageUrl = ogImage
      }
    }
    // Titre depuis métadonnées Firecrawl si manquant
    if (!dataRecord.titre) {
      const metadata = result.data.metadata
      const ogTitle = metadata?.ogTitle || metadata?.['og:title'] || metadata?.title
      if (typeof ogTitle === 'string') {
        dataRecord.titre = ogTitle.substring(0, 200)
      }
    }
    // Extraire image depuis le markdown (pattern ![alt](url))
    if (!dataRecord.imageUrl) {
      const imgMatch = texte.match(/!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)[^\s)]*)\)/i)
      if (imgMatch) {
        dataRecord.imageUrl = imgMatch[1]
      }
    }
    
    return {
      success: true,
      source: source || 'web',
      data: { url, ...dataRecord },
      fieldsExtracted: count,
      method: 'firecrawl',
      message: `${count} données extraites depuis ${source || 'la page'}`
    }
  } catch (err) {
    console.warn('Firecrawl échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie 3 : Fetch direct
// ─────────────────────────────────────
async function tryDirectFetch(url: string, source: string | null): Promise<ExtractionResponse | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(10000),
    })
    
    if (!response.ok) return null
    
    const html = await response.text()
    const dataFromHTML = parseAnnonceHTML(html, url)
    const dataFromMeta = parseMetaTags(html)
    
    const data = { url, ...dataFromMeta, ...dataFromHTML }
    
    if (!data.prix && !data.surface) return null
    
    completerDonnees(data)
    
    return {
      success: true,
      source: source || 'web',
      data,
      method: 'direct-fetch',
      message: `Données extraites depuis ${source || 'la page'}`
    }
  } catch (err) {
    console.warn('Fetch direct échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Helpers
// ─────────────────────────────────────

/** Complète les champs manquants avec des estimations raisonnables */
function completerDonnees(data: Record<string, unknown>) {
  if (!data.pieces && data.surface) {
    data.pieces = Math.max(1, Math.round((data.surface as number) / 22))
  }
  if (!data.chambres && data.pieces) {
    data.chambres = Math.max(0, (data.pieces as number) - 1)
  }
  if (!data.dpe) {
    data.dpe = 'NC'
  }
  if (!data.type) {
    data.type = 'appartement'
  }
  // Déduire le département depuis le code postal
  if (data.codePostal && !data.departement) {
    const cp = data.codePostal as string
    if (cp.startsWith('97')) {
      data.departement = cp.substring(0, 3) // DOM-TOM
    } else if (cp.startsWith('20')) {
      // Corse : 20000-20190 = 2A, 20200+ = 2B
      const num = parseInt(cp)
      data.departement = num < 20200 ? '2A' : '2B'
    } else {
      data.departement = cp.substring(0, 2)
    }
  }
}

/**
 * Fallback : fetch léger de la page originale pour extraire og:image
 * Ne récupère que le <head> (premiers 50KB) pour limiter la bande passante
 */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AQUIZBot/1.0)',
        'Accept': 'text/html',
        'Range': 'bytes=0-51200', // Ne lire que les 50 premiers KB (contient le <head>)
      },
      signal: AbortSignal.timeout(5000),
    })
    
    if (!response.ok && response.status !== 206) return null
    
    const html = await response.text()
    
    // Chercher og:image dans le <head>
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
      /"image(?:Url)?"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
    ]
    
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1].startsWith('http')) {
        return match[1]
      }
    }
    
    return null
  } catch {
    return null
  }
}
