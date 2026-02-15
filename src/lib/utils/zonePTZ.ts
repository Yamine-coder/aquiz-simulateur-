/**
 * Utilitaires pour déterminer la zone PTZ à partir du code postal
 * 
 * Zones PTZ simplifiées basées sur les départements principaux
 * Source: décret PTZ 2024-2025
 */

import type { ZonePTZ } from '@/types/aides'

/** Départements par zone PTZ (simplification) */
const ZONES_PTZ_DEPARTEMENTS: Record<string, ZonePTZ> = {
  // Zone Abis - Paris
  '75': 'Abis',
  
  // Zone A - Petite couronne + grandes métropoles
  '92': 'A',  // Hauts-de-Seine
  '93': 'A',  // Seine-Saint-Denis
  '94': 'A',  // Val-de-Marne
  '69': 'A',  // Rhône (Lyon)
  '13': 'A',  // Bouches-du-Rhône (Marseille)
  '06': 'A',  // Alpes-Maritimes (Nice)
  
  // Zone B1 - Grande couronne + villes moyennes
  '77': 'B1', // Seine-et-Marne
  '78': 'B1', // Yvelines
  '91': 'B1', // Essonne
  '95': 'B1', // Val-d'Oise
  '31': 'B1', // Haute-Garonne (Toulouse)
  '33': 'B1', // Gironde (Bordeaux)
  '44': 'B1', // Loire-Atlantique (Nantes)
  '59': 'B1', // Nord (Lille)
  '67': 'B1', // Bas-Rhin (Strasbourg)
  '34': 'B1', // Hérault (Montpellier)
  
  // Zone B2 - Villes moyennes
  '35': 'B2', // Ille-et-Vilaine (Rennes)
  '38': 'B2', // Isère (Grenoble)
  '54': 'B2', // Meurthe-et-Moselle (Nancy)
  '57': 'B2', // Moselle (Metz)
  '45': 'B2', // Loiret (Orléans)
  '37': 'B2', // Indre-et-Loire (Tours)
  '76': 'B2', // Seine-Maritime (Rouen)
  '14': 'B2', // Calvados (Caen)
  
  // Zone C - Autres (par défaut)
}

/** Plafonds de prix PTZ 2024-2025 par zone */
const PLAFONDS_PRIX_PTZ: Record<ZonePTZ, number> = {
  'Abis': 150000,
  'A': 150000,
  'B1': 135000,
  'B2': 110000,
  'C': 100000,
}

/** Quotité PTZ (% finançable) */
const QUOTITE_PTZ = {
  neuf: 0.40,      // 40% du prix dans le neuf
  ancien: 0.20,    // 20% dans l'ancien avec travaux
}

export interface InfoZonePTZ {
  zone: ZonePTZ
  plafondPrix: number
  quotiteNeuf: number
  quotiteAncien: number
  description: string
}

/**
 * Détermine la zone PTZ à partir du code postal
 */
export function getZonePTZ(codePostal: string): ZonePTZ {
  if (!codePostal || codePostal.length < 2) return 'C'
  
  const codeDept = codePostal.substring(0, 2)
  
  // Cas spéciaux pour les DOM-TOM
  if (['97', '98'].includes(codeDept)) return 'B1'
  
  // Cas spécial Corse
  if (codeDept === '20' || codePostal.startsWith('201') || codePostal.startsWith('202')) {
    return 'B2'
  }
  
  return ZONES_PTZ_DEPARTEMENTS[codeDept] || 'C'
}

/**
 * Obtient toutes les infos PTZ pour un code postal
 */
export function getInfoPTZ(codePostal: string): InfoZonePTZ {
  const zone = getZonePTZ(codePostal)
  
  const descriptions: Record<ZonePTZ, string> = {
    'Abis': 'Paris intra-muros',
    'A': 'Zone très tendue',
    'B1': 'Zone tendue',
    'B2': 'Zone modérée',
    'C': 'Zone détendue',
  }
  
  // Affichage plus lisible pour Abis
  const zoneAffichage = zone === 'Abis' ? 'A bis' : zone
  
  return {
    zone: zoneAffichage as ZonePTZ,
    plafondPrix: PLAFONDS_PRIX_PTZ[zone],
    quotiteNeuf: QUOTITE_PTZ.neuf,
    quotiteAncien: QUOTITE_PTZ.ancien,
    description: descriptions[zone],
  }
}

/**
 * Calcule le montant PTZ potentiel
 */
export function calculerMontantPTZ(
  prixBien: number,
  codePostal: string,
  typeBien: 'neuf' | 'ancien'
): { montant: number; eligible: boolean; raison?: string } {
  const info = getInfoPTZ(codePostal)
  
  // Vérifier si le bien est dans une zone éligible au PTZ
  // Note: depuis 2024, le PTZ neuf est recentré sur zones tendues
  if (typeBien === 'neuf' && ['B2', 'C'].includes(info.zone)) {
    return { 
      montant: 0, 
      eligible: false, 
      raison: 'PTZ neuf non disponible en zone ' + info.zone 
    }
  }
  
  // Pour l'ancien, nécessite travaux (simplifié ici)
  if (typeBien === 'ancien') {
    return {
      montant: 0,
      eligible: false,
      raison: 'PTZ ancien réservé aux biens avec travaux importants'
    }
  }
  
  // Calcul du montant PTZ
  const quotite = typeBien === 'neuf' ? info.quotiteNeuf : info.quotiteAncien
  const assiette = Math.min(prixBien, info.plafondPrix)
  const montant = Math.round(assiette * quotite)
  
  return { montant, eligible: true }
}
