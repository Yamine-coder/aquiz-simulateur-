'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

/**
 * Bouton flottant « remonter en haut » — apparaît après 1 écran de scroll.
 * Visible sur mobile ET desktop.
 * Remonté sur les pages article blog (barre fixe en bas sur mobile).
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)
  const pathname = usePathname()
  const isBlogArticle = pathname.startsWith('/blog/') && pathname !== '/blog/'

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
          className={`fixed right-4 sm:right-6 z-50 w-11 h-11 rounded-full bg-aquiz-black text-white shadow-lg shadow-black/20 flex items-center justify-center hover:bg-aquiz-green active:scale-95 transition-colors duration-300 ${isBlogArticle ? 'bottom-16 sm:bottom-6' : 'bottom-4 sm:bottom-6'}`}
        >
          <ArrowUp className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
