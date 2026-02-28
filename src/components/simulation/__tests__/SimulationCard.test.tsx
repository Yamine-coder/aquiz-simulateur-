/**
 * Tests unitaires pour le composant SimulationCard
 */
import type { SavedSimulation } from '@/types/simulation-save'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SimulationCard } from '../SimulationCard'

/** Factory pour créer une simulation de test */
function createMockSimulation(overrides: Partial<SavedSimulation> = {}): SavedSimulation {
  return {
    id: 'test-123',
    mode: 'A',
    etape: 'profil',
    status: 'en_cours',
    savedAt: '2026-02-01T10:00:00.000Z',
    profil: {
      situationFoyer: 'celibataire',
      salaire1: 3000,
      salaire2: 0,
      autresRevenus: 0,
      chargesCredits: 0,
      chargesPension: 0,
      enfants: 0,
    },
    ...overrides,
  }
}

describe('SimulationCard', () => {
  it('affiche le mode A avec le titre correct', () => {
    const sim = createMockSimulation({ mode: 'A' })
    render(<SimulationCard simulation={sim} onDelete={vi.fn()} onRestore={vi.fn()} />)
    
    expect(screen.getByText("Ma capacité d'achat")).toBeInTheDocument()
    expect(screen.getByText('Mode A')).toBeInTheDocument()
  })

  it('affiche le mode B avec le titre correct', () => {
    const sim = createMockSimulation({ mode: 'B', etape: '1' })
    render(<SimulationCard simulation={sim} onDelete={vi.fn()} onRestore={vi.fn()} />)
    
    expect(screen.getByText('Puis-je acheter ce bien ?')).toBeInTheDocument()
    expect(screen.getByText('Mode B')).toBeInTheDocument()
  })

  it('affiche "Terminée" avec un badge vert pour une simulation complète', () => {
    const sim = createMockSimulation({
      status: 'terminee',
      resultats: { capaciteAchat: 350000, mensualite: 1200, tauxEndettement: 30, prixAchatMax: 350000 },
    })
    render(<SimulationCard simulation={sim} onDelete={vi.fn()} onRestore={vi.fn()} />)
    
    expect(screen.getByText('Terminée')).toBeInTheDocument()
  })

  it('affiche le label de l\'étape en cours pour Mode A', () => {
    const sim = createMockSimulation({ etape: 'simulation', status: 'en_cours' })
    render(<SimulationCard simulation={sim} onDelete={vi.fn()} onRestore={vi.fn()} />)
    
    expect(screen.getByText('Simulation')).toBeInTheDocument()
  })

  it('affiche les revenus pour Mode A', () => {
    const sim = createMockSimulation({
      profil: {
        situationFoyer: 'couple',
        salaire1: 3000,
        salaire2: 2500,
        autresRevenus: 200,
        chargesCredits: 0,
        chargesPension: 0,
        enfants: 1,
      },
    })
    render(<SimulationCard simulation={sim} onDelete={vi.fn()} onRestore={vi.fn()} />)
    
    // 3000 + 2500 + 200 = 5 700
    expect(screen.getByText(/5\s*700\s*€\/mois/)).toBeInTheDocument()
  })

  it('affiche le prix du bien pour Mode B', () => {
    const sim = createMockSimulation({
      mode: 'B',
      etape: '2',
      modeBData: { prixBien: 280000, ville: 'Paris', codePostal: '75015' },
    })
    render(<SimulationCard simulation={sim} onDelete={vi.fn()} onRestore={vi.fn()} />)
    
    expect(screen.getByText(/280\s*000\s*€/)).toBeInTheDocument()
  })

  it('affiche la capacité d\'achat pour une simulation terminée Mode A', () => {
    const sim = createMockSimulation({
      status: 'terminee',
      resultats: { capaciteAchat: 350000, mensualite: 1200, tauxEndettement: 30, prixAchatMax: 350000 },
    })
    render(<SimulationCard simulation={sim} onDelete={vi.fn()} onRestore={vi.fn()} />)
    
    expect(screen.getByText(/350\s*000\s*€/)).toBeInTheDocument()
  })

  it('appelle onRestore au clic sur "Reprendre"', async () => {
    const user = userEvent.setup()
    const onRestore = vi.fn()
    const sim = createMockSimulation()
    render(<SimulationCard simulation={sim} onDelete={vi.fn()} onRestore={onRestore} />)
    
    await user.click(screen.getByRole('button', { name: /reprendre/i }))
    expect(onRestore).toHaveBeenCalledOnce()
  })

  it('appelle onRestore avec le texte "Revoir" pour une simulation terminée', async () => {
    const user = userEvent.setup()
    const onRestore = vi.fn()
    const sim = createMockSimulation({ status: 'terminee', resultats: { capaciteAchat: 300000, mensualite: 1000, tauxEndettement: 28, prixAchatMax: 300000 } })
    render(<SimulationCard simulation={sim} onDelete={vi.fn()} onRestore={onRestore} />)
    
    await user.click(screen.getByRole('button', { name: /revoir/i }))
    expect(onRestore).toHaveBeenCalledOnce()
  })

  it('appelle onDelete au clic sur le bouton supprimer', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const sim = createMockSimulation()
    render(<SimulationCard simulation={sim} onDelete={onDelete} onRestore={vi.fn()} />)
    
    // Bouton poubelle (dernier bouton)
    const deleteBtn = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-trash-2'))
    expect(deleteBtn).toBeDefined()
    if (deleteBtn) {
      await user.click(deleteBtn)
      expect(onDelete).toHaveBeenCalledOnce()
    }
  })

  it('affiche la date de sauvegarde formatée', () => {
    const sim = createMockSimulation({ savedAt: '2026-02-15T14:30:00.000Z' })
    render(<SimulationCard simulation={sim} onDelete={vi.fn()} onRestore={vi.fn()} />)
    
    // La date formatée en fr-FR
    expect(screen.getByText(/15 févr/)).toBeInTheDocument()
  })
})
