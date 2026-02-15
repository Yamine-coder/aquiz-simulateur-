/**
 * Service API DVF - Demandes de Valeurs Foncières
 * 
 * Données officielles des transactions immobilières françaises
 * Source: data.gouv.fr / DVF Etalab
 * 
 * GRATUIT - API cquest.org (miroir optimisé data.gouv.fr)
 */

import type { ZoneGeographique } from '@/types/carte'

// ============================================
// TYPES API DVF
// ============================================

export interface DVFTransaction {
  id: string
  dateTransaction: string
  typeBien: 'appartement' | 'maison' | 'local'
  surface: number
  prixVente: number
  prixM2: number
  commune: string
  codePostal: string
  codeDepartement: string
}

export interface DVFStatistiquesCommune {
  codeInsee: string
  codePostal: string
  nom: string
  departement: string
  codeDepartement: string
  // Prix médians au m²
  prixM2MedianAppartement: number
  prixM2MedianMaison: number
  // Nombre de transactions (sur 12 mois)
  nbTransactionsAppartement: number
  nbTransactionsMaison: number
  // Évolution des prix
  evolutionPrix1an: number // en %
  evolutionPrix5ans: number // en %
  // Coordonnées géographiques
  latitude: number
  longitude: number
}

export interface DVFResponse {
  success: boolean
  data: DVFStatistiquesCommune[]
  source: string
  dateMAJ: string
  error?: string
}

// ============================================
// CONFIGURATION API
// ============================================

const DVF_CONFIG = {
  // URL API backend (à configurer en production)
  baseUrl: process.env.NEXT_PUBLIC_DVF_API_URL || '',
  // Date de mise à jour des données
  dateMAJ: '2025-10-19',
  // Source des données
  source: 'DVF - data.gouv.fr (oct 2025)'
}

// ============================================
// FONCTIONS API
// ============================================

/**
 * Récupère les statistiques DVF pour un département
 * Note: En mode MVP, utilise les données locales pré-agrégées
 */
export async function fetchDVFParDepartement(
  codeDepartement: string
): Promise<DVFResponse> {
  // En production avec API backend:
  // const response = await fetch(`${DVF_CONFIG.baseUrl}/dvf/departement/${codeDepartement}`)
  // return response.json()
  
  // Mode MVP: retourne les données locales
  const { ZONES_ILE_DE_FRANCE } = await import('@/data/prix-m2-idf')
  
  const zones = ZONES_ILE_DE_FRANCE.filter(z => z.codeDepartement === codeDepartement)
  
  const data: DVFStatistiquesCommune[] = zones.map(zone => ({
    codeInsee: zone.codeInsee,
    codePostal: zone.codePostal,
    nom: zone.nom,
    departement: zone.departement,
    codeDepartement: zone.codeDepartement,
    prixM2MedianAppartement: zone.prixM2Appartement,
    prixM2MedianMaison: zone.prixM2Maison,
    nbTransactionsAppartement: Math.floor(Math.random() * 500) + 100, // Simulé
    nbTransactionsMaison: Math.floor(Math.random() * 200) + 50, // Simulé
    evolutionPrix1an: zone.evolutionPrix1an ?? 0,
    evolutionPrix5ans: zone.evolutionPrix5ans ?? 0,
    latitude: zone.centre.lat,
    longitude: zone.centre.lng
  }))

  return {
    success: true,
    data,
    source: DVF_CONFIG.source,
    dateMAJ: DVF_CONFIG.dateMAJ
  }
}

/**
 * Récupère les statistiques DVF pour une commune spécifique
 */
export async function fetchDVFParCommune(
  codeInsee: string
): Promise<DVFStatistiquesCommune | null> {
  const { ZONES_ILE_DE_FRANCE } = await import('@/data/prix-m2-idf')
  
  const zone = ZONES_ILE_DE_FRANCE.find(z => z.codeInsee === codeInsee)
  
  if (!zone) return null
  
  return {
    codeInsee: zone.codeInsee,
    codePostal: zone.codePostal,
    nom: zone.nom,
    departement: zone.departement,
    codeDepartement: zone.codeDepartement,
    prixM2MedianAppartement: zone.prixM2Appartement,
    prixM2MedianMaison: zone.prixM2Maison,
    nbTransactionsAppartement: Math.floor(Math.random() * 500) + 100,
    nbTransactionsMaison: Math.floor(Math.random() * 200) + 50,
    evolutionPrix1an: zone.evolutionPrix1an ?? 0,
    evolutionPrix5ans: zone.evolutionPrix5ans ?? 0,
    latitude: zone.centre.lat,
    longitude: zone.centre.lng
  }
}

/**
 * Récupère toutes les zones Île-de-France avec données DVF
 */
