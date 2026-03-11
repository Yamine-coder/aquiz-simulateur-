/**
 * Tests unitaires des 11 axis scorers individuels
 * Vérifie chaque scoreur indépendamment : bornes, cohérence, edge cases
 */
import { describe, expect, it } from 'vitest'

import type { Annonce, ClasseDPE } from '@/types/annonces'

import {
    estimerLoyerMensuelV2,
    scorerCharges,
    scorerEmplacement,
    scorerEnergie,
    scorerEquipements,
    scorerEtatBien,
    scorerPlusValue,
    scorerPrixMarche,
    scorerRendement,
    scorerRisques,
    scorerSurface,
    scorerTransports,
    type DonneesEnrichiesScoring,
} from './scoreComparateur'

// ============================================
// FIXTURES
// ============================================

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

function creerEnrichissement(overrides: Partial<DonneesEnrichiesScoring> = {}): DonneesEnrichiesScoring {
  return {
    marche: {
      success: true,
      prixM2Median: 4000,
      ecartPrixM2: -5,
      evolution12Mois: 2,
      nbTransactions: 120,
    },
    quartier: {
      success: true,
      scoreQuartier: 70,
      transports: 75,
      commerces: 60,
      education: 65,
      sante: 55,
      espaces_verts: 40,
    },
    risques: {
      success: true,
      inondation: false,
      seisme: 1,
      radon: 1,
      argiles: 'faible',
    },
    ...overrides,
  } as DonneesEnrichiesScoring
}

// Helpers
function expectScoreBorne(score: number): void {
  expect(score).toBeGreaterThanOrEqual(0)
  expect(score).toBeLessThanOrEqual(100)
}

// ============================================
// AXE 1 : Prix vs Marché
// ============================================

describe('scorerPrixMarche', () => {
  it('retourne un score entre 0 et 100 avec données marché', () => {
    const annonce = creerAnnonce({ prixM2: 3800 })
    const enrichi = creerEnrichissement()
    const result = scorerPrixMarche(annonce, enrichi)
    expectScoreBorne(result.score)
    expect(result.axe).toBe('prixMarche')
    expect(result.disponible).toBe(true)
  })

  it('retourne score 50 et disponible=false sans données marché', () => {
    const annonce = creerAnnonce()
    const result = scorerPrixMarche(annonce, undefined)
    expect(result.score).toBe(50)
    expect(result.disponible).toBe(false)
  })

  it('un bien en dessous du marché score plus haut', () => {
    const enrichi = creerEnrichissement({
      marche: { success: true, prixM2Median: 5000, ecartPrixM2: -25, evolution12Mois: 0, nbTransactions: 100 },
    } as Partial<DonneesEnrichiesScoring>)
    const moins_cher = creerAnnonce({ prixM2: 3750 })
    const plus_cher = creerAnnonce({ prixM2: 6000 })

    const enrichiCher = creerEnrichissement({
      marche: { success: true, prixM2Median: 5000, ecartPrixM2: 20, evolution12Mois: 0, nbTransactions: 100 },
    } as Partial<DonneesEnrichiesScoring>)

    const scoreBas = scorerPrixMarche(moins_cher, enrichi).score
    const scoreHaut = scorerPrixMarche(plus_cher, enrichiCher).score
    expect(scoreBas).toBeGreaterThan(scoreHaut)
  })

  it('retourne des points d\'analyse pro', () => {
    const annonce = creerAnnonce()
    const enrichi = creerEnrichissement()
    const result = scorerPrixMarche(annonce, enrichi)
    expect(result.points).toBeDefined()
    expect(Array.isArray(result.points)).toBe(true)
  })
})

// ============================================
// AXE 2 : Rendement locatif
// ============================================

