/**
 * Tests unitaires - Calcul frais de notaire
 * Neuf: ~2.5% | Ancien: ~8%
 */
import {
    calculerFraisNotaire,
    calculerPrixMaxPourBudget
} from '@/lib/calculs/fraisNotaire'
import { describe, expect, it } from 'vitest'

describe('calculerFraisNotaire', () => {
  describe('bien ancien', () => {
    it('calcule ~8% pour un bien ancien', () => {
      const { fraisNotaire, tauxApplique } = calculerFraisNotaire(200000, 'ancien')
      
      expect(tauxApplique).toBe(0.08)
      expect(fraisNotaire).toBe(16000) // 200000 * 0.08
    })

    it('calcule pour un bien à 300k€', () => {
      const { fraisNotaire } = calculerFraisNotaire(300000, 'ancien')
      expect(fraisNotaire).toBe(24000)
    })

    it('fournit un détail des frais', () => {
      const { detail } = calculerFraisNotaire(200000, 'ancien')
      
      expect(detail.droitsMutation).toBeGreaterThan(0)
      expect(detail.emoluments).toBeGreaterThan(0)
      expect(detail.debours).toBeGreaterThan(0)
    })
  })

  describe('bien neuf', () => {
    it('calcule ~2.5% pour un bien neuf', () => {
      const { fraisNotaire, tauxApplique } = calculerFraisNotaire(200000, 'neuf')
      
      expect(tauxApplique).toBe(0.025)
      expect(fraisNotaire).toBe(5000) // 200000 * 0.025
    })

    it('calcule pour un bien à 350k€', () => {
      const { fraisNotaire } = calculerFraisNotaire(350000, 'neuf')
      expect(fraisNotaire).toBe(8750) // 350000 * 0.025
    })
  })

  describe('cas limites', () => {
    it('retourne 0 pour un prix nul', () => {
      const { fraisNotaire, tauxApplique } = calculerFraisNotaire(0, 'ancien')
      
      expect(fraisNotaire).toBe(0)
      expect(tauxApplique).toBe(0)
    })

    it('retourne 0 pour un prix négatif', () => {
      const { fraisNotaire } = calculerFraisNotaire(-100000, 'neuf')
      expect(fraisNotaire).toBe(0)
    })
  })

  describe('comparaison neuf vs ancien', () => {
    it('le neuf a moins de frais que l\'ancien', () => {
      const prixBien = 250000
      const fraisNeuf = calculerFraisNotaire(prixBien, 'neuf')
      const fraisAncien = calculerFraisNotaire(prixBien, 'ancien')

      expect(fraisNeuf.fraisNotaire).toBeLessThan(fraisAncien.fraisNotaire)
      // Différence significative (environ 5.5% d'écart)
      expect(fraisAncien.fraisNotaire - fraisNeuf.fraisNotaire).toBeGreaterThan(10000)
    })
  })
})

describe('calculerPrixMaxPourBudget', () => {
  it('calcule le prix max pour un budget donné (ancien)', () => {
    // Budget 216000€, frais 8%
    // Prix max = 216000 / 1.08 = 200000€
    const prixMax = calculerPrixMaxPourBudget(216000, 'ancien')
    expect(prixMax).toBe(200000)
  })

  it('calcule le prix max pour un budget donné (neuf)', () => {
    // Budget 205000€, frais 2.5%
    // Prix max = 205000 / 1.025 = 200000€
    const prixMax = calculerPrixMaxPourBudget(205000, 'neuf')
    expect(prixMax).toBe(200000)
  })

  it('est cohérent avec calculerFraisNotaire', () => {
    const budget = 300000
    const typeBien = 'ancien'

    const prixMax = calculerPrixMaxPourBudget(budget, typeBien)
    const { fraisNotaire } = calculerFraisNotaire(prixMax, typeBien)

    // Prix + frais doit être proche du budget
    expect(Math.abs(prixMax + fraisNotaire - budget)).toBeLessThan(100)
  })

  it('retourne 0 pour budget nul', () => {
    expect(calculerPrixMaxPourBudget(0, 'ancien')).toBe(0)
  })

  it('retourne une valeur négative pour budget négatif (edge case)', () => {
    // Note: la fonction ne valide pas les entrées négatives
    // Ce test documente le comportement actuel
    const result = calculerPrixMaxPourBudget(-10000, 'neuf')
    expect(result).toBeLessThan(0)
  })
})
