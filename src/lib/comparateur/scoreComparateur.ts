/**
 * Moteur de Scoring Professionnel pour le Comparateur
 * 
 * Score unifié basé sur 11 axes pondérés comme un professionnel immobilier :
 * 
 * 1. Prix vs Marché (20%) - DVF données
 * 2. Rendement locatif (15%) - estimation automatique (0 si DPE G, interdit location)
 * 3. Performance énergétique (12%) - DPE + coût énergie estimé
 * 4. Emplacement / quartier (13%) - OpenStreetMap
 * 5. Transports (7%) - OpenStreetMap desserte transports
 * 6. État du bien / travaux (10%) - année construction + DPE
 * 7. Charges & fiscalité (8%) - charges copro + taxe foncière
 * 8. Risques naturels (5%) - Géorisques
 * 9. Surface & agencement (4%) - rapport surface/pièces
 * 10. Équipements & confort (4%) - parking, balcon, ascenseur...
 * 11. Potentiel plus-value (2%) - état + quartier + tendance
 * 
 * Chaque axe note de 0 à 100, le score final est la moyenne pondérée.
 * Si un axe n'a pas de données, son poids est redistribué.
 */

import {
    type AxeScoring,
    BUDGET_TRAVAUX_DPE,
    COUT_ENERGIE_M2_AN,
    COUT_ENERGIE_MAX_RATIO,
    DEPTS_GRANDE_COURONNE,
    DEPTS_GRANDES_METROPOLES,
    DEPTS_PETITE_COURONNE,
    DEPTS_VILLES_MOYENNES,
    DESCRIPTIONS_AXES,
    ENERGIE_WEIGHTS,
    EQUIPEMENTS_SCORING,
    LABELS_AXES,
    POIDS_AXES,
    RATIO_LOYER_ZONE,
    SCORE_DPE,
    SCORE_GES,
    SEUILS_PRIX_MARCHE,
    SEUILS_SURFACE,
    VETUSTE_SEUILS
} from '@/config/scoring.config'
import type { Annonce, ClasseDPE } from '@/types/annonces'

// Re-export the type so external consumers don't need to change imports
export type { AxeScoring }

// ============================================
// TYPES
// ============================================

/** Résultat d'un axe individuel */
export interface ResultatAxe {
  axe: AxeScoring
  label: string
  score: number // 0-100
  poids: number // Poids effectif (redistribué si données manquantes)
  disponible: boolean // false si pas assez de données
  detail: string // Explication courte
  impact: 'positif' | 'neutre' | 'negatif'
}

/** Point d'analyse (avantage, vigilance ou conseil) */
export interface PointAnalysePro {
  texte: string
  detail?: string
  type: 'avantage' | 'attention' | 'conseil'
  axe: AxeScoring
  impact: number // Points gagnés/perdus
}

/** Recommandation pro finale */
export type NiveauRecommandation =
  | 'fortement_recommande'
  | 'recommande'
  | 'a_etudier'
  | 'prudence'
  | 'deconseille'

/**
 * Profil de scoring adaptatif — permet à l'utilisateur de pondérer ses priorités
 * Chaque valeur est un multiplicateur (1 = normal, 2 = prioritaire, 0.5 = moins important)
 */
export type ProfilScoringId = 'equilibre' | 'investisseur' | 'famille' | 'premier_achat' | 'eco' | 'personnalise'

export interface ProfilScoring {
  id: ProfilScoringId
  label: string
  description: string
  /** Multiplicateurs par axe (1 = neutre, >1 = boost, <1 = réduire) */
  multiplicateurs: Partial<Record<AxeScoring, number>>
}

/** Profils prédéfinis */
export const PROFILS_SCORING: ProfilScoring[] = [
  {
    id: 'equilibre',
    label: 'Équilibré',
    description: 'Pondération professionnelle standard',
    multiplicateurs: {},
  },
  {
    id: 'investisseur',
    label: 'Investisseur',
    description: 'Priorité au rendement et à la plus-value',
    multiplicateurs: { rendement: 2.5, plusValue: 3, prixMarche: 1.5, charges: 1.5, emplacement: 0.7, equipements: 0.5, surface: 0.5 },
  },
  {
    id: 'famille',
    label: 'Famille',
    description: 'Espace, école, sécurité, calme',
    multiplicateurs: { surface: 2.5, emplacement: 1.8, risques: 1.5, transports: 1.3, equipements: 1.5, rendement: 0.3, plusValue: 0.3 },
  },
  {
    id: 'premier_achat',
    label: 'Premier achat',
    description: 'Budget serré, bon rapport qualité-prix',
    multiplicateurs: { prixMarche: 2, charges: 1.8, etatBien: 1.5, transports: 1.3, rendement: 0.5, plusValue: 0.5 },
  },
  {
    id: 'eco',
    label: 'Éco-responsable',
    description: 'Performance énergétique et environnement',
    multiplicateurs: { energie: 3, risques: 1.5, emplacement: 1.3, charges: 1.3, rendement: 0.5, plusValue: 0.3 },
  },
]

/** Résultat complet du scoring pour une annonce */
export interface ScoreComparateurResult {
  annonceId: string
  /** Score global 0-100 */
  scoreGlobal: number
  /** Détail par axe */
  axes: ResultatAxe[]
  /** Points d'analyse */
  points: PointAnalysePro[]
  /** Verdict texte */
  verdict: string
  /** Niveau de recommandation */
  recommandation: NiveauRecommandation
  /** Conseil personnalisé */
  conseilPerso: string
  /** Confiance du score (% d'axes avec données) */
  confiance: number
  /** Données calculées utiles pour l'UI */
  estimations: {
    loyerMensuelEstime?: number
    rendementBrut?: number
    coutEnergieAnnuel?: number
    budgetTravauxEstime?: number
  }
}

/** Données enrichies externes (DVF, Géorisques, OSM) */
export interface DonneesEnrichiesScoring {
  marche?: {
    success: boolean
    ecartPrixM2?: number
    verdict?: 'excellent' | 'bon' | 'correct' | 'cher' | 'tres_cher'
    evolution12Mois?: number
    prixM2MedianMarche?: number
    nbTransactions?: number
  }
  risques?: {
    success: boolean
    /** Score de risque 0-100 (100 = sûr, 0 = très risqué) */
    scoreRisque?: number
    verdict?: 'sûr' | 'vigilance' | 'risqué'
    zoneInondable?: boolean
    niveauRadon?: number
  }
  quartier?: {
    success: boolean
    /** Score global quartier 0-100 (pondéré OSM) */
    scoreQuartier?: number
    /** Score transports 0-100 */
    transports?: number
    /** Score commerces 0-100 */
    commerces?: number
    /** Score écoles/éducation 0-100 */
    ecoles?: number
    /** Score santé 0-100 */
    sante?: number
    /** Score espaces verts 0-100 */
    espaceVerts?: number
    transportsProches?: Array<{ type: string; typeTransport: string; nom: string; distance: number; lat?: number; lon?: number; lignes?: string[]; operateur?: string; couleur?: string }>
    /** Comptages bruts de POIs par catégorie (rayon 800m) */
    counts?: {
      transport: number
      commerce: number
      education: number
      sante: number
      loisirs: number
      vert: number
    }
  }
  communeInfos?: {
    success: boolean
    nomCommune?: string
    population?: number | null
    surfaceKm2?: number | null
    densitePopulation?: number | null
    revenuMensuel?: number | null
    ensoleillement?: number | null
    departement?: string
    counts?: { education: number | null; commerce: number | null; sante: number | null; transport: number | null; loisirs: number | null } | null
  }
}

// ============================================
// CONSTANTES — importées de @/config/scoring.config
// ============================================

/**
 * Estimation du budget travaux selon l'année de construction et la classe DPE
 * Sources croisées : données rénovation ADEME + retours courtiers
 */
function estimerBudgetTravaux(anneeConstruction?: number, dpe?: ClasseDPE, surface?: number): number {
  if (!surface) return 0
  
  let coutM2 = 0

  // Composante vétusté (âge du bâtiment) — seuils depuis scoring.config
  // Si année inconnue : on déduit une fourchette via le DPE
  // Un DPE A/B/C suggère un bâtiment récent ou rénové → pas de surcoût vétusté par défaut
  const annee = anneeConstruction
    || (dpe && ['A', 'B', 'C'].includes(dpe) ? 2012 : undefined)

  if (annee !== undefined) {
    for (const seuil of VETUSTE_SEUILS) {
      if (annee < seuil.avantAnnee) {
        coutM2 += seuil.coutM2
        break
      }
    }
  } else {
    // Ni année ni bon DPE → hypothèse prudente (deuxième seuil le plus bas)
    coutM2 += 100
  }

  // Composante DPE (isolation thermique) — seuils depuis scoring.config
  coutM2 += BUDGET_TRAVAUX_DPE[dpe ?? 'NC']

  return Math.round(coutM2 * surface)
}

/**
 * Estimation du loyer mensuel basé sur le prix/m² marché et le ratio rendement zone
 * 
 * Ratio loyer/prix mensuel moyen en France :
 * - Paris intra : 0.25-0.30% du prix/mois
 * - Grande couronne / grandes villes : 0.35-0.45%
 * - Villes moyennes : 0.45-0.55%
 * - Petites villes / rural : 0.55-0.70%
 * 
 * On utilise le code postal pour approximer la zone
 */
function estimerLoyerMensuel(prix: number, codePostal: string): number {
  // Guard: code postal vide ou invalide → fallback moyenne nationale
  if (!codePostal || codePostal.length < 2) {
    return Math.round(prix * RATIO_LOYER_ZONE.moyenneNationale)
  }

  const dept = codePostal.substring(0, 2)
  const cp = parseInt(dept)
  
  let ratioMensuel: number

  if (dept === '75') {
    ratioMensuel = RATIO_LOYER_ZONE.paris
  } else if ((DEPTS_PETITE_COURONNE as readonly number[]).includes(cp)) {
    ratioMensuel = RATIO_LOYER_ZONE.petiteCouronne
  } else if ((DEPTS_GRANDE_COURONNE as readonly number[]).includes(cp)) {
    ratioMensuel = RATIO_LOYER_ZONE.grandeCouronne
  } else if ((DEPTS_GRANDES_METROPOLES as readonly string[]).includes(dept)) {
    ratioMensuel = RATIO_LOYER_ZONE.grandesMetropoles
  } else if ((DEPTS_VILLES_MOYENNES as readonly string[]).includes(dept)) {
    ratioMensuel = RATIO_LOYER_ZONE.villesMoyennes
  } else if (dept === '97') {
    ratioMensuel = RATIO_LOYER_ZONE.domTom
  } else {
    ratioMensuel = RATIO_LOYER_ZONE.rural
  }

  return Math.round(prix * ratioMensuel)
}

