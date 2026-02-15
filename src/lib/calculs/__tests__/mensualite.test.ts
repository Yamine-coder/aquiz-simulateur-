/**
 * Tests unitaires - Calcul mensualité de crédit
 * Formule d'annuité constante
 */
import {
    calculerCapitalDepuisMensualite,
    calculerCoutInterets,
    calculerMensualite,
    genererTableauAmortissement
} from '@/lib/calculs/mensualite'
import { describe, expect, it } from 'vitest'

describe('calculerMensualite', () => {
  it('calcule correctement pour un prêt standard (200k€, 3.5%, 20 ans)', () => {
    const mensualite = calculerMensualite(200000, 0.035, 20)
    // Valeur attendue ~1159€
    expect(mensualite).toBeGreaterThan(1150)
    expect(mensualite).toBeLessThan(1170)
  })

  it('calcule correctement pour un prêt court (100k€, 4%, 10 ans)', () => {
    const mensualite = calculerMensualite(100000, 0.04, 10)
    // Valeur attendue ~1012€
    expect(mensualite).toBeGreaterThan(1000)
    expect(mensualite).toBeLessThan(1025)
  })

  it('calcule correctement pour un prêt long (300k€, 3%, 25 ans)', () => {
    const mensualite = calculerMensualite(300000, 0.03, 25)
    // Valeur attendue ~1423€
    expect(mensualite).toBeGreaterThan(1410)
    expect(mensualite).toBeLessThan(1440)
  })

  it('retourne 0 si capital nul ou négatif', () => {
    expect(calculerMensualite(0, 0.035, 20)).toBe(0)
    expect(calculerMensualite(-100000, 0.035, 20)).toBe(0)
  })

  it('retourne 0 si durée nulle ou négative', () => {
    expect(calculerMensualite(200000, 0.035, 0)).toBe(0)
    expect(calculerMensualite(200000, 0.035, -5)).toBe(0)
  })

  it('gère le taux à 0% (PTZ)', () => {
    // 120000€ sur 15 ans à 0%
    // Mensualité = 120000 / (15 * 12) = 666.67€
    const mensualite = calculerMensualite(120000, 0, 15)
    expect(mensualite).toBe(667) // Arrondi
  })

  it('gère les taux élevés', () => {
    // Taux 8%
    const mensualite = calculerMensualite(150000, 0.08, 15)
    expect(mensualite).toBeGreaterThan(1400)
    expect(mensualite).toBeLessThan(1500)
  })
})

describe('calculerCapitalDepuisMensualite', () => {
  it('calcule le capital pour une mensualité donnée', () => {
    // Mensualité 1200€, taux 3.5%, durée 20 ans
    const capital = calculerCapitalDepuisMensualite(1200, 0.035, 20)
    // Environ 207k€
    expect(capital).toBeGreaterThan(200000)
    expect(capital).toBeLessThan(210000)
  })

  it('est cohérent avec calculerMensualite (aller-retour)', () => {
    const capitalOriginal = 200000
    const taux = 0.035
    const duree = 20

    const mensualite = calculerMensualite(capitalOriginal, taux, duree)
    const capitalRecalcule = calculerCapitalDepuisMensualite(mensualite, taux, duree)

    // Tolérance de 100€ due aux arrondis
    expect(Math.abs(capitalRecalcule - capitalOriginal)).toBeLessThan(100)
  })

  it('retourne 0 si mensualité nulle ou négative', () => {
    expect(calculerCapitalDepuisMensualite(0, 0.035, 20)).toBe(0)
    expect(calculerCapitalDepuisMensualite(-500, 0.035, 20)).toBe(0)
  })

  it('retourne 0 si durée nulle', () => {
    expect(calculerCapitalDepuisMensualite(1000, 0.035, 0)).toBe(0)
  })
})

describe('calculerCoutInterets', () => {
  it('calcule le coût des intérêts', () => {
    const capital = 200000
    const taux = 0.035
    const duree = 20

    const mensualite = calculerMensualite(capital, taux, duree)
    const coutInterets = calculerCoutInterets(capital, mensualite, duree)

    // Coût intérêts = total remboursé - capital
    const totalRembourse = mensualite * duree * 12
    expect(Math.abs(coutInterets - (totalRembourse - capital))).toBeLessThan(10)
  })

  it('coût intérêts proche de 0 si taux 0% (arrondi)', () => {
    const capital = 100000
    const mensualite = calculerMensualite(capital, 0, 15)
    const coutInterets = calculerCoutInterets(capital, mensualite, 15)
    // Peut avoir un petit écart dû aux arrondis de mensualité
    expect(Math.abs(coutInterets)).toBeLessThan(100)
  })
})

describe('genererTableauAmortissement', () => {
  it('génère le bon nombre de lignes', () => {
    const tableau = genererTableauAmortissement(100000, 0.03, 10)
    expect(tableau).toHaveLength(10 * 12) // 120 mois
  })

  it('la dernière ligne a un capital restant proche de 0', () => {
    const tableau = genererTableauAmortissement(100000, 0.03, 10)
    const derniereLigne = tableau[tableau.length - 1]
    expect(derniereLigne.capitalRestant).toBeLessThan(10) // Arrondi
  })

  it('le total du capital remboursé égale le capital emprunté', () => {
    const capital = 150000
    const tableau = genererTableauAmortissement(capital, 0.035, 15)
    const totalCapitalRembourse = tableau.reduce((sum, ligne) => sum + ligne.capital, 0)
    
    // Tolérance d'arrondi
    expect(Math.abs(totalCapitalRembourse - capital)).toBeLessThan(10)
  })

  it('les intérêts diminuent au fil du temps', () => {
    const tableau = genererTableauAmortissement(200000, 0.04, 20)
    const premierMois = tableau[0]
    const dernierMois = tableau[tableau.length - 1]
    
    expect(premierMois.interets).toBeGreaterThan(dernierMois.interets)
  })
})
