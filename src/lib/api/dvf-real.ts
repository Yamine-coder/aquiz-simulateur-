/**
 * Service DVF Réel - Données officielles data.gouv.fr
 * 
 * Télécharge et parse les fichiers CSV DVF pour calculer
 * les prix médians au m² par commune.
 * 
 * Source: https://files.data.gouv.fr/geo-dvf/latest/csv/
 * Licence: Licence Ouverte 2.0
 */

// ============================================
// TYPES
// ============================================

export interface DVFMutation {
  id_mutation: string
  date_mutation: string
  nature_mutation: string
  valeur_fonciere: number
  code_postal: string
  code_commune: string
  nom_commune: string
  code_departement: string
  type_local: string
  surface_reelle_bati: number
  nombre_pieces_principales: number
  longitude: number
  latitude: number
}

export interface DVFStatsCommune {
  codeCommune: string
  nomCommune: string
  codeDepartement: string
  codePostal: string
  // Appartements
  prixM2MedianAppart: number
  nbVentesAppart: number
  prixM2MinAppart: number
  prixM2MaxAppart: number
  // Maisons
  prixM2MedianMaison: number
  nbVentesMaison: number
  prixM2MinMaison: number
  prixM2MaxMaison: number
  // Coordonnées (moyenne des transactions)
  latitude: number
  longitude: number
  // Métadonnées
  annee: number
  dateCalcul: string
}

export interface DVFDepartementStats {
  codeDepartement: string
  nomDepartement: string
  communes: DVFStatsCommune[]
  nbTotalVentes: number
  prixM2MedianGlobal: number
  dateMAJ: string
}

// ============================================
// CONFIGURATION
// ============================================

const DVF_BASE_URL = 'https://files.data.gouv.fr/geo-dvf/latest/csv'
const ANNEE_COURANTE = 2025 // Données les plus récentes disponibles (mise à jour trimestrielle)

// Départements IDF
const DEPARTEMENTS_IDF = ['75', '77', '78', '91', '92', '93', '94', '95']

const NOMS_DEPARTEMENTS: Record<string, string> = {
  '75': 'Paris',
  '77': 'Seine-et-Marne',
  '78': 'Yvelines',
  '91': 'Essonne',
  '92': 'Hauts-de-Seine',
  '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne',
  '95': "Val-d'Oise"
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Parse une ligne CSV en objet DVFMutation
 */
function parseCSVLine(line: string, headers: string[]): DVFMutation | null {
  // Parser CSV avec gestion des virgules dans les champs
  const values: string[] = []
  let current = ''
  let inQuotes = false
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())

  if (values.length !== headers.length) return null

  const obj: Record<string, string> = {}
  headers.forEach((h, i) => {
    obj[h] = values[i] || ''
  })

  // Filtrer: seulement les ventes avec surface et prix valides
  if (obj.nature_mutation !== 'Vente') return null
  if (!obj.valeur_fonciere || !obj.surface_reelle_bati) return null
  if (!obj.type_local || (obj.type_local !== 'Appartement' && obj.type_local !== 'Maison')) return null

  const valeur = parseFloat(obj.valeur_fonciere)
  const surface = parseFloat(obj.surface_reelle_bati)
  
  if (isNaN(valeur) || isNaN(surface) || valeur <= 0 || surface <= 0) return null
  
  // Filtrer les valeurs aberrantes (prix/m² entre 500€ et 30000€)
  const prixM2 = valeur / surface
  if (prixM2 < 500 || prixM2 > 30000) return null

  return {
    id_mutation: obj.id_mutation,
    date_mutation: obj.date_mutation,
    nature_mutation: obj.nature_mutation,
    valeur_fonciere: valeur,
    code_postal: obj.code_postal,
    code_commune: obj.code_commune,
    nom_commune: obj.nom_commune,
    code_departement: obj.code_departement,
    type_local: obj.type_local,
    surface_reelle_bati: surface,
    nombre_pieces_principales: parseInt(obj.nombre_pieces_principales) || 0,
    longitude: parseFloat(obj.longitude) || 0,
    latitude: parseFloat(obj.latitude) || 0
  }
}

