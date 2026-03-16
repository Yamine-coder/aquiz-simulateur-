/**
 * AQUIZ — Rapport de comparaison PDF
 * Généré avec @react-pdf/renderer
 * 
 * Structure :
 * - Page 1 : Classement + Synthèse IA + Tableau comparatif complet
 * - Pages 2+ : Fiche par bien :
 *   • Header (score + rang + titre + prix)
 *   • Caractéristiques + Financement (estimations investissement)
 *   • Analyse Marché & Environnement (prix vs marché, transports, quartier)
 *   • Scoring 10 axes + Points forts/Vigilance
 *   • Conseil personnalisé
 *   • Checklist visite (générée dynamiquement)
 * - CTA + Disclaimer sur la dernière page
 */
import { Circle, Document, Image, Line, Link, Page, Polygon, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'

// ─── Types ───

interface AxeData {
  axe: string
  label: string
  score: number
  poids: number
  disponible: boolean
  detail: string
  impact: 'positif' | 'neutre' | 'negatif'
}

interface PointData {
  texte: string
  detail?: string
  type: 'avantage' | 'attention' | 'conseil'
  axe?: string
}

interface EstimationsData {
  loyerMensuelEstime?: number
  rendementBrut?: number
  coutEnergieAnnuel?: number
  budgetTravauxEstime?: number
}

interface EnrichissementData {
  marche?: {
    success: boolean
    ecartPrixM2?: number
    verdict?: string
    prixM2MedianMarche?: number
    evolution12Mois?: number
    nbTransactions?: number
  }
  risques?: {
    success: boolean
    scoreRisque?: number
    verdict?: string
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
    transportsProches?: Array<{ type: string; typeTransport: string; nom: string; distance: number; lat?: number; lon?: number; walkMin?: number; lignes?: string[]; operateur?: string; couleur?: string }>
    transportSummary?: Array<{ type: string; lignes: string[]; count: number; nearestWalkMin?: number }>
    counts?: {
      transport: number
      commerce: number
      education: number
      sante: number
      loisirs: number
      vert: number
    }
    detailedCounts?: Record<string, Array<{ type: string; label: string; count: number }>>
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

interface RadarDataPoint {
  label: string
  value: number
}

interface AnnoncePDF {
  id: string
  titre?: string
  prix: number
  surface: number
  prixM2: number
  type: 'appartement' | 'maison'
  pieces: number
  chambres: number
  ville: string
  codePostal: string
  dpe: string
  ges?: string
  etage?: number
  etagesTotal?: number
  anneeConstruction?: number
  orientation?: string
  nbSallesBains?: number
  parking?: boolean
  balconTerrasse?: boolean
  cave?: boolean
  ascenseur?: boolean
  chargesMensuelles?: number
  taxeFonciere?: number
  // Scoring
  scoreGlobal: number
  verdict: string
  recommandation: string
  conseilPerso: string
  confiance: number
  axes: AxeData[]
  points: PointData[]
  estimations?: EstimationsData
  enrichissement?: EnrichissementData
  radarData: RadarDataPoint[]
  rang: number
}

interface SyntheseIA {
  synthese?: string
  verdictFinal?: string
  conseilNego?: string
  conseilAcquisition?: string
}

export interface ComparateurPDFProps {
  logoUrl: string
  annonces: AnnoncePDF[]
  syntheseIA?: SyntheseIA | null
  syntheseDeterministe?: string
  conseilGeneral?: string
  budgetMax?: number | null
  dateGeneration: string
  /** Paramètres financement optionnels */
  tauxInteret?: number
  dureeAns?: number
  apport?: number
}

// ─── Couleurs charte AQUIZ ───
const C = {
  black: '#1a1a1a',
  white: '#ffffff',
  gray: '#646464',
  grayLight: '#969696',
  grayBg: '#f5f7fa',
  grayBorder: '#e5e7eb',
  sectionBg: '#2d3748',
  green: '#22c55e',
  greenLight: '#dcfce7',
  greenDark: '#16a34a',
  orange: '#f97316',
  orangeLight: '#fff3e0',
  red: '#ef4444',
  redLight: '#fef2f2',
  blue: '#3b82f6',
  amber: '#f59e0b',
  amberLight: '#fffbeb',
}

/** Couleurs des types de transport (badges) */
const TRANSPORT_COLORS: Record<string, { bg: string; text: string; label: string; abbr: string }> = {
  metro:  { bg: '#003CA6', text: '#ffffff', label: 'Métro', abbr: 'M' },
  rer:    { bg: '#1a1a1a', text: '#ffffff', label: 'RER', abbr: 'R' },
  train:  { bg: '#E05206', text: '#ffffff', label: 'Train', abbr: 'T' },
  tram:   { bg: '#00814F', text: '#ffffff', label: 'Tram', abbr: 'Tr' },
  bus:    { bg: '#7B2D8E', text: '#ffffff', label: 'Bus', abbr: 'B' },
  velo:   { bg: '#00A88F', text: '#ffffff', label: 'Location de vélo', abbr: 'V' },
  velib:  { bg: '#A4C639', text: '#ffffff', label: 'Vélib\'', abbr: 'V' },
  fuel:   { bg: '#6B7280', text: '#ffffff', label: 'Station service', abbr: 'S' },
}

/** Couleurs IDFM officielles pour badges lignes dans le PDF */
const PDF_RER_COLORS: Record<string, { bg: string; fg: string }> = {
  A: { bg: '#E3051C', fg: '#fff' },
  B: { bg: '#5291CE', fg: '#fff' },
  C: { bg: '#FFCD00', fg: '#1a1a1a' },
  D: { bg: '#00814F', fg: '#fff' },
  E: { bg: '#CF76A7', fg: '#fff' },
}

const PDF_METRO_COLORS: Record<string, { bg: string; fg: string }> = {
  '1': { bg: '#FFCD00', fg: '#1a1a1a' }, '2': { bg: '#003CA6', fg: '#fff' },
  '3': { bg: '#9B993A', fg: '#fff' }, '4': { bg: '#BB4B9C', fg: '#fff' },
  '5': { bg: '#F28E42', fg: '#fff' }, '6': { bg: '#77C695', fg: '#1a1a1a' },
  '7': { bg: '#F3A4BA', fg: '#1a1a1a' }, '8': { bg: '#C5A3CD', fg: '#1a1a1a' },
  '9': { bg: '#B6BD00', fg: '#1a1a1a' }, '10': { bg: '#C69214', fg: '#fff' },
  '11': { bg: '#8D5E2A', fg: '#fff' }, '12': { bg: '#00814F', fg: '#fff' },
  '13': { bg: '#98D4E2', fg: '#1a1a1a' }, '14': { bg: '#67328E', fg: '#fff' },
}

const PDF_TRANSILIEN_COLORS: Record<string, { bg: string; fg: string }> = {
  H: { bg: '#8D5E2A', fg: '#fff' }, J: { bg: '#B6BD00', fg: '#1a1a1a' },
  K: { bg: '#C5A3CD', fg: '#1a1a1a' }, L: { bg: '#77C695', fg: '#1a1a1a' },
  N: { bg: '#00814F', fg: '#fff' }, P: { bg: '#F28E42', fg: '#fff' },
  R: { bg: '#F3A4BA', fg: '#1a1a1a' }, U: { bg: '#B90845', fg: '#fff' },
}

const PDF_TRAM_COLORS: Record<string, { bg: string; fg: string }> = {
  'T1': { bg: '#003CA6', fg: '#fff' }, 'T2': { bg: '#CF76A7', fg: '#fff' },
  'T3a': { bg: '#F28E42', fg: '#fff' }, 'T3b': { bg: '#00814F', fg: '#fff' },
  'T4': { bg: '#F3A4BA', fg: '#1a1a1a' }, 'T5': { bg: '#9B993A', fg: '#fff' },
  'T6': { bg: '#E3051C', fg: '#fff' }, 'T7': { bg: '#8D5E2A', fg: '#fff' },
  'T8': { bg: '#9B993A', fg: '#fff' }, 'T9': { bg: '#003CA6', fg: '#fff' },
  'T10': { bg: '#F28E42', fg: '#fff' }, 'T11': { bg: '#E3051C', fg: '#fff' },
  'T13': { bg: '#77C695', fg: '#1a1a1a' },
}

/** Résout la couleur d'un badge ligne PDF selon type+ligne */
function getPdfLineColor(typeTransport: string, ligne: string): { bg: string; fg: string } {
  if (typeTransport === 'rer') return PDF_RER_COLORS[ligne.toUpperCase()] ?? { bg: '#1a1a1a', fg: '#fff' }
  if (typeTransport === 'metro') return PDF_METRO_COLORS[ligne] ?? { bg: '#003CA6', fg: '#fff' }
  if (typeTransport === 'train') return PDF_TRANSILIEN_COLORS[ligne.toUpperCase()] ?? { bg: '#E05206', fg: '#fff' }
  if (typeTransport === 'tram') return PDF_TRAM_COLORS[ligne] ?? PDF_TRAM_COLORS[`T${ligne}`] ?? { bg: '#00814F', fg: '#fff' }
  const tc = TRANSPORT_COLORS[typeTransport] ?? TRANSPORT_COLORS.bus
  return { bg: tc.bg, fg: tc.text }
}

// ─── Helpers ───

function fmt(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Axes à exclure de l'affichage Points forts / Vigilance */
const AXES_EXCLUS = ['risques', 'etatBien', 'plusValue']

/** Nettoie les espaces insécables qui s'affichent en `/` dans react-pdf */
function sanitizeDetail(text: string): string {
  return text.replace(/[\u00A0\u202F\u2009]/g, ' ')
}

/**
 * Génère des points forts et à vérifier style expert AQUIZ
 * Raisonnement immobilier > financier. Toujours lié au projet.
 */
function genererPointsExpert(a: AnnoncePDF): { forts: string[]; verifier: string[] } {
  const forts: string[] = []
  const verifier: string[] = []
  const ecart = a.enrichissement?.marche?.ecartPrixM2
  const mediane = a.enrichissement?.marche?.prixM2MedianMarche

  // ── Prix vs marché ──
  if (ecart !== undefined && ecart <= -15) {
    forts.push(`À ${fmt(a.prixM2)} EUR/m², le bien se positionne ${Math.abs(ecart).toFixed(0)}% sous la médiane locale${mediane ? ` (${fmt(Math.round(mediane))} EUR/m²)` : ''} — marge confortable en cas de revente`)
  } else if (ecart !== undefined && ecart <= -5) {
    forts.push(`Prix au m² ${Math.abs(ecart).toFixed(0)}% sous le marché local — positionnement favorable pour l'acheteur`)
  } else if (ecart !== undefined && ecart >= 15) {
    verifier.push(`Prix ${ecart.toFixed(0)}% au-dessus de la médiane du secteur — justifier l'écart ou négocier avant offre`)
  } else if (ecart !== undefined && ecart >= 5) {
    verifier.push(`Prix légèrement au-dessus du marché (+${ecart.toFixed(0)}%) — marge de négociation à explorer`)
  }

  // ── Énergie / DPE ──
  const coutEnergie = a.estimations?.coutEnergieAnnuel
  if (['A', 'B'].includes(a.dpe)) {
    forts.push(`DPE ${a.dpe}${coutEnergie ? `, environ ${fmt(coutEnergie)} EUR/an d'énergie` : ''} — aucun travaux d'isolation à prévoir`)
  } else if (a.dpe === 'C') {
    forts.push(`DPE C${coutEnergie ? `, environ ${fmt(coutEnergie)} EUR/an` : ''} — conforme aux standards actuels, pas de surcoût énergie`)
  } else if (a.dpe === 'D') {
    verifier.push(`DPE D${coutEnergie ? ` (${fmt(coutEnergie)} EUR/an)` : ''} — amélioration énergétique envisageable, chiffrer l'isolation`)
  } else if (a.dpe === 'E') {
    verifier.push(`DPE E${coutEnergie ? ` (${fmt(coutEnergie)} EUR/an)` : ''} — travaux d'isolation recommandés, intégrer au budget`)
  } else if (['F', 'G'].includes(a.dpe)) {
    verifier.push(`Passoire thermique (DPE ${a.dpe}) — rénovation obligatoire, location interdite en l'état`)
  }

  // ── Transports / Emplacement ──
  const scoreTransports = a.enrichissement?.quartier?.transports
  const scoreCommerces = a.enrichissement?.quartier?.commerces
  if (scoreTransports !== undefined && scoreTransports >= 70) {
    forts.push('Excellente desserte transports — atout majeur pour la valorisation et le quotidien')
  } else if (scoreTransports !== undefined && scoreTransports < 35) {
    verifier.push('Desserte transports limitée — véhicule nécessaire, impact potentiel sur la revente')
  }
  if (scoreCommerces !== undefined && scoreCommerces >= 70 && forts.length < 2) {
    forts.push('Commune bien équipée en commerces et services — confort de vie au quotidien')
  }

  // ── Rendement locatif ──
  const rendement = a.estimations?.rendementBrut
  const loyer = a.estimations?.loyerMensuelEstime
  if (rendement !== undefined && rendement >= 6) {
    forts.push(`Rendement brut estimé à ${rendement.toFixed(1)}%${loyer ? ` (loyer ~${fmt(loyer)} EUR/mois)` : ''} — attractif en investissement`)
  } else if (rendement !== undefined && rendement < 4 && rendement > 0) {
    verifier.push(`Rendement estimé ${rendement.toFixed(1)}% — cohérent en résidence principale, à approfondir si objectif investissement`)
  }

  // ── Charges ──
  const charges = a.chargesMensuelles
  const taxe = a.taxeFonciere
  if (charges === undefined && taxe === undefined) {
    verifier.push('Charges de copro et taxe foncière non renseignées — à demander au vendeur avant offre')
  } else if (charges !== undefined && charges > 0) {
    const chargesAn = charges * 12 + (taxe ?? 0)
    const ratio = a.prix > 0 ? (chargesAn / a.prix) * 100 : 0
    if (ratio > 2.5) {
      verifier.push(`Charges élevées (${fmt(chargesAn)} EUR/an, ${ratio.toFixed(1)}% du prix) — impacte le coût réel de détention`)
    } else if (ratio <= 1 && forts.length < 2) {
      forts.push(`Charges maîtrisées (${fmt(chargesAn)} EUR/an) — coût de détention raisonnable`)
    }
  }

  // ── Surface / agencement ──
  if (a.pieces > 0) {
    const m2Piece = a.surface / a.pieces
    if (m2Piece >= 22 && forts.length < 2) {
      forts.push(`Pièces spacieuses (${Math.round(m2Piece)} m²/pièce) — confort au-dessus de la norme`)
    } else if (m2Piece < 14) {
      verifier.push(`Surface par pièce faible (${Math.round(m2Piece)} m²) — vérifier l'agencement lors de la visite`)
    }
  }

  // ── Fallback prudent ──
  if (verifier.length === 0) {
    verifier.push('Aucun frein identifié — vérifier l\'état des parties communes et les PV d\'AG lors de la visite')
  }

  return { forts: forts.slice(0, 2), verifier: verifier.slice(0, 2) }
}

function getScoreColor(score: number): string {
  if (score >= 75) return C.green
  if (score >= 60) return '#84cc16'
  if (score >= 45) return C.amber
  if (score >= 30) return C.orange
  return C.red
}

function getScoreBg(score: number): string {
  if (score >= 75) return C.greenLight
  if (score >= 60) return '#f7fee7'
  if (score >= 45) return C.amberLight
  if (score >= 30) return C.orangeLight
  return C.redLight
}

/** Extrait le nom de ville propre depuis le champ ville brut
 *  "Rosny-sous-Bois 93110 Rosny Sud - Gare RER A" → "Rosny-sous-Bois"
 *  "Paris 15ème" → "Paris 15ème"
 *  "Colombes" → "Colombes"
 */
function cleanVille(ville: string): string {
  let v = ville.trim()
  // Retirer tout ce qui est après un code postal (5 chiffres)
  v = v.replace(/\s+\d{5}\b.*$/, '')
  // Retirer les suffixes type "- Gare RER A", "- Centre Ville", "- Quartier Nord"
  v = v.replace(/\s*[-–]\s*(Gare|Centre|Quartier|Secteur|Proche|Résidence|Prog)\b.*$/i, '')
  // Retirer les tokens restants trop longs après le nom de ville (ex: "Rosny Sud")
  // On garde le nom composé (tirets) mais on coupe si on a un mot isolé de quartier après
  // Heuristique : si le résultat fait plus de 35 chars, tronquer au premier " - "
  if (v.length > 35) {
    const dashIdx = v.indexOf(' - ')
    if (dashIdx > 0) v = v.substring(0, dashIdx)
  }
  // Dernière limite
  if (v.length > 40) v = v.substring(0, 40) + '…'
  return v || ville.trim().substring(0, 30)
}

/** Génère un titre propre : "Maison 120 m²" */
function cleanTitle(a: AnnoncePDF): string {
  const typeLabel = a.type === 'maison' ? 'Maison' : 'Appartement'
  return `${typeLabel} ${a.surface} m²`
}

/** Génère le sous-titre localisation : "Colombes (92700)" */
function cleanSubtitle(a: AnnoncePDF): string {
  return `${cleanVille(a.ville)} (${a.codePostal})`
}

/** Version une ligne compacte : "Maison 120 m² — Colombes" */
function cleanTitleShort(a: AnnoncePDF): string {
  return `${a.type === 'maison' ? 'Maison' : 'Appt'} ${a.surface} m² — ${cleanVille(a.ville)}`
}

function getDpeColor(dpe: string): string {
  const colors: Record<string, string> = {
    A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f59e0b',
    E: '#f97316', F: '#ef4444', G: '#b91c1c', NC: '#9ca3af',
  }
  return colors[dpe] || '#9ca3af'
}

function getRecoLabel(reco: string): string {
  const map: Record<string, string> = {
    fortement_recommande: 'Fortement recommandé',
    recommande: 'Recommandé',
    a_etudier: 'À étudier',
    prudence: 'Prudence',
    deconseille: 'Déconseillé',
  }
  return map[reco] || reco
}

function getVerdictMarcheLabel(verdict?: string): string {
  const map: Record<string, string> = {
    excellent: 'Excellent prix',
    bon: 'Bon prix',
    correct: 'Prix correct',
    cher: 'Au-dessus du marché',
    tres_cher: 'Très au-dessus',
  }
  return map[verdict || ''] || 'Non disponible'
}

function getRisqueVerdict(verdict?: string): { label: string; color: string } {
  if (verdict === 'sûr') return { label: 'Zone sûre', color: C.green }
  if (verdict === 'vigilance') return { label: 'Vigilance', color: C.amber }
  return { label: 'Zone à risque', color: C.red }
}

function calculerMensualite(prixBien: number, apport: number, tauxAnnuel: number, dureeAns: number): number {
  const capital = prixBien - apport
  if (capital <= 0) return 0
  const t = tauxAnnuel / 100 / 12
  const n = dureeAns * 12
  if (t === 0) return Math.round(capital / n)
  return Math.round((capital * t) / (1 - Math.pow(1 + t, -n)))
}

function getNiveauRadonLabel(niveau?: number): string {
  if (niveau === 1) return 'Faible'
  if (niveau === 2) return 'Moyen'
  if (niveau === 3) return 'Élevé'
  return '—'
}

function getQuartierSubLabel(score: number): string {
  if (score >= 75) return 'Excellent'
  if (score >= 50) return 'Bon'
  if (score >= 25) return 'Moyen'
  return 'Faible'
}

/** Génère une checklist de visite personnalisée selon les données du bien */
function genererChecklistVisite(a: AnnoncePDF): string[] {
  const items: string[] = []

  // DPE / Énergie
  if (['F', 'G'].includes(a.dpe)) {
    items.push('Demander tous les diagnostics énergétiques (DPE détaillé, audit)')
    items.push('Estimer le coût de rénovation énergétique obligatoire')
  } else if (['D', 'E'].includes(a.dpe)) {
    items.push('Vérifier le détail du DPE et les postes énergivores')
  }

  // Âge du bâtiment
  if (a.anneeConstruction) {
    const age = new Date().getFullYear() - a.anneeConstruction
    if (age > 40) {
      items.push('Vérifier état toiture, plomberie et tableau électrique')
      items.push('Demander les 3 derniers PV d\u0027AG de copropriété')
    } else if (age > 20) {
      items.push('Vérifier les derniers travaux effectués dans la copro')
    }
    if (a.anneeConstruction < 1997) {
      items.push('Vérifier le diagnostic amiante et plomb')
    }
  }

  // Étage sans ascenseur
  if (a.etage && a.etage >= 3 && !a.ascenseur) {
    items.push(`${a.etage}e étage sans ascenseur \u2014 évaluer l\u0027accessibilité au quotidien`)
  }

  // Risques naturels
  if (a.enrichissement?.risques?.zoneInondable) {
    items.push('Zone inondable : vérifier historique des crues et assurance')
  }
  if (a.enrichissement?.risques?.niveauRadon && a.enrichissement.risques.niveauRadon >= 2) {
    items.push(`Radon niveau ${a.enrichissement.risques.niveauRadon}/3 — prévoir mesure de concentration`)
  }

  // Marché
  if (a.enrichissement?.marche?.ecartPrixM2 && a.enrichissement.marche.ecartPrixM2 > 10) {
    items.push('Prix au-dessus du marché — préparer des arguments de négociation')
  }

  // Charges élevées
  if (a.chargesMensuelles && a.chargesMensuelles > 300) {
    items.push(`Charges élevées (${fmt(a.chargesMensuelles)} €/m) — analyser les postes de charges`)
  }

  // Pas de parking
  if (!a.parking) {
    items.push('Pas de parking — vérifier les possibilités de stationnement')
  }

  // Orientation
  if (!a.orientation) {
    items.push('Vérifier l\u0027exposition et la luminosité naturelle')
  }

  // Génériques toujours utiles
  items.push('Tester robinets, prises électriques et volets')
  items.push('Observer humidité, fissures et état des parties communes')
  items.push('Poser la question : "Y a-t-il des travaux votés ou prévus ?"')

  return items.slice(0, 8) // Max 8 items pour rester compact
}

// ─── Styles ───
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.black,
    backgroundColor: C.white,
    paddingTop: 0,
    paddingBottom: 44,
  },
  /** Pages per-bien: header is absolute-positioned, content needs top margin */
  pageWithFixedHeader: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.black,
    backgroundColor: C.white,
    paddingTop: 0,
    paddingBottom: 44,
  },
  // Header
  header: {
    backgroundColor: C.black,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  headerLeft: { width: 100 },
  headerLogo: { width: 90, height: 32, objectFit: 'contain' as const },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitleText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 1.5,
  },
  headerSubText: { fontSize: 6, color: '#777', marginTop: 2 },
  headerRight: { width: 100, alignItems: 'flex-end' },
  headerAccent: { height: 2, backgroundColor: C.green },
  // Content
  content: { paddingHorizontal: 28 },
  // Section title
  sectionTitle: {
    backgroundColor: C.sectionBg,
    borderRadius: 3,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitleText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 0.5,
  },
  // Data row
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.3,
    borderBottomColor: '#eee',
  },
  dataLabel: { fontSize: 7, color: C.gray },
  dataValue: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black },
  // Two columns
  twoColumns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  halfColumn: { flex: 1 },
  // Cards
  card: {
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.grayBorder,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  cardGreen: {
    backgroundColor: C.greenLight,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  // CTA
  ctaCard: {
    backgroundColor: C.black,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  ctaTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white },
  ctaSub: { fontSize: 7, color: '#b4b4b4', marginTop: 2, maxWidth: 260 },
  ctaBtn: {
    backgroundColor: C.green,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ctaBtnText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: C.grayBorder,
  },
  footerLogo: { width: 40, height: 14, objectFit: 'contain' as const, opacity: 0.5 },
  footerDisclaimer: { fontSize: 5, color: C.grayLight },
  footerPage: { fontSize: 5.5, color: C.grayLight },
})

// ─── Sub-Components ───

function Header({ logoUrl, nbBiens }: { logoUrl: string; nbBiens: number }) {
  return (
    <>
      <View style={s.header}>
        <View style={s.headerLeft}>
          {/* eslint-disable-next-line */}
          <Image src={logoUrl} style={s.headerLogo} />
        </View>
        <View style={s.headerCenter}>
          <Text style={s.headerTitleText}>RAPPORT COMPARAISON</Text>
          <Text style={s.headerSubText}>
            {nbBiens} bien{nbBiens > 1 ? 's' : ''} analysé{nbBiens > 1 ? 's' : ''} — Algorithme AQUIZ v2
          </Text>
        </View>
        <View style={s.headerRight}>
          <Link src="https://calendly.com/contact-aquiz/30min" style={{ textDecoration: 'none' }}>
            <View style={{
              backgroundColor: C.green,
              borderRadius: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}>
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.white, letterSpacing: 0.3 }}>
                PRENDRE RDV
              </Text>
            </View>
          </Link>
        </View>
      </View>
      <View style={s.headerAccent} />
    </>
  )
}

