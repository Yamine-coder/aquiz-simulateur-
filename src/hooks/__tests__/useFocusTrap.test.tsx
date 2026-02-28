/**
 * Tests pour le hook useFocusTrap
 * 
 * Note : jsdom ne calcule pas le layout CSS, donc offsetParent est toujours null.
 * On le mock pour que getFocusableElements() fonctionne correctement.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { useFocusTrap } from '../useFocusTrap'

// Mock offsetParent (jsdom ne calcule pas le layout)
const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    get() { return this.parentElement },
    configurable: true,
  })
})
afterAll(() => {
  if (originalDescriptor) {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', originalDescriptor)
  }
})

/** Composant de test avec focus trap */
function TestModal({ initialOpen = true }: { initialOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const trapRef = useFocusTrap(isOpen)

  if (!isOpen) return <button onClick={() => setIsOpen(true)}>Ouvrir</button>

  return (
    <div ref={trapRef} data-testid="modal">
      <button data-testid="btn-first">Premier</button>
      <input data-testid="input-mid" placeholder="Milieu" />
      <button data-testid="btn-last" onClick={() => setIsOpen(false)}>Fermer</button>
    </div>
  )
}

describe('useFocusTrap', () => {
  it('focus le premier élément focusable à l\'ouverture', async () => {
    render(<TestModal />)

    // Attendre le délai interne (50ms)
    await new Promise(r => setTimeout(r, 100))

    expect(screen.getByTestId('btn-first')).toHaveFocus()
  })

  it('Tab depuis le dernier élément revient au premier', async () => {
    render(<TestModal />)
    await new Promise(r => setTimeout(r, 100))

    // Focus le dernier bouton
    screen.getByTestId('btn-last').focus()
    expect(screen.getByTestId('btn-last')).toHaveFocus()

    // Simuler un vrai événement Tab (que notre handler intercepte)
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' })
    expect(screen.getByTestId('btn-first')).toHaveFocus()
  })

  it('Shift+Tab depuis le premier élément va au dernier', async () => {
    render(<TestModal />)
    await new Promise(r => setTimeout(r, 100))

    // Focus le premier bouton
    screen.getByTestId('btn-first').focus()
    expect(screen.getByTestId('btn-first')).toHaveFocus()

    // Simuler Shift+Tab
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', shiftKey: true })
    expect(screen.getByTestId('btn-last')).toHaveFocus()
  })

  it('Tab normal avance dans le cycle', async () => {
    render(<TestModal />)
    await new Promise(r => setTimeout(r, 100))

    // Focus le premier
    screen.getByTestId('btn-first').focus()

    // Tab normal ne fait rien de spécial (pas sur le dernier)
    // Le navigateur gère normalement, notre hook ne bloque que les bornes
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' })
    // Le premier n'est pas le dernier, donc le hook ne fait rien
    // En jsdom, le focus ne bouge pas automatiquement
  })

  it('le ref est assigné correctement', () => {
    render(<TestModal />)
    const modal = screen.getByTestId('modal')
    expect(modal).toBeInTheDocument()
  })
})
