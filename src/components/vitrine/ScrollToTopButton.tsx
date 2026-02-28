'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

/**
 * Bouton flottant « remonter en haut » — apparaît après 1 écran de scroll.
 * Visible sur mobile ET desktop.
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.button
          key="scroll-top"
          type="button"
          aria-label="Remonter en haut de page"
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-24 right-4 sm:bottom-8 sm:right-6 lg:bottom-10 lg:right-8 z-50 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-aquiz-black text-white shadow-lg shadow-black/20 flex items-center justify-center hover:bg-aquiz-green active:scale-95 transition-colors duration-300"
        >
          <ArrowUp className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
