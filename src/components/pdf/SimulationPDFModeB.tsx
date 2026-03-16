/**
 * AQUIZ — Rapport de simulation Mode B (PDF)
 * "Ce qu'il faut pour acheter ce bien"
 * Généré avec @react-pdf/renderer
 */
import type { DonneesQuartier, SyntheseIA } from '@/lib/pdf/enrichirPourPDF'
import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

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

// ─── Analyse experte AQUIZ (résumé qualitatif Mode B) ───
interface AnalyseExperteResult {
  lectureImmo: string
  lectureFinanciere: string
  vigilance: string[]
  avisExpert: string
}

function genererAnalyseExperte(props: SimulationPDFModeBProps): AnalyseExperteResult {
  const { prixBien, typeBien, typeLogement, nomCommune,
    apport, dureeAns, mensualiteTotal,
    apportSuffisant, apportMinimum10, apportIdeal20, totalProjet,
    infoLocalisation, quartier } = props

  const prixM2 = infoLocalisation?.prixLocalM2
  const surfEst = infoLocalisation?.surfaceEstimee
  const prixM2Bien = surfEst && surfEst > 0 ? Math.round(prixBien / surfEst) : null
  const ecartPrix = prixM2 && prixM2Bien ? Math.round(((prixM2Bien / prixM2) - 1) * 100) : null
  const scoreQ = quartier?.scoreGlobal ? quartier.scoreGlobal / 10 : null

  // ── Lecture immobilière ──
  const immoLines: string[] = []

  // Positionnement prix
  if (prixM2 && prixM2Bien && surfEst) {
    if (ecartPrix !== null && ecartPrix > 10) {
      immoLines.push(`À ${fmt(prixM2Bien)} EUR/m² pour ${surfEst} m² estimés, ce ${typeLogement} se positionne ${ecartPrix}% au-dessus du prix médian du secteur (${fmt(prixM2)} EUR/m²). Ce niveau de prix mérite d'être questionné : état du bien, étage, exposition ou prestations peuvent justifier cet écart — mais une marge de négociation est probable.`)
    } else if (ecartPrix !== null && ecartPrix < -10) {
      immoLines.push(`À ${fmt(prixM2Bien)} EUR/m², ce ${typeLogement} se positionne ${Math.abs(ecartPrix)}% en dessous du prix médian local (${fmt(prixM2)} EUR/m²). Un prix attractif qui peut signaler une opportunité, mais aussi des travaux à prévoir, une copropriété fragile ou un emplacement moins porteur au sein de la commune.`)
    } else if (ecartPrix !== null) {
      immoLines.push(`À ${fmt(prixM2Bien)} EUR/m² pour ~${surfEst} m², ce ${typeLogement} est aligné avec le marché local (${fmt(prixM2)} EUR/m² médian). Le positionnement prix est cohérent — la pertinence de l'achat dépendra surtout de l'état du bien et de la qualité de l'adresse.`)
    }
  } else {
    immoLines.push(`Ce ${typeLogement} ${typeBien} affiché à ${fmt(prixBien)} EUR${nomCommune ? ` à ${nomCommune}` : ''} nécessite une vérification du prix au m² par rapport au marché local pour valider sa cohérence.`)
  }

  // Quartier
  if (scoreQ !== null) {
    if (scoreQ >= 7) {
      immoLines.push(`Le quartier obtient un score de ${scoreQ.toFixed(1)}/10, ce qui traduit un environnement bien équipé en transports, commerces et services. C'est un critère favorable pour la qualité de vie et la revente.`)
    } else if (scoreQ >= 4) {
      immoLines.push(`Le quartier affiche un score de ${scoreQ.toFixed(1)}/10. L'environnement est correct mais présente des lacunes sur certains critères${quartier && quartier.sante / 10 < 4 ? ' (santé)' : ''}${quartier && quartier.espaceVerts / 10 < 4 ? ' (espaces verts)' : ''}. À mettre en perspective avec vos priorités quotidiennes.`)
    } else {
      immoLines.push(`Le quartier obtient un score de ${scoreQ.toFixed(1)}/10, ce qui signale un environnement peu équipé. La desserte, les commerces et les services de proximité sont limités — un point à intégrer dans votre réflexion.`)
    }
  }

  // Type bien
  if (typeBien === 'ancien') {
    immoLines.push(`Bien ancien : les frais de notaire sont plus élevés (~7-8%) et un budget travaux éventuel est à anticiper. En contrepartie, l'ancien offre souvent de meilleures surfaces et localisations à budget équivalent.`)
  } else {
    immoLines.push(`Bien neuf : frais de notaire réduits (~2-3%), garanties constructeur et normes énergétiques actuelles. Vérifiez l'éligibilité au PTZ qui pourrait réduire significativement le coût du financement.`)
  }

  // ── Lecture financière ──
  const finaLines: string[] = []
  if (apportSuffisant) {
    finaLines.push(`Le projet est compatible avec les critères bancaires actuels (norme HCSF 35%). La mensualité de ${fmt(mensualiteTotal)} EUR sur ${dureeAns} ans reste dans les ratios acceptés.`)
  } else {
    finaLines.push(`En l'état, le projet dépasse le seuil d'endettement réglementaire (norme HCSF 35%). La mensualité de ${fmt(mensualiteTotal)} EUR sur ${dureeAns} ans nécessite un ajustement : apport supplémentaire, allongement de durée ou révision du budget.`)
  }

  const ratioApport = prixBien > 0 ? Math.round((apport / prixBien) * 100) : 0
  if (ratioApport >= 20) {
    finaLines.push(`L'apport de ${fmt(apport)} EUR (~${ratioApport}% du prix) est solide. C'est un levier de négociation pour obtenir de meilleures conditions bancaires.`)
  } else if (ratioApport >= 10) {
    finaLines.push(`L'apport de ${fmt(apport)} EUR (~${ratioApport}%) couvre les frais annexes. Pour améliorer les conditions de taux, viser 20% (${fmt(apportIdeal20)} EUR) serait un atout.`)
  } else {
    finaLines.push(`L'apport de ${fmt(apport)} EUR (~${ratioApport}%) est en dessous du minimum recommandé (10%, soit ${fmt(apportMinimum10)} EUR). Les banques seront plus exigeantes sur le reste du dossier.`)
  }

  // ── Points de vigilance ──
  const vigil: string[] = []
  if (ecartPrix !== null && ecartPrix > 10) vigil.push('Prix au-dessus du marché — vérifier les justifications (état, prestations, étage)')
  if (ecartPrix !== null && ecartPrix < -10) vigil.push('Prix bas par rapport au marché — contrôler l\'état du bien, les charges et la copropriété')
  if (typeBien === 'ancien') vigil.push('Demander les diagnostics obligatoires (DPE, amiante, plomb) et le carnet d\'entretien')
  if (quartier?.qualiteAir !== null && quartier?.qualiteAir !== undefined && quartier.qualiteAir < 5) vigil.push('Qualité de l\'air dégradée sur le secteur — un critère de plus en plus regardé à la revente')
  if (quartier?.niveauVie !== null && quartier?.niveauVie !== undefined && quartier.niveauVie < 4) vigil.push('Niveau de vie du quartier modeste — peut impacter la valorisation à long terme')
  if (quartier?.risques !== null && quartier?.risques !== undefined && quartier.risques < 5) vigil.push('Risques naturels ou industriels identifiés sur la zone — consulter le rapport Géorisques')
  if (!apportSuffisant) vigil.push('Endettement au-dessus de 35% — priorité : augmenter l\'apport ou revoir le budget')
  if (dureeAns >= 25) vigil.push(`Durée longue (${dureeAns} ans) — le coût total des intérêts sera significatif`)
  if (infoLocalisation?.ptzEligible) vigil.push('Zone éligible au PTZ — à intégrer dans le plan de financement')

  // ── Avis d'expert ──
  let avis = ''
  if (apportSuffisant && scoreQ !== null && scoreQ >= 6 && (ecartPrix === null || Math.abs(ecartPrix) <= 10)) {
    avis = `Le projet paraît cohérent : le prix est en ligne avec le marché, le quartier est correctement équipé et le financement est soutenable. Le principal sujet ici n'est pas le financement mais la qualité intrinsèque du bien — état réel, charges de copropriété, performance énergétique. Un accompagnement sur la visite et la négociation permettrait de sécuriser l'opération.`
  } else if (apportSuffisant && ecartPrix !== null && ecartPrix > 10) {
    avis = `Le financement est soutenable, mais le prix affiché mérite d'être challengé. À ce niveau, un arbitrage sur la négociation ou la recherche de biens mieux positionnés dans le même secteur pourrait améliorer significativement la qualité du projet.`
  } else if (!apportSuffisant) {
    avis = `Le projet est ambitieux par rapport au profil financier actuel. Avant de poursuivre, il serait pertinent d'explorer les options : renforcer l'apport, ajuster le budget cible ou étudier les dispositifs d'aide au financement disponibles sur cette zone.`
  } else {
    avis = `Le projet est réaliste dans ses grandes lignes. La pertinence de l'achat dépendra surtout de la visite, de l'état réel du bien et de la dynamique du marché local. Ne pas hésiter à comparer avec d'autres biens similaires pour affiner le positionnement.`
  }

  return {
    lectureImmo: immoLines.join(' '),
    lectureFinanciere: finaLines.join(' '),
    vigilance: vigil.slice(0, 5),
    avisExpert: avis,
  }
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
            <Link src="https://calendly.com/contact-aquiz/30min" style={{ textDecoration: 'none' }}>
              <View style={[s.ctaBtn, { paddingHorizontal: 10, paddingVertical: 6 }]}>
                <Text style={[s.ctaBtnText, { fontSize: 7 }]}>Prendre rendez-vous</Text>
              </View>
            </Link>
          </View>
        </View>
        <View style={s.headerAccent} />

        <View style={s.content}>
          {/* Hero card — Revenus minimums */}
          <View style={s.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroLabel}>REVENUS MENSUELS NETS REQUIS (MIN.)</Text>
              <Text style={s.heroValue}>{fmt(revenusMinimums35)} EUR /mois</Text>
              <Text style={s.heroSub}>
                Pour respecter le taux d&apos;endettement de 35% (norme HCSF)
              </Text>
            </View>
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeLabel}>PRIX DU BIEN</Text>
              <Text style={s.heroBadgeValue}>{fmt(prixBien)} EUR</Text>
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
                <DataRow label="Frais de notaire" value={`~ ${fmt(fraisNotaire)} EUR`} />
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.sectionBg, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, marginTop: 8 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white }}>COÛT TOTAL DU PROJET</Text>
                <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.green }}>{fmt(totalProjet)} EUR</Text>
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

        </View>

        <Footer logoUrl={logoUrl} />
      </Page>

      {/* ═══════ PAGE 2+ : ANALYSE COMPLÈTE & ACCOMPAGNEMENT (auto-wrap) ═══════ */}
      <Page size="A4" style={s.pageWrap}>
        <Footer logoUrl={logoUrl} />

        <View style={s.content}>

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
              </View>
            </View>
          )}

          {/* ═══ 3. Chiffres clés du quartier ═══ */}
          {quartier && (
            <View style={{ marginTop: 14 }}>
              <SectionTitle title={`CHIFFRES CLÉS DU QUARTIER — ${nomCommune || codePostal}`} />

              {/* ── Grille catégories — cards info ── */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                {[
                  { label: 'Transports', count: quartier.counts?.transport, color: C.blue, desc: 'Métro, RER, tram, train' },
                  { label: 'Commerces', count: quartier.counts?.commerce, color: C.orange, desc: 'Supermarchés, boulangeries' },
                  { label: 'Écoles', count: quartier.counts?.education, color: C.green, desc: 'Écoles, crèches, lycées' },
                  { label: 'Santé', count: quartier.counts?.sante, color: C.red, desc: 'Médecins, pharmacies' },
                  { label: 'Espaces verts', count: quartier.counts?.vert, color: C.green, desc: 'Parcs, jardins' },
                  { label: 'Loisirs', count: quartier.counts?.loisirs, color: C.greenDark, desc: 'Sports, culture' },
                ].map((cat, idx) => {
                  const isTransportCat = cat.label === 'Transports'
                  return (
                  <View key={idx} style={{
                    width: '48.5%' as unknown as number,
                    borderWidth: 1,
                    borderColor: C.grayBorder,
                    borderRadius: 5,
                    overflow: 'hidden',
                    backgroundColor: C.white,
                  }}>
                    {/* Color bar top */}
                    <View style={{ height: 3, backgroundColor: cat.color }} />
                    <View style={{ padding: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black }}>{cat.label}</Text>
                        <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: cat.color }}>
                          {cat.count != null ? cat.count : '—'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 5.5, color: C.gray }}>
                        {cat.count != null && cat.count > 0 ? `${cat.count} trouvé${cat.count > 1 ? 's' : ''} · ${cat.desc}` : cat.desc}
                      </Text>
                      {/* Transport lines inline */}
                      {isTransportCat && (() => {
                        const transportLinesMap: Record<string, string[]> = {}
                        if (quartier.transportsProches) {
                          for (const tp of quartier.transportsProches) {
                            if (!tp.lignes || tp.lignes.length === 0) continue
                            if (tp.typeTransport === 'bus' || tp.typeTransport === 'velo') continue
                            const cleaned = cleanTransportLines(tp.typeTransport, tp.lignes)
                            if (cleaned.length > 0) {
                              if (!transportLinesMap[tp.typeTransport]) transportLinesMap[tp.typeTransport] = []
                              for (const l of cleaned) {
                                if (!transportLinesMap[tp.typeTransport].includes(l)) transportLinesMap[tp.typeTransport].push(l)
                              }
                            }
                          }
                        }
                        if (Object.keys(transportLinesMap).length === 0) return null
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                            {transportLinesMap['metro'] && transportLinesMap['metro'].length > 0 && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
                                <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#003CA6', alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#FFF', marginTop: -0.5 }}>M</Text>
                                </View>
                                {transportLinesMap['metro'].map(l => {
                                  const bg = METRO_LINE_COLORS[l] || '#888'
                                  const tc = DARK_TEXT_LINES.has(l) ? '#000' : '#FFF'
                                  return <View key={`m-${l}`} style={{ width: l.length > 2 ? 14 : 11, height: 11, borderRadius: 5.5, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: l.length > 2 ? 4 : 5.5, fontFamily: 'Helvetica-Bold', color: tc }}>{l}</Text></View>
                                })}
                              </View>
                            )}
                            {transportLinesMap['rer'] && transportLinesMap['rer'].length > 0 && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
                                <View style={{ width: 16, height: 11, borderRadius: 2, backgroundColor: '#003CA6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFF' }}>
                                  <Text style={{ fontSize: 5, fontFamily: 'Helvetica-Bold', color: '#FFF', letterSpacing: 0.3 }}>RER</Text>
                                </View>
                                {transportLinesMap['rer'].map(l => {
                                  const bg = RER_LINE_COLORS[l] || '#888'
                                  return <View key={`r-${l}`} style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: '#FFF' }}>{l}</Text></View>
                                })}
                              </View>
                            )}
                            {transportLinesMap['train'] && transportLinesMap['train'].length > 0 && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
                                <View style={{ width: 16, height: 11, borderRadius: 2, backgroundColor: '#1D4A8C', alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ fontSize: 4.5, fontFamily: 'Helvetica-Bold', color: '#FFF' }}>Train</Text>
                                </View>
                                {transportLinesMap['train'].map(l => {
                                  const bg = TRANSILIEN_COLORS[l] || '#888'
                                  const tc = DARK_TEXT_LINES.has(l) ? '#000' : '#FFF'
                                  return <View key={`t-${l}`} style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: tc }}>{l}</Text></View>
                                })}
                              </View>
                            )}
                            {transportLinesMap['tram'] && transportLinesMap['tram'].length > 0 && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
                                <View style={{ paddingHorizontal: 3, height: 11, borderRadius: 2, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ fontSize: 4.5, fontFamily: 'Helvetica-Bold', color: '#FFF' }}>Tram</Text>
                                </View>
                                {transportLinesMap['tram'].map(l => <View key={`tr-${l}`} style={{ paddingHorizontal: 2, height: 11, borderRadius: 5.5, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 5, fontFamily: 'Helvetica-Bold', color: '#FFF' }}>{l}</Text></View>)}
                              </View>
                            )}
                          </View>
                        )
                      })()}
                    </View>
                  </View>
                  )
                })}
              </View>

              {/* ── Enrichissements optionnels (niveau de vie, qualité air) ── */}
              {(quartier.niveauVie != null || quartier.qualiteAir != null || quartier.revenuMedian != null) && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                  {quartier.revenuMedian != null && (
                    <View style={{
                      width: '48.5%' as unknown as number,
                      borderWidth: 1, borderColor: C.grayBorder, borderRadius: 5, overflow: 'hidden', backgroundColor: C.white,
                    }}>
                      <View style={{ height: 3, backgroundColor: C.orange }} />
                      <View style={{ padding: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black }}>Revenu médian</Text>
                          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.orange }}>
                            {fmt(Math.round(quartier.revenuMedian / 12))} EUR
                          </Text>
                        </View>
                        <Text style={{ fontSize: 5.5, color: C.gray }}>Par mois · Source INSEE</Text>
                      </View>
                    </View>
                  )}
                  {quartier.qualiteAir != null && (
                    <View style={{
                      width: '48.5%' as unknown as number,
                      borderWidth: 1, borderColor: C.grayBorder, borderRadius: 5, overflow: 'hidden', backgroundColor: C.white,
                    }}>
                      <View style={{ height: 3, backgroundColor: quartier.qualiteAir >= 7 ? C.green : quartier.qualiteAir >= 4 ? C.orange : C.red }} />
                      <View style={{ padding: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black }}>Qualité de l'air</Text>
                          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: quartier.qualiteAir >= 7 ? C.greenDark : quartier.qualiteAir >= 4 ? C.orange : C.red }}>
                            {quartier.qualiteAirLabel || (quartier.qualiteAir >= 7 ? 'Bon' : quartier.qualiteAir >= 4 ? 'Moyen' : 'Mauvais')}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 5.5, color: C.gray }}>Indice ATMO</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

            </View>
          )}

          {/* ═══ 5. Accompagnement AQUIZ ═══ */}
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
              Pour aller plus loin sur ce bien, un expert AQUIZ peut :
            </Text>

            {[
              `Vérifier la cohérence du prix affiché avec le marché${nomCommune ? ` à ${nomCommune}` : ''} et identifier la marge de négociation`,
              'Analyser les diagnostics obligatoires (DPE, amiante, plomb) et les éventuels travaux à prévoir',
              `Structurer le meilleur plan de financement pour ce ${typeLogement} (taux, durée, assurance, garanties)`,
              infoLocalisation?.ptzEligible ? 'Activer les dispositifs d\'aide disponibles sur cette zone (PTZ, Action Logement, PAS)' : 'Rechercher les dispositifs d\'aide applicables à votre situation (PTZ, PAS, Action Logement)',
              'Accompagner la visite, le compromis et chaque étape jusqu\'à la remise des clés',
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
              Sécurisez votre achat : un expert AQUIZ vous aide à transformer cette étude en projet concret.
            </Text>

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
        </View>
      </Page>
    </Document>
  )
}
