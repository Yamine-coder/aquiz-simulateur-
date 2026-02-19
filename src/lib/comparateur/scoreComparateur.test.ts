/**
 * Tests globaux du moteur de scoring professionnel
 * Vérifie : scores, estimations, cohérence, edge cases
 */
import { describe, expect, it } from 'vitest'

import type { Annonce, ClasseDPE } from '@/types/annonces'

import {
    COUT_ENERGIE_M2_AN,
    LABELS_AXES,
    POIDS_AXES,
    calculerScorePro,
    genererSyntheseComparaison,
    scoreToRadarData,
    type DonneesEnrichiesScoring
} from './scoreComparateur'

// ============================================
// FIXTURES (profils réalistes)
// ============================================

/** Helper pour créer une annonce de test avec des valeurs par défaut */
function creerAnnonce(overrides: Partial<Annonce> = {}): Annonce {
  return {
    id: 'test-1',
    source: 'manuel',
    prix: 250000,
    surface: 65,
    prixM2: 3846,
    type: 'appartement',
    pieces: 3,
    chambres: 2,
    ville: 'Lyon',
    codePostal: '69003',
    dpe: 'C',
    dateAjout: new Date().toISOString(),
    ...overrides,
  } as Annonce
}

// Profils types
const APPART_PARIS_PREMIUM = creerAnnonce({
  id: 'paris-premium',
  prix: 550000,
  surface: 55,
  prixM2: 10000,
  type: 'appartement',
  pieces: 3,
  chambres: 2,
  ville: 'Paris',
  codePostal: '75011',
  dpe: 'B',
  ges: 'B',
  etage: 4,
  ascenseur: true,
  balconTerrasse: true,
  parking: false,
  cave: true,
  chargesMensuelles: 250,
  taxeFonciere: 800,
  anneeConstruction: 2018,
  orientation: 'Sud',
})

const MAISON_PROVINCE_ANCIENNE = creerAnnonce({
  id: 'maison-ancienne',
  prix: 180000,
  surface: 120,
  prixM2: 1500,
  type: 'maison',
  pieces: 5,
  chambres: 3,
  ville: 'Limoges',
  codePostal: '87000',
  dpe: 'F',
  ges: 'E',
  parking: true,
  balconTerrasse: true,
  cave: true,
  chargesMensuelles: 0,
  taxeFonciere: 1200,
  anneeConstruction: 1965,
})

const APPART_NEUF_NANTES = creerAnnonce({
  id: 'neuf-nantes',
  prix: 320000,
  surface: 72,
  prixM2: 4444,
  type: 'appartement',
  pieces: 4,
  chambres: 3,
  ville: 'Nantes',
  codePostal: '44000',
  dpe: 'A',
  ges: 'A',
  etage: 2,
  ascenseur: true,
  balconTerrasse: true,
  parking: true,
  cave: true,
  chargesMensuelles: 180,
  taxeFonciere: 600,
  anneeConstruction: 2024,
  nbSallesBains: 2,
  orientation: 'Sud',
})

const PASSOIRE_ENERGETIQUE = creerAnnonce({
  id: 'passoire',
  prix: 150000,
  surface: 50,
  prixM2: 3000,
  type: 'appartement',
  pieces: 2,
  chambres: 1,
  ville: 'Saint-Etienne',
  codePostal: '42000',
  dpe: 'G',
  ges: 'G',
  etage: 5,
  ascenseur: false,
  anneeConstruction: 1960,
})

const ANNONCE_MINIMALE = creerAnnonce({
  id: 'minimale',
  prix: 200000,
  surface: 60,
  prixM2: 3333,
  type: 'appartement',
  pieces: 3,
  chambres: 2,
  ville: 'Dijon',
  codePostal: '21000',
  dpe: 'NC',
})

const ANNONCE_SCREENSHOT = creerAnnonce({
  id: 'screenshot-vitry',
  prix: 298000,
  surface: 67,
  prixM2: 4448,
  type: 'maison',
  pieces: 3,
  chambres: 2,
  ville: 'Vitry-Sur-Seine',
  codePostal: '94400',
  dpe: 'B',
  ges: 'B',
  balconTerrasse: true,
  parking: true,
  cave: true,
  orientation: 'Sud',
})

