import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup après chaque test
afterEach(() => {
  cleanup()
})

// Mock de la config simulateur pour les tests
vi.mock('@/config/simulateur.config', () => ({
  SIMULATEUR_CONFIG: {
    tauxEndettementMax: 0.35,
    tauxEndettementAlerte: 0.33,
    fraisNotaireNeuf: 0.025,
    fraisNotaireAncien: 0.08,
    resteAVivre: {
      celibataire: 800,
      couple: 1200,
      parEnfant: 300
    },
    tauxAssurance: 0.0034,
    dureeMin: 5,
    dureeMax: 25
  }
}))
