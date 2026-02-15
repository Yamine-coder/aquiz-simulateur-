/**
 * Tests unitaires - Calcul reste à vivre
 * Minimums réglementaires: 800€ célibataire, 1200€ couple, +300€/enfant
 */
import {
    calculerResteAVivre,
    calculerResteAVivreMinimum,
    verifierResteAVivre
} from '@/lib/calculs/resteAVivre'
import { describe, expect, it } from 'vitest'

describe('calculerResteAVivre', () => {
  it('calcule correctement le reste à vivre', () => {
    // Revenus 4000€, charges 200€, mensualité 1200€
    // RAV = 4000 - 200 - 1200 = 2600€
    const rav = calculerResteAVivre({
      revenusNets: 4000,
      chargesMensuelles: 200,
      mensualiteProjet: 1200
    })
    expect(rav).toBe(2600)
  })

  it('gère le cas sans charges', () => {
    const rav = calculerResteAVivre({
      revenusNets: 3500,
      chargesMensuelles: 0,
      mensualiteProjet: 1000
    })
    expect(rav).toBe(2500)
  })

  it('peut retourner une valeur négative', () => {
    const rav = calculerResteAVivre({
      revenusNets: 2000,
      chargesMensuelles: 500,
      mensualiteProjet: 2000
    })
    expect(rav).toBe(-500)
  })

  it('retourne les revenus si aucune charge ni mensualité', () => {
    const rav = calculerResteAVivre({
      revenusNets: 3000,
      chargesMensuelles: 0,
      mensualiteProjet: 0
    })
    expect(rav).toBe(3000)
  })
})

describe('calculerResteAVivreMinimum', () => {
  it('retourne 800€ pour un célibataire sans enfant', () => {
    const min = calculerResteAVivreMinimum({
      situationFoyer: 'celibataire',
      nombreEnfants: 0
    })
    expect(min).toBe(800)
  })

  it('retourne 1200€ pour un couple sans enfant', () => {
    const min = calculerResteAVivreMinimum({
      situationFoyer: 'couple',
      nombreEnfants: 0
    })
    expect(min).toBe(1200)
  })

  it('ajoute 300€ par enfant (célibataire)', () => {
    const min = calculerResteAVivreMinimum({
      situationFoyer: 'celibataire',
      nombreEnfants: 2
    })
    expect(min).toBe(1400) // 800 + 2*300
  })

  it('ajoute 300€ par enfant (couple)', () => {
    const min = calculerResteAVivreMinimum({
      situationFoyer: 'couple',
      nombreEnfants: 3
    })
    expect(min).toBe(2100) // 1200 + 3*300
  })

  it('gère un nombre négatif d\'enfants comme 0', () => {
    const min = calculerResteAVivreMinimum({
      situationFoyer: 'celibataire',
      nombreEnfants: -2
    })
    expect(min).toBe(800)
  })
})

describe('verifierResteAVivre', () => {
  it('valide un reste à vivre confortable', () => {
    // Célibataire sans enfant, RAV 1500€ (min 800€)
    const result = verifierResteAVivre(1500, 'celibataire', 0)
    
    expect(result.suffisant).toBe(true)
    expect(result.marge).toBe(700)
  })

  it('valide un couple avec marge', () => {
    // Couple 2 enfants, RAV 2000€ (min 1800€)
    const result = verifierResteAVivre(2000, 'couple', 2)
    
    expect(result.suffisant).toBe(true)
    expect(result.marge).toBe(200)
  })

  it('rejette un reste à vivre insuffisant', () => {
    // Célibataire, RAV 600€ (min 800€)
    const result = verifierResteAVivre(600, 'celibataire', 0)
    
    expect(result.suffisant).toBe(false)
    expect(result.marge).toBe(-200)
  })

  it('valide exactement le minimum', () => {
    // Couple sans enfant, RAV 1200€ (min 1200€)
    const result = verifierResteAVivre(1200, 'couple', 0)
    
    expect(result.suffisant).toBe(true)
    expect(result.marge).toBe(0)
  })

  it('calcule le déficit pour un reste à vivre négatif', () => {
    const result = verifierResteAVivre(-500, 'celibataire', 0)
    
    expect(result.suffisant).toBe(false)
    expect(result.marge).toBe(-1300) // -500 - 800 = -1300
  })
})
