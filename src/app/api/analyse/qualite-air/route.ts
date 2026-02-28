/**
 * API Route — Qualité de l'air (indice ATMO)
 *
 * Utilise l'API ATMO France / données ouvertes pour récupérer
 * l'indice de qualité de l'air le plus récent pour une commune.
 *
 * GET /api/analyse/qualite-air?lat=48.856&lon=2.352
 */

import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import { ServerCache } from '@/lib/serverCache'
import { NextRequest, NextResponse } from 'next/server'

interface AtmoData {
  indice: number // 1 (Bon) à 6 (Extrêmement mauvais)
  label: string
  couleur: string
  date: string
  source: string
}

const atmoCache = new ServerCache<unknown>({ ttlMs: 6 * 60 * 60 * 1000, maxSize: 200 })

// Labels ATMO officiels
const ATMO_LABELS: Record<number, { label: string; couleur: string }> = {
  1: { label: 'Bon', couleur: '#50F0E6' },
  2: { label: 'Moyen', couleur: '#50CCAA' },
  3: { label: 'Dégradé', couleur: '#F0E641' },
  4: { label: 'Mauvais', couleur: '#FF5050' },
  5: { label: 'Très mauvais', couleur: '#960032' },
  6: { label: 'Extrêmement mauvais', couleur: '#7D2181' },
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

  const lat = request.nextUrl.searchParams.get('lat')
  const lon = request.nextUrl.searchParams.get('lon')

  if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
    return NextResponse.json(
      { success: false, error: 'Coordonnées invalides' },
      { status: 400 }
    )
  }

  const latNum = Number(lat)
  const lonNum = Number(lon)

  // Arrondir pour le cache (précision ~1km)
  const cacheKey = `atmo_${latNum.toFixed(2)}_${lonNum.toFixed(2)}`
  const cached = atmoCache.get(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    // Tenter l'API ATMO Data (data.gouv.fr — LCSQA)
    // https://data.lcsqa.fr — API Prévisions ATMO
    let atmoData: AtmoData | null = null

    // Méthode 1 : API ATMO nationale via geo.api.gouv.fr → code INSEE → API ATMO
    try {
      // D'abord trouver la commune
      const geoRes = await fetch(
        `https://geo.api.gouv.fr/communes?lat=${latNum}&lon=${lonNum}&fields=code,nom&limit=1`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (geoRes.ok) {
        const communes = await geoRes.json()
        if (communes.length > 0) {
          const codeInsee = communes[0].code

          // API ATMO France — Indice ATMO par commune 
          // Via API Open Data ATMO (format standardisé national)
          const atmoRes = await fetch(
            `https://services9.arcgis.com/7Sr9Ek9c1QTKmbwr/arcgis/rest/services/mesures_France_metropolitaine_derniere_24h/FeatureServer/0/query?where=code_commune%3D%27${codeInsee}%27&outFields=*&resultRecordCount=1&f=json`,
            { signal: AbortSignal.timeout(8000) }
          )

          if (atmoRes.ok) {
            const data = await atmoRes.json()
            if (data?.features && data.features.length > 0) {
              const attrs = data.features[0].attributes
              // Essayer de parser l'indice
              const indice = attrs?.indice_atmo || attrs?.code_qual
              if (indice && indice >= 1 && indice <= 6) {
                const labels = ATMO_LABELS[indice] || ATMO_LABELS[3]
                atmoData = {
                  indice,
                  label: labels.label,
                  couleur: labels.couleur,
                  date: attrs?.date_ech || new Date().toISOString().split('T')[0],
                  source: 'ATMO France',
                }
              }
            }
          }
        }
      }
    } catch {
      // API ATMO peut échouer — continuer
    }

    // Méthode 2 : Estimation basée sur la densité urbaine (fallback)
    if (!atmoData) {
      try {
        const geoRes = await fetch(
          `https://geo.api.gouv.fr/communes?lat=${latNum}&lon=${lonNum}&fields=code,nom,population,surface&limit=1`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (geoRes.ok) {
          const communes = await geoRes.json()
          if (communes.length > 0) {
            const pop = communes[0].population || 0
            const surface = communes[0].surface ? communes[0].surface / 100 : 50 // hectares → km²
            const densite = pop / Math.max(surface, 1)

            // Estimation : plus la densité est haute, plus l'air est dégradé
            let indice: number
            if (densite > 8000) indice = 4 // Très dense (Paris centre)
            else if (densite > 3000) indice = 3 // Dense (grande ville)
            else if (densite > 1000) indice = 2 // Moyenne (ville moyenne)
            else indice = 1 // Peu dense (rural)

            const labels = ATMO_LABELS[indice]
            atmoData = {
              indice,
              label: labels.label,
              couleur: labels.couleur,
              date: new Date().toISOString().split('T')[0],
              source: 'Estimation (densité urbaine)',
            }
          }
        }
      } catch {
        // Estimation échouée aussi
      }
    }

    // Score 0-10 inversé (1=Bon → score 10, 6=Très mauvais → score 0)
    const score = atmoData ? Math.max(0, Math.round(10 - (atmoData.indice - 1) * 2)) : null

    const responseData = {
      success: true,
      data: atmoData
        ? {
            indice: atmoData.indice,
            label: atmoData.label,
            couleur: atmoData.couleur,
            date: atmoData.date,
            source: atmoData.source,
            score,
          }
        : null,
      source: atmoData?.source || 'ATMO',
    }

    atmoCache.set(cacheKey, responseData)
    return NextResponse.json(responseData)
  } catch {
    return NextResponse.json({
      success: true,
      data: null,
      source: 'ATMO',
    })
  }
}
