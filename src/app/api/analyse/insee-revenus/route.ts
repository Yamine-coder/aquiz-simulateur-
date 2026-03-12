/**
 * API Route — Revenu médian par commune (INSEE Filosofi)
 *
 * Source primaire : fichier JSON statique extrait de Filosofi 2019 (DISP Q219)
 * contenant le revenu disponible médian annuel par UC pour ~31 000 communes.
 * Fallback : estimation par département.
 *
 * GET /api/analyse/insee-revenus?codePostal=92700
 */

import revenusCommunes from '@/data/revenus-communes.json'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import { ServerCache } from '@/lib/serverCache'
import { NextRequest, NextResponse } from 'next/server'

const inseeCache = new ServerCache<unknown>({ ttlMs: 24 * 60 * 60 * 1000, maxSize: 300 })

/** Revenu médian national annuel (source INSEE Filosofi 2019) */
const REVENU_MEDIAN_NATIONAL = 22_040

/** Lookup statique : code INSEE → revenu médian annuel */
const REVENUS: Record<string, number> = revenusCommunes as Record<string, number>

/**
 * Revenus médians annuels par département (fallback pour communes absentes)
 */
const REVENU_MEDIAN_PAR_DEPT: Record<string, number> = {
  '75': 27_480, '77': 24_520, '78': 29_660, '91': 25_960, '92': 30_420,
  '93': 18_650, '94': 25_830, '95': 24_230,
  '13': 21_400, '31': 23_200, '33': 22_700, '34': 21_100, '38': 24_500,
  '44': 23_800, '59': 21_200, '67': 24_000, '69': 25_200, '06': 24_800,
  '83': 22_600,
  '01': 26_200, '02': 20_200, '03': 20_800, '04': 21_900, '05': 22_400,
  '07': 22_000, '08': 20_100, '09': 20_500, '10': 21_300, '11': 20_300,
  '12': 21_400, '14': 22_200, '15': 21_000, '16': 21_100, '17': 21_800,
  '18': 20_800, '19': 21_000, '21': 22_800, '22': 21_600, '23': 19_800,
  '24': 20_600, '25': 23_200, '26': 22_100, '27': 22_800, '28': 23_000,
  '29': 22_000, '30': 20_900, '32': 20_800, '35': 23_200, '36': 20_200,
  '37': 22_600, '39': 22_600, '40': 21_800, '41': 21_800, '42': 22_200,
  '43': 21_200, '45': 22_800, '46': 21_000, '47': 20_400, '48': 20_400,
  '49': 22_400, '50': 21_200, '51': 22_400, '52': 20_200, '53': 21_800,
  '54': 22_200, '55': 20_400, '56': 22_000, '57': 22_000, '58': 19_800,
  '60': 23_200, '61': 20_600, '62': 20_200, '63': 22_000, '64': 22_400,
  '65': 20_800, '66': 20_200, '68': 23_600, '70': 21_200, '71': 21_400,
  '72': 21_400, '73': 24_600, '74': 28_000, '76': 21_800, '79': 21_200,
  '80': 20_800, '81': 20_600, '82': 20_200, '84': 20_800, '85': 22_200,
  '86': 21_400, '87': 21_000, '88': 21_000, '89': 21_200, '90': 22_600,
  '971': 16_800, '972': 17_200, '973': 11_500, '974': 17_600, '976': 3_900,
}

/**
 * Convertit un code postal en code commune INSEE + nom + population
 */
async function codePostalToCommune(codePostal: string): Promise<{ code: string; nom: string; population: number | null } | null> {
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?codePostal=${codePostal}&fields=code,nom,population&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const communes = await res.json()
    if (!Array.isArray(communes) || communes.length === 0) return null
    return {
      code: communes[0].code as string,
      nom: communes[0].nom as string,
      population: communes[0].population ?? null,
    }
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

  const cacheKey = `insee_${codePostal}`
  const cached = inseeCache.get(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    const commune = await codePostalToCommune(codePostal)
    if (!commune) {
      return NextResponse.json({ success: true, data: null, source: 'INSEE' })
    }

    const { code: codeCommune, nom: nomCommune, population } = commune

    // Source primaire : lookup Filosofi local (31 000+ communes)
    let revenuMedian: number | null = REVENUS[codeCommune] ?? null

    // Fallback : estimation départementale
    if (!revenuMedian) {
      const dept = codeCommune.startsWith('97') ? codeCommune.slice(0, 3) : codeCommune.slice(0, 2)
      revenuMedian = REVENU_MEDIAN_PAR_DEPT[dept] ?? REVENU_MEDIAN_NATIONAL
    }

    // Classifier le niveau de vie
    let niveauVie: string
    if (revenuMedian >= REVENU_MEDIAN_NATIONAL * 1.3) {
      niveauVie = 'aise'
    } else if (revenuMedian >= REVENU_MEDIAN_NATIONAL * 1.05) {
      niveauVie = 'confortable'
    } else if (revenuMedian >= REVENU_MEDIAN_NATIONAL * 0.85) {
      niveauVie = 'moyen'
    } else {
      niveauVie = 'modeste'
    }

    const ratio = revenuMedian / REVENU_MEDIAN_NATIONAL
    const score = Math.min(10, Math.max(0, Math.round(5 + (ratio - 1) * 16)))

    const responseData = {
      success: true,
      data: {
        revenuMedian: Math.round(revenuMedian),
        revenuMedianNational: REVENU_MEDIAN_NATIONAL,
        ratio: Math.round(ratio * 100),
        niveauVie,
        population,
        nomCommune,
        score,
      },
      source: REVENUS[codeCommune] ? 'INSEE Filosofi 2019' : 'Estimation départementale',
    }

    inseeCache.set(cacheKey, responseData)
    return NextResponse.json(responseData)
  } catch {
    return NextResponse.json({ success: true, data: null, source: 'INSEE' })
  }
}
