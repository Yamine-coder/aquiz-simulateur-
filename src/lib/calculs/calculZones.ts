/**
 * Calculs pour la carte interactive
 * Détermine la surface maximum et le statut (vert/orange/rouge) par zone
 */

import type {
    SeuilsSurface,
    StatutZone,
    TypeBienCarte,
    ZoneCalculee,
    ZoneGeographique,
} from '@/types/carte'
import { SEUILS_DEFAUT } from '@/types/carte'

/**
 * Calcule la surface maximum achetable dans une zone
 * SURFACE_MAX_ZONE = CAPACITE_ACHAT_MAX / P_M2
 */
export function calculerSurfaceMax(
  capaciteAchatMax: number,
  prixM2: number
): number {
  if (prixM2 <= 0) return 0
  return Math.floor(capaciteAchatMax / prixM2)
}

/**
 * Détermine le statut de la zone en fonction de la surface calculée
 * - vert: surface >= seuil vert (achat recommandé)
 * - orange: surface >= seuil orange mais < seuil vert (possible mais serré)
 * - rouge: surface < seuil orange (trop petit / non recommandé)
 */
export function determinerStatutZone(
  surfaceMax: number,
  typeBien: TypeBienCarte,
  seuils: Record<TypeBienCarte, SeuilsSurface> = SEUILS_DEFAUT
): StatutZone {
  const seuilsTypeBien = seuils[typeBien]

  if (surfaceMax >= seuilsTypeBien.seuilVert) {
    return 'vert'
  } else if (surfaceMax >= seuilsTypeBien.seuilOrange) {
    return 'orange'
  } else {
    return 'rouge'
  }
}

/**
 * Génère un label explicatif basé sur le statut
 */
export function genererLabel(
  surfaceMax: number,
  statut: StatutZone,
  _typeBien: TypeBienCarte
): string {
  switch (statut) {
    case 'vert':
      return `${surfaceMax}m² - Surface confortable`
    case 'orange':
      return `${surfaceMax}m² - Surface limitée`
    case 'rouge':
      return `${surfaceMax}m² - Surface insuffisante`
  }
}

/**
 * Génère une description détaillée
 */
export function genererDescription(
  zone: ZoneGeographique,
  surfaceMax: number,
  statut: StatutZone,
  typeBien: TypeBienCarte
): string {
  const typeBienLabel = typeBien === 'appartement' ? 'un appartement' : 'une maison'

  switch (statut) {
    case 'vert':
      return `Excellent choix ! Vous pouvez acheter ${typeBienLabel} confortable de ${surfaceMax}m² à ${zone.nom}.`
    case 'orange':
      return `Possible mais limité. ${surfaceMax}m² à ${zone.nom} peut convenir pour ${typeBien === 'appartement' ? 'un studio ou T2' : 'une petite maison'}.`
    case 'rouge':
      return `Budget insuffisant pour ${zone.nom}. Avec ${surfaceMax}m² max, privilégiez d'autres secteurs.`
  }
}

/**
 * Génère un commentaire sur le type de logement possible
 */
export function genererCommentaireLogement(
  surfaceMax: number,
  typeBien: TypeBienCarte
): string {
  if (typeBien === 'appartement') {
    if (surfaceMax >= 80) return 'T4 ou plus'
    if (surfaceMax >= 60) return 'T3 familial'
    if (surfaceMax >= 40) return 'T2 confortable'
    if (surfaceMax >= 25) return 'Studio ou T1'
    return 'Très petit studio'
  } else {
    if (surfaceMax >= 120) return 'Grande maison familiale'
    if (surfaceMax >= 90) return 'Maison T4-T5'
    if (surfaceMax >= 70) return 'Maison T3-T4'
    if (surfaceMax >= 50) return 'Petite maison T2-T3'
    return 'Très petite maison'
  }
}

/**
 * Calcule toutes les informations d'une zone géographique
 */
export function calculerZone(
  zone: ZoneGeographique,
  capaciteAchatMax: number,
  typeBien: TypeBienCarte,
  seuils: Record<TypeBienCarte, SeuilsSurface> = SEUILS_DEFAUT
): ZoneCalculee {
  // Récupérer le prix au m² selon le type de bien
  const prixM2 =
    typeBien === 'appartement' ? zone.prixM2Appartement : zone.prixM2Maison

  // Calcul de la surface max
  const surfaceMax = calculerSurfaceMax(capaciteAchatMax, prixM2)
  const surfaceMin = Math.floor(surfaceMax * 0.9) // marge de 10%

  // Détermination du statut
  const statut = determinerStatutZone(surfaceMax, typeBien, seuils)

  // Génération des textes
  const label = genererLabel(surfaceMax, statut, typeBien)
  const description = genererDescription(zone, surfaceMax, statut, typeBien)
  const commentaireLogement = genererCommentaireLogement(surfaceMax, typeBien)

  // Score de pertinence (basé sur le ratio surface/seuil)
  const seuilRef = seuils[typeBien].seuilVert
  const scoreRelevance = Math.min(100, Math.round((surfaceMax / seuilRef) * 100))

  return {
    ...zone,
    prixM2,
    surfaceMax,
    surfaceMin,
    statut,
    label,
    description,
    commentaireLogement,
    scoreRelevance,
  }
}