/**
 * Estimation de loyer améliorée v2
 * Prend en compte : zone géographique, surface, type de bien, DPE, marché DVF
 * 
 * @param annonce - L'annonce complète
 * @param enrichi - Données enrichies (DVF optionnel)
 * @returns Loyer mensuel estimé en euros
 */
export function estimerLoyerMensuelV2(
  annonce: Annonce,
  enrichi?: DonneesEnrichiesScoring
): { loyerEstime: number; methode: 'dvf' | 'ratio' | 'ratio_ajuste'; confiance: number } {
  // 1. Ratio de base par zone (méthode v1)
  const loyerBase = estimerLoyerMensuel(annonce.prix, annonce.codePostal)
  
  // 2. Ajustements selon caractéristiques du bien
  let multiplicateur = 1.0

  // Surface : les petites surfaces ont un meilleur rendement locatif
  if (annonce.surface < 25) multiplicateur *= 1.20  // Studios/T1 : +20%
  else if (annonce.surface < 40) multiplicateur *= 1.10  // T2 : +10%
  else if (annonce.surface > 120) multiplicateur *= 0.85 // Très grands : -15%
  else if (annonce.surface > 80) multiplicateur *= 0.92  // Grands : -8%

  // Type : maisons ont un rendement légèrement inférieur
  if (annonce.type === 'maison') multiplicateur *= 0.95

  // DPE : les passoires thermiques se louent moins bien (loi Climat)
  if (annonce.dpe === 'G') multiplicateur *= 0  // Interdit à la location depuis 2025 — loyer = 0
  else if (annonce.dpe === 'F') multiplicateur *= 0.88 // Interdit dès 2028
  else if (annonce.dpe === 'E') multiplicateur *= 0.95 // Interdit dès 2034
  else if (annonce.dpe === 'A' || annonce.dpe === 'B') multiplicateur *= 1.05 // Premium

  // Équipements premium
  if (annonce.balconTerrasse) multiplicateur *= 1.03
  if (annonce.parking) multiplicateur *= 1.04

  const loyerAjuste = Math.round(loyerBase * multiplicateur)

  // 3. Si données DVF disponibles, estimation croisée par prix/m² marché
  if (enrichi?.marche?.success && enrichi.marche.prixM2MedianMarche) {
    const prixM2Marche = enrichi.marche.prixM2MedianMarche
    // Rendement brut typique de la zone
    const loyerBase2 = estimerLoyerMensuel(prixM2Marche * annonce.surface, annonce.codePostal)
    // Moyenne pondérée : 60% DVF, 40% ratio ajusté
    const loyerDVF = Math.round(loyerBase2 * multiplicateur * 0.6 + loyerAjuste * 0.4)
    return { loyerEstime: loyerDVF, methode: 'dvf', confiance: 75 }
  }

  return { loyerEstime: loyerAjuste, methode: 'ratio_ajuste', confiance: 50 }
}

// ============================================
// SCORING PAR AXE
// ============================================

/**
 * Axe 1 : Prix vs Marché (20%)
 * Compare le prix/m² au prix médian DVF du secteur
 */
export function scorerPrixMarche(
  annonce: Annonce,
  enrichi?: DonneesEnrichiesScoring
): ResultatAxe & { points: PointAnalysePro[] } {
  const points: PointAnalysePro[] = []
  
  if (!enrichi?.marche?.success || enrichi.marche.ecartPrixM2 === undefined) {
    return {
      axe: 'prixMarche',
      label: LABELS_AXES.prixMarche,
      score: 50,
      poids: POIDS_AXES.prixMarche,
      disponible: false,
      detail: 'Données DVF non disponibles',
      impact: 'neutre',
      points: []
    }
  }

  const ecart = enrichi.marche.ecartPrixM2
  // Score linéaire : -30% = 100, 0% = score neutre, +30% = 0
  let score = Math.round(SEUILS_PRIX_MARCHE.scoreNeutre - (ecart * SEUILS_PRIX_MARCHE.penteParPourcent))
  score = Math.max(0, Math.min(100, score))

  let detail: string
  let impact: ResultatAxe['impact']

  if (ecart <= -15) {
    detail = `${Math.abs(ecart).toFixed(0)}% sous le marché — excellente affaire`
    impact = 'positif'
    points.push({
      texte: 'Prix très attractif vs marché',
      detail: `${Math.abs(ecart).toFixed(0)}% sous la médiane DVF du secteur`,
      type: 'avantage',
      axe: 'prixMarche',
      impact: score - 50
    })
  } else if (ecart <= -5) {
    detail = `${Math.abs(ecart).toFixed(0)}% sous le marché — bon prix`
    impact = 'positif'
    points.push({
      texte: 'Prix en dessous du marché',
      detail: `${Math.abs(ecart).toFixed(0)}% sous la médiane du secteur`,
      type: 'avantage',
      axe: 'prixMarche',
      impact: score - 50
    })
  } else if (ecart <= 5) {
    detail = `Prix aligné au marché (${ecart > 0 ? '+' : ''}${ecart.toFixed(0)}%)`
    impact = 'neutre'
    points.push({
      texte: 'Prix cohérent avec le marché',
      detail: `Écart de ${ecart > 0 ? '+' : ''}${ecart.toFixed(0)}% vs médiane DVF du secteur${enrichi.marche.prixM2MedianMarche ? ` (${Math.round(enrichi.marche.prixM2MedianMarche).toLocaleString('fr-FR')} €/m²)` : ''} — prix justifié`,
      type: 'conseil',
      axe: 'prixMarche',
      impact: 0
    })
  } else if (ecart <= 15) {
    detail = `+${ecart.toFixed(0)}% au-dessus du marché — marge de négo`
    impact = 'negatif'
    points.push({
      texte: 'Prix légèrement au-dessus du marché',
      detail: `+${ecart.toFixed(0)}% vs médiane — négociation possible`,
      type: 'conseil',
      axe: 'prixMarche',
      impact: score - 50
    })
  } else {
    detail = `+${ecart.toFixed(0)}% au-dessus du marché — surévalué`
    impact = 'negatif'
    points.push({
      texte: 'Prix significativement au-dessus du marché',
      detail: `+${ecart.toFixed(0)}% au-dessus de la médiane DVF`,
      type: 'attention',
      axe: 'prixMarche',
      impact: score - 50
    })
  }

  return {
    axe: 'prixMarche',
    label: LABELS_AXES.prixMarche,
    score,
    poids: POIDS_AXES.prixMarche,
    disponible: true,
    detail,
    impact,
    points
  }
}

/**
 * Axe 2 : Rendement locatif (15%)
 * Estimation du rendement brut annuel
 * Pros considèrent : >7% excellent, 5-7% bon, 3-5% moyen, <3% faible
 */
export function scorerRendement(
  annonce: Annonce,
  enrichi?: DonneesEnrichiesScoring
): ResultatAxe & { points: PointAnalysePro[]; loyerEstime: number; rendementBrut: number; methodeLoyer?: string } {
  // DPE G : interdit à la location depuis 2025 (loi Climat & Résilience)
  if (annonce.dpe === 'G') {
    return {
      axe: 'rendement',
      label: LABELS_AXES.rendement,
      score: 0,
      poids: POIDS_AXES.rendement,
      disponible: true,
      detail: 'DPE G — interdit à la location depuis 2025',
      impact: 'negatif',
      points: [{
        texte: 'Location interdite (DPE G)',
        detail: 'Depuis le 1er janvier 2025, les logements classés G sont interdits à la location (loi Climat & Résilience). Rendement locatif impossible sans rénovation énergétique préalable.',
        type: 'attention',
        axe: 'rendement',
        impact: -50
      }],
      loyerEstime: 0,
      rendementBrut: 0,
      methodeLoyer: 'interdit_dpe_g'
    }
  }

  const v2 = estimerLoyerMensuelV2(annonce, enrichi)
  const loyerEstime = v2.loyerEstime
  const rendementBrut = ((loyerEstime * 12) / annonce.prix) * 100

  // Score : 8%+ = 100, 5% = 70, 3% = 40, 1% = 10
  let score: number
  if (rendementBrut >= 8) score = 100
  else if (rendementBrut >= 6) score = 70 + ((rendementBrut - 6) / 2) * 30
  else if (rendementBrut >= 4) score = 45 + ((rendementBrut - 4) / 2) * 25
  else if (rendementBrut >= 2) score = 15 + ((rendementBrut - 2) / 2) * 30
  else score = Math.max(0, rendementBrut * 7.5)
  score = Math.round(Math.max(0, Math.min(100, score)))

  const points: PointAnalysePro[] = []
  let detail: string
  let impact: ResultatAxe['impact']

  if (rendementBrut >= 6) {
    detail = `Rendement brut ${rendementBrut.toFixed(1)}% — très attractif`
    impact = 'positif'
    points.push({
      texte: `Rendement brut estimé : ${rendementBrut.toFixed(1)}%`,
      detail: `Loyer estimé ~${loyerEstime} €/mois → ${(loyerEstime * 12).toLocaleString('fr-FR')} €/an`,
      type: 'avantage',
      axe: 'rendement',
      impact: score - 50
    })
  } else if (rendementBrut >= 4) {
    detail = `Rendement brut ${rendementBrut.toFixed(1)}% — correct`
    impact = 'neutre'
    points.push({
      texte: `Rendement correct : ${rendementBrut.toFixed(1)}%`,
      detail: `Loyer estimé ~${loyerEstime} €/mois (${(loyerEstime * 12).toLocaleString('fr-FR')} €/an) — complément de revenu raisonnable`,
      type: 'conseil',
      axe: 'rendement',
      impact: 0
    })
  } else if (rendementBrut >= 2) {
    detail = `Rendement brut ${rendementBrut.toFixed(1)}% — faible`
    impact = 'negatif'
    points.push({
      texte: `Rendement locatif faible : ${rendementBrut.toFixed(1)}%`,
      detail: `Loyer estimé ~${loyerEstime} €/mois — investissement peu rentable`,
      type: 'conseil',
      axe: 'rendement',
      impact: score - 50
    })
  } else {
    detail = `Rendement brut ${rendementBrut.toFixed(1)}% — non rentable`
    impact = 'negatif'
    points.push({
      texte: `Rendement très faible : ${rendementBrut.toFixed(1)}%`,
      detail: 'Investissement locatif non recommandé sur ce bien',
      type: 'attention',
      axe: 'rendement',
      impact: score - 50
    })
  }

  return {
    axe: 'rendement',
    label: LABELS_AXES.rendement,
    score,
    poids: POIDS_AXES.rendement,
    disponible: true,
    detail,
    impact,
    points,
    loyerEstime,
    rendementBrut,
    methodeLoyer: v2.methode
  }
}

