/**
 * Moteur de Scoring Professionnel pour le Comparateur
 * 
 * Score unifié basé sur 10 axes pondérés comme un professionnel immobilier :
 * 
 * 1. Prix vs Marché (20%) - DVF données
 * 2. Rendement locatif (15%) - estimation automatique
 * 3. Performance énergétique (12%) - DPE + coût énergie estimé
 * 4. Emplacement / quartier (15%) - OpenStreetMap
 * 5. Risques naturels (8%) - Géorisques
 * 6. État du bien / travaux (10%) - année construction + DPE
 * 7. Charges & fiscalité (8%) - charges copro + taxe foncière
 * 8. Surface & agencement (5%) - rapport surface/pièces
 * 9. Équipements & confort (5%) - parking, balcon, ascenseur...
 * 10. Potentiel plus-value (2%) - état + quartier + tendance
 * 
 * Chaque axe note de 0 à 100, le score final est la moyenne pondérée.
 * Si un axe n'a pas de données, son poids est redistribué.
 */

import type { Annonce, ClasseDPE } from '@/types/annonces'

// ============================================
// TYPES
// ============================================

/** Axes d'évaluation professionnelle */
export type AxeScoring =
  | 'prixMarche'
  | 'rendement'
  | 'energie'
  | 'emplacement'
  | 'risques'
  | 'etatBien'
  | 'charges'
  | 'surface'
  | 'equipements'
  | 'plusValue'

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
  }
  risques?: {
    success: boolean
    scoreRisque?: number
    verdict?: 'sûr' | 'vigilance' | 'risqué'
    zoneInondable?: boolean
    niveauRadon?: number
  }
  quartier?: {
    success: boolean
    scoreQuartier?: number
    transports?: number
    commerces?: number
    ecoles?: number
    sante?: number
    espaceVerts?: number
  }
}

// ============================================
// CONSTANTES
// ============================================

/** Pondérations professionnelles par axe (total = 100%) */
const POIDS_AXES: Record<AxeScoring, number> = {
  prixMarche: 20,
  rendement: 15,
  energie: 12,
  emplacement: 15,
  risques: 8,
  etatBien: 10,
  charges: 8,
  surface: 5,
  equipements: 5,
  plusValue: 2,
}

/** Labels des axes */
const LABELS_AXES: Record<AxeScoring, string> = {
  prixMarche: 'Prix vs Marché',
  rendement: 'Rendement locatif',
  energie: 'Performance énergie',
  emplacement: 'Emplacement',
  risques: 'Sécurité zone',
  etatBien: 'État du bien',
  charges: 'Charges & fiscalité',
  surface: 'Surface & agencement',
  equipements: 'Équipements',
  plusValue: 'Potentiel plus-value',
}

/**
 * Coût énergie annuel estimé par classe DPE (€/m²/an)
 * Source : ADEME, données moyennes France 2024
 * A: <70 kWh/m²/an → ~5€/m²/an  |  G: >450 kWh/m²/an → ~35€/m²/an
 */
const COUT_ENERGIE_M2_AN: Record<ClasseDPE, number> = {
  A: 5,
  B: 8,
  C: 12,
  D: 17,
  E: 23,
  F: 30,
  G: 38,
  NC: 20, // Hypothèse prudente
}

/**
 * Score DPE pour la notation (A=100, B=85, ..., G=10)
 */
const SCORE_DPE: Record<ClasseDPE, number> = {
  A: 100,
  B: 85,
  C: 70,
  D: 55,
  E: 40,
  F: 20,
  G: 10,
  NC: 40, // Prudent
}

/**
 * Estimation du budget travaux selon l'année de construction et la classe DPE
 * Sources croisées : données rénovation ADEME + retours courtiers
 */
