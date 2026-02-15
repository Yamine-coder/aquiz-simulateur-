/**
 * Tests unitaires - Calcul capacité d'emprunt
 */
import {
    calculerCapaciteEmprunt,
    calculerCapacitesParDuree
} from '@/lib/calculs/capaciteEmprunt'
import { describe, expect, it } from 'vitest'

describe('calculerCapaciteEmprunt', () => {
  it('calcule la capacité pour un profil standard', () => {
    const result = calculerCapaciteEmprunt({
      revenusNets: 4000,
      chargesMensuelles: 200,
      dureeAns: 20,
      tauxAnnuel: 0.035
    })

    // Mensualité max = 4000 * 0.35 - 200 = 1200€
    expect(result.mensualiteMax).toBe(1200)
    
    // Capacité ~207k€ pour 1200€/mois sur 20 ans à 3.5%
    expect(result.capacite).toBeGreaterThan(200000)
    expect(result.capacite).toBeLessThan(215000)
  })

  it('capacité plus élevée avec une durée plus longue', () => {
    const result20ans = calculerCapaciteEmprunt({
      revenusNets: 4000,
      chargesMensuelles: 0,
      dureeAns: 20,
      tauxAnnuel: 0.035
    })

    const result25ans = calculerCapaciteEmprunt({
      revenusNets: 4000,
      chargesMensuelles: 0,
      dureeAns: 25,
      tauxAnnuel: 0.035
    })

    expect(result25ans.capacite).toBeGreaterThan(result20ans.capacite)
  })

  it('capacité plus faible avec un taux plus élevé', () => {
    const resultBas = calculerCapaciteEmprunt({
      revenusNets: 4000,
      chargesMensuelles: 0,
      dureeAns: 20,
      tauxAnnuel: 0.03
    })

    const resultHaut = calculerCapaciteEmprunt({
      revenusNets: 4000,
      chargesMensuelles: 0,
      dureeAns: 20,
      tauxAnnuel: 0.05
    })

    expect(resultBas.capacite).toBeGreaterThan(resultHaut.capacite)
  })

  it('retourne 0 si revenus insuffisants', () => {
    const result = calculerCapaciteEmprunt({
      revenusNets: 1000,
      chargesMensuelles: 500, // Déjà 50% d'endettement
      dureeAns: 20,
      tauxAnnuel: 0.035
    })

    expect(result.mensualiteMax).toBe(0) // 1000 * 0.35 - 500 = -150 → 0
    expect(result.capacite).toBe(0)
  })

  it('accepte un taux d\'endettement personnalisé', () => {
    const result = calculerCapaciteEmprunt({
      revenusNets: 4000,
      chargesMensuelles: 0,
      dureeAns: 20,
      tauxAnnuel: 0.035,
      tauxEndettementMax: 0.30 // 30% au lieu de 35%
    })

    // Mensualité max = 4000 * 0.30 = 1200€
    expect(result.mensualiteMax).toBe(1200)
  })
})

describe('calculerCapacitesParDuree', () => {
  it('retourne des capacités pour plusieurs durées', () => {
    const capacites = calculerCapacitesParDuree(4000, 0, 0.035)

    expect(capacites.length).toBeGreaterThan(0)
    expect(capacites[0]).toHaveProperty('dureeAns')
    expect(capacites[0]).toHaveProperty('capacite')
    expect(capacites[0]).toHaveProperty('mensualite')
  })

  it('la capacité augmente avec la durée', () => {
    const capacites = calculerCapacitesParDuree(4000, 0, 0.035)

    for (let i = 1; i < capacites.length; i++) {
      expect(capacites[i].capacite).toBeGreaterThanOrEqual(capacites[i - 1].capacite)
    }
  })

  it('la mensualité est constante (max 35%)', () => {
    const capacites = calculerCapacitesParDuree(4000, 0, 0.035)
    const mensualiteMax = 4000 * 0.35 // 1400€

    for (const cap of capacites) {
      expect(cap.mensualite).toBe(mensualiteMax)
    }
  })
})