/**
 * Axe 3 : Performance énergétique (12%)
 * Combine DPE + coût énergie + GES (si disponible)
 * - Avec GES : 40% DPE + 30% coût + 30% GES
 * - Sans GES : 70% DPE + 30% coût (rétro-compatible)
 */
export function scorerEnergie(
  annonce: Annonce
): ResultatAxe & { points: PointAnalysePro[]; coutAnnuel: number } {
  const scoreDpe = SCORE_DPE[annonce.dpe] ?? 40
  const coutM2 = COUT_ENERGIE_M2_AN[annonce.dpe] ?? 20
  const coutAnnuel = Math.round(coutM2 * annonce.surface)

  // Score coût/m² relatif (DPE G max = 38€/m²/an → score 0)
  const scoreCout = Math.round(Math.max(0, Math.min(100, 100 - (coutM2 / COUT_ENERGIE_MAX_RATIO))))

  // Intégrer le GES si disponible et différent de NC
  const hasGES = annonce.ges && annonce.ges !== 'NC'
  let score: number
  if (hasGES) {
    const scoreGes = SCORE_GES[annonce.ges!] ?? 40
    const w = ENERGIE_WEIGHTS.withGES
    score = Math.round(scoreDpe * w.dpe + scoreCout * w.cout + scoreGes * w.ges)
  } else {
    const w = ENERGIE_WEIGHTS.withoutGES
    score = Math.round(scoreDpe * w.dpe + scoreCout * w.cout)
  }

  const points: PointAnalysePro[] = []
  let detail: string
  let impact: ResultatAxe['impact']

  if (annonce.dpe === 'NC') {
    detail = 'DPE non communiqué — prudence'
    impact = 'negatif'
    points.push({
      texte: 'DPE non renseigné',
      detail: 'Demandez le diagnostic au vendeur avant toute visite',
      type: 'conseil',
      axe: 'energie',
      impact: -10
    })
  } else if (['A', 'B'].includes(annonce.dpe)) {
    detail = `DPE ${annonce.dpe} — ~${coutAnnuel} €/an d'énergie`
    impact = 'positif'
    points.push({
      texte: `Excellente performance énergétique (${annonce.dpe})`,
      detail: `Facture estimée ~${coutAnnuel} €/an — aucun travaux énergie`,
      type: 'avantage',
      axe: 'energie',
      impact: score - 50
    })
  } else if (['C', 'D'].includes(annonce.dpe)) {
    detail = `DPE ${annonce.dpe} — ~${coutAnnuel} €/an d'énergie`
    impact = annonce.dpe === 'C' ? 'positif' : 'neutre'
    if (annonce.dpe === 'C') {
      points.push({
        texte: `Bonne performance énergétique (DPE C)`,
        detail: `~${coutAnnuel} €/an d'énergie (~${Math.round(coutAnnuel / 12)} €/mois) — conforme aux standards actuels`,
        type: 'avantage',
        axe: 'energie',
        impact: score - 50
      })
    } else {
      points.push({
        texte: `Performance énergétique correcte (DPE D)`,
        detail: `~${coutAnnuel} €/an d'énergie (~${Math.round(coutAnnuel / 12)} €/mois) — amélioration possible via isolation`,
        type: 'conseil',
        axe: 'energie',
        impact: 0
      })
    }
  } else if (annonce.dpe === 'E') {
    detail = `DPE E — ~${coutAnnuel} €/an d'énergie`
    impact = 'negatif'
    points.push({
      texte: `Performance énergétique moyenne (${annonce.dpe})`,
      detail: `~${coutAnnuel} €/an d'énergie — isolation à améliorer`,
      type: 'conseil',
      axe: 'energie',
      impact: score - 50
    })
  } else {
    // F ou G
    detail = `Passoire thermique (${annonce.dpe}) — ~${coutAnnuel} €/an`
    impact = 'negatif'
    points.push({
      texte: `Passoire thermique (DPE ${annonce.dpe})`,
      detail: `~${coutAnnuel} €/an d'énergie. Travaux obligatoires. Location interdite.`,
      type: 'attention',
      axe: 'energie',
      impact: score - 50
    })
  }

  // Point d'information GES (si disponible)
  if (hasGES) {
    const gesClass = annonce.ges!
    if (['F', 'G'].includes(gesClass)) {
      points.push({
        texte: `GES ${gesClass} — fortes émissions carbone`,
        detail: 'Impact environnemental élevé, peut peser sur la valorisation future',
        type: 'attention',
        axe: 'energie',
        impact: -10
      })
    } else if (['A', 'B'].includes(gesClass)) {
      points.push({
        texte: `GES ${gesClass} — faibles émissions carbone`,
        detail: 'Bien compatible avec les normes environnementales futures',
        type: 'avantage',
        axe: 'energie',
        impact: 5
      })
    }
  }

  return {
    axe: 'energie',
    label: LABELS_AXES.energie,
    score: Math.max(0, Math.min(100, score)),
    poids: POIDS_AXES.energie,
    disponible: true,
    detail,
    impact,
    points,
    coutAnnuel
  }
}

/**
 * Axe 4 : Emplacement (15%)
 * Score quartier OSM — HORS transports pour éviter le double-comptage
 * (les transports sont scorés séparément dans l'axe 5)
 * 
 * Utilise les sous-scores individuels : commerces, écoles, santé, espaces verts
 */
export function scorerEmplacement(
  enrichi?: DonneesEnrichiesScoring
): ResultatAxe & { points: PointAnalysePro[] } {
  const points: PointAnalysePro[] = []

  if (!enrichi?.quartier?.success) {
    return {
      axe: 'emplacement',
      label: LABELS_AXES.emplacement,
      score: 50,
      poids: POIDS_AXES.emplacement,
      disponible: false,
      detail: 'Score quartier non disponible',
      impact: 'neutre',
      points: []
    }
  }

  // Compute emplacement score from non-transport sub-scores only
  // This avoids double-counting with scorerTransports (axe 5)
  const subScores: Array<{ score: number; poids: number }> = []
  const q = enrichi.quartier
  if (q.commerces !== undefined) subScores.push({ score: q.commerces, poids: 30 })
  if (q.ecoles !== undefined) subScores.push({ score: q.ecoles, poids: 25 })
  if (q.sante !== undefined) subScores.push({ score: q.sante, poids: 25 })
  if (q.espaceVerts !== undefined) subScores.push({ score: q.espaceVerts, poids: 20 })

  // Fallback to scoreQuartier if no sub-scores available
  let scoreQ: number
  if (subScores.length === 0) {
    scoreQ = enrichi.quartier.scoreQuartier ?? 50
  } else {
    const totalPoids = subScores.reduce((sum, s) => sum + s.poids, 0)
    scoreQ = Math.round(subScores.reduce((sum, s) => sum + s.score * s.poids, 0) / totalPoids)
  }

  const score = Math.max(0, Math.min(100, scoreQ))

  let detail: string
  let impact: ResultatAxe['impact']

  if (scoreQ >= 75) {
    detail = `Quartier très bien desservi (${scoreQ}/100)`
    impact = 'positif'
    const atouts: string[] = []
    if (enrichi.quartier?.transports !== undefined && enrichi.quartier.transports >= 60) atouts.push('transports')
    if (enrichi.quartier?.commerces !== undefined && enrichi.quartier.commerces >= 60) atouts.push('commerces')
    if (enrichi.quartier?.ecoles !== undefined && enrichi.quartier.ecoles >= 60) atouts.push('écoles')
    if (enrichi.quartier?.sante !== undefined && enrichi.quartier.sante >= 60) atouts.push('santé')
    if (enrichi.quartier?.espaceVerts !== undefined && enrichi.quartier.espaceVerts >= 60) atouts.push('espaces verts')
    points.push({
      texte: 'Emplacement premium',
      detail: atouts.length > 0
        ? `Score ${scoreQ}/100 — excellente couverture en ${atouts.join(', ')}`
        : `Score quartier ${scoreQ}/100 — commerces, écoles, santé à proximité`,
      type: 'avantage',
      axe: 'emplacement',
      impact: score - 50
    })
  } else if (scoreQ >= 50) {
    detail = `Quartier correctement équipé (${scoreQ}/100)`
    impact = 'neutre'
    const details: string[] = []
    if (enrichi.quartier?.transports !== undefined && enrichi.quartier.transports >= 50) details.push('transports')
    if (enrichi.quartier?.commerces !== undefined && enrichi.quartier.commerces >= 50) details.push('commerces')
    if (enrichi.quartier?.ecoles !== undefined && enrichi.quartier.ecoles >= 50) details.push('écoles')
    if (enrichi.quartier?.sante !== undefined && enrichi.quartier.sante >= 50) details.push('santé')
    if (enrichi.quartier?.espaceVerts !== undefined && enrichi.quartier.espaceVerts >= 50) details.push('espaces verts')
    points.push({
      texte: 'Quartier fonctionnel',
      detail: details.length > 0
        ? `Score ${scoreQ}/100 — points forts : ${details.join(', ')}`
        : `Score quartier ${scoreQ}/100 — services de base accessibles`,
      type: 'conseil',
      axe: 'emplacement',
      impact: 0
    })
  } else if (scoreQ >= 30) {
    detail = `Quartier peu équipé (${scoreQ}/100)`
    impact = 'negatif'
    points.push({
      texte: 'Quartier peu desservi',
      detail: `Score ${scoreQ}/100 — véhicule recommandé, peu de commodités`,
      type: 'conseil',
      axe: 'emplacement',
      impact: score - 50
    })
  } else {
    detail = `Zone isolée (${scoreQ}/100)`
    impact = 'negatif'
    points.push({
      texte: 'Zone très peu équipée',
      detail: `Score ${scoreQ}/100 — dépendance à la voiture, services éloignés`,
      type: 'attention',
      axe: 'emplacement',
      impact: score - 50
    })
  }

  return {
    axe: 'emplacement',
    label: LABELS_AXES.emplacement,
    score,
    poids: POIDS_AXES.emplacement,
    disponible: true,
    detail,
    impact,
    points
  }
}

