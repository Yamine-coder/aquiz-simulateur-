/**
 * API Route - Proxy DVF
 * 
 * Stratégie de données :
 * 1. D'abord: API interne /api/dvf/codepostal/[cp] (données complètes IDF)
 * 2. Fallback: API externe cquest.org (France entière mais moins fiable)
 * 3. Fallback: Données locales statiques ZONES_ILE_DE_FRANCE
 */

import { ZONES_ILE_DE_FRANCE } from '@/data/prix-m2-idf';
import { calculerMediane, fetchDVFDepartement, type DVFDepartementStats } from '@/lib/api/dvf-real';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { ServerCache } from '@/lib/serverCache';
import { NextRequest, NextResponse } from 'next/server';

// Route dynamique (appelée côté client)

// Cache département borné (TTL 24h, max 100 départements)
const deptCache = new ServerCache<DVFDepartementStats>({ ttlMs: 24 * 60 * 60 * 1000, maxSize: 100 })

interface DVFRawTransaction {
  id_mutation?: string
  valeur_fonciere?: number
  surface_reelle_bati?: number
  date_mutation?: string
}

/**
 * Fallback avec les données locales IDF statiques
 */
function getFallbackData(codePostal: string, typeBien: string) {
  const zone = ZONES_ILE_DE_FRANCE.find(z => z.codePostal === codePostal)
  
  if (!zone) return null
  
  const prixM2 = typeBien === 'Appartement' 
    ? zone.prixM2Appartement 
    : zone.prixM2Maison
  
  return {
    prixMedian: null,
    prixMoyen: null,
    prixMin: null,
    prixMax: null,
    prixM2Median: prixM2,
    prixM2Moyen: prixM2,
    nbTransactions: 100,
    evolution12Mois: zone.evolutionPrix1an ?? null,
  }
}

/**
 * Charge les données DVF directement (sans HTTP vers soi-même)
 * Filtre par surface pour une comparaison pertinente
 */
async function fetchFromInternalData(
  codePostal: string,
  typeBien: string,
  surfaceMin?: number,
  surfaceMax?: number
) {
  try {
    // Extraire le département
    let codeDept = codePostal.substring(0, 2)
    if (codePostal.startsWith('75')) codeDept = '75'
    else if (codePostal.startsWith('92')) codeDept = '92'
    else if (codePostal.startsWith('93')) codeDept = '93'
    else if (codePostal.startsWith('94')) codeDept = '94'
    else if (codePostal.startsWith('97')) codeDept = codePostal.substring(0, 3) // DOM-TOM
    else if (codePostal.startsWith('20')) codeDept = parseInt(codePostal) < 20200 ? '2A' : '2B' // Corse

    // Vérifier le cache département
    const cacheKey = `dvf_dept_${codeDept}`
    let deptData = deptCache.get(cacheKey)

    if (!deptData) {
      deptData = await fetchDVFDepartement(codeDept)
      deptCache.set(cacheKey, deptData)
    }

    // Filtrer les transactions individuelles par code postal et type de bien
    const typeLocal = typeBien === 'Appartement' ? 'Appartement' : 'Maison'
    const allTransactions = deptData.transactions.filter(
      t => t.codePostal === codePostal && t.typeLocal === typeLocal
    )

    if (allTransactions.length === 0) return null

    // ── Filtrage par surface (stratégie progressive) ───────────
    // 1. D'abord : fourchette demandée (surfaceMin–surfaceMax)
    // 2. Si < 5 transactions : élargir ±50% autour de la surface cible
    // 3. Si toujours < 5 : toutes surfaces avec avertissement
    const MIN_TRANSACTIONS = 5

    let filtered = allTransactions
    let avertissement: string | undefined

    if (surfaceMin !== undefined && surfaceMax !== undefined) {
      // Tentative 1 : fourchette demandée
      filtered = allTransactions.filter(t => t.surface >= surfaceMin && t.surface <= surfaceMax)

      if (filtered.length < MIN_TRANSACTIONS) {
        // Tentative 2 : élargir de 50%
        const centre = (surfaceMin + surfaceMax) / 2
        const range = (surfaceMax - surfaceMin) / 2
        const widerMin = Math.max(9, centre - range * 1.5)
        const widerMax = centre + range * 1.5
        filtered = allTransactions.filter(t => t.surface >= widerMin && t.surface <= widerMax)
        
        if (filtered.length >= MIN_TRANSACTIONS) {
          avertissement = `Fourchette élargie (${Math.round(widerMin)}–${Math.round(widerMax)} m²) – ${filtered.length} transactions`
        }
      }

      if (filtered.length < MIN_TRANSACTIONS) {
        // Tentative 3 : toutes surfaces
        filtered = allTransactions
        avertissement = `Prix médian toutes surfaces confondues (${allTransactions.length} transactions) – pas assez de biens similaires en surface`
      }
    }

    // Calculer la médiane sur les transactions filtrées
    const prixM2List = filtered.map(t => t.prixM2)
    const prixM2Median = Math.round(calculerMediane(prixM2List))

    if (!prixM2Median || prixM2Median === 0) return null

    // Prix total médian (estimé si on a les surfaces)
    const prixTotaux = filtered.map(t => t.prixM2 * t.surface)
    const prixMedian = prixTotaux.length >= MIN_TRANSACTIONS
      ? Math.round(calculerMediane(prixTotaux))
      : null

    return {
      prixMedian,
      prixMoyen: null,
      prixMin: null,
      prixMax: null,
      prixM2Median,
      prixM2Moyen: prixM2Median,
      nbTransactions: filtered.length,
      evolution12Mois: null,
      avertissement
    }
  } catch {
    return null
  }
}