/**
 * Calcule la médiane d'un tableau de nombres
 */
function calculerMediane(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Parse le CSV complet et retourne les mutations
 */
function parseCSV(csvContent: string): DVFMutation[] {
  const lines = csvContent.split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim())
  const mutations: DVFMutation[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const mutation = parseCSVLine(line, headers)
    if (mutation) {
      mutations.push(mutation)
    }
  }
  
  return mutations
}

/**
 * Calcule les statistiques par commune à partir des mutations
 */
function calculerStatsParCommune(mutations: DVFMutation[], annee: number): Map<string, DVFStatsCommune> {
  // Grouper par commune
  const parCommune = new Map<string, DVFMutation[]>()
  
  for (const m of mutations) {
    const key = m.code_commune
    if (!parCommune.has(key)) {
      parCommune.set(key, [])
    }
    parCommune.get(key)!.push(m)
  }
  
  // Calculer stats pour chaque commune
  const stats = new Map<string, DVFStatsCommune>()
  
  for (const [codeCommune, communeMutations] of parCommune) {
    const apparts = communeMutations.filter(m => m.type_local === 'Appartement')
    const maisons = communeMutations.filter(m => m.type_local === 'Maison')
    
    const prixM2Apparts = apparts.map(m => m.valeur_fonciere / m.surface_reelle_bati)
    const prixM2Maisons = maisons.map(m => m.valeur_fonciere / m.surface_reelle_bati)
    
    // Coordonnées moyennes
    const allWithCoords = communeMutations.filter(m => m.latitude && m.longitude)
    const latMoy = allWithCoords.length > 0 
      ? allWithCoords.reduce((s, m) => s + m.latitude, 0) / allWithCoords.length 
      : 0
    const lngMoy = allWithCoords.length > 0 
      ? allWithCoords.reduce((s, m) => s + m.longitude, 0) / allWithCoords.length 
      : 0
    
    const first = communeMutations[0]
    
    stats.set(codeCommune, {
      codeCommune,
      nomCommune: first.nom_commune,
      codeDepartement: first.code_departement,
      codePostal: first.code_postal,
      // Appartements
      prixM2MedianAppart: Math.round(calculerMediane(prixM2Apparts)),
      nbVentesAppart: apparts.length,
      prixM2MinAppart: prixM2Apparts.length > 0 ? Math.round(Math.min(...prixM2Apparts)) : 0,
      prixM2MaxAppart: prixM2Apparts.length > 0 ? Math.round(Math.max(...prixM2Apparts)) : 0,
      // Maisons
      prixM2MedianMaison: Math.round(calculerMediane(prixM2Maisons)),
      nbVentesMaison: maisons.length,
      prixM2MinMaison: prixM2Maisons.length > 0 ? Math.round(Math.min(...prixM2Maisons)) : 0,
      prixM2MaxMaison: prixM2Maisons.length > 0 ? Math.round(Math.max(...prixM2Maisons)) : 0,
      // Coordonnées
      latitude: latMoy,
      longitude: lngMoy,
      // Métadonnées
      annee,
      dateCalcul: new Date().toISOString()
    })
  }
  
  return stats
}

// ============================================
// FONCTIONS PUBLIQUES
// ============================================

/**
 * Télécharge et parse les données DVF pour un département
 * Retourne les stats par commune
 */