/**
 * Axe 5 : Transports (8%)
 * Sous-score transports du quartier (OpenStreetMap)
 */
export function scorerTransports(
  enrichi?: DonneesEnrichiesScoring
): ResultatAxe & { points: PointAnalysePro[] } {
  const points: PointAnalysePro[] = []

  if (!enrichi?.quartier?.success || enrichi.quartier.transports === undefined) {
    return {
      axe: 'transports',
      label: LABELS_AXES.transports,
      score: 50,
      poids: POIDS_AXES.transports,
      disponible: false,
      detail: 'Données transports non disponibles',
      impact: 'neutre',
      points: []
    }
  }

  const score = Math.max(0, Math.min(100, enrichi.quartier.transports))

  let detail: string
  let impact: ResultatAxe['impact']

  if (score >= 75) {
    detail = `Très bien desservi en transports (${score}/100)`
    impact = 'positif'
    points.push({
      texte: 'Excellente desserte transports',
      detail: `Score ${score}/100 — transports en commun, gares ou métro à proximité`,
      type: 'avantage',
      axe: 'transports',
      impact: score - 50
    })
  } else if (score >= 50) {
    detail = `Desserte correcte (${score}/100)`
    impact = 'neutre'
    points.push({
      texte: 'Transports accessibles',
      detail: `Score ${score}/100 — quelques lignes de bus ou gare accessible`,
      type: 'conseil',
      axe: 'transports',
      impact: 0
    })
  } else if (score >= 25) {
    detail = `Peu de transports (${score}/100)`
    impact = 'negatif'
    points.push({
      texte: 'Desserte transports limitée',
      detail: `Score ${score}/100 — véhicule conseillé pour les déplacements quotidiens`,
      type: 'attention',
      axe: 'transports',
      impact: score - 50
    })
  } else {
    detail = `Zone très peu desservie (${score}/100)`
    impact = 'negatif'
    points.push({
      texte: 'Quasi aucun transport en commun',
      detail: `Score ${score}/100 — véhicule indispensable, impact sur la revente`,
      type: 'attention',
      axe: 'transports',
      impact: score - 50
    })
  }

  return {
    axe: 'transports',
    label: LABELS_AXES.transports,
    score,
    poids: POIDS_AXES.transports,
    disponible: true,
    detail,
    impact,
    points
  }
}

/**
 * Axe 6 : État du bien / Travaux (10%)
 * Basé sur l'année de construction + DPE
 */
export function scorerEtatBien(
  annonce: Annonce
): ResultatAxe & { points: PointAnalysePro[]; budgetTravaux: number } {
  const budgetTravaux = estimerBudgetTravaux(
    annonce.anneeConstruction,
    annonce.dpe,
    annonce.surface
  )

  const annee = annonce.anneeConstruction
  const disponible = annee !== undefined || (annonce.dpe !== 'NC')

  // Score : pas de travaux = 100, 50k€+ = 0
  // Normalisé sur le prix du bien (ratio travaux/prix)
  let score: number
  if (annonce.prix > 0 && budgetTravaux > 0) {
    const ratio = (budgetTravaux / annonce.prix) * 100 // % du prix
    // 0% = 100, 5% = 70, 10% = 40, 20% = 10, 30%+ = 0
    if (ratio <= 2) score = 95
    else if (ratio <= 5) score = 70 + ((5 - ratio) / 3) * 25
    else if (ratio <= 10) score = 40 + ((10 - ratio) / 5) * 30
    else if (ratio <= 20) score = 10 + ((20 - ratio) / 10) * 30
    else score = Math.max(0, 10 - (ratio - 20))
  } else {
    score = 80 // Bien récent ou pas de travaux détectés
  }

  // Bonus si construction très récente  
  if (annee && annee >= 2015) {
    score = Math.min(100, score + 15)
  }

  score = Math.round(Math.max(0, Math.min(100, score)))

  const points: PointAnalysePro[] = []
  let detail: string
  let impact: ResultatAxe['impact']

  if (budgetTravaux === 0) {
    detail = annee ? `Construction ${annee} — pas de travaux prévisibles` : 'Aucun travaux majeur détecté'
    impact = 'positif'
    if (annee && annee >= 2012) {
      points.push({
        texte: `Construction récente (${annee})`,
        detail: 'Normes RT 2012+ respectées. Pas de travaux à prévoir.',
        type: 'avantage',
        axe: 'etatBien',
        impact: score - 50
      })
    }
  } else if (budgetTravaux <= 10000) {
    detail = `Travaux légers estimés ~${budgetTravaux.toLocaleString('fr-FR')} €`
    impact = 'neutre'
    points.push({
      texte: `Rafraîchissement léger (~${budgetTravaux.toLocaleString('fr-FR')} €)`,
      detail: annee
        ? `Bâtiment de ${annee} — travaux mineurs cosmétiques, pas de gros œuvre à prévoir`
        : 'Travaux mineurs possibles — pas de rénovation lourde nécessaire',
      type: 'conseil',
      axe: 'etatBien',
      impact: 0
    })
  } else if (budgetTravaux <= 30000) {
    detail = `Budget travaux estimé ~${budgetTravaux.toLocaleString('fr-FR')} €`
    impact = 'negatif'
    points.push({
      texte: `Travaux estimés ~${budgetTravaux.toLocaleString('fr-FR')} €`,
      detail: annee
        ? `Bâtiment de ${annee} — prévoir rénovation énergie et mise aux normes`
        : 'Prévoir rénovation énergie et potentielle mise aux normes',
      type: 'conseil',
      axe: 'etatBien',
      impact: score - 50
    })
  } else {
    detail = `Travaux importants ~${budgetTravaux.toLocaleString('fr-FR')} €`
    impact = 'negatif'
    points.push({
      texte: `Gros travaux estimés ~${budgetTravaux.toLocaleString('fr-FR')} €`,
      detail: `Budget conséquent. Coût total réel = prix + ${budgetTravaux.toLocaleString('fr-FR')} €`,
      type: 'attention',
      axe: 'etatBien',
      impact: score - 50
    })
  }

  return {
    axe: 'etatBien',
    label: LABELS_AXES.etatBien,
    score,
    poids: POIDS_AXES.etatBien,
    disponible,
    detail,
    impact,
    points,
    budgetTravaux
  }
}

/**
 * Axe 7 : Charges & fiscalité (8%)
 * Charges copro + taxe foncière ramenées au ratio prix
 */
export function scorerCharges(
  annonce: Annonce
): ResultatAxe & { points: PointAnalysePro[] } {
  const charges = annonce.chargesMensuelles
  const taxe = annonce.taxeFonciere
  const points: PointAnalysePro[] = []

  // Distinguer : undefined = pas de données, 0 = confirmé aucune charge (maison sans copro)
  const chargesInconnues = charges === undefined
  const taxeInconnue = taxe === undefined

  if (chargesInconnues && taxeInconnue) {
    return {
      axe: 'charges',
      label: LABELS_AXES.charges,
      score: 50,
      poids: POIDS_AXES.charges,
      disponible: false,
      detail: 'Charges et taxe foncière non renseignées',
      impact: 'neutre',
      points: [{
        texte: 'Charges non renseignées',
        detail: 'Demandez les charges de copro et la taxe foncière au vendeur',
        type: 'conseil',
        axe: 'charges',
        impact: 0
      }]
    }
  }

  const chargesAnnuelles = ((charges || 0) * 12) + (taxe || 0)
  // Ratio charges annuelles / prix : <1% = excellent, 1-2% = bien, 2-3% = moyen, >3% = élevé
  const ratio = annonce.prix > 0 ? (chargesAnnuelles / annonce.prix) * 100 : 3

  let score: number
  if (ratio <= 0.5) score = 100
  else if (ratio <= 1) score = 80 + ((1 - ratio) / 0.5) * 20
  else if (ratio <= 2) score = 50 + ((2 - ratio) / 1) * 30
  else if (ratio <= 3) score = 20 + ((3 - ratio) / 1) * 30
  else score = Math.max(0, 20 - (ratio - 3) * 10)
  score = Math.round(Math.max(0, Math.min(100, score)))

  let detail: string
  let impact: ResultatAxe['impact']

  if (ratio <= 1) {
    detail = `Charges maîtrisées (${chargesAnnuelles.toLocaleString('fr-FR')} €/an)`
    impact = 'positif'
    points.push({
      texte: 'Charges maîtrisées',
      detail: `${chargesAnnuelles.toLocaleString('fr-FR')} €/an — ${ratio.toFixed(1)}% du prix du bien`,
      type: 'avantage',
      axe: 'charges',
      impact: score - 50
    })
  } else if (ratio <= 2) {
    detail = `Charges modérées (${chargesAnnuelles.toLocaleString('fr-FR')} €/an)`
    impact = 'neutre'
    const detailParts: string[] = []
    if (charges) detailParts.push(`${charges} €/mois copro`)
    if (taxe) detailParts.push(`${taxe.toLocaleString('fr-FR')} €/an taxe foncière`)
    points.push({
      texte: `Charges dans la moyenne (${ratio.toFixed(1)}% du prix)`,
      detail: `${chargesAnnuelles.toLocaleString('fr-FR')} €/an${detailParts.length > 0 ? ` (${detailParts.join(' + ')})` : ''} — budget courant maîtrisé`,
      type: 'conseil',
      axe: 'charges',
      impact: 0
    })
  } else {
    detail = `Charges élevées (${chargesAnnuelles.toLocaleString('fr-FR')} €/an)`
    impact = 'negatif'
    points.push({
      texte: `Charges élevées : ${chargesAnnuelles.toLocaleString('fr-FR')} €/an`,
      detail: `${ratio.toFixed(1)}% du prix — impacte la rentabilité`,
      type: 'attention',
      axe: 'charges',
      impact: score - 50
    })
  }

  return {
    axe: 'charges',
    label: LABELS_AXES.charges,
    score,
    poids: POIDS_AXES.charges,
    disponible: true,
    detail,
    impact,
    points
  }
}

/**
 * Axe 8 : Surface & agencement (5%)
 * Ratio surface/pièces, surface totale, chambres
 */
