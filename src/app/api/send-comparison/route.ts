import { escapeHtml } from '@/lib/escapeHtml'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * API Route — Envoi du rapport de comparaison complet par email
 * 
 * Envoie un email HTML responsive avec le vrai rapport :
 * - Score global par bien + verdict
 * - Détail des 10 axes de scoring
 * - Analyse marché (écart prix DVF)
 * - Risques zone
 * - Score quartier
 * - Points forts / vigilance
 * - Recommandation + meilleur choix
 * - CTA prise de RDV expert
 */

// ── Schémas Zod ──────────────────────────────────────────

const axeSchema = z.object({
  axe: z.string(),
  label: z.string(),
  score: z.number(),
  disponible: z.boolean(),
  detail: z.string(),
  impact: z.enum(['positif', 'neutre', 'negatif']),
})

const pointSchema = z.object({
  texte: z.string(),
  detail: z.string().optional(),
  type: z.enum(['avantage', 'attention', 'conseil']),
})

const enrichissementSchema = z.object({
  marche: z.object({
    success: z.boolean(),
    ecartPrixM2: z.number().optional(),
    verdict: z.string().optional(),
    prixM2MedianMarche: z.number().optional(),
  }).optional(),
  risques: z.object({
    success: z.boolean(),
    scoreRisque: z.number().optional(),
    verdict: z.string().optional(),
  }).optional(),
  quartier: z.object({
    success: z.boolean(),
    scoreQuartier: z.number().optional(),
    transports: z.number().optional(),
    commerces: z.number().optional(),
    ecoles: z.number().optional(),
  }).optional(),
}).optional()

const annonceRapportSchema = z.object({
  titre: z.string().max(200).optional(),
  prix: z.number().min(0),
  surface: z.number().min(0),
  prixM2: z.number().min(0),
  ville: z.string().max(100),
  codePostal: z.string().max(10),
  type: z.enum(['appartement', 'maison']),
  pieces: z.number().min(0),
  chambres: z.number().min(0),
  dpe: z.string().max(2),
  etage: z.number().optional(),
  parking: z.boolean().optional(),
  balconTerrasse: z.boolean().optional(),
  cave: z.boolean().optional(),
  // Scoring complet
  scoreGlobal: z.number().min(0).max(100),
  verdict: z.string(),
  recommandation: z.string(),
  conseilPerso: z.string(),
  confiance: z.number().min(0).max(100),
  axes: z.array(axeSchema),
  points: z.array(pointSchema),
  estimations: z.object({
    loyerMensuelEstime: z.number().optional(),
    rendementBrut: z.number().optional(),
    coutEnergieAnnuel: z.number().optional(),
    budgetTravauxEstime: z.number().optional(),
  }).optional(),
  enrichissement: enrichissementSchema,
})

const sendComparisonSchema = z.object({
  email: z.string().email('Email invalide'),
  prenom: z.string().max(100).optional(),
  annonces: z.array(annonceRapportSchema).min(1).max(4),
})

type AnnonceRapport = z.infer<typeof annonceRapportSchema>

// ── Helpers HTML ─────────────────────────────────────────

function getDpeColor(dpe: string): string {
  const colors: Record<string, string> = {
    A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f59e0b',
    E: '#f97316', F: '#ef4444', G: '#b91c1c', NC: '#9ca3af',
  }
  return colors[dpe] || '#9ca3af'
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#22c55e'
  if (score >= 60) return '#84cc16'
  if (score >= 45) return '#f59e0b'
  if (score >= 30) return '#f97316'
  return '#ef4444'
}

function getScoreBg(score: number): string {
  if (score >= 75) return '#f0fdf4'
  if (score >= 60) return '#f7fee7'
  if (score >= 45) return '#fffbeb'
  if (score >= 30) return '#fff7ed'
  return '#fef2f2'
}

function getRecommandationLabel(reco: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    fortement_recommande: { label: 'Fortement recommandé', color: '#15803d', bg: '#f0fdf4' },
    recommande: { label: 'Recommandé', color: '#22c55e', bg: '#f0fdf4' },
    a_etudier: { label: 'À étudier', color: '#f59e0b', bg: '#fffbeb' },
    prudence: { label: 'Prudence', color: '#f97316', bg: '#fff7ed' },
    deconseille: { label: 'Déconseillé', color: '#ef4444', bg: '#fef2f2' },
  }
  return map[reco] || { label: reco, color: '#6b7280', bg: '#f9fafb' }
}