const ANNONCES_LISTE = [APPART_PARIS_PREMIUM, MAISON_PROVINCE_ANCIENNE, APPART_NEUF_NANTES, PASSOIRE_ENERGETIQUE]

// ============================================
// TESTS : SCORE GLOBAL
// ============================================

describe('Score global', () => {
  it('retourne un score entre 0 et 100', () => {
    for (const annonce of ANNONCES_LISTE) {
      const result = calculerScorePro(annonce, ANNONCES_LISTE)
      expect(result.scoreGlobal).toBeGreaterThanOrEqual(0)
      expect(result.scoreGlobal).toBeLessThanOrEqual(100)
    }
  })

  it('retourne toujours un entier', () => {
    for (const annonce of ANNONCES_LISTE) {
      const result = calculerScorePro(annonce, ANNONCES_LISTE)
      expect(Number.isInteger(result.scoreGlobal)).toBe(true)
    }
  })

  it('un bien neuf DPE A bien équipé score mieux qu\'une passoire DPE G', () => {
    const scoreNeuf = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    const scorePassoire = calculerScorePro(PASSOIRE_ENERGETIQUE, ANNONCES_LISTE)
    expect(scoreNeuf.scoreGlobal).toBeGreaterThan(scorePassoire.scoreGlobal)
  })

  it('un bien neuf DPE A scores >= 60', () => {
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    expect(result.scoreGlobal).toBeGreaterThanOrEqual(60)
  })

  it('une passoire DPE G étage 5 sans ascenseur score < 55', () => {
    const result = calculerScorePro(PASSOIRE_ENERGETIQUE, ANNONCES_LISTE)
    expect(result.scoreGlobal).toBeLessThan(55)
  })

  it('le verdict correspond au seuil du score', () => {
    for (const annonce of ANNONCES_LISTE) {
      const r = calculerScorePro(annonce, ANNONCES_LISTE)
      if (r.scoreGlobal >= 75) expect(r.verdict).toBe('Excellent choix')
      else if (r.scoreGlobal >= 62) expect(r.verdict).toBe('Bon potentiel')
      else if (r.scoreGlobal >= 48) expect(r.verdict).toBe('À étudier')
      else if (r.scoreGlobal >= 35) expect(r.verdict).toBe('Avec réserves')
      else expect(r.verdict).toBe('Peu recommandé')
    }
  })

  it('la recommandation correspond au verdict', () => {
    const verdictToReco: Record<string, string> = {
      'Excellent choix': 'fortement_recommande',
      'Bon potentiel': 'recommande',
      'À étudier': 'a_etudier',
      'Avec réserves': 'prudence',
      'Peu recommandé': 'deconseille',
    }
    for (const annonce of ANNONCES_LISTE) {
      const r = calculerScorePro(annonce, ANNONCES_LISTE)
      expect(r.recommandation).toBe(verdictToReco[r.verdict])
    }
  })

  it('le budget max pénalise un bien qui dépasse', () => {
    const sansBudget = calculerScorePro(APPART_PARIS_PREMIUM, ANNONCES_LISTE)
    const avecBudgetFaible = calculerScorePro(APPART_PARIS_PREMIUM, ANNONCES_LISTE, undefined, 400000)
    expect(avecBudgetFaible.scoreGlobal).toBeLessThan(sansBudget.scoreGlobal)
  })

  it('le budget max ne pénalise pas un bien largement en dessous', () => {
    const sansBudget = calculerScorePro(MAISON_PROVINCE_ANCIENNE, ANNONCES_LISTE)
    const avecBudgetLarge = calculerScorePro(MAISON_PROVINCE_ANCIENNE, ANNONCES_LISTE, undefined, 500000)
    expect(avecBudgetLarge.scoreGlobal).toBeGreaterThanOrEqual(sansBudget.scoreGlobal)
  })
})

// ============================================
// TESTS : 10 AXES
// ============================================

