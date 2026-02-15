'use client'

import { FadeIn, MagneticHover, StaggerContainer, StaggerItem } from '@/components/vitrine/Motion'
import { motion } from 'framer-motion'
import {
    ArrowRight,
    Clock,
    Shield,
    Sparkles,
} from 'lucide-react'
import Link from 'next/link'

const MODES = [
  {
    eyebrow: 'Mode A — Capacité d\'achat',
    title: 'Ce que je peux acheter',
    description: 'Calculez votre budget maximum selon vos revenus, charges et apport personnel. Résultats conformes HCSF.',
    duration: '3 min',
    href: '/simulateur/mode-a',
    popular: true,
  },
  {
    eyebrow: 'Mode B — Faisabilité',
    title: 'Ce qu\'il faut pour acheter',
    description: 'Vous avez repéré un bien ? Vérifiez les revenus minimum et l\'apport nécessaire pour l\'acquérir.',
    duration: '2 min',
    href: '/simulateur/mode-b',
    popular: false,
  },
]

export default function SimulateurPage() {
  return (
    <div className="min-h-[calc(100vh-72px)] md:min-h-[calc(100vh-88px)] flex flex-col">

      {/* ─── Header — inspiré du Hero homepage ─── */}
      <section className="relative bg-aquiz-black overflow-hidden">
        {/* Motifs décoratifs subtils */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-[12%] -translate-y-1/2 w-48 h-48 bg-aquiz-green/4 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-[12%] -translate-y-1/2 w-36 h-36 bg-aquiz-green/3 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 md:pt-12 md:pb-14 text-center">
          {/* Eyebrow — pattern homepage */}
          <motion.p
            className="text-xs font-medium tracking-[0.2em] uppercase text-aquiz-green mb-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Simulateur immobilier
          </motion.p>

          <motion.h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-[1.15] tracking-tight mb-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Quel est votre <span className="text-aquiz-green">projet</span> ?
          </motion.h1>

          {/* Ligne décorative — pattern homepage */}
          <motion.div
            className="mx-auto w-12 h-px bg-white/20 mb-3"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          />

          <motion.p
            className="text-sm text-white/45 max-w-md mx-auto font-light leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Choisissez le mode adapté à votre situation
          </motion.p>
        </div>

        {/* Curved bottom — pattern homepage */}
        <div className="absolute -bottom-px left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 36" fill="none" preserveAspectRatio="none" className="w-full h-5 md:h-9 block">
            <path d="M0 36V24Q360 0 720 0Q1080 0 1440 24V36H0Z" fill="#f3f4f6" />
          </svg>
        </div>
      </section>

      {/* ─── Cartes — zone bg-aquiz-gray-lightest ─── */}
      <main className="flex-1 bg-aquiz-gray-lightest">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">

          {/* Grille avec séparateur "ou" central */}
          <div className="relative">
            <StaggerContainer className="grid md:grid-cols-2 gap-4 md:gap-5" staggerDelay={0.1}>
              {MODES.map((mode) => {
                return (
                  <StaggerItem key={mode.href}>
                    <Link
                      href={mode.href}
                      className="group block h-full bg-white rounded-2xl border border-aquiz-gray-lighter p-5 md:p-6 hover:border-aquiz-green hover:shadow-lg transition-all duration-300"
                    >
                      {/* Eyebrow + badge */}
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] font-semibold text-aquiz-green uppercase tracking-wider">
                          {mode.eyebrow}
                        </p>
                        {mode.popular ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-aquiz-green/8 text-aquiz-green font-semibold border border-aquiz-green/15">
                            <Sparkles className="w-2.5 h-2.5" />
                            Populaire
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-aquiz-gray-lightest text-aquiz-gray-light font-medium">
                            <Clock className="w-2.5 h-2.5" />
                            {mode.duration}
                          </span>
                        )}
                      </div>

                      {/* Titre + description */}
                      <h2 className="text-lg font-bold text-aquiz-black leading-snug mb-1.5">
                        {mode.title}
                      </h2>
                      <p className="text-[13px] text-aquiz-gray leading-relaxed mb-5">
                        {mode.description}
                      </p>

                      {/* Arrow CTA */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-aquiz-green group-hover:underline underline-offset-2">
                          Commencer
                        </span>
                        <div className="w-8 h-8 rounded-full bg-aquiz-gray-lightest group-hover:bg-aquiz-green flex items-center justify-center shrink-0 transition-colors duration-300">
                          <ArrowRight className="w-3.5 h-3.5 text-aquiz-gray group-hover:text-white transition-colors duration-300" />
                        </div>
                      </div>
                    </Link>
                  </StaggerItem>
                )
              })}
            </StaggerContainer>

            {/* Séparateur "ou" central — visible en desktop */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-9 h-9 rounded-full bg-white border-2 border-aquiz-gray-lighter flex items-center justify-center shadow-sm">
                <span className="text-xs font-semibold text-aquiz-gray">ou</span>
              </div>
            </div>
          </div>

          {/* ─── CTA + Trust — pattern homepage ─── */}
          <FadeIn delay={0.3} className="text-center mt-8">
            <MagneticHover>
              <Link
                href="/simulateur/mode-a"
                className="group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-aquiz-green text-white text-sm font-semibold tracking-wide rounded-lg shadow-lg shadow-aquiz-green/20 hover:shadow-xl hover:shadow-aquiz-green/30 hover:scale-[1.02] transition-all"
              >
                Lancer la simulation
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </MagneticHover>

            {/* Trust markers — pattern homepage */}
            <div className="flex items-center justify-center gap-4 mt-5 text-xs text-aquiz-gray-light tracking-wide">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Gratuit
              </span>
              <span className="w-px h-3 bg-aquiz-gray-lighter" />
              <span>Sans inscription</span>
              <span className="w-px h-3 bg-aquiz-gray-lighter" />
              <span>Données DVF officielles</span>
            </div>
          </FadeIn>
        </div>
      </main>
    </div>
  )
}