export function scorerSurface(
  annonce: Annonce
): ResultatAxe & { points: PointAnalysePro[] } {
  const points: PointAnalysePro[] = []

  // Score composite
  let score = 50

  // 1. Surface par pièce (confort : 20m²+ = bon, 15m² = moyen, <12m² = serré)
  const surfacePiece = annonce.pieces > 0 ? annonce.surface / annonce.pieces : annonce.surface
  if (surfacePiece >= 22) {
    score += 20
    points.push({
      texte: `Pièces spacieuses (${Math.round(surfacePiece)} m²/pièce)`,
      detail: `${annonce.surface} m² pour ${annonce.pieces} pièce${annonce.pieces > 1 ? 's' : ''} — confort au-dessus de la norme`,
      type: 'avantage',
      axe: 'surface',
      impact: 10
    })
  } else if (surfacePiece >= 18) {
    score += 10
    points.push({
      texte: `Agencement équilibré (${Math.round(surfacePiece)} m²/pièce)`,
      detail: `${annonce.surface} m² pour ${annonce.pieces} pièces — volumes corrects`,
      type: 'conseil',
      axe: 'surface',
      impact: 0
    })
  } else if (surfacePiece < 13) {
    score -= 15
    points.push({
      texte: `Pièces étroites (${Math.round(surfacePiece)} m²/pièce)`,
      detail: `${annonce.surface} m² répartis sur ${annonce.pieces} pièces — agencement contraint`,
      type: 'attention',
      axe: 'surface',
      impact: -10
    })
  } else {
    // 13-18 m²/pièce, range standard
    points.push({
      texte: `Surface standard (${Math.round(surfacePiece)} m²/pièce)`,
      detail: `${annonce.surface} m² pour ${annonce.pieces} pièces — agencement typique`,
      type: 'conseil',
      axe: 'surface',
      impact: 0
    })
  }

  // 2. Surface absolue (bonus/malus via config)
  if (annonce.surface >= SEUILS_SURFACE.grandeMin) {
    score += SEUILS_SURFACE.grandeBonus
    points.push({
      texte: 'Grande surface',
      detail: `${annonce.surface} m² — confort d'espace au-dessus de la moyenne`,
      type: 'avantage',
      axe: 'surface',
      impact: 10
    })
  } else if (annonce.surface <= SEUILS_SURFACE.petiteMax) {
    score += SEUILS_SURFACE.petiteMalus
    points.push({
      texte: 'Surface très réduite',
      detail: `${annonce.surface} m² — espace limité`,
      type: 'attention',
      axe: 'surface',
      impact: -10
    })
  }

  // 3. Nombre de chambres (absolu)
  if (annonce.chambres >= 3) {
    score += 5
  }

  // 4. Orientation (bonus si renseigné et favorable)
  if (annonce.orientation) {
    const ori = annonce.orientation.toLowerCase()
    if (ori.includes('sud') && !ori.includes('nord')) {
      score += 10
      points.push({
        texte: `Orientation ${annonce.orientation}`,
        detail: 'Luminosité optimale, réduction des charges de chauffage',
        type: 'avantage',
        axe: 'surface',
        impact: 10
      })
    } else if (ori.includes('nord') && !ori.includes('sud')) {
      score -= 5
    }
  }

  score = Math.round(Math.max(0, Math.min(100, score)))

  const detail = `${annonce.surface} m² — ${annonce.pieces}P${annonce.chambres > 0 ? ` / ${annonce.chambres} ch.` : ''} — ${Math.round(surfacePiece)} m²/pièce`
  const impact: ResultatAxe['impact'] = score >= 65 ? 'positif' : score >= 40 ? 'neutre' : 'negatif'

  return {
    axe: 'surface',
    label: LABELS_AXES.surface,
    score,
    poids: POIDS_AXES.surface,
    disponible: true,
    detail,
    impact,
    points
  }
}

/**
 * Axe 9 : Équipements & confort (4%)
 * Parking, balcon, cave, ascenseur, SDB, étage
 *
 * Distingue `undefined` (pas de données → score neutre 50)
 * de `false` (confirmé absent → reste à la base 40).
 */
export function scorerEquipements(
  annonce: Annonce
): ResultatAxe & { points: PointAnalysePro[] } {
  const points: PointAnalysePro[] = []

  // Détecter si on a des données sur les booléens équipements
  const boolFields = [annonce.parking, annonce.balconTerrasse, annonce.cave, annonce.ascenseur]
  const hasAnyData = boolFields.some(v => v !== undefined)

  // Base : 50 (neutre) si aucune donnée, 40 (conservatrice) si on a des infos
  let score: number = hasAnyData
    ? EQUIPEMENTS_SCORING.baseAvecDonnees
    : EQUIPEMENTS_SCORING.baseIndetermine

  const equips: string[] = []
  if (annonce.parking) { score += EQUIPEMENTS_SCORING.bonus.parking; equips.push('parking') }
  if (annonce.balconTerrasse) { score += EQUIPEMENTS_SCORING.bonus.balconTerrasse; equips.push('balcon/terrasse') }
  if (annonce.cave) { score += EQUIPEMENTS_SCORING.bonus.cave; equips.push('cave') }
  if (annonce.ascenseur) { score += EQUIPEMENTS_SCORING.bonus.ascenseur; equips.push('ascenseur') }
  if (annonce.nbSallesBains && annonce.nbSallesBains >= 2) {
    score += EQUIPEMENTS_SCORING.bonus.multiSDB
    equips.push(`${annonce.nbSallesBains} SDB`)
  }

  // Malus étage élevé sans ascenseur
  if (annonce.type === 'appartement' && annonce.etage !== undefined) {
    if (annonce.etage >= EQUIPEMENTS_SCORING.seuilEtageSansAscenseur && !annonce.ascenseur) {
      score += EQUIPEMENTS_SCORING.malus.etageEleveSansAscenseur
      points.push({
        texte: `${annonce.etage}e étage sans ascenseur`,
        detail: 'Impact quotidien et sur la revente — décote significative',
        type: 'attention',
        axe: 'equipements',
        impact: EQUIPEMENTS_SCORING.malus.etageEleveSansAscenseur
      })
    } else if (annonce.etage >= EQUIPEMENTS_SCORING.seuilEtageAvecAscenseur && annonce.ascenseur) {
      score += EQUIPEMENTS_SCORING.bonus.etageEleveAvecAscenseur
      points.push({
        texte: 'Étage élevé avec ascenseur',
        detail: 'Luminosité, calme et vue dégagée',
        type: 'avantage',
        axe: 'equipements',
        impact: EQUIPEMENTS_SCORING.bonus.etageEleveAvecAscenseur
      })
    } else if (annonce.etage === 0) {
      score += EQUIPEMENTS_SCORING.malus.rezDeChaussee
    }
  }

  score = Math.round(Math.max(0, Math.min(100, score)))

  if (equips.length >= 3) {
    points.push({
      texte: 'Bien équipé',
      detail: `${equips.join(', ')} — confort au quotidien`,
      type: 'avantage',
      axe: 'equipements',
      impact: 10
    })
  } else if (equips.length >= 1) {
    points.push({
      texte: `Équipement${equips.length > 1 ? 's' : ''} : ${equips.join(', ')}`,
      detail: equips.length === 1
        ? 'Un seul équipement notable — vérifiez les options manquantes (parking, rangement, extérieur)'
        : 'Quelques équipements utiles — le bien reste fonctionnel',
      type: 'conseil',
      axe: 'equipements',
      impact: 0
    })
  } else {
    points.push({
      texte: 'Aucun équipement renseigné',
      detail: 'Vérifiez lors de la visite : parking, rangement, extérieur',
      type: 'conseil',
      axe: 'equipements',
      impact: -10
    })
  }

  const detail = equips.length > 0
    ? `${equips.length} équipement${equips.length > 1 ? 's' : ''} : ${equips.join(', ')}`
    : 'Aucun équipement renseigné'

  return {
    axe: 'equipements',
    label: LABELS_AXES.equipements,
    score,
    poids: POIDS_AXES.equipements,
    disponible: true,
    detail,
    impact: score >= 60 ? 'positif' : score >= 35 ? 'neutre' : 'negatif',
    points
  }
}

/**
 * Axe 10 : Potentiel plus-value (2%)
 * Combinaison : tendance marché + état (travaux = valeur à créer) + quartier
 */
export function scorerPlusValue(
  annonce: Annonce,
  enrichi?: DonneesEnrichiesScoring,
  budgetTravaux?: number
): ResultatAxe & { points: PointAnalysePro[] } {
  const points: PointAnalysePro[] = []
  let score = 50
  let hasData = false

  // Tendance marché haussière
  if (enrichi?.marche?.evolution12Mois !== undefined) {
    hasData = true
    const evo = enrichi.marche.evolution12Mois
    if (evo > 5) {
      score += 25
      points.push({
        texte: `Marché en hausse (+${evo.toFixed(1)}%/an)`,
        detail: 'Bonne dynamique pour la plus-value',
        type: 'avantage',
        axe: 'plusValue',
        impact: 25
      })
    } else if (evo > 0) {
      score += 10
    } else if (evo < -5) {
      score -= 20
      points.push({
        texte: `Marché en baisse (${evo.toFixed(1)}%/an)`,
        detail: 'Risque de moins-value à court terme',
        type: 'attention',
        axe: 'plusValue',
        impact: -20
      })
    }
  }

  // Potentiel travaux = valeur à créer (DPE F/G → A/B = forte plus-value)
  if (budgetTravaux && budgetTravaux > 15000 && ['F', 'G'].includes(annonce.dpe)) {
    hasData = true
    score += 15
    points.push({
      texte: 'Potentiel de valorisation par rénovation',
      detail: `Rénover de DPE ${annonce.dpe} → C/B peut augmenter la valeur de 10-20%`,
      type: 'conseil',
      axe: 'plusValue',
      impact: 15
    })
  }

  // Bon quartier = demande soutenue
  if (enrichi?.quartier?.success && enrichi.quartier.scoreQuartier !== undefined) {
    hasData = true
    if (enrichi.quartier.scoreQuartier >= 70) score += 10
    else if (enrichi.quartier.scoreQuartier < 30) score -= 10
  }

  score = Math.round(Math.max(0, Math.min(100, score)))

  return {
    axe: 'plusValue',
    label: LABELS_AXES.plusValue,
    score,
    poids: POIDS_AXES.plusValue,
    disponible: hasData,
    detail: hasData ? `Potentiel estimé : ${score}/100` : 'Données insuffisantes',
    impact: score >= 65 ? 'positif' : score >= 40 ? 'neutre' : 'negatif',
    points
  }
}

