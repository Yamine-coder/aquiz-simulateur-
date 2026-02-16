'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Composant global qui scroll en haut de page à chaque changement de route.
 * À placer dans le layout racine ou les layouts de section.
 */
export function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
