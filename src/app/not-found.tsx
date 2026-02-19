import { Home, Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page introuvable — AQUIZ',
  description: 'La page que vous cherchez n\'existe pas ou a été déplacée.',
  robots: { index: false },
}

/**
 * Page 404 personnalisée AQUIZ
 * Design dark cohérent avec la charte graphique
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 géant */}
        <div className="relative mb-8">
          <span className="text-[10rem] sm:text-[14rem] font-black text-white/[0.03] leading-none select-none block">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#22c55e]/10 flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-[#22c55e]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Page introuvable
              </h1>
            </div>
          </div>
        </div>

        <p className="text-white/50 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
          Pas d&apos;inquiétude, votre projet immobilier est toujours entre de bonnes mains.
        </p>

        {/* Liens rapides */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#22c55e] text-[#1a1a1a] font-semibold text-sm hover:bg-[#16a34a] transition-colors"
          >
            <Home className="w-4 h-4" />
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/simulateur"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white font-medium text-sm hover:bg-white/5 transition-colors"
          >
            Accéder au simulateur
          </Link>
        </div>

        {/* Liens utiles */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-white/30">
          <Link href="/carte" className="hover:text-white/60 transition-colors">
            Carte des prix
          </Link>
          <span className="text-white/10">·</span>
          <Link href="/comparateur" className="hover:text-white/60 transition-colors">
            Comparateur
          </Link>
          <span className="text-white/10">·</span>
          <Link href="/aides" className="hover:text-white/60 transition-colors">
            Aides & PTZ
          </Link>
          <span className="text-white/10">·</span>
          <Link href="/a-propos" className="hover:text-white/60 transition-colors">
            À propos
          </Link>
        </div>

        {/* Branding */}
        <p className="mt-12 text-xs text-white/15">
          AQUIZ — Conseil en acquisition immobilière
        </p>
      </div>
    </div>
  )
}
