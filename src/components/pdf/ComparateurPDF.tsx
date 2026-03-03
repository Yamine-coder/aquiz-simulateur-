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
    transportsProches?: Array<{ type: string; typeTransport: string; nom: string; distance: number; walkMin?: number; lignes?: string[]; operateur?: string; couleur?: string }>
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
  velo:   { bg: '#00A88F', text: '#ffffff', label: 'Vélo', abbr: 'V' },
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

/** Résout la couleur d'un badge ligne PDF selon type+ligne */
function getPdfLineColor(typeTransport: string, ligne: string): { bg: string; fg: string } {
  if (typeTransport === 'rer') return PDF_RER_COLORS[ligne.toUpperCase()] ?? { bg: '#1a1a1a', fg: '#fff' }
  if (typeTransport === 'metro') return PDF_METRO_COLORS[ligne] ?? { bg: '#003CA6', fg: '#fff' }
  if (typeTransport === 'train') return PDF_TRANSILIEN_COLORS[ligne.toUpperCase()] ?? { bg: '#E05206', fg: '#fff' }
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
          <View style={{
            backgroundColor: 'rgba(34,197,94,0.15)',
            borderRadius: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.green, letterSpacing: 0.3 }}>
              RAPPORT PRO
            </Text>
          </View>
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
          <View style={{
            backgroundColor: 'rgba(34,197,94,0.15)',
            borderRadius: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.green, letterSpacing: 0.3 }}>
              RAPPORT PRO
            </Text>
          </View>
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

// ═══════════════════════════════════════════════
// DOCUMENT PRINCIPAL
// ═══════════════════════════════════════════════

export function ComparateurPDF({
  logoUrl,
  annonces,
  syntheseIA,
  syntheseDeterministe,
  conseilGeneral,
  // budgetMax reserved for future use
  budgetMax: _bm,
  dateGeneration,
  tauxInteret,
  dureeAns,
  apport,
}: ComparateurPDFProps) {
  void _bm
  const sorted = [...annonces].sort((a, b) => a.rang - b.rang)
  const n = sorted.length

  return (
    <Document>
      {/* ══════════════════════════════════════════
          PAGE 1 — Vue d'ensemble + Classement
          ══════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Header logoUrl={logoUrl} nbBiens={n} />
        <View style={s.content}>

          {/* ── Date ── */}
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 6, color: C.grayLight }}>{dateGeneration}</Text>
          </View>

          {/* ═══════════════════════════════════════
              ZONE 1 — CLASSEMENT (ranking visuel)
              ═══════════════════════════════════════ */}

          {/* ── Classement compact (1 ligne par bien) ── */}
          <View style={{ marginTop: 10 }}>
            <SectionTitle title="CLASSEMENT FINAL" />
            {sorted.map((a, i) => {
              const isBest = i === 0
              return (
                <View key={a.id} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 5,
                  paddingHorizontal: 8,
                  backgroundColor: isBest ? C.greenLight : (i % 2 === 0 ? C.white : C.grayBg),
                  borderBottomWidth: 0.3,
                  borderBottomColor: C.grayBorder,
                  ...(isBest ? { borderRadius: 3 } : {}),
                }} wrap={false}>
                  {/* Rang */}
                  <View style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: isBest ? C.green : C.grayBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: isBest ? C.white : C.gray }}>
                      {a.rang}
                    </Text>
                  </View>
                  {/* Score */}
                  <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: getScoreColor(a.scoreGlobal), width: 28 }}>
                    {a.scoreGlobal}
                  </Text>
                  {/* Titre + infos clés */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: isBest ? C.greenDark : C.black }}>
                      {a.titre || `${a.type === 'maison' ? 'Maison' : 'Appt'} ${a.pieces}p — ${a.ville}`}
                    </Text>
                  </View>
                  {/* Prix */}
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.black }}>
                    {fmt(a.prix)} €
                  </Text>
                  {/* Reco badge */}
                  <View style={{
                    backgroundColor: getScoreBg(a.scoreGlobal),
                    borderRadius: 3,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                    width: 80,
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: getScoreColor(a.scoreGlobal) }}>
                      {getRecoLabel(a.recommandation)}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>

          {/* ═══════════════════════════════════════
              ZONE 2 — DONNÉES : Tableau Comparatif
              ═══════════════════════════════════════ */}

          <View style={{ marginTop: 10 }}>
            <SectionTitle title="TABLEAU COMPARATIF" />

            {/* En-tête du tableau */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: C.black,
              borderRadius: 3,
              paddingVertical: 4,
              paddingHorizontal: 4,
              marginTop: 4,
            }}>
              <View style={{ width: 90 }}>
                <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.white }}>Critère</Text>
              </View>
              {sorted.map(a => (
                <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: a.rang === 1 ? C.green : C.white }}>
                    #{a.rang} {a.ville.substring(0, 12)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Lignes comparatives */}
            {[
              { label: 'Prix', values: sorted.map(a => `${fmt(a.prix)} €`), highlightMin: sorted.map(a => a.prix) },
              { label: 'Prix /m²', values: sorted.map(a => `${fmt(a.prixM2)} €`), highlightMin: sorted.map(a => a.prixM2) },
              ...(tauxInteret !== undefined && dureeAns ? [{
                label: `Mensualité (${dureeAns}ans)`,
                values: sorted.map(a => `${fmt(calculerMensualite(a.prix, apport || 0, tauxInteret, dureeAns))} €/m`),
                highlightMin: sorted.map(a => calculerMensualite(a.prix, apport || 0, tauxInteret, dureeAns)),
              }] : []),
              { label: 'Surface', values: sorted.map(a => `${a.surface} m²`), highlightMax: sorted.map(a => a.surface) },
              { label: 'Pièces', values: sorted.map(a => `${a.pieces}`), highlightMax: sorted.map(a => a.pieces) },
              { label: 'Chambres', values: sorted.map(a => `${a.chambres}`) },
              { label: 'Type', values: sorted.map(a => a.type === 'maison' ? 'Maison' : 'Appt') },
            ].map((row, idx) => {
              const minVal = row.highlightMin ? Math.min(...row.highlightMin) : undefined
              const maxVal = (row as Record<string, unknown>).highlightMax ? Math.max(...((row as Record<string, unknown>).highlightMax as number[])) : undefined
              return (
                <View key={idx} style={{
                  flexDirection: 'row',
                  paddingVertical: 3.5,
                  paddingHorizontal: 4,
                  borderBottomWidth: 0.3,
                  borderBottomColor: '#eee',
                  backgroundColor: idx % 2 === 0 ? C.white : C.grayBg,
                }}>
                  <View style={{ width: 90 }}>
                    <Text style={{ fontSize: 6.5, color: C.gray }}>{row.label}</Text>
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
                          fontSize: 6.5,
                          fontFamily: isHighlight ? 'Helvetica-Bold' : 'Helvetica',
                          color: isHighlight ? C.green : C.black,
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
              paddingVertical: 3.5,
              paddingHorizontal: 4,
              borderBottomWidth: 0.3,
              borderBottomColor: '#eee',
            }}>
              <View style={{ width: 90 }}>
                <Text style={{ fontSize: 6.5, color: C.gray }}>DPE</Text>
              </View>
              {sorted.map(a => (
                <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                  <DpeBadge dpe={a.dpe} />
                </View>
              ))}
            </View>

            {/* Équipements rows */}
            {[
              { label: 'Parking', key: 'parking' as const },
              { label: 'Balcon/Terrasse', key: 'balconTerrasse' as const },
              { label: 'Cave', key: 'cave' as const },
              { label: 'Ascenseur', key: 'ascenseur' as const },
            ].map((eq, idx) => (
              <View key={eq.key} style={{
                flexDirection: 'row',
                paddingVertical: 3,
                paddingHorizontal: 4,
                borderBottomWidth: 0.3,
                borderBottomColor: '#eee',
                backgroundColor: idx % 2 === 0 ? C.grayBg : C.white,
              }}>
                <View style={{ width: 90 }}>
                  <Text style={{ fontSize: 6.5, color: C.gray }}>{eq.label}</Text>
                </View>
                {sorted.map(a => (
                  <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 7, color: a[eq.key] ? C.green : C.grayLight }}>
                      {a[eq.key] ? '✓' : '✗'}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Score row */}
            <View style={{
              flexDirection: 'row',
              paddingVertical: 5,
              paddingHorizontal: 4,
              backgroundColor: C.greenLight,
              borderRadius: 3,
              marginTop: 2,
            }}>
              <View style={{ width: 90 }}>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.greenDark }}>Score AQUIZ</Text>
              </View>
              {sorted.map(a => (
                <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: getScoreColor(a.scoreGlobal) }}>
                    {a.scoreGlobal}/100
                  </Text>
                </View>
              ))}
            </View>

            {/* ── Localisation & Marché (intégré au tableau) ── */}
            {sorted.some(a => a.enrichissement?.marche?.success) && (
              <View style={{
                flexDirection: 'row',
                paddingVertical: 4,
                paddingHorizontal: 4,
                borderBottomWidth: 0.3,
                borderBottomColor: '#eee',
                marginTop: 2,
              }}>
                <View style={{ width: 90 }}>
                  <Text style={{ fontSize: 6.5, color: C.gray }}>Prix vs Marché</Text>
                </View>
                {sorted.map(a => {
                  const m = a.enrichissement?.marche
                  if (!m?.success) return (
                    <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 6, color: C.grayLight }}>—</Text>
                    </View>
                  )
                  const ecart = m.ecartPrixM2 ?? 0
                  return (
                    <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: ecart <= 0 ? C.green : C.red }}>
                        {ecart > 0 ? '+' : ''}{ecart.toFixed(0)}% {getVerdictMarcheLabel(m.verdict)}
                      </Text>
                    </View>
                  )
                })}
              </View>
            )}

            {sorted.some(a => a.enrichissement?.quartier?.success && a.enrichissement.quartier.transports !== undefined) && (
              <View style={{
                flexDirection: 'row',
                paddingVertical: 4,
                paddingHorizontal: 4,
                borderBottomWidth: 0.3,
                borderBottomColor: '#eee',
              }}>
                <View style={{ width: 90 }}>
                  <Text style={{ fontSize: 6.5, color: C.gray }}>Transports</Text>
                </View>
                {sorted.map(a => {
                  const t = a.enrichissement?.quartier?.transports
                  if (t === undefined) return (
                    <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 6, color: C.grayLight }}>—</Text>
                    </View>
                  )
                  return (
                    <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: t >= 70 ? C.green : t >= 40 ? C.orange : C.red }}>{t}/100</Text>
                    </View>
                  )
                })}
              </View>
            )}

            {sorted.some(a => a.enrichissement?.quartier?.success) && (
              <View style={{
                flexDirection: 'row',
                paddingVertical: 4,
                paddingHorizontal: 4,
                borderBottomWidth: 0.3,
                borderBottomColor: '#eee',
              }}>
                <View style={{ width: 90 }}>
                  <Text style={{ fontSize: 6.5, color: C.gray }}>Score quartier</Text>
                </View>
                {sorted.map(a => {
                  const q = a.enrichissement?.quartier
                  if (!q?.success) return (
                    <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 6, color: C.grayLight }}>—</Text>
                    </View>
                  )
                  return (
                    <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: getScoreColor(q.scoreQuartier ?? 50) }}>
                        {q.scoreQuartier}/100
                      </Text>
                    </View>
                  )
                })}
              </View>
            )}

            {/* ── Estimations financières (intégrées au tableau) ── */}
            {sorted.some(a => a.estimations?.loyerMensuelEstime) && (
              <View style={{
                flexDirection: 'row',
                paddingVertical: 4,
                paddingHorizontal: 4,
                borderBottomWidth: 0.3,
                borderBottomColor: '#eee',
              }}>
                <View style={{ width: 90 }}>
                  <Text style={{ fontSize: 6.5, color: C.gray }}>Loyer estimé</Text>
                </View>
                {sorted.map(a => (
                  <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black }}>
                      {a.estimations?.loyerMensuelEstime ? `${fmt(a.estimations.loyerMensuelEstime)} €/m` : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {sorted.some(a => a.estimations?.rendementBrut) && (
              <View style={{
                flexDirection: 'row',
                paddingVertical: 4,
                paddingHorizontal: 4,
                borderBottomWidth: 0.3,
                borderBottomColor: '#eee',
              }}>
                <View style={{ width: 90 }}>
                  <Text style={{ fontSize: 6.5, color: C.gray }}>Rendement brut</Text>
                </View>
                {sorted.map(a => (
                  <View key={a.id} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: a.estimations?.rendementBrut ? C.green : C.grayLight }}>
                      {a.estimations?.rendementBrut ? `${a.estimations.rendementBrut.toFixed(1)}%` : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        <Footer logoUrl={logoUrl} />
      </Page>

      {/* ══════════════════════════════════════════
          PAGES 2+ — Fiches condensées par bien
          ══════════════════════════════════════════ */}
      {sorted.map((annonce, pageIdx) => {
        const avantages = annonce.points.filter(p => p.type === 'avantage')
        const attentions = annonce.points.filter(p => p.type === 'attention')
        const isNeuf = annonce.anneeConstruction && (new Date().getFullYear() - annonce.anneeConstruction) <= 5
        const fraisNotaire = Math.round(annonce.prix * (isNeuf ? 0.025 : 0.075))
        const coutTotal = annonce.prix + fraisNotaire + (annonce.estimations?.budgetTravauxEstime || 0)

        return (
          <Page key={annonce.id} size="A4" style={s.pageWithFixedHeader}>
            <FixedHeader logoUrl={logoUrl} nbBiens={n} />
            <View style={[s.content, { marginTop: 52 }]}>

              {/* ════════════════════════════════════════
                  SECTION 1 — HEADER BIEN
                  ════════════════════════════════════════ */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginTop: 6,
                paddingBottom: 7,
                paddingHorizontal: 6,
                borderBottomWidth: 1,
                borderBottomColor: getScoreColor(annonce.scoreGlobal),
              }}>
                {/* Score cercle avec rang */}
                <View style={{ alignItems: 'center', position: 'relative', flexShrink: 0 }}>
                  <View style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    borderWidth: 2,
                    borderColor: getScoreColor(annonce.scoreGlobal),
                    backgroundColor: getScoreBg(annonce.scoreGlobal),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: getScoreColor(annonce.scoreGlobal) }}>
                      {annonce.scoreGlobal}
                    </Text>
                    <Text style={{ fontSize: 4.5, color: getScoreColor(annonce.scoreGlobal), marginTop: -2 }}>/100</Text>
                  </View>
                  <View style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 15,
                    height: 15,
                    borderRadius: 7.5,
                    backgroundColor: annonce.rang === 1 ? C.green : C.gray,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: C.white,
                  }}>
                    <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.white }}>
                      {annonce.rang}
                    </Text>
                  </View>
                </View>

                {/* Infos bien */}
                <View style={{ flex: 1 }}>
                  {/* Ligne 1 : Reco badge seule */}
                  <View style={{
                    backgroundColor: getScoreBg(annonce.scoreGlobal),
                    borderRadius: 3,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    alignSelf: 'flex-start',
                    marginBottom: 3,
                  }}>
                    <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: getScoreColor(annonce.scoreGlobal) }}>
                      {getRecoLabel(annonce.recommandation)}
                    </Text>
                  </View>
                  {/* Ligne 2 : Titre */}
                  <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.black, maxLines: 1 }}>
                    {annonce.titre || `${annonce.type === 'maison' ? 'Maison' : 'Appt'} ${annonce.pieces}p — ${annonce.ville}`}
                  </Text>
                  {/* Ligne 3 : Localisation + Prix inline */}
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
                    <Text style={{ fontSize: 7, color: C.gray }}>
                      {annonce.ville} ({annonce.codePostal}) · {annonce.surface} m² · DPE {annonce.dpe}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                      <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.black }}>{fmt(annonce.prix)} €</Text>
                      <Text style={{ fontSize: 7, color: C.gray }}>{fmt(annonce.prixM2)} €/m²</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ════════════════════════════════════════
                  SECTION 2 — VERDICT RAPIDE (Points forts + Vigilance)
                  ════════════════════════════════════════ */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ backgroundColor: C.greenLight, borderRadius: 3, padding: 6 }}>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.greenDark, marginBottom: 3 }}>
                      POINTS FORTS ({avantages.length})
                    </Text>
                    {avantages.slice(0, 3).map((p, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 3, marginBottom: 2 }}>
                        <Text style={{ fontSize: 6, color: C.green }}>+</Text>
                        <Text style={{ fontSize: 6, color: C.black, flex: 1, lineHeight: 1.3 }}>{p.texte}</Text>
                      </View>
                    ))}
                    {avantages.length === 0 && (
                      <Text style={{ fontSize: 6, color: C.grayLight, fontStyle: 'italic' }}>Aucun point fort</Text>
                    )}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ backgroundColor: C.amberLight, borderRadius: 3, padding: 6 }}>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#92400e', marginBottom: 3 }}>
                      VIGILANCE ({attentions.length})
                    </Text>
                    {attentions.slice(0, 3).map((p, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 3, marginBottom: 2 }}>
                        <Text style={{ fontSize: 6, color: C.orange }}>!</Text>
                        <Text style={{ fontSize: 6, color: C.black, flex: 1, lineHeight: 1.3 }}>{p.texte}</Text>
                      </View>
                    ))}
                    {attentions.length === 0 && (
                      <Text style={{ fontSize: 6, color: C.grayLight, fontStyle: 'italic' }}>Aucun point de vigilance</Text>
                    )}
                  </View>
                </View>
                {/* Conseil inline comme 3e colonne si présent */}
                {annonce.conseilPerso && (
                  <View style={{ width: 145 }}>
                    <View style={{ backgroundColor: C.grayBg, borderRadius: 3, padding: 6, borderLeftWidth: 2, borderLeftColor: C.green }}>
                      <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 2 }}>CONSEIL</Text>
                      <Text style={{ fontSize: 5.5, color: C.black, lineHeight: 1.3 }}>{annonce.conseilPerso}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* ════════════════════════════════════════
                  SECTION 3 — CARACTÉRISTIQUES + FINANCEMENT (faits concrets)
                  ════════════════════════════════════════ */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <View style={{ flex: 1 }}>
                  <SectionTitle title="CARACTÉRISTIQUES" />
                  <View style={{ backgroundColor: C.grayBg, borderRadius: 4, paddingVertical: 3, marginTop: 3 }}>
                    <DataRow label="Surface" value={`${annonce.surface} m²`} />
                    <DataRow label="Pièces / Chambres" value={`${annonce.pieces}p / ${annonce.chambres}ch`} />
                    {annonce.etage !== undefined && (
                      <DataRow label="Étage" value={annonce.etage === 0 ? 'RDC' : `${annonce.etage}${annonce.etagesTotal ? `/${annonce.etagesTotal}` : ''}`} />
                    )}
                    {annonce.anneeConstruction && <DataRow label="Construction" value={`${annonce.anneeConstruction}`} />}
                    {annonce.orientation && <DataRow label="Orientation" value={annonce.orientation} />}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, paddingHorizontal: 4 }}>
                    <BoolRow label="Parking" value={annonce.parking} />
                    <BoolRow label="Balcon" value={annonce.balconTerrasse} />
                    <BoolRow label="Cave" value={annonce.cave} />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <SectionTitle title="FINANCEMENT" />
                  <View style={{ backgroundColor: C.grayBg, borderRadius: 4, paddingVertical: 3, marginTop: 3 }}>
                    <DataRow label="Prix d'achat" value={`${fmt(annonce.prix)} €`} />
                    <DataRow label={`Frais notaire (~${isNeuf ? '2,5' : '7,5'}%)`} value={`${fmt(fraisNotaire)} €`} />
                    {annonce.estimations?.budgetTravauxEstime ? (
                      <DataRow label="Budget travaux" value={`${fmt(annonce.estimations.budgetTravauxEstime)} €`} />
                    ) : null}
                    <DataRow label="Coût total" value={`${fmt(coutTotal)} €`} bold highlight />
                    {tauxInteret !== undefined && dureeAns && (
                      <DataRow label={`Mensualité (${dureeAns}ans)`} value={`${fmt(calculerMensualite(annonce.prix, apport || 0, tauxInteret, dureeAns))} €/m`} />
                    )}
                    {annonce.chargesMensuelles && <DataRow label="Charges copro" value={`${fmt(annonce.chargesMensuelles)} €/m`} />}
                    {annonce.taxeFonciere && <DataRow label="Taxe foncière" value={`${fmt(annonce.taxeFonciere)} €/an`} />}
                    {annonce.estimations?.coutEnergieAnnuel ? (
                      <DataRow label="Énergie estimée" value={`${fmt(annonce.estimations.coutEnergieAnnuel)} €/an`} />
                    ) : null}
                  </View>
                  {/* Investissement */}
                  {(annonce.estimations?.loyerMensuelEstime || annonce.estimations?.rendementBrut) && (
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 3 }}>
                      {annonce.estimations?.loyerMensuelEstime ? (
                        <View style={{ flex: 1, backgroundColor: C.greenLight, borderRadius: 3, paddingVertical: 3, paddingHorizontal: 3, alignItems: 'center' }}>
                          <Text style={{ fontSize: 5, color: C.gray }}>Loyer estimé</Text>
                          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.greenDark }}>{fmt(annonce.estimations.loyerMensuelEstime)} €/m</Text>
                        </View>
                      ) : null}
                      {annonce.estimations?.rendementBrut ? (
                        <View style={{ flex: 1, backgroundColor: C.greenLight, borderRadius: 3, paddingVertical: 3, paddingHorizontal: 3, alignItems: 'center' }}>
                          <Text style={{ fontSize: 5, color: C.gray }}>Rendement brut</Text>
                          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.greenDark }}>{annonce.estimations.rendementBrut.toFixed(1)} %</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>

              {/* ════════════════════════════════════════
                  SECTION 4 — ANALYSE MARCHÉ & ENVIRONNEMENT (contexte/interprétation)
                  ════════════════════════════════════════ */}
              {(annonce.enrichissement?.marche?.success || annonce.enrichissement?.quartier?.success) && (
                <View style={{ marginTop: 6 }}>
                  <SectionTitle title="ANALYSE MARCHÉ & ENVIRONNEMENT" />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
                    {/* Card Marché */}
                    {annonce.enrichissement?.marche?.success && (
                      <View style={{ flex: 1, backgroundColor: C.grayBg, borderRadius: 3, padding: 6 }}>
                        <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 3 }}>PRIX VS MARCHÉ</Text>
                        <View style={{ alignItems: 'center', marginBottom: 3 }}>
                          <Text style={{
                            fontSize: 12,
                            fontFamily: 'Helvetica-Bold',
                            color: (annonce.enrichissement.marche.ecartPrixM2 ?? 0) <= 0 ? C.green : (annonce.enrichissement.marche.ecartPrixM2 ?? 0) <= 10 ? C.amber : C.red,
                          }}>
                            {(annonce.enrichissement.marche.ecartPrixM2 ?? 0) > 0 ? '+' : ''}{annonce.enrichissement.marche.ecartPrixM2?.toFixed(0) ?? '—'}%
                          </Text>
                          <View style={{
                            backgroundColor: getScoreBg(
                              annonce.enrichissement.marche.verdict === 'excellent' ? 90 :
                              annonce.enrichissement.marche.verdict === 'bon' ? 75 :
                              annonce.enrichissement.marche.verdict === 'correct' ? 55 : 30
                            ),
                            borderRadius: 3,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            marginTop: 3,
                          }}>
                            <Text style={{
                              fontSize: 6,
                              fontFamily: 'Helvetica-Bold',
                              color: getScoreColor(
                                annonce.enrichissement.marche.verdict === 'excellent' ? 90 :
                                annonce.enrichissement.marche.verdict === 'bon' ? 75 :
                                annonce.enrichissement.marche.verdict === 'correct' ? 55 : 30
                              ),
                            }}>
                              {getVerdictMarcheLabel(annonce.enrichissement.marche.verdict)}
                            </Text>
                          </View>
                        </View>
                        <View style={{ borderTopWidth: 0.3, borderTopColor: C.grayBorder, paddingTop: 4 }}>
                          {annonce.enrichissement.marche.prixM2MedianMarche && (
                            <Text style={{ fontSize: 5.5, color: C.gray, marginBottom: 1 }}>Médiane secteur : {fmt(Math.round(annonce.enrichissement.marche.prixM2MedianMarche))} €/m²</Text>
                          )}
                          {annonce.enrichissement.marche.evolution12Mois !== undefined && (
                            <Text style={{ fontSize: 5.5, color: C.gray }}>Évol. 12 mois : {annonce.enrichissement.marche.evolution12Mois > 0 ? '+' : ''}{annonce.enrichissement.marche.evolution12Mois.toFixed(1)}%</Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Card Transports */}
                    {annonce.enrichissement?.quartier?.success && annonce.enrichissement.quartier.transports !== undefined && (
                      <View style={{ flex: 1, backgroundColor: C.grayBg, borderRadius: 3, padding: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.black }}>TRANSPORTS</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Text style={{
                              fontSize: 9,
                              fontFamily: 'Helvetica-Bold',
                              color: getScoreColor(annonce.enrichissement.quartier.transports),
                            }}>
                              {annonce.enrichissement.quartier.transports}/100
                            </Text>
                            <View style={{
                              backgroundColor: annonce.enrichissement.quartier.transports >= 70 ? C.greenLight : annonce.enrichissement.quartier.transports >= 40 ? C.amberLight : C.redLight,
                              borderRadius: 2,
                              paddingHorizontal: 4,
                              paddingVertical: 1,
                            }}>
                              <Text style={{
                                fontSize: 5,
                                fontFamily: 'Helvetica-Bold',
                                color: getScoreColor(annonce.enrichissement.quartier.transports),
                              }}>
                                {annonce.enrichissement.quartier.transports >= 75 ? 'Tres bien desservi' : annonce.enrichissement.quartier.transports >= 50 ? 'Bien desservi' : annonce.enrichissement.quartier.transports >= 25 ? 'Peu desservi' : 'Tres peu desservi'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Liste compacte des transports proches — badges IDFM intégrés */}
                        <View style={{ borderTopWidth: 0.3, borderTopColor: C.grayBorder, paddingTop: 4 }}>
                          {annonce.enrichissement.quartier.transportsProches && annonce.enrichissement.quartier.transportsProches.length > 0 ? (
                            annonce.enrichissement.quartier.transportsProches.map((tp, i) => {
                              const tStyle = TRANSPORT_COLORS[tp.typeTransport] || TRANSPORT_COLORS.bus
                              const hasLignes = tp.lignes && tp.lignes.length > 0
                              return (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2.5 }}>
                                  {/* Badges lignes intégrés (couleur officielle) ou badge type seul */}
                                  {hasLignes ? (
                                    <View style={{ flexDirection: 'row', gap: 1.5, marginRight: 3 }}>
                                      {tp.lignes!.slice(0, 3).map((l, j) => {
                                        const lc = getPdfLineColor(tp.typeTransport, l)
                                        const isRerStyle = tp.typeTransport === 'rer'
                                        return (
                                          <View key={j} style={isRerStyle ? {
                                            width: 14,
                                            height: 14,
                                            borderRadius: 7,
                                            backgroundColor: '#fff',
                                            borderWidth: 2,
                                            borderColor: lc.bg,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                          } : {
                                            minWidth: 14,
                                            borderRadius: tp.typeTransport === 'metro' ? 7 : 6,
                                            backgroundColor: lc.bg,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            paddingHorizontal: 3,
                                            paddingVertical: 1.5,
                                          }}>
                                            <Text style={{
                                              fontSize: 5.5,
                                              fontFamily: 'Helvetica-Bold',
                                              color: isRerStyle ? lc.fg : lc.fg,
                                            }}>
                                              {l}
                                            </Text>
                                          </View>
                                        )
                                      })}
                                    </View>
                                  ) : (
                                    <View style={{
                                      width: 14,
                                      height: 10,
                                      borderRadius: (tp.typeTransport === 'rer' || tp.typeTransport === 'train') ? 2 : 5,
                                      backgroundColor: tStyle.bg,
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      marginRight: 3,
                                    }}>
                                      <Text style={{ fontSize: 5, fontFamily: 'Helvetica-Bold', color: tStyle.text }}>
                                        {tStyle.abbr}
                                      </Text>
                                    </View>
                                  )}
                                  {/* Nom station */}
                                  <Text style={{ fontSize: 5.5, color: C.black, flex: 1 }}>
                                    {tp.nom}
                                  </Text>
                                  {/* Temps de marche */}
                                  <Text style={{ fontSize: 5, color: C.grayLight }}>
                                    {tp.walkMin ?? Math.max(1, Math.round(tp.distance / 75))} min
                                  </Text>
                                </View>
                              )
                            })
                          ) : (
                            <Text style={{ fontSize: 5.5, color: C.gray }}>
                              Desserte en transports en commun (OpenStreetMap)
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Card Quartier */}
                    {annonce.enrichissement?.quartier?.success && (
                      <View style={{ flex: 1, backgroundColor: C.grayBg, borderRadius: 3, padding: 6 }}>
                        <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 3 }}>SCORE QUARTIER</Text>
                        <View style={{ alignItems: 'center', marginBottom: 3 }}>
                          <Text style={{
                            fontSize: 12,
                            fontFamily: 'Helvetica-Bold',
                            color: getScoreColor(annonce.enrichissement.quartier.scoreQuartier ?? 0),
                          }}>
                            {annonce.enrichissement.quartier.scoreQuartier ?? '—'}/100
                          </Text>
                          <Text style={{ fontSize: 5.5, color: C.gray, marginTop: 1 }}>
                            {getQuartierSubLabel(annonce.enrichissement.quartier.scoreQuartier ?? 0)}
                          </Text>
                        </View>
                        {/* Sous-scores */}
                        {[
                          { label: 'Commerces', val: annonce.enrichissement.quartier.commerces },
                          { label: 'Écoles', val: annonce.enrichissement.quartier.ecoles },
                          { label: 'Santé', val: annonce.enrichissement.quartier.sante },
                          { label: 'Espaces verts', val: annonce.enrichissement.quartier.espaceVerts },
                        ].filter(sub => sub.val !== undefined).map(sub => (
                          <View key={sub.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1.5 }}>
                            <Text style={{ fontSize: 4.5, color: C.gray, width: 42 }}>{sub.label}</Text>
                            <View style={{ flex: 1, height: 3, backgroundColor: '#e6e6e6', borderRadius: 2, marginHorizontal: 2 }}>
                              <View style={{ height: 3, borderRadius: 2, backgroundColor: getScoreColor(sub.val ?? 0), width: `${Math.max(sub.val ?? 0, 2)}%` }} />
                            </View>
                            <Text style={{ fontSize: 4.5, fontFamily: 'Helvetica-Bold', color: C.gray, width: 14, textAlign: 'right' }}>{sub.val}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* ════════════════════════════════════════
                  SECTION 5 — SCORING DÉTAILLÉ + RADAR
                  ════════════════════════════════════════ */}
              <View style={{ marginTop: 6 }}>
                <SectionTitle title={`SCORING DÉTAILLÉ — ${annonce.scoreGlobal}/100`} />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 3, alignItems: 'flex-start' }}>
                  {/* Radar chart à gauche */}
                  {annonce.radarData && annonce.radarData.length >= 3 && (
                    <View style={{ width: 100, alignItems: 'center', justifyContent: 'center' }}>
                      <PdfRadar data={annonce.radarData} size={80} />
                    </View>
                  )}
                  {/* Axes barres à droite */}
                  <View style={{ flex: 1 }}>
                    {annonce.axes.map(axe => (
                      <AxeBar key={axe.axe} label={axe.label} score={axe.score} poids={axe.poids} />
                    ))}
                  </View>
                </View>
                {/* Points clés visite */}
                {(() => {
                  const checklistItems = genererChecklistVisite(annonce).slice(0, 2)
                  return (
                    <View style={{
                      marginTop: 5,
                      paddingVertical: 4,
                      paddingHorizontal: 5,
                      backgroundColor: C.grayBg,
                      borderRadius: 3,
                    }}>
                      <Text style={{ fontSize: 5.5, color: C.gray, lineHeight: 1.3 }}>
                        <Text style={{ fontFamily: 'Helvetica-Bold' }}>À vérifier : </Text>
                        {checklistItems.join('  •  ')}
                      </Text>
                    </View>
                  )
                })()}
              </View>

            </View>
            <Footer logoUrl={logoUrl} />
          </Page>
        )
      })}

      {/* ══════════════════════════════════════════
          PAGE FINALE — Synthèse IA + Verdict + CTA
          ══════════════════════════════════════════ */}
      <Page size="A4" style={s.pageWithFixedHeader}>
        <FixedHeader logoUrl={logoUrl} nbBiens={n} />
        <View style={[s.content, { marginTop: 52 }]}>

          {/* ── Titre de section ── */}
          <View style={{ marginTop: 8 }}>
            <SectionTitle title={syntheseIA?.synthese ? 'SYNTHÈSE AQUIZ IA — ANALYSE COMPARATIVE' : 'SYNTHÈSE COMPARATIVE'} />
            {syntheseIA?.synthese && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <View style={{ backgroundColor: C.greenLight, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.greenDark }}>✨ AQUIZ IA</Text>
                </View>
                <Text style={{ fontSize: 5.5, color: C.grayLight }}>Analyse générée par l'intelligence artificielle AQUIZ</Text>
              </View>
            )}
          </View>

          {/* ── Synthèse principale — découpée en paragraphes lisibles ── */}
          <View style={{
            backgroundColor: C.greenLight,
            borderRadius: 6,
            padding: 14,
            marginTop: 4,
          }}>
            {(syntheseIA?.synthese || syntheseDeterministe || '').split(/(?<=\.)\s+/).filter(Boolean).map((paragraph, pIdx) => (
              <Text key={pIdx} style={{ fontSize: 7.5, color: C.greenDark, lineHeight: 1.6, marginBottom: pIdx < (syntheseIA?.synthese || syntheseDeterministe || '').split(/(?<=\.)\s+/).length - 1 ? 5 : 0 }}>
                {paragraph}
              </Text>
            ))}
          </View>

          {/* ── Verdict final ── */}
          {(syntheseIA?.verdictFinal || conseilGeneral) && (
            <View style={{
              backgroundColor: C.white,
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: C.green,
              padding: 12,
              marginTop: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }} wrap={false}>
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: C.greenLight,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Text style={{ fontSize: 14 }}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 2 }}>VERDICT FINAL</Text>
                <Text style={{ fontSize: 7.5, color: C.black, lineHeight: 1.5 }}>
                  {syntheseIA?.verdictFinal || conseilGeneral}
                </Text>
              </View>
            </View>
          )}

          {/* ── Conseil négociation ── */}
          {syntheseIA?.conseilNego && (
            <View style={{
              backgroundColor: C.amberLight,
              borderRadius: 5,
              paddingVertical: 10,
              paddingHorizontal: 12,
              marginTop: 10,
            }} wrap={false}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.orange, marginBottom: 3 }}>
                CONSEIL NÉGOCIATION
              </Text>
              <Text style={{ fontSize: 7, color: '#92400e', lineHeight: 1.5 }}>
                {syntheseIA.conseilNego}
              </Text>
            </View>
          )}

          {/* ── Conseil Acquisition AQUIZ ── */}
          {syntheseIA?.conseilAcquisition && (
            <View style={{
              backgroundColor: C.white,
              borderRadius: 5,
              borderWidth: 1,
              borderColor: C.green,
              padding: 12,
              marginTop: 10,
            }} wrap={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
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
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.greenDark }}>
                  CONSEIL ACQUISITION — EXPERT AQUIZ
                </Text>
              </View>
              <Text style={{ fontSize: 7, color: C.black, lineHeight: 1.6 }}>
                {syntheseIA.conseilAcquisition}
              </Text>
              <View style={{
                backgroundColor: C.greenLight,
                borderRadius: 4,
                padding: 8,
                marginTop: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}>
                <Text style={{ fontSize: 6.5, color: C.greenDark, flex: 1, lineHeight: 1.5 }}>
                  Un expert AQUIZ vous accompagne de la visite à la signature : audit du bien, montage financier optimal (accès 30+ banques), négociation du prix et sécurisation juridique de votre achat.
                </Text>
              </View>
            </View>
          )}

          {/* ── Rappel classement + CTA + Disclaimer (all grouped to avoid empty page) ── */}
          <View style={{ marginTop: 10 }} wrap={false}>
            {/* Mini rappel classement horizontal */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
              {sorted.map((a, i) => (
                <View key={a.id} style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 4,
                  paddingHorizontal: 6,
                  backgroundColor: i === 0 ? C.greenLight : C.grayBg,
                  borderRadius: 3,
                }}>
                  <View style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: i === 0 ? C.green : C.gray,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.white }}>{a.rang}</Text>
                  </View>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: getScoreColor(a.scoreGlobal) }}>{a.scoreGlobal}</Text>
                  <Text style={{ fontSize: 5.5, color: C.gray, flex: 1 }}>{a.ville}</Text>
                </View>
              ))}
            </View>
            <View style={s.ctaCard}>
              <View>
                <Text style={s.ctaTitle}>Besoin d&apos;aller plus loin ?</Text>
                <Text style={s.ctaSub}>
                  Un expert AQUIZ vous accompagne pour négocier, vérifier les diagnostics et signer sereinement.
                </Text>
              </View>
              <Link src="https://calendly.com/contact-aquiz/30min" style={{ textDecoration: 'none' }}>
                <View style={s.ctaBtn}>
                  <Text style={s.ctaBtnText}>Prendre RDV</Text>
                </View>
              </Link>
            </View>
            <View style={{ marginTop: 6, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 5, color: C.grayLight, lineHeight: 1.4 }}>
                Ce rapport est généré à partir de données publiques (DVF, Géorisques, OpenStreetMap) et d&apos;algorithmes AQUIZ.
                Les estimations sont indicatives et ne constituent pas un avis professionnel. © {new Date().getFullYear()} AQUIZ — {dateGeneration}
              </Text>
            </View>
          </View>

        </View>
        <Footer logoUrl={logoUrl} />
      </Page>
    </Document>
  )
}