function estimerBudgetTravaux(anneeConstruction?: number, dpe?: ClasseDPE, surface?: number): number {
  if (!surface) return 0
  
  let coutM2 = 0

  // Composante vétusté (âge du bâtiment)
  // Si année inconnue : on déduit une fourchette via le DPE
  // Un DPE A/B/C suggère un bâtiment récent ou rénové → pas de surcoût vétusté par défaut
  // Un DPE D/E/F/G suggère un bâtiment plus ancien → hypothèse prudente 1985
  const annee = anneeConstruction
    || (dpe && ['A', 'B', 'C'].includes(dpe) ? 2012 : undefined)

  if (annee !== undefined) {
    if (annee < 1950) {
      coutM2 += 250 // Ancien : mise aux normes probable
    } else if (annee < 1975) {
      coutM2 += 150 // Pré-réglementation thermique
    } else if (annee < 1990) {
      coutM2 += 80 // Première RT
    } else if (annee < 2005) {
      coutM2 += 40 // RT 2000
    } else if (annee < 2012) {
      coutM2 += 15 // RT 2005
    }
    // RT 2012+ : pas de travaux prévisibles
  } else {
    // Ni année ni bon DPE → hypothèse prudente
    coutM2 += 80
  }

  // Composante DPE (isolation thermique)
  if (dpe === 'G') coutM2 += 300
  else if (dpe === 'F') coutM2 += 200
  else if (dpe === 'E') coutM2 += 80
  else if (dpe === 'D') coutM2 += 30
  // DPE A/B/C : pas de surcoût énergie

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
  const cp = parseInt(codePostal.substring(0, 2))
  
  let ratioMensuel: number

  // Paris
  if (codePostal.startsWith('75')) {
    ratioMensuel = 0.0028 // 0.28%
  }
  // Petite couronne (92, 93, 94)
  else if ([92, 93, 94].includes(cp)) {
    ratioMensuel = 0.0035 // 0.35%
  }
  // Grande couronne (77, 78, 91, 95)
  else if ([77, 78, 91, 95].includes(cp)) {
    ratioMensuel = 0.004 // 0.40%
  }
  // Grandes métropoles (Lyon, Marseille, Bordeaux, Toulouse, Nantes, etc.)
  else if (
    codePostal.startsWith('69') || // Lyon
    codePostal.startsWith('13') || // Marseille
    codePostal.startsWith('33') || // Bordeaux
    codePostal.startsWith('31') || // Toulouse
    codePostal.startsWith('44') || // Nantes
    codePostal.startsWith('59') || // Lille
    codePostal.startsWith('67') || // Strasbourg
    codePostal.startsWith('06') || // Nice
    codePostal.startsWith('34')    // Montpellier
  ) {
    ratioMensuel = 0.0042 // 0.42%
  }
  // Villes moyennes  
  else if (
    codePostal.startsWith('35') || // Rennes
    codePostal.startsWith('45') || // Orléans
    codePostal.startsWith('37') || // Tours
    codePostal.startsWith('21') || // Dijon
    codePostal.startsWith('63') || // Clermont
    codePostal.startsWith('76') || // Rouen
    codePostal.startsWith('14') || // Caen
    codePostal.startsWith('29') || // Brest
    codePostal.startsWith('87')    // Limoges
  ) {
    ratioMensuel = 0.005 // 0.50%
  }
  // DOM-TOM
  else if (codePostal.startsWith('97')) {
    ratioMensuel = 0.0045 // 0.45%
  }
  // Reste : petites villes / rural
  else {
    ratioMensuel = 0.0055 // 0.55%
  }

  return Math.round(prix * ratioMensuel)
}

// ============================================
// SCORING PAR AXE
// ============================================

/**
 * Axe 1 : Prix vs Marché (20%)
 * Compare le prix/m² au prix médian DVF du secteur
 */
function scorerPrixMarche(
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
  // Score linéaire : -30% = 100, 0% = 65, +30% = 0
  let score = Math.round(65 - (ecart * 1.17))
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
    detail = 'Prix aligné au marché'
    impact = 'neutre'
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
function scorerRendement(
  annonce: Annonce
): ResultatAxe & { points: PointAnalysePro[]; loyerEstime: number; rendementBrut: number } {
  const loyerEstime = estimerLoyerMensuel(annonce.prix, annonce.codePostal)
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
    rendementBrut
  }
}

/**
 * Axe 3 : Performance énergétique (12%)
 * Combine le score DPE + coût énergie annuel estimé
 */
