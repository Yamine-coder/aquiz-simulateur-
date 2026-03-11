/**
 * API Route légère pour récupérer l'og:image d'une URL
 * POST /api/annonces/og-image
 * 
 * Ne télécharge que les 50 premiers KB du HTML (juste le <head>)
 * pour extraire og:image / twitter:image / JSON-LD image.
 * 
 * Beaucoup plus léger que /api/annonces/extract — pas de parsing complet.
 */

import { NextRequest, NextResponse } from 'next/server'

// User agents pour éviter les blocages basiques
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
]

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requise' }, { status: 400 })
    }

    // ── LeBonCoin : utiliser leur API interne (images pleine résolution) ──
    if (url.includes('leboncoin.fr')) {
      const lbcImages = await tryLeBonCoinImages(url)
      if (lbcImages) {
        return NextResponse.json(lbcImages)
      }
    }

    // ── Autres portails : Fetch léger du <head> ──
    // 150KB pour couvrir les sites Next.js/SPA où __NEXT_DATA__ est plus loin
    const response = await fetch(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': new URL(url).origin + '/',
        'Range': 'bytes=0-153600',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })

    // Si le serveur refuse le Range (416) ou renvoie une erreur, retenter sans Range
    let html: string
    if (response.status === 416) {
      const retryResponse = await fetch(url, {
        headers: {
          'User-Agent': randomUA(),
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          'Referer': new URL(url).origin + '/',
        },
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      })
      if (!retryResponse.ok) return NextResponse.json({ imageUrl: null })
      html = await retryResponse.text()
    } else if (!response.ok && response.status !== 206) {
      return NextResponse.json({ imageUrl: null })
    } else {
      html = await response.text()
    }

    // Chercher l'image dans le <head> — ordre de priorité
    const patterns: RegExp[] = [
      // og:image (le plus fiable)
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
      // twitter:image
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
      // JSON-LD image (SeLoger, LeBonCoin, etc.)
      /"image"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
      /"image"\s*:\s*\[\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
      // JSON-LD photos array
      /"photo"\s*:\s*\[\s*\{[^}]*"contentUrl"\s*:\s*"(https?:\/\/[^"]+)"/i,
    ]

    // Toutes les images trouvées
    const images: string[] = []

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match?.[1] && match[1].startsWith('http')) {
        const imgUrl = match[1].trim()
        if (!images.includes(imgUrl)) {
          images.push(imgUrl)
        }
      }
    }

    // Chercher toutes les images JSON-LD (array)
    const jsonLdImagesMatch = html.match(/"image"\s*:\s*\[([\s\S]*?)\]/i)
    if (jsonLdImagesMatch) {
      const urlRegex = /"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
      let m: RegExpExecArray | null
      while ((m = urlRegex.exec(jsonLdImagesMatch[1])) !== null) {
        if (!images.includes(m[1])) {
          images.push(m[1])
          if (images.length >= 20) break
        }
      }
    }

    // Chercher les photos dans les JSON-LD photos array  
    const photosArrayMatch = html.match(/"photos?"\s*:\s*\[([\s\S]*?)\]/gi)
    if (photosArrayMatch) {
      for (const block of photosArrayMatch) {
        const urlRegex = /"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
        let m: RegExpExecArray | null
        while ((m = urlRegex.exec(block)) !== null) {
          if (!images.includes(m[1])) {
            images.push(m[1])
            if (images.length >= 20) break
          }
        }
      }
    }

    // ── __NEXT_DATA__ : sites Next.js (LaForêt, SeLoger neuf, etc.) ──
    // Le JSON __NEXT_DATA__ contient souvent la galerie complète d'images
    if (images.length < 3) {
      const nextDataMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
      if (nextDataMatch?.[1]) {
        try {
          // Extraire toutes les URLs d'images du JSON __NEXT_DATA__
          const imgUrlRegex = /"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"/gi
          let m: RegExpExecArray | null
          while ((m = imgUrlRegex.exec(nextDataMatch[1])) !== null) {
            let imgUrl = m[1]
            // Ignorer les URLs de tracking/pixel/logo
            if (/logo|icon|avatar|sprite|pixel|tracking|badge|button|loader|spinner/i.test(imgUrl)) continue
            // Décoder les URLs Next.js /_next/image?url=ENCODED
            if (imgUrl.includes('/_next/image')) {
              try {
                const parsed = new URL(imgUrl)
                const orig = parsed.searchParams.get('url')
                if (orig?.startsWith('http')) imgUrl = orig
              } catch { /* ignorer */ }
            }
            if (!images.includes(imgUrl)) {
              images.push(imgUrl)
              if (images.length >= 20) break
            }
          }
        } catch { /* JSON parse error — silencieux */ }
      }
    }

    // ── Fallback pour Next.js : chercher les URLs media CDN dans tout le HTML ──
    // LaForêt utilise media.laforet.com, Century21 utilise cdn.century21.fr, etc.
    if (images.length < 2) {
      const cdnPatterns = /https?:\/\/(?:media\.laforet\.com|cdn\.century21\.fr|photos\.orpi\.com|img\.[a-z-]+\.com|photos\.iadfrance\.fr|media[0-9]*\.[a-z-]+\.(?:com|fr))\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi
      let cdnMatch: RegExpExecArray | null
      while ((cdnMatch = cdnPatterns.exec(html)) !== null) {
        const cdnUrl = cdnMatch[0]
        if (!images.includes(cdnUrl)) {
          images.push(cdnUrl)
          if (images.length >= 20) break
        }
      }
    }

    // Dédupliquer et décoder les URLs /_next/image restantes
    const cleanImages = [...new Set(images.map(u => {
      if (u.includes('/_next/image')) {
        try {
          const parsed = new URL(u)
          const orig = parsed.searchParams.get('url')
          if (orig?.startsWith('http')) return orig
        } catch { /* ignorer */ }
      }
      return u
    }))]

    return NextResponse.json({
      imageUrl: cleanImages[0] || null,
      images: cleanImages.length > 1 ? cleanImages : undefined,
    })
  } catch {
    return NextResponse.json({ imageUrl: null })
  }
}