function Footer({ logoUrl }: { logoUrl: string }) {
  return (
    <View style={s.footer} fixed>
      {/* eslint-disable-next-line */}
      <Image src={logoUrl} style={s.footerLogo} />
      <Text style={s.footerDisclaimer}>
        Scores basés sur données publiques (DVF, Géorisques, OSM). Ils ne remplacent pas un avis professionnel.
      </Text>
      <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

/** Fixed header for per-bien pages — absolute positioned at top */
function FixedHeader({ logoUrl, nbBiens }: { logoUrl: string; nbBiens: number }) {
  return (
    <View fixed style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          {/* eslint-disable-next-line */}
          <Image src={logoUrl} style={s.headerLogo} />
        </View>
        <View style={s.headerCenter}>
          <Text style={s.headerTitleText}>RAPPORT COMPARAISON</Text>
          <Text style={s.headerSubText}>
            {nbBiens} bien{nbBiens > 1 ? 's' : ''} analysé{nbBiens > 1 ? 's' : ''} — Algorithme AQUIZ v2
          </Text>
        </View>
        <View style={s.headerRight}>
          <Link src="https://calendly.com/contact-aquiz/30min" style={{ textDecoration: 'none' }}>
            <View style={{
              backgroundColor: C.green,
              borderRadius: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}>
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.white, letterSpacing: 0.3 }}>
                PRENDRE RDV
              </Text>
            </View>
          </Link>
        </View>
      </View>
      <View style={s.headerAccent} />
    </View>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={s.sectionTitle} minPresenceAhead={80}>
      <Text style={s.sectionTitleText}>{title}</Text>
    </View>
  )
}

function DataRow({ label, value, highlight, bold }: { label: string; value: string; highlight?: boolean; bold?: boolean }) {
  return (
    <View style={s.dataRow}>
      <Text style={s.dataLabel}>{label}</Text>
      <Text style={[s.dataValue, highlight ? { color: C.green } : {}, bold ? { fontSize: 8 } : {}]}>{value}</Text>
    </View>
  )
}

function BoolRow({ label, value }: { label: string; value?: boolean }) {
  return (
    <View style={s.dataRow}>
      <Text style={s.dataLabel}>{label}</Text>
      <Text style={[s.dataValue, { color: value ? C.green : C.grayLight }]}>
        {value ? '✓' : '✗'}
      </Text>
    </View>
  )
}

/** DPE badge */
function DpeBadge({ dpe }: { dpe: string }) {
  return (
    <View style={{
      backgroundColor: getDpeColor(dpe),
      borderRadius: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
    }}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.white }}>{dpe}</Text>
    </View>
  )
}