describe('Axes de scoring', () => {
  it('retourne toujours 10 axes', () => {
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    expect(result.axes).toHaveLength(10)
  })

  it('chaque axe a un score entre 0 et 100', () => {
    for (const annonce of ANNONCES_LISTE) {
      const result = calculerScorePro(annonce, ANNONCES_LISTE)
      for (const axe of result.axes) {
        expect(axe.score, `${axe.label} pour ${annonce.id}`).toBeGreaterThanOrEqual(0)
        expect(axe.score, `${axe.label} pour ${annonce.id}`).toBeLessThanOrEqual(100)
      }
    }
  })

  it('les poids redistribués totalisent ~100 pour les axes disponibles', () => {
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    const totalPoids = result.axes.filter(a => a.disponible).reduce((sum, a) => sum + a.poids, 0)
    // Arrondi peut causer ±1
    expect(totalPoids).toBeGreaterThanOrEqual(99)
    expect(totalPoids).toBeLessThanOrEqual(101)
  })

  it('les axes sans données ont un poids de 0', () => {
    // Sans données enrichies, prixMarche/emplacement/risques/plusValue sont indisponibles
    const result = calculerScorePro(ANNONCE_MINIMALE, [ANNONCE_MINIMALE])
    const axesIndispo = result.axes.filter(a => !a.disponible)
    for (const axe of axesIndispo) {
      expect(axe.poids, `${axe.label} devrait avoir poids 0`).toBe(0)
    }
  })

  it('l\'axe énergie score mieux pour DPE A que DPE G', () => {
    const scoreA = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    const scoreG = calculerScorePro(PASSOIRE_ENERGETIQUE, ANNONCES_LISTE)
    const axeEnergieA = scoreA.axes.find(a => a.axe === 'energie')!
    const axeEnergieG = scoreG.axes.find(a => a.axe === 'energie')!
    expect(axeEnergieA.score).toBeGreaterThan(axeEnergieG.score)
    expect(axeEnergieA.score).toBeGreaterThanOrEqual(70)
    expect(axeEnergieG.score).toBeLessThan(30)
  })

  it('l\'axe equipements pénalise un étage élevé sans ascenseur', () => {
    const result = calculerScorePro(PASSOIRE_ENERGETIQUE, ANNONCES_LISTE) // étage 5 sans ascenseur
    const axeEquip = result.axes.find(a => a.axe === 'equipements')!
    expect(axeEquip.score).toBeLessThan(40)
  })

  it('l\'axe equipements récompense un bien bien équipé', () => {
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE) // parking+balcon+cave+ascenseur+2SDB
    const axeEquip = result.axes.find(a => a.axe === 'equipements')!
    expect(axeEquip.score).toBeGreaterThanOrEqual(60)
  })

  it('l\'axe surface bonus pour orientation Sud', () => {
    const avecSud = calculerScorePro(ANNONCE_SCREENSHOT, [ANNONCE_SCREENSHOT])
    const sansSud = calculerScorePro(
      creerAnnonce({ ...ANNONCE_SCREENSHOT, id: 'sans-sud', orientation: undefined }),
      [creerAnnonce({ ...ANNONCE_SCREENSHOT, id: 'sans-sud', orientation: undefined })]
    )
    const axeSurfaceAvec = avecSud.axes.find(a => a.axe === 'surface')!
    const axeSurfaceSans = sansSud.axes.find(a => a.axe === 'surface')!
    expect(axeSurfaceAvec.score).toBeGreaterThanOrEqual(axeSurfaceSans.score)
  })

  it('chaque axe a un label non vide et un detail non vide', () => {
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    for (const axe of result.axes) {
      expect(axe.label.length).toBeGreaterThan(0)
      expect(axe.detail.length).toBeGreaterThan(0)
    }
  })
})

// ============================================
// TESTS : ESTIMATIONS (loyer, rendement, énergie, travaux)
// ============================================

