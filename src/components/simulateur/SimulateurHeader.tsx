'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface SimulateurHeaderProps {
  /** Contenu à droite (mode indicator, progression) */
  children?: React.ReactNode
}

/**
 * Header minimaliste pour les simulateurs
 * Design épuré avec gradient subtil et motif géométrique
 */
export function SimulateurHeader({ children }: SimulateurHeaderProps) {
  return (
    <header className="relative bg-aquiz-black overflow-hidden">
      {/* Gradient de fond subtil */}
      <div className="absolute inset-0 bg-linear-to-r from-aquiz-black via-aquiz-black-light to-aquiz-black" />
      
      {/* Motif géométrique discret */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ligne verte décorative en haut */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-transparent via-aquiz-green/30 to-transparent" />
        
        {/* Points lumineux subtils */}
        <div className="absolute top-1/2 left-[8%] -translate-y-1/2 w-32 h-32 bg-aquiz-green/5 rounded-full blur-[60px]" />
        <div className="absolute top-1/2 right-[8%] -translate-y-1/2 w-24 h-24 bg-aquiz-green/3 rounded-full blur-[40px]" />
      </div>

      {/* Contenu */}
      <div className="relative max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Retour simulateur */}
          <Link 
            href="/simulateur" 
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">Simulateur</span>
          </Link>

          {/* Mode + Actions */}
          {children}
        </div>
      </div>
    </header>
  )
}

