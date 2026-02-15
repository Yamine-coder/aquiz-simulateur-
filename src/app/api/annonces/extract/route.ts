/**
 * API Route pour extraire les données d'une annonce depuis son URL
 * POST /api/annonces/extract
 * 
 * Stratégie multi-niveaux (du plus fiable au moins fiable) :
 * 1. Jina AI Reader (gratuit, illimité) → texte propre
 * 2. Firecrawl (gratuit, 500 req/mois) → markdown structuré
 * 3. Fetch direct (fallback) → HTML brut, souvent bloqué
 */

import {
    detecterSource,
    parseAnnonceHTML,
    parseMetaTags
} from '@/lib/scraping/extracteur'
import { compterChampsExtraits, parseTexteAnnonce } from '@/lib/scraping/parseTexteAnnonce'
import { NextRequest, NextResponse } from 'next/server'

/** Seuil minimum de champs extraits pour considérer l'extraction réussie */
const MIN_FIELDS = 2

/**
 * Stratégie d'extraction en 3 étapes :
 * 1. Jina AI Reader (r.jina.ai) → texte propre, gratuit illimité
 * 2. Firecrawl (api.firecrawl.dev) → markdown structuré, 500/mois gratuit
 * 3. Fetch direct (fallback) → HTML brut, peut être bloqué
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL requise' },
        { status: 400 }
      )
    }
    
    // Valider l'URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, error: 'URL invalide' },
        { status: 400 }
      )
    }
    
    // Détecter la source
    const source = detecterSource(url)
    
    // ===== STRATÉGIE 1 : Jina AI Reader (gratuit, illimité) =====
    const jinaResult = await tryJinaReader(url, source)
    if (jinaResult) return jinaResult
    
    // ===== STRATÉGIE 2 : Firecrawl (gratuit, 500 req/mois, plus robuste) =====
    const firecrawlResult = await tryFirecrawl(url, source)
    if (firecrawlResult) return firecrawlResult
    
    // ===== STRATÉGIE 3 : Fetch direct (fallback, souvent bloqué) =====
    const directResult = await tryDirectFetch(url, source)
    if (directResult) return directResult
    
    // ===== TOUT A ÉCHOUÉ =====
    return NextResponse.json({
      success: false,
      error: 'Impossible de récupérer les données de cette annonce.',
      hint: 'Utilisez l\'onglet "Coller le contenu" : copiez le texte de la page (Ctrl+A → Ctrl+C) puis collez-le.'
    }, { status: 502 })
    
  } catch (error) {
    console.error('Erreur extraction annonce:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de l\'extraction' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────
// Stratégie 1 : Jina AI Reader
// ─────────────────────────────────────
async function tryJinaReader(url: string, source: string | null): Promise<NextResponse | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text',
      },
      signal: AbortSignal.timeout(15000),
    })
    
    if (!response.ok) return null
    
    const texte = await response.text()
    if (!texte || texte.length < 100) return null
    
    const data = parseTexteAnnonce(texte)
    const count = compterChampsExtraits(data)
    if (count < MIN_FIELDS) return null
    
    const dataRecord = data as unknown as Record<string, unknown>
    completerDonnees(dataRecord)
    
    return NextResponse.json({
      success: true,
      source: source || 'web',
      data: { url, ...dataRecord },
      fieldsExtracted: count,
      method: 'jina-reader',
      message: `${count} données extraites depuis ${source || 'la page'}`
    })
  } catch (err) {
    console.warn('Jina Reader échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie 2 : Firecrawl
// ─────────────────────────────────────
async function tryFirecrawl(url: string, source: string | null): Promise<NextResponse | null> {
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
        formats: ['markdown'],
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
    
    return NextResponse.json({
      success: true,
      source: source || 'web',
      data: { url, ...dataRecord },
      fieldsExtracted: count,
      method: 'firecrawl',
      message: `${count} données extraites depuis ${source || 'la page'}`
    })
  } catch (err) {
    console.warn('Firecrawl échoué:', err)
    return null
  }
}

// ─────────────────────────────────────
// Stratégie 3 : Fetch direct
// ─────────────────────────────────────
async function tryDirectFetch(url: string, source: string | null): Promise<NextResponse | null> {
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
    
    return NextResponse.json({
      success: true,
      source: source || 'web',
      data,
      method: 'direct-fetch',
      message: `Données extraites depuis ${source || 'la page'}`
    })
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
}