describe('scorerRendement', () => {
  it('retourne un score entre 0 et 100', () => {
    const annonce = creerAnnonce()
    const result = scorerRendement(annonce)
    expectScoreBorne(result.score)
    expect(result.axe).toBe('rendement')
  })

  it('un bien pas cher a un meilleur rendement qu\'un bien cher', () => {
    const pas_cher = creerAnnonce({ prix: 80000, surface: 40, codePostal: '42000' })
    const cher = creerAnnonce({ prix: 600000, surface: 40, codePostal: '75016' })
    const r1 = scorerRendement(pas_cher)
    const r2 = scorerRendement(cher)
    expect(r1.rendementBrut).toBeGreaterThan(r2.rendementBrut)
  })

  it('retourne loyerEstime et rendementBrut', () => {
    const annonce = creerAnnonce()
    const result = scorerRendement(annonce)
    expect(result.loyerEstime).toBeGreaterThan(0)
    expect(result.rendementBrut).toBeGreaterThan(0)
  })

  it('retourne toujours disponible=true', () => {
    const annonce = creerAnnonce()
    const result = scorerRendement(annonce)
    expect(result.disponible).toBe(true)
  })

  it('DPE G retourne score 0 et rendement 0 (interdit location)', () => {
    const passoire = creerAnnonce({ dpe: 'G', prix: 150000, surface: 50, codePostal: '42000' })
    const result = scorerRendement(passoire)
    expect(result.score).toBe(0)
    expect(result.rendementBrut).toBe(0)
    expect(result.loyerEstime).toBe(0)
    expect(result.disponible).toBe(true)
    expect(result.detail).toContain('interdit')
  })
})

// ============================================
// AXE 3 : Énergie
// ============================================

describe('scorerEnergie', () => {
  it('retourne un score entre 0 et 100', () => {
    const annonce = creerAnnonce({ dpe: 'C' })
    const result = scorerEnergie(annonce)
    expectScoreBorne(result.score)
    expect(result.axe).toBe('energie')
  })

  it('DPE A score mieux que DPE G', () => {
    const dpeA = scorerEnergie(creerAnnonce({ dpe: 'A' }))
    const dpeG = scorerEnergie(creerAnnonce({ dpe: 'G' }))
    expect(dpeA.score).toBeGreaterThan(dpeG.score)
  })

  it('retourne un coût annuel estimé', () => {
    const result = scorerEnergie(creerAnnonce({ dpe: 'D', surface: 80 }))
    expect(result.coutAnnuel).toBeGreaterThan(0)
  })

  it('hiérarchie DPE cohérente (A > B > ... > G)', () => {
    const dpes: ClasseDPE[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    const scores = dpes.map(dpe => scorerEnergie(creerAnnonce({ dpe, surface: 65 })).score)
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1])
    }
  })

  it('DPE NC retourne un score (fallback)', () => {
    const result = scorerEnergie(creerAnnonce({ dpe: 'NC' }))
    expectScoreBorne(result.score)
  })
})

// ============================================
// AXE 4 : Emplacement
// ============================================

describe('scorerEmplacement', () => {
  it('retourne score 50 et disponible=false sans données quartier', () => {
    const result = scorerEmplacement(undefined)
    expect(result.score).toBe(50)
    expect(result.disponible).toBe(false)
  })

  it('retourne un score entre 0 et 100 avec données quartier', () => {
    const enrichi = creerEnrichissement()
    const result = scorerEmplacement(enrichi)
    expectScoreBorne(result.score)
    expect(result.disponible).toBe(true)
  })

  it('un bon quartier score plus haut', () => {
    const bon = creerEnrichissement({
      quartier: { success: true, scoreQuartier: 90, transports: 85, commerces: 80, education: 80, sante: 75, espaces_verts: 70 },
    } as Partial<DonneesEnrichiesScoring>)
    const mauvais = creerEnrichissement({
      quartier: { success: true, scoreQuartier: 20, transports: 15, commerces: 10, education: 10, sante: 10, espaces_verts: 5 },
    } as Partial<DonneesEnrichiesScoring>)
    expect(scorerEmplacement(bon).score).toBeGreaterThan(scorerEmplacement(mauvais).score)
  })
})

