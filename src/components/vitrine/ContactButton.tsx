'use client'

import { Mail } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Bouton "Nous contacter" qui scroll vers la section #contact de la homepage.
 * Fonctionne depuis n'importe quelle page (cross-page navigation).
 */
export function ContactButton({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleClick = () => {
    if (pathname === '/') {
      // Déjà sur la homepage → scroll direct
      const el = document.getElementById('contact')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else {
      // Autre page → naviguer vers / puis scroll
      router.push('/')
      const poll = () => {
        const el = document.getElementById('contact')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        } else {
          requestAnimationFrame(poll)
        }
      }
      setTimeout(poll, 150)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className ?? 'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aquiz-black text-white text-xs font-semibold hover:bg-aquiz-black/90 transition-colors'}
    >
      <Mail className="w-3.5 h-3.5" />
      Nous contacter
    </button>
  )
}