function getVerdictMarche(verdict?: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    excellent: { label: 'Excellent prix', color: '#15803d' },
    bon: { label: 'Bon prix', color: '#22c55e' },
    correct: { label: 'Prix correct', color: '#f59e0b' },
    cher: { label: 'Au-dessus du marché', color: '#f97316' },
    tres_cher: { label: 'Très au-dessus', color: '#ef4444' },
  }
  return map[verdict || ''] || { label: 'Non disponible', color: '#9ca3af' }
}

/** Pastille ronde colorée (remplace les emojis) */
function dot(color: string, size = 8): string {
  return `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${color};vertical-align:middle;margin-right:6px;"></span>`
}

/** Tick vert ou croix grise pour les boolean rows */
function boolCell(val: boolean | undefined): string {
  if (val) {
    return `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#f0fdf4;text-align:center;line-height:22px;">
      <span style="color:#22c55e;font-size:13px;font-weight:700;">&#10003;</span>
    </span>`
  }
  return `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#f3f4f6;text-align:center;line-height:22px;">
    <span style="color:#d1d5db;font-size:11px;">&#10005;</span>
  </span>`
}

// ── Constantes de style ──────────────────────────────────

const S = {
  labelCol: 'width:160px;padding:10px 14px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;vertical-align:middle;',
  dataCell: 'padding:10px 8px;font-size:13px;color:#1a1a1a;text-align:center;border-bottom:1px solid #f3f4f6;vertical-align:middle;',
  sectionHeader: 'padding:10px 14px;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;background:#f9fafb;border-bottom:1px solid #e5e7eb;',
  bestBorder: 'border-bottom:2px solid #22c55e;',
} as const

// ── Rendu comparaison en colonnes ────────────────────────

