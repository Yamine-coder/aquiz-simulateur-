'use client'

import { FadeIn, StaggerContainer, StaggerItem } from '@/components/vitrine/Motion'
import {
    ArrowRight,
    CheckCircle,
    Clock,
    HelpCircle,
    Home,
    Sparkles,
    Wallet,
} from 'lucide-react'
import Link from 'next/link'

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
    points: ['Budget maximum', 'Mensualités', 'Taux HCSF'],
    duration: '3 min',
    href: '/simulateur/mode-a',
    popular: true,
  },
  {
    icon: Home,
    label: 'Mode B',
    title: 'Ce qu\'il faut pour acheter',
    subtitle: 'Vérifiez rapidement si un bien précis est finançable dans votre situation.',
    points: ['Faisabilité', 'Revenus requis', 'Apport optimal'],
    duration: '2 min',
    href: '/simulateur/mode-b',
    popular: false,
  },
]

export default function SimulateurPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ═══ HERO — blanc, épuré ═══ */}
      <section className="pt-10 pb-6 md:pt-12 md:pb-8 border-b border-aquiz-gray-lighter">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <FadeIn>
            <h1 className="text-2xl md:text-4xl font-extrabold text-aquiz-black tracking-tight leading-tight">
              Choisissez le bon{' '}
              <span className="text-aquiz-green">simulateur</span>
            </h1>
            <p className="mt-2 text-sm md:text-base text-aquiz-gray-light max-w-lg mx-auto leading-relaxed">
              Deux parcours complémentaires: estimer votre budget d’achat ou valider la faisabilité d’un bien ciblé.
            </p>

            <div className="flex items-center justify-center gap-5 mt-3 text-[11px] text-aquiz-gray-light">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-aquiz-green" />
                100% gratuit
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-aquiz-green" />
                Sans inscription
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-aquiz-green" />
                Conforme HCSF
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ CARTES ═══ */}
      <section className="max-w-3xl mx-auto px-5 py-6 md:py-8">

          <div className="relative">
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-5" staggerDelay={0.1}>
              {MODES.map((mode) => {
                const Icon = mode.icon
                return (
                  <StaggerItem key={mode.href}>
                    <Link
                      href={mode.href}
                      className="group relative flex flex-col h-full rounded-2xl border border-aquiz-gray-lighter bg-white hover:border-aquiz-green/40 hover:shadow-lg hover:shadow-aquiz-green/5 transition-all duration-200"
                    >
                      <div className="px-5 pt-5 pb-4 flex flex-col flex-1">
                        {mode.popular && (
                          <span className="mb-3 inline-flex w-fit items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-aquiz-green/10 text-aquiz-green font-semibold uppercase tracking-wider">
                            <Sparkles className="w-3 h-3" />
                            Populaire
                          </span>
                        )}

                        <div className="w-11 h-11 rounded-xl bg-aquiz-gray-lightest group-hover:bg-aquiz-green/10 flex items-center justify-center transition-colors duration-200 mb-3">
                          <Icon className="w-5 h-5 text-aquiz-gray-dark group-hover:text-aquiz-green transition-colors duration-200" />
                        </div>

                        <span className="text-[10px] font-bold text-aquiz-green uppercase tracking-wider">{mode.label}</span>
                        <h2 className="text-lg font-extrabold text-aquiz-black tracking-tight mt-1">{mode.title}</h2>
                        <p className="mt-1.5 text-xs text-aquiz-gray-light leading-relaxed">{mode.subtitle}</p>

                        <div className="flex flex-wrap gap-2 mt-3.5">
                          {mode.points.map((p) => (
                            <span key={p} className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-lg bg-aquiz-gray-lightest text-aquiz-gray font-medium">
                              <CheckCircle className="w-2.5 h-2.5 text-aquiz-green" />
                              {p}
                            </span>
                          ))}
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-4">
                          <span className="flex items-center gap-1.5 text-xs text-aquiz-gray-light">
                            <Clock className="w-3.5 h-3.5" />
                            {mode.duration}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-aquiz-green group-hover:gap-2.5 transition-all duration-200">
                            Commencer
                            <ArrowRight className="w-4 h-4" />
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
              <div className="w-9 h-9 rounded-full bg-white border-2 border-aquiz-gray-lighter flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-bold text-aquiz-gray">ou</span>
              </div>
            </div>
          </div>

          {/* Aide au choix */}
          <FadeIn delay={0.2}>
            <div className="flex items-center justify-center gap-2 mt-6 text-xs text-aquiz-gray-light">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Pas sûr ? Commencez par le <Link href="/simulateur/mode-a" className="text-aquiz-green font-semibold hover:underline">Mode A</Link> pour estimer votre budget.</span>
            </div>
          </FadeIn>
      </section>
    </div>
  )
}
