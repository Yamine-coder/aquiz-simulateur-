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
  A: { bg: '#E3051C', fg: '#E3051C' },
  B: { bg: '#5291CE', fg: '#5291CE' },
  C: { bg: '#FFCD00', fg: '#9B870C' },
  D: { bg: '#00814F', fg: '#00814F' },
  E: { bg: '#CF76A7', fg: '#CF76A7' },
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
    backgroundColor: C.black,
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
              borderWidth: 1,
              borderColor: C.grayBorder,
              overflow: 'hidden',
            }}>
              {/* Barre supérieure colorée */}
              <View style={{ height: 3, backgroundColor: getScoreColor(best.scoreGlobal) }} />

              {/* En-tête gris avec label */}
              <View style={{
                backgroundColor: C.grayBg,
                paddingVertical: 5,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: C.grayBorder,
              }}>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray, letterSpacing: 0.3 }}>
                  MEILLEURE OPPORTUNITÉ DÉTECTÉE
                </Text>
              </View>

              {/* Contenu principal : cercle score + infos */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}>
                {/* Score circle */}
                <View style={{ alignItems: 'center', flexShrink: 0 }}>
                  <View style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    borderWidth: 2.5,
                    borderColor: getScoreColor(best.scoreGlobal),
                    backgroundColor: getScoreBg(best.scoreGlobal),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: getScoreColor(best.scoreGlobal) }}>
                      {best.scoreGlobal}
                    </Text>
                    <Text style={{ fontSize: 5.5, color: getScoreColor(best.scoreGlobal), marginTop: -2 }}>/100</Text>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
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

              {/* Ligne de séparation + description */}
              <View style={{
                borderTopWidth: 1,
                borderTopColor: C.grayBorder,
                paddingHorizontal: 14,
                paddingVertical: 8,
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

            {/* ── Conclusion ── */}
            <View style={{
              marginTop: 12,
              paddingVertical: 10,
              paddingHorizontal: 12,
              backgroundColor: C.grayBg,
              borderRadius: 4,
              borderLeftWidth: 3,
              borderLeftColor: C.green,
            }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 6 }}>
                Conclusion
              </Text>
              <View style={{ flexDirection: 'row', gap: 4, marginBottom: 3 }}>
                <Text style={{ fontSize: 7, color: C.green }}>▸</Text>
                <Text style={{ fontSize: 7.5, color: C.black, flex: 1, lineHeight: 1.4 }}>
                  Meilleur rapport qualité-prix : {cleanTitleShort(best)} (Score {best.scoreGlobal}/100)
                </Text>
              </View>
              {(() => {
                const maxSurface = sorted.reduce((max, a) => a.surface > max.surface ? a : max, sorted[0])
                return maxSurface.id !== best.id ? (
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 3 }}>
                    <Text style={{ fontSize: 7, color: C.green }}>▸</Text>
                    <Text style={{ fontSize: 7.5, color: C.black, flex: 1, lineHeight: 1.4 }}>
                      Plus grande surface : {maxSurface.ville} ({maxSurface.surface} m²)
                    </Text>
                  </View>
                ) : null
              })()}
              {(() => {
                const cheapest = sorted.reduce((min, a) => a.prixM2 < min.prixM2 ? a : min, sorted[0])
                return cheapest.id !== best.id ? (
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 3 }}>
                    <Text style={{ fontSize: 7, color: C.green }}>▸</Text>
                    <Text style={{ fontSize: 7.5, color: C.black, flex: 1, lineHeight: 1.4 }}>
                      Prix/m² le plus bas : {cheapest.ville} ({fmt(cheapest.prixM2)} €/m²)
                    </Text>
                  </View>
                ) : null
              })()}
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
            const avantages = annonce.points.filter(p => p.type === 'avantage').slice(0, 3)
            const attentions = annonce.points.filter(p => p.type === 'attention').slice(0, 3)

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
                marginTop: idx > 0 ? 8 : 4,
                backgroundColor: C.white,
                borderRadius: 5,
                borderWidth: 1,
                borderColor: C.grayBorder,
                overflow: 'hidden',
              }} wrap={false}>
                {/* Color bar top */}
                <View style={{ height: 2.5, backgroundColor: getScoreColor(annonce.scoreGlobal) }} />

                {/* ── Header compact: rang + titre + prix ── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 7, paddingBottom: 5 }}>
                  {/* Rang badge */}
                  <View style={{
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: getScoreColor(annonce.scoreGlobal),
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.white }}>{annonce.rang}</Text>
                  </View>
                  {/* Title + ville */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.black }}>
                      {cleanTitle(annonce)} — {cleanVille(annonce.ville)} ({annonce.codePostal})
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                      <Text style={{ fontSize: 6, color: C.gray }}>
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
                    <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.black }}>{fmt(annonce.prix)} EUR</Text>
                    <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: getScoreColor(annonce.scoreGlobal), marginTop: 1 }}>
                      Score : {annonce.scoreGlobal}/100
                    </Text>
                  </View>
                </View>

                {/* ── Points forts + vigilance (2 columns, compact) ── */}
                <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: C.grayBorder }}>
                  <View style={{ flex: 1, padding: 6, borderRightWidth: 0.5, borderRightColor: C.grayBorder }}>
                    <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.greenDark, marginBottom: 3 }}>Points forts</Text>
                    {avantages.map((p, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 3, marginBottom: 2 }}>
                        <Text style={{ fontSize: 6, color: C.green }}>+</Text>
                        <Text style={{ fontSize: 5.5, color: C.black, flex: 1, lineHeight: 1.4 }}>{p.texte}</Text>
                      </View>
                    ))}
                    {avantages.length === 0 && <Text style={{ fontSize: 5.5, color: C.grayLight, fontStyle: 'italic' }}>Aucun</Text>}
                  </View>
                  <View style={{ flex: 1, padding: 6 }}>
                    <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#92400e', marginBottom: 3 }}>Vigilance</Text>
                    {attentions.map((p, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 3, marginBottom: 2 }}>
                        <Text style={{ fontSize: 6, color: C.orange }}>!</Text>
                        <Text style={{ fontSize: 5.5, color: C.black, flex: 1, lineHeight: 1.4 }}>{p.texte}</Text>
                      </View>
                    ))}
                    {attentions.length === 0 && <Text style={{ fontSize: 5.5, color: C.grayLight, fontStyle: 'italic' }}>Aucun</Text>}
                  </View>
                </View>

                {/* ── Dans le quartier (style Bien'ici) ── */}
                {(() => {
                  const dc = annonce.enrichissement?.quartier?.detailedCounts
                  if (!dc) return null

                  const QUARTIER_CATEGORIES: Array<{
                    key: string
                    title: string
                    color: string
                    bgLight: string
                  }> = [
                    { key: 'loisirs', title: 'Si on sortait ?', color: '#E91E63', bgLight: '#FCE4EC' },
                    { key: 'commerce', title: 'Au quotidien', color: '#FF9800', bgLight: '#FFF3E0' },
                    { key: 'education', title: 'Éducation', color: '#4CAF50', bgLight: '#E8F5E9' },
                    { key: 'sante', title: 'Santé', color: '#2196F3', bgLight: '#E3F2FD' },
                    { key: 'vert', title: 'Nature', color: '#8BC34A', bgLight: '#F1F8E9' },
                  ]

                  const catsWithData = QUARTIER_CATEGORIES.filter(cat => {
                    const items = dc[cat.key]
                    return items && items.length > 0
                  })

                  if (catsWithData.length === 0) return null

                  return (
                    <View style={{ paddingHorizontal: 7, paddingTop: 5, paddingBottom: 4, borderTopWidth: 0.5, borderTopColor: C.grayBorder }}>
                      {/* Section header */}
                      <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 4 }}>
                        Dans le quartier
                      </Text>

                      {/* Category blocks — 2 columns */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                        {catsWithData.map(cat => {
                          const items = dc[cat.key] || []
                          const total = items.reduce((s, i) => s + i.count, 0)
                          return (
                            <View key={cat.key} style={{
                              width: '48%',
                              backgroundColor: cat.bgLight,
                              borderRadius: 4,
                              padding: 5,
                              marginBottom: 1,
                            }}>
                              {/* Category header */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                                <View style={{
                                  width: 10, height: 10, borderRadius: 2,
                                  backgroundColor: cat.color,
                                  alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: '#fff' }}>
                                    {total}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: cat.color }}>
                                  {cat.title}
                                </Text>
                              </View>
                              {/* Items */}
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
                                {items.slice(0, 5).map(item => (
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
                        {/* ── Transport block (same card style, horizontal badges) ── */}
                        {hasTransport && (
                          <View style={{
                            width: '48%',
                            backgroundColor: '#ECFDF5',
                            borderRadius: 4,
                            padding: 5,
                            marginBottom: 1,
                          }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                              <View style={{
                                width: 10, height: 10, borderRadius: 2,
                                backgroundColor: '#10b981',
                                alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Text style={{ fontSize: 5, fontFamily: 'Helvetica-Bold', color: '#fff' }}>
                                  {transportGroups.reduce((s, t) => s + t.stations, 0)}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: '#10b981' }}>
                                Transports
                              </Text>
                            </View>
                            {/* All badges on one horizontal wrap line */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                              {transportGroups.flatMap(tg => {
                                const SZ = 9
                                const SZ_INNER = 6
                                const isRail = ['metro', 'rer', 'train', 'tram'].includes(tg.type)
                                const isBus = tg.type === 'bus'
                                const badges: React.ReactNode[] = []

                                if (isRail && tg.lignes.length > 0) {
                                  // Type badge + each line badge
                                  if (tg.type === 'metro') {
                                    badges.push(
                                      <View key="metro-icon" style={{ width: SZ, height: SZ, borderRadius: SZ / 2, backgroundColor: '#003CA6', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 5, fontFamily: 'Helvetica-Bold', color: '#fff' }}>M</Text>
                                      </View>
                                    )
                                    tg.lignes.forEach(l => {
                                      const lc = getPdfLineColor('metro', l)
                                      badges.push(
                                        <View key={`m-${l}`} style={{ width: SZ, height: SZ, borderRadius: SZ / 2, backgroundColor: lc.bg, alignItems: 'center', justifyContent: 'center' }}>
                                          <Text style={{ fontSize: 4.5, fontFamily: 'Helvetica-Bold', color: lc.fg }}>{l}</Text>
                                        </View>
                                      )
                                    })
                                  } else if (tg.type === 'rer' || tg.type === 'train') {
                                    badges.push(
                                      <View key="rer-icon" style={{ width: 13, height: SZ, borderRadius: 1.5, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 4, fontFamily: 'Helvetica-Bold', color: '#fff' }}>{tg.type === 'rer' ? 'RER' : 'TER'}</Text>
                                      </View>
                                    )
                                    tg.lignes.forEach(l => {
                                      const lc = getPdfLineColor(tg.type, l)
                                      badges.push(
                                        <View key={`r-${l}`} style={{ width: SZ, height: SZ, borderRadius: SZ / 2, backgroundColor: lc.bg, alignItems: 'center', justifyContent: 'center' }}>
                                          <View style={{ width: SZ_INNER, height: SZ_INNER, borderRadius: SZ_INNER / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ fontSize: 4, fontFamily: 'Helvetica-Bold', color: lc.bg }}>{l}</Text>
                                          </View>
                                        </View>
                                      )
                                    })
                                  } else {
                                    // tram
                                    tg.lignes.forEach(l => {
                                      const lc = getPdfLineColor(tg.type, l)
                                      badges.push(
                                        <View key={`t-${l}`} style={{ paddingHorizontal: 2.5, height: SZ, borderRadius: 1.5, backgroundColor: lc.bg, alignItems: 'center', justifyContent: 'center' }}>
                                          <Text style={{ fontSize: 3.5, fontFamily: 'Helvetica-Bold', color: lc.fg }}>{l}</Text>
                                        </View>
                                      )
                                    })
                                  }
                                } else if (isBus && tg.lignes.length > 0) {
                                  badges.push(
                                    <View key="bus-pill" style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 2, paddingHorizontal: 3, paddingVertical: 1 }}>
                                      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#60a917', alignItems: 'center', justifyContent: 'center', marginRight: 2 }}>
                                        <Text style={{ fontSize: 4, fontFamily: 'Helvetica-Bold', color: '#fff' }}>B</Text>
                                      </View>
                                      <Text style={{ fontSize: 4, color: C.black }}>
                                        {tg.lignes.slice(0, 4).join(', ')}{tg.lignes.length > 4 ? ` +${tg.lignes.length - 4}` : ''}
                                      </Text>
                                    </View>
                                  )
                                } else {
                                  // Vélib', vélo, fuel, etc. — simple pill
                                  badges.push(
                                    <View key={tg.type} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 2, paddingHorizontal: 3, paddingVertical: 1 }}>
                                      <Text style={{ fontSize: 4.5, color: C.black }}>{tg.label}</Text>
                                      <Text style={{ fontSize: 4.5, fontFamily: 'Helvetica-Bold', color: '#10b981', marginLeft: 2 }}>{tg.stations}</Text>
                                    </View>
                                  )
                                }
                                return badges
                              })}
                            </View>
                          </View>
                        )}
                      </View>
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

          {/* Disclaimer */}
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 6, color: C.grayLight, marginTop: 12, lineHeight: 1.4 }}>
            Estimations basées sur les données DVF et les caractéristiques du bien. Ces leviers servent de base de discussion avec le vendeur ou l&apos;agent immobilier.
          </Text>
        </View>
        <Footer logoUrl={logoUrl} />
      </Page>

      {/* ══════════════════════════════════════════
          PAGE FINALE — ACCOMPAGNEMENT AQUIZ
          ══════════════════════════════════════════ */}
      <Page size="A4" style={s.pageWithFixedHeader}>
        <FixedHeader logoUrl={logoUrl} nbBiens={n} />
        <View style={[s.content, { marginTop: 52 }]}>

          {/* ═══ ACCOMPAGNEMENT AQUIZ ═══ */}
          <View style={{
            backgroundColor: C.white,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: C.green,
            padding: 14,
            marginTop: 14,
          }} wrap={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: C.green,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.white }}>A</Text>
              </View>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.black }}>
                ACCOMPAGNEMENT AQUIZ
              </Text>
            </View>

            <Text style={{ fontSize: 7.5, color: C.black, lineHeight: 1.6, marginBottom: 10 }}>
              Un expert AQUIZ peut vous accompagner pour :
            </Text>

            {[
              'Analyser les diagnostics immobiliers (DPE, amiante, plomb, termites)',
              'Vérifier les éléments juridiques du bien (servitudes, copropriété, urbanisme)',
              'Définir une stratégie de négociation adaptée au marché local',
              'Estimer le budget travaux et les aides disponibles (PTZ, MaPrimeRénov\')',
              'Sécuriser votre financement et optimiser votre plan de financement',
            ].map((item, idx) => (
              <View key={idx} style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 6,
                marginBottom: 5,
                paddingLeft: 4,
              }}>
                <View style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: C.green,
                  marginTop: 3,
                  flexShrink: 0,
                }} />
                <Text style={{ fontSize: 7.5, color: C.black, lineHeight: 1.5, flex: 1 }}>
                  {item}
                </Text>
              </View>
            ))}

            <Text style={{ fontSize: 7, color: C.gray, lineHeight: 1.5, marginTop: 6, marginBottom: 10 }}>
              Prenez rendez-vous avec un expert AQUIZ pour sécuriser votre projet d&apos;acquisition.
            </Text>

            {/* ── Bouton Prendre RDV ── */}
            <Link src="https://calendly.com/contact-aquiz/30min" style={{ textDecoration: 'none' }}>
              <View style={{
                backgroundColor: C.green,
                borderRadius: 6,
                paddingVertical: 10,
                paddingHorizontal: 20,
                alignSelf: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white }}>
                  Prendre rendez-vous
                </Text>
              </View>
            </Link>
          </View>

          {/* ── Disclaimer ── */}
          <View style={{ marginTop: 10, paddingHorizontal: 4 }}>
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