/**
 * Axe 11 : Risques naturels (5%)
 * Basé sur les données Géorisques (API gouvernementale)
 * Évalue : inondation, séisme, radon, argiles
 */
export function scorerRisques(
  enrichi?: DonneesEnrichiesScoring
): ResultatAxe & { points: PointAnalysePro[] } {
  const points: PointAnalysePro[] = []

  if (!enrichi?.risques?.success || enrichi.risques.scoreRisque === undefined) {
    return {
      axe: 'risques',
      label: LABELS_AXES.risques,
      score: 50,
      poids: POIDS_AXES.risques,
      disponible: false,
      detail: 'Données risques non disponibles',
      impact: 'neutre',
      points: []
    }
  }

  const scoreRisque = enrichi.risques.scoreRisque
  const score = Math.max(0, Math.min(100, scoreRisque))

  let detail: string
  let impact: ResultatAxe['impact']

  if (scoreRisque >= 80) {
    detail = `Zone sûre (${scoreRisque}/100)`
    impact = 'positif'
    points.push({
      texte: 'Zone à faible risque naturel',
      detail: `Score sécurité ${scoreRisque}/100 — pas de risque majeur identifié`,
      type: 'avantage',
      axe: 'risques',
      impact: score - 50
    })
  } else if (scoreRisque >= 60) {
    detail = `Risques modérés (${scoreRisque}/100)`
    impact = 'neutre'
    const risquesDetail: string[] = []
    if (enrichi.risques.zoneInondable) risquesDetail.push('zone inondable')
    if (enrichi.risques.niveauRadon && enrichi.risques.niveauRadon >= 2) risquesDetail.push('radon')
    points.push({
      texte: 'Vigilance risques naturels',
      detail: risquesDetail.length > 0
        ? `Score ${scoreRisque}/100 — vigilance : ${risquesDetail.join(', ')}`
        : `Score ${scoreRisque}/100 — risques limités, vérifier l'assurance`,
      type: 'conseil',
      axe: 'risques',
      impact: 0
    })
  } else if (scoreRisque >= 40) {
    detail = `Risques significatifs (${scoreRisque}/100)`
    impact = 'negatif'
    const risquesDetail: string[] = []
    if (enrichi.risques.zoneInondable) risquesDetail.push('zone inondable')
    if (enrichi.risques.niveauRadon && enrichi.risques.niveauRadon >= 2) risquesDetail.push(`radon niveau ${enrichi.risques.niveauRadon}`)
    points.push({
      texte: 'Risques naturels élevés',
      detail: risquesDetail.length > 0
        ? `Score ${scoreRisque}/100 — ${risquesDetail.join(', ')} — impact sur l'assurance et la revente`
        : `Score ${scoreRisque}/100 — risques identifiés, surcoût assurance probable`,
      type: 'attention',
      axe: 'risques',
      impact: score - 50
    })
  } else {
    detail = `Zone très exposée (${scoreRisque}/100)`
    impact = 'negatif'
    const risquesDetail: string[] = []
    if (enrichi.risques.zoneInondable) risquesDetail.push('zone inondable')
    if (enrichi.risques.niveauRadon && enrichi.risques.niveauRadon >= 3) risquesDetail.push(`radon niveau ${enrichi.risques.niveauRadon}`)
    points.push({
      texte: 'Zone à haut risque naturel',
      detail: risquesDetail.length > 0
        ? `Score ${scoreRisque}/100 — ${risquesDetail.join(', ')} — impact fort sur assurance et valeur`
        : `Score ${scoreRisque}/100 — zone très exposée, étudier les diagnostics obligatoires`,
      type: 'attention',
      axe: 'risques',
      impact: score - 50
    })
  }

  return {
    axe: 'risques',
    label: LABELS_AXES.risques,
    score,
    poids: POIDS_AXES.risques,
    disponible: true,
    detail,
    impact,
    points
  }
}

// ============================================
// ANALYSE COMPARATIVE INTER-ANNONCES
// ============================================

/**
 * Génère des points d'analyse comparatifs entre les annonces de la sélection
 * Identifie les forces/faiblesses relatives de chaque bien
 */
function genererPointsComparatifs(
  annonce: Annonce,
  annonces: Annonce[],
  rendementData: { loyerEstime: number; rendementBrut: number },
): PointAnalysePro[] {
  if (annonces.length <= 1) return []
  const points: PointAnalysePro[] = []
  const autres = annonces.filter(a => a.id !== annonce.id)

  // 1. Prix au m² comparatif
  const prixM2 = annonce.prix / annonce.surface
  const allPrixM2 = annonces.map(a => a.prix / a.surface)
  const moyPrixM2 = allPrixM2.reduce((a, b) => a + b, 0) / allPrixM2.length
  const minPrixM2 = Math.min(...allPrixM2)
  const maxPrixM2 = Math.max(...allPrixM2)

  if (prixM2 <= minPrixM2 * 1.02 && maxPrixM2 - minPrixM2 > 200) {
    points.push({
      texte: 'Meilleur prix au m² de la sélection',
      detail: `${Math.round(prixM2).toLocaleString('fr-FR')} €/m² vs ${Math.round(moyPrixM2).toLocaleString('fr-FR')} €/m² en moyenne`,
      type: 'avantage',
      axe: 'prixMarche',
      impact: 5
    })
  } else if (prixM2 >= maxPrixM2 * 0.98 && maxPrixM2 - minPrixM2 > 200) {
    points.push({
      texte: 'Prix au m² le plus élevé',
      detail: `${Math.round(prixM2).toLocaleString('fr-FR')} €/m² — ${Math.round((prixM2 / minPrixM2 - 1) * 100)}% de plus que le moins cher`,
      type: 'attention',
      axe: 'prixMarche',
      impact: -5
    })
  }

  // 2. DPE comparatif
  const dpeOrder: Record<string, number> = { A: 7, B: 6, C: 5, D: 4, E: 3, F: 2, G: 1, NC: 0 }
  const myDpe = dpeOrder[annonce.dpe] ?? 0
  const othersDpe = autres.map(a => dpeOrder[a.dpe] ?? 0)
  if (myDpe > Math.max(...othersDpe) && myDpe >= 4) {
    points.push({
      texte: 'Meilleur DPE de la sélection',
      detail: `DPE ${annonce.dpe} — le plus performant énergétiquement parmi vos ${annonces.length} biens`,
      type: 'avantage',
      axe: 'energie',
      impact: 5
    })
  } else if (myDpe < Math.min(...othersDpe) && Math.max(...othersDpe) - myDpe >= 2) {
    points.push({
      texte: 'DPE le moins performant',
      detail: `DPE ${annonce.dpe} — coûts énergie plus élevés que les alternatives`,
      type: 'attention',
      axe: 'energie',
      impact: -5
    })
  }

  // 3. Équipements exclusifs
  if (annonce.parking && !autres.some(a => a.parking)) {
    points.push({
      texte: 'Seul bien avec parking',
      detail: 'Avantage exclusif — impact revente et confort quotidien',
      type: 'avantage',
      axe: 'equipements',
      impact: 5
    })
  }
  if (annonce.balconTerrasse && !autres.some(a => a.balconTerrasse)) {
    points.push({
      texte: 'Seul bien avec extérieur',
      detail: 'Balcon ou terrasse — avantage rare dans la sélection',
      type: 'avantage',
      axe: 'equipements',
      impact: 5
    })
  }
  if (!annonce.parking && autres.every(a => a.parking)) {
    points.push({
      texte: 'Seul bien sans parking',
      detail: 'Tous les autres biens ont un parking — point différenciant',
      type: 'attention',
      axe: 'equipements',
      impact: -5
    })
  }

  // 4. Surface comparative
  const maxSurface = Math.max(...annonces.map(a => a.surface))
  const minSurface = Math.min(...annonces.map(a => a.surface))
  if (annonce.surface >= maxSurface && maxSurface - minSurface > 10) {
    // Already handled in scorerSurface, skip duplicate
  } else if (annonce.surface <= minSurface && maxSurface - minSurface > 15) {
    const ecartPct = Math.round((1 - annonce.surface / maxSurface) * 100)
    points.push({
      texte: 'Surface la plus petite',
      detail: `${annonce.surface} m² — ${ecartPct}% de moins que le plus grand (${maxSurface} m²)`,
      type: 'attention',
      axe: 'surface',
      impact: -5
    })
  }

  // 5. Rendement comparatif
  const allRendements = annonces.map(a => {
    const loyer = estimerLoyerMensuel(a.prix, a.codePostal)
    return ((loyer * 12) / a.prix) * 100
  })
  const maxRendement = Math.max(...allRendements)
  if (rendementData.rendementBrut >= maxRendement * 0.98 && allRendements.length > 1) {
    const ecart = rendementData.rendementBrut - Math.min(...allRendements)
    if (ecart > 0.5) {
      points.push({
        texte: 'Meilleur rendement locatif',
        detail: `${rendementData.rendementBrut.toFixed(1)}% brut — ${ecart.toFixed(1)} points de plus que le moins rentable`,
        type: 'avantage',
        axe: 'rendement',
        impact: 5
      })
    }
  }

  // 6. Meilleur rapport qualité/prix (prix le plus bas + pas le pire score)
  const prixMin = Math.min(...annonces.map(a => a.prix))
  const prixMax = Math.max(...annonces.map(a => a.prix))
  if (annonce.prix <= prixMin * 1.02 && prixMax - prixMin > 20000) {
    points.push({
      texte: 'Prix le plus accessible',
      detail: `${annonce.prix.toLocaleString('fr-FR')} € — ${Math.round((1 - annonce.prix / prixMax) * 100)}% de moins que le plus cher`,
      type: 'avantage',
      axe: 'prixMarche',
      impact: 3
    })
  }

  return points
}

// ============================================
// MOTEUR PRINCIPAL
// ============================================

/**
 * Score professionnel unifié
 * Calcule le score sur les 11 axes avec redistribution des poids
 * si certains axes n'ont pas de données
 */