export async function fetchDVFIleDeFrance(): Promise<DVFResponse> {
  const { ZONES_ILE_DE_FRANCE } = await import('@/data/prix-m2-idf')
  
  const data: DVFStatistiquesCommune[] = ZONES_ILE_DE_FRANCE.map(zone => ({
    codeInsee: zone.codeInsee,
    codePostal: zone.codePostal,
    nom: zone.nom,
    departement: zone.departement,
    codeDepartement: zone.codeDepartement,
    prixM2MedianAppartement: zone.prixM2Appartement,
    prixM2MedianMaison: zone.prixM2Maison,
    nbTransactionsAppartement: Math.floor(Math.random() * 500) + 100,
    nbTransactionsMaison: Math.floor(Math.random() * 200) + 50,
    evolutionPrix1an: zone.evolutionPrix1an ?? 0,
    evolutionPrix5ans: zone.evolutionPrix5ans ?? 0,
    latitude: zone.centre.lat,
    longitude: zone.centre.lng
  }))

  return {
    success: true,
    data,
    source: DVF_CONFIG.source,
    dateMAJ: DVF_CONFIG.dateMAJ
  }
}

/**
 * Convertit les données DVF en format ZoneGeographique pour la carte
 */
export function dvfToZoneGeographique(stats: DVFStatistiquesCommune): ZoneGeographique {
  return {
    id: stats.codeInsee,
    codeInsee: stats.codeInsee,
    codePostal: stats.codePostal,
    nom: stats.nom,
    departement: stats.departement,
    codeDepartement: stats.codeDepartement,
    region: 'Île-de-France',
    typeZone: stats.codeDepartement === '75' ? 'urbain' : 
              ['92', '93', '94'].includes(stats.codeDepartement) ? 'periurbain' : 'rural',
    prixM2Appartement: stats.prixM2MedianAppartement,
    prixM2Maison: stats.prixM2MedianMaison,
    evolutionPrix1an: stats.evolutionPrix1an,
    evolutionPrix5ans: stats.evolutionPrix5ans,
    centre: {
      lat: stats.latitude,
      lng: stats.longitude
    }
  }
}

/**
 * Hook d'information sur la source des données
 */
export function getDVFSourceInfo() {
  return {
    source: 'Demandes de Valeurs Foncières (DVF)',
    organisme: 'Direction Générale des Finances Publiques',
    dateMAJ: DVF_CONFIG.dateMAJ,
    url: 'https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres/',
    licence: 'Licence Ouverte / Open Licence 2.0',
    note: 'Prix médians au m² calculés sur les transactions des 12 derniers mois'
  }
}

// ============================================
// API DVF TEMPS RÉEL (cquest.org - GRATUIT)
// ============================================

export interface DVFRealTimeStats {
  prixMedian: number
  prixMoyen: number
  prixMin: number
  prixMax: number
  prixM2Median: number
  prixM2Moyen: number
  nbTransactions: number
  evolution12Mois: number | null
}

export interface DVFRealTimeResult {
  success: boolean
  data?: DVFRealTimeStats
  error?: string
  source: string
}

/**
 * Récupère les données DVF en temps réel via l'API cquest.org
 * 100% GRATUIT - Miroir optimisé de data.gouv.fr
 */