function buildComparisonReportHtml(
  annonces: AnnonceRapport[],
  prenom?: string,
): string {
  const n = annonces.length
  const colW = n <= 2 ? '240px' : n === 3 ? '200px' : '170px'
  const maxW = n <= 2 ? 640 : n === 3 ? 780 : 900

  const greeting = prenom
    ? `Bonjour ${escapeHtml(prenom.trim())},`
    : 'Bonjour,'

  const dateFormatee = new Date().toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  // Identifier le meilleur bien
  const bestIdx = annonces.reduce((best, a, i) =>
    a.scoreGlobal > annonces[best].scoreGlobal ? i : best, 0)

  // Find min prix, max surface for highlighting  
  const minPrix = Math.min(...annonces.map(a => a.prix))
  const minPrixM2 = Math.min(...annonces.map(a => a.prixM2))
  const maxSurface = Math.max(...annonces.map(a => a.surface))
  const maxPieces = Math.max(...annonces.map(a => a.pieces))

  /** Colonne de données avec highlight conditionnel */
  function dataCol(val: string, isHighlight = false, isBest = false): string {
    return `<td style="${S.dataCell}${isHighlight ? 'color:#22c55e;font-weight:700;' : ''}${isBest ? 'background:#f0fdf4;' : ''}">${val}</td>`
  }

  /** Section header full-width row */
  function sectionRow(label: string, dotColor: string): string {
    return `<tr><td colspan="${n + 1}" style="${S.sectionHeader}">${dot(dotColor, 7)} ${label}</td></tr>`
  }

  /** Row label cell */
  function labelCell(text: string): string {
    return `<td style="${S.labelCol}">${text}</td>`
  }

  // ── Build column headers (property cards) ──
  const headerCols = annonces.map((a, i) => {
    const isBest = i === bestIdx && n > 1
    const reco = getRecommandationLabel(a.recommandation)
    const scoreColor = getScoreColor(a.scoreGlobal)
    const scoreBg = getScoreBg(a.scoreGlobal)
    const titre = escapeHtml(a.titre || `Bien ${i + 1}`)
    const ville = escapeHtml(a.ville)

    return `<td width="${colW}" style="padding:14px 8px;text-align:center;vertical-align:top;border-bottom:1px solid #e5e7eb;${isBest ? 'background:#f0fdf4;' : ''}">
      ${isBest ? `<span style="display:inline-block;background:#22c55e;color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700;letter-spacing:0.3px;margin-bottom:8px;">Recommandé</span><br>` : ''}
      <!-- Score circle -->
      <div style="width:52px;height:52px;border-radius:50%;background:${scoreBg};border:3px solid ${scoreColor};text-align:center;line-height:46px;margin:0 auto 6px;">
        <span style="font-size:20px;font-weight:800;color:${scoreColor};">${a.scoreGlobal}</span>
      </div>
      <span style="font-size:10px;color:#9ca3af;">/100</span><br>
      <!-- Recommandation pill -->
      <span style="display:inline-block;background:${reco.bg};border:1px solid ${reco.color}22;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:600;color:${reco.color};margin:6px 0;">${reco.label}</span><br>
      <!-- Titre & ville -->
      <span style="font-size:12px;font-weight:700;color:#1a1a1a;line-height:1.3;">${n <= 3 ? titre.substring(0, 50) : titre.substring(0, 30)}${titre.length > (n <= 3 ? 50 : 30) ? '...' : ''}</span><br>
      <span style="font-size:11px;color:#6b7280;">${ville} ${escapeHtml(a.codePostal)}</span>
    </td>`
  }).join('')

  // ── Build comparison rows ──

  // Prix & Financement
  const prixRows = `
    ${sectionRow('PRIX &amp; FINANCEMENT', '#3b82f6')}
    <tr>${labelCell('Prix d\'achat')}${annonces.map((a, i) => dataCol(`${a.prix.toLocaleString('fr-FR')}&nbsp;€`, a.prix === minPrix, i === bestIdx && n > 1)).join('')}</tr>
    <tr>${labelCell('Prix au m²')}${annonces.map((a, i) => dataCol(`${a.prixM2.toLocaleString('fr-FR')}&nbsp;€`, a.prixM2 === minPrixM2, i === bestIdx && n > 1)).join('')}</tr>
  `

  // Caractéristiques
  const caracRows = `
    ${sectionRow('CARACTÉRISTIQUES', '#6366f1')}
    <tr>${labelCell('Type')}${annonces.map((a, i) => dataCol(a.type === 'maison' ? 'Maison' : 'Appt', false, i === bestIdx && n > 1)).join('')}</tr>
    <tr>${labelCell('Surface')}${annonces.map((a, i) => dataCol(`${a.surface}&nbsp;m²`, a.surface === maxSurface, i === bestIdx && n > 1)).join('')}</tr>
    <tr>${labelCell('Pièces')}${annonces.map((a, i) => dataCol(`${a.pieces}`, a.pieces === maxPieces, i === bestIdx && n > 1)).join('')}</tr>
    <tr>${labelCell('Chambres')}${annonces.map((a, i) => dataCol(`${a.chambres}`, false, i === bestIdx && n > 1)).join('')}</tr>
    ${annonces.some(a => a.etage !== undefined) ? `<tr>${labelCell('Étage')}${annonces.map((a, i) => dataCol(a.etage !== undefined ? `${a.etage}` : '—', false, i === bestIdx && n > 1)).join('')}</tr>` : ''}
  `

  // DPE
  const dpeRow = `
    ${sectionRow('PERFORMANCE ÉNERGÉTIQUE', '#f59e0b')}
    <tr>${labelCell('DPE')}${annonces.map((a, i) => {
      const dpe = escapeHtml(a.dpe)
      return `<td style="${S.dataCell}${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">
        <span style="display:inline-block;background:${getDpeColor(dpe)};color:#fff;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:700;">${dpe}</span>
      </td>`
    }).join('')}</tr>
  `

  // Équipements
  const equipRows = `
    ${sectionRow('ÉQUIPEMENTS', '#8b5cf6')}
    <tr>${labelCell('Parking')}${annonces.map((a, i) => `<td style="${S.dataCell}${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">${boolCell(a.parking)}</td>`).join('')}</tr>
    <tr>${labelCell('Balcon/Terrasse')}${annonces.map((a, i) => `<td style="${S.dataCell}${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">${boolCell(a.balconTerrasse)}</td>`).join('')}</tr>
    <tr>${labelCell('Cave')}${annonces.map((a, i) => `<td style="${S.dataCell}${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">${boolCell(a.cave)}</td>`).join('')}</tr>
  `

  // Analyse marché / Risques / Quartier
  const hasAnyMarche = annonces.some(a => a.enrichissement?.marche?.success)
  const hasAnyRisques = annonces.some(a => a.enrichissement?.risques?.success)
  const hasAnyQuartier = annonces.some(a => a.enrichissement?.quartier?.success)

  const analyseRows = (hasAnyMarche || hasAnyRisques || hasAnyQuartier) ? `
    ${sectionRow('LOCALISATION &amp; MARCHÉ', '#0ea5e9')}
    ${hasAnyMarche ? `<tr>${labelCell('Prix vs Marché')}${annonces.map((a, i) => {
      const m = a.enrichissement?.marche
      if (!m?.success) return dataCol('—', false, i === bestIdx && n > 1)
      const v = getVerdictMarche(m.verdict)
      const ecart = m.ecartPrixM2 !== undefined ? ` (${m.ecartPrixM2 > 0 ? '+' : ''}${Math.round(m.ecartPrixM2)}%)` : ''
      return `<td style="${S.dataCell}${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">
        <span style="font-weight:600;color:${v.color};font-size:12px;">${v.label}${ecart}</span>
        ${m.prixM2MedianMarche ? `<br><span style="font-size:10px;color:#9ca3af;">Médiane ${m.prixM2MedianMarche.toLocaleString('fr-FR')} €/m²</span>` : ''}
      </td>`
    }).join('')}</tr>` : ''}
    ${hasAnyRisques ? `<tr>${labelCell('Risques zone')}${annonces.map((a, i) => {
      const r = a.enrichissement?.risques
      if (!r?.success) return dataCol('—', false, i === bestIdx && n > 1)
      const col = r.verdict === 'sûr' ? '#22c55e' : r.verdict === 'vigilance' ? '#f59e0b' : '#ef4444'
      return `<td style="${S.dataCell}${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">
        ${dot(col)} <span style="font-weight:600;color:${col};font-size:12px;">${escapeHtml(r.verdict || 'N/A')}</span>
        ${r.scoreRisque !== undefined ? `<br><span style="font-size:10px;color:#9ca3af;">${r.scoreRisque}/100</span>` : ''}
      </td>`
    }).join('')}</tr>` : ''}
    ${hasAnyQuartier ? `<tr>${labelCell('Score quartier')}${annonces.map((a, i) => {
      const q = a.enrichissement?.quartier
      if (!q?.success) return dataCol('—', false, i === bestIdx && n > 1)
      return `<td style="${S.dataCell}${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">
        <span style="font-weight:700;color:${getScoreColor(q.scoreQuartier ?? 50)};font-size:14px;">${q.scoreQuartier ?? '—'}/100</span>
      </td>`
    }).join('')}</tr>` : ''}
  ` : ''

  // Score global row
  const scoreRow = `
    ${sectionRow('ANALYSE AQUIZ', '#22c55e')}
    <tr>${labelCell('<strong>Score global</strong>')}${annonces.map((a, i) => {
      const sc = getScoreColor(a.scoreGlobal)
      const bg = getScoreBg(a.scoreGlobal)
      return `<td style="${S.dataCell}${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">
        <span style="display:inline-block;background:${bg};border:2px solid ${sc};padding:4px 14px;border-radius:10px;font-size:18px;font-weight:800;color:${sc};">${a.scoreGlobal}</span>
        <span style="font-size:10px;color:#9ca3af;">/100</span>
      </td>`
    }).join('')}</tr>
    <tr>${labelCell('Verdict')}${annonces.map((a, i) => `<td style="${S.dataCell}font-size:12px;color:#6b7280;font-style:italic;${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">${escapeHtml(a.verdict)}</td>`).join('')}</tr>
    <tr>${labelCell('Conseil')}${annonces.map((a, i) => `<td style="${S.dataCell}font-size:11px;color:#6b7280;line-height:1.5;text-align:left;padding:10px 10px;${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">${escapeHtml(a.conseilPerso)}</td>`).join('')}</tr>
  `

  // Points forts / vigilance per column
  const pointsRows = `
    <tr>${labelCell('<span style="color:#15803d;font-weight:600;">Points forts</span>')}${annonces.map((a, i) => {
      const pts = a.points.filter(p => p.type === 'avantage').slice(0, 3)
      return `<td style="${S.dataCell}text-align:left;padding:10px;vertical-align:top;${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">
        ${pts.length > 0 ? pts.map(p => `<span style="display:block;font-size:11px;color:#374151;line-height:1.6;">${dot('#22c55e', 6)}${escapeHtml(p.texte)}</span>`).join('') : '<span style="font-size:11px;color:#d1d5db;">—</span>'}
      </td>`
    }).join('')}</tr>
    <tr>${labelCell('<span style="color:#b45309;font-weight:600;">Vigilance</span>')}${annonces.map((a, i) => {
      const pts = a.points.filter(p => p.type === 'attention').slice(0, 3)
      return `<td style="${S.dataCell}text-align:left;padding:10px;vertical-align:top;${i === bestIdx && n > 1 ? 'background:#f0fdf4;' : ''}">
        ${pts.length > 0 ? pts.map(p => `<span style="display:block;font-size:11px;color:#374151;line-height:1.6;">${dot('#f59e0b', 6)}${escapeHtml(p.texte)}</span>`).join('') : '<span style="font-size:11px;color:#d1d5db;">—</span>'}
      </td>`
    }).join('')}</tr>
  `

  // Estimations
  const hasEstimations = annonces.some(a => a.estimations?.loyerMensuelEstime || a.estimations?.rendementBrut)
  const estimationRows = hasEstimations ? `
    ${sectionRow('ESTIMATIONS', '#0ea5e9')}
    ${annonces.some(a => a.estimations?.loyerMensuelEstime) ? `<tr>${labelCell('Loyer estimé')}${annonces.map((a, i) => dataCol(a.estimations?.loyerMensuelEstime ? `${a.estimations.loyerMensuelEstime.toLocaleString('fr-FR')}&nbsp;€/mois` : '—', false, i === bestIdx && n > 1)).join('')}</tr>` : ''}
    ${annonces.some(a => a.estimations?.rendementBrut) ? `<tr>${labelCell('Rendement brut')}${annonces.map((a, i) => dataCol(a.estimations?.rendementBrut ? `${a.estimations.rendementBrut}%` : '—', false, i === bestIdx && n > 1)).join('')}</tr>` : ''}
  ` : ''

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport de comparaison AQUIZ</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:16px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0">
        
        <!-- ══ HEADER ══ -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px 16px 0 0;overflow:hidden;">
            <tr><td style="padding:20px 28px;">
              <table width="100%"><tr>
                <td><span style="color:#22c55e;font-size:24px;font-weight:800;letter-spacing:-0.5px;">AQUIZ</span></td>
                <td align="right">
                  <span style="display:inline-block;background:rgba(34,197,94,0.15);padding:5px 14px;border-radius:20px;font-size:11px;font-weight:600;color:#22c55e;letter-spacing:0.3px;">
                    RAPPORT COMPARAISON
                  </span>
                </td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>
        
        <!-- ══ INTRO ══ -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <tr><td style="padding:28px 28px 20px;">
              <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1a1a1a;">${greeting}</p>
              <p style="margin:0 0 4px;font-size:14px;color:#6b7280;line-height:1.6;">
                Voici votre <strong style="color:#1a1a1a;">rapport de comparaison</strong> pour ${n > 1 ? `vos <strong style="color:#1a1a1a;">${n} biens</strong>` : 'votre bien'}.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                ${dateFormatee} &middot; Algorithme AQUIZ v2
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- ══ TABLEAU COMPARATIF (colonnes côte à côte) ══ -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <tr><td style="padding:0 16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;border-collapse:collapse;">
                
                <!-- ── En-têtes colonnes (fiches biens) ── -->
                <tr>
                  <td style="padding:14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;vertical-align:middle;">
                    <span style="font-size:13px;font-weight:700;color:#1a1a1a;">${n} biens</span><br>
                    <span style="font-size:11px;color:#9ca3af;">Comparaison</span>
                  </td>
                  ${headerCols}
                </tr>

                <!-- ── Section : Prix & Financement ── -->
                ${prixRows}

                <!-- ── Section : Caractéristiques ── -->
                ${caracRows}

                <!-- ── Section : DPE ── -->
                ${dpeRow}

                <!-- ── Section : Équipements ── -->
                ${equipRows}

                <!-- ── Section : Localisation & Marché ── -->
                ${analyseRows}

                <!-- ── Section : Estimations ── -->
                ${estimationRows}

                <!-- ── Section : Analyse AQUIZ ── -->
                ${scoreRow}

                <!-- ── Points forts / Vigilance ── -->
                ${pointsRows}

              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- ══ CTA EXPERT ══ -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <tr><td style="padding:0 28px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;overflow:hidden;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#1a1a1a;">
                    Besoin d'aller plus loin ?
                  </p>
                  <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">
                    Un expert AQUIZ peut vous aider à <strong style="color:#1a1a1a;">négocier le prix</strong>, vérifier les diagnostics
                    et vous accompagner jusqu'à la signature.
                  </p>
                  <table width="100%"><tr><td align="center">
                    <a href="https://calendly.com/contact-aquiz/30min" target="_blank" style="display:inline-block;background:#22c55e;color:#ffffff;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
                      Prendre RDV avec un expert
                    </a>
                  </td></tr></table>
                  <p style="margin:12px 0 0;text-align:center;font-size:11px;color:#9ca3af;">
                    100% gratuit &middot; Sans engagement &middot; Réponse sous 2h
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        
        <!-- ══ FOOTER ══ -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;overflow:hidden;">
            <tr><td style="padding:20px 28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;">
                Rapport généré le ${dateFormatee}
              </p>
              <p style="margin:0 0 10px;font-size:11px;color:#9ca3af;line-height:1.5;">
                Scores calculés à partir de données publiques (DVF, Géorisques, OpenStreetMap).<br>
                Ils ne remplacent pas un avis professionnel.
              </p>
              <p style="margin:0;font-size:11px;color:#d1d5db;">
                © ${new Date().getFullYear()} AQUIZ — Simulateur immobilier
              </p>
            </td></tr>
          </table>
        </td></tr>
        
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── POST handler ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request.headers)
    const rateCheck = checkRateLimit(`comparison:${ip}`, RATE_LIMITS.rappel)
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      )
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide' },
        { status: 400 }
      )
    }

    const parsed = sendComparisonSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, prenom, annonces } = parsed.data

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('[send-comparison] RESEND_API_KEY manquante')
      return NextResponse.json({ error: 'Service email non configuré' }, { status: 503 })
    }

    // ── Persister le lead AVANT l'envoi email ──────────────
    try {
      await prisma.lead.create({
        data: {
          email,
          prenom: prenom || '',
          source: 'comparateur',
          contexte: JSON.stringify({
            nbBiens: annonces.length,
            villes: annonces.map(a => a.ville),
            budgetMax: Math.max(...annonces.map(a => a.prix)),
            meilleurScore: Math.max(...annonces.map(a => a.scoreGlobal)),
          }),
          emailSent: false,
          ip,
        },
      })
    } catch (dbErr) {
      // Ne pas bloquer l'envoi si la BDD échoue
      console.error('[send-comparison] Erreur sauvegarde lead:', dbErr)
    }

    const htmlContent = buildComparisonReportHtml(annonces, prenom)

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AQUIZ <onboarding@resend.dev>',
        to: email,
        subject: `Votre rapport AQUIZ — ${annonces.length} bien${annonces.length > 1 ? 's' : ''} analysé${annonces.length > 1 ? 's' : ''}`,
        html: htmlContent,
      }),
    })

    if (!resendResponse.ok) {
      const err = await resendResponse.text()
      console.error('[send-comparison] Resend error:', err)
      return NextResponse.json({ error: 'Erreur lors de l\'envoi' }, { status: 502 })
    }

    // Notification interne
    const notifyTo = process.env.CONTACT_EMAIL_TO
    if (notifyTo) {
      const bestAnnonce = [...annonces].sort((a, b) => b.scoreGlobal - a.scoreGlobal)[0]
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'AQUIZ <onboarding@resend.dev>',
          to: notifyTo,
          subject: `Rapport comparaison envoyé — ${escapeHtml(email)}`,
          html: `
            <h3>Nouveau rapport de comparaison envoyé</h3>
            <p><strong>Email :</strong> ${escapeHtml(email)}</p>
            ${prenom ? `<p><strong>Prénom :</strong> ${escapeHtml(prenom)}</p>` : ''}
            <p><strong>Biens comparés :</strong> ${annonces.length}</p>
            <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
              <tr style="background:#f3f4f6;">
                <th>Bien</th><th>Ville</th><th>Prix</th><th>Score</th><th>Verdict</th>
              </tr>
              ${annonces.map(a => `
              <tr>
                <td>${escapeHtml(a.titre || a.type)}</td>
                <td>${escapeHtml(a.ville)}</td>
                <td>${a.prix.toLocaleString('fr-FR')} €</td>
                <td><strong>${a.scoreGlobal}/100</strong></td>
                <td>${escapeHtml(a.verdict)}</td>
              </tr>`).join('')}
            </table>
            <p><strong>Meilleur choix :</strong> ${escapeHtml(bestAnnonce?.titre || bestAnnonce?.ville || '—')} (${bestAnnonce?.scoreGlobal}/100)</p>
            <p style="color:#999;font-size:12px;">Lead comparateur — ${new Date().toLocaleString('fr-FR')}</p>
          `,
        }),
      }).catch(err => console.error('[send-comparison] Notification error:', err))
    }

    // Marquer le lead comme envoyé
    try {
      await prisma.lead.updateMany({
        where: { email, source: 'comparateur' },
        data: { emailSent: true },
      })
    } catch {
      // Silencieux
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[send-comparison] Erreur:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