/** Barre de progression pour un axe */
function AxeBar({ label, score, poids }: { label: string; score: number; poids: number }) {
  const color = score >= 70 ? C.green : score >= 45 ? C.amber : score > 0 ? C.red : C.grayBorder
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
      <Text style={{ fontSize: 5.5, color: C.gray, width: 72 }}>{label} ({poids}%)</Text>
      <View style={{ flex: 1, height: 3.5, backgroundColor: '#e6e6e6', borderRadius: 2 }}>
        <View style={{ height: 3.5, borderRadius: 2, backgroundColor: color, width: `${Math.max(score, 2)}%` }} />
      </View>
      <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: C.gray, width: 18, textAlign: 'right' }}>
        {score > 0 ? score : '—'}
      </Text>
    </View>
  )
}

/** Radar chart SVG pour le PDF — with outer labels */
function PdfRadar({ data, size = 150 }: { data: RadarDataPoint[]; size?: number }) {
  if (!data || data.length < 3) return null
  const margin = 22 // space for labels around chart
  const totalSize = size + margin * 2
  const cx = totalSize / 2
  const cy = totalSize / 2
  const radius = size / 2 - 4
  const n = data.length
  const startAngle = -Math.PI / 2

  function polarToXY(angle: number, r: number): { x: number; y: number } {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const gridLevels = [0.3, 0.6, 1.0]

  const dataPoints = data.map((d, i) => {
    const angle = startAngle + (2 * Math.PI * i) / n
    const r = (Math.min(d.value, 100) / 100) * radius
    return polarToXY(angle, r)
  })
  const polygonPoints = dataPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const axes = data.map((d, i) => {
    const angle = startAngle + (2 * Math.PI * i) / n
    const ep = polarToXY(angle, radius)
    const lp = polarToXY(angle, radius + 14)
    return { label: d.label.length > 8 ? d.label.substring(0, 7) + '.' : d.label, endpoint: ep, labelPos: lp, value: d.value }
  })

  return (
    <Svg width={totalSize} height={totalSize} viewBox={`0 0 ${totalSize} ${totalSize}`}>
      {/* Background circle fill */}
      <Circle cx={cx} cy={cy} r={radius} fill="#f8faf8" stroke="none" />
      {/* Grid circles */}
      {gridLevels.map((level, i) => (
        <Circle
          key={`grid-${i}`}
          cx={cx}
          cy={cy}
          r={radius * level}
          fill="none"
          stroke={C.grayBorder}
          strokeWidth={0.4}
        />
      ))}
      {/* Axis lines */}
      {axes.map((a, i) => (
        <Line
          key={`axis-${i}`}
          x1={cx}
          y1={cy}
          x2={a.endpoint.x}
          y2={a.endpoint.y}
          stroke={C.grayBorder}
          strokeWidth={0.3}
        />
      ))}
      {/* Data polygon */}
      <Polygon
        points={polygonPoints}
        fill={C.green}
        fillOpacity={0.25}
        stroke={C.green}
        strokeWidth={1.5}
      />
      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <Circle
          key={`dot-${i}`}
          cx={p.x}
          cy={p.y}
          r={2}
          fill={C.green}
        />
      ))}
    </Svg>
  )
}

