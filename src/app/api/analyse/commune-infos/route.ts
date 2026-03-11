/**
 * API Route — Informations clés de la commune
 *
 * Agrège les données de geo.api.gouv.fr (population, surface)
 * et des estimations INSEE pour fournir un portrait chiffré de la commune.
 * Ajoute les comptages POI commune-entière via Overpass (OpenStreetMap).
 *
 * GET /api/analyse/commune-infos?codePostal=92700
 */

import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import { ServerCache } from '@/lib/serverCache'
import { NextRequest, NextResponse } from 'next/server'

const communeCache = new ServerCache<unknown>({ ttlMs: 24 * 60 * 60 * 1000, maxSize: 300 })

/** Revenu médian national annuel 2023 (source INSEE Filosofi) */
const REVENU_MEDIAN_NATIONAL = 23_080

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const OVERPASS_FALLBACK = 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'

/**
 * Ensoleillement moyen annuel par département (heures/an)
 * Source : Météo-France moyennes 1991-2020
 */
const ENSOLEILLEMENT_PAR_DEPT: Record<string, number> = {
  '01': 1_820, '02': 1_680, '03': 1_790, '04': 2_700, '05': 2_500,
  '06': 2_724, '07': 2_200, '08': 1_680, '09': 1_980, '10': 1_730,
  '11': 2_200, '12': 2_050, '13': 2_801, '14': 1_710, '15': 1_880,
  '16': 2_020, '17': 2_250, '18': 1_850, '19': 1_900, '20': 2_750,
  '2A': 2_750, '2B': 2_750,
  '21': 1_840, '22': 1_640, '23': 1_850, '24': 2_050, '25': 1_810,
  '26': 2_350, '27': 1_730, '28': 1_780, '29': 1_600, '30': 2_600,
  '31': 2_050, '32': 2_000, '33': 2_100, '34': 2_650, '35': 1_680,
  '36': 1_830, '37': 1_850, '38': 2_050, '39': 1_810, '40': 2_050,
  '41': 1_830, '42': 1_930, '43': 1_980, '44': 1_790, '45': 1_800,
  '46': 2_050, '47': 2_050, '48': 2_200, '49': 1_830, '50': 1_640,
  '51': 1_700, '52': 1_750, '53': 1_730, '54': 1_680, '55': 1_680,
  '56': 1_700, '57': 1_640, '58': 1_830, '59': 1_600, '60': 1_720,
  '61': 1_700, '62': 1_580, '63': 1_900, '64': 1_850, '65': 1_850,
  '66': 2_537, '67': 1_700, '68': 1_750, '69': 1_970, '70': 1_760,
  '71': 1_860, '72': 1_780, '73': 1_980, '74': 1_910, '75': 1_661,
  '76': 1_640, '77': 1_730, '78': 1_700, '79': 2_000, '80': 1_650,
  '81': 2_100, '82': 2_050, '83': 2_850, '84': 2_700, '85': 2_100,
  '86': 1_950, '87': 1_900, '88': 1_660, '89': 1_800, '90': 1_700,
  '91': 1_700, '92': 1_661, '93': 1_661, '94': 1_661, '95': 1_661,
  '971': 2_400, '972': 2_400, '973': 2_200, '974': 2_500, '976': 2_600,
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
  const cacheKey = `commune_${codePostal}`
  const cached = communeCache.get(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    // Appel geo.api.gouv.fr — retourne population, surface, département
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?codePostal=${codePostal}&fields=code,nom,population,surface,departement,codesPostaux&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) {
      return NextResponse.json({ success: true, data: null, source: 'geo.api.gouv.fr' })
    }

    const communes = await res.json()
    if (!Array.isArray(communes) || communes.length === 0) {
      return NextResponse.json({ success: true, data: null, source: 'geo.api.gouv.fr' })
    }

    const commune = communes[0]
    const population: number | null = commune.population ?? null
    const surfaceHa: number | null = commune.surface ?? null // surface en hectares
    const surfaceKm2 = surfaceHa ? surfaceHa / 100 : null
    const densitePopulation = population && surfaceKm2
      ? Math.round(population / surfaceKm2)
      : null
    // geo.api.gouv.fr renvoie departement comme objet {code, nom} ou string
    const rawDept = commune.departement
    const departement: string = typeof rawDept === 'object' && rawDept?.code
      ? rawDept.code
      : (typeof rawDept === 'string' ? rawDept : codePostal.slice(0, 2))

    // Revenu mensuel estimé (INSEE Filosofi)
    // Heuristique basée sur la taille de la commune
    let revenuMensuel: number | null = null
    try {
      const inseeRes = await fetch(
        `${request.nextUrl.origin}/api/analyse/insee-revenus?codePostal=${codePostal}`,
        { signal: AbortSignal.timeout(6000) }
      )
      if (inseeRes.ok) {
        const inseeData = await inseeRes.json()
        if (inseeData?.data?.revenuMedian) {
          revenuMensuel = Math.round(inseeData.data.revenuMedian / 12)
        }
      }
    } catch {
      // fallback
    }

    // Fallback revenu
    if (!revenuMensuel) {
      const annuel = population && population > 200_000
        ? REVENU_MEDIAN_NATIONAL * 1.15
        : population && population > 50_000
          ? REVENU_MEDIAN_NATIONAL * 1.05
          : REVENU_MEDIAN_NATIONAL
      revenuMensuel = Math.round(annuel / 12)
    }

    // Ensoleillement
    const ensoleillement = ENSOLEILLEMENT_PAR_DEPT[departement] ?? null

    // ── Comptages POI commune-entière (Overpass / OSM) ──
    // Utilise area["ref:INSEE"="CODE"] pour couvrir la commune entière
    const codeInsee: string = commune.code // Code INSEE commune
    let communeCounts: {
      education: number | null
      commerce: number | null
      sante: number | null
      transport: number | null
      loisirs: number | null
    } = { education: null, commerce: null, sante: null, transport: null, loisirs: null }

    try {
      const overpassQuery = `
        [out:json][timeout:25];
        area["ref:INSEE"="${codeInsee}"]->.commune;
        (
          node["amenity"~"school|kindergarten|college|university"](area.commune);
          way["amenity"~"school|kindergarten|college|university"](area.commune);
        )->.education;
        (
          node["shop"~"supermarket|convenience|bakery|butcher|greengrocer|pastry|deli|mall|department_store|clothes|shoes|hairdresser|beauty|optician|florist|books|electronics|furniture|hardware"](area.commune);
          way["shop"~"supermarket|convenience|bakery|butcher|greengrocer|pastry|deli|mall|department_store|clothes|shoes|hairdresser|beauty|optician|florist|books|electronics|furniture|hardware"](area.commune);
          node["amenity"~"bank|post_office|marketplace"](area.commune);
        )->.commerce;
        (
          node["amenity"~"hospital|clinic|doctors|doctor|dentist|pharmacy"](area.commune);
          way["amenity"~"hospital|clinic|doctors|doctor|dentist|pharmacy"](area.commune);
          node["healthcare"](area.commune);
        )->.sante;
        (
          node["highway"="bus_stop"](area.commune);
          node["railway"~"station|halt|tram_stop|subway_entrance"](area.commune);
          node["public_transport"="station"](area.commune);
          node["amenity"="bicycle_rental"](area.commune);
        )->.transport;
        (
          way["leisure"="pitch"](area.commune);
        )->.loisirs;
        .education out count;
        .commerce out count;
        .sante out count;
        .transport out count;
        .loisirs out count;
      `

      /** Fetch Overpass with fallback */
      async function fetchOverpassCount(url: string): Promise<Record<string, number>> {
        const ctrl = new AbortController()
        const tid = setTimeout(() => ctrl.abort(), 20000)
        try {
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(overpassQuery)}`,
            signal: ctrl.signal,
          })
          clearTimeout(tid)
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          const json = await r.json()
          // Overpass "out count" returns elements with tags.total for each set
          const counts: Record<string, number> = {}
          const cats = ['education', 'commerce', 'sante', 'transport', 'loisirs']
          const elements = (json.elements || []) as Array<{ tags?: Record<string, string> }>
          elements.forEach((el, idx) => {
            if (el.tags?.total && idx < cats.length) {
              counts[cats[idx]] = parseInt(el.tags.total, 10) || 0
            }
          })
          return counts
        } catch {
          clearTimeout(tid)
          throw new Error('fetch failed')
        }
      }

      let overpassCounts: Record<string, number> = {}
      try {
        overpassCounts = await fetchOverpassCount(OVERPASS_URL)
      } catch {
        // Fallback to secondary server
        try {
          overpassCounts = await fetchOverpassCount(OVERPASS_FALLBACK)
        } catch {
          // Both failed — leave counts as null
        }
      }

      if (Object.keys(overpassCounts).length > 0) {
        communeCounts = {
          education: overpassCounts.education ?? null,
          commerce: overpassCounts.commerce ?? null,
          sante: overpassCounts.sante ?? null,
          transport: overpassCounts.transport ?? null,
          loisirs: overpassCounts.loisirs ?? null,
        }
      }
    } catch {
      // Overpass failed — commune counts stay null
    }

    const responseData = {
      success: true,
      data: {
        nomCommune: commune.nom as string,
        codePostal,
        departement,
        population,
        surfaceKm2: surfaceKm2 ? Math.round(surfaceKm2 * 10) / 10 : null,
        densitePopulation,
        revenuMensuel,
        ensoleillement,
        counts: communeCounts,
      },
      source: 'geo.api.gouv.fr + INSEE + OpenStreetMap',
    }

    communeCache.set(cacheKey, responseData)
    return NextResponse.json(responseData)
  } catch {
    return NextResponse.json({ success: true, data: null, source: 'geo.api.gouv.fr' })
  }
}
