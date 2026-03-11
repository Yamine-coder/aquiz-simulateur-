/**
 * Sélecteurs purs pour le store Comparateur
 * Extraits pour testabilité et séparation des concerns
 */

import type { Annonce, FiltresAnnonces, StatistiquesComparaison, TriAnnonces } from '@/types/annonces'

// ============================================
// TYPES
// ============================================

interface ComparateurSlice {
  annonces: Annonce[]
  annonceSelectionnees: string[]
  filtres: FiltresAnnonces
  tri: TriAnnonces
}

interface UnlockSlice {
  unlocked: boolean
  unlockedAt: number | null
  unlockedForSelection: string[] | null
}

// ============================================
// CONSTANTES
// ============================================

/** TTL de 30 jours pour le déblocage */
const UNLOCK_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** Ordre canonique des DPE (A = meilleur, G = pire, NC = non communiqué) */
const ORDRES_DPE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'NC'] as const

// ============================================
// SÉLECTEURS
// ============================================

/**
 * Vérifie si les données sont débloquées (avec TTL 30j)
 * Après 30 jours → re-verrouillé pour re-engagement
 */
export function isUnlocked(state: UnlockSlice): boolean {
  if (!state.unlocked || !state.unlockedAt) return false
  if (Date.now() - state.unlockedAt >= UNLOCK_TTL_MS) return false
  return true
}

/**
 * Récupère les annonces filtrées et triées
 */
export function getAnnoncesFiltrees(state: Pick<ComparateurSlice, 'annonces' | 'filtres' | 'tri'>): Annonce[] {
  let result = [...state.annonces]
  const { filtres, tri } = state

  // Appliquer les filtres
  if (filtres.prixMin !== undefined) {
    result = result.filter((a) => a.prix >= filtres.prixMin!)
  }
  if (filtres.prixMax !== undefined) {
    result = result.filter((a) => a.prix <= filtres.prixMax!)
  }
  if (filtres.surfaceMin !== undefined) {
    result = result.filter((a) => a.surface >= filtres.surfaceMin!)
  }
  if (filtres.surfaceMax !== undefined) {
    result = result.filter((a) => a.surface <= filtres.surfaceMax!)
  }
  if (filtres.type && filtres.type !== 'tous') {
    result = result.filter((a) => a.type === filtres.type)
  }
  if (filtres.favorisUniquement) {
    result = result.filter((a) => a.favori)
  }
  if (filtres.dpeMax) {
    const indexMax = ORDRES_DPE.indexOf(filtres.dpeMax as typeof ORDRES_DPE[number])
    result = result.filter((a) => {
      if (a.dpe === 'NC') return false
      return ORDRES_DPE.indexOf(a.dpe as typeof ORDRES_DPE[number]) <= indexMax
    })
  }

  // Appliquer le tri
  result.sort((a, b) => {
    switch (tri) {
      case 'prix-asc':
        return a.prix - b.prix
      case 'prix-desc':
        return b.prix - a.prix
      case 'prixM2-asc':
        return a.prixM2 - b.prixM2
      case 'prixM2-desc':
        return b.prixM2 - a.prixM2
      case 'surface-asc':
        return a.surface - b.surface
      case 'surface-desc':
        return b.surface - a.surface
      case 'pieces-desc':
        return (b.pieces || 0) - (a.pieces || 0)
      case 'dpe-asc': {
        const ordre: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, NC: 8 }
        return (ordre[a.dpe] ?? 8) - (ordre[b.dpe] ?? 8)
      }
      case 'dateAjout-desc':
      default:
        return new Date(b.dateAjout).getTime() - new Date(a.dateAjout).getTime()
    }
  })

  return result
}

/**
 * Récupère les annonces sélectionnées pour comparaison
 */
export function getAnnoncesSelectionnees(state: Pick<ComparateurSlice, 'annonces' | 'annonceSelectionnees'>): Annonce[] {
  return state.annonces.filter((a) => state.annonceSelectionnees.includes(a.id))
}

/**
 * Calcule les statistiques sur un ensemble d'annonces
 */
export function calculerStatistiques(annonces: Annonce[]): StatistiquesComparaison {
  if (annonces.length === 0) {
    return {
      nbAnnonces: 0,
      prixMoyen: 0,
      prixMin: 0,
      prixMax: 0,
      prixM2Moyen: 0,
      surfaceMoyenne: 0,
    }
  }

  const prix = annonces.map((a) => a.prix)
  const validForPrixM2 = annonces.filter((a) => a.prixM2 > 0)
  const prixM2 = validForPrixM2.map((a) => a.prixM2)
  const surfaces = annonces.map((a) => a.surface)

  const prixMin = Math.min(...prix)
  const prixMax = Math.max(...prix)
  const prixMoyen = Math.round(prix.reduce((sum, p) => sum + p, 0) / prix.length)
  const prixM2Moyen =
    prixM2.length > 0 ? Math.round(prixM2.reduce((sum, p) => sum + p, 0) / prixM2.length) : 0
  const surfaceMoyenne = Math.round(surfaces.reduce((sum, s) => sum + s, 0) / surfaces.length)

  // Meilleur rapport qualité/prix = meilleur prix/m² avec surface > moyenne
  const meilleursRapport = validForPrixM2
    .filter((a) => a.surface >= surfaceMoyenne * 0.9)
    .sort((a, b) => a.prixM2 - b.prixM2)
  const meilleurRapportId = meilleursRapport[0]?.id

  // Moins cher
  const moinsChere = annonces.reduce((min, a) => (a.prix < min.prix ? a : min), annonces[0])

  // Meilleur DPE
  const meilleurDPE = annonces.reduce((best, a) => {
    if (a.dpe === 'NC') return best
    if (best.dpe === 'NC') return a
    return ORDRES_DPE.indexOf(a.dpe as typeof ORDRES_DPE[number]) <
      ORDRES_DPE.indexOf(best.dpe as typeof ORDRES_DPE[number])
      ? a
      : best
  }, annonces[0])

  return {
    nbAnnonces: annonces.length,
    prixMoyen,
    prixMin,
    prixMax,
    prixM2Moyen,
    surfaceMoyenne,
    meilleurRapportId,
    moinsChererId: moinsChere.id,
    meilleurDPEId: meilleurDPE.dpe !== 'NC' ? meilleurDPE.id : undefined,
  }
}
