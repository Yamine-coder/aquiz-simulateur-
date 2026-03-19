/**
 * Génère le fichier Excel de documentation du moteur de scoring AQUIZ
 * Usage : node scripts/generate-scoring-excel.mjs
 */
import path from 'path'
import { fileURLToPath } from 'url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT = path.join(__dirname, '..', 'AQUIZ_Scoring_Documentation.xlsx')

// ─────────────────────────────────────────────
// DONNÉES
// ─────────────────────────────────────────────

const AXES = [
  { id: 'prixMarche',   label: 'Prix vs Marché',           poids: 20, source: 'DVF (data.gouv.fr)',    description: 'Compare le prix/m² au prix médian des transactions DVF dans le même secteur. Écart négatif = bonne affaire.' },
  { id: 'rendement',    label: 'Rendement locatif',         poids: 15, source: 'Calcul estimé',          description: 'Rendement brut annuel estimé (loyer potentiel / prix d\'achat). DPE G = 0 (interdiction location).' },
  { id: 'emplacement',  label: 'Emplacement / Quartier',    poids: 13, source: 'OpenStreetMap',          description: 'Score de vie : commerces, écoles, santé, espaces verts dans 1 km.' },
  { id: 'energie',      label: 'Performance énergie',       poids: 12, source: 'DPE déclaré',            description: 'Classe DPE + GES + coût énergie estimé annuel. F/G très pénalisés.' },
  { id: 'etatBien',     label: 'État du bien / Travaux',    poids: 10, source: 'Année construction + DPE','description': 'Budget travaux estimé : bien récent DPE A = 0 €.' },
  { id: 'charges',      label: 'Charges & fiscalité',       poids:  8, source: 'Charges copro + taxe',   description: 'Poids des charges mensuelles + taxe foncière rapporté au prix.' },
  { id: 'transports',   label: 'Transports',                poids:  7, source: 'OpenStreetMap',          description: 'Nombre de stations, variété des modes (métro, tram, bus, RER), proximité.' },
  { id: 'risques',      label: 'Risques naturels',          poids:  5, source: 'Géorisques',             description: 'Inondation, séisme, radon, pollution des sols, PPRT.' },
  { id: 'surface',      label: 'Surface & agencement',      poids:  4, source: 'Surface déclarée',       description: 'Ratio m²/pièce + orientation (Sud valorisée) + comparaison aux autres biens.' },
  { id: 'equipements',  label: 'Équipements & confort',     poids:  4, source: 'Données annonce',        description: 'Balcon, parking, cave, ascenseur. Étage élevé sans ascenseur = malus.' },
  { id: 'plusValue',    label: 'Potentiel plus-value',      poids:  2, source: 'Agrégé',                 description: 'Décote DPE + prix inférieur marché + quartier dynamique + évolution DVF.' },
]

const PROFILS = [
  {
    id: 'equilibre', label: 'Équilibré', description: 'Pondération professionnelle standard. Vision balancée.',
    mults: { prixMarche:1, rendement:1, energie:1, emplacement:1, transports:1, etatBien:1, charges:1, risques:1, surface:1, equipements:1, plusValue:1 },
  },
  {
    id: 'investisseur', label: 'Investisseur', description: 'Priorité au rendement et à la plus-value. Achat locatif, investissement patrimonial.',
    mults: { prixMarche:1.5, rendement:2.5, energie:1, emplacement:0.7, transports:1, etatBien:1, charges:1.5, risques:1, surface:0.5, equipements:0.5, plusValue:3 },
  },
  {
    id: 'famille', label: 'Famille', description: 'Espace, école, sécurité, calme. Résidence principale avec enfants.',
    mults: { prixMarche:1, rendement:0.3, energie:1, emplacement:1.8, transports:1.3, etatBien:1, charges:1, risques:1.5, surface:2.5, equipements:1.5, plusValue:0.3 },
  },
  {
    id: 'premier_achat', label: 'Premier achat', description: 'Budget serré, bon rapport qualité-prix. Critères pratiques et coût réel.',
    mults: { prixMarche:2, rendement:0.5, energie:1, emplacement:1, transports:1.3, etatBien:1.5, charges:1.8, risques:1, surface:1, equipements:1, plusValue:0.5 },
  },
  {
    id: 'eco', label: 'Éco-responsable', description: 'Performance énergétique et environnement. Empreinte carbone.',
    mults: { prixMarche:1, rendement:0.5, energie:3, emplacement:1.3, transports:1, etatBien:1, charges:1.3, risques:1.5, surface:1, equipements:1, plusValue:0.3 },
  },
]

const DPE_SCORES = [
  { classe: 'A', score: 100, coutM2An: 5,  kWhM2An: '<70',   interpretation: 'Excellent — Quasiment aucun coût énergie' },
  { classe: 'B', score:  85, coutM2An: 8,  kWhM2An: '70–110', interpretation: 'Très bon' },
  { classe: 'C', score:  70, coutM2An: 12, kWhM2An: '110–180','interpretation': 'Bon' },
  { classe: 'D', score:  55, coutM2An: 17, kWhM2An: '180–250','interpretation': 'Moyen' },
  { classe: 'E', score:  35, coutM2An: 23, kWhM2An: '250–330','interpretation': 'Passable — Travaux recommandés' },
  { classe: 'F', score:  15, coutM2An: 30, kWhM2An: '330–420','interpretation': 'Passoire thermique — Interdit location 2025+' },
  { classe: 'G', score:   0, coutM2An: 38, kWhM2An: '>420',   interpretation: 'Passoire thermique — Interdit location (score 0 rendement)' },
]

