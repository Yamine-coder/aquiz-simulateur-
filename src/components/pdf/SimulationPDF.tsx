/**
 * AQUIZ — Rapport de simulation PDF
 * Généré avec @react-pdf/renderer
 * Design professionnel avec charte AQUIZ
 */
import type { ScoreDetail } from '@/lib/calculs/scoreFaisabilite'
import type { ResultatConseilsAvances } from '@/lib/conseils/genererConseilsAvances'
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
  // Grande carte capacité
  capaciteCard: {
    backgroundColor: C.grayBg,
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capaciteLabel: {
    fontSize: 8,
    color: C.gray,
    letterSpacing: 0.5,
  },
  capaciteValue: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    marginTop: 4,
  },
  probaBadge: {
    backgroundColor: C.black,
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
    backgroundColor: C.black,
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
    backgroundColor: C.black,
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
  // Résumé
  resumeCard: {
    backgroundColor: C.grayBg,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  resumeTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    marginBottom: 4,
  },
  resumeText: {
    fontSize: 6.5,
    color: C.gray,
    lineHeight: 1.5,
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
    backgroundColor: C.black,
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
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.black,
    paddingVertical: 6,
    paddingHorizontal: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLogo: {
    width: 70,
    height: 22,
    objectFit: 'contain' as const,
  },
  footerDisclaimer: {
    fontSize: 5,
    color: '#787878',
  },
  footerPage: {
    fontSize: 6,
    color: '#969696',
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

function Footer({ pageNum, logoUrl }: { pageNum: number; logoUrl: string }) {
  return (
    <View style={s.footer} fixed>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={logoUrl} style={s.footerLogo} />
      <Text style={s.footerDisclaimer}>Simulation indicative — Ne constitue pas une offre de prêt</Text>
      <Text style={s.footerPage}>Page {pageNum}</Text>
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
              <View style={s.budgetTotal}>
                <Text style={s.budgetTotalLabel}>BUDGET TOTAL</Text>
                <Text style={s.budgetTotalLabel}>{fmt(pieData.total)} EUR</Text>
              </View>
            </View>
          </View>
        </View>

        <Footer pageNum={1} logoUrl={logoUrl} />
      </Page>

      {/* ═══════ PAGE 2 : DIAGNOSTIC & CONSEILS ═══════ */}
      <Page size="A4" style={s.page}>
        <View style={s.pageTitleRow}>
          <Text style={s.pageTitle}>DIAGNOSTIC BANCAIRE</Text>
          <Text style={s.pageSub}>Analyse de votre dossier</Text>
        </View>

        <View style={s.content}>
          {/* Carte score */}
          <View style={s.diagnosticCard}>
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
          <View style={s.pointsRow}>
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

          {/* Résumé */}
          <View style={s.resumeCard}>
            <Text style={s.resumeTitle}>RÉSUMÉ</Text>
            <Text style={s.resumeText}>{conseils.resumeExecutif}</Text>
          </View>

          {/* Recommandations */}
          <Text style={s.recoTitle}>RECOMMANDATIONS PERSONNALISÉES</Text>
          {conseils.conseils.slice(0, 4).map((conseil, idx) => (
            <View key={conseil.id} style={s.recoCard} wrap={false}>
              <View style={s.recoBadge}>
                <Text style={s.recoBadgeText}>{idx + 1}</Text>
              </View>
              <View style={s.recoContent}>
                <Text style={s.recoCardTitle}>{conseil.titre}</Text>
                <Text style={s.recoCardText}>{conseil.conseil}</Text>
              </View>
            </View>
          ))}

          {/* Scénarios */}
          {conseils.scenarios.length > 0 && (
            <>
              <Text style={s.recoTitle}>SCÉNARIOS ALTERNATIFS</Text>
              {conseils.scenarios.slice(0, 2).map((scenario) => {
                const isPositif = scenario.resultats.economieOuCout > 0
                return (
                  <View key={scenario.id} style={[s.scenarioCard, { backgroundColor: scenario.recommande ? C.greenLight : C.grayBg }]} wrap={false}>
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
                )
              })}
            </>
          )}

          {/* CTA */}
          <View style={s.ctaCard} wrap={false}>
            <View>
              <Text style={s.ctaTitle}>Besoin d&apos;accompagnement ?</Text>
              <Text style={s.ctaSub}>
                Un conseiller AQUIZ peut négocier votre taux et optimiser votre financement.
              </Text>
            </View>
            <Link src="https://calendly.com/contact-aquiz/30min" style={{ textDecoration: 'none' }}>
              <View style={s.ctaBtn}>
                <Text style={s.ctaBtnText}>Prendre rendez-vous</Text>
              </View>
            </Link>
          </View>
        </View>

        <Footer pageNum={2} logoUrl={logoUrl} />
      </Page>
    </Document>
  )
}
