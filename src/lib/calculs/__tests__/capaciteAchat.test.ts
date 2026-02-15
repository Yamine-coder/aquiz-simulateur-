/**
 * Tests unitaires - Calcul capacité d'achat globale
 */
import {
    calculerCapaciteAchatGlobale,
    verifierBienDansBudget
} from '@/lib/calculs/capaciteAchat'
import { describe, expect, it } from 'vitest'

describe('calculerCapaciteAchatGlobale', () => {
  it('calcule la capacité d\'achat pour un bien ancien', () => {
    const result = calculerCapaciteAchatGlobale({
      apport: 30000,
      capitalEmpruntable: 200000,
      typeBien: 'ancien'
    })

    // Budget total = 30000 + 200000 = 230000€
    expect(result.budgetTotal).toBe(230000)
    
    // Prix max = 230000 / 1.08 ≈ 212963€
    expect(result.capaciteAchatMax).toBeGreaterThan(210000)
    expect(result.capaciteAchatMax).toBeLessThan(215000)
    
    // Frais notaire ~8% du prix max
    expect(result.fraisNotaireEstimes).toBeGreaterThan(16000)
  })

  it('calcule la capacité d\'achat pour un bien neuf', () => {
    const result = calculerCapaciteAchatGlobale({
      apport: 30000,
      capitalEmpruntable: 200000,
      typeBien: 'neuf'
    })

    // Budget total identique
    expect(result.budgetTotal).toBe(230000)
    
    // Prix max plus élevé car frais moindres
    // Prix max = 230000 / 1.025 ≈ 224390€
    expect(result.capaciteAchatMax).toBeGreaterThan(220000)
    expect(result.capaciteAchatMax).toBeLessThan(230000)
  })

  it('neuf permet d\'acheter plus cher qu\'ancien', () => {
    const apport = 50000
    const emprunt = 250000

    const resultNeuf = calculerCapaciteAchatGlobale({
      apport,
      capitalEmpruntable: emprunt,
      typeBien: 'neuf'
    })

    const resultAncien = calculerCapaciteAchatGlobale({
      apport,
      capitalEmpruntable: emprunt,
      typeBien: 'ancien'
    })

    expect(resultNeuf.capaciteAchatMax).toBeGreaterThan(resultAncien.capaciteAchatMax)
  })

  it('sans apport, utilise uniquement l\'emprunt', () => {
    const result = calculerCapaciteAchatGlobale({
      apport: 0,
      capitalEmpruntable: 200000,
      typeBien: 'ancien'
    })

    expect(result.budgetTotal).toBe(200000)
    expect(result.capaciteAchatMax).toBeLessThan(200000)
  })

  it('gère un emprunt nul (achat comptant)', () => {
    const result = calculerCapaciteAchatGlobale({
      apport: 300000,
      capitalEmpruntable: 0,
      typeBien: 'neuf'
    })

    expect(result.budgetTotal).toBe(300000)
    expect(result.capaciteAchatMax).toBeGreaterThan(290000)
  })
})

describe('verifierBienDansBudget', () => {
  it('un bien dans le budget est accessible', () => {
    const result = verifierBienDansBudget(
      200000, // Prix du bien
      50000,  // Apport
      200000, // Capacité emprunt
      'ancien'
    )

    expect(result.accessible).toBe(true)
  })

  it('un bien trop cher n\'est pas accessible', () => {
    const result = verifierBienDansBudget(
      350000, // Prix du bien
      30000,  // Apport
      200000, // Capacité emprunt
      'ancien'
    )

    expect(result.accessible).toBe(false)
  })

  it('inclut les frais de notaire dans le calcul', () => {
    // Bien à 200000€ ancien, frais ~16000€
    // Budget nécessaire ~216000€
    const result = verifierBienDansBudget(
      200000,
      20000,  // Apport insuffisant
      190000, // Emprunt → total 210000€ < 216000€
      'ancien'
    )

    expect(result.accessible).toBe(false)
    expect(result.budgetNecessaire).toBeGreaterThan(210000)
  })

  it('retourne le budget nécessaire', () => {
    const result = verifierBienDansBudget(
      250000,
      30000,
      200000,
      'ancien'
    )

    // Budget nécessaire = 250000 * 1.08 = 270000€
    expect(result.budgetNecessaire).toBe(270000)
  })
})
