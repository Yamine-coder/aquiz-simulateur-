'use client'

import {
    ArrowLeft,
    Calculator,
    Gift,
    History,
    Map,
    Scale,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Barre de navigation partagée pour toute la partie application (simulateur).
 * Unifie toutes les sections : Simuler, Carte, Aides, Comparer, Historique.
 * Sticky en haut, design AQUIZ noir avec tabs actifs en blanc.
 */

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  /** Préfixe de pathname pour détecter l'état actif */
  match: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/simulateur', label: 'Simuler', icon: Calculator, match: '/simulateur' },
  { href: '/carte', label: 'Carte', icon: Map, match: '/carte' },
  { href: '/aides', label: 'Aides', icon: Gift, match: '/aides' },
  { href: '/comparateur', label: 'Comparer', icon: Scale, match: '/comparateur' },
  { href: '/mes-simulations', label: 'Historique', icon: History, match: '/mes-simulations' },
]

export function AppNavbar() {
  const pathname = usePathname()

  return (
    <header className="bg-aquiz-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* === Gauche : Retour accueil + Logo === */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Accueil</span>
          </Link>
          <span className="w-px h-5 bg-white/10" />
          <Link href="/simulateur" className="flex items-center gap-2">
            <div className="w-8 h-8">
              <Image
                src="/image AQUIZ.jpeg"
                alt="AQUIZ"
                width={32}
                height={32}
                className="w-full h-full object-contain rounded-md"
                priority
              />
            </div>
            <span className="text-white font-bold text-sm tracking-tight hidden sm:inline">
              AQUIZ
            </span>
          </Link>
        </div>

        {/* === Centre/Droite : Navigation === */}
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.match)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${isActive
                    ? 'bg-white text-aquiz-black'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
