/**
 * Tests unitaires - Calcul taux d'endettement
 * Norme HCSF : max 35%
 */
import {
    calculerMensualiteMaximale,
    calculerTauxEndettement,
    verifierEndettement
} from '@/lib/calculs/endettement'
import { describe, expect, it } from 'vitest'

describe('calculerTauxEndettement', () => {
  it('calcule correctement le taux pour un cas standard', () => {
    // Revenus 3000€, charges 200€, mensualité projet 800€
    // Taux = (200 + 800) / 3000 = 33.33%
    const taux = calculerTauxEndettement(3000, 200, 800)
    expect(taux).toBeCloseTo(33.33, 1)
  })

  it('calcule 35% exactement (seuil HCSF)', () => {
    // Revenus 4000€, charges 0€, mensualité 1400€
    // Taux = 1400 / 4000 = 35%
    const taux = calculerTauxEndettement(4000, 0, 1400)
    expect(taux).toBe(35)
  })

  it('retourne 0 si revenus nuls ou négatifs', () => {
    expect(calculerTauxEndettement(0, 100, 500)).toBe(0)
    expect(calculerTauxEndettement(-1000, 100, 500)).toBe(0)
  })

  it('lance une erreur si charges négatives', () => {
    expect(() => calculerTauxEndettement(3000, -100, 500)).toThrow()
  })

  it('lance une erreur si mensualité négative', () => {
    expect(() => calculerTauxEndettement(3000, 100, -500)).toThrow()
  })

  it('gère le cas sans charges existantes', () => {
    const taux = calculerTauxEndettement(5000, 0, 1000)
    expect(taux).toBe(20) // 1000 / 5000 = 20%
  })

  it('gère le cas sans mensualité projet', () => {
    const taux = calculerTauxEndettement(5000, 500, 0)
    expect(taux).toBe(10) // 500 / 5000 = 10%
  })

  it('calcule un dépassement important', () => {
    // Revenus 2000€, charges 300€, mensualité 900€
    // Taux = 1200 / 2000 = 60%
    const taux = calculerTauxEndettement(2000, 300, 900)
    expect(taux).toBe(60)
  })
})

describe('verifierEndettement', () => {
  it('niveau "ok" pour taux confortable (< 33%)', () => {
    const result = verifierEndettement(30)
    expect(result.niveau).toBe('ok')
    expect(result.valide).toBe(true)
  })

  it('niveau "limite" pour taux entre 33% et 35%', () => {
    const result = verifierEndettement(34)
    expect(result.niveau).toBe('limite')
    expect(result.valide).toBe(true)
  })

  it('niveau "depassement" pour taux > 35%', () => {
    const result = verifierEndettement(40)
    expect(result.niveau).toBe('depassement')
    expect(result.valide).toBe(false)
    expect(result.depassement).toBe(5)
  })

  it('exactement 35% est valide', () => {
    const result = verifierEndettement(35)
    expect(result.valide).toBe(true)
    expect(result.niveau).toBe('limite')
  })

  it('exactement 33% est confortable', () => {
    const result = verifierEndettement(33)
    expect(result.valide).toBe(true)
    expect(result.niveau).toBe('ok')
  })
})

describe('calculerMensualiteMaximale', () => {
  it('calcule la mensualité max pour 35% d\'endettement', () => {
    // Revenus 4000€, charges 200€
    // Max = 4000 * 0.35 - 200 = 1400 - 200 = 1200€
    const max = calculerMensualiteMaximale(4000, 200)
    expect(max).toBe(1200)
  })

  it('calcule avec charges nulles', () => {
    // Revenus 3000€, charges 0€
    // Max = 3000 * 0.35 = 1050€
    const max = calculerMensualiteMaximale(3000, 0)
    expect(max).toBe(1050)
  })

  it('retourne 0 si charges > mensualité max possible', () => {
    // Revenus 2000€, charges 1000€
    // Max = 2000 * 0.35 - 1000 = 700 - 1000 = -300 → 0
    const max = calculerMensualiteMaximale(2000, 1000)
    expect(max).toBe(0)
  })

  it('retourne 0 si revenus nuls', () => {
    const max = calculerMensualiteMaximale(0, 200)
    expect(max).toBe(0)
  })

  it('accepte un taux personnalisé', () => {
    // Revenus 4000€, charges 0€, taux 30%
    // Max = 4000 * 0.30 = 1200€
    const max = calculerMensualiteMaximale(4000, 0, 0.30)
    expect(max).toBe(1200)
  })
})
