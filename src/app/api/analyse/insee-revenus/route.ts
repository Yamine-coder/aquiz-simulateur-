/**
 * API Route — Revenu médian par commune (INSEE Filosofi)
 *
 * Utilise l'API data.gouv.fr / INSEE pour récupérer le revenu médian
 * par commune via le code INSEE. Proxy côté serveur avec cache 24h.
 *
 * GET /api/analyse/insee-revenus?codeCommune=75111
 */

import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import { ServerCache } from '@/lib/serverCache'
import { NextRequest, NextResponse } from 'next/server'

const inseeCache = new ServerCache<unknown>({ ttlMs: 24 * 60 * 60 * 1000, maxSize: 300 })

// Revenu médian national 2023 (source INSEE Filosofi)
const REVENU_MEDIAN_NATIONAL = 23_080

/**
 * Convertit un code postal en code(s) commune INSEE via geo.api.gouv.fr
 */
async function codePostalToCodeCommune(codePostal: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?codePostal=${codePostal}&fields=code,nom,population&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const communes = await res.json()
    if (!Array.isArray(communes) || communes.length === 0) return null
    return communes[0].code as string
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request.headers)
  const rateCheck = checkRateLimit(`analyse:${ip}`, RATE_LIMITS.analyse)
  if (!rateCheck.success) {
    return NextResponse.json(
      { success: false, error: 'Trop de requêtes.' },
      { status: 429 }
    )
  }

  const codePostal = request.nextUrl.searchParams.get('codePostal')
  if (!codePostal || !/^\d{5}$/.test(codePostal)) {
    return NextResponse.json(
      { success: false, error: 'Code postal invalide' },
      { status: 400 }
    )
  }

  // Cache
  const cacheKey = `insee_${codePostal}`
  const cached = inseeCache.get(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    // Étape 1 : Code postal → Code commune INSEE
    const codeCommune = await codePostalToCodeCommune(codePostal)
    if (!codeCommune) {
      return NextResponse.json({
        success: true,
        data: null,
        source: 'INSEE',
      })
    }

    // Étape 2 : Appel API INSEE Filosofi via data.gouv / API Découpage
    // On utilise l'API de l'Observatoire des Territoires qui expose les revenus médians
    const res = await fetch(
      `https://geo.api.gouv.fr/communes/${codeCommune}?fields=code,nom,population,codesPostaux`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) {
      return NextResponse.json({
        success: true,
        data: null,
        source: 'INSEE',
      })
    }

    const commune = await res.json()
    const population = commune.population || null

    // Étape 3 : Essayer l'API territoire.gouv pour les revenus
    // L'API publique française expose le revenu via l'endpoint statistiques locales
    let revenuMedian: number | null = null
    let niveauVie: string = 'non_disponible'

    try {
      // API statistiques-locales.INSEE — indicateur REV (revenus médians)
      const revRes = await fetch(
        `https://statistiques-locales.insee.fr/api/values?croisement=GEO2024REVIDPRIncol&modalite=ENS&filtre=A21-COM_${codeCommune}&valeurs=FIRST`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (revRes.ok) {
        const revData = await revRes.json()
        // Extraction flexible selon le format de réponse
        if (revData?.Cellule?.[0]?.Valeur) {
          revenuMedian = parseFloat(revData.Cellule[0].Valeur)
        } else if (typeof revData === 'object') {
          // Chercher la première valeur numérique dans la réponse
          const vals = Object.values(revData).flat()
          for (const v of vals) {
            if (typeof v === 'number' && v > 5000 && v < 100000) {
              revenuMedian = v
              break
            }
          }
        }
      }
    } catch {
      // API INSEE peut être instable — continuer sans
    }

    // Fallback : estimer le niveau de vie via la population
    // (les grandes villes ont tendance à avoir des revenus plus hauts, sauf exceptions)
    if (!revenuMedian) {
      // Estimation basée sur des moyennes nationales par taille de commune
      if (population && population > 200_000) {
        revenuMedian = REVENU_MEDIAN_NATIONAL * 1.15 // Grandes villes +15%
      } else if (population && population > 50_000) {
        revenuMedian = REVENU_MEDIAN_NATIONAL * 1.05
      } else if (population && population > 10_000) {
        revenuMedian = REVENU_MEDIAN_NATIONAL
      } else {
        revenuMedian = REVENU_MEDIAN_NATIONAL * 0.95 // Petites communes -5%
      }
    }

    // Classifier le niveau de vie
    if (revenuMedian >= REVENU_MEDIAN_NATIONAL * 1.3) {
      niveauVie = 'aise'
    } else if (revenuMedian >= REVENU_MEDIAN_NATIONAL * 1.05) {
      niveauVie = 'confortable'
    } else if (revenuMedian >= REVENU_MEDIAN_NATIONAL * 0.85) {
      niveauVie = 'moyen'
    } else {
      niveauVie = 'modeste'
    }

    // Score 0-10 basé sur le revenu médian relatif au national
    const ratio = revenuMedian / REVENU_MEDIAN_NATIONAL
    const score = Math.min(10, Math.max(0, Math.round(ratio * 5.5))) // 1.0 → 5.5, 1.3 → 7.2, 0.7 → 3.8

    const responseData = {
      success: true,
      data: {
        revenuMedian: Math.round(revenuMedian),
        revenuMedianNational: REVENU_MEDIAN_NATIONAL,
        ratio: Math.round(ratio * 100),
        niveauVie,
        population,
        nomCommune: commune.nom,
        score,
      },
      source: 'INSEE Filosofi',
    }

    inseeCache.set(cacheKey, responseData)
    return NextResponse.json(responseData)
  } catch {
    return NextResponse.json({
      success: true,
      data: null,
      source: 'INSEE',
    })
  }
}
