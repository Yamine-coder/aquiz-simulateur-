/**
 * AQUIZ — Rapport de simulation Mode B (PDF)
 * "Ce qu'il faut pour acheter ce bien"
 * Généré avec @react-pdf/renderer
 */
import type { DonneesQuartier, SyntheseIA } from '@/lib/pdf/enrichirPourPDF'
import { Document, Image, Link, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'

// ─── Types ───
interface SimulationDuree {
  duree: number
  mensualite: number
  revenusMinimums: number
  coutTotal: number
}

interface RepartitionCout {
  label: string
  value: number
  color: string
}

interface InfoLocalisationPDF {
  zonePTZ: string
  descriptionZone: string
  ptzEligible: boolean
  ptzMontant: number
  nomCommune: string | null
  prixLocalM2: number | null
  surfaceEstimee: number | null
  nbVentes: number | null
}

export interface SimulationPDFModeBProps {
  logoUrl: string
  // Bien
  prixBien: number
  typeBien: 'neuf' | 'ancien'
  typeLogement: 'appartement' | 'maison'
  codePostal: string
  nomCommune: string
  // Paramètres
  apport: number
  dureeAns: number
  tauxInteret: number
  // Résultats
  fraisNotaire: number
  fraisAnnexes: number
  coutTotal: number
  montantAEmprunter: number
  mensualiteCredit: number
  mensualiteAssurance: number
  mensualiteTotal: number
  revenusMinimums33: number
  revenusMinimums35: number
  apportMinimum10: number
  apportIdeal20: number
  apportSuffisant: boolean
  coutTotalCredit: number
  totalProjet: number
  // Simulations durées
  simulationsDuree: SimulationDuree[]
  // Répartition
  repartitionCout: RepartitionCout[]
  // Localisation (optionnel)
  infoLocalisation: InfoLocalisationPDF | null
  // Enrichissements premium (optionnels)
  quartier?: DonneesQuartier | null
  syntheseIA?: SyntheseIA | null
}

// ─── Couleurs charte AQUIZ ───
// ─── Couleurs officielles transports RATP/SNCF/Transilien ───
/** Couleurs officielles des lignes de métro RATP */
const METRO_LINE_COLORS: Record<string, string> = {
  '1': '#FFCD00', '2': '#003CA6', '3': '#9B993A', '3bis': '#98D4E2',
  '4': '#BE418D', '5': '#F57F25', '6': '#76C882', '7': '#F57F25',
  '7bis': '#76C882', '8': '#E19BCD', '9': '#CDC83F', '10': '#C9910D',
  '11': '#8D6539', '12': '#007852', '13': '#87D3DF', '14': '#662D91',
}
/** Couleurs officielles des lignes RER */
const RER_LINE_COLORS: Record<string, string> = {
  A: '#E2001A', B: '#4C90CD', C: '#FECE00', D: '#008B5A', E: '#BD76A1',
}
/** Couleurs officielles Transilien */
const TRANSILIEN_COLORS: Record<string, string> = {
  H: '#8D6539', J: '#CDC83F', K: '#9B993A', L: '#BD76A1',
  N: '#00A88F', P: '#F57F25', R: '#E2007A', U: '#B90845',
}
/** Lignes claires nécessitant un texte noir */
const DARK_TEXT_LINES = new Set(['1', '9', '3bis', '6', '7bis', '8', '13', 'C', 'J', 'K'])

/** Identifiants de lignes valides (patterns connus) */
const VALID_METRO_LINES = new Set(['1', '2', '3', '3bis', '4', '5', '6', '7', '7bis', '8', '9', '10', '11', '12', '13', '14'])
const VALID_RER_LINES = new Set(['A', 'B', 'C', 'D', 'E'])
const VALID_TRANSILIEN_LINES = new Set(['H', 'J', 'K', 'L', 'N', 'P', 'R', 'U'])
const VALID_TRAM_PATTERN = /^T\d{1,2}$/i

/** Nettoie et filtre les lignes pour ne garder que les identifiants reconnus */
function cleanTransportLines(type: string, rawLignes?: string[]): string[] {
  if (!rawLignes || rawLignes.length === 0) return []
  const cleaned = rawLignes.map(l => l.split(':')[0].split(' ')[0].trim()).filter(Boolean)
  const uniq = [...new Set(cleaned)]

  if (type === 'metro') return uniq.filter(l => VALID_METRO_LINES.has(l))
  if (type === 'rer') return uniq.filter(l => VALID_RER_LINES.has(l.toUpperCase())).map(l => l.toUpperCase())
  if (type === 'train') return uniq.filter(l => VALID_TRANSILIEN_LINES.has(l.toUpperCase())).map(l => l.toUpperCase())
  if (type === 'tram') return uniq.filter(l => VALID_TRAM_PATTERN.test(l))
  if (type === 'bus') return uniq.filter(l => /^\d{1,3}[A-Za-z]?$/.test(l)).slice(0, 3)
  return []
}

/**
 * Logo Métro RATP — Cercle bleu marine + M blanc
 * Style officiel RATP : rond bleu #003CA6 avec lettre M blanche
 */
function LogoMetro() {
  return (
    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#003CA6', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginTop: -1 }}>M</Text>
    </View>
  )
}

/**
 * Logo RER — Cercle bleu avec bordure blanche + texte RER
 * Style officiel : double cercle bleu-blanc-bleu
 */
function LogoRER() {
  return (
    <View style={{ width: 20, height: 16, borderRadius: 3, backgroundColor: '#003CA6', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', letterSpacing: 0.5 }}>RER</Text>
    </View>
  )
}

/**
 * Logo Train/Transilien — Pastille bleue avec icône
 */
function LogoTrain() {
  return (
    <View style={{ width: 20, height: 16, borderRadius: 3, backgroundColor: '#1D4A8C', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' }}>Train</Text>
    </View>
  )
}

/**
 * Pastille de ligne colorée — style officiel RATP
 * Cercle avec la couleur officielle de la ligne + numéro/lettre
 */
function PastilleLigne({ ligne, type }: { ligne: string; type: string }) {
  let bg = '#888888'
  if (type === 'metro') bg = METRO_LINE_COLORS[ligne] || '#888'
  else if (type === 'rer') bg = RER_LINE_COLORS[ligne.toUpperCase()] || '#888'
  else if (type === 'train') bg = TRANSILIEN_COLORS[ligne.toUpperCase()] || '#888'
  else if (type === 'tram') bg = '#000000'
  else if (type === 'bus') bg = '#1D9448'

  const textColor = DARK_TEXT_LINES.has(ligne) ? '#000000' : '#FFFFFF'
  const size = ligne.length > 2 ? 18 : 14

  return (
    <View style={{ width: size, height: 14, borderRadius: 7, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: ligne.length > 2 ? 5 : 7, fontFamily: 'Helvetica-Bold', color: textColor }}>{ligne}</Text>
    </View>
  )
}

/** Badge transport pour Bus, Tram, Vélib' */
function TransportBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ backgroundColor: color, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2, minWidth: 28, alignItems: 'center' }}>
      <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' }}>{label}</Text>
    </View>
  )
}

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
  blue: '#3b82f6',
  // Section titles
  sectionBg: '#2d3748',
  // Hero
  heroBg: '#f8fafb',
  heroBorder: '#e2e8f0',
}