export function calculerScorePro(
  annonce: Annonce,
  annonces: Annonce[], // Toutes les annonces pour comparatif
  enrichi?: DonneesEnrichiesScoring,
  budgetMax?: number | null,
  profil?: ProfilScoring | null
): ScoreComparateurResult {
  // 1. Scorer chaque axe
  const prixMarche = scorerPrixMarche(annonce, enrichi)
  const rendement = scorerRendement(annonce, enrichi)
  const energie = scorerEnergie(annonce)
  const emplacement = scorerEmplacement(enrichi)
  const transports = scorerTransports(enrichi)
  const etatBien = scorerEtatBien(annonce)
  const charges = scorerCharges(annonce)
  const risques = scorerRisques(enrichi)
  const surface = scorerSurface(annonce)
  const equipements = scorerEquipements(annonce)
  const plusValue = scorerPlusValue(annonce, enrichi, etatBien.budgetTravaux)

  const tousAxes = [
    prixMarche, rendement, energie, emplacement, transports,
    etatBien, charges, risques, surface, equipements, plusValue
  ]

  // 1b. Appliquer les multiplicateurs du profil si fourni
  if (profil && Object.keys(profil.multiplicateurs).length > 0) {
    for (const axe of tousAxes) {
      const mult = profil.multiplicateurs[axe.axe]
      if (mult !== undefined) {
        axe.poids = axe.poids * mult
      }
    }
    // Renormaliser à 100%
    const totalPoids = tousAxes.reduce((s, a) => s + a.poids, 0)
    if (totalPoids > 0) {
      for (const axe of tousAxes) {
        axe.poids = (axe.poids / totalPoids) * 100
      }
    }
  }

  // 2. Redistribuer les poids si axes indisponibles
  const axesDisponibles = tousAxes.filter(a => a.disponible)
  
  const poidsDisponible = axesDisponibles.reduce((sum, a) => sum + a.poids, 0)
  const poidsTotal = 100

  // Redistribution proportionnelle
  const resultatsAxes: ResultatAxe[] = tousAxes.map(axe => {
    if (!axe.disponible) return { ...axe, poids: 0 } as ResultatAxe
    // Nouveau poids = poids original × (100 / somme des poids dispo)
    const poidsEffectif = poidsDisponible > 0 ? (axe.poids / poidsDisponible) * poidsTotal : 0
    return { ...axe, poids: Math.round(poidsEffectif * 10) / 10 } as ResultatAxe
  })

  // 3. Calculer le score global pondéré
  let scoreGlobal = 0
  let poidsEffectifTotal = 0
  for (const axe of resultatsAxes) {
    if (axe.disponible) {
      scoreGlobal += axe.score * axe.poids
      poidsEffectifTotal += axe.poids
    }
  }
  scoreGlobal = poidsEffectifTotal > 0 ? Math.round(scoreGlobal / poidsEffectifTotal) : 50

  // 3b. Pénalité de confiance : les scores basés sur peu d'axes tendent vers 50
  const confiance = Math.round(axesDisponibles.length / tousAxes.length * 100)
  if (confiance < 70) {
    // Facteur de pénalité : 70% confiance = facteur 0.85, 40% = facteur 0.7
    const facteur = 0.5 + (confiance / 200)
    scoreGlobal = Math.round(50 + (scoreGlobal - 50) * facteur)
  }

  // 4. Bonus/malus budget (hors axes, impact direct)
  if (budgetMax && budgetMax > 0) {
    const pourcent = (annonce.prix / budgetMax) * 100
    if (pourcent <= 80) {
      scoreGlobal = Math.min(100, scoreGlobal + 5)
    } else if (pourcent > 110) {
      scoreGlobal = Math.max(0, scoreGlobal - 10)
    } else if (pourcent > 100) {
      scoreGlobal = Math.max(0, scoreGlobal - 5)
    }
  }

  scoreGlobal = Math.max(0, Math.min(100, scoreGlobal))

  // 5. Collecter tous les points d'analyse
  const points: PointAnalysePro[] = []
  for (const axe of tousAxes) {
    points.push(...axe.points)
  }

  // 5b. Points comparatifs inter-annonces
  const pointsComparatifs = genererPointsComparatifs(
    annonce, annonces,
    { loyerEstime: rendement.loyerEstime, rendementBrut: rendement.rendementBrut },
  )
  points.push(...pointsComparatifs)

  // Budget point
  if (budgetMax && budgetMax > 0) {
    const pourcent = Math.round((annonce.prix / budgetMax) * 100)
    const ecart = budgetMax - annonce.prix
    if (pourcent <= 80) {
      points.push({
        texte: 'Marge de manœuvre importante',
        detail: `${ecart.toLocaleString('fr-FR')} € disponibles pour travaux ou négociation`,
        type: 'avantage',
        axe: 'prixMarche',
        impact: 5
      })
    } else if (pourcent > 100) {
      points.push({
        texte: `Dépasse le budget de ${(annonce.prix - budgetMax).toLocaleString('fr-FR')} €`,
        detail: `${pourcent}% du budget — négociation ou apport supplémentaire nécessaire`,
        type: 'attention',
        axe: 'prixMarche',
        impact: -10
      })
    }
  }

  // 6. Verdict et recommandation (granularité affinée)
  let verdict: string
  let recommandation: NiveauRecommandation

  if (scoreGlobal >= 80) {
    verdict = 'Excellent choix'
    recommandation = 'fortement_recommande'
  } else if (scoreGlobal >= 70) {
    verdict = 'Très bon potentiel'
    recommandation = 'recommande'
  } else if (scoreGlobal >= 60) {
    verdict = 'Bon potentiel'
    recommandation = 'a_etudier'
  } else if (scoreGlobal >= 45) {
    verdict = 'À étudier'
    recommandation = 'prudence'
  } else {
    verdict = 'Peu recommandé'
    recommandation = 'deconseille'
  }

  // 7. Confiance (déjà calculé en 3b pour la pénalité)

  // 8. Conseil personnalisé intelligent — 15+ branches avec données spécifiques
  const avantages = points.filter(p => p.type === 'avantage')
  const attentions = points.filter(p => p.type === 'attention')

  // Helpers analytiques
  const topAvantages = [...avantages].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 3)
  const topAttentions = [...attentions].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 3)
  const axesSorted = resultatsAxes.filter(a => a.disponible).sort((a, b) => b.score - a.score)
  const axeForte = axesSorted[0]
  const axeFaible = [...axesSorted].reverse()[0]
  
  let conseilPerso: string

  if (scoreGlobal >= 80 && avantages.length >= 4) {
    // Cas 1 : Bien exceptionnel
    conseilPerso = `Bien exceptionnel : ${topAvantages.map(p => p.texte.toLowerCase()).join(', ')}. Ne tardez pas à organiser une visite.`
  } else if (avantages.length >= 3 && attentions.length === 0) {
    // Cas 2 : Tout positif sans blocage
    conseilPerso = `${avantages.length} atouts sans point bloquant (${topAvantages.slice(0, 2).map(p => p.texte.toLowerCase()).join(', ')}). Planifiez une visite rapidement.`
  } else if (attentions.some(a => a.axe === 'energie' && a.texte.includes('Passoire'))) {
    // Cas 3 : Passoire thermique dominante
    const travaux = etatBien.budgetTravaux
    const dpe = annonce.dpe
    conseilPerso = travaux > 0
      ? `DPE ${dpe} = passoire thermique. Rénovation estimée ~${travaux.toLocaleString('fr-FR')} €. Négociez le prix et exigez des devis avant engagement.`
      : `DPE ${dpe} = passoire thermique. Faites chiffrer la rénovation énergétique — impacte la valeur et la location future.`
  } else if (attentions.some(a => a.texte.toLowerCase().includes('budget'))) {
    // Cas 4 : Dépassement budget
    const ecartBudget = budgetMax ? annonce.prix - budgetMax : 0
    conseilPerso = ecartBudget > 0
      ? `Dépasse votre budget de ${ecartBudget.toLocaleString('fr-FR')} €. Négociez : comparez au prix DVF du secteur${enrichi?.marche?.ecartPrixM2 !== undefined ? ` (écart ${enrichi.marche.ecartPrixM2 > 0 ? '+' : ''}${enrichi.marche.ecartPrixM2.toFixed(0)}%)` : ''}.`
      : 'Ce bien sollicite fortement votre budget. Préparez vos arguments de négociation en vous appuyant sur les prix DVF.'
  } else if (rendement.rendementBrut >= 6 && scoreGlobal >= 55) {
    // Cas 5 : Excellent rendement locatif
    conseilPerso = `Excellent potentiel locatif : ${rendement.rendementBrut.toFixed(1)}% brut (~${rendement.loyerEstime} €/mois). Vérifiez la demande locative et la vacance du secteur.`
  } else if (rendement.rendementBrut >= 4.5 && scoreGlobal >= 60) {
    // Cas 6 : Bon compromis investissement/qualité
    conseilPerso = `Bon compromis investissement/qualité : rendement ${rendement.rendementBrut.toFixed(1)}% (~${rendement.loyerEstime} €/mois)${axeForte ? ` avec un point fort en ${axeForte.label.toLowerCase()}` : ''}.`
  } else if (axeFaible && axeFaible.score < 30 && axeForte && axeForte.score >= 70) {
    // Cas 7 : Profil contrasté (un axe très fort, un très faible)
    const conseilAxeFaible = axeFaible.axe === 'energie' ? 'Budgétez la rénovation énergétique.'
      : axeFaible.axe === 'charges' ? 'Vérifiez l\'historique des charges de copropriété.'
      : axeFaible.axe === 'transports' ? 'Vérifiez la desserte en transports en commun pour vos trajets quotidiens.'
      : axeFaible.axe === 'etatBien' ? 'Faites estimer les travaux par un professionnel.'
      : 'Évaluez si ce point est bloquant pour votre projet.'
    conseilPerso = `Profil contrasté : excellent en ${axeForte.label.toLowerCase()} (${axeForte.score}/100) mais faible en ${axeFaible.label.toLowerCase()} (${axeFaible.score}/100). ${conseilAxeFaible}`
  } else if (scoreGlobal >= 65 && confiance < 60) {
    // Cas 8 : Bon score mais données incomplètes
    conseilPerso = `Score encourageant (${scoreGlobal}/100) mais basé sur ${axesDisponibles.length}/${tousAxes.length} axes. Demandez les données manquantes au vendeur pour confirmer.`
  } else if (avantages.length >= 2 && attentions.length <= 1) {
    // Cas 9 : Bon profil, un seul bémol
    const topPoint = topAvantages[0]
    conseilPerso = `Bon profil global, porté par ${topPoint?.texte?.toLowerCase() || 'plusieurs atouts'}. ${attentions.length === 1 ? `Seul bémol : ${topAttentions[0]?.texte?.toLowerCase() || 'un point à vérifier'}.` : 'Mérite clairement une visite.'}`
  } else if (attentions.length >= 3) {
    // Cas 10 : Plusieurs points bloquants
    conseilPerso = `${attentions.length} points de vigilance (${topAttentions.slice(0, 2).map(p => p.texte.toLowerCase()).join(', ')}). Comparez soigneusement avec les alternatives avant de visiter.`
  } else if (etatBien.budgetTravaux > 20000 && scoreGlobal >= 50) {
    // Cas 11 : Travaux significatifs mais potentiel
    conseilPerso = `Budget travaux estimé ~${etatBien.budgetTravaux.toLocaleString('fr-FR')} €. Coût total réel = ${(annonce.prix + etatBien.budgetTravaux).toLocaleString('fr-FR')} €. Comparez ce coût global aux alternatives neuves ou rénovées.`
  } else if (annonces.length > 1 && pointsComparatifs.some(p => p.type === 'avantage')) {
    // Cas 12 : Bien qui se démarque en comparatif
    const avantagesComparatifs = pointsComparatifs.filter(p => p.type === 'avantage')
    conseilPerso = `Se démarque dans la sélection : ${avantagesComparatifs.map(p => p.texte.toLowerCase()).join(', ')}. ${avantages.length > attentions.length ? 'Profil globalement solide.' : 'Mais des réserves à considérer.'}`
  } else if (avantages.length > attentions.length) {
    // Cas 13 : Bilan positif générique
    conseilPerso = `${avantages.length} atout${avantages.length > 1 ? 's' : ''} vs ${attentions.length} réserve${attentions.length > 1 ? 's' : ''} — bilan positif. ${topAvantages[0] ? `Point fort principal : ${topAvantages[0].texte.toLowerCase()}.` : ''}`
  } else if (attentions.length > avantages.length) {
    // Cas 14 : Bilan négatif
    conseilPerso = `Plus de réserves (${attentions.length}) que d'atouts (${avantages.length}). ${topAttentions[0] ? `Principal point faible : ${topAttentions[0].texte.toLowerCase()}.` : ''} Comparez avec les alternatives.`
  } else if (scoreGlobal >= 50) {
    // Cas 15 : Profil équilibré
    conseilPerso = `Profil équilibré (${avantages.length} atout${avantages.length > 1 ? 's' : ''}, ${attentions.length} réserve${attentions.length > 1 ? 's' : ''}). ${axeFaible ? `Concentrez la visite sur ${axeFaible.label.toLowerCase()}.` : 'La visite permettra de trancher.'}`
  } else {
    // Cas 16 : Score modeste
    conseilPerso = `Score modeste (${scoreGlobal}/100). ${axeForte ? `Meilleur point : ${axeForte.label.toLowerCase()} (${axeForte.score}/100).` : ''} Ne visitez que si le prix est négociable.`
  }

  return {
    annonceId: annonce.id,
    scoreGlobal,
    axes: resultatsAxes,
    points,
    verdict,
    recommandation,
    conseilPerso,
    confiance,
    estimations: {
      loyerMensuelEstime: rendement.loyerEstime,
      rendementBrut: Math.round(rendement.rendementBrut * 10) / 10,
      coutEnergieAnnuel: energie.coutAnnuel,
      budgetTravauxEstime: etatBien.budgetTravaux > 0 ? etatBien.budgetTravaux : undefined
    }
  }
}

