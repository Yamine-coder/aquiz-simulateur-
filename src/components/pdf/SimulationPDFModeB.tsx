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
    backgroundColor: C.greenLight,
    borderRadius: 6,
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
    color: C.greenDark,
    marginTop: 4,
  },
  heroSub: { fontSize: 7, color: C.gray, marginTop: 2 },
  heroBadge: {
    backgroundColor: C.black,
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
    backgroundColor: C.black,
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
                <DataRow label="Montant du prêt" value={`${fmt(montantAEmprunter)} EUR`} color={C.blue} />
              </View>
            </View>
          </View>

          {/* Mensualité détaillée */}
          <View style={{ marginTop: 14 }}>
            <SectionTitle title="MENSUALITÉ DÉTAILLÉE" />
            <View style={s.dataCard}>
              <DataRow label="Remboursement crédit" value={`${fmt(mensualiteCredit)} EUR /mois`} />
              <DataRow label="Assurance emprunteur" value={`${fmt(mensualiteAssurance)} EUR /mois`} />
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
          {quartier && (
            <View style={{ marginTop: 14 }} wrap={false}>
              <SectionTitle title={`QUALITÉ DU QUARTIER — ${nomCommune || codePostal}`} />

              {/* Score global mis en avant */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 8 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: quartier.scoreGlobal / 10 >= 7 ? C.greenLight : quartier.scoreGlobal / 10 >= 4 ? C.orangeLight : '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: quartier.scoreGlobal / 10 >= 7 ? C.greenDark : quartier.scoreGlobal / 10 >= 4 ? C.orange : C.red }}>
                    {(quartier.scoreGlobal / 10).toFixed(1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.black }}>
                    Score global : {(quartier.scoreGlobal / 10).toFixed(1)}/10
                  </Text>
                  <Text style={{ fontSize: 6.5, color: C.gray, marginTop: 2, lineHeight: 1.3 }}>
                    {quartier.scoreGlobal / 10 >= 7 ? 'Quartier bien desservi avec de bons équipements.' : quartier.scoreGlobal / 10 >= 4 ? 'Quartier correct, quelques points à vérifier.' : 'Quartier peu équipé, vigilance recommandée.'}
                  </Text>
                </View>
              </View>

              {/* Détail des scores — barres horizontales */}
              <View style={{ borderWidth: 0.5, borderColor: C.grayBorder, borderRadius: 4, overflow: 'hidden' }}>
                {[
                  { label: 'Commerces', score: quartier.commerces / 10, icon: 'Supermarchés, boulangeries' },
                  { label: 'Écoles', score: quartier.ecoles / 10, icon: 'Écoles, collèges, lycées' },
                  { label: 'Santé', score: quartier.sante / 10, icon: 'Médecins, pharmacies' },
                  { label: 'Espaces verts', score: quartier.espaceVerts / 10, icon: 'Parcs, jardins' },
                  ...(quartier.niveauVie != null ? [{ label: 'Niveau de vie', score: quartier.niveauVie, icon: 'Revenu médian INSEE' }] : []),
                  ...(quartier.qualiteAir != null ? [{ label: 'Qualité air', score: quartier.qualiteAir, icon: 'Indice ATMO' }] : []),
                ].map((item, idx) => (
                  <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: idx % 2 === 0 ? C.white : C.grayBg, borderBottomWidth: 0.3, borderBottomColor: C.grayBorder }}>
                    <View style={{ width: 70 }}>
                      <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.black }}>{item.label}</Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {/* Barre */}
                      <View style={{ flex: 1, height: 5, backgroundColor: '#e6e6e6', borderRadius: 2 }}>
                        <View style={{ height: 5, borderRadius: 2, width: `${item.score * 10}%`, backgroundColor: item.score >= 7 ? C.green : item.score >= 4 ? C.orange : C.red }} />
                      </View>
                      {/* Score */}
                      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', width: 30, textAlign: 'right', color: item.score >= 7 ? C.greenDark : item.score >= 4 ? C.orange : C.red }}>
                        {item.score.toFixed(1)}/10
                      </Text>
                    </View>
                    <Text style={{ fontSize: 5, color: C.grayLight, width: 75, textAlign: 'right' }}>{item.icon}</Text>
                  </View>
                ))}
              </View>

              {quartier.synthese && (
                <View style={{ backgroundColor: C.grayBg, borderRadius: 3, padding: 6, marginTop: 6 }}>
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
