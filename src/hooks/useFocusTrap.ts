'use client'

import { useEffect, useRef } from 'react'

/**
 * Hook de focus trap pour les modales
 * Piège le focus à l'intérieur de la modale quand elle est ouverte.
 * 
 * - Tab / Shift+Tab cycle entre les éléments focusables
 * - Focus automatique sur le premier élément focusable à l'ouverture
 * - Restaure le focus sur l'élément déclencheur à la fermeture
 */
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Sauvegarder l'élément actif avant ouverture
    previousActiveElement.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    // Sélecteurs d'éléments focusables
    const FOCUSABLE_SELECTORS = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    /** Retourne les éléments focusables dans le container */
    function getFocusableElements(): HTMLElement[] {
      if (!container) return []
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))
        .filter(el => el.offsetParent !== null) // Exclure les éléments invisibles
    }

    // Focus le premier élément focusable après un court délai (animation)
    const focusTimer = setTimeout(() => {
      const focusable = getFocusableElements()
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        // Si pas d'éléments focusables, focus le container lui-même
        container.setAttribute('tabindex', '-1')
        container.focus()
      }
    }, 50)

    /** Gestion du clavier : Tab piégé dans la modale */
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      const focusable = getFocusableElements()
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        // Shift+Tab : si on est sur le premier, aller au dernier
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab : si on est sur le dernier, aller au premier
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)

      // Restaurer le focus à la fermeture
      if (previousActiveElement.current && previousActiveElement.current.isConnected) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen])

  return containerRef
}