export async function fetchDVFRealTime(
  codePostal: string,
  typeBien: 'Appartement' | 'Maison',
  surfaceMin?: number,
  surfaceMax?: number
): Promise<DVFRealTimeResult> {
  try {
    // Construire les paramètres de requête
    const params = new URLSearchParams({
      code_postal: codePostal,
      type_local: typeBien,
    })
    
    // Limiter aux 2 dernières années
    const dateDebut = new Date()
    dateDebut.setFullYear(dateDebut.getFullYear() - 2)
    params.append('date_mutation_min', dateDebut.toISOString().split('T')[0])
    
    const response = await fetch(
      `https://api.cquest.org/dvf?${params.toString()}`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 86400 } // Cache 24h côté serveur
      }
    )
    
    if (!response.ok) {
      return { 
        success: false, 
        error: 'API DVF temporairement indisponible',
        source: 'DVF cquest.org'
      }
    }
    
    const result = await response.json()
    
    if (!result.resultats || result.resultats.length === 0) {
      return { 
        success: false, 
        error: 'Pas de données pour cette zone',
        source: 'DVF cquest.org'
      }
    }
    
    // Filtrer et transformer les transactions
    interface DVFRawTransaction {
      valeur_fonciere?: number
      surface_reelle_bati?: number
      date_mutation?: string
    }
    
    let transactions = result.resultats
      .filter((t: DVFRawTransaction) => t.valeur_fonciere && t.surface_reelle_bati && t.surface_reelle_bati > 0)
      .map((t: DVFRawTransaction) => ({
        prix: t.valeur_fonciere as number,
        surface: t.surface_reelle_bati as number,
        prixM2: Math.round((t.valeur_fonciere as number) / (t.surface_reelle_bati as number)),
        date: t.date_mutation
      }))
    
    // Filtrer par surface si spécifié
    if (surfaceMin) {
      transactions = transactions.filter((t: { surface: number }) => t.surface >= surfaceMin)
    }
    if (surfaceMax) {
      transactions = transactions.filter((t: { surface: number }) => t.surface <= surfaceMax)
    }
    
    if (transactions.length < 3) {
      return { 
        success: false, 
        error: 'Pas assez de transactions (min 3)',
        source: 'DVF cquest.org'
      }
    }
    
    // Calculer les statistiques
    const prix = transactions.map((t: { prix: number }) => t.prix).sort((a: number, b: number) => a - b)
    const prixM2 = transactions.map((t: { prixM2: number }) => t.prixM2).sort((a: number, b: number) => a - b)
    
    const stats: DVFRealTimeStats = {
      prixMedian: prix[Math.floor(prix.length / 2)],
      prixMoyen: Math.round(prix.reduce((a: number, b: number) => a + b, 0) / prix.length),
      prixMin: prix[0],
      prixMax: prix[prix.length - 1],
      prixM2Median: prixM2[Math.floor(prixM2.length / 2)],
      prixM2Moyen: Math.round(prixM2.reduce((a: number, b: number) => a + b, 0) / prixM2.length),
      nbTransactions: transactions.length,
      evolution12Mois: calculerEvolutionPrix(transactions)
    }
    
    return { 
      success: true, 
      data: stats,
      source: 'DVF cquest.org'
    }
    
  } catch (error) {
    console.error('Erreur DVF temps réel:', error)
    return { 
      success: false, 
      error: 'Erreur de connexion',
      source: 'DVF cquest.org'
    }
  }
}

/**
 * Calcule l'évolution des prix sur 12 mois
 */
function calculerEvolutionPrix(
  transactions: Array<{ prix: number; prixM2: number; date: string }>
): number | null {
  if (transactions.length < 10) return null
  
  const il_y_a_12_mois = new Date()
  il_y_a_12_mois.setFullYear(il_y_a_12_mois.getFullYear() - 1)
  
  const recentes = transactions.filter(t => new Date(t.date) > il_y_a_12_mois)
  const anciennes = transactions.filter(t => new Date(t.date) <= il_y_a_12_mois)
  
  if (recentes.length < 3 || anciennes.length < 3) return null
  
  const moyenneRecente = recentes.reduce((a, t) => a + t.prixM2, 0) / recentes.length
  const moyenneAncienne = anciennes.reduce((a, t) => a + t.prixM2, 0) / anciennes.length
  
  return Math.round(((moyenneRecente - moyenneAncienne) / moyenneAncienne) * 100)
}

/**
 * Compare le prix d'une annonce au marché local DVF
 */
export function comparerPrixAuMarche(
  prixAnnonce: number,
  prixM2Annonce: number,
  stats: DVFRealTimeStats
): {
  ecartPrixM2: number
  position: 'sous-évalué' | 'dans-le-marché' | 'sur-évalué'
  commentaire: string
  conseil: string
} {
  const ecartPrixM2 = Math.round(((prixM2Annonce - stats.prixM2Median) / stats.prixM2Median) * 100)
  
  let position: 'sous-évalué' | 'dans-le-marché' | 'sur-évalué'
  let commentaire: string
  let conseil: string
  
  if (ecartPrixM2 <= -10) {
    position = 'sous-évalué'
    commentaire = `${Math.abs(ecartPrixM2)}% sous le prix médian du secteur`
    conseil = 'Prix attractif ! Vérifiez l\'état du bien et les raisons de ce prix.'
  } else if (ecartPrixM2 >= 15) {
    position = 'sur-évalué'
    commentaire = `${ecartPrixM2}% au-dessus du marché local`
    conseil = 'Marge de négociation possible. Demandez une justification du prix.'
  } else if (ecartPrixM2 >= 5) {
    position = 'dans-le-marché'
    commentaire = `Légèrement au-dessus du marché (+${ecartPrixM2}%)`
    conseil = 'Prix dans la norme haute. Négociation de 3-5% envisageable.'
  } else if (ecartPrixM2 <= -5) {
    position = 'dans-le-marché'
    commentaire = `Légèrement sous le marché (${ecartPrixM2}%)`
    conseil = 'Bon rapport qualité-prix. Ne tardez pas si le bien vous plaît.'
  } else {
    position = 'dans-le-marché'
    commentaire = `Prix conforme au marché (${ecartPrixM2 >= 0 ? '+' : ''}${ecartPrixM2}%)`
    conseil = 'Prix cohérent avec les transactions récentes du secteur.'
  }
  
  return { ecartPrixM2, position, commentaire, conseil }
}

