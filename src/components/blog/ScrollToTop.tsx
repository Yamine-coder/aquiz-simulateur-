'use client'

import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * Floating button that scrolls back to the top of the page.
 * Appears after scrolling down 400px.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 lg:bottom-8 right-4 z-50 w-10 h-10 rounded-full bg-gray-950 text-white shadow-lg shadow-black/10 flex items-center justify-center hover:bg-aquiz-green transition-colors duration-300 animate-in fade-in slide-in-from-bottom-2"
      aria-label="Retour en haut"
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  )
}

/**
 * Inline scroll-to-top button for use in mobile bottom bars.
 */
export function MobileScrollTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-aquiz-green hover:text-white transition-colors"
      aria-label="Retour en haut"
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  )
}
