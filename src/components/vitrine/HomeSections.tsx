'use client'

import { motion } from 'framer-motion'
import {
    ArrowRight,
    BarChart3,
    Building2,
    CheckCircle,
    Clock,
    FileSearch,
    Handshake,
    Home,
    KeyRound,
    MapPin,
    Quote,
    Scale,
    Search,
    Shield,
    Star,
    Target,
    Users,
    Wallet
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import {
    CountUp,
    FadeIn,
    MagneticHover,
    StaggerContainer,
    StaggerItem
} from './Motion'

// ============================================
// STATS BAR (nouveau)
// ============================================

const stats: { value: number; suffix: string; label: string; icon: typeof Users }[] = [
  { value: 20, suffix: '+', label: 'Projets accompagnés', icon: Users },
  { value: 90, suffix: 'j', label: 'Délai moyen jusqu\'aux clés', icon: Clock },
  { value: 8, suffix: '', label: 'Départements couverts', icon: MapPin },
  { value: 98, suffix: '%', label: 'Taux de satisfaction', icon: Star },
]

// StatsBar supprimé — stats intégrées directement dans HeroSection (floating card)
export function StatsBar() {
  return (
    <section className="relative -mt-8 sm:-mt-10 z-20 pb-4">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-black/8 p-4 sm:p-5 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <Icon className="w-3.5 h-3.5 text-aquiz-green" />
                    <span className="text-lg sm:text-xl md:text-2xl font-bold text-aquiz-black">
                      <CountUp end={stat.value} suffix={stat.suffix} duration={2.5} />
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] md:text-xs text-aquiz-gray leading-tight">{stat.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// SERVICES
// ============================================

const services = [
  {
    icon: Shield,
    title: 'Conseil en acquisition',
    description:
      'Un accompagnement personnalisé à chaque étape de votre projet.',
    features: ['Analyse de faisabilité', 'Définition de la stratégie d\'achat', 'Positionnement prix', 'Suivi juridique jusqu\'à la remise des clés'],
    image: '/images/hall-maison.jpg',
  },
  {
    icon: Search,
    title: 'Chasse immobilière',
    description:
      'Recherche et identification du bien idéal correspondant à vos attentes et vos critères grâce à des outils de sourcing performants et un réseau exclusif.',
    features: ['Sourcing ciblé', 'Visites présélectionnées', 'Rapport détaillé', 'Biens off-market'],
    image: '/images/salon-renovation.jpg',
  },
  {
    icon: Wallet,
    title: 'Solutions de financement',
    description:
      'Mise en relation avec nos courtiers partenaires pour des solutions de financement adaptées à votre profil et votre projet.',
    features: ['Frais de courtage réduits', 'Comparaison des meilleurs taux', 'Étude des dispositifs d\'aides et prêts', 'Validation complète du dossier avant signature'],
    image: '/images/sejour-idf.jpg',
  },
]

export function ServicesSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white scroll-mt-18 md:scroll-mt-20" id="services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <FadeIn className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aquiz-green/10 text-aquiz-green text-sm font-medium mb-4">
            <Building2 className="w-4 h-4" />
            Nos expertises
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-aquiz-black mb-4">
            Un accompagnement <span className="text-aquiz-green">complet</span>
          </h2>
          <p className="text-base sm:text-lg text-aquiz-gray max-w-2xl mx-auto">
            Du conseil stratégique à la remise des clés, nous sommes à vos côtés
            pour transformer votre projet immobilier en réalité.
          </p>
        </FadeIn>

        {/* Cards */}
        <StaggerContainer className="grid md:grid-cols-3 gap-6 lg:gap-8" staggerDelay={0.15}>
          {services.map((service) => {
            const Icon = service.icon
            return (
              <StaggerItem key={service.title}>
                <div
                  className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 h-full flex flex-col"
                >
                  {/* Image */}
                  <div className="relative h-44 sm:h-52 overflow-hidden shrink-0">
                    <Image
                      src={service.image}
                      alt={service.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-linear-to-t from-aquiz-black/70 via-aquiz-black/20 to-transparent" />
                    {/* Icon badge */}
                    <div className="absolute bottom-4 left-5">
                      <div className="w-11 h-11 rounded-xl bg-aquiz-green flex items-center justify-center shadow-lg shadow-aquiz-green/30">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-aquiz-black mb-2">
                      {service.title}
                    </h3>

                    <p className="text-sm text-aquiz-gray leading-relaxed mb-5 min-h-[3.5rem]">
                      {service.description}
                    </p>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-6 flex-1">
                      {service.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-aquiz-black/80">
                          <div className="w-5 h-5 rounded-full bg-aquiz-green/10 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle className="w-3.5 h-3.5 text-aquiz-green" />
                          </div>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('contact')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-aquiz-green hover:gap-3 transition-all mt-auto"
                    >
                      Nous contacter
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerContainer>

        {/* ─── Types de biens — sous-section intégrée ─── */}
        <div className="mt-16 sm:mt-24 pt-12 sm:pt-16 border-t border-aquiz-gray-lighter/50">
          <FadeIn className="text-center mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aquiz-green/10 text-aquiz-green text-sm font-medium mb-4">
              <Home className="w-4 h-4" />
              Types de biens
            </span>
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-aquiz-black mb-3">
              Une expertise adaptée à <span className="text-aquiz-green">chaque bien</span>
            </h3>
            <p className="text-base text-aquiz-gray max-w-xl mx-auto">
              Appartement ancien, maison familiale ou neuf sur plan — nous maîtrisons les spécificités de chaque marché.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-8">
            {[
              {
                title: 'Appartement',
                image: '/images/hero-appartement.jpg',
                alt: 'Appartement parisien',
                subtitle: 'Du studio au duplex, en coeur de ville.',
                delay: 0,
              },
              {
                title: 'Maison',
                image: '/images/hall-maison.jpg',
                alt: 'Maison résidentielle',
                subtitle: 'Pavillon, meulière ou contemporaine.',
                delay: 0.1,
              },
              {
                title: 'VEFA',
                image: '/images/plans-vefa.jpg',
                alt: 'Plans VEFA neuf',
                subtitle: 'Neuf sur plan, du programme à la livraison.',
                delay: 0.2,
              },
            ].map((item) => (
              <FadeIn key={item.title} delay={item.delay}>
                <motion.div
                  className="group relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer"
                  whileHover="hover"
                  initial="rest"
                  animate="rest"
                  variants={{
                    rest: { y: 0 },
                    hover: { y: -6 },
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {/* Image — zoom doux */}
                  <motion.div
                    className="absolute inset-0"
                    variants={{
                      rest: { scale: 1 },
                      hover: { scale: 1.06 },
                    }}
                    transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                  >
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      className="object-cover"
                    />
                  </motion.div>

                  {/* Gradient bas permanent (pour titre au repos) */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />

                  {/* Overlay hover — fond flou qui couvre toute l'image */}
                  <motion.div
                    className="absolute inset-0 bg-black/40 backdrop-blur-[4px]"
                    variants={{
                      rest: { opacity: 0 },
                      hover: { opacity: 1 },
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />

                  {/* Ligne verte */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-aquiz-green/80"
                    variants={{
                      rest: { scaleX: 0 },
                      hover: { scaleX: 1 },
                    }}
                    style={{ originX: 0 }}
                    transition={{ type: 'spring', stiffness: 250, damping: 28, delay: 0.05 }}
                  />

                  {/* Titre — positionné en bas, glisse vers le centre au hover */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5 sm:p-6">
                    <motion.div
                      className="text-center"
                      variants={{
                        rest: { y: '60%' },
                        hover: { y: '0%' },
                      }}
                      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                    >
                      <motion.h4
                        className="text-xl sm:text-2xl font-bold text-white tracking-wide"
                        variants={{
                          rest: { scale: 1 },
                          hover: { scale: 1.08 },
                        }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                      >
                        {item.title}
                      </motion.h4>

                      {/* Sous-titre — apparaît au hover */}
                      <motion.p
                        className="text-sm text-white/80 mt-2 max-w-[220px] mx-auto"
                        variants={{
                          rest: { opacity: 0, y: 6 },
                          hover: { opacity: 1, y: 0 },
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.08 }}
                      >
                        {item.subtitle}
                      </motion.p>
                    </motion.div>
                  </div>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>      </div>
    </section>
  )
}

// ============================================
// OUTILS
// ============================================

const outils = [
  {
    icon: Wallet,
    title: 'Ce que je peux acheter',
    subtitle: 'Mode A — Capacité d\'achat',
    description: 'Calculez votre budget maximum selon vos revenus, charges et apport personnel. Résultat conforme aux normes bancaires 2026.',
    features: ['Budget maximum', 'Mensualités estimées', 'Carte interactive IDF', 'Taux d\'endettement'],
    href: '/simulateur/mode-a',
    color: 'from-emerald-500/20 to-teal-500/10',
    popular: true,
  },
  {
    icon: Home,
    title: 'Ce qu\'il me faut pour acheter',
    subtitle: 'Mode B — Faisabilité',
    description: 'Vous avez repéré un bien ? Découvrez les revenus minimum nécessaires et l\'apport conseillé pour l\'acquérir.',
    features: ['Faisabilité instantanée', 'Revenus requis', 'Apport optimal', 'Solutions alternatives'],
    href: '/simulateur/mode-b',
    color: 'from-blue-500/20 to-indigo-500/10',
    popular: false,
  },
  {
    icon: Scale,
    title: 'Comparateur de biens',
    subtitle: 'Analysez et comparez',
    description: 'Comparez jusqu\'à 4 biens côte à côte : prix, charges, rentabilité et localisation en un coup d\'œil.',
    features: ['Jusqu\'à 4 biens', 'Analyse détaillée', 'Score par critère', 'Export résultats'],
    href: '/comparateur',
    color: 'from-purple-500/20 to-pink-500/10',
    popular: false,
  },
  {
    icon: BarChart3,
    title: 'Carte des prix',
    subtitle: 'Prix réels Île-de-France',
    description: 'Carte interactive des prix au m² basée sur les données officielles. Visualisez le marché en temps réel.',
    features: ['Données officielles', 'Prix au m² réels', 'Vue par département', 'Historique des ventes'],
    href: '/carte',
    color: 'from-amber-500/20 to-orange-500/10',
    popular: false,
  },
]

export function OutilsSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-aquiz-black relative overflow-hidden scroll-mt-18 md:scroll-mt-20" id="outils">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-aquiz-green/8 rounded-full blur-[80px]" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-aquiz-green/5 rounded-full blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ─── Hero split : texte gauche + mockups droite ─── */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          {/* Left — text */}
          <FadeIn>
            <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-5 leading-tight">
              Simulez votre projet{' '}
              <span className="text-aquiz-green">en quelques clics.</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-white leading-relaxed mb-6 sm:mb-8 max-w-lg">
              Nos outils en ligne analysent votre capacité d&apos;emprunt, comparent des biens et cartographient les prix du marché.
            </p>

            <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8">
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">4</p>
                <p className="text-[10px] sm:text-xs text-white/35 leading-tight mt-0.5">Outils disponibles</p>
              </div>
              <div className="text-center sm:text-left border-l border-white/10 pl-3 sm:pl-5">
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-aquiz-green">100%</p>
                <p className="text-[10px] sm:text-xs text-white/35 leading-tight mt-0.5">Gratuit &amp; sans inscription</p>
              </div>
              <div className="text-center sm:text-left border-l border-white/10 pl-3 sm:pl-5">
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">2 min</p>
                <p className="text-[10px] sm:text-xs text-white/35 leading-tight mt-0.5">Résultat instantané</p>
              </div>
            </div>

            <Link
              href="/simulateur"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-aquiz-green text-white text-sm sm:text-base font-semibold rounded-xl shadow-lg shadow-aquiz-green/20 hover:brightness-110 hover:-translate-y-0.5 transition-all duration-300"
            >
              Lancer une simulation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeIn>

          {/* Right — floating UI mockups (mobile: full-width stacked) */}
          <FadeIn delay={0.2} className="lg:hidden mt-8">
            <div className="space-y-3">
              {/* Card: Simulateur result — compact */}
              <div className="rounded-2xl border border-white/10 bg-[#1e1e1e] shadow-xl shadow-black/30 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/8">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
                    <div className="w-2 h-2 rounded-full bg-green-400/60" />
                  </div>
                  <p className="text-[9px] text-white/25 ml-1">AQUIZ — Simulateur</p>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-aquiz-green/15 flex items-center justify-center">
                        <Wallet className="w-3.5 h-3.5 text-aquiz-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">Capacité d&apos;achat</p>
                        <p className="text-[10px] text-white/30">Mode A — Résultat</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-aquiz-green/10 border border-aquiz-green/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-aquiz-green" />
                      <p className="text-[9px] text-aquiz-green font-medium">Finançable</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-center py-2.5 rounded-xl bg-white/4 border border-white/8">
                      <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Budget max</p>
                      <p className="text-xl font-bold text-aquiz-green">324 000 €</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="text-center px-3 py-1.5 rounded-lg bg-white/3 border border-white/6">
                        <p className="text-[8px] text-white/20">Mensualité</p>
                        <p className="text-[10px] font-semibold text-white/70">1 247 €</p>
                      </div>
                      <div className="text-center px-3 py-1.5 rounded-lg bg-white/3 border border-white/6">
                        <p className="text-[8px] text-white/20">Endettement</p>
                        <p className="text-[10px] font-semibold text-aquiz-green">31,2%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row: Carte des prix + Comparateur side by side */}
              <div className="grid grid-cols-2 gap-3">
                {/* Card: Carte des prix */}
                <div className="rounded-xl border border-white/10 bg-[#1e1e1e] shadow-xl shadow-black/30 p-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <div className="w-5 h-5 rounded-md bg-amber-500/15 flex items-center justify-center">
                      <BarChart3 className="w-2.5 h-2.5 text-amber-400" />
                    </div>
                    <p className="text-[10px] font-semibold text-white/60">Carte des prix</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] text-white/30">Paris 8e</p>
                      <p className="text-[9px] font-semibold text-white/70">12 450 €</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] text-white/30">Boulogne</p>
                      <p className="text-[9px] font-semibold text-white/70">8 900 €</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] text-white/30">Montreuil</p>
                      <p className="text-[9px] font-semibold text-white/70">5 200 €</p>
                    </div>
                  </div>
                  <div className="mt-2 h-8 rounded-lg bg-white/3 border border-white/6 flex items-end justify-around px-1.5 pb-1">
                    <div className="w-2 bg-aquiz-green/40 rounded-sm" style={{ height: '60%' }} />
                    <div className="w-2 bg-aquiz-green/50 rounded-sm" style={{ height: '80%' }} />
                    <div className="w-2 bg-aquiz-green/70 rounded-sm" style={{ height: '100%' }} />
                    <div className="w-2 bg-aquiz-green/40 rounded-sm" style={{ height: '45%' }} />
                    <div className="w-2 bg-aquiz-green/30 rounded-sm" style={{ height: '35%' }} />
                  </div>
                </div>

                {/* Card: Comparateur */}
                <div className="rounded-xl border border-white/10 bg-[#1e1e1e] shadow-xl shadow-black/30 p-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <div className="w-5 h-5 rounded-md bg-purple-500/15 flex items-center justify-center">
                      <Scale className="w-2.5 h-2.5 text-purple-400" />
                    </div>
                    <p className="text-[10px] font-semibold text-white/60">Comparateur</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-center py-1.5 rounded-lg bg-aquiz-green/8 border border-aquiz-green/15">
                      <p className="text-[9px] text-aquiz-green/60">Bien A</p>
                      <p className="text-[10px] font-bold text-aquiz-green">285k€</p>
                      <p className="text-[8px] text-aquiz-green/50">★ Meilleur</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="text-center py-1.5 rounded-lg bg-white/3 border border-white/6">
                        <p className="text-[8px] text-white/25">Bien B</p>
                        <p className="text-[9px] font-bold text-white/60">310k€</p>
                      </div>
                      <div className="text-center py-1.5 rounded-lg bg-white/3 border border-white/6">
                        <p className="text-[8px] text-white/25">Bien C</p>
                        <p className="text-[9px] font-bold text-white/60">340k€</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Right — floating UI mockups (desktop: absolute positioned) */}
          <FadeIn delay={0.2} className="hidden lg:block">
            <div className="relative h-[460px]">
              {/* Main card: Simulateur result */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-0 right-0 w-[320px] rounded-2xl border border-white/10 bg-[#1e1e1e] shadow-2xl shadow-black/40 overflow-hidden"
              >
                {/* Window header */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                  </div>
                  <p className="text-[10px] text-white/25 ml-2">AQUIZ — Simulateur</p>
                </div>
                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-aquiz-green/15 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-aquiz-green" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Capacité d&apos;achat</p>
                      <p className="text-[10px] text-white/30">Mode A — Résultat</p>
                    </div>
                  </div>
                  <div className="text-center py-3 mb-3 rounded-xl bg-white/[0.04] border border-white/8">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Budget maximum</p>
                    <p className="text-3xl font-bold text-aquiz-green">324 000 €</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center py-2 rounded-lg bg-white/[0.03] border border-white/6">
                      <p className="text-[9px] text-white/20 mb-0.5">Mensualité</p>
                      <p className="text-xs font-semibold text-white/70">1 247 €</p>
                    </div>
                    <div className="text-center py-2 rounded-lg bg-white/[0.03] border border-white/6">
                      <p className="text-[9px] text-white/20 mb-0.5">Endettement</p>
                      <p className="text-xs font-semibold text-aquiz-green">31,2%</p>
                    </div>
                    <div className="text-center py-2 rounded-lg bg-white/[0.03] border border-white/6">
                      <p className="text-[9px] text-white/20 mb-0.5">Durée</p>
                      <p className="text-xs font-semibold text-white/70">25 ans</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-aquiz-green/10 border border-aquiz-green/20">
                    <div className="w-2 h-2 rounded-full bg-aquiz-green" />
                    <p className="text-[10px] text-aquiz-green font-medium">Projet finançable</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating card: Carte prix */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-16 left-0 w-[200px] rounded-xl border border-white/10 bg-[#1e1e1e] shadow-xl shadow-black/30 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center">
                    <BarChart3 className="w-3 h-3 text-amber-400" />
                  </div>
                  <p className="text-[10px] font-semibold text-white/60">Carte des prix</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-white/30">Paris 8e</p>
                    <p className="text-[10px] font-semibold text-white/70">12 450 €/m²</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-white/30">Boulogne (92)</p>
                    <p className="text-[10px] font-semibold text-white/70">8 900 €/m²</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-white/30">Montreuil (93)</p>
                    <p className="text-[10px] font-semibold text-white/70">5 200 €/m²</p>
                  </div>
                </div>
                <div className="mt-3 h-10 rounded-lg bg-white/[0.03] border border-white/6 flex items-end justify-around px-2 pb-1.5">
                  <div className="w-3 bg-aquiz-green/40 rounded-sm" style={{ height: '60%' }} />
                  <div className="w-3 bg-aquiz-green/50 rounded-sm" style={{ height: '80%' }} />
                  <div className="w-3 bg-aquiz-green/70 rounded-sm" style={{ height: '100%' }} />
                  <div className="w-3 bg-aquiz-green/40 rounded-sm" style={{ height: '45%' }} />
                  <div className="w-3 bg-aquiz-green/30 rounded-sm" style={{ height: '35%' }} />
                </div>
              </motion.div>

              {/* Floating card: Comparateur */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-8 left-8 w-[240px] rounded-xl border border-white/10 bg-[#1e1e1e] shadow-xl shadow-black/30 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-purple-500/15 flex items-center justify-center">
                    <Scale className="w-3 h-3 text-purple-400" />
                  </div>
                  <p className="text-[10px] font-semibold text-white/60">Comparateur</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center py-2 rounded-lg bg-aquiz-green/8 border border-aquiz-green/15">
                    <p className="text-[9px] text-aquiz-green/60 mb-0.5">Bien A</p>
                    <p className="text-[10px] font-bold text-aquiz-green">285k€</p>
                    <p className="text-[8px] text-aquiz-green/50">★ Meilleur</p>
                  </div>
                  <div className="text-center py-2 rounded-lg bg-white/[0.03] border border-white/6">
                    <p className="text-[9px] text-white/25 mb-0.5">Bien B</p>
                    <p className="text-[10px] font-bold text-white/60">310k€</p>
                    <p className="text-[8px] text-white/20">&nbsp;</p>
                  </div>
                  <div className="text-center py-2 rounded-lg bg-white/[0.03] border border-white/6">
                    <p className="text-[9px] text-white/25 mb-0.5">Bien C</p>
                    <p className="text-[10px] font-bold text-white/60">340k€</p>
                    <p className="text-[8px] text-white/20">&nbsp;</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating badge: notification */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-[280px] right-[30px] flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#1e1e1e] border border-aquiz-green/25 shadow-lg shadow-aquiz-green/10"
              >
                <div className="w-6 h-6 rounded-full bg-aquiz-green/20 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-aquiz-green" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white">Simulation terminée</p>
                  <p className="text-[9px] text-white/30">Résultat disponible</p>
                </div>
              </motion.div>
            </div>
          </FadeIn>
        </div>

        {/* ─── 4 outils — cards avec mini-preview ─── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {outils.map((outil, index) => {
            const Icon = outil.icon
            return (
              <FadeIn key={outil.title} delay={index * 0.08}>
                <Link
                  href={outil.href}
                  className="group relative block rounded-2xl border border-white/8 bg-white/[0.03] p-5 hover:bg-white/[0.06] hover:border-aquiz-green/30 transition-all duration-500 h-full"
                >
                  <div className="absolute inset-0 rounded-2xl bg-aquiz-green/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center group-hover:bg-aquiz-green/15 group-hover:border-aquiz-green/25 transition-all duration-300">
                        <Icon className="w-5 h-5 text-white/50 group-hover:text-aquiz-green transition-colors duration-300" />
                      </div>
                    </div>

                    <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-0.5">
                      {outil.subtitle}
                    </p>
                    <h3 className="text-base font-bold text-white mb-1.5">
                      {outil.title}
                    </h3>
                    <p className="text-[12px] text-white/35 leading-relaxed mb-4">
                      {outil.description}
                    </p>

                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-aquiz-green group-hover:gap-2.5 transition-all">
                      Découvrir
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              </FadeIn>
            )
          })}
        </div>

        {/* Bottom trust bar */}
        <FadeIn delay={0.4}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs text-white/30">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-aquiz-green/60" />
              100% gratuit
            </span>
            <span className="hidden sm:block w-px h-3 bg-white/10" />
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-aquiz-green/60" />
              Sans inscription
            </span>
            <span className="hidden sm:block w-px h-3 bg-white/10" />
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-aquiz-green/60" />
              Données officielles
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ============================================
// PROCESS
// ============================================

const steps = [
  {
    number: '01',
    title: 'Étude de votre projet',
    description: 'Simulez votre capacité d\'emprunt avec nos outils gratuits, puis échangez avec un conseiller AQUIZ pour définir ensemble votre stratégie : budget réaliste, localisation, type de bien.',
    details: ['Simulation en ligne gratuite', 'Vérification éligibilité aux dispositifs et aux aides', 'RDV prise de contact'],
    icon: Target,
  },
  {
    number: '02',
    title: 'Recherche & visites',
    description: 'Notre équipe prospecte activement les portails, agences partenaires et biens off-market. Nous vous accompagnons en visite pour identifier les éléments essentiels à savoir.',
    details: ['Présélection qualifiée', 'Analyse technique du bien', 'Accès biens off-market'],
    icon: FileSearch,
  },
  {
    number: '03',
    title: 'Négociation & financement',
    description: 'Nous négocions au prix le plus juste en nous appuyant sur notre expertise ainsi que les données réelles du marché. En parallèle, nos courtiers partenaires obtiennent les conditions de financement optimales.',
    details: ['Négociation basée sur les prix réels du marché', 'Réalisation des devis en cas de travaux', 'Montage du dossier bancaire sur mesure'],
    icon: Handshake,
  },
  {
    number: '04',
    title: 'Sécurisation jusqu\'aux clés',
    description: 'Du compromis à l\'acte authentique, nous procédons à la vérification de tous les éléments avec notre notaire partenaire pour que vous puissiez signer en toute sérénité.',
    details: ['Mise à disposition d\'un notaire dédié', 'Rassemblement de tous les documents notariaux', 'Suivi du compromis à la remise des clés'],
    icon: KeyRound,
  },
]

export function ProcessSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white overflow-hidden scroll-mt-18 md:scroll-mt-20" id="methode">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aquiz-green/10 text-aquiz-green text-sm font-medium mb-4">
            <ArrowRight className="w-4 h-4" />
            Notre méthode
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-aquiz-black mb-4">
            4 étapes pour <span className="text-aquiz-green">réussir</span> votre acquisition
          </h2>
          <p className="text-base sm:text-lg text-aquiz-gray max-w-2xl mx-auto">
            Un parcours clair et structuré, du premier clic à la remise des clés.
          </p>
        </FadeIn>

        {/* Desktop: 3x2 grid */}
        <div className="hidden md:grid grid-cols-2 gap-5 lg:gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <FadeIn key={step.number} delay={index * 0.08}>
                <div className="group relative bg-white rounded-2xl border border-aquiz-gray-lighter p-6 lg:p-7 hover:border-aquiz-green/40 hover:shadow-lg transition-all duration-300 h-full">
                  {/* Number + icon header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-aquiz-green/10 flex items-center justify-center group-hover:bg-aquiz-green group-hover:shadow-md group-hover:shadow-aquiz-green/20 transition-all duration-300">
                      <Icon className="w-5 h-5 text-aquiz-green group-hover:text-white transition-colors duration-300" />
                    </div>
                    <span className="text-3xl font-bold text-aquiz-gray-lighter group-hover:text-aquiz-green/20 transition-colors duration-300">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-aquiz-black mb-2">
                    {step.title}
                  </h3>

                  <p className="text-sm text-aquiz-gray leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Details */}
                  <ul className="space-y-2">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-center gap-2 text-xs text-aquiz-gray">
                        <CheckCircle className="w-3.5 h-3.5 text-aquiz-green shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            )
          })}
        </div>

        {/* Mobile vertical timeline */}
        <div className="md:hidden space-y-6">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <FadeIn key={step.number} delay={index * 0.08}>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-aquiz-green" />
                    </div>
                    {index < steps.length - 1 && (
                      <div className="w-px flex-1 bg-aquiz-green/20 mt-2" />
                    )}
                  </div>
                  <div className="pb-4">
                    <span className="text-xs font-bold text-aquiz-green">{step.number}</span>
                    <h3 className="text-base font-bold text-aquiz-black mb-1">
                      {step.title}
                    </h3>
                    <p className="text-sm text-aquiz-gray leading-relaxed mb-3">
                      {step.description}
                    </p>
                    <ul className="space-y-1.5">
                      {step.details.map((detail) => (
                        <li key={detail} className="flex items-center gap-2 text-xs text-aquiz-gray">
                          <CheckCircle className="w-3.5 h-3.5 text-aquiz-green shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeIn>
            )
          })}
        </div>

        <FadeIn delay={0.5} className="text-center mt-14">
          <MagneticHover>
            <Link
              href="/simulateur"
              className="inline-flex items-center gap-2 px-8 py-4 bg-aquiz-green text-white font-semibold rounded-xl hover:bg-aquiz-green/90 transition-all shadow-lg shadow-aquiz-green/20 group"
            >
              Commencer ma simulation
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </MagneticHover>
        </FadeIn>
      </div>
    </section>
  )
}

// ============================================
// TARIFS
// ============================================

const TARIF_FEATURES = ['Accompagnement complet', 'Négociation incluse', 'Suivi notaire']

const tarifs = [
  {
    price: '5 900€',
    priceSuffix: ' TTC',
    condition: 'Pour un bien d\u2019une valeur',
    threshold: 'inférieure à 500 000€',
    features: TARIF_FEATURES,
    popular: true,
  },
  {
    price: '8 900€',
    priceSuffix: ' TTC',
    condition: 'Pour un bien d\u2019une valeur comprise',
    threshold: 'entre 500 000€ et 800 000€',
    features: TARIF_FEATURES,
    popular: false,
  },
  {
    price: '2%',
    priceSuffix: ' TTC',
    condition: 'Pour un bien d\u2019une valeur',
    threshold: 'à partir de 800 000€',
    features: TARIF_FEATURES,
    popular: false,
  },
]

export function TarifsSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white scroll-mt-18 md:scroll-mt-20" id="tarifs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-aquiz-black mb-4">
            Nos <span className="text-aquiz-green">tarifs</span>
          </h2>
          <p className="text-base sm:text-lg text-aquiz-gray max-w-2xl mx-auto">
            Des honoraires clairs et compétitifs, sans frais cachés. Vous ne payez qu&apos;au succès.
          </p>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-3 gap-5 lg:gap-6" staggerDelay={0.1}>
          {tarifs.map((tarif) => (
            <StaggerItem key={tarif.price}>
              <motion.div
                className={`relative rounded-2xl p-6 lg:p-8 h-full flex flex-col transition-shadow duration-300 ${
                  tarif.popular
                    ? 'bg-aquiz-black text-white shadow-xl shadow-aquiz-black/20 ring-2 ring-aquiz-green/40'
                    : 'bg-white border border-aquiz-gray-lighter hover:shadow-lg'
                }`}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
              >
                {tarif.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-aquiz-green text-white text-xs font-semibold shadow-md shadow-aquiz-green/30">
                    Le plus choisi
                  </span>
                )}

                {/* Price */}
                <div className="mb-4 text-center">
                  <span className={`text-4xl lg:text-5xl font-bold ${
                    tarif.popular ? 'text-white' : 'text-aquiz-black'
                  }`}>
                    {tarif.price}
                  </span>
                  {tarif.priceSuffix && (
                    <span className={`text-lg font-medium ml-1 ${
                      tarif.popular ? 'text-white/60' : 'text-aquiz-gray'
                    }`}>
                      {tarif.priceSuffix}
                    </span>
                  )}
                </div>

                {/* Condition */}
                <p className={`text-sm leading-relaxed mb-6 text-center ${
                  tarif.popular ? 'text-white/50' : 'text-aquiz-gray'
                }`}>
                  {tarif.condition}<br />
                  <span className={`font-semibold ${
                    tarif.popular ? 'text-white/80' : 'text-aquiz-black'
                  }`}>
                    {tarif.threshold}
                  </span>
                </p>

                {/* Divider */}
                <div className={`h-px mb-6 ${
                  tarif.popular ? 'bg-white/10' : 'bg-aquiz-gray-lighter'
                }`} />

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {tarif.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle className={`w-4 h-4 shrink-0 ${
                        tarif.popular ? 'text-aquiz-green' : 'text-aquiz-green'
                      }`} />
                      <span className={tarif.popular ? 'text-white/70' : 'text-aquiz-gray'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="#contact"
                  className={`inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    tarif.popular
                      ? 'bg-aquiz-green text-white hover:bg-aquiz-green/90 shadow-lg shadow-aquiz-green/20'
                      : 'bg-aquiz-gray-lightest text-aquiz-black hover:bg-aquiz-green hover:text-white'
                  }`}
                >
                  En savoir plus
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeIn delay={0.4}>
          <p className="text-center text-xs text-aquiz-gray mt-8">
            Honoraires TTC sauf mention contraire. Payables uniquement au succès de la mission.
          </p>
          <p className="text-center text-xs text-aquiz-gray/70 mt-2 italic">
            Les honoraires de courtage ne sont pas inclus dans nos tarifs.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

// ============================================
// TESTIMONIALS
// ============================================

const testimonials = [
  {
    quote: 'Je ne savais pas vraiment par où commencer pour acheter mon premier appartement. L\'équipe m\'a aidé à comprendre ma capacité d\'emprunt et les étapes à suivre. Ça m\'a surtout rassuré d\'avoir quelqu\'un pour répondre à mes questions pendant le processus.',
    name: 'Marie D.',
    role: 'Primo-accédante, Paris 11e',
    rating: 5,
    avatarBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    quote: 'Nous cherchions depuis plusieurs mois sans succès. Grâce à leur accompagnement, on a pu affiner notre projet et visiter des biens qui correspondaient vraiment à notre budget. On a finalement trouvé un appartement qui nous plaît beaucoup.',
    name: 'Thomas & Julie L.',
    role: 'Couple, Boulogne-Billancourt',
    rating: 5,
    avatarBg: 'bg-blue-100 text-blue-700',
  },
  {
    quote: 'Je n\'ai pas eu le temps de me rendre compte qu\'un achat immobilier est tout un parcours du combattant.',
    name: 'Karim B.',
    role: 'Investisseur, Saint-Denis',
    rating: 5,
    avatarBg: 'bg-amber-100 text-amber-700',
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-aquiz-gray-lightest scroll-mt-18 md:scroll-mt-20" id="temoignages">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header — aligné DA (Process / Tarifs) */}
        <FadeIn className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aquiz-green/10 text-aquiz-green text-sm font-medium mb-4">
            <Star className="w-4 h-4 fill-aquiz-green" />
            Avis clients
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-aquiz-black mb-4">
            Ils nous font <span className="text-aquiz-green">confiance</span>
          </h2>
          <p className="text-base sm:text-lg text-aquiz-gray max-w-2xl mx-auto">
            Découvrez les retours de nos clients accompagnés dans leur projet immobilier.
          </p>
        </FadeIn>

        {/* Cards */}
        <StaggerContainer className="grid md:grid-cols-3 gap-5 lg:gap-6" staggerDelay={0.1}>
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
              <article className="group relative bg-white rounded-2xl p-6 lg:p-7 h-full flex flex-col border border-aquiz-gray-lighter hover:border-aquiz-green/40 hover:shadow-lg transition-all duration-300">
                {/* Top: stars + quote icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <Quote className="w-6 h-6 text-aquiz-green/15 group-hover:text-aquiz-green/30 transition-colors duration-300" />
                </div>

                <blockquote className="text-sm text-aquiz-gray leading-relaxed flex-1 mb-5">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <div className="flex items-center gap-3 pt-4 border-t border-aquiz-gray-lighter">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${t.avatarBg}`}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-aquiz-black">{t.name}</p>
                    <p className="text-xs text-aquiz-gray">{t.role}</p>
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}