export async function fetchDVFDepartement(
  codeDepartement: string,
  annee: number = ANNEE_COURANTE
): Promise<DVFDepartementStats> {
  const url = `${DVF_BASE_URL}/${annee}/departements/${codeDepartement}.csv.gz`
  
  console.log(`[DVF] Téléchargement département ${codeDepartement}...`)
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    // Le fichier est gzippé, on doit le décompresser
    const arrayBuffer = await response.arrayBuffer()
    
    // Utiliser pako pour décompresser si disponible, sinon fetch non-gzip
    let csvContent: string
    
    try {
      // Essayer d'importer pako pour la décompression
      const pako = await import('pako')
      const decompressed = pako.ungzip(new Uint8Array(arrayBuffer))
      csvContent = new TextDecoder('utf-8').decode(decompressed)
    } catch {
      // Si pako n'est pas dispo, essayer le fichier non-compressé
      const altUrl = `${DVF_BASE_URL}/${annee}/departements/${codeDepartement}.csv`
      const altResponse = await fetch(altUrl)
      if (!altResponse.ok) {
        throw new Error(`Impossible de télécharger les données DVF`)
      }
      csvContent = await altResponse.text()
    }
    
    console.log(`[DVF] Parsing CSV département ${codeDepartement}...`)
    
    const mutations = parseCSV(csvContent)
    const statsParCommune = calculerStatsParCommune(mutations, annee)
    
    // Calculer prix médian global du département
    const tousLesPrix = mutations.map(m => m.valeur_fonciere / m.surface_reelle_bati)
    
    return {
      codeDepartement,
      nomDepartement: NOMS_DEPARTEMENTS[codeDepartement] || codeDepartement,
      communes: Array.from(statsParCommune.values()),
      nbTotalVentes: mutations.length,
      prixM2MedianGlobal: Math.round(calculerMediane(tousLesPrix)),
      dateMAJ: new Date().toISOString()
    }
  } catch (error) {
    console.error(`[DVF] Erreur département ${codeDepartement}:`, error)
    throw error
  }
}

/**
 * Télécharge les données DVF pour une commune spécifique
 */
export async function fetchDVFCommune(
  codeCommune: string,
  annee: number = ANNEE_COURANTE
): Promise<DVFStatsCommune | null> {
  const codeDept = codeCommune.substring(0, 2)
  const url = `${DVF_BASE_URL}/${annee}/communes/${codeDept}/${codeCommune}.csv`
  
  console.log(`[DVF] Téléchargement commune ${codeCommune}...`)
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[DVF] Commune ${codeCommune} non trouvée`)
        return null
      }
      throw new Error(`HTTP ${response.status}`)
    }
    
    const csvContent = await response.text()
    const mutations = parseCSV(csvContent)
    
    if (mutations.length === 0) return null
    
    const statsMap = calculerStatsParCommune(mutations, annee)
    return statsMap.get(codeCommune) || null
    
  } catch (error) {
    console.error(`[DVF] Erreur commune ${codeCommune}:`, error)
    return null
  }
}

/**
 * Récupère les données DVF pour toute l'Île-de-France
 * ATTENTION: Cela télécharge beaucoup de données (~500Mo)
 * Préférer le cache ou l'appel par département
 */
export async function fetchDVFIleDeFrance(
  annee: number = ANNEE_COURANTE
): Promise<DVFDepartementStats[]> {
  console.log(`[DVF] Téléchargement Île-de-France (${DEPARTEMENTS_IDF.length} départements)...`)
  
  const results: DVFDepartementStats[] = []
  
  // Télécharger séquentiellement pour éviter de surcharger
  for (const codeDept of DEPARTEMENTS_IDF) {
    try {
      const stats = await fetchDVFDepartement(codeDept, annee)
      results.push(stats)
    } catch (error) {
      console.error(`[DVF] Échec département ${codeDept}:`, error)
    }
  }
  
  return results
}

/**
 * Obtenir les infos sur la source des données
 */
export function getDVFSourceInfo() {
  return {
    source: 'Demandes de Valeurs Foncières (DVF)',
    organisme: 'Direction Générale des Finances Publiques',
    url: 'https://files.data.gouv.fr/geo-dvf/',
    licence: 'Licence Ouverte 2.0',
    annee: ANNEE_COURANTE,
    note: 'Prix médians calculés sur les transactions de ventes de biens'
  }
}