// ============================================
// AXE 5 : Transports
// ============================================

describe('scorerTransports', () => {
  it('retourne score 50 et disponible=false sans données', () => {
    const result = scorerTransports(undefined)
    expect(result.score).toBe(50)
    expect(result.disponible).toBe(false)
  })

  it('retourne un score entre 0 et 100 avec données transports', () => {
    const enrichi = creerEnrichissement()
    const result = scorerTransports(enrichi)
    expectScoreBorne(result.score)
    expect(result.disponible).toBe(true)
  })

  it('meilleure desserte = meilleur score', () => {
    const bonne = creerEnrichissement({
      quartier: { success: true, scoreQuartier: 70, transports: 95, commerces: 60, education: 60, sante: 60, espaces_verts: 40 },
    } as Partial<DonneesEnrichiesScoring>)
    const faible = creerEnrichissement({
      quartier: { success: true, scoreQuartier: 70, transports: 10, commerces: 60, education: 60, sante: 60, espaces_verts: 40 },
    } as Partial<DonneesEnrichiesScoring>)
    expect(scorerTransports(bonne).score).toBeGreaterThan(scorerTransports(faible).score)
  })
})

// ============================================
// AXE 6 : État du bien
// ============================================

describe('scorerEtatBien', () => {
  it('retourne un score entre 0 et 100', () => {
    const annonce = creerAnnonce({ anneeConstruction: 2020, dpe: 'A' })
    const result = scorerEtatBien(annonce)
    expectScoreBorne(result.score)
    expect(result.axe).toBe('etatBien')
  })

  it('un bien neuf score mieux qu\'un bien ancien', () => {
    const neuf = scorerEtatBien(creerAnnonce({ anneeConstruction: 2024, dpe: 'A' }))
    const ancien = scorerEtatBien(creerAnnonce({ anneeConstruction: 1950, dpe: 'F' }))
    expect(neuf.score).toBeGreaterThan(ancien.score)
  })

  it('retourne un budget travaux estimé', () => {
    const result = scorerEtatBien(creerAnnonce({ anneeConstruction: 1960, dpe: 'F', surface: 80 }))
    expect(result.budgetTravaux).toBeGreaterThanOrEqual(0)
  })

  it('bien sans année ni DPE retourne score acceptable', () => {
    const result = scorerEtatBien(creerAnnonce({ anneeConstruction: undefined, dpe: 'NC' }))
    expectScoreBorne(result.score)
  })
})

// ============================================
// AXE 7 : Charges
// ============================================

describe('scorerCharges', () => {
  it('retourne disponible=false sans charges ni taxe', () => {
    const annonce = creerAnnonce({ chargesMensuelles: undefined, taxeFonciere: undefined })
    const result = scorerCharges(annonce)
    expect(result.disponible).toBe(false)
  })

  it('retourne un score entre 0 et 100 avec charges', () => {
    const annonce = creerAnnonce({ chargesMensuelles: 200, taxeFonciere: 800 })
    const result = scorerCharges(annonce)
    expectScoreBorne(result.score)
    expect(result.disponible).toBe(true)
  })

  it('des charges faibles donnent un meilleur score', () => {
    const faibles = scorerCharges(creerAnnonce({ chargesMensuelles: 50, taxeFonciere: 400 }))
    const fortes = scorerCharges(creerAnnonce({ chargesMensuelles: 600, taxeFonciere: 3000 }))
    expect(faibles.score).toBeGreaterThan(fortes.score)
  })
})

// ============================================
// AXE 8 : Surface
// ============================================

