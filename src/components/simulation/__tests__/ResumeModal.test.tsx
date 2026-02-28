/**
 * Tests unitaires pour le composant ResumeModal
 * Vérifie l'accessibilité (focus trap, aria, dialog role)
 */
import type { SavedSimulation } from '@/types/simulation-save'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResumeModal } from '../ResumeModal'

function createMockSimulation(overrides: Partial<SavedSimulation> = {}): SavedSimulation {
  return {
    id: 'resume-test',
    mode: 'A',
    etape: 'simulation',
    status: 'en_cours',
    savedAt: new Date().toISOString(),
    profil: {
      situationFoyer: 'celibataire',
      salaire1: 3500,
      salaire2: 0,
      autresRevenus: 0,
      chargesCredits: 0,
      chargesPension: 0,
      enfants: 0,
    },
    ...overrides,
  }
}

describe('ResumeModal', () => {
  it('a le role dialog et aria-modal', () => {
    const sim = createMockSimulation()
    render(<ResumeModal simulation={sim} onResume={vi.fn()} onNew={vi.fn()} />)
    
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('a un titre accessible via aria-labelledby', () => {
    const sim = createMockSimulation()
    render(<ResumeModal simulation={sim} onResume={vi.fn()} onNew={vi.fn()} />)
    
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'resume-modal-title')
    
    const title = document.getElementById('resume-modal-title')
    expect(title).toBeInTheDocument()
    expect(title?.textContent).toContain('simulation')
  })

  it('affiche "Reprendre" pour une simulation en cours', () => {
    const sim = createMockSimulation({ status: 'en_cours' })
    render(<ResumeModal simulation={sim} onResume={vi.fn()} onNew={vi.fn()} />)
    
    expect(screen.getByText('Reprendre votre simulation ?')).toBeInTheDocument()
    expect(screen.getByText('Reprendre la simulation')).toBeInTheDocument()
  })

  it('affiche "Revoir" pour une simulation terminée', () => {
    const sim = createMockSimulation({ status: 'terminee' })
    render(<ResumeModal simulation={sim} onResume={vi.fn()} onNew={vi.fn()} />)
    
    expect(screen.getByText('Revoir votre simulation ?')).toBeInTheDocument()
    expect(screen.getByText('Revoir les résultats')).toBeInTheDocument()
  })

  it('affiche les revenus pour Mode A', () => {
    const sim = createMockSimulation({
      profil: {
        situationFoyer: 'celibataire',
        salaire1: 4000,
        salaire2: 0,
        autresRevenus: 500,
        chargesCredits: 0,
        chargesPension: 0,
        enfants: 0,
      },
    })
    render(<ResumeModal simulation={sim} onResume={vi.fn()} onNew={vi.fn()} />)
    
    // 4000 + 500 = 4 500
    expect(screen.getByText(/4\s*500\s*€/)).toBeInTheDocument()
  })

  it('affiche la progression correcte', () => {
    const sim = createMockSimulation({ etape: 'simulation' })
    render(<ResumeModal simulation={sim} onResume={vi.fn()} onNew={vi.fn()} />)
    
    // étape 'simulation' = 2/3 = 67%
    expect(screen.getByText('67%')).toBeInTheDocument()
  })

  it('affiche 100% pour une simulation terminée', () => {
    const sim = createMockSimulation({ status: 'terminee' })
    render(<ResumeModal simulation={sim} onResume={vi.fn()} onNew={vi.fn()} />)
    
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('appelle onResume au clic sur le bouton principal', async () => {
    const user = userEvent.setup()
    const onResume = vi.fn()
    const sim = createMockSimulation()
    render(<ResumeModal simulation={sim} onResume={onResume} onNew={vi.fn()} />)
    
    await user.click(screen.getByText('Reprendre la simulation'))
    expect(onResume).toHaveBeenCalledOnce()
  })

  it('appelle onNew au clic sur "Nouvelle simulation"', async () => {
    const user = userEvent.setup()
    const onNew = vi.fn()
    const sim = createMockSimulation()
    render(<ResumeModal simulation={sim} onResume={vi.fn()} onNew={onNew} />)
    
    await user.click(screen.getByText('Nouvelle simulation'))
    expect(onNew).toHaveBeenCalledOnce()
  })

  it('a un bouton fermer avec aria-label', () => {
    const sim = createMockSimulation()
    render(<ResumeModal simulation={sim} onResume={vi.fn()} onNew={vi.fn()} />)
    
    const closeBtn = screen.getByLabelText('Fermer la modale')
    expect(closeBtn).toBeInTheDocument()
  })

  it('affiche Mode B correctement', () => {
    const sim = createMockSimulation({
      mode: 'B',
      etape: '2',
      modeBData: { prixBien: 300000, ville: 'Paris', codePostal: '75015' },
    })
    render(<ResumeModal simulation={sim} onResume={vi.fn()} onNew={vi.fn()} />)
    
    expect(screen.getByText('Mode B')).toBeInTheDocument()
    expect(screen.getByText('Vérification de faisabilité')).toBeInTheDocument()
  })
})