// ─── Styles ───
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.black,
    backgroundColor: C.white,
    paddingBottom: 40,
  },
  // Header
  header: {
    backgroundColor: C.black,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerLeft: { width: 140 },
  headerLogo: { width: 130, height: 46, objectFit: 'contain' as const },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitleText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 1.5,
  },
  headerSubText: { fontSize: 7, color: '#777', marginTop: 3 },
  headerRight: { width: 140, alignItems: 'flex-end' },
  headerAccent: { height: 3, backgroundColor: C.green },
  // Content
  content: { paddingHorizontal: 28 },
  // Hero card
  heroCard: {
    backgroundColor: C.heroBg,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: C.heroBorder,
    borderLeftWidth: 3,
    borderLeftColor: C.green,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: { fontSize: 8, color: C.greenDark, letterSpacing: 0.5 },
  heroValue: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    marginTop: 4,
  },
  heroSub: { fontSize: 7, color: C.grayLight, marginTop: 2 },
  heroBadge: {
    backgroundColor: C.sectionBg,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  heroBadgeLabel: { fontSize: 5, color: '#b4b4b4' },
  heroBadgeValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    marginTop: 2,
  },
  // Metrics row
  metricsRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  metricCard: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.grayBorder,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 6, color: C.gray, letterSpacing: 0.5 },
  metricValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    marginTop: 4,
  },
  metricSub: { fontSize: 5, color: C.grayLight, marginTop: 2 },
  // Section title
  sectionTitle: {
    backgroundColor: C.sectionBg,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
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
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.3,
    borderBottomColor: '#eee',
  },
  dataLabel: { fontSize: 7.5, color: C.gray },
  dataValue: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.black },
  // Two columns
  twoColumns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  halfColumn: { flex: 1 },
  dataCard: {
    backgroundColor: C.grayBg,
    borderRadius: 3,
    paddingVertical: 4,
    marginTop: 2,
  },
  // Bar
  barRow: { marginBottom: 6 },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  barLabelText: { fontSize: 7, color: C.gray },
  barBg: { height: 5, backgroundColor: '#e6e6e6', borderRadius: 2 },
  barFill: { height: 5, borderRadius: 2 },
  // Budget total
  budgetTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    paddingTop: 6,
    marginTop: 6,
  },
  budgetTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.sectionBg,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.3,
    borderBottomColor: '#eee',
  },
  tableRowHighlight: {
    backgroundColor: C.greenLight,
    borderRadius: 3,
  },
  tableCell: {
    fontSize: 7,
    color: C.black,
    textAlign: 'center',
  },
  tableCellBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    textAlign: 'center',
  },
  // Apport
  apportCard: {
    backgroundColor: C.grayBg,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  apportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  apportLabel: { fontSize: 7, color: C.gray },
  apportValue: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black },
  // Localisation
  localCard: {
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.grayBorder,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  localRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  localLabel: { fontSize: 7, color: C.gray },
  localValue: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black },
  // Conseils
  conseilCard: {
    backgroundColor: C.grayBg,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  conseilItem: {
    fontSize: 6.5,
    color: C.black,
    marginBottom: 4,
    lineHeight: 1.4,
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
  // Footer — léger et discret
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
  // IA Card
  iaCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  iaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  iaBadgeIcon: {
    backgroundColor: C.green,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  iaBadgeText: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 0.5,
  },
  iaTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
  },
  iaText: {
    fontSize: 7,
    color: C.gray,
    lineHeight: 1.6,
  },
  iaCliffhanger: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.greenDark,
    lineHeight: 1.5,
    marginTop: 6,
  },
  iaEconomie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: C.white,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 0.5,
    borderColor: '#bbf7d0',
  },
  iaEconomieValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.greenDark,
  },
  iaEconomieLabel: {
    fontSize: 6,
    color: C.gray,
  },
  // Quartier scores
  quartierRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  quartierItem: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.grayBorder,
    paddingVertical: 5,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  quartierLabel: {
    fontSize: 5,
    color: C.gray,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  quartierScore: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    marginTop: 2,
  },
  quartierMax: {
    fontSize: 5,
    color: C.grayLight,
    marginTop: 1,
  },
  quartierDesc: {
    fontSize: 4.5,
    color: C.grayLight,
    textAlign: 'center' as const,
    marginTop: 2,
    lineHeight: 1.3,
  },
  // Page 2 title
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 28,
    paddingTop: 18,
  },
  pageTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.black },
  pageSub: { fontSize: 7, color: C.gray, marginLeft: 8 },
  // Page 2+ : wrapping automatique sur plusieurs pages
  pageWrap: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.black,
    backgroundColor: C.white,
    paddingTop: 24,
    paddingBottom: 40,
  },
})