describe('Estimations financières', () => {
  describe('Loyer mensuel estimé', () => {
    it('estime un loyer pour Paris (ratio ~0.28%)', () => {
      const result = calculerScorePro(APPART_PARIS_PREMIUM, [APPART_PARIS_PREMIUM])
      const loyer = result.estimations.loyerMensuelEstime!
      // 550000 × 0.0028 = 1540
      expect(loyer).toBeGreaterThanOrEqual(1400)
      expect(loyer).toBeLessThanOrEqual(1700)
    })

    it('estime un loyer pour petite couronne 94 (ratio ~0.35%)', () => {
      const result = calculerScorePro(ANNONCE_SCREENSHOT, [ANNONCE_SCREENSHOT])
      const loyer = result.estimations.loyerMensuelEstime!
      // 298000 × 0.0035 = 1043
      expect(loyer).toBeGreaterThanOrEqual(900)
      expect(loyer).toBeLessThanOrEqual(1200)
    })

    it('estime un loyer plus élevé (en ratio) pour la province rurale', () => {
      const result = calculerScorePro(MAISON_PROVINCE_ANCIENNE, [MAISON_PROVINCE_ANCIENNE])
      const loyer = result.estimations.loyerMensuelEstime!
      const rendement = result.estimations.rendementBrut!
      // Limoges 87 = villes moyennes 0.50%
      expect(loyer).toBeGreaterThanOrEqual(800)
      expect(loyer).toBeLessThanOrEqual(1100)
      expect(rendement).toBeGreaterThanOrEqual(4)
    })

    it('le loyer est toujours un entier positif', () => {
      for (const annonce of ANNONCES_LISTE) {
        const result = calculerScorePro(annonce, ANNONCES_LISTE)
        const loyer = result.estimations.loyerMensuelEstime!
        expect(loyer).toBeGreaterThan(0)
        expect(Number.isInteger(loyer)).toBe(true)
      }
    })
  })

  describe('Rendement brut', () => {
    it('le rendement est <= 10% (réaliste)', () => {
      for (const annonce of ANNONCES_LISTE) {
        const result = calculerScorePro(annonce, ANNONCES_LISTE)
        expect(result.estimations.rendementBrut!).toBeLessThanOrEqual(10)
      }
    })

    it('le rendement est > 0%', () => {
      for (const annonce of ANNONCES_LISTE) {
        const result = calculerScorePro(annonce, ANNONCES_LISTE)
        expect(result.estimations.rendementBrut!).toBeGreaterThan(0)
      }
    })

    it('le rendement Paris < rendement province (attendu inverse prix/loyer)', () => {
      const resultParis = calculerScorePro(APPART_PARIS_PREMIUM, ANNONCES_LISTE)
      const resultProvince = calculerScorePro(MAISON_PROVINCE_ANCIENNE, ANNONCES_LISTE)
      expect(resultParis.estimations.rendementBrut!).toBeLessThan(resultProvince.estimations.rendementBrut!)
    })

    it('le rendement est cohérent avec le loyer estimé', () => {
      for (const annonce of ANNONCES_LISTE) {
        const result = calculerScorePro(annonce, ANNONCES_LISTE)
        const loyer = result.estimations.loyerMensuelEstime!
        const rendement = result.estimations.rendementBrut!
        const rendementCalcule = Math.round(((loyer * 12) / annonce.prix) * 100 * 10) / 10
        expect(rendement).toBe(rendementCalcule)
      }
    })
  })

  describe('Coût énergie annuel', () => {
    it('DPE A coûte moins cher que DPE G', () => {
      const resultA = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
      const resultG = calculerScorePro(PASSOIRE_ENERGETIQUE, ANNONCES_LISTE)
      expect(resultA.estimations.coutEnergieAnnuel!).toBeLessThan(resultG.estimations.coutEnergieAnnuel!)
    })

    it('le coût énergie est cohérent avec le barème ADEME', () => {
      // DPE A, 72m² → 5 × 72 = 360 €/an
      const resultA = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
      expect(resultA.estimations.coutEnergieAnnuel).toBe(Math.round(COUT_ENERGIE_M2_AN.A * 72))

      // DPE G, 50m² → 38 × 50 = 1900 €/an
      const resultG = calculerScorePro(PASSOIRE_ENERGETIQUE, ANNONCES_LISTE)
      expect(resultG.estimations.coutEnergieAnnuel).toBe(Math.round(COUT_ENERGIE_M2_AN.G * 50))

      // DPE B, 67m² → 8 × 67 = 536 €/an
      const resultB = calculerScorePro(ANNONCE_SCREENSHOT, [ANNONCE_SCREENSHOT])
      expect(resultB.estimations.coutEnergieAnnuel).toBe(Math.round(COUT_ENERGIE_M2_AN.B * 67))
    })

    it('le coût énergie est toujours un entier positif', () => {
      for (const annonce of ANNONCES_LISTE) {
        const result = calculerScorePro(annonce, ANNONCES_LISTE)
        expect(result.estimations.coutEnergieAnnuel!).toBeGreaterThan(0)
        expect(Number.isInteger(result.estimations.coutEnergieAnnuel!)).toBe(true)
      }
    })
  })

  describe('Budget travaux estimé', () => {
    it('un bien DPE B sans année → 0 € de travaux (inférence récent)', () => {
      const result = calculerScorePro(ANNONCE_SCREENSHOT, [ANNONCE_SCREENSHOT])
      expect(result.estimations.budgetTravauxEstime).toBeUndefined() // 0 → undefined dans le result
    })

    it('un bien neuf 2024 DPE A → 0 € de travaux', () => {
      const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
      expect(result.estimations.budgetTravauxEstime).toBeUndefined()
    })

    it('un bien DPE F de 1965 → budget travaux conséquent', () => {
      const result = calculerScorePro(MAISON_PROVINCE_ANCIENNE, ANNONCES_LISTE)
      // 1965 → coutM2 = 150 (pré-RT) + DPE F → +200 = 350 €/m² × 120m² = 42 000 €
      expect(result.estimations.budgetTravauxEstime).toBeDefined()
      expect(result.estimations.budgetTravauxEstime!).toBeGreaterThanOrEqual(35000)
      expect(result.estimations.budgetTravauxEstime!).toBeLessThanOrEqual(50000)
    })

    it('un bien DPE G de 1960 → gros travaux', () => {
      const result = calculerScorePro(PASSOIRE_ENERGETIQUE, ANNONCES_LISTE)
      // 1960 → coutM2 = 150 (pré-75) + DPE G → +300 = 450 €/m² × 50m² = 22 500 €
      expect(result.estimations.budgetTravauxEstime).toBeDefined()
      expect(result.estimations.budgetTravauxEstime!).toBeGreaterThanOrEqual(20000)
      expect(result.estimations.budgetTravauxEstime!).toBeLessThanOrEqual(25000)
    })

    it('DPE NC sans année → fallback prudent > 0', () => {
      const result = calculerScorePro(ANNONCE_MINIMALE, [ANNONCE_MINIMALE])
      // Ni bon DPE ni année → 80 €/m² × 60m² = 4 800 € (composante vétusté seulement, DPE NC pas de surcoût energy)
      expect(result.estimations.budgetTravauxEstime).toBeDefined()
      expect(result.estimations.budgetTravauxEstime!).toBeGreaterThan(0)
    })

    it('le budget travaux ne dépasse jamais le prix du bien', () => {
      for (const annonce of ANNONCES_LISTE) {
        const result = calculerScorePro(annonce, ANNONCES_LISTE)
        if (result.estimations.budgetTravauxEstime) {
          expect(result.estimations.budgetTravauxEstime).toBeLessThan(annonce.prix)
        }
      }
    })
  })
})