// ============================================
// SYNTHÈSE MULTI-ANNONCES
// ============================================

/**
 * Génère la synthèse globale et le classement pour une sélection d'annonces
 */
export function genererSyntheseComparaison(
  resultats: ScoreComparateurResult[]
): {
  syntheseGlobale: string
  conseilGeneral: string
  classement: Array<{ annonceId: string; rang: number; scoreGlobal: number }>
} {
  if (resultats.length === 0) {
    return { syntheseGlobale: '', conseilGeneral: '', classement: [] }
  }

  const sorted = [...resultats].sort((a, b) => b.scoreGlobal - a.scoreGlobal)
  const classement = sorted.map((r, i) => ({
    annonceId: r.annonceId,
    rang: i + 1,
    scoreGlobal: r.scoreGlobal
  }))

  let syntheseGlobale: string
  let conseilGeneral: string

  if (resultats.length === 1) {
    const r = resultats[0]
    const nbAvantages = r.points.filter(p => p.type === 'avantage').length
    const nbAttentions = r.points.filter(p => p.type === 'attention').length
    syntheseGlobale = `Score professionnel : ${r.scoreGlobal}/100 — ${r.verdict.toLowerCase()} (${nbAvantages} atout${nbAvantages > 1 ? 's' : ''}, ${nbAttentions} réserve${nbAttentions > 1 ? 's' : ''}).`
    conseilGeneral = r.conseilPerso
  } else {
    const meilleur = sorted[0]
    const deuxieme = sorted[1]
    const ecart = meilleur.scoreGlobal - deuxieme.scoreGlobal
    const scoreMoyen = Math.round(resultats.reduce((s, r) => s + r.scoreGlobal, 0) / resultats.length)

    if (ecart >= 15) {
      const confGap = Math.abs((meilleur.confiance ?? 100) - (deuxieme.confiance ?? 100))
      const caveat = confGap > 30 ? ' (attention : niveaux de données très différents)' : ''
      syntheseGlobale = `Un bien se démarque nettement : ${meilleur.scoreGlobal}/100 (${meilleur.verdict}) vs ${deuxieme.scoreGlobal}/100 pour le 2e.${caveat}`
      conseilGeneral = confGap > 30
        ? `Écart de ${ecart} points, mais le score du 1er repose sur moins de données. Demandez les informations manquantes avant de conclure.`
        : `Écart de ${ecart} points — le meilleur a un avantage significatif. Priorisez-le pour la visite.`
    } else if (ecart >= 8) {
      syntheseGlobale = `Le meilleur obtient ${meilleur.scoreGlobal}/100 (${meilleur.verdict}), talonné par le 2e à ${deuxieme.scoreGlobal}/100.`
      conseilGeneral = 'Léger avantage pour le 1er, mais visitez les deux pour trancher sur le terrain.'
    } else if (ecart >= 3) {
      syntheseGlobale = `Biens très proches : ${meilleur.scoreGlobal}/100 vs ${deuxieme.scoreGlobal}/100 (écart ${ecart} pts). Score moyen : ${scoreMoyen}/100.`
      conseilGeneral = 'Scores quasi identiques — la visite et votre ressenti feront la différence.'
    } else {
      syntheseGlobale = `Sélection homogène : scores regroupés entre ${sorted[sorted.length - 1].scoreGlobal} et ${meilleur.scoreGlobal}/100.`
      conseilGeneral = `Avec seulement ${ecart} point${ecart > 1 ? 's' : ''} d'écart, comparez sur des critères personnels (localisation, coup de cœur, négociabilité).`
    }
  }

  return { syntheseGlobale, conseilGeneral, classement }
}

// ============================================
// DONNÉES RADAR CHART
// ============================================

/** Axes affichés dans le radar (regroupement des 11 axes en 7 pour la lisibilité) */
export const RADAR_AXES = [
  { key: 'prix', label: 'Prix' },
  { key: 'quartier', label: 'Quartier' },
  { key: 'transports', label: 'Transports' },
  { key: 'energie', label: 'Énergie' },
  { key: 'risques', label: 'Risques' },
  { key: 'confort', label: 'Confort' },
  { key: 'budget', label: 'Budget' },
] as const

/**
 * Convertit un ScoreComparateurResult en données pour le RadarChart
 * Regroupe les 11 axes en 7 pour la lisibilité visuelle
 */
export function scoreToRadarData(result: ScoreComparateurResult): Array<{ label: string; value: number; disponible: boolean }> {
  const getAxe = (axe: AxeScoring) => result.axes.find(a => a.axe === axe)
  const axeDispo = (axe: AxeScoring) => getAxe(axe)?.disponible ?? false
  /** Score effectif : utilise le vrai score si dispo, sinon 0 pour les axes du radar */
  const scoreOuAbsent = (axe: AxeScoring) => axeDispo(axe) ? (getAxe(axe)?.score ?? 50) : 0

  return [
    { label: 'prix', value: scoreOuAbsent('prixMarche'), disponible: axeDispo('prixMarche') },
    { label: 'quartier', value: scoreOuAbsent('emplacement'), disponible: axeDispo('emplacement') },
    { label: 'transports', value: scoreOuAbsent('transports'), disponible: axeDispo('transports') },
    { label: 'energie', value: scoreOuAbsent('energie'), disponible: axeDispo('energie') },
    { label: 'risques', value: scoreOuAbsent('risques'), disponible: axeDispo('risques') },
    { label: 'confort', value: moyennePonderee([
      { score: getAxe('etatBien')?.score ?? 50, poids: axeDispo('etatBien') ? 2 : 0 },
      { score: getAxe('equipements')?.score ?? 50, poids: axeDispo('equipements') ? 1.5 : 0 },
      { score: getAxe('surface')?.score ?? 50, poids: axeDispo('surface') ? 1 : 0 },
    ]), disponible: axeDispo('etatBien') || axeDispo('equipements') || axeDispo('surface') },
    { label: 'budget', value: moyennePonderee([
      { score: getAxe('charges')?.score ?? 50, poids: axeDispo('charges') ? 1 : 0 },
      { score: getAxe('rendement')?.score ?? 50, poids: axeDispo('rendement') ? 0.5 : 0 },
      { score: getAxe('plusValue')?.score ?? 50, poids: axeDispo('plusValue') ? 0.5 : 0 },
    ]), disponible: axeDispo('charges') || axeDispo('rendement') || axeDispo('plusValue') },
  ]
}

function moyennePonderee(items: Array<{ score: number; poids: number }>): number {
  const total = items.reduce((sum, i) => sum + i.score * i.poids, 0)
  const poids = items.reduce((sum, i) => sum + i.poids, 0)
  return poids > 0 ? Math.round(total / poids) : 50
}

// Re-export des constantes pour l'UI (importées de @/config/scoring.config)
export { COUT_ENERGIE_M2_AN, DESCRIPTIONS_AXES, LABELS_AXES, POIDS_AXES }

