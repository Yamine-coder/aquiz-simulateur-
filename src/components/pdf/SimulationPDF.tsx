/**
 * AQUIZ — Rapport de simulation PDF
 * Généré avec @react-pdf/renderer
 * Design professionnel avec charte AQUIZ
 */
import type { ScoreDetail } from '@/lib/calculs/scoreFaisabilite'
import type { ResultatConseilsAvances } from '@/lib/conseils/genererConseilsAvances'
import type { DonneesMarcheLocal, DonneesQuartier } from '@/lib/pdf/enrichirPourPDF'
import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

// ─── Types ───
interface PieData {
  apport: number
  pret: number
  frais: number
  total: number
  pourcentageApport: number
  pourcentagePret: number
  pourcentageFrais: number
}

export interface SimulationPDFProps {
  // Logo URL (full URL for PDF rendering)
  logoUrl: string
  // Profil
  age: number
  statutProfessionnel: string
  situationFoyer: string
  nombreEnfants: number
  // Calculs
  revenusMensuelsTotal: number
  chargesMensuellesTotal: number
  capitalEmpruntable: number
  prixAchatMax: number
  fraisNotaire: number
  tauxEndettementProjet: number
  resteAVivre: number
  mensualiteAssurance: number
  // Paramètres
  mensualiteMax: number
  dureeAns: number
  tauxInteret: number
  apport: number
  // Score
  scoreFaisabilite: number
  scoreDetails: ScoreDetail[]
  // Budget
  pieData: PieData
  // Conseils
  conseils: ResultatConseilsAvances
  // Enrichissements premium (optionnels)
  marche?: DonneesMarcheLocal | null
  quartier?: DonneesQuartier | null
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
  blue: '#3b82f6',
  sectionBg: '#2d3748',
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
  // ── Header : bande unique équilibrée ──
  header: {
    backgroundColor: C.black,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  // Gauche — Logo (poids visuel fort)
  headerLeft: {
    width: 140,
  },
  headerLogo: {
    width: 130,
    height: 46,
    objectFit: 'contain' as const,
  },
  // Centre — Titre (flex, centré visuellement)
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
  headerSubText: {
    fontSize: 7,
    color: '#777',
    marginTop: 3,
  },
  // Droite — Score badge (même largeur que logo pour symétrie)
  headerRight: {
    width: 140,
    alignItems: 'flex-end',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scoreValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1,
  },
  scoreInfo: {
    alignItems: 'flex-start',
  },
  scoreMax: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#666',
  },
  scoreCaption: {
    fontSize: 5,
    color: '#666',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  headerAccent: {
    height: 3,
    backgroundColor: C.green,
  },
  // Content
  content: {
    paddingHorizontal: 28,
  },
  // Grande carte capacité (style Mode B : accent vert gauche)
  capaciteCard: {
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
  capaciteLabel: {
    fontSize: 8,
    color: C.greenDark,
    letterSpacing: 0.5,
  },
  capaciteValue: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    marginTop: 4,
  },
  probaBadge: {
    backgroundColor: C.sectionBg,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  probaLabel: {
    fontSize: 5,
    color: '#b4b4b4',
  },
  probaValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    marginTop: 2,
  },
  // Métriques 3 colonnes
  metricsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.grayBorder,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 6,
    color: C.gray,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    marginTop: 4,
  },
  metricSub: {
    fontSize: 5,
    color: C.grayLight,
    marginTop: 2,
  },
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
  // Data row (label / value)
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.3,
    borderBottomColor: '#eee',
  },
  dataLabel: {
    fontSize: 7.5,
    color: C.gray,
  },
  dataValue: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
  },
  // 2 colonnes  
  twoColumns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  halfColumn: {
    flex: 1,
  },
  dataCard: {
    backgroundColor: C.grayBg,
    borderRadius: 3,
    paddingVertical: 4,
    marginTop: 2,
  },
  // Budget bar
  barContainer: {
    marginTop: 4,
  },
  barRow: {
    marginBottom: 6,
  },
  barLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  barLabelText: {
    fontSize: 7,
    color: C.gray,
  },
  barBg: {
    height: 5,
    backgroundColor: '#e6e6e6',
    borderRadius: 2,
  },
  barFill: {
    height: 5,
    borderRadius: 2,
  },
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
  // Page 2: Diagnostic
  diagnosticCard: {
    backgroundColor: C.sectionBg,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 8,
  },
  diagScoreContainer: {
    alignItems: 'center',
  },
  diagScore: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  diagScoreMax: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#b4b4b4',
  },
  diagScoreLabel: {
    fontSize: 6,
    color: '#888',
    marginTop: 2,
  },
  diagInfo: {
    flex: 1,
  },
  diagProba: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.green,
  },
  diagDelai: {
    fontSize: 7,
    color: '#b4b4b4',
    marginTop: 3,
  },
  diagBanques: {
    fontSize: 7,
    color: '#b4b4b4',
    marginTop: 2,
  },
  // Points forts / vigilance
  pointsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  pointsCol: {
    flex: 1,
  },
  pointsHeader: {
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 3,
  },
  pointsHeaderText: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
  },
  pointsList: {
    backgroundColor: C.grayBg,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  pointItem: {
    fontSize: 6.5,
    color: C.black,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  // Recommandations
  recoTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    marginTop: 14,
    marginBottom: 8,
  },
  recoCard: {
    backgroundColor: C.grayBg,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  recoBadge: {
    backgroundColor: C.sectionBg,
    borderRadius: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoBadgeText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  recoContent: {
    flex: 1,
  },
  recoCardTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    marginBottom: 3,
  },
  recoCardText: {
    fontSize: 6.5,
    color: C.gray,
    lineHeight: 1.5,
  },
  recoImpact: {
    backgroundColor: C.greenLight,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  recoImpactText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: C.greenDark,
  },
  recoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  recoActionLabel: {
    backgroundColor: C.grayBg,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 5,
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
  },
  recoActionMeta: {
    fontSize: 5.5,
    color: C.grayLight,
  },
  recoActionGain: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: C.greenDark,
  },
  // Scénarios
  scenarioCard: {
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scenarioLeft: {
    flex: 1,
    paddingRight: 10,
  },
  scenarioTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    marginBottom: 3,
  },
  scenarioBadge: {
    backgroundColor: C.green,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  scenarioBadgeText: {
    fontSize: 5,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  scenarioDesc: {
    fontSize: 6.5,
    color: C.gray,
    lineHeight: 1.5,
  },
  scenarioRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  scenarioImpact: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  scenarioImpactLabel: {
    fontSize: 5.5,
    color: C.grayLight,
    marginTop: 1,
  },
  scenarioDetailsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  scenarioDetailsCol: {
    flex: 1,
  },
  scenarioDetailsTitle: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: C.grayLight,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  scenarioDetailItem: {
    fontSize: 6,
    color: C.gray,
    lineHeight: 1.5,
  },
  scenarioKPIs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    backgroundColor: C.white,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  scenarioKPI: {
    flex: 1,
    alignItems: 'center',
  },
  scenarioKPIValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
  },
  scenarioKPILabel: {
    fontSize: 5,
    color: C.grayLight,
    marginTop: 1,
  },
  // Marché local
  marcheGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  marcheMetric: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.grayBorder,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  marcheMetricValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
  },
  marcheMetricLabel: {
    fontSize: 5.5,
    color: C.grayLight,
    marginTop: 2,
    textAlign: 'center',
  },
  quartierRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  quartierItem: {
    flex: 1,
    backgroundColor: C.grayBg,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  quartierScore: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
  },
  quartierLabel: {
    fontSize: 5,
    color: C.grayLight,
    marginTop: 1,
  },
  quartierMax: {
    fontSize: 4.5,
    color: C.grayLight,
    marginTop: 0.5,
  },
  quartierDesc: {
    fontSize: 4,
    color: C.grayLight,
    textAlign: 'center' as const,
    marginTop: 1.5,
    lineHeight: 1.3,
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
  ctaTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  ctaSub: {
    fontSize: 7,
    color: '#b4b4b4',
    marginTop: 2,
    maxWidth: 260,
  },
  ctaBtn: {
    backgroundColor: C.green,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ctaBtnText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
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
  footerLogo: {
    width: 40,
    height: 14,
    objectFit: 'contain' as const,
    opacity: 0.5,
  },
  footerDisclaimer: {
    fontSize: 5,
    color: C.grayLight,
  },
  footerPage: {
    fontSize: 5.5,
    color: C.grayLight,
  },
  // Page 2 header
  pageTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
  },
  pageSub: {
    fontSize: 7,
    color: C.gray,
    marginLeft: 8,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 28,
    paddingTop: 18,
  },
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

function getScoreColor(score: number): string {
  if (score >= 80) return C.green
  if (score >= 60) return C.orange
  return C.red
}

function getTauxColor(taux: number): string {
  if (taux <= 33) return C.greenDark
  if (taux <= 35) return C.orange
  return C.red
}

function getRavColor(rav: number, min: number): string {
  return rav >= min ? C.greenDark : C.orange
}

// ─── Components ───

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

// ─── Document ───
export function SimulationPDF(props: SimulationPDFProps) {
  const {
    logoUrl,
    age, statutProfessionnel, situationFoyer,
    revenusMensuelsTotal, chargesMensuellesTotal,
    capitalEmpruntable, prixAchatMax, fraisNotaire,
    tauxEndettementProjet, resteAVivre, mensualiteAssurance,
    mensualiteMax, dureeAns, tauxInteret, apport,
    scoreFaisabilite, scoreDetails, pieData, conseils,
    marche, quartier,
  } = props

  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const diag = conseils.diagnostic

  return (
    <Document
      title="AQUIZ - Rapport de simulation"
      author="AQUIZ"
      subject="Étude de capacité d'achat immobilier"
    >
      {/* ═══════ PAGE 1 : RÉSUMÉ CAPACITÉ ═══════ */}
      <Page size="A4" style={s.page}>
        {/* Header — bande unique */}
        <View style={s.header}>
          {/* Logo */}
          <View style={s.headerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoUrl} style={s.headerLogo} />
          </View>
          {/* Titre centré */}
          <View style={s.headerCenter}>
            <Text style={s.headerTitleText}>RAPPORT DE SIMULATION</Text>
            <Text style={s.headerSubText}>Étude de capacité d&apos;achat immobilier • {dateStr}</Text>
          </View>
          {/* Score badge */}
          <View style={s.headerRight}>
            <View style={s.scoreBadge}>
              <Text style={[s.scoreValue, { color: getScoreColor(scoreFaisabilite) }]}>{scoreFaisabilite}</Text>
              <View style={s.scoreInfo}>
                <Text style={s.scoreMax}>/100</Text>
                <Text style={s.scoreCaption}>FAISABILITÉ</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={s.headerAccent} />

        <View style={s.content}>
          {/* Grande carte capacité */}
          <View style={s.capaciteCard}>
            <View>
              <Text style={s.capaciteLabel}>VOTRE CAPACITÉ D&apos;ACHAT MAXIMALE</Text>
              <Text style={s.capaciteValue}>{fmt(prixAchatMax)} EUR</Text>
            </View>
            <View style={s.probaBadge}>
              <Text style={s.probaLabel}>PROBABILITÉ</Text>
              <Text style={s.probaValue}>{diag.probabiliteAcceptation.toUpperCase()}</Text>
            </View>
          </View>

          {/* 3 métriques */}
          <View style={s.metricsRow}>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>MENSUALITÉ</Text>
              <Text style={s.metricValue}>{fmt(mensualiteMax + mensualiteAssurance)} EUR</Text>
              <Text style={s.metricSub}>Crédit + Assurance</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>DURÉE</Text>
              <Text style={s.metricValue}>{dureeAns} ans</Text>
              <Text style={s.metricSub}>Soit {dureeAns * 12} mensualités</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>TAUX</Text>
              <Text style={s.metricValue}>{tauxInteret}%</Text>
              <Text style={s.metricSub}>Hors assurance</Text>
            </View>
          </View>

          {/* 2 colonnes : Profil & Financement */}
          <View style={s.twoColumns}>
            <View style={s.halfColumn}>
              <SectionTitle title="PROFIL EMPRUNTEUR" />
              <View style={s.dataCard}>
                <DataRow label="Âge" value={`${age} ans`} />
                <DataRow label="Statut" value={(statutProfessionnel || 'CDI').toUpperCase()} />
                <DataRow label="Situation" value={situationFoyer === 'couple' ? 'En couple' : 'Célibataire'} />
                <DataRow label="Revenus nets" value={`${fmt(revenusMensuelsTotal)} EUR/mois`} />
                <DataRow label="Charges" value={`${fmt(chargesMensuellesTotal)} EUR/mois`} />
              </View>
            </View>
            <View style={s.halfColumn}>
              <SectionTitle title="FINANCEMENT" />
              <View style={s.dataCard}>
                <DataRow label="Capital empruntable" value={`${fmt(capitalEmpruntable)} EUR`} />
                <DataRow label="Apport personnel" value={`${fmt(apport)} EUR`} />
                <DataRow label="Frais de notaire" value={`${fmt(fraisNotaire)} EUR`} />
                <DataRow
                  label="Taux d'endettement"
                  value={`${Math.round(tauxEndettementProjet)}%`}
                  color={getTauxColor(tauxEndettementProjet)}
                />
                <DataRow
                  label="Reste à vivre"
                  value={`${fmt(resteAVivre)} EUR`}
                  color={getRavColor(resteAVivre, 800)}
                />
              </View>
            </View>
          </View>

          {/* Répartition budget */}
          <View style={{ marginTop: 14 }}>
            <SectionTitle title="ANALYSE DÉTAILLÉE DU SCORE" />
            <View style={{ marginTop: 6 }}>
              {scoreDetails.map((d) => {
                const pct = d.max > 0 ? (d.score / d.max) * 100 : 0
                const barColor = pct >= 75 ? C.green : pct >= 50 ? '#f59e0b' : pct >= 25 ? C.orange : C.red
                return (
                  <View key={d.critere} style={{ marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black }}>{d.critere}</Text>
                      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray }}>{d.score}/{d.max}</Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: '#f1f5f9', borderRadius: 2 }}>
                      <View style={{ height: 4, backgroundColor: barColor, borderRadius: 2, width: `${pct}%` }} />
                    </View>
                    <Text style={{ fontSize: 5.5, color: C.grayLight, marginTop: 1 }}>{d.commentaire}</Text>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Répartition budget */}
          <View style={{ marginTop: 14 }}>
            <SectionTitle title="RÉPARTITION DU BUDGET" />
            <View style={[s.barContainer, { marginTop: 8 }]}>
              <BudgetBar label="Apport personnel" value={pieData.apport} pct={pieData.pourcentageApport} color={C.blue} />
              <BudgetBar label="Prêt bancaire" value={pieData.pret} pct={pieData.pourcentagePret} color={C.black} />
              <BudgetBar label="Frais de notaire" value={pieData.frais} pct={pieData.pourcentageFrais} color={C.grayLight} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.sectionBg, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, marginTop: 8 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white }}>BUDGET TOTAL</Text>
                <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.green }}>{fmt(pieData.total)} EUR</Text>
              </View>
            </View>
          </View>
        </View>

        <Footer logoUrl={logoUrl} />
      </Page>

      {/* ═══════ PAGE 2+ : DIAGNOSTIC & CONSEILS (auto-wrap) ═══════ */}
      <Page size="A4" style={s.pageWrap}>
        <Footer logoUrl={logoUrl} />

        <View style={s.content}>
          {/* Titre de section */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 }} wrap={false}>
            <Text style={s.pageTitle}>DIAGNOSTIC BANCAIRE</Text>
            <Text style={s.pageSub}>Analyse de votre dossier</Text>
          </View>

          {/* Carte score */}
          <View style={s.diagnosticCard} wrap={false}>
            <View style={s.diagScoreContainer}>
              <Text style={s.diagScore}>{diag.scoreGlobal}</Text>
              <Text style={s.diagScoreMax}>/100</Text>
              <Text style={s.diagScoreLabel}>Score global</Text>
            </View>
            <View style={s.diagInfo}>
              <Text style={s.diagProba}>
                Probabilité : {diag.probabiliteAcceptation}
              </Text>
              <Text style={s.diagDelai}>
                Délai estimé : {diag.delaiEstime}
              </Text>
              {diag.banquesRecommandees.length > 0 && (
                <Text style={s.diagBanques}>
                  Banques ciblées : {diag.banquesRecommandees.join(', ')}
                </Text>
              )}
            </View>
          </View>

          {/* Points forts / Points d'attention */}
          <View style={s.pointsRow} wrap={false}>
            <View style={s.pointsCol}>
              <View style={[s.pointsHeader, { backgroundColor: C.greenLight }]}>
                <Text style={[s.pointsHeaderText, { color: C.greenDark }]}>POINTS FORTS</Text>
              </View>
              <View style={s.pointsList}>
                {diag.pointsForts.map((pf, i) => (
                  <Text key={i} style={s.pointItem}>• {pf}</Text>
                ))}
              </View>
            </View>
            <View style={s.pointsCol}>
              <View style={[s.pointsHeader, { backgroundColor: C.orangeLight }]}>
                <Text style={[s.pointsHeaderText, { color: C.orange }]}>POINTS D&apos;ATTENTION</Text>
              </View>
              <View style={s.pointsList}>
                {diag.pointsVigilance.map((pv, i) => (
                  <Text key={i} style={s.pointItem}>• {pv}</Text>
                ))}
              </View>
            </View>
          </View>

          {/* ═══ ÉTUDE DE MARCHÉ LOCALE (premium) ═══ */}
          {marche && (
            <View style={{ marginTop: 14 }} wrap={false}>
              <SectionTitle title={`ÉTUDE DE MARCHÉ — ${marche.codePostal}`} />
              <View style={s.marcheGrid}>
                <View style={s.marcheMetric}>
                  <Text style={s.marcheMetricValue}>{fmt(marche.prixM2Median)} €/m²</Text>
                  <Text style={s.marcheMetricLabel}>Prix médian au m²</Text>
                </View>
                <View style={s.marcheMetric}>
                  <Text style={s.marcheMetricValue}>{marche.surfaceEstimee} m²</Text>
                  <Text style={s.marcheMetricLabel}>Surface accessible</Text>
                </View>
                <View style={s.marcheMetric}>
                  <Text style={[s.marcheMetricValue, {
                    color: marche.evolution12Mois !== null
                      ? marche.evolution12Mois > 0 ? C.red : C.greenDark
                      : C.gray
                  }]}>
                    {marche.evolution12Mois !== null
                      ? `${marche.evolution12Mois > 0 ? '+' : ''}${marche.evolution12Mois.toFixed(1)}%`
                      : 'N/A'}
                  </Text>
                  <Text style={s.marcheMetricLabel}>Évolution 12 mois</Text>
                </View>
                <View style={s.marcheMetric}>
                  <Text style={s.marcheMetricValue}>{marche.nbTransactions}</Text>
                  <Text style={s.marcheMetricLabel}>Transactions récentes</Text>
                </View>
              </View>
            </View>
          )}

          {/* Scores quartier — cards avec barre de couleur (style Mode B) */}
          {quartier && (
            <View style={{ marginTop: marche ? 8 : 14 }} wrap={false}>
              <SectionTitle title="QUALITÉ DU QUARTIER" />
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
                {[
                  { label: 'Score global', score: quartier.scoreGlobal / 10, color: C.green, desc: 'Score composite' },
                  { label: 'Commerces', score: quartier.commerces / 10, color: C.orange, desc: 'Supermarchés, boulangeries' },
                  { label: 'Écoles', score: quartier.ecoles / 10, color: C.blue, desc: 'Écoles, collèges, lycées' },
                  { label: 'Santé', score: quartier.sante / 10, color: C.red, desc: 'Médecins, pharmacies' },
                  { label: 'Espaces verts', score: quartier.espaceVerts / 10, color: C.greenDark, desc: 'Parcs, jardins' },
                ].map((item) => (
                  <View key={item.label} style={{
                    flex: 1,
                    borderWidth: 0.5,
                    borderColor: C.grayBorder,
                    borderRadius: 5,
                    overflow: 'hidden',
                    backgroundColor: C.white,
                  }}>
                    <View style={{ height: 3, backgroundColor: item.color }} />
                    <View style={{ padding: 5, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: item.score >= 7 ? C.greenDark : item.score >= 4 ? C.orange : C.red }}>
                        {item.score.toFixed(1)}
                      </Text>
                      <Text style={{ fontSize: 4.5, color: C.grayLight }}>/10</Text>
                      <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: C.black, marginTop: 2 }}>{item.label}</Text>
                      <Text style={{ fontSize: 4, color: C.grayLight, textAlign: 'center', marginTop: 1 }}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
              {/* Enrichissements (niveau de vie, qualité air) — cards 2 colonnes */}
              {(quartier.niveauVie != null || quartier.qualiteAir != null) && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                  {quartier.niveauVie != null && (
                    <View style={{
                      width: '48.5%' as unknown as number,
                      borderWidth: 0.5, borderColor: C.grayBorder, borderRadius: 5, overflow: 'hidden', backgroundColor: C.white,
                    }}>
                      <View style={{ height: 3, backgroundColor: C.orange }} />
                      <View style={{ padding: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black }}>Niveau de vie</Text>
                          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: quartier.niveauVie >= 7 ? C.greenDark : quartier.niveauVie >= 4 ? C.orange : C.red }}>
                            {quartier.niveauVie.toFixed(1)}/10
                          </Text>
                        </View>
                        <Text style={{ fontSize: 5.5, color: C.gray }}>Revenu médian INSEE</Text>
                      </View>
                    </View>
                  )}
                  {quartier.qualiteAir != null && (
                    <View style={{
                      width: '48.5%' as unknown as number,
                      borderWidth: 0.5, borderColor: C.grayBorder, borderRadius: 5, overflow: 'hidden', backgroundColor: C.white,
                    }}>
                      <View style={{ height: 3, backgroundColor: quartier.qualiteAir >= 7 ? C.green : quartier.qualiteAir >= 4 ? C.orange : C.red }} />
                      <View style={{ padding: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black }}>Qualité de l&apos;air</Text>
                          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: quartier.qualiteAir >= 7 ? C.greenDark : quartier.qualiteAir >= 4 ? C.orange : C.red }}>
                            {quartier.qualiteAir.toFixed(1)}/10
                          </Text>
                        </View>
                        <Text style={{ fontSize: 5.5, color: C.gray }}>Indice ATMO pollution</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
              <Text style={{ fontSize: 5.5, color: C.grayLight, marginTop: 3 }}>
                {quartier.synthese}
              </Text>
            </View>
          )}

          {/* Recommandations — TOUTES */}
          <Text style={s.recoTitle} minPresenceAhead={60}>RECOMMANDATIONS PERSONNALISÉES</Text>
          {conseils.conseils.map((conseil, idx) => (
            <View key={conseil.id} style={s.recoCard} wrap={false}>
              <View style={s.recoBadge}>
                <Text style={s.recoBadgeText}>{idx + 1}</Text>
              </View>
              <View style={s.recoContent}>
                <Text style={s.recoCardTitle}>{conseil.titre}</Text>
                <Text style={s.recoCardText}>{conseil.conseil}</Text>
                {conseil.impact && (
                  <View style={s.recoImpact}>
                    <Text style={s.recoImpactText}>+ {conseil.impact}</Text>
                  </View>
                )}
                {conseil.action && (
                  <View style={s.recoAction}>
                    <Text style={s.recoActionLabel}>{'>'} {conseil.action.label}</Text>
                    {conseil.action.timeline && (
                      <Text style={s.recoActionMeta}>{conseil.action.timeline}</Text>
                    )}
                    {conseil.action.gain && (
                      <Text style={s.recoActionGain}>{conseil.action.gain}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Scénarios — TOUS avec détails complets */}
          {conseils.scenarios.length > 0 && (
            <>
              <Text style={s.recoTitle} minPresenceAhead={60}>SCÉNARIOS ALTERNATIFS</Text>
              {conseils.scenarios.map((scenario) => {
                const isPositif = scenario.resultats.economieOuCout > 0
                return (
                  <View key={scenario.id} style={[s.scenarioCard, { backgroundColor: scenario.recommande ? C.greenLight : C.grayBg, flexDirection: 'column' }]} wrap={false}>
                    {/* Header du scénario */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={s.scenarioLeft}>
                        {scenario.recommande && (
                          <View style={s.scenarioBadge}>
                            <Text style={s.scenarioBadgeText}>RECOMMANDÉ</Text>
                          </View>
                        )}
                        <Text style={s.scenarioTitle}>{scenario.titre}</Text>
                        <Text style={s.scenarioDesc}>{scenario.description}</Text>
                      </View>
                      <View style={s.scenarioRight}>
                        <Text style={[s.scenarioImpact, { color: isPositif ? C.green : C.black }]}>
                          {isPositif ? '+' : '-'}{fmt(Math.abs(scenario.resultats.economieOuCout))} EUR
                        </Text>
                        <Text style={s.scenarioImpactLabel}>sur le budget</Text>
                      </View>
                    </View>

                    {/* Avantages / Inconvénients */}
                    {(scenario.avantages.length > 0 || scenario.inconvenients.length > 0) && (
                      <View style={s.scenarioDetailsRow}>
                        {scenario.avantages.length > 0 && (
                          <View style={s.scenarioDetailsCol}>
                            <Text style={s.scenarioDetailsTitle}>Avantages</Text>
                            {scenario.avantages.map((a, i) => (
                              <Text key={i} style={s.scenarioDetailItem}>+ {a}</Text>
                            ))}
                          </View>
                        )}
                        {scenario.inconvenients.length > 0 && (
                          <View style={s.scenarioDetailsCol}>
                            <Text style={s.scenarioDetailsTitle}>Inconvénients</Text>
                            {scenario.inconvenients.map((inc, i) => (
                              <Text key={i} style={s.scenarioDetailItem}>• {inc}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    )}

                    {/* KPIs chiffrés */}
                    <View style={s.scenarioKPIs}>
                      <View style={s.scenarioKPI}>
                        <Text style={s.scenarioKPIValue}>{fmt(scenario.resultats.nouveauBudget)} €</Text>
                        <Text style={s.scenarioKPILabel}>Nouveau budget</Text>
                      </View>
                      <View style={s.scenarioKPI}>
                        <Text style={s.scenarioKPIValue}>{scenario.resultats.nouveauTaux.toFixed(2)}%</Text>
                        <Text style={s.scenarioKPILabel}>Taux estimé</Text>
                      </View>
                      <View style={s.scenarioKPI}>
                        <Text style={s.scenarioKPIValue}>{fmt(scenario.resultats.nouvellesMensualites)} €</Text>
                        <Text style={s.scenarioKPILabel}>Mensualité</Text>
                      </View>
                    </View>
                  </View>
                )
              })}
            </>
          )}

          {/* ═══ COÛTS CACHÉS À ANTICIPER (exclusif PDF) ═══ */}
          <View style={{ marginTop: 14 }} wrap={false}>
            <SectionTitle title="COÛTS CACHÉS À ANTICIPER" />
            <Text style={{ fontSize: 6.5, color: C.gray, marginTop: 2, marginBottom: 8 }}>
              Au-delà de la mensualité, voici les dépenses que beaucoup d&apos;acheteurs découvrent trop tard.
            </Text>

            {/* Grille de coûts */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {/* Colonne gauche — coûts visibles */}
              <View style={{ flex: 1 }}>
                <View style={{ backgroundColor: C.grayBg, borderRadius: 4, padding: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 4 }}>Frais d&apos;acquisition</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 6.5, color: C.gray }}>Frais de notaire</Text>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black }}>{fmt(fraisNotaire)} EUR</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 6.5, color: C.gray }}>Frais de garantie (caution/hypothèque)</Text>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black }}>~{fmt(Math.round(capitalEmpruntable * 0.012))} EUR</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 6.5, color: C.gray }}>Frais de dossier bancaire</Text>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black }}>500 à 1 500 EUR</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 6.5, color: C.gray }}>Déménagement</Text>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black }}>1 000 à 3 000 EUR</Text>
                  </View>
                </View>
              </View>

              {/* Colonne droite — coûts récurrents */}
              <View style={{ flex: 1 }}>
                <View style={{ backgroundColor: C.grayBg, borderRadius: 4, padding: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 4 }}>Charges mensuelles oubliées</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 6.5, color: C.gray }}>Taxe foncière (estimée)</Text>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black }}>{fmt(Math.round(prixAchatMax * 0.007 / 12))} EUR/mois</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 6.5, color: C.gray }}>Charges de copropriété (si appart.)</Text>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black }}>150 à 350 EUR/mois</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 6.5, color: C.gray }}>Assurance habitation</Text>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black }}>20 à 50 EUR/mois</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 6.5, color: C.gray }}>Provision travaux/entretien</Text>
                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black }}>50 à 150 EUR/mois</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Teaser AQUIZ */}
            <View style={{ backgroundColor: C.greenLight, borderRadius: 4, padding: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 8, color: C.white, fontFamily: 'Helvetica-Bold' }}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.greenDark }}>
                  Ces estimations varient fortement selon le bien et la localisation.
                </Text>
                <Text style={{ fontSize: 6, color: C.gray, marginTop: 1 }}>
                  Un conseiller AQUIZ chiffre précisément ces coûts cachés pour chaque bien que vous visitez — pour que votre budget réel n&apos;ait aucune mauvaise surprise.
                </Text>
              </View>
            </View>
          </View>

          {/* ═══ ACCOMPAGNEMENT AQUIZ (style Mode B) ═══ */}
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
              Pour concrétiser votre projet immobilier, un expert AQUIZ peut :
            </Text>

            {[
              'Identifier les biens correspondant à votre budget et vos critères de recherche',
              'Analyser les diagnostics obligatoires (DPE, amiante, plomb) et les éventuels travaux à prévoir',
              'Structurer le meilleur plan de financement (taux, durée, assurance, garanties)',
              'Rechercher les dispositifs d\'aide applicables à votre situation (PTZ, PAS, Action Logement)',
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