/**
 * Récupère les images pleine résolution depuis l'API interne LeBonCoin.
 * L'API retourne les URLs en qualité originale (pas de thumbnails).
 */
async function tryLeBonCoinImages(url: string): Promise<{ imageUrl: string; images?: string[] } | null> {
  try {
    // Extraire l'ID de l'annonce depuis l'URL
    const idMatch = url.match(/\/(\d{8,12})(?:[/?#]|$)/) || url.match(/\/(\d{8,12})/)
    if (!idMatch) return null

    const adId = idMatch[1]
    const ogLbcHeaders: Record<string, string> = {
        'User-Agent': randomUA(),
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': 'https://www.leboncoin.fr/',
        'Origin': 'https://www.leboncoin.fr',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
    }
    if (process.env.LEBONCOIN_API_KEY) ogLbcHeaders['api_key'] = process.env.LEBONCOIN_API_KEY
    const response = await fetch(`https://api.leboncoin.fr/finder/classified/${adId}`, {
      headers: ogLbcHeaders,
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return null

    const json = await response.json() as Record<string, unknown>
    if (!json.list_id && !json.subject) return null

    const imgData = json.images as Record<string, unknown> | undefined
    if (imgData) {
      const urls = (imgData.urls as string[]) || []
      if (urls.length > 0) {
        return {
          imageUrl: urls[0],
          images: urls.length > 1 ? urls.slice(0, 20) : undefined,
        }
      }
      // Fallback: small_url, thumb_url
      const smallUrls = (imgData.urls_large as string[]) || (imgData.urls_thumb as string[]) || []
      if (smallUrls.length > 0) {
        return { imageUrl: smallUrls[0] }
      }
    }

    return null
  } catch {
    return null
  }
}