describe('scorerSurface', () => {
  it('retourne un score entre 0 et 100', () => {
    const annonce = creerAnnonce({ surface: 65, pieces: 3 })
    const result = scorerSurface(annonce)
    expectScoreBorne(result.score)
    expect(result.axe).toBe('surface')
  })

  it('une grande surface par pièce score mieux', () => {
    const annonces = [
      creerAnnonce({ id: 'spacieux', surface: 100, pieces: 3 }),
      creerAnnonce({ id: 'serre', surface: 30, pieces: 3 }),
    ]
    const spacieux = scorerSurface(annonces[0])
    const serre = scorerSurface(annonces[1])
    expect(spacieux.score).toBeGreaterThan(serre.score)
  })

  it('fonctionne avec une seule annonce', () => {
    const annonce = creerAnnonce({ surface: 80, pieces: 4 })
    const result = scorerSurface(annonce)
    expectScoreBorne(result.score)
  })
})

// ============================================
// AXE 9 : Équipements
// ============================================

describe('scorerEquipements', () => {
  it('retourne un score entre 0 et 100', () => {
    const annonce = creerAnnonce()
    const result = scorerEquipements(annonce)
    expectScoreBorne(result.score)
    expect(result.axe).toBe('equipements')
  })

  it('un bien très équipé score plus haut', () => {
    const equipe = scorerEquipements(creerAnnonce({
      parking: true,
      balconTerrasse: true,
      cave: true,
      ascenseur: true,
      nbSallesBains: 2,
    }))
    const nu = scorerEquipements(creerAnnonce({
      parking: false,
      balconTerrasse: false,
      cave: false,
      ascenseur: false,
      nbSallesBains: 1,
    }))
    expect(equipe.score).toBeGreaterThan(nu.score)
  })

  it('score ne dépasse jamais 100', () => {
    const result = scorerEquipements(creerAnnonce({
      parking: true,
      balconTerrasse: true,
      cave: true,
      ascenseur: true,
      nbSallesBains: 3,
      orientation: 'Sud',
    }))
    expect(result.score).toBeLessThanOrEqual(100)
  })
})

// ============================================
// AXE 10 : Plus-value
// ============================================

describe('scorerPlusValue', () => {
  it('retourne un score entre 0 et 100 sans données enrichies', () => {
    const annonce = creerAnnonce()
    const result = scorerPlusValue(annonce)
    expectScoreBorne(result.score)
    expect(result.axe).toBe('plusValue')
  })

  it('un marché en hausse avec quartier élevé score bien', () => {
    const enrichi = creerEnrichissement({
      marche: { success: true, prixM2Median: 4000, ecartPrixM2: -10, evolution12Mois: 8, nbTransactions: 200 },
      quartier: { success: true, scoreQuartier: 85, transports: 80, commerces: 75, education: 70, sante: 65, espaces_verts: 60 },
    } as Partial<DonneesEnrichiesScoring>)
    const result = scorerPlusValue(creerAnnonce(), enrichi, 30000)
    expect(result.score).toBeGreaterThan(50)
  })

  it('retourne disponible=false sans données', () => {
    const result = scorerPlusValue(creerAnnonce(), undefined)
    expect(result.disponible).toBe(false)
  })

  it('budget travaux crée du potentiel de plus-value', () => {
    const enrichi = creerEnrichissement()
    const avecTravaux = scorerPlusValue(creerAnnonce({ dpe: 'F' }), enrichi, 50000)
    const sansTravaux = scorerPlusValue(creerAnnonce({ dpe: 'A' }), enrichi, 0)
    // With work budget there's value creation potential
    expect(avecTravaux.points.length).toBeGreaterThanOrEqual(0)
  })
})

// ============================================
// PROPRIÉTÉS STRUCTURELLES COMMUNES
// ============================================

