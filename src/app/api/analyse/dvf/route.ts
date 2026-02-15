/**
 * API Route - Proxy DVF
 * 
 * Stratégie de données :
 * 1. D'abord: API interne /api/dvf/codepostal/[cp] (données complètes IDF)
 * 2. Fallback: API externe cquest.org (France entière mais moins fiable)
 * 3. Fallback: Données locales statiques ZONES_ILE_DE_FRANCE
 */

import { ZONES_ILE_DE_FRANCE } from '@/data/prix-m2-idf'
import { NextRequest, NextResponse } from 'next/server'

// Route dynamique (appelée côté client)

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
 * Appelle l'API interne DVF par code postal (données complètes IDF)
 */
async function fetchFromInternalAPI(codePostal: string, typeBien: string, baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/api/dvf/codepostal/${codePostal}`, {
      headers: { 'Accept': 'application/json' },
    })
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    if (data.error) return null
    
    // Extraire le prix selon le type de bien
    const prixM2Median = typeBien === 'Appartement' 
      ? data.prixM2Appartement 
      : data.prixM2Maison
    
    const nbTransactions = typeBien === 'Appartement'
      ? data.nbVentesAppart
      : data.nbVentesMaison
    
    if (!prixM2Median || prixM2Median === 0) return null
    
    return {
      prixMedian: null,
      prixMoyen: null,
      prixMin: null,
      prixMax: null,
      prixM2Median,
      prixM2Moyen: prixM2Median,
      nbTransactions: nbTransactions || 50,
      evolution12Mois: null,
    }
  } catch (error) {
    console.error('[DVF] Erreur API interne:', error)
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
  
  console.log(`[DVF API] Code postal: ${codePostal}, Type: ${typeBien}`)
  
  // Construire l'URL de base pour les appels internes
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('host') || 'localhost:3000'
  const baseUrl = `${protocol}://${host}`
  
  // 1. Essayer l'API interne (données complètes IDF)
  const internalData = await fetchFromInternalAPI(codePostal, typeBien, baseUrl)
  if (internalData) {
    console.log(`[DVF API] ✓ Données trouvées via API interne pour ${codePostal}`)
    return NextResponse.json({ 
      success: true, 
      data: internalData,
      source: 'DVF data.gouv.fr (complet)'
    })
  }
  
  // 2. Essayer l'API externe cquest.org
  const cquestData = await fetchFromCquest(codePostal, typeBien, surfaceMin || undefined, surfaceMax || undefined)
  if (cquestData) {
    console.log(`[DVF API] ✓ Données trouvées via cquest.org pour ${codePostal}`)
    return NextResponse.json({ 
      success: true, 
      data: cquestData,
      source: 'DVF cquest.org'
    })
  }
  
  // 3. Fallback sur données locales statiques
  const fallbackData = getFallbackData(codePostal, typeBien)
  if (fallbackData) {
    console.log(`[DVF API] ✓ Données trouvées via fallback local pour ${codePostal}`)
    return NextResponse.json({ 
      success: true, 
      data: fallbackData,
      source: 'DVF local (estimation)'
    })
  }
  
  // Aucune donnée trouvée
  console.log(`[DVF API] ✗ Aucune donnée pour ${codePostal}`)
  return NextResponse.json(
    { success: false, error: `Pas de données DVF pour le code postal ${codePostal}` }
  )
}
