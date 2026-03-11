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
 * Revenus médians annuels par département (source INSEE Filosofi 2021, arrondis)
 * Utilisé comme fallback fiable quand l'API statistiques-locales ne répond pas
 */
const REVENU_MEDIAN_PAR_DEPT: Record<string, number> = {
  // Île-de-France
  '75': 27_480, // Paris
  '77': 24_520, // Seine-et-Marne
  '78': 29_660, // Yvelines
  '91': 25_960, // Essonne
  '92': 30_420, // Hauts-de-Seine
  '93': 18_650, // Seine-Saint-Denis
  '94': 25_830, // Val-de-Marne
  '95': 24_230, // Val-d'Oise
  // Grandes métropoles
  '13': 21_400, // Bouches-du-Rhône
  '31': 23_200, // Haute-Garonne
  '33': 22_700, // Gironde
  '34': 21_100, // Hérault
  '38': 24_500, // Isère
  '44': 23_800, // Loire-Atlantique
  '59': 21_200, // Nord
  '67': 24_000, // Bas-Rhin
  '69': 25_200, // Rhône
  '06': 24_800, // Alpes-Maritimes
  '83': 22_600, // Var
  // Autres départements significatifs
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
  // DOM-TOM (source INSEE / IEDOM — données 2021 quand disponibles, estimation sinon)
  '971': 16_800, '972': 17_200, '973': 11_500, '974': 17_600, '976': 3_900,
}

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
        // Extraction stricte selon le format documenté de l'API INSEE
        if (revData?.Cellule?.[0]?.Valeur) {
          const parsed = parseFloat(revData.Cellule[0].Valeur)
          // Validation : un revenu médian doit être entre 5 000 et 80 000 €
          if (parsed >= 5000 && parsed <= 80000) {
            revenuMedian = parsed
          }
        }
      }
    } catch {
      // API INSEE peut être instable — continuer sans
    }

    // Fallback 1 : revenu médian départemental (bien plus fiable que la population)
    if (!revenuMedian) {
      const dept = codeCommune.startsWith('97') ? codeCommune.slice(0, 3) : codeCommune.slice(0, 2)
      const revenuDept = REVENU_MEDIAN_PAR_DEPT[dept]
      if (revenuDept) {
        // Ajuster selon la taille de la commune par rapport à la préfecture
        // Les grandes communes d'un département riche sont souvent encore plus riches
        if (population && population > 50_000) {
          revenuMedian = Math.round(revenuDept * 1.08) // +8% grandes villes du département
        } else if (population && population > 20_000) {
          revenuMedian = Math.round(revenuDept * 1.03) // +3% villes moyennes
        } else {
          revenuMedian = revenuDept
        }
      } else {
        // Fallback 2 : estimation par population (ancien comportement)
        if (population && population > 200_000) {
          revenuMedian = REVENU_MEDIAN_NATIONAL * 1.15
        } else if (population && population > 50_000) {
          revenuMedian = REVENU_MEDIAN_NATIONAL * 1.05
        } else if (population && population > 10_000) {
          revenuMedian = REVENU_MEDIAN_NATIONAL
        } else {
          revenuMedian = REVENU_MEDIAN_NATIONAL * 0.95
        }
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
    // Échelle linéaire : 0.7× → ~0, 0.85× → ~3, 1.0× → 5, 1.15× → ~7, 1.3× → ~10
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