// ─── Helpers ───
function fmt(n: number): string {
  const str = Math.round(n).toString()
  let result = ''
  for (let i = 0; i < str.length; i++) {
    if (i > 0 && (str.length - i) % 3 === 0) result += ' '
    result += str[i]
  }
  return result
}

// ─── Sub-components ───

function Footer({ logoUrl }: { logoUrl: string }) {
  return (
    <View style={s.footer} fixed>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={logoUrl} style={s.footerLogo} />
      <Text style={s.footerDisclaimer}>Simulation indicative — Ne constitue pas une offre de prêt</Text>
      <Text
        style={s.footerPage}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={s.sectionTitle}>
      <Text style={s.sectionTitleText}>{title}</Text>
    </View>
  )
}

function DataRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.dataRow}>
      <Text style={s.dataLabel}>{label}</Text>
      <Text style={[s.dataValue, color ? { color } : {}]}>{value}</Text>
    </View>
  )
}

function BudgetBar({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <View style={s.barRow}>
      <View style={s.barLabel}>
        <Text style={s.barLabelText}>{label}</Text>
        <Text style={s.barLabelText}>{fmt(value)} EUR ({pct}%)</Text>
      </View>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${Math.max(2, pct)}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

// ─── Conseils générés ───
function genererConseilsModeB(props: SimulationPDFModeBProps): string[] {
  const conseils: string[] = []
  const { apport, apportMinimum10, apportIdeal20, apportSuffisant, mensualiteTotal, revenusMinimums33, dureeAns, typeBien, coutTotalCredit, prixBien, infoLocalisation } = props

  // Apport
  if (!apportSuffisant) {
    conseils.push(`Votre apport (${fmt(apport)} EUR) est inférieur au minimum recommandé de 10% (${fmt(apportMinimum10)} EUR). Les banques apprécient un apport couvrant au moins les frais de notaire.`)
  } else if (apport >= apportIdeal20) {
    conseils.push(`Excellent apport (${fmt(apport)} EUR, soit 20% ou plus). Vous êtes en position de négocier un taux préférentiel.`)
  } else {
    conseils.push(`Bon apport (${fmt(apport)} EUR). Pour un taux encore meilleur, visez 20% soit ${fmt(apportIdeal20)} EUR.`)
  }

  // Mensualité / Revenus
  if (revenusMinimums33 > 6000) {
    conseils.push(`Ce bien nécessite des revenus nets mensuels d'au moins ${fmt(revenusMinimums33)} EUR. Si vous êtes en couple, combinez vos revenus pour atteindre ce seuil.`)
  }

  // Durée
  if (dureeAns >= 25) {
    conseils.push(`Durée longue (${dureeAns} ans) : vous payez plus d'intérêts (${fmt(coutTotalCredit)} EUR au total). Si possible, réduisez à 20 ans.`)
  } else if (dureeAns <= 15) {
    conseils.push(`Durée courte (${dureeAns} ans) : mensualités élevées (${fmt(mensualiteTotal)} EUR) mais économie importante sur les intérêts.`)
  }

  // Type bien
  if (typeBien === 'neuf') {
    conseils.push('Bien neuf : frais de notaire réduits (~2-3%) et garanties constructeur. Vérifiez l\'éligibilité au PTZ.')
  } else {
    conseils.push('Bien ancien : prévoyez un budget travaux éventuel. Les frais de notaire sont plus élevés (~7-8%).')
  }

  // Localisation PTZ
  if (infoLocalisation?.ptzEligible) {
    conseils.push(`PTZ possible (zone ${infoLocalisation.zonePTZ}) : jusqu'à ${fmt(infoLocalisation.ptzMontant)} EUR à taux zéro, ce qui réduirait votre mensualité.`)
  }

  // Surface estimée
  if (infoLocalisation?.surfaceEstimee && infoLocalisation.surfaceEstimee < 20) {
    conseils.push(`Surface estimée très petite (${infoLocalisation.surfaceEstimee} m²). Vérifiez que le prix est cohérent avec le marché local (${fmt(infoLocalisation.prixLocalM2 || 0)} EUR/m²).`)
  }

  // Coût total
  const ratioCredit = prixBien > 0 ? coutTotalCredit / prixBien : 0
  if (ratioCredit > 0.5) {
    conseils.push(`Le coût du crédit (${fmt(coutTotalCredit)} EUR) représente ${Math.round(ratioCredit * 100)}% du prix du bien. Un apport plus important ou un taux plus bas réduirait significativement ce coût.`)
  }

  // DPE & diagnostics (ancien)
  if (typeBien === 'ancien') {
    conseils.push('Vérifiez le DPE (Diagnostic de Performance Énergétique). Une passoire thermique (F ou G) implique des travaux obligatoires et impacte la valeur de revente.')
  }

  // Négociation
  if (typeBien === 'ancien' && infoLocalisation?.prixLocalM2 && infoLocalisation.surfaceEstimee) {
    const prixM2Bien = prixBien / infoLocalisation.surfaceEstimee
    const ecart = Math.round(((prixM2Bien / infoLocalisation.prixLocalM2) - 1) * 100)
    if (ecart > 5) {
      conseils.push(`Ce bien est ${ecart}% au-dessus du prix médian du secteur. Une marge de négociation existe probablement.`)
    } else if (ecart < -5) {
      conseils.push(`Ce bien est ${Math.abs(ecart)}% en dessous du prix médian. Bonne affaire potentielle, mais vérifiez l'état du bien et les charges.`)
    }
  }

  return conseils.slice(0, 6)
}

// ─── Document ───
export function SimulationPDFModeB(props: SimulationPDFModeBProps) {
  const {
    logoUrl,
    prixBien, typeBien, typeLogement, codePostal, nomCommune,
    apport, dureeAns, tauxInteret,
    fraisNotaire, fraisAnnexes, coutTotal, montantAEmprunter,
    mensualiteCredit, mensualiteAssurance, mensualiteTotal,
    revenusMinimums33, revenusMinimums35,
    apportMinimum10, apportIdeal20, apportSuffisant,
    coutTotalCredit, totalProjet,
    simulationsDuree, repartitionCout,
    infoLocalisation,
    quartier,
    syntheseIA,
  } = props

  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const conseils = genererConseilsModeB(props)

  return (
    <Document
      title="AQUIZ - Étude d'achat immobilier"
      author="AQUIZ"
      subject="Puis-je acheter ce bien ?"
    >
      {/* ═══════ PAGE 1 : CE QU'IL FAUT ═══════ */}
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoUrl} style={s.headerLogo} />
          </View>
          <View style={s.headerCenter}>
            <Text style={s.headerTitleText}>ÉTUDE D&apos;ACHAT IMMOBILIER</Text>
            <Text style={s.headerSubText}>Puis-je acheter ce bien ? • {dateStr}</Text>
          </View>
          <View style={s.headerRight}>
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeLabel}>PRIX DU BIEN</Text>
              <Text style={s.heroBadgeValue}>{fmt(prixBien)} EUR</Text>
            </View>
          </View>
        </View>
        <View style={s.headerAccent} />

        <View style={s.content}>
          {/* Hero card — Revenus minimums */}
          <View style={s.heroCard}>
            <View>
              <Text style={s.heroLabel}>REVENUS MENSUELS NETS REQUIS (MIN.)</Text>
              <Text style={s.heroValue}>{fmt(revenusMinimums33)} EUR /mois</Text>
              <Text style={s.heroSub}>
                Pour respecter le taux d&apos;endettement de 33% (norme HCSF)
              </Text>
            </View>
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeLabel}>SEUIL 35%</Text>
              <Text style={s.heroBadgeValue}>{fmt(revenusMinimums35)} EUR</Text>
            </View>
          </View>

          {/* 4 métriques clés */}
          <View style={s.metricsRow}>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>MENSUALITÉ</Text>
              <Text style={s.metricValue}>{fmt(mensualiteTotal)} EUR</Text>
              <Text style={s.metricSub}>Crédit + Assurance</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>DURÉE</Text>
              <Text style={s.metricValue}>{dureeAns} ans</Text>
              <Text style={s.metricSub}>Soit {dureeAns * 12} mois</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>TAUX</Text>
              <Text style={s.metricValue}>{tauxInteret}%</Text>
              <Text style={s.metricSub}>Hors assurance</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>APPORT</Text>
              <Text style={s.metricValue}>{fmt(apport)} EUR</Text>
              <Text style={[s.metricSub, { color: apportSuffisant ? C.greenDark : C.orange }]}>
                {apportSuffisant ? 'OK' : 'Insuffisant'}
              </Text>
            </View>
          </View>

          {/* 2 colonnes : Bien & Financement */}
          <View style={s.twoColumns}>
            <View style={s.halfColumn}>
              <SectionTitle title="LE BIEN" />
              <View style={s.dataCard}>
                <DataRow label="Prix" value={`${fmt(prixBien)} EUR`} />
                <DataRow label="Type" value={typeBien === 'neuf' ? 'Neuf' : 'Ancien'} />
                <DataRow label="Logement" value={typeLogement === 'appartement' ? 'Appartement' : 'Maison'} />
                {(codePostal || nomCommune) && (
                  <DataRow label="Localisation" value={nomCommune || codePostal} />
                )}
              </View>
            </View>
            <View style={s.halfColumn}>
              <SectionTitle title="DÉTAIL DU FINANCEMENT" />
              <View style={s.dataCard}>
                <DataRow label="Frais de notaire" value={`${fmt(fraisNotaire)} EUR`} />
                <DataRow label="Frais annexes" value={`${fmt(fraisAnnexes)} EUR`} />
                <DataRow label="Coût total acquisition" value={`${fmt(coutTotal)} EUR`} />
                <DataRow label="Apport déduit" value={`- ${fmt(apport)} EUR`} />
                <DataRow label="Montant du prêt" value={`${fmt(montantAEmprunter)} EUR`} color={C.greenDark} />
              </View>
            </View>
          </View>

          {/* Mensualité détaillée */}
          <View style={{ marginTop: 14 }}>
            <SectionTitle title="MENSUALITÉ DÉTAILLÉE" />
            <View style={s.dataCard}>
              <DataRow label="Remboursement crédit" value={`${fmt(mensualiteCredit)} EUR /mois`} />
              <DataRow label="Assurance emprunteur" value={`${fmt(mensualiteAssurance)} EUR /mois (${montantAEmprunter > 0 ? ((mensualiteAssurance * 12 / montantAEmprunter) * 100).toFixed(2) : '0.34'}%)`} />
              <DataRow label="Total mensualité" value={`${fmt(mensualiteTotal)} EUR /mois`} color={C.greenDark} />
              <DataRow label="Coût total du crédit" value={`${fmt(coutTotalCredit)} EUR`} color={C.gray} />
            </View>
          </View>

          {/* Répartition du coût total */}
          <View style={{ marginTop: 14 }}>
            <SectionTitle title="RÉPARTITION DU COÛT TOTAL DU PROJET" />
            <View style={{ marginTop: 8 }}>
              {repartitionCout.map((item) => {
                const pct = totalProjet > 0 ? Math.round((item.value / totalProjet) * 100) : 0
                return (
                  <BudgetBar key={item.label} label={item.label} value={item.value} pct={pct} color={item.color} />
                )
              })}
              <View style={s.budgetTotal}>
                <Text style={s.budgetTotalLabel}>COÛT TOTAL DU PROJET</Text>
                <Text style={s.budgetTotalLabel}>{fmt(totalProjet)} EUR</Text>
              </View>
            </View>
          </View>

          {/* Apport recommandé */}
          <View style={{ marginTop: 14 }}>
            <SectionTitle title="APPORT RECOMMANDÉ" />
            <View style={s.apportCard}>
              <View style={s.apportRow}>
                <Text style={s.apportLabel}>Minimum conseillé (10%)</Text>
                <Text style={s.apportValue}>{fmt(apportMinimum10)} EUR</Text>
              </View>
              <View style={s.apportRow}>
                <Text style={s.apportLabel}>Idéal (20%)</Text>
                <Text style={s.apportValue}>{fmt(apportIdeal20)} EUR</Text>
              </View>
              <View style={[s.apportRow, { marginBottom: 0 }]}>
                <Text style={s.apportLabel}>Votre apport</Text>
                <Text style={[s.apportValue, { color: apportSuffisant ? C.greenDark : C.orange }]}>
                  {fmt(apport)} EUR {apportSuffisant ? '(OK)' : '(!)'}
                </Text>
              </View>
            </View>
          </View>

          {/* Verdict de faisabilité */}
          <View style={{ marginTop: 14, borderRadius: 6, borderWidth: 1, borderColor: apportSuffisant ? '#bbf7d0' : '#fed7aa', backgroundColor: apportSuffisant ? '#f0fdf4' : '#fffbeb', paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: apportSuffisant ? C.green : C.orange, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.white }}>
                {apportSuffisant ? 'OK' : '!'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: apportSuffisant ? C.greenDark : C.orange }}>
                {apportSuffisant
                  ? 'Projet réalisable'
                  : 'Projet à consolider'}
              </Text>
              <Text style={{ fontSize: 6.5, color: C.gray, marginTop: 2, lineHeight: 1.4 }}>
                {apportSuffisant
                  ? `Avec un apport de ${fmt(apport)} EUR et une mensualité de ${fmt(mensualiteTotal)} EUR/mois sur ${dureeAns} ans, ce projet est dans les normes bancaires. Un conseiller AQUIZ peut optimiser votre taux et réduire le coût total.`
                  : `Votre apport de ${fmt(apport)} EUR est en dessous du minimum conseillé (${fmt(apportMinimum10)} EUR). Les banques pourraient demander des garanties supplémentaires. Un conseiller AQUIZ peut identifier des solutions adaptées.`}
              </Text>
            </View>
          </View>
        </View>

        <Footer logoUrl={logoUrl} />
      </Page>

      {/* ═══════ PAGE 2+ : ANALYSE COMPLÈTE & ACCOMPAGNEMENT (auto-wrap) ═══════ */}
      <Page size="A4" style={s.pageWrap}>
        <Footer logoUrl={logoUrl} />

        <View style={s.content}>
          {/* Titre de section */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 }} wrap={false}>
            <Text style={s.pageTitle}>ANALYSE COMPLÈTE</Text>
            <Text style={s.pageSub}>Comparaison, quartier, IA & accompagnement</Text>
          </View>

          {/* ═══ 1. Tableau comparatif durées ═══ */}
          <View style={{ marginTop: 8 }}>
            <SectionTitle title="MENSUALITÉ SELON LA DURÉE DU PRÊT" />
            <View style={{ marginTop: 6 }}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderText, { flex: 1 }]}>Durée</Text>
                <Text style={[s.tableHeaderText, { flex: 1.5 }]}>Mensualité</Text>
                <Text style={[s.tableHeaderText, { flex: 1.5 }]}>Revenus requis</Text>
                <Text style={[s.tableHeaderText, { flex: 1.5 }]}>Coût total crédit</Text>
              </View>
              {simulationsDuree.map((sim) => {
                const isSelected = sim.duree === dureeAns
                return (
                  <View key={sim.duree} style={[s.tableRow, isSelected ? s.tableRowHighlight : {}]}>
                    <Text style={[isSelected ? s.tableCellBold : s.tableCell, { flex: 1 }]}>
                      {sim.duree} ans {isSelected ? '*' : ''}
                    </Text>
                    <Text style={[isSelected ? s.tableCellBold : s.tableCell, { flex: 1.5 }]}>
                      {fmt(sim.mensualite)} EUR/mois
                    </Text>
                    <Text style={[isSelected ? s.tableCellBold : s.tableCell, { flex: 1.5 }]}>
                      {fmt(sim.revenusMinimums)} EUR/mois
                    </Text>
                    <Text style={[isSelected ? s.tableCellBold : s.tableCell, { flex: 1.5 }]}>
                      {fmt(sim.coutTotal - montantAEmprunter)} EUR
                    </Text>
                  </View>
                )
              })}
              {/* Note explicative */}
              <View style={{ backgroundColor: C.grayBg, borderRadius: 3, padding: 6, marginTop: 4 }}>
                <Text style={{ fontSize: 6, color: C.gray, lineHeight: 1.4 }}>
                  *Durée sélectionnée. Plus la durée est longue, plus la mensualité est basse — mais le coût total du crédit augmente. Un conseiller AQUIZ peut vous aider à trouver le meilleur équilibre.
                </Text>
              </View>
            </View>
          </View>

          {/* ═══ 2. Localisation & marché local ═══ */}
          {infoLocalisation && (
            <View style={{ marginTop: 14 }} wrap={false}>
              <SectionTitle title={`LOCALISATION & MARCHÉ — ${nomCommune || codePostal}`} />
              <View style={s.localCard}>
                {infoLocalisation.nomCommune && (
                  <View style={s.localRow}>
                    <Text style={s.localLabel}>Commune</Text>
                    <Text style={s.localValue}>{infoLocalisation.nomCommune}</Text>
                  </View>
                )}
                <View style={s.localRow}>
                  <Text style={s.localLabel}>Zone PTZ</Text>
                  <Text style={s.localValue}>
                    {infoLocalisation.zonePTZ} — {infoLocalisation.descriptionZone}
                  </Text>
                </View>
                {infoLocalisation.ptzEligible && (
                  <View style={s.localRow}>
                    <Text style={[s.localLabel, { color: C.greenDark }]}>PTZ estimé</Text>
                    <Text style={[s.localValue, { color: C.greenDark }]}>
                      {fmt(infoLocalisation.ptzMontant)} EUR (prêt à taux zéro)
                    </Text>
                  </View>
                )}
                {infoLocalisation.prixLocalM2 && (
                  <View style={s.localRow}>
                    <Text style={s.localLabel}>Prix moyen /m²</Text>
                    <Text style={s.localValue}>{fmt(infoLocalisation.prixLocalM2)} EUR/m²</Text>
                  </View>
                )}
                {infoLocalisation.surfaceEstimee && (
                  <View style={s.localRow}>
                    <Text style={s.localLabel}>Surface estimée pour {fmt(prixBien)} EUR</Text>
                    <Text style={[s.localValue, { color: C.greenDark }]}>~{infoLocalisation.surfaceEstimee} m²</Text>
                  </View>
                )}
                {infoLocalisation.nbVentes && (
                  <View style={s.localRow}>
                    <Text style={s.localLabel}>Transactions recensées (DVF)</Text>
                    <Text style={s.localValue}>{infoLocalisation.nbVentes} ventes</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ═══ 3. Qualité du quartier ═══ */}
          {quartier && quartier.scoreGlobal > 0 && (
            <View style={{ marginTop: 14 }}>
              <SectionTitle title={`QUALITÉ DU QUARTIER — ${nomCommune || codePostal}`} />

              {/* ── Score global + synthese ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 8 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: quartier.scoreGlobal / 10 >= 7 ? C.greenLight : quartier.scoreGlobal / 10 >= 4 ? C.orangeLight : '#fee2e2', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: quartier.scoreGlobal / 10 >= 7 ? C.green : quartier.scoreGlobal / 10 >= 4 ? C.orange : C.red }}>
                  <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: quartier.scoreGlobal / 10 >= 7 ? C.greenDark : quartier.scoreGlobal / 10 >= 4 ? C.orange : C.red }}>
                    {(quartier.scoreGlobal / 10).toFixed(1)}
                  </Text>
                  <Text style={{ fontSize: 5, color: C.grayLight }}>/10</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.black }}>
                    Score global : {(quartier.scoreGlobal / 10).toFixed(1)}/10
                  </Text>
                  <Text style={{ fontSize: 6.5, color: C.gray, marginTop: 2, lineHeight: 1.3 }}>
                    {quartier.scoreGlobal / 10 >= 7 ? 'Quartier bien desservi avec de bons équipements.' : quartier.scoreGlobal / 10 >= 4 ? 'Quartier correct, quelques points à vérifier.' : 'Quartier peu équipé, vigilance recommandée.'}
                  </Text>
                  {quartier.counts && (
                    <Text style={{ fontSize: 5.5, color: C.grayLight, marginTop: 3 }}>
                      {quartier.counts.transport + quartier.counts.commerce + quartier.counts.education + quartier.counts.sante + quartier.counts.vert + quartier.counts.loisirs} équipements recensés dans un rayon de 800m (source : OpenStreetMap)
                    </Text>
                  )}
                </View>
              </View>

              {/* ── Détail des scores — barres horizontales ── */}
              <View style={{ borderWidth: 0.5, borderColor: C.grayBorder, borderRadius: 4, overflow: 'hidden' }}>
                {[
                  { label: 'Transports', score: quartier.transports / 10, icon: 'Métro, bus, tramway', count: quartier.counts?.transport },
                  { label: 'Commerces', score: quartier.commerces / 10, icon: 'Supermarchés, boulangeries', count: quartier.counts?.commerce },
                  { label: 'Écoles', score: quartier.ecoles / 10, icon: 'Écoles, collèges, lycées', count: quartier.counts?.education },
                  { label: 'Santé', score: quartier.sante / 10, icon: 'Médecins, pharmacies', count: quartier.counts?.sante },
                  { label: 'Espaces verts', score: quartier.espaceVerts / 10, icon: 'Parcs, jardins', count: quartier.counts?.vert },
                  ...(quartier.niveauVie != null ? [{ label: 'Niveau de vie', score: quartier.niveauVie, icon: quartier.revenuMedian ? `${fmt(Math.round(quartier.revenuMedian / 12))} €/mois médian` : 'Source INSEE', count: undefined as number | undefined }] : []),
                  ...(quartier.qualiteAir != null ? [{ label: 'Qualité air', score: quartier.qualiteAir, icon: quartier.qualiteAirLabel || 'Indice ATMO', count: undefined as number | undefined }] : []),
                ].map((item, idx) => (
                  <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: idx % 2 === 0 ? C.white : C.grayBg, borderBottomWidth: 0.3, borderBottomColor: C.grayBorder }}>
                    <View style={{ width: 65 }}>
                      <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black }}>{item.label}</Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ flex: 1, height: 6, backgroundColor: '#e6e6e6', borderRadius: 3 }}>
                        <View style={{ height: 6, borderRadius: 3, width: `${item.score * 10}%`, backgroundColor: item.score >= 7 ? C.green : item.score >= 4 ? C.orange : C.red }} />
                      </View>
                      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', width: 30, textAlign: 'right', color: item.score >= 7 ? C.greenDark : item.score >= 4 ? C.orange : C.red }}>
                        {item.score.toFixed(1)}/10
                      </Text>
                    </View>
                    <View style={{ width: 80, alignItems: 'flex-end' }}>
                      {item.count != null && item.count > 0 ? (
                        <Text style={{ fontSize: 5.5, color: C.gray }}>{item.count} trouvé{item.count > 1 ? 's' : ''}</Text>
                      ) : (
                        <Text style={{ fontSize: 5, color: C.grayLight }}>{item.icon}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* ── Transports proches (Carte réaliste + légende) ── */}
              {quartier.transportsProches && quartier.transportsProches.length > 0 && (() => {
                const filtered = quartier.transportsProches.filter(tp => {
                  const isGenericName = /^(Gare|Station|Arrêt|Transport)$/i.test(tp.nom.trim())
                  return !isGenericName
                })
                if (filtered.length === 0) return null

                return (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.sectionBg, marginBottom: 6 }}>Transports à proximité</Text>

                    {/* Liste compacte des transports */}
                    <View style={{ gap: 3 }}>
                      {filtered.map((tp, idx) => {
                        const lignes = cleanTransportLines(tp.typeTransport, tp.lignes)
                        return (
                          <View key={`${tp.nom}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 4, backgroundColor: idx % 2 === 0 ? '#F8FAFC' : C.white, borderRadius: 3 }}>
                            {/* Logo transport */}
                            {tp.typeTransport === 'metro' && <LogoMetro />}
                            {tp.typeTransport === 'rer' && <LogoRER />}
                            {tp.typeTransport === 'train' && <LogoTrain />}
                            {tp.typeTransport === 'tram' && <TransportBadge label="Tram" color="#000000" />}
                            {tp.typeTransport === 'bus' && <TransportBadge label="Bus" color="#1D9448" />}
                            {tp.typeTransport === 'velo' && <TransportBadge label="Vélib'" color="#7AB648" />}
                            {/* Pastilles lignes */}
                            {lignes.length > 0 && lignes.slice(0, 4).map(l => (
                              <PastilleLigne key={l} ligne={l} type={tp.typeTransport} />
                            ))}
                            {/* Nom */}
                            <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.black, flex: 1 }}>{tp.nom}</Text>
                            {/* Icône marche + temps */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              {/* Lucide Footprints icon */}
                              <Svg viewBox="0 0 24 24" width={8} height={8}>
                                <Path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" fill="none" stroke="#64748B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" fill="none" stroke="#64748B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M16 17h4" fill="none" stroke="#64748B" strokeWidth={1.8} strokeLinecap="round" />
                                <Path d="M4 13h4" fill="none" stroke="#64748B" strokeWidth={1.8} strokeLinecap="round" />
                              </Svg>
                              <Text style={{ fontSize: 5.5, color: '#64748B', fontFamily: 'Helvetica-Bold' }}>{tp.walkMin} min</Text>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  </View>
                )
              })()}

              {/* ── Synthèse texte ── */}
              {quartier.synthese && (
                <View style={{ backgroundColor: C.grayBg, borderRadius: 3, padding: 6, marginTop: 6, borderLeftWidth: 2, borderLeftColor: C.green }}>
                  <Text style={{ fontSize: 6.5, color: C.gray, lineHeight: 1.4 }}>
                    {quartier.synthese}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ═══ 4. Synthèse IA ═══ */}
          {syntheseIA && (
            <View style={s.iaCard} wrap={false}>
              <View style={s.iaBadge}>
                <View style={s.iaBadgeIcon}>
                  <Text style={s.iaBadgeText}>IA</Text>
                </View>
                <Text style={[s.iaBadgeText, { color: C.green, fontWeight: 'bold', marginLeft: 4 }]}>Analyse personnalisée AQUIZ</Text>
              </View>
              <Text style={s.iaText}>{syntheseIA.synthese}</Text>
              {syntheseIA.economieEstimee && syntheseIA.economieEstimee > 0 && (
                <View style={s.iaEconomie}>
                  <Text style={s.iaEconomieValue}>
                    Jusqu&apos;à {fmt(syntheseIA.economieEstimee)} EUR
                  </Text>
                  <Text style={s.iaEconomieLabel}>
                    d&apos;économie potentielle avec un accompagnement optimisé
                  </Text>
                </View>
              )}
              <Text style={s.iaCliffhanger}>{syntheseIA.cliffhanger}</Text>
              {/* Mention source IA AQUIZ */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: '#bbf7d0' }}>
                <View style={{ backgroundColor: C.green, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1.5 }}>
                  <Text style={{ fontSize: 5, fontFamily: 'Helvetica-Bold', color: C.white }}>
                    IA AQUIZ
                  </Text>
                </View>
                <Text style={{ fontSize: 5.5, color: C.grayLight, lineHeight: 1.4 }}>
                  Analyse g{'\u00e9'}n{'\u00e9'}r{'\u00e9'}e par l&apos;IA AQUIZ {'\u00e0'} partir de vos donn{'\u00e9'}es de simulation et des prix du march{'\u00e9'} local.
                </Text>
              </View>
            </View>
          )}

          {/* ═══ 5. Conseils personnalisés ═══ */}
          <View style={{ marginTop: 14 }} wrap={false}>
            <SectionTitle title="CONSEILS PERSONNALISÉS" />
            <View style={s.conseilCard}>
              {conseils.map((conseil, idx) => (
                <Text key={idx} style={s.conseilItem}>
                  {idx + 1}. {conseil}
                </Text>
              ))}
            </View>
          </View>

          {/* ═══ 6. Résumé ═══ */}
          <View style={{ marginTop: 14, backgroundColor: C.grayBg, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12 }} wrap={false}>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 4 }}>
              EN RÉSUMÉ
            </Text>
            <Text style={{ fontSize: 6.5, color: C.gray, lineHeight: 1.5 }}>
              Pour acheter ce {typeLogement} {typeBien} à {fmt(prixBien)} EUR
              {nomCommune ? ` à ${nomCommune}` : ''}, vous devez disposer de revenus nets mensuels
              d&apos;au moins {fmt(revenusMinimums33)} EUR (norme HCSF 33%) avec un apport
              de {fmt(apport)} EUR sur {dureeAns} ans à {tauxInteret}%. Votre mensualité
              sera de {fmt(mensualiteTotal)} EUR (crédit + assurance) pour un coût total
              de projet de {fmt(totalProjet)} EUR.
            </Text>
            <Text style={{ fontSize: 6.5, color: apportSuffisant ? C.greenDark : C.orange, fontFamily: 'Helvetica-Bold', marginTop: 4 }}>
              {apportSuffisant
                ? 'Verdict : Ce projet est réalisable dans les normes bancaires actuelles.'
                : 'Verdict : Ce projet nécessite un ajustement (apport ou durée) pour être accepté par les banques.'}
            </Text>
          </View>

          {/* ═══ 7. CTA final ═══ */}
          <View style={s.ctaCard} wrap={false}>
            <View>
              <Text style={s.ctaTitle}>Prêt à concrétiser cet achat ?</Text>
              <Text style={s.ctaSub}>
                Un conseiller AQUIZ analyse votre dossier, négocie votre taux et vous accompagne jusqu&apos;à la signature.
              </Text>
            </View>
            <Link src="https://calendly.com/contact-aquiz/30min" style={{ textDecoration: 'none' }}>
              <View style={s.ctaBtn}>
                <Text style={s.ctaBtnText}>Prendre rendez-vous</Text>
              </View>
            </Link>
          </View>
        </View>
      </Page>
    </Document>
  )
}