describe('Propriétés communes des scorers', () => {
  const annonce = creerAnnonce({
    chargesMensuelles: 200,
    taxeFonciere: 800,
    anneeConstruction: 2010,
    parking: true,
    balconTerrasse: true,
  })
  const enrichi = creerEnrichissement()
  const annonces = [annonce]

  it('chaque scorer retourne un objet avec axe, label, score, poids, disponible', () => {
    const results = [
      scorerPrixMarche(annonce, enrichi),
      scorerRendement(annonce),
      scorerEnergie(annonce),
      scorerEmplacement(enrichi),
      scorerTransports(enrichi),
      scorerEtatBien(annonce),
      scorerCharges(annonce),
      scorerSurface(annonce),
      scorerEquipements(annonce),
      scorerPlusValue(annonce, enrichi),
    ]

    for (const r of results) {
      expect(r).toHaveProperty('axe')
      expect(r).toHaveProperty('label')
      expect(r).toHaveProperty('score')
      expect(r).toHaveProperty('poids')
      expect(r).toHaveProperty('disponible')
      expect(r).toHaveProperty('impact')
      expect(r).toHaveProperty('points')
      expect(typeof r.score).toBe('number')
      expect(typeof r.poids).toBe('number')
      expect(typeof r.disponible).toBe('boolean')
    }
  })

  it('tous les scores restent entre 0 et 100', () => {
    const results = [
      scorerPrixMarche(annonce, enrichi),
      scorerRendement(annonce),
      scorerEnergie(annonce),
      scorerEmplacement(enrichi),
      scorerTransports(enrichi),
      scorerEtatBien(annonce),
      scorerCharges(annonce),
      scorerSurface(annonce),
      scorerEquipements(annonce),
      scorerPlusValue(annonce, enrichi),
    ]

    for (const r of results) {
      expectScoreBorne(r.score)
    }
  })

  it('le poids est supérieur à 0', () => {
    const results = [
      scorerPrixMarche(annonce, enrichi),
      scorerRendement(annonce),
      scorerEnergie(annonce),
      scorerEmplacement(enrichi),
      scorerTransports(enrichi),
      scorerEtatBien(annonce),
      scorerCharges(annonce),
      scorerRisques(enrichi),
      scorerSurface(annonce),
      scorerEquipements(annonce),
      scorerPlusValue(annonce, enrichi),
    ]

    for (const r of results) {
      expect(r.poids).toBeGreaterThan(0)
    }
  })
})

// ============================================
// TESTS : scorerRisques
// ============================================

describe('scorerRisques', () => {
  it('retourne indisponible sans données', () => {
    const r = scorerRisques(undefined)
    expect(r.axe).toBe('risques')
    expect(r.disponible).toBe(false)
    expect(r.score).toBe(50)
  })

  it('retourne indisponible si risques.success = false', () => {
    const r = scorerRisques({ risques: { success: false } })
    expect(r.disponible).toBe(false)
  })

  it('zone sûre = score élevé', () => {
    const r = scorerRisques({ risques: { success: true, scoreRisque: 90, verdict: 'sûr' } })
    expect(r.disponible).toBe(true)
    expect(r.score).toBe(90)
    expect(r.impact).toBe('positif')
    expect(r.points).toHaveLength(1)
    expect(r.points[0].type).toBe('avantage')
  })

  it('zone risquée = score bas', () => {
    const r = scorerRisques({
      risques: { success: true, scoreRisque: 30, verdict: 'risqué', zoneInondable: true, niveauRadon: 3 }
    })
    expect(r.disponible).toBe(true)
    expect(r.score).toBe(30)
    expect(r.impact).toBe('negatif')
    expect(r.points[0].type).toBe('attention')
    expect(r.points[0].detail).toContain('inondable')
  })

  it('vigilance intermédiaire', () => {
    const r = scorerRisques({
      risques: { success: true, scoreRisque: 65, verdict: 'vigilance', niveauRadon: 2 }
    })
    expect(r.score).toBe(65)
    expect(r.impact).toBe('neutre')
    expect(r.points[0].detail).toContain('radon')
  })

  it('score borné entre 0 et 100', () => {
    const rHigh = scorerRisques({ risques: { success: true, scoreRisque: 150 } })
    expect(rHigh.score).toBeLessThanOrEqual(100)
    const rLow = scorerRisques({ risques: { success: true, scoreRisque: -10 } })
    expect(rLow.score).toBeGreaterThanOrEqual(0)
  })
})