/**
 * Appelle l'API externe cquest.org
 */
async function fetchFromCquest(codePostal: string, typeBien: string, surfaceMin?: string, surfaceMax?: string) {
  try {
    const params = new URLSearchParams({
      code_postal: codePostal,
      type_local: typeBien,
    })
    
    const dateDebut = new Date()
    dateDebut.setFullYear(dateDebut.getFullYear() - 2)
    params.append('date_mutation_min', dateDebut.toISOString().split('T')[0])
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(
      `https://api.cquest.org/dvf?${params.toString()}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) return null
    
    const result = await response.json()
    
    if (!result.resultats || result.resultats.length === 0) return null
    
    // Dédupliquer par id_mutation (DVF peut avoir plusieurs lignes par transaction : appart + parking, etc.)
    // On garde la ligne avec la plus grande surface (le bien principal)
    const byMutation = new Map<string, DVFRawTransaction>()
    for (const t of result.resultats as DVFRawTransaction[]) {
      if (!t.valeur_fonciere || !t.surface_reelle_bati || t.surface_reelle_bati <= 0) continue
      const key = t.id_mutation || `${t.valeur_fonciere}_${t.date_mutation}`
      const existing = byMutation.get(key)
      if (!existing || (t.surface_reelle_bati > (existing.surface_reelle_bati || 0))) {
        byMutation.set(key, t)
      }
    }
    
    // Filtrer et transformer les transactions (avec filtre prix aberrants)
    let transactions = Array.from(byMutation.values())
      .map((t: DVFRawTransaction) => {
        const prixM2 = Math.round((t.valeur_fonciere as number) / (t.surface_reelle_bati as number))
        return {
          prix: t.valeur_fonciere as number,
          surface: t.surface_reelle_bati as number,
          prixM2,
          date: t.date_mutation
        }
      })
      // Filtrer les valeurs aberrantes (même seuil que dvf-real.ts)
      .filter((t: { prixM2: number }) => t.prixM2 >= 500 && t.prixM2 <= 30000)
    
    if (surfaceMin) {
      const min = parseFloat(surfaceMin)
      transactions = transactions.filter((t: { surface: number }) => t.surface >= min)
    }
    if (surfaceMax) {
      const max = parseFloat(surfaceMax)
      transactions = transactions.filter((t: { surface: number }) => t.surface <= max)
    }
    
    if (transactions.length < 3) return null
    
    const prix = transactions.map((t: { prix: number }) => t.prix).sort((a: number, b: number) => a - b)
    const prixM2 = transactions.map((t: { prixM2: number }) => t.prixM2).sort((a: number, b: number) => a - b)
    
    // Évolution 12 mois
    let evolution12Mois: number | null = null
    if (transactions.length >= 10) {
      const il_y_a_12_mois = new Date()
      il_y_a_12_mois.setFullYear(il_y_a_12_mois.getFullYear() - 1)
      
      const recentes = transactions.filter((t: { date: string }) => new Date(t.date) > il_y_a_12_mois)
      const anciennes = transactions.filter((t: { date: string }) => new Date(t.date) <= il_y_a_12_mois)
      
      if (recentes.length >= 3 && anciennes.length >= 3) {
        const moyenneRecente = recentes.reduce((a: number, t: { prixM2: number }) => a + t.prixM2, 0) / recentes.length
        const moyenneAncienne = anciennes.reduce((a: number, t: { prixM2: number }) => a + t.prixM2, 0) / anciennes.length
        evolution12Mois = Math.round(((moyenneRecente - moyenneAncienne) / moyenneAncienne) * 100)
      }
    }
    
    return {
      prixMedian: prix[Math.floor(prix.length / 2)],
      prixMoyen: Math.round(prix.reduce((a: number, b: number) => a + b, 0) / prix.length),
      prixMin: prix[0],
      prixMax: prix[prix.length - 1],
      prixM2Median: prixM2[Math.floor(prixM2.length / 2)],
      prixM2Moyen: Math.round(prixM2.reduce((a: number, b: number) => a + b, 0) / prixM2.length),
      nbTransactions: transactions.length,
      evolution12Mois
    }
  } catch (error) {
    console.error('[DVF] Erreur cquest.org:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  // ── Rate Limiting ─────────────────────────────────────
  const ip = getClientIP(request.headers)
  const rateCheck = checkRateLimit(`analyse:${ip}`, RATE_LIMITS.analyse)
  if (!rateCheck.success) {
    return NextResponse.json(
      { success: false, error: 'Trop de requêtes. Veuillez patienter.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const codePostal = searchParams.get('code_postal')
  const typeBien = searchParams.get('type_local')
  const surfaceMin = searchParams.get('surface_min')
  const surfaceMax = searchParams.get('surface_max')
  
  if (!codePostal || !typeBien) {
    return NextResponse.json(
      { success: false, error: 'Paramètres manquants' },
      { status: 400 }
    )
  }
  
  // 1. Essayer les données DVF directes (départementales) avec filtrage surface
  const sMin = surfaceMin ? parseFloat(surfaceMin) : undefined
  const sMax = surfaceMax ? parseFloat(surfaceMax) : undefined
  const internalData = await fetchFromInternalData(codePostal, typeBien, sMin, sMax)
  if (internalData) {
    return NextResponse.json({ 
      success: true, 
      data: internalData,
      source: 'DVF data.gouv.fr (complet)'
    })
  }
  
  // 2. Essayer l'API externe cquest.org
  const cquestData = await fetchFromCquest(codePostal, typeBien, surfaceMin || undefined, surfaceMax || undefined)
  if (cquestData) {
    return NextResponse.json({ 
      success: true, 
      data: cquestData,
      source: 'DVF cquest.org'
    })
  }
  
  // 3. Fallback sur données locales statiques
  const fallbackData = getFallbackData(codePostal, typeBien)
  if (fallbackData) {
    return NextResponse.json({ 
      success: true, 
      data: fallbackData,
      source: 'DVF local (estimation)'
    })
  }
  
  // Aucune donnée trouvée
  return NextResponse.json(
    { success: false, error: `Pas de données DVF pour le code postal ${codePostal}` }
  )
}