function scorerEnergie(
  annonce: Annonce
): ResultatAxe & { points: PointAnalysePro[]; coutAnnuel: number } {
  const scoreDpe = SCORE_DPE[annonce.dpe] ?? 40
  const coutM2 = COUT_ENERGIE_M2_AN[annonce.dpe] ?? 20
  const coutAnnuel = Math.round(coutM2 * annonce.surface)

  // Score composite : 70% DPE + 30% coût relatif
  // Coût annuel : <500€ = 100, 3000€+ = 0
  const scoreCout = Math.round(Math.max(0, Math.min(100, 100 - (coutAnnuel / 30))))
  const score = Math.round(scoreDpe * 0.7 + scoreCout * 0.3)

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
 * Score quartier OSM 
 */
function scorerEmplacement(
  enrichi?: DonneesEnrichiesScoring
): ResultatAxe & { points: PointAnalysePro[] } {
  const points: PointAnalysePro[] = []

  if (!enrichi?.quartier?.success || enrichi.quartier.scoreQuartier === undefined) {
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

  const scoreQ = enrichi.quartier.scoreQuartier
  const score = Math.max(0, Math.min(100, scoreQ))

  let detail: string
  let impact: ResultatAxe['impact']

  if (scoreQ >= 75) {
    detail = `Quartier très bien desservi (${scoreQ}/100)`
    impact = 'positif'
    points.push({
      texte: 'Emplacement premium',
      detail: `Score quartier ${scoreQ}/100 — transports, commerces, écoles à proximité`,
      type: 'avantage',
      axe: 'emplacement',
      impact: score - 50
    })
  } else if (scoreQ >= 50) {
    detail = `Quartier correctement équipé (${scoreQ}/100)`
    impact = 'neutre'
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
 * Axe 5 : Risques naturels (8%)
 * Géorisques
 */
function scorerRisques(
  enrichi?: DonneesEnrichiesScoring
): ResultatAxe & { points: PointAnalysePro[] } {
  const points: PointAnalysePro[] = []

  if (!enrichi?.risques?.success) {
    return {
      axe: 'risques',
      label: LABELS_AXES.risques,
      score: 50,
      poids: POIDS_AXES.risques,
      disponible: false,
      detail: 'Données Géorisques non disponibles',
      impact: 'neutre',
      points: []
    }
  }

  let score = enrichi.risques.scoreRisque ?? 50

  if (enrichi.risques.zoneInondable) {
    score = Math.max(0, score - 15)
    points.push({
      texte: 'Zone inondable identifiée',
      detail: 'Surcoût assurance, contraintes de construction',
      type: 'attention',
      axe: 'risques',
      impact: -15
    })
  }

  if (enrichi.risques.niveauRadon && enrichi.risques.niveauRadon >= 3) {
    score = Math.max(0, score - 5)
    points.push({
      texte: 'Potentiel radon élevé',
      detail: 'Prévoir un diagnostic radon (zone catégorie 3)',
      type: 'conseil',
      axe: 'risques',
      impact: -5
    })
  }

  score = Math.max(0, Math.min(100, score))

  let detail: string
  let impact: ResultatAxe['impact']

  if (score >= 80) {
    detail = 'Zone sûre — aucun risque majeur'
    impact = 'positif'
    points.push({
      texte: 'Zone sécurisée',
      detail: 'Aucun risque naturel ou technologique majeur',
      type: 'avantage',
      axe: 'risques',
      impact: score - 50
    })
  } else if (score >= 50) {
    detail = 'Quelques risques à surveiller'
    impact = 'neutre'
  } else {
    detail = 'Zone à risques identifiés'
    impact = 'negatif'
    points.push({
      texte: 'Zone à risques significatifs',
      detail: 'Consultez Géorisques.gouv.fr pour le détail des risques',
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

/**
 * Axe 6 : État du bien / Travaux (10%)
 * Basé sur l'année de construction + DPE
 */
function scorerEtatBien(
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
function scorerCharges(
  annonce: Annonce
): ResultatAxe & { points: PointAnalysePro[] } {
  const charges = annonce.chargesMensuelles
  const taxe = annonce.taxeFonciere
  const points: PointAnalysePro[] = []

  if (!charges && !taxe) {
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
function scorerSurface(
  annonce: Annonce,
  annonces: Annonce[] // Pour le comparatif
): ResultatAxe & { points: PointAnalysePro[] } {
  const points: PointAnalysePro[] = []

  // Score composite
  let score = 50

  // 1. Surface par pièce (confort : 20m²+ = bon, 15m² = moyen, <12m² = serré)
  const surfacePiece = annonce.pieces > 0 ? annonce.surface / annonce.pieces : annonce.surface
  if (surfacePiece >= 22) score += 20
  else if (surfacePiece >= 18) score += 10
  else if (surfacePiece < 13) score -= 15

  // 2. Position relative dans la comparaison
  if (annonces.length > 1) {
    const surfaces = annonces.map(a => a.surface)
    const maxS = Math.max(...surfaces)
    const minS = Math.min(...surfaces)
    const moyS = surfaces.reduce((a, b) => a + b, 0) / surfaces.length

    if (annonce.surface === maxS) {
      score += 15
      points.push({
        texte: 'Plus grande surface de la sélection',
        detail: `${annonce.surface} m² — ${Math.round((annonce.surface / moyS - 1) * 100)}% de plus que la moyenne`,
        type: 'avantage',
        axe: 'surface',
        impact: 15
      })
    } else if (annonce.surface === minS && maxS - minS > 10) {
      score -= 10
    }
  }

  // 3. Nombre de chambres relatif
  if (annonces.length > 1) {
    const maxChambres = Math.max(...annonces.map(a => a.chambres))
    if (annonce.chambres === maxChambres && maxChambres >= 3) {
      score += 5
    }
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
 * Axe 9 : Équipements & confort (5%)
 * Parking, balcon, cave, ascenseur, SDB, étage
 */
function scorerEquipements(
  annonce: Annonce
): ResultatAxe & { points: PointAnalysePro[] } {
  const points: PointAnalysePro[] = []
  let score = 40 // Base conservatrice

  const equips: string[] = []
  if (annonce.parking) { score += 15; equips.push('parking') }
  if (annonce.balconTerrasse) { score += 12; equips.push('balcon/terrasse') }
  if (annonce.cave) { score += 8; equips.push('cave') }
  if (annonce.ascenseur) { score += 8; equips.push('ascenseur') }
  if (annonce.nbSallesBains && annonce.nbSallesBains >= 2) {
    score += 8
    equips.push(`${annonce.nbSallesBains} SDB`)
  }

  // Malus étage élevé sans ascenseur
  if (annonce.type === 'appartement' && annonce.etage !== undefined) {
    if (annonce.etage >= 4 && !annonce.ascenseur) {
      score -= 20
      points.push({
        texte: `${annonce.etage}e étage sans ascenseur`,
        detail: 'Impact quotidien et sur la revente — décote significative',
        type: 'attention',
        axe: 'equipements',
        impact: -20
      })
    } else if (annonce.etage >= 3 && annonce.ascenseur) {
      score += 5
      points.push({
        texte: 'Étage élevé avec ascenseur',
        detail: 'Luminosité, calme et vue dégagée',
        type: 'avantage',
        axe: 'equipements',
        impact: 5
      })
    } else if (annonce.etage === 0) {
      score -= 5
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
  } else if (equips.length === 0) {
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
function scorerPlusValue(
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

// ============================================
// MOTEUR PRINCIPAL
// ============================================

/**
 * Score professionnel unifié
 * Calcule le score sur les 10 axes avec redistribution des poids
 * si certains axes n'ont pas de données
 */
export function calculerScorePro(
  annonce: Annonce,
  annonces: Annonce[], // Toutes les annonces pour comparatif
  enrichi?: DonneesEnrichiesScoring,
  budgetMax?: number | null
): ScoreComparateurResult {
  // 1. Scorer chaque axe
  const prixMarche = scorerPrixMarche(annonce, enrichi)
  const rendement = scorerRendement(annonce)
  const energie = scorerEnergie(annonce)
  const emplacement = scorerEmplacement(enrichi)
  const risques = scorerRisques(enrichi)
  const etatBien = scorerEtatBien(annonce)
  const charges = scorerCharges(annonce)
  const surface = scorerSurface(annonce, annonces)
  const equipements = scorerEquipements(annonce)
  const plusValue = scorerPlusValue(annonce, enrichi, etatBien.budgetTravaux)

  const tousAxes = [
    prixMarche, rendement, energie, emplacement, risques,
    etatBien, charges, surface, equipements, plusValue
  ]

  // 2. Redistribuer les poids si axes indisponibles
  const axesDisponibles = tousAxes.filter(a => a.disponible)
  const axesIndisponibles = tousAxes.filter(a => !a.disponible)
  
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

  // 6. Verdict et recommandation
  let verdict: string
  let recommandation: NiveauRecommandation

  if (scoreGlobal >= 75) {
    verdict = 'Excellent choix'
    recommandation = 'fortement_recommande'
  } else if (scoreGlobal >= 62) {
    verdict = 'Bon potentiel'
    recommandation = 'recommande'
  } else if (scoreGlobal >= 48) {
    verdict = 'À étudier'
    recommandation = 'a_etudier'
  } else if (scoreGlobal >= 35) {
    verdict = 'Avec réserves'
    recommandation = 'prudence'
  } else {
    verdict = 'Peu recommandé'
    recommandation = 'deconseille'
  }

  // 7. Conseil personnalisé intelligent
  const avantages = points.filter(p => p.type === 'avantage')
  const attentions = points.filter(p => p.type === 'attention')
  const conseils = points.filter(p => p.type === 'conseil')
  
  let conseilPerso: string
  if (avantages.length >= 3 && attentions.length === 0) {
    conseilPerso = 'Ce bien coche toutes les cases. Planifiez une visite rapidement — les biens de cette qualité partent vite.'
  } else if (attentions.some(a => a.axe === 'energie' && a.texte.includes('Passoire'))) {
    const travaux = etatBien.budgetTravaux
    conseilPerso = travaux > 0
      ? `Demandez des devis rénovation (~${travaux.toLocaleString('fr-FR')} €) et négociez le prix en conséquence.`
      : 'Demandez des devis rénovation énergétique avant de vous engager.'
  } else if (attentions.some(a => a.texte.includes('budget'))) {
    conseilPerso = 'Préparez vos arguments de négociation : comparez au prix DVF du secteur.'
  } else if (rendement.rendementBrut >= 5 && scoreGlobal >= 55) {
    conseilPerso = `Bon investissement locatif potentiel (~${rendement.loyerEstime} €/mois estimé). Vérifiez la demande locative.`
  } else if (avantages.length > attentions.length) {
    conseilPerso = 'Plus de points forts que de faiblesses — bonne option à considérer sérieusement.'
  } else if (attentions.length > avantages.length) {
    conseilPerso = 'Plusieurs points de vigilance identifiés. Comparez bien avec les alternatives.'
  } else {
    conseilPerso = 'Visitez le bien pour vous faire votre propre avis sur le terrain.'
  }

  // 8. Confiance
  const confiance = Math.round((axesDisponibles.length / tousAxes.length) * 100)

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
    syntheseGlobale = `Score professionnel : ${r.scoreGlobal}/100 — ${r.verdict.toLowerCase()}.`
    conseilGeneral = r.conseilPerso
  } else {
    const meilleur = sorted[0]
    const ecart = sorted[0].scoreGlobal - sorted[1].scoreGlobal

    if (ecart >= 15) {
      syntheseGlobale = `Un choix se démarque clairement avec ${meilleur.scoreGlobal}/100 (${meilleur.verdict}).`
      conseilGeneral = 'Le meilleur bien a un avantage net. Priorisez-le pour la visite.'
    } else if (ecart >= 5) {
      syntheseGlobale = `Le meilleur score est ${meilleur.scoreGlobal}/100 mais les biens sont proches.`
      conseilGeneral = 'Scores relativement proches — visitez les 2 meilleurs pour trancher.'
    } else {
      syntheseGlobale = `Biens très comparables (écart ${ecart} pts). Le contexte de visite fera la différence.`
      conseilGeneral = 'Les scores sont très proches — concentrez-vous sur le ressenti en visite.'
    }
  }

  return { syntheseGlobale, conseilGeneral, classement }
}

// ============================================
// DONNÉES RADAR CHART
// ============================================

/** Axes affichés dans le radar (regroupement des 10 axes en 6 pour la lisibilité) */
export const RADAR_AXES = [
  { key: 'prix', label: 'Prix' },
  { key: 'quartier', label: 'Quartier' },
  { key: 'risques', label: 'Sécurité' },
  { key: 'energie', label: 'Énergie' },
  { key: 'confort', label: 'Confort' },
  { key: 'budget', label: 'Budget' },
] as const

/**
 * Convertit un ScoreComparateurResult en données pour le RadarChart
 * Regroupe les 10 axes en 6 pour la lisibilité visuelle
 */
export function scoreToRadarData(result: ScoreComparateurResult): Array<{ label: string; value: number }> {
  const getAxe = (axe: AxeScoring) => result.axes.find(a => a.axe === axe)

  return [
    { label: 'prix', value: getAxe('prixMarche')?.score ?? 50 },
    { label: 'quartier', value: getAxe('emplacement')?.score ?? 50 },
    { label: 'risques', value: getAxe('risques')?.score ?? 50 },
    { label: 'energie', value: getAxe('energie')?.score ?? 50 },
    { label: 'confort', value: moyennePonderee([
      { score: getAxe('etatBien')?.score ?? 50, poids: 2 },
      { score: getAxe('equipements')?.score ?? 50, poids: 1.5 },
      { score: getAxe('surface')?.score ?? 50, poids: 1 },
    ]) },
    { label: 'budget', value: moyennePonderee([
      { score: getAxe('charges')?.score ?? 50, poids: 1 },
      { score: getAxe('rendement')?.score ?? 50, poids: 0.5 },
      { score: getAxe('plusValue')?.score ?? 50, poids: 0.5 },
    ]) },
  ]
}

function moyennePonderee(items: Array<{ score: number; poids: number }>): number {
  const total = items.reduce((sum, i) => sum + i.score * i.poids, 0)
  const poids = items.reduce((sum, i) => sum + i.poids, 0)
  return poids > 0 ? Math.round(total / poids) : 50
}

// Export des constantes pour l'UI
export { COUT_ENERGIE_M2_AN, LABELS_AXES, POIDS_AXES }

