/**
 * API Route - Proxy DVF
 * 
 * Stratégie de données :
 * 1. D'abord: API interne /api/dvf/codepostal/[cp] (données complètes IDF)
 * 2. Fallback: API externe cquest.org (France entière mais moins fiable)
 * 3. Fallback: Données locales statiques ZONES_ILE_DE_FRANCE
 */

import { ZONES_ILE_DE_FRANCE } from '@/data/prix-m2-idf';
import { fetchDVFDepartement, type DVFDepartementStats } from '@/lib/api/dvf-real';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { ServerCache } from '@/lib/serverCache';
import { NextRequest, NextResponse } from 'next/server';

// Route dynamique (appelée côté client)

// Cache département borné (TTL 24h, max 100 départements)
const deptCache = new ServerCache<DVFDepartementStats>({ ttlMs: 24 * 60 * 60 * 1000, maxSize: 100 })

interface DVFRawTransaction {
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
 */
async function fetchFromInternalData(codePostal: string, typeBien: string) {
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

    // Chercher les communes avec ce code postal
    const communes = deptData.communes.filter(c => c.codePostal === codePostal)
    if (communes.length === 0) return null

    // Calculer le prix pondéré
    const items = communes
      .filter(c => typeBien === 'Appartement' ? c.prixM2MedianAppart > 0 : c.prixM2MedianMaison > 0)
      .map(c => ({
        prix: typeBien === 'Appartement' ? c.prixM2MedianAppart : c.prixM2MedianMaison,
        nb: typeBien === 'Appartement' ? c.nbVentesAppart : c.nbVentesMaison
      }))

    if (items.length === 0) return null

    const totalVentes = items.reduce((sum, d) => sum + d.nb, 0)
    const prixM2Median = totalVentes > 0
      ? Math.round(items.reduce((sum, d) => sum + d.prix * d.nb, 0) / totalVentes)
      : items[0].prix

    if (!prixM2Median || prixM2Median === 0) return null

    return {
      prixMedian: null,
      prixMoyen: null,
      prixMin: null,
      prixMax: null,
      prixM2Median,
      prixM2Moyen: prixM2Median,
      nbTransactions: totalVentes || 50,
      evolution12Mois: null,
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
    
    // Filtrer et transformer les transactions
    let transactions = result.resultats
      .filter((t: DVFRawTransaction) => t.valeur_fonciere && t.surface_reelle_bati && t.surface_reelle_bati > 0)
      .map((t: DVFRawTransaction) => ({
        prix: t.valeur_fonciere as number,
        surface: t.surface_reelle_bati as number,
        prixM2: Math.round((t.valeur_fonciere as number) / (t.surface_reelle_bati as number)),
        date: t.date_mutation
      }))
    
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
  
  // 1. Essayer les données DVF directes (départementales)
  const internalData = await fetchFromInternalData(codePostal, typeBien)
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