// ─── New Helpers for Optimized Report ───

function getOpportuniteLabel(score: number): string {
  if (score >= 75) return 'Bon achat'
  if (score >= 55) return 'Correct'
  return 'À négocier'
}

function getOpportuniteColor(score: number): string {
  if (score >= 75) return C.green
  if (score >= 55) return C.amber
  return C.orange
}

function getOpportuniteBg(score: number): string {
  if (score >= 75) return C.greenLight
  if (score >= 55) return C.amberLight
  return C.orangeLight
}

/** Estimate 5-year property value based on observed market evolution */
function estimerValeur5Ans(prix: number, evolution12Mois?: number): number {
  const tauxAnnuel = evolution12Mois !== undefined ? evolution12Mois / 100 : 0.02
  return Math.round(prix * Math.pow(1 + tauxAnnuel, 5))
}

// ─── Négociation Helpers ───

interface ArgumentNego {
  argument: string
  impact: 'fort' | 'moyen' | 'faible'
}

/** Identifie les leviers de négociation d'un bien */
function identifierLeviersNego(a: AnnoncePDF): ArgumentNego[] {
  const args: ArgumentNego[] = []

  // 1. Écart vs marché DVF
  const ecart = a.enrichissement?.marche?.ecartPrixM2
  if (ecart != null && ecart > 5) {
    args.push({
      argument: `Le prix/m² (${fmt(a.prixM2)} €) est +${ecart.toFixed(0)}% au-dessus de la médiane DVF (${a.enrichissement?.marche?.prixM2MedianMarche ? fmt(a.enrichissement.marche.prixM2MedianMarche) + ' €/m²' : 'secteur'})`,
      impact: ecart > 15 ? 'fort' : 'moyen',
    })
  } else if (ecart != null && ecart > 0 && ecart <= 5) {
    args.push({
      argument: `Prix légèrement au-dessus du marché (+${ecart.toFixed(0)}%) — marge de négociation limitée`,
      impact: 'faible',
    })
  }

  // 2. DPE défavorable
  if (['F', 'G'].includes(a.dpe)) {
    args.push({
      argument: `DPE ${a.dpe} — passoire thermique, rénovation énergétique obligatoire (loi Climat)`,
      impact: 'fort',
    })
  } else if (['D', 'E'].includes(a.dpe)) {
    args.push({
      argument: `DPE ${a.dpe} — performance énergétique moyenne, travaux d'amélioration à prévoir`,
      impact: 'moyen',
    })
  }

  // 3. Absence de parking
  if (!a.parking) {
    args.push({
      argument: 'Absence de stationnement — coût d\'un parking en sus',
      impact: 'moyen',
    })
  }

  // 4. Étage élevé sans ascenseur
  if (a.etage && a.etage >= 3 && !a.ascenseur) {
    args.push({
      argument: `${a.etage}e étage sans ascenseur — accessibilité réduite, revente plus difficile`,
      impact: 'moyen',
    })
  }

  // 5. Orientation défavorable ou inconnue
  if (!a.orientation) {
    args.push({
      argument: 'Orientation non communiquée — potentiellement nord ou peu lumineux',
      impact: 'faible',
    })
  } else if (['nord', 'Nord', 'N'].includes(a.orientation)) {
    args.push({
      argument: 'Exposition nord — luminosité réduite, chauffage plus élevé',
      impact: 'moyen',
    })
  }

  // 6. Pas de balcon/terrasse
  if (!a.balconTerrasse) {
    args.push({
      argument: 'Absence de balcon ou terrasse — pas d\'espace extérieur privatif',
      impact: 'faible',
    })
  }

  // 7. Charges élevées
  if (a.chargesMensuelles && a.chargesMensuelles > 250) {
    args.push({
      argument: `Charges mensuelles élevées (${fmt(a.chargesMensuelles)} €/mois) — impact sur le budget global`,
      impact: 'moyen',
    })
  }

  // 8. Zone inondable
  if (a.enrichissement?.risques?.zoneInondable) {
    args.push({
      argument: 'Bien situé en zone inondable — risque assurance et revente',
      impact: 'fort',
    })
  }

  // 9. Radon
  if (a.enrichissement?.risques?.niveauRadon && a.enrichissement.risques.niveauRadon >= 2) {
    args.push({
      argument: `Zone radon niveau ${a.enrichissement.risques.niveauRadon}/3 — travaux de ventilation possibles`,
      impact: 'faible',
    })
  }

  // 10. Bâtiment ancien
  if (a.anneeConstruction) {
    const age = new Date().getFullYear() - a.anneeConstruction
    if (age > 50) {
      args.push({
        argument: `Construction de ${a.anneeConstruction} (${age} ans) — risque de travaux lourds (toiture, plomberie, électricité)`,
        impact: 'moyen',
      })
    }
  }

  return args
}

function getImpactColor(impact: 'fort' | 'moyen' | 'faible'): string {
  if (impact === 'fort') return C.red
  if (impact === 'moyen') return C.orange
  return C.amber
}

function getImpactBg(impact: 'fort' | 'moyen' | 'faible'): string {
  if (impact === 'fort') return C.redLight
  if (impact === 'moyen') return C.orangeLight
  return C.amberLight
}

function getImpactLabel(impact: 'fort' | 'moyen' | 'faible'): string {
  if (impact === 'fort') return 'FORT'
  if (impact === 'moyen') return 'MOYEN'
  return 'FAIBLE'
}

// ═══════════════════════════════════════════════
// DOCUMENT PRINCIPAL — RAPPORT OPTIMISÉ
// ═══════════════════════════════════════════════

