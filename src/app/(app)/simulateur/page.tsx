'use client'

import { FadeIn, StaggerContainer, StaggerItem } from '@/components/vitrine/Motion'
import {
    ArrowRight,
    CheckCircle,
    ChevronLeft,
    Clock,
    HelpCircle,
    Home,
    Wallet
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ModeOption {
  icon: typeof Wallet
  label: string
  title: string
  subtitle: string
  points: string[]
  duration: string
  href: string
  popular: boolean
}

const MODES: ModeOption[] = [
  {
    icon: Wallet,
    label: 'Mode A',
    title: 'Ce que je peux acheter',
    subtitle: 'Estimez votre capacité d’achat à partir de vos revenus, charges et apport.',
    points: ['Budget maximum', 'Mensualités', 'Taux d\'endettement'],
    duration: '3 min',
    href: '/simulateur/mode-a',
    popular: true,
  },
  {
    icon: Home,
    label: 'Mode B',
    title: 'Ce qu\u2019il me faut pour acheter',
    subtitle: 'Vérifiez rapidement si un bien précis est finançable dans votre situation.',
    points: ['Faisabilité', 'Revenus requis', 'Apport optimal'],
    duration: '2 min',
    href: '/simulateur/mode-b',
    popular: false,
  },
]

export default function SimulateurPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white">

      {/* ═══ Mobile back nav ═══ */}
      <div className="sm:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-12">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-aquiz-gray hover:text-aquiz-black transition-colors -ml-1"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Retour</span>
          </button>
          <span className="text-sm font-semibold text-aquiz-black absolute left-1/2 -translate-x-1/2">Simulateur</span>
          <div className="w-16" />
        </div>
      </div>

      {/* ═══ HERO — blanc, épuré ═══ */}
      <section className="pt-5 pb-4 sm:pt-8 sm:pb-5 md:pt-10 md:pb-6 lg:pt-12 lg:pb-8 border-b border-aquiz-gray-lighter">
        <div className="max-w-2xl mx-auto px-4 sm:px-5 text-center">
          <FadeIn>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-aquiz-black tracking-tight leading-tight">
              Simulateur immobilier{' '}
              <span className="text-aquiz-green">en ligne</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm md:text-base text-aquiz-gray-light max-w-lg mx-auto leading-relaxed">
              Calculez votre capacité d&apos;achat ou vérifiez la faisabilité d&apos;un bien. Conforme HCSF 2026, résultat en 2 minutes.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:gap-5 mt-3 text-[10px] sm:text-[11px] text-aquiz-gray-light">
              <span className="inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-aquiz-green" />
                100% gratuit
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-aquiz-green" />
                Sans inscription
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-aquiz-green" />
                Conforme normes bancaires
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ CARTES ═══ */}
      <section className="max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-8 md:py-10">

          <div className="relative">
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5" staggerDelay={0.1}>
              {MODES.map((mode) => {
                const Icon = mode.icon
                return (
                  <StaggerItem key={mode.href}>
                    <Link
                      href={mode.href}
                      className="group relative flex flex-col h-full rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-aquiz-green hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)] hover:-translate-y-1.5 active:scale-[0.985] transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-aquiz-green/[0.02] to-aquiz-green/[0.06] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      <div className="relative px-4 py-5 sm:px-5 sm:py-6 flex flex-col flex-1">
                        {/* ── Icône + Label + Titre centrés ── */}
                        <div className="flex flex-col items-center text-center mb-2.5">
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-aquiz-green/10 to-aquiz-green/5 group-hover:from-aquiz-green/20 group-hover:to-aquiz-green/10 flex items-center justify-center transition-all duration-300 mb-2.5 group-hover:scale-105 group-hover:shadow-md group-hover:shadow-aquiz-green/10">
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-aquiz-green/80 group-hover:text-aquiz-green transition-all duration-300 group-hover:scale-110" strokeWidth={1.5} />
                          </div>

                          <span className="text-[10px] font-bold text-aquiz-green uppercase tracking-widest">{mode.label}</span>
                          <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight mt-0.5 leading-snug">{mode.title}</h2>
                        </div>

                        {/* ── Description centrée ── */}
                        <p className="text-xs text-gray-500 leading-relaxed text-center">{mode.subtitle}</p>

                        {/* ── Tags centrés ── */}
                        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                          {mode.points.map((p) => (
                            <span key={p} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-gray-100 bg-gray-50/50 text-gray-600 font-medium group-hover:border-aquiz-green/25 group-hover:bg-aquiz-green/5 group-hover:text-gray-700 transition-all duration-300">
                              <CheckCircle className="w-2.5 h-2.5 text-aquiz-green flex-shrink-0" />
                              {p}
                            </span>
                          ))}
                        </div>

                        {/* ── Footer: durée + CTA ── */}
                        <div className="flex items-center justify-between pt-3.5 mt-auto">
                          <span className="flex items-center gap-1 text-[11px] text-gray-400 group-hover:text-gray-500 transition-colors duration-300">
                            <Clock className="w-3 h-3" />
                            {mode.duration}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-aquiz-green transition-all duration-300">
                            Commencer
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-aquiz-green/0 group-hover:bg-aquiz-green group-hover:text-white transition-all duration-300">
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-300" />
                            </span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </StaggerItem>
                )
              })}
            </StaggerContainer>

            {/* "ou" */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm ring-4 ring-white">
                <span className="text-[10px] font-semibold text-gray-400">ou</span>
              </div>
            </div>
          </div>

          {/* Aide au choix */}
          <FadeIn delay={0.2}>
            <div className="flex items-center justify-center gap-2 mt-8 text-xs sm:text-sm text-gray-400">
              <HelpCircle className="w-4 h-4" />
              <span>Pas sûr ? Commencez par le <Link href="/simulateur/mode-a" className="text-aquiz-green font-semibold hover:underline">Mode A</Link> pour estimer votre budget.</span>
            </div>
          </FadeIn>
      </section>

    </div>
  )
}