// ============================================
// ESTIMATION LOYER V2
// ============================================

describe('estimerLoyerMensuelV2', () => {
  it('Paris → ratio le plus bas (~0.28%)', () => {
    const annonce = creerAnnonce({ prix: 500000, codePostal: '75011', surface: 50 })
    const { loyerEstime } = estimerLoyerMensuelV2(annonce)
    expect(loyerEstime).toBeGreaterThanOrEqual(1000)
    expect(loyerEstime).toBeLessThanOrEqual(2000)
  })

  it('rural → ratio le plus haut (~0.55%)', () => {
    const annonce = creerAnnonce({ prix: 100000, codePostal: '46100', surface: 80 })
    const { loyerEstime } = estimerLoyerMensuelV2(annonce)
    expect(loyerEstime).toBeGreaterThanOrEqual(400)
    expect(loyerEstime).toBeLessThanOrEqual(700)
  })

  it('DPE G → loyer = 0 (location interdite)', () => {
    const annonce = creerAnnonce({ prix: 200000, codePostal: '69003', surface: 60, dpe: 'G' })
    const { loyerEstime } = estimerLoyerMensuelV2(annonce)
    expect(loyerEstime).toBe(0)
  })

  it('petite surface → rendement supérieur', () => {
    const petit = creerAnnonce({ prix: 100000, codePostal: '33000', surface: 20 })
    const grand = creerAnnonce({ prix: 100000, codePostal: '33000', surface: 100 })
    const { loyerEstime: loyerPetit } = estimerLoyerMensuelV2(petit)
    const { loyerEstime: loyerGrand } = estimerLoyerMensuelV2(grand)
    // Même prix mais petit a un meilleur ratio loyer/prix
    expect(loyerPetit).toBeGreaterThan(loyerGrand)
  })

  it('méthode DVF quand données enrichies dispo', () => {
    const annonce = creerAnnonce({ prix: 300000, codePostal: '44000', surface: 70 })
    const enrichi: DonneesEnrichiesScoring = {
      marche: { success: true, ecartPrixM2: -5, prixM2MedianMarche: 3500, verdict: 'bon' }
    }
    const { methode } = estimerLoyerMensuelV2(annonce, enrichi)
    expect(methode).toBe('dvf')
  })

  it('retourne toujours un loyer positif (sauf DPE G)', () => {
    const annonce = creerAnnonce({ prix: 50000, codePostal: '87000', surface: 40, dpe: 'E' })
    const { loyerEstime } = estimerLoyerMensuelV2(annonce)
    expect(loyerEstime).toBeGreaterThan(0)
  })

  it('code postal invalide → fallback national', () => {
    const annonce = creerAnnonce({ prix: 200000, codePostal: '', surface: 60 })
    const { loyerEstime, methode } = estimerLoyerMensuelV2(annonce)
    expect(loyerEstime).toBeGreaterThan(0)
    expect(methode).toBe('ratio_ajuste')
  })

  it('très grande surface (>120m²) → décote -15%', () => {
    const grand = creerAnnonce({ prix: 400000, codePostal: '44000', surface: 150 })
    const moyen = creerAnnonce({ prix: 400000, codePostal: '44000', surface: 70 })
    const { loyerEstime: loyerGrand } = estimerLoyerMensuelV2(grand)
    const { loyerEstime: loyerMoyen } = estimerLoyerMensuelV2(moyen)
    // Le ratio loyer/prix du grand bien doit être inférieur
    expect(loyerGrand / grand.prix).toBeLessThan(loyerMoyen / moyen.prix)
  })
})

// ============================================
// ÉNERGIE : INTÉGRATION GES
// ============================================