export function ComparateurPDF({
  logoUrl,
  annonces,
  syntheseIA,
  syntheseDeterministe,
  conseilGeneral,
  budgetMax: _bm,
  dateGeneration,
  tauxInteret,
  dureeAns,
  apport,
}: ComparateurPDFProps) {
  void _bm
  // Fallback taux / durée si l'utilisateur n'a pas rempli de simulation
  const effectiveTaux = tauxInteret ?? 3.5
  const effectiveDuree = dureeAns ?? 20
  const sorted = [...annonces].sort((a, b) => a.rang - b.rang)
  const n = sorted.length
  const best = sorted[0]

  return (
    <Document>
      {/* ══════════════════════════════════════════
          PAGE 1 — RÉSUMÉ DÉCISIONNEL + COMPARAISON RAPIDE
          ══════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Header logoUrl={logoUrl} nbBiens={n} />
        <View style={s.content}>

          {/* ── Date ── */}
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 6, color: C.grayLight }}>{dateGeneration}</Text>
          </View>

          {/* ═══════════════════════════════════════
              1. RÉSUMÉ DÉCISIONNEL
              ═══════════════════════════════════════ */}
          <View style={{ marginTop: 10 }}>
            <SectionTitle title="1. RÉSUMÉ DÉCISIONNEL" />

            {/* ── Meilleure opportunité — Card ── */}
            <View style={{
              marginTop: 8,
              backgroundColor: C.white,
              borderRadius: 6,
              borderWidth: 0.5,
              borderColor: C.grayBorder,
              borderLeftWidth: 3,
              borderLeftColor: C.green,
              overflow: 'hidden',
            }}>
              {/* En-tête gris avec label */}
              <View style={{
                backgroundColor: C.grayBg,
                paddingVertical: 4,
                paddingHorizontal: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: C.grayBorder,
              }}>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.greenDark, letterSpacing: 0.3 }}>
                  MEILLEURE OPPORTUNITÉ DÉTECTÉE
                </Text>
              </View>

              {/* Contenu principal : score discret + infos */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}>
                {/* Score — sobre, fond gris */}
                <View style={{ alignItems: 'center', flexShrink: 0 }}>
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: C.grayBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.black }}>
                      {best.scoreGlobal}
                    </Text>
                    <Text style={{ fontSize: 5, color: C.grayLight, marginTop: -1 }}>/100</Text>
                  </View>
                </View>

                {/* Détails bien */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.black }}>
                    {cleanTitle(best)}
                  </Text>
                  <Text style={{ fontSize: 8, color: C.gray, marginTop: 2 }}>
                    {cleanSubtitle(best)}
                  </Text>

                  {/* Ligne prix + indice */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.black }}>
                      {fmt(best.prix)} EUR
                    </Text>
                    <View style={{
                      backgroundColor: getOpportuniteBg(best.scoreGlobal),
                      borderRadius: 3,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}>
                      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: getOpportuniteColor(best.scoreGlobal) }}>
                        {getOpportuniteLabel(best.scoreGlobal)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Description */}
              <View style={{
                borderTopWidth: 0.5,
                borderTopColor: C.grayBorder,
                paddingHorizontal: 14,
                paddingVertical: 6,
                backgroundColor: C.grayBg,
              }}>
                <Text style={{ fontSize: 7, color: C.gray, lineHeight: 1.6 }}>
                  Ce bien présente le meilleur équilibre entre prix, localisation et charges.
                  {best.scoreGlobal >= 75
                    ? ' Il constitue une opportunité intéressante pour un primo-accédant ou un projet patrimonial.'
                    : best.scoreGlobal >= 55
                      ? ' Il constitue une option solide mais mérite une vérification approfondie avant engagement.'
                      : ' Une marge de négociation est envisageable pour améliorer les conditions d\u0027acquisition.'
                  }
                </Text>
              </View>
            </View>

            {/* ── Classement table ── */}
            <View style={{ marginTop: 12 }}>
              {/* Header row */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: C.grayBg,
                borderBottomWidth: 1,
                borderBottomColor: C.black,
                paddingVertical: 6,
                paddingHorizontal: 8,
              }}>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.black, width: 70 }}>Classement</Text>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.black, flex: 1 }}>Bien</Text>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.black, width: 70, textAlign: 'center' }}>Score AQUIZ</Text>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.black, width: 80, textAlign: 'center' }}>Opportunité</Text>
              </View>

              {/* Ranking rows */}
              {sorted.map((a, i) => (
                <View key={a.id} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 8,
                  backgroundColor: i % 2 === 0 ? C.white : C.grayBg,
                  borderBottomWidth: 0.5,
                  borderBottomColor: C.grayBorder,
                }}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.black, width: 70 }}>
                    {a.rang}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.black }}>
                      {a.type === 'maison' ? 'Maison' : 'Appartement'} {a.surface} m²
                    </Text>
                    <Text style={{ fontSize: 6.5, color: C.grayLight, marginTop: 1 }}>
                      {cleanVille(a.ville)} ({a.codePostal})
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 10,
                    fontFamily: 'Helvetica-Bold',
                    color: getScoreColor(a.scoreGlobal),
                    width: 70,
                    textAlign: 'center',
                  }}>
                    {a.scoreGlobal}
                  </Text>
                  <View style={{ width: 80, alignItems: 'center' }}>
                    <View style={{
                      backgroundColor: getOpportuniteBg(a.scoreGlobal),
                      borderRadius: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}>
                      <Text style={{
                        fontSize: 7,
                        fontFamily: 'Helvetica-Bold',
                        color: getOpportuniteColor(a.scoreGlobal),
                      }}>
                        {getOpportuniteLabel(a.scoreGlobal)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ═══════════════════════════════════════
              2. COMPARAISON RAPIDE DES BIENS
              ═══════════════════════════════════════ */}
          <View style={{ marginTop: 14 }}>
            <SectionTitle title="2. COMPARAISON RAPIDE DES BIENS" />

            {/* Table header */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: C.grayBg,
              borderBottomWidth: 1,
              borderBottomColor: C.black,
              paddingVertical: 6,
              paddingHorizontal: 8,
              marginTop: 6,
            }}>
              <View style={{ width: 90 }}>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.black }}>Critère</Text>
              </View>
              {sorted.map(a => (
                <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: a.rang === 1 ? C.greenDark : C.black }}>
                    Bien {a.rang}
                  </Text>
                  <Text style={{ fontSize: 5.5, color: C.grayLight, marginTop: 1 }}>
                    {cleanVille(a.ville).substring(0, 14)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Comparison rows — airy & readable */}
            {[
              { label: 'Prix', values: sorted.map(a => `${fmt(a.prix)} €`), highlightMin: sorted.map(a => a.prix) },
              { label: 'Surface', values: sorted.map(a => `${a.surface} m²`), highlightMax: sorted.map(a => a.surface) },
              { label: 'Prix / m²', values: sorted.map(a => `${fmt(a.prixM2)} €/m²`), highlightMin: sorted.map(a => a.prixM2) },
              { label: 'Pièces', values: sorted.map(a => `${a.pieces} pièces`) },
              {
                label: `Mensualité (${effectiveDuree} ans)`,
                values: sorted.map(a => `${fmt(calculerMensualite(a.prix, apport || 0, effectiveTaux, effectiveDuree))} €/mois`),
                highlightMin: sorted.map(a => calculerMensualite(a.prix, apport || 0, effectiveTaux, effectiveDuree)),
              },
            ].map((row, idx) => {
              const minVal = row.highlightMin ? Math.min(...row.highlightMin) : undefined
              const maxVal = (row as Record<string, unknown>).highlightMax ? Math.max(...((row as Record<string, unknown>).highlightMax as number[])) : undefined
              return (
                <View key={idx} style={{
                  flexDirection: 'row',
                  paddingVertical: 7,
                  paddingHorizontal: 8,
                  borderBottomWidth: 0.5,
                  borderBottomColor: C.grayBorder,
                  backgroundColor: idx % 2 === 0 ? C.white : C.grayBg,
                }}>
                  <View style={{ width: 90 }}>
                    <Text style={{ fontSize: 7.5, color: C.gray }}>{row.label}</Text>
                  </View>
                  {row.values.map((val, i) => {
                    const numericArr = row.highlightMin || (row as Record<string, unknown>).highlightMax as number[] | undefined
                    const isHighlight = numericArr && (
                      (minVal !== undefined && numericArr[i] === minVal) ||
                      (maxVal !== undefined && numericArr[i] === maxVal)
                    )
                    return (
                      <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{
                          fontSize: 7.5,
                          fontFamily: isHighlight ? 'Helvetica-Bold' : 'Helvetica',
                          color: isHighlight ? C.greenDark : C.black,
                        }}>
                          {val}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              )
            })}

            {/* DPE row */}
            <View style={{
              flexDirection: 'row',
              paddingVertical: 7,
              paddingHorizontal: 8,
              borderBottomWidth: 0.5,
              borderBottomColor: C.grayBorder,
            }}>
              <View style={{ width: 90 }}>
                <Text style={{ fontSize: 7.5, color: C.gray }}>DPE</Text>
              </View>
              {sorted.map(a => (
                <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                  <DpeBadge dpe={a.dpe} />
                </View>
              ))}
            </View>

            {/* Score AQUIZ row — highlighted */}
            <View style={{
              flexDirection: 'row',
              paddingVertical: 8,
              paddingHorizontal: 8,
              backgroundColor: C.greenLight,
              borderBottomWidth: 0.5,
              borderBottomColor: C.grayBorder,
              marginTop: 1,
            }}>
              <View style={{ width: 90 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.greenDark }}>Score AQUIZ</Text>
              </View>
              {sorted.map(a => (
                <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: getScoreColor(a.scoreGlobal) }}>
                    {a.scoreGlobal}/100
                  </Text>
                </View>
              ))}
            </View>

            {/* Rendement locatif row */}
            {sorted.some(a => a.estimations?.rendementBrut != null) && (
              <View style={{
                flexDirection: 'row',
                paddingVertical: 7,
                paddingHorizontal: 8,
                borderBottomWidth: 0.5,
                borderBottomColor: C.grayBorder,
              }}>
                <View style={{ width: 90 }}>
                  <Text style={{ fontSize: 7.5, color: C.gray }}>Rendement locatif</Text>
                </View>
                {sorted.map(a => (
                  <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                    {a.dpe === 'G' ? (
                      <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.red }}>Interdit (G)*</Text>
                    ) : (
                      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: (a.estimations?.rendementBrut ?? 0) > 0 ? C.greenDark : C.grayLight }}>
                        {a.estimations?.rendementBrut != null ? `${a.estimations.rendementBrut.toFixed(1)} %` : '—'}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Prix vs Marché row */}
            {sorted.some(a => a.enrichissement?.marche?.success) && (
              <View style={{
                flexDirection: 'row',
                paddingVertical: 7,
                paddingHorizontal: 8,
                borderBottomWidth: 0.5,
                borderBottomColor: C.grayBorder,
                backgroundColor: C.grayBg,
              }}>
                <View style={{ width: 90 }}>
                  <Text style={{ fontSize: 7.5, color: C.gray }}>Prix vs Marché</Text>
                </View>
                {sorted.map(a => {
                  const m = a.enrichissement?.marche
                  if (!m?.success) return (
                    <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 7, color: C.grayLight }}>—</Text>
                    </View>
                  )
                  const ecart = m.ecartPrixM2 ?? 0
                  return (
                    <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: ecart <= 0 ? C.greenDark : C.red }}>
                        {ecart > 0 ? '+' : ''}{ecart.toFixed(0)} %
                      </Text>
                    </View>
                  )
                })}
              </View>
            )}

            {/* ── Conclusion rapide ── */}
            <View style={{
              marginTop: 12,
              paddingVertical: 8,
              paddingHorizontal: 10,
              backgroundColor: C.grayBg,
              borderRadius: 4,
              borderLeftWidth: 3,
              borderLeftColor: C.green,
            }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 5 }}>
                Conclusion rapide
              </Text>
              {sorted.map((a, i) => {
                const topAvantage = a.points.find(p => p.type === 'avantage')
                const topAttention = a.points.find(p => p.type === 'attention')
                const ecart = a.enrichissement?.marche?.ecartPrixM2
                // Build a short context line per bien
                const parts: string[] = []
                if (ecart !== undefined && ecart <= -5) parts.push(`${Math.abs(ecart).toFixed(0)}% sous le marché`)
                else if (ecart !== undefined && ecart >= 10) parts.push(`${ecart.toFixed(0)}% au-dessus du marché`)
                if (['A', 'B', 'C'].includes(a.dpe)) parts.push(`DPE ${a.dpe}`)
                else if (['F', 'G'].includes(a.dpe)) parts.push(`Passoire thermique (${a.dpe})`)
                if (topAvantage && parts.length < 2) parts.push(topAvantage.texte.toLowerCase())
                if (topAttention && parts.length < 3) parts.push(topAttention.texte.toLowerCase())
                const context = parts.length > 0 ? parts.join(', ') : a.verdict
                return (
                  <View key={a.id} style={{ flexDirection: 'row', gap: 4, marginBottom: 2.5 }}>
                    <Text style={{ fontSize: 7, color: i === 0 ? C.green : C.gray }}>▸</Text>
                    <Text style={{ fontSize: 6.5, color: C.black, flex: 1, lineHeight: 1.4 }}>
                      <Text style={{ fontFamily: 'Helvetica-Bold' }}>{cleanVille(a.ville)} ({a.scoreGlobal}/100)</Text>
                      {' — '}{context}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>

        </View>
        <Footer logoUrl={logoUrl} />
      </Page>

      {/* ══════════════════════════════════════════
          PAGE — ANALYSE DÉTAILLÉE (toutes les annonces)
          ══════════════════════════════════════════ */}
      <Page size="A4" style={s.pageWithFixedHeader}>
        <FixedHeader logoUrl={logoUrl} nbBiens={n} />
        <View style={[s.content, { marginTop: 52 }]}>

          <View style={{ marginTop: 4 }}>
            <SectionTitle title="3. ANALYSE DÉTAILLÉE" />
          </View>

          {sorted.map((annonce, idx) => {
            const { forts: pointsForts, verifier: pointsVerifier } = genererPointsExpert(annonce)

            // Build transport groups from transportSummary (aggregated from ALL stations in radius)
            const typeOrder = ['metro', 'rer', 'train', 'tram', 'bus', 'velib', 'velo', 'fuel']
            const typeLabels: Record<string, string> = {
              metro: 'Métro', rer: 'RER', train: 'Train', tram: 'Tramway',
              bus: 'Bus', velib: 'Vélib\'', velo: 'Location de vélo', fuel: 'Station service',
            }
            const summary = annonce.enrichissement?.quartier?.transportSummary
            const transportGroups = (summary ?? [])
              .filter(s => typeOrder.includes(s.type))
              .sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))
              .map(s => ({
                type: s.type,
                label: typeLabels[s.type] ?? s.type,
                lignes: s.lignes,
                stations: s.count,
                nearestWalkMin: s.nearestWalkMin,
              }))
            const hasTransport = transportGroups.length > 0

            return (
              <View key={annonce.id} style={{
                marginTop: idx > 0 ? 4 : 2,
                backgroundColor: C.white,
                borderRadius: 4,
                borderWidth: 0.5,
                borderColor: C.grayBorder,
                overflow: 'hidden',
              }} wrap={false}>
                {/* Color bar top */}
                <View style={{ height: 2, backgroundColor: getScoreColor(annonce.scoreGlobal) }} />

                {/* ── Header compact: rang + titre + prix ── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6, paddingVertical: 4 }}>
                  {/* Rang badge */}
                  <View style={{
                    width: 16, height: 16, borderRadius: 8,
                    backgroundColor: getScoreColor(annonce.scoreGlobal),
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white }}>{annonce.rang}</Text>
                  </View>
                  {/* Title + ville */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black }}>
                      {cleanTitle(annonce)} — {cleanVille(annonce.ville)} ({annonce.codePostal})
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
                      <Text style={{ fontSize: 5.5, color: C.gray }}>
                        {annonce.surface} m² · {annonce.pieces} p · {fmt(annonce.prixM2)} EUR/m²
                      </Text>
                      <View style={{
                        backgroundColor: getOpportuniteBg(annonce.scoreGlobal),
                        borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1,
                      }}>
                        <Text style={{ fontSize: 5, fontFamily: 'Helvetica-Bold', color: getOpportuniteColor(annonce.scoreGlobal) }}>
                          {getOpportuniteLabel(annonce.scoreGlobal)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {/* Score + Price */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.black }}>{fmt(annonce.prix)} EUR</Text>
                    <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: getScoreColor(annonce.scoreGlobal), marginTop: 1 }}>
                      Score : {annonce.scoreGlobal}/100
                    </Text>
                  </View>
                </View>

                {/* ── Points forts + à vérifier (2 columns, compact) ── */}
                <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: C.grayBorder }}>
                  <View style={{ flex: 1, padding: 4, borderRightWidth: 0.5, borderRightColor: C.grayBorder }}>
                    <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: C.greenDark, marginBottom: 2 }}>Points forts</Text>
                    {pointsForts.map((txt, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 3, marginBottom: 1 }}>
                        <Text style={{ fontSize: 5.5, color: C.green }}>+</Text>
                        <Text style={{ fontSize: 5, color: C.black, flex: 1, lineHeight: 1.3 }}>{txt}</Text>
                      </View>
                    ))}
                    {pointsForts.length === 0 && <Text style={{ fontSize: 5, color: C.grayLight, fontStyle: 'italic' }}>Aucun point fort identifié</Text>}
                  </View>
                  <View style={{ flex: 1, padding: 4 }}>
                    <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: C.gray, marginBottom: 2 }}>À vérifier</Text>
                    {pointsVerifier.map((txt, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 3, marginBottom: 1 }}>
                        <Text style={{ fontSize: 5.5, color: C.grayLight }}>!</Text>
                        <Text style={{ fontSize: 5, color: C.black, flex: 1, lineHeight: 1.3 }}>{txt}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* ── Dans la commune (style Bien'ici) ── */}
                {(() => {
                  const dc = annonce.enrichissement?.quartier?.detailedCounts
                  if (!dc) return null

                  const QUARTIER_CATEGORIES: Array<{
                    key: string
                    title: string
                    color: string
                    bgLight: string
                  }> = [
                    { key: 'loisirs', title: 'Si on sortait ?', color: C.green, bgLight: C.greenLight },
                    { key: 'commerce', title: 'N\'oubliez pas de faire les courses', color: C.greenDark, bgLight: C.greenLight },
                    { key: 'education', title: 'Éducation', color: C.gray, bgLight: C.grayBg },
                    { key: 'sante', title: 'Santé', color: C.gray, bgLight: C.grayBg },
                  ]

                  const catsWithData = QUARTIER_CATEGORIES.filter(cat => {
                    const items = dc[cat.key]
                    return items && items.length > 0
                  })

                  if (catsWithData.length === 0) return null

                  return (
                    <View style={{ paddingHorizontal: 6, paddingTop: 3, paddingBottom: 3, borderTopWidth: 0.5, borderTopColor: C.grayBorder }}>
                      {/* Section header */}
                      <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 3 }}>
                        Dans la commune
                      </Text>

                      {/* Category blocks — 2 columns */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                        {catsWithData.map(cat => {
                          const items = dc[cat.key] || []
                          const topItems = items.slice(0, 3)
                          const total = topItems.reduce((s, i) => s + i.count, 0)
                          return (
                            <View key={cat.key} style={{
                              width: '48%',
                              backgroundColor: cat.bgLight,
                              borderRadius: 3,
                              padding: 3,
                              marginBottom: 1,
                            }}>
                              {/* Category header */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 }}>
                                <View style={{
                                  width: 9, height: 9, borderRadius: 2,
                                  backgroundColor: cat.color,
                                  alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <Text style={{ fontSize: 5, fontFamily: 'Helvetica-Bold', color: '#fff' }}>
                                    {total}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 5, fontFamily: 'Helvetica-Bold', color: cat.color }}>
                                  {cat.title}
                                </Text>
                              </View>
                              {/* Items */}
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
                                {topItems.map(item => (
                                  <View key={item.type} style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    backgroundColor: '#ffffff', borderRadius: 2,
                                    paddingHorizontal: 3, paddingVertical: 1,
                                  }}>
                                    <Text style={{ fontSize: 4.5, color: C.black }}>
                                      {item.label}
                                    </Text>
                                    <Text style={{ fontSize: 4.5, fontFamily: 'Helvetica-Bold', color: cat.color, marginLeft: 2 }}>
                                      {item.count}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )
                        })}
                      </View>

                      {/* ── Transport block — style Bien'ici épuré ── */}
                      {hasTransport && (
                        <View style={{ marginTop: 4 }}>
                          <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 2 }}>
                            Et au niveau des transports ?
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                            {transportGroups.map(tg => {
                              const SZ = 9
                              const isRail = ['metro', 'rer', 'train', 'tram'].includes(tg.type)
                              const isBus = tg.type === 'bus'

                              if (isRail && tg.lignes.length > 0) {
                                  return (
                                    <View key={tg.type} style={{ flexDirection: 'row', alignItems: 'center', gap: 1.5, marginRight: 3 }}>
                                      <Text style={{ fontSize: 5, color: C.gray }}>{tg.label}</Text>
                                      <Text style={{ fontSize: 5, color: C.grayLight }}>(</Text>
                                      {tg.lignes.map(l => {
                                        const lc = getPdfLineColor(tg.type, l)
                                        return (
                                          <View key={`${tg.type}-${l}`} style={{ width: l.length > 2 ? 13 : SZ, height: SZ, borderRadius: SZ / 2, backgroundColor: lc.bg, alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ fontSize: l.length > 2 ? 3.5 : 4.5, fontFamily: 'Helvetica-Bold', color: lc.fg }}>{l}</Text>
                                          </View>
                                        )
                                      })}
                                      <Text style={{ fontSize: 5, color: C.grayLight }}>)</Text>
                                    </View>
                                  )
                                }

                                if (isBus && tg.lignes.length > 0) {
                                  return (
                                    <View key="bus" style={{ flexDirection: 'row', alignItems: 'center', gap: 1.5, marginRight: 3 }}>
                                      <Text style={{ fontSize: 5, color: C.gray }}>Bus</Text>
                                      <Text style={{ fontSize: 5, color: C.grayLight }}>(</Text>
                                      {tg.lignes.slice(0, 5).map(l => (
                                        <View key={`bus-${l}`} style={{ backgroundColor: '#e5e7eb', borderRadius: 1.5, paddingHorizontal: 2, paddingVertical: 0.5 }}>
                                          <Text style={{ fontSize: 4, fontFamily: 'Helvetica-Bold', color: C.black }}>{l}</Text>
                                        </View>
                                      ))}
                                      {tg.lignes.length > 5 && (
                                        <Text style={{ fontSize: 4, color: C.grayLight }}>+{tg.lignes.length - 5}</Text>
                                      )}
                                      <Text style={{ fontSize: 5, color: C.grayLight }}>)</Text>
                                    </View>
                                  )
                                }

                                // Other types (vélib', vélo, etc.) — plain text + count
                                return (
                                  <View key={tg.type} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 3 }}>
                                    <Text style={{ fontSize: 5, color: C.gray }}>{tg.label}</Text>
                                    <Text style={{ fontSize: 5, fontFamily: 'Helvetica-Bold', color: C.black }}> ({tg.stations})</Text>
                                  </View>
                                )
                              })}
                            </View>
                          </View>
                        )}
                    </View>
                  )
                })()}

              </View>
            )
          })}

        </View>
        <Footer logoUrl={logoUrl} />
      </Page>

      {/* ══════════════════════════════════════════
          PAGE — 4. ANALYSE MARCHÉ & PROJECTION FINANCIÈRE
          ══════════════════════════════════════════ */}
      <Page size="A4" style={s.pageWithFixedHeader}>
        <FixedHeader logoUrl={logoUrl} nbBiens={n} />
        <View style={[s.content, { marginTop: 52 }]}>

          {/* ── 4A. Analyse Marché ── */}
          {sorted.some(a => a.enrichissement?.marche?.success) && (
            <View>
              <View style={{ marginTop: 6 }}>
                <SectionTitle title="4. ANALYSE MARCHÉ" />
              </View>

              <Text style={{ fontSize: 7, color: C.gray, marginTop: 3, marginBottom: 6, lineHeight: 1.5 }}>
                Positionnement tarifaire par rapport aux transactions récentes (données DVF).
              </Text>

              {(() => {
                const villeMap = new Map<string, typeof sorted>()
                sorted.forEach(a => {
                  const key = a.ville
                  if (!villeMap.has(key)) villeMap.set(key, [])
                  villeMap.get(key)!.push(a)
                })

                return Array.from(villeMap.entries()).map(([ville, biens], cityIdx) => {
                  const withMarche = biens.find(b => b.enrichissement?.marche?.success)
                  const m = withMarche?.enrichissement?.marche

                  return (
                    <View key={ville} style={{
                      marginTop: cityIdx === 0 ? 0 : 6,
                      backgroundColor: C.white,
                      borderRadius: 5,
                      borderWidth: 1,
                      borderColor: C.grayBorder,
                      overflow: 'hidden',
                    }}>
                      {/* City header */}
                      <View style={{
                        backgroundColor: C.white,
                        paddingVertical: 5,
                        paddingHorizontal: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: C.grayBorder,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.black }}>
                          {cleanVille(ville)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {m?.prixM2MedianMarche && (
                            <View style={{ backgroundColor: C.grayBg, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 6, alignItems: 'center' }}>
                              <Text style={{ fontSize: 4.5, color: C.grayLight }}>Médiane</Text>
                              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.black }}>{fmt(Math.round(m.prixM2MedianMarche))} €/m²</Text>
                            </View>
                          )}
                          {m?.evolution12Mois != null && m.evolution12Mois !== 0 && (
                            <View style={{ backgroundColor: C.grayBg, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 6, alignItems: 'center' }}>
                              <Text style={{ fontSize: 4.5, color: C.grayLight }}>Évol. 5 ans</Text>
                              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: (m.evolution12Mois ?? 0) >= 0 ? C.greenDark : C.red }}>
                                {(m.evolution12Mois ?? 0) > 0 ? '+' : ''}{((m.evolution12Mois ?? 0) * 5).toFixed(0)}%
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Table header */}
                      <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingVertical: 4, paddingHorizontal: 10,
                        backgroundColor: '#f0f1f3',
                        borderBottomWidth: 1, borderBottomColor: C.grayBorder,
                      }}>
                        <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.gray, width: 22 }}>#</Text>
                        <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.gray, flex: 1 }}>Bien</Text>
                        <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.gray, width: 55, textAlign: 'right' }}>Prix/m²</Text>
                        <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.gray, width: 55, textAlign: 'right' }}>Médiane</Text>
                        <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.gray, width: 40, textAlign: 'center' }}>Écart</Text>
                        <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.gray, width: 60, textAlign: 'center' }}>Verdict</Text>
                      </View>

                      {/* Table rows */}
                      {biens.map((a, bIdx) => {
                        const am = a.enrichissement?.marche
                        const ecart = am?.ecartPrixM2 ?? 0
                        const ecartColor = ecart <= -10 ? C.greenDark : ecart <= 0 ? C.green : ecart <= 5 ? C.amber : ecart <= 15 ? C.orange : C.red
                        const ecartBg = ecart <= 0 ? C.greenLight : ecart <= 5 ? C.amberLight : ecart <= 15 ? C.orangeLight : C.redLight
                        const verdictScore = am?.verdict === 'excellent' ? 90 : am?.verdict === 'bon' ? 75 : am?.verdict === 'correct' ? 55 : 30

                        return (
                          <View key={a.id} style={{
                            flexDirection: 'row', alignItems: 'center',
                            paddingVertical: 5, paddingHorizontal: 10,
                            backgroundColor: bIdx % 2 === 0 ? C.white : '#fafbfc',
                            ...(bIdx < biens.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: C.grayBorder } : {}),
                          }}>
                            <View style={{ width: 22 }}>
                              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: getScoreColor(a.scoreGlobal), alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.white }}>{a.rang}</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 7, color: C.black, flex: 1 }}>
                              {a.type === 'maison' ? 'Maison' : 'Appt.'} {a.surface} m²
                            </Text>
                            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black, width: 55, textAlign: 'right' }}>{fmt(a.prixM2)} €</Text>
                            <Text style={{ fontSize: 7, color: C.gray, width: 55, textAlign: 'right' }}>
                              {am?.prixM2MedianMarche ? `${fmt(Math.round(am.prixM2MedianMarche))} €` : '—'}
                            </Text>
                            <View style={{ width: 40, alignItems: 'center' }}>
                              <View style={{ backgroundColor: ecartBg, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: ecartColor }}>
                                  {ecart > 0 ? '+' : ''}{ecart.toFixed(0)}%
                                </Text>
                              </View>
                            </View>
                            <View style={{ width: 60, alignItems: 'center' }}>
                              {am?.verdict && (
                                <View style={{ backgroundColor: getScoreBg(verdictScore), borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1.5 }}>
                                  <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: getScoreColor(verdictScore) }}>
                                    {getVerdictMarcheLabel(am.verdict)}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  )
                })
              })()}

              <Text style={{ fontSize: 5.5, color: C.grayLight, marginTop: 4, lineHeight: 1.3 }}>
                Source : DVF (transactions notariales). Écart = différence prix/m² vs médiane. Évol. 5 ans extrapolée.
              </Text>
            </View>
          )}

          {/* ── 4B. Projection Financière ── */}
          <View style={{ marginTop: 10 }}>
            <SectionTitle title="5. PROJECTION FINANCIÈRE" />
          </View>

          <Text style={{ fontSize: 7, color: C.gray, marginTop: 3, marginBottom: 6, lineHeight: 1.5 }}>
            Projection patrimoniale estimée sur 5 ans — hors fiscalité et frais d&apos;entretien.
          </Text>

          <View style={{
            backgroundColor: C.white,
            borderRadius: 5,
            borderWidth: 1,
            borderColor: C.grayBorder,
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <View style={{
              flexDirection: 'row',
              paddingVertical: 5,
              paddingHorizontal: 10,
              backgroundColor: C.grayBg,
              borderBottomWidth: 0.5,
              borderBottomColor: C.grayBorder,
            }}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.grayLight, width: 22 }}>#</Text>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.grayLight, flex: 1 }}>Bien</Text>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.grayLight, width: 55, textAlign: 'right' }}>Coût total</Text>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.grayLight, width: 50, textAlign: 'right' }}>Val. 5 ans</Text>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.grayLight, width: 42, textAlign: 'right' }}>Potentiel</Text>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.grayLight, width: 48, textAlign: 'right' }}>Mensualité**</Text>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.grayLight, width: 42, textAlign: 'right' }}>Rendt brut</Text>
            </View>

            {/* Table rows */}
            {sorted.map((a, i) => {
              const isNeuf = a.anneeConstruction && (new Date().getFullYear() - a.anneeConstruction) <= 5
              const fraisNotaire = Math.round(a.prix * (isNeuf ? 0.025 : 0.075))
              const budgetTravaux = a.estimations?.budgetTravauxEstime || 0
              const coutTotal = a.prix + fraisNotaire + budgetTravaux
              const evolution = a.enrichissement?.marche?.evolution12Mois
              const valeur5Ans = estimerValeur5Ans(a.prix, evolution)
              const potentiel = ((valeur5Ans - coutTotal) / coutTotal * 100)
              const mensualite = calculerMensualite(a.prix, apport || 0, effectiveTaux, effectiveDuree)

              return (
                <View key={a.id} style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 5, paddingHorizontal: 10,
                  backgroundColor: i % 2 === 0 ? C.white : C.grayBg,
                  ...(i < sorted.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: C.grayBorder } : {}),
                }}>
                  <View style={{ width: 22 }}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: getScoreColor(a.scoreGlobal), alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.white }}>{a.rang}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 7, color: C.black, flex: 1 }}>
                    {a.type === 'maison' ? 'Maison' : 'Appt.'} {a.surface} m² — {cleanVille(a.ville)}
                  </Text>
                  <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black, width: 55, textAlign: 'right' }}>{fmt(coutTotal)} €</Text>
                  <Text style={{ fontSize: 7, color: C.black, width: 50, textAlign: 'right' }}>{fmt(valeur5Ans)} €</Text>
                  <View style={{ width: 42, alignItems: 'flex-end' }}>
                    <View style={{ backgroundColor: potentiel > 0 ? C.greenLight : '#fef2f2', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: potentiel > 0 ? C.greenDark : C.red }}>
                        {potentiel > 0 ? '+' : ''}{potentiel.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 7, color: C.black, width: 48, textAlign: 'right' }}>
                    {mensualite > 0 ? `${fmt(mensualite)} €` : '—'}
                  </Text>
                  {a.dpe === 'G' ? (
                    <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: C.red, width: 42, textAlign: 'right' }}>Interdit*</Text>
                  ) : (
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: (a.estimations?.rendementBrut ?? 0) > 0 ? C.black : C.grayLight, width: 42, textAlign: 'right' }}>
                      {a.estimations?.rendementBrut != null ? `${a.estimations.rendementBrut.toFixed(1)}%` : '—'}
                    </Text>
                  )}
                </View>
              )
            })}
          </View>

          {/* Footnotes */}
          <View style={{ marginTop: 3, paddingHorizontal: 10, gap: 1 }}>
            {sorted.some(a => a.dpe === 'G') && (
              <Text style={{ fontSize: 5.5, color: C.gray }}>
                * Location interdite pour les DPE G depuis le 1er janvier 2025 (loi Climat & Résilience)
              </Text>
            )}
            <Text style={{ fontSize: 5.5, color: C.gray }}>
              ** Mensualité estimée : taux {effectiveTaux.toFixed(1)} %, {effectiveDuree} ans{apport ? `, apport ${fmt(apport)} €` : ', hors apport'}{!tauxInteret && !dureeAns ? ' (hypothèses par défaut)' : ''}
            </Text>
          </View>

          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 5.5, color: C.grayLight, marginTop: 6, lineHeight: 1.3 }}>
            Les projections à 5 ans sont basées sur l&apos;évolution observée des prix (données DVF). Elles ne constituent pas une garantie.
          </Text>
        </View>
        <Footer logoUrl={logoUrl} />
      </Page>

      {/* ══════════════════════════════════════════
          PAGE — 5. STRATÉGIE DE NÉGOCIATION
          ══════════════════════════════════════════ */}
      <Page size="A4" style={s.pageWithFixedHeader}>
        <FixedHeader logoUrl={logoUrl} nbBiens={n} />
        <View style={[s.content, { marginTop: 52 }]}>

          <View style={{ marginTop: 6 }}>
            <SectionTitle title="5. STRATÉGIE DE NÉGOCIATION" />
          </View>
          <Text style={{ fontSize: 7.5, color: C.gray, marginTop: 4, marginBottom: 12, lineHeight: 1.5 }}>
            Leviers de négociation identifiés pour chaque bien, basés sur les données DVF et les caractéristiques du bien.
          </Text>

          {sorted.map((a, aIdx) => {
            const leviers = identifierLeviersNego(a)
            const hasArgs = leviers.length > 0

            return (
              <View key={`nego-${a.id}`} style={{
                marginBottom: aIdx < sorted.length - 1 ? 12 : 6,
                backgroundColor: C.white,
                borderRadius: 6,
                borderWidth: 0.5,
                borderColor: C.grayBorder,
                overflow: 'hidden',
              }} wrap={false}>

                {/* Header : rang + titre + nb leviers */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  backgroundColor: C.grayBg,
                  borderBottomWidth: 0.5,
                  borderBottomColor: C.grayBorder,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: getScoreColor(a.scoreGlobal),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white }}>{a.rang}</Text>
                    </View>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.black }}>
                      {cleanTitleShort(a)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 8, color: C.gray }}>{fmt(a.prix)} €</Text>
                    {hasArgs && (
                      <View style={{
                        backgroundColor: C.orangeLight,
                        borderRadius: 3,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}>
                        <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.orange }}>
                          {leviers.length} levier{leviers.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Arguments */}
                <View style={{ paddingVertical: 8, paddingHorizontal: 14 }}>
                  {hasArgs ? (
                    leviers.map((arg, argIdx) => (
                      <View key={argIdx} style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 6,
                        marginBottom: argIdx < leviers.length - 1 ? 5 : 0,
                      }}>
                        <View style={{
                          backgroundColor: getImpactColor(arg.impact),
                          borderRadius: 2,
                          paddingHorizontal: 4,
                          paddingVertical: 1.5,
                          flexShrink: 0,
                          marginTop: 1,
                        }}>
                          <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: C.white }}>
                            {getImpactLabel(arg.impact)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 7.5, color: C.black, flex: 1, lineHeight: 1.4 }}>
                          {arg.argument}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 7.5, color: C.grayLight, lineHeight: 1.4 }}>
                      Peu de leviers identifiés — le prix semble cohérent avec le marché.
                    </Text>
                  )}
                </View>
              </View>
            )
          })}

          {/* Disclaimer négociation */}
          <Text style={{ fontSize: 6, color: C.grayLight, marginTop: 12, lineHeight: 1.4 }}>
            Estimations basées sur les données DVF et les caractéristiques du bien. Ces leviers servent de base de discussion avec le vendeur ou l&apos;agent immobilier.
          </Text>

          {/* ═══ ACCOMPAGNEMENT AQUIZ (compact, same page) ═══ */}
          <View style={{
            backgroundColor: C.white,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: C.green,
            padding: 10,
            marginTop: 10,
          }} wrap={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <View style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: C.green,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white }}>A</Text>
              </View>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.black }}>
                ACCOMPAGNEMENT AQUIZ
              </Text>
            </View>

            {[
              'Définir une stratégie de négociation adaptée au marché local',
              'Analyser les diagnostics et éléments juridiques du bien',
              'Sécuriser votre financement et optimiser votre plan de financement',
            ].map((item, idx) => (
              <View key={idx} style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 5,
                marginBottom: 3,
                paddingLeft: 2,
              }}>
                <View style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: C.green,
                  marginTop: 2.5,
                  flexShrink: 0,
                }} />
                <Text style={{ fontSize: 6.5, color: C.black, lineHeight: 1.4, flex: 1 }}>
                  {item}
                </Text>
              </View>
            ))}

            <Link src="https://calendly.com/contact-aquiz/30min" style={{ textDecoration: 'none' }}>
              <View style={{
                backgroundColor: C.green,
                borderRadius: 5,
                paddingVertical: 7,
                paddingHorizontal: 16,
                alignSelf: 'center',
                alignItems: 'center',
                marginTop: 6,
              }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.white }}>
                  Prendre rendez-vous
                </Text>
              </View>
            </Link>
          </View>

          {/* ── Disclaimer ── */}
          <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 5, color: C.grayLight, lineHeight: 1.4 }}>
              Ce rapport est généré à partir de données publiques (DVF, Géorisques, OpenStreetMap) et d&apos;algorithmes AQUIZ.
              Les estimations sont indicatives et ne constituent pas un avis professionnel. © {new Date().getFullYear()} AQUIZ — {dateGeneration}
            </Text>
          </View>

        </View>
        <Footer logoUrl={logoUrl} />
      </Page>
    </Document>
  )
}