/**
 * Calcule les zones pour une liste complète de zones géographiques
 */
export function calculerToutesZones(
  zones: ZoneGeographique[],
  capaciteAchatMax: number,
  typeBien: TypeBienCarte,
  seuils: Record<TypeBienCarte, SeuilsSurface> = SEUILS_DEFAUT
): ZoneCalculee[] {
  return zones.map((zone) => calculerZone(zone, capaciteAchatMax, typeBien, seuils))
}

/**
 * Filtre les zones par statut
 */
export function filtrerParStatut(
  zonesCalculees: ZoneCalculee[],
  statuts: StatutZone[]
): ZoneCalculee[] {
  return zonesCalculees.filter((z) => statuts.includes(z.statut))
}

/**
 * Filtre les zones par département
 */
export function filtrerParDepartement(
  zonesCalculees: ZoneCalculee[],
  codeDepartements: string[]
): ZoneCalculee[] {
  return zonesCalculees.filter((z) =>
    codeDepartements.includes(z.codeDepartement)
  )
}

/**
 * Trie les zones par surface décroissante (meilleures opportunités en premier)
 */
export function trierParSurface(zonesCalculees: ZoneCalculee[]): ZoneCalculee[] {
  return [...zonesCalculees].sort((a, b) => b.surfaceMax - a.surfaceMax)
}

/**
 * Trie les zones par prix au m² croissant (moins cher en premier)
 */
export function trierParPrixM2(zonesCalculees: ZoneCalculee[]): ZoneCalculee[] {
  return [...zonesCalculees].sort((a, b) => a.prixM2 - b.prixM2)
}

/**
 * Récupère les statistiques globales des zones calculées
 */
export function getStatistiquesZones(zonesCalculees: ZoneCalculee[]): {
  total: number
  vertes: number
  oranges: number
  rouges: number
  surfaceMaxGlobale: number
  surfaceMinGlobale: number
  prixM2Moyen: number
  meilleureZone: ZoneCalculee | null
} {
  if (zonesCalculees.length === 0) {
    return {
      total: 0,
      vertes: 0,
      oranges: 0,
      rouges: 0,
      surfaceMaxGlobale: 0,
      surfaceMinGlobale: 0,
      prixM2Moyen: 0,
      meilleureZone: null,
    }
  }

  const vertes = zonesCalculees.filter((z) => z.statut === 'vert').length
  const oranges = zonesCalculees.filter((z) => z.statut === 'orange').length
  const rouges = zonesCalculees.filter((z) => z.statut === 'rouge').length

  const surfaces = zonesCalculees.map((z) => z.surfaceMax)
  const prixM2Total = zonesCalculees.reduce((sum, z) => sum + z.prixM2, 0)

  const triees = trierParSurface(zonesCalculees)

  return {
    total: zonesCalculees.length,
    vertes,
    oranges,
    rouges,
    surfaceMaxGlobale: Math.max(...surfaces),
    surfaceMinGlobale: Math.min(...surfaces),
    prixM2Moyen: Math.round(prixM2Total / zonesCalculees.length),
    meilleureZone: triees[0] || null,
  }
}

/**
 * Obtient la couleur CSS pour un statut
 */
export function getCouleurStatut(statut: StatutZone): string {
  const couleurs: Record<StatutZone, string> = {
    vert: '#22c55e',    // green-500
    orange: '#f97316',  // orange-500
    rouge: '#ef4444',   // red-500
  }
  return couleurs[statut]
}

/**
 * Obtient la couleur CSS avec opacité pour les polygones
 */
export function getCouleurPolygone(statut: StatutZone, opacite: number = 0.4): string {
  const couleurs: Record<StatutZone, { r: number; g: number; b: number }> = {
    vert: { r: 34, g: 197, b: 94 },
    orange: { r: 249, g: 115, b: 22 },
    rouge: { r: 239, g: 68, b: 68 },
  }
  const { r, g, b } = couleurs[statut]
  return `rgba(${r}, ${g}, ${b}, ${opacite})`
}