// ─────────────────────────────────────────────
// HELPER : style cellule
// ─────────────────────────────────────────────
function cell(value, opts = {}) {
  const c = { v: value }
  if (typeof value === 'number') c.t = 'n'
  else c.t = 's'
  if (opts.bold || opts.fill || opts.align || opts.color) {
    c.s = {}
    if (opts.bold)  c.s.font       = { bold: true, color: opts.color ? { rgb: opts.color } : undefined }
    if (opts.fill)  c.s.fill       = { fgColor: { rgb: opts.fill }, patternType: 'solid' }
    if (opts.align) c.s.alignment  = { horizontal: opts.align, vertical: 'center', wrapText: true }
    if (opts.border) c.s.border    = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} }
  }
  return c
}

// ─────────────────────────────────────────────
// FEUILLE 1 — Axes de base
// ─────────────────────────────────────────────
function sheetAxes() {
  const header = ['#', 'Axe', 'Poids base (%)', 'Source de données', 'Description']
  const rows = [
    header.map(h => cell(h, { bold: true, fill: '1E3A5F', color: 'FFFFFF', align: 'center' })),
    ...AXES.map((a, i) => [
      cell(i + 1, { align: 'center' }),
      cell(a.label, { bold: true }),
      cell(a.poids, { align: 'center' }),
      cell(a.source),
      cell(a.description),
    ]),
    [cell(''), cell('TOTAL'), cell(100, { bold: true, align: 'center', fill: 'E8F5E9' }), cell(''), cell('')],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows.map(r => r.map(c => c.v)))
  ws['!cols'] = [{ wch: 4 }, { wch: 26 }, { wch: 16 }, { wch: 22 }, { wch: 80 }]
  return ws
}

// ─────────────────────────────────────────────
// FEUILLE 2 — Multiplicateurs par profil
// ─────────────────────────────────────────────
function sheetProfils() {
  const profilHeaders = PROFILS.map(p => `${p.label}`)
  const header = ['Axe', 'Poids base (%)', ...profilHeaders]

  const rows = [
    header,
    ...AXES.map(a => [
      a.label,
      a.poids,
      ...PROFILS.map(p => {
        const m = p.mults[a.id] ?? 1
        return m === 1 ? '×1' : m > 1 ? `×${m} ▲` : `×${m} ▼`
      }),
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 26 },
    { wch: 14 },
    ...PROFILS.map(() => ({ wch: 18 })),
  ]
  return ws
}

// ─────────────────────────────────────────────
// FEUILLE 3 — Poids effectifs calculés
// ─────────────────────────────────────────────
function sheetPoidsEffectifs() {
  // Calculer les poids effectifs (normalisés sur 100%)
  function calcPoidsEffectifs(mults) {
    const raw = AXES.map(a => ({ id: a.id, raw: a.poids * (mults[a.id] ?? 1) }))
    const total = raw.reduce((s, r) => s + r.raw, 0)
    return Object.fromEntries(raw.map(r => [r.id, Math.round((r.raw / total) * 100 * 10) / 10]))
  }

  const header = ['Axe', 'Poids base (%)', ...PROFILS.map(p => `${p.label} (%)`)]
  const rows = [
    header,
    ...AXES.map(a => [
      a.label,
      a.poids,
      ...PROFILS.map(p => calcPoidsEffectifs(p.mults)[a.id]),
    ]),
    ['TOTAL', 100, ...PROFILS.map(() => 100)],
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 26 },
    { wch: 14 },
    ...PROFILS.map(() => ({ wch: 18 })),
  ]
  return ws
}

// ─────────────────────────────────────────────
// FEUILLE 4 — Résumé des profils
// ─────────────────────────────────────────────
function sheetResumesProfils() {
  const rows = [
    ['Profil', 'Description', 'Axes prioritaires (×>1)', 'Axes réduits (×<1)', 'Usage typique'],
    ...PROFILS.map(p => {
      const boost = Object.entries(p.mults).filter(([,v]) => v > 1).map(([k, v]) => {
        const axe = AXES.find(a => a.id === k)
        return `${axe?.label} (×${v})`
      }).join(' | ') || '—'
      const reduit = Object.entries(p.mults).filter(([,v]) => v < 1).map(([k, v]) => {
        const axe = AXES.find(a => a.id === k)
        return `${axe?.label} (×${v})`
      }).join(' | ') || '—'
      return [p.label, p.description, boost, reduit, p.description]
    }),
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 18 }, { wch: 45 }, { wch: 60 }, { wch: 45 }, { wch: 45 }]
  return ws
}

// ─────────────────────────────────────────────
// FEUILLE 5 — Barème DPE
// ─────────────────────────────────────────────
function sheetDPE() {
  const rows = [
    ['Classe DPE', 'Score axe énergie (/100)', 'Coût estimé (€/m²/an)', 'Conso (kWh/m²/an)', 'Interprétation'],
    ...DPE_SCORES.map(d => [d.classe, d.score, d.coutM2An, d.kWhM2An, d.interpretation]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 22 }, { wch: 20 }, { wch: 55 }]
  return ws
}

// ─────────────────────────────────────────────
// ASSEMBLAGE
// ─────────────────────────────────────────────
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, sheetAxes(),           '1 - Axes de base')
XLSX.utils.book_append_sheet(wb, sheetProfils(),        '2 - Multiplicateurs profils')
XLSX.utils.book_append_sheet(wb, sheetPoidsEffectifs(), '3 - Poids effectifs (%)')
XLSX.utils.book_append_sheet(wb, sheetResumesProfils(), '4 - Résumé profils')
XLSX.utils.book_append_sheet(wb, sheetDPE(),            '5 - Barème DPE')

XLSX.writeFile(wb, OUTPUT)
console.log(`✅ Fichier généré : ${OUTPUT}`)