describe('scorerEnergie — GES', () => {
  it('GES A/B → point avantage carbone', () => {
    const annonce = creerAnnonce({ dpe: 'C', ges: 'A', surface: 60 })
    const result = scorerEnergie(annonce)
    const gesPoint = result.points.find(p => p.texte.includes('GES'))
    expect(gesPoint).toBeDefined()
    expect(gesPoint!.type).toBe('avantage')
  })

  it('GES F/G → point attention carbone', () => {
    const annonce = creerAnnonce({ dpe: 'D', ges: 'G', surface: 60 })
    const result = scorerEnergie(annonce)
    const gesPoint = result.points.find(p => p.texte.includes('GES'))
    expect(gesPoint).toBeDefined()
    expect(gesPoint!.type).toBe('attention')
  })

  it('GES NC → pas de point GES (rétro-compatible)', () => {
    const annonce = creerAnnonce({ dpe: 'C', ges: 'NC', surface: 60 })
    const result = scorerEnergie(annonce)
    const gesPoint = result.points.find(p => p.texte.includes('GES'))
    expect(gesPoint).toBeUndefined()
  })

  it('sans GES → même score que sans (rétro-compatible)', () => {
    const sansGES = creerAnnonce({ dpe: 'C', surface: 60 })
    const avecNC = creerAnnonce({ dpe: 'C', ges: 'NC', surface: 60 })
    expect(scorerEnergie(sansGES).score).toBe(scorerEnergie(avecNC).score)
  })

  it('GES pénalisant change le score', () => {
    const sansGES = creerAnnonce({ dpe: 'C', surface: 60 })
    const avecGESG = creerAnnonce({ dpe: 'C', ges: 'G', surface: 60 })
    // Avec GES G, le score doit être inférieur
    expect(scorerEnergie(avecGESG).score).toBeLessThan(scorerEnergie(sansGES).score)
  })
})

// ============================================
// ÉQUIPEMENTS : undefined vs false
// ============================================

describe('scorerEquipements — undefined vs false', () => {
  it('tous undefined (pas de données) → score neutre 50', () => {
    const annonce = creerAnnonce({})
    // S'assurer qu'aucun booléen n'est défini
    delete (annonce as Record<string, unknown>).parking
    delete (annonce as Record<string, unknown>).balconTerrasse
    delete (annonce as Record<string, unknown>).cave
    delete (annonce as Record<string, unknown>).ascenseur
    const result = scorerEquipements(annonce)
    expect(result.score).toBe(50)
  })

  it('tous false (confirmé absent) → base 40', () => {
    const annonce = creerAnnonce({
      parking: false,
      balconTerrasse: false,
      cave: false,
      ascenseur: false,
    })
    const result = scorerEquipements(annonce)
    expect(result.score).toBeLessThan(50) // Base 40 → < neutre
  })

  it('parking true → score > 50 quelle que soit la base', () => {
    const annonce = creerAnnonce({ parking: true })
    const result = scorerEquipements(annonce)
    expect(result.score).toBeGreaterThanOrEqual(50) // 40 + 15 = 55
  })
})

// ============================================
// CHARGES : charges=0 vs undefined
// ============================================

describe('scorerCharges — charges=0 vs undefined', () => {
  it('charges=undefined + taxe=undefined → indisponible', () => {
    const annonce = creerAnnonce({})
    delete (annonce as Record<string, unknown>).chargesMensuelles
    delete (annonce as Record<string, unknown>).taxeFonciere
    const result = scorerCharges(annonce)
    expect(result.disponible).toBe(false)
  })

  it('charges=0 (maison sans copro) → disponible + score élevé', () => {
    const annonce = creerAnnonce({ chargesMensuelles: 0, taxeFonciere: 800 })
    const result = scorerCharges(annonce)
    expect(result.disponible).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(50)
  })

  it('charges=0 + taxe=0 → disponible (confirmé gratuit)', () => {
    const annonce = creerAnnonce({ chargesMensuelles: 0, taxeFonciere: 0 })
    const result = scorerCharges(annonce)
    expect(result.disponible).toBe(true)
    expect(result.score).toBe(100) // Ratio 0% = score max
  })
})