// ============================================
// TESTS : POINTS D'ANALYSE
// ============================================

describe('Points d\'analyse', () => {
  it('chaque point a un texte non vide', () => {
    for (const annonce of ANNONCES_LISTE) {
      const result = calculerScorePro(annonce, ANNONCES_LISTE)
      for (const point of result.points) {
        expect(point.texte.length, `Point vide pour ${annonce.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('chaque point a un type valide', () => {
    for (const annonce of ANNONCES_LISTE) {
      const result = calculerScorePro(annonce, ANNONCES_LISTE)
      for (const point of result.points) {
        expect(['avantage', 'attention', 'conseil']).toContain(point.type)
      }
    }
  })

  it('une passoire DPE G génère un point d\'attention énergie', () => {
    const result = calculerScorePro(PASSOIRE_ENERGETIQUE, ANNONCES_LISTE)
    const attentionsEnergie = result.points.filter(
      p => p.axe === 'energie' && p.type === 'attention'
    )
    expect(attentionsEnergie.length).toBeGreaterThanOrEqual(1)
    expect(attentionsEnergie[0].texte).toContain('Passoire')
  })

  it('un bien neuf bien équipé génère des points avantage', () => {
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    const avantages = result.points.filter(p => p.type === 'avantage')
    expect(avantages.length).toBeGreaterThanOrEqual(2)
  })

  it('un DPE NC génère un conseil "demandez le diagnostic"', () => {
    const result = calculerScorePro(ANNONCE_MINIMALE, [ANNONCE_MINIMALE])
    const conseilsDpe = result.points.filter(p => p.axe === 'energie' && p.type === 'conseil')
    expect(conseilsDpe.length).toBeGreaterThanOrEqual(1)
  })

  it('étage 5 sans ascenseur génère une attention', () => {
    const result = calculerScorePro(PASSOIRE_ENERGETIQUE, ANNONCES_LISTE)
    const attentionsEquip = result.points.filter(
      p => p.axe === 'equipements' && p.type === 'attention'
    )
    expect(attentionsEquip.length).toBeGreaterThanOrEqual(1)
    expect(attentionsEquip[0].texte).toContain('sans ascenseur')
  })

  it('budget qui dépasse génère un point attention', () => {
    const result = calculerScorePro(APPART_PARIS_PREMIUM, ANNONCES_LISTE, undefined, 400000)
    const attentionsBudget = result.points.filter(
      p => p.texte.includes('budget') || p.texte.includes('Dépasse')
    )
    expect(attentionsBudget.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================
// TESTS : CONFIANCE
// ============================================

describe('Indice de confiance', () => {
  it('confiance est entre 0 et 100', () => {
    for (const annonce of ANNONCES_LISTE) {
      const result = calculerScorePro(annonce, ANNONCES_LISTE)
      expect(result.confiance).toBeGreaterThanOrEqual(0)
      expect(result.confiance).toBeLessThanOrEqual(100)
    }
  })

  it('un bien avec toutes les données a une confiance > 50%', () => {
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    // Sans enrichies DVF/Géo/OSM : prixMarche, emplacement, risques, plusValue indisponibles → 6/10 = 60%
    expect(result.confiance).toBeGreaterThanOrEqual(50)
  })

  it('avec données enrichies la confiance monte', () => {
    const enrichi: DonneesEnrichiesScoring = {
      marche: { success: true, ecartPrixM2: -5, verdict: 'bon', prixM2MedianMarche: 4000 },
      risques: { success: true, scoreRisque: 80, verdict: 'sûr' },
      quartier: { success: true, scoreQuartier: 70, transports: 8, commerces: 7, ecoles: 6, sante: 5, espaceVerts: 6 },
    }
    const sansDonnees = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    const avecDonnees = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE, enrichi)
    expect(avecDonnees.confiance).toBeGreaterThan(sansDonnees.confiance)
  })
})

// ============================================
// TESTS : DONNÉES ENRICHIES (DVF, Géorisques, OSM)
// ============================================

describe('Données enrichies', () => {
  it('un bon écart DVF (-15%) augmente le score prixMarche', () => {
    const enrichi: DonneesEnrichiesScoring = {
      marche: { success: true, ecartPrixM2: -15, verdict: 'excellent', prixM2MedianMarche: 5500 },
    }
    const sans = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    const avec = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE, enrichi)
    const axePSans = sans.axes.find(a => a.axe === 'prixMarche')!
    const axePAvec = avec.axes.find(a => a.axe === 'prixMarche')!
    expect(axePAvec.disponible).toBe(true)
    expect(axePAvec.score).toBeGreaterThan(axePSans.score)
  })

  it('un mauvais écart DVF (+25%) pénalise le score', () => {
    const enrichi: DonneesEnrichiesScoring = {
      marche: { success: true, ecartPrixM2: 25, verdict: 'tres_cher', prixM2MedianMarche: 3500 },
    }
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE, enrichi)
    const axeP = result.axes.find(a => a.axe === 'prixMarche')!
    expect(axeP.score).toBeLessThan(40)
  })

  it('une zone inondable pénalise l\'axe risques', () => {
    const enrichi: DonneesEnrichiesScoring = {
      risques: { success: true, scoreRisque: 40, verdict: 'risqué', zoneInondable: true },
    }
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE, enrichi)
    const axeR = result.axes.find(a => a.axe === 'risques')!
    expect(axeR.score).toBeLessThan(40)
    expect(result.points.some(p => p.texte.includes('inondable'))).toBe(true)
  })

  it('un bon score quartier booste l\'emplacement', () => {
    const enrichi: DonneesEnrichiesScoring = {
      quartier: { success: true, scoreQuartier: 85, transports: 9, commerces: 8, ecoles: 7, sante: 6, espaceVerts: 7 },
    }
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE, enrichi)
    const axeE = result.axes.find(a => a.axe === 'emplacement')!
    expect(axeE.disponible).toBe(true)
    expect(axeE.score).toBeGreaterThanOrEqual(75)
  })
})

// ============================================
// TESTS : SYNTHÈSE MULTI-ANNONCES
// ============================================

describe('Synthèse multi-annonces', () => {
  it('génère un classement cohérent', () => {
    const resultats = ANNONCES_LISTE.map(a => calculerScorePro(a, ANNONCES_LISTE))
    const synthese = genererSyntheseComparaison(resultats)
    
    expect(synthese.classement).toHaveLength(ANNONCES_LISTE.length)
    // Le rang 1 a le meilleur score
    const rang1 = synthese.classement.find(c => c.rang === 1)!
    for (const c of synthese.classement) {
      expect(rang1.scoreGlobal).toBeGreaterThanOrEqual(c.scoreGlobal)
    }
  })

  it('les rangs sont uniques de 1 à N', () => {
    const resultats = ANNONCES_LISTE.map(a => calculerScorePro(a, ANNONCES_LISTE))
    const synthese = genererSyntheseComparaison(resultats)
    const rangs = synthese.classement.map(c => c.rang).sort()
    expect(rangs).toEqual([1, 2, 3, 4])
  })

  it('la synthèse contient du texte', () => {
    const resultats = ANNONCES_LISTE.map(a => calculerScorePro(a, ANNONCES_LISTE))
    const synthese = genererSyntheseComparaison(resultats)
    expect(synthese.syntheseGlobale.length).toBeGreaterThan(10)
    expect(synthese.conseilGeneral.length).toBeGreaterThan(10)
  })

  it('un seul bien produit quand même une synthèse', () => {
    const resultats = [calculerScorePro(APPART_NEUF_NANTES, [APPART_NEUF_NANTES])]
    const synthese = genererSyntheseComparaison(resultats)
    expect(synthese.classement).toHaveLength(1)
    expect(synthese.classement[0].rang).toBe(1)
    expect(synthese.syntheseGlobale).toContain('/100')
  })

  it('liste vide ne crash pas', () => {
    const synthese = genererSyntheseComparaison([])
    expect(synthese.syntheseGlobale).toBe('')
    expect(synthese.classement).toHaveLength(0)
  })
})

// ============================================
// TESTS : RADAR CHART
// ============================================

describe('Radar chart data', () => {
  it('retourne 6 axes pour le radar', () => {
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    const radar = scoreToRadarData(result)
    expect(radar).toHaveLength(6)
  })

  it('chaque valeur radar est entre 0 et 100', () => {
    for (const annonce of ANNONCES_LISTE) {
      const result = calculerScorePro(annonce, ANNONCES_LISTE)
      const radar = scoreToRadarData(result)
      for (const item of radar) {
        expect(item.value, `Radar ${item.label}`).toBeGreaterThanOrEqual(0)
        expect(item.value, `Radar ${item.label}`).toBeLessThanOrEqual(100)
      }
    }
  })

  it('les labels radar correspondent aux axes attendus', () => {
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE)
    const radar = scoreToRadarData(result)
    const labels = radar.map(r => r.label)
    expect(labels).toEqual(['prix', 'quartier', 'risques', 'energie', 'confort', 'budget'])
  })
})

// ============================================
// TESTS : CONSTANTES
// ============================================

describe('Constantes', () => {
  it('les poids totalisent 100', () => {
    const total = Object.values(POIDS_AXES).reduce((sum, p) => sum + p, 0)
    expect(total).toBe(100)
  })

  it('chaque axe a un label', () => {
    const axes = Object.keys(POIDS_AXES)
    for (const axe of axes) {
      expect(LABELS_AXES[axe as keyof typeof LABELS_AXES]).toBeDefined()
      expect(LABELS_AXES[axe as keyof typeof LABELS_AXES].length).toBeGreaterThan(0)
    }
  })

  it('les coûts énergie ADEME sont croissants de A à G', () => {
    const classes: ClasseDPE[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    for (let i = 0; i < classes.length - 1; i++) {
      expect(COUT_ENERGIE_M2_AN[classes[i]]).toBeLessThan(COUT_ENERGIE_M2_AN[classes[i + 1]])
    }
  })
})

// ============================================
// TESTS : CAS EDGE
// ============================================

describe('Cas limites', () => {
  it('prix = 0 ne crash pas', () => {
    const annonce = creerAnnonce({ prix: 0 })
    expect(() => calculerScorePro(annonce, [annonce])).not.toThrow()
  })

  it('surface = 0 ne crash pas', () => {
    const annonce = creerAnnonce({ surface: 0 })
    expect(() => calculerScorePro(annonce, [annonce])).not.toThrow()
  })

  it('une seule annonce dans la liste ne crash pas', () => {
    const result = calculerScorePro(APPART_NEUF_NANTES, [APPART_NEUF_NANTES])
    expect(result.scoreGlobal).toBeGreaterThanOrEqual(0)
    expect(result.axes).toHaveLength(10)
  })

  it('DPE NC est géré', () => {
    const result = calculerScorePro(ANNONCE_MINIMALE, [ANNONCE_MINIMALE])
    expect(result.scoreGlobal).toBeGreaterThanOrEqual(0)
    expect(result.estimations.coutEnergieAnnuel).toBeDefined()
  })

  it('code postal DOM-TOM fonctionne', () => {
    const annonce = creerAnnonce({ codePostal: '97100', ville: 'Pointe-à-Pitre' })
    const result = calculerScorePro(annonce, [annonce])
    expect(result.estimations.loyerMensuelEstime).toBeGreaterThan(0)
  })

  it('enrichi avec success=false est ignoré correctement', () => {
    const enrichi: DonneesEnrichiesScoring = {
      marche: { success: false },
      risques: { success: false },
      quartier: { success: false },
    }
    const result = calculerScorePro(APPART_NEUF_NANTES, ANNONCES_LISTE, enrichi)
    const axePrix = result.axes.find(a => a.axe === 'prixMarche')!
    expect(axePrix.disponible).toBe(false)
  })

  it('conseilPerso n\'est jamais vide', () => {
    for (const annonce of [...ANNONCES_LISTE, ANNONCE_MINIMALE, ANNONCE_SCREENSHOT]) {
      const result = calculerScorePro(annonce, ANNONCES_LISTE)
      expect(result.conseilPerso.length).toBeGreaterThan(0)
    }
  })

  it('annonce screenshot Vitry DPE B → pas de budget travaux + score correct', () => {
    const result = calculerScorePro(ANNONCE_SCREENSHOT, [ANNONCE_SCREENSHOT])
    // DPE B sans année → inféré 2012 → 0 travaux
    expect(result.estimations.budgetTravauxEstime).toBeUndefined()
    // Bien équipé (balcon + parking + cave) + DPE B + Sud → score décent
    expect(result.scoreGlobal).toBeGreaterThanOrEqual(55)
    expect(result.verdict).not.toBe('Peu recommandé')
  })
})
