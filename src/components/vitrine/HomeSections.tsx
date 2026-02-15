'use client'

import { motion } from 'framer-motion'
import {
    ArrowRight,
    BarChart3,
    Building2,
    Calculator,
    CheckCircle,
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
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import {
    CountUp,
    FadeIn,
    MagneticHover,
    StaggerContainer,
    StaggerItem,
} from './Motion'

// ============================================
// STATS BAR (nouveau)
// ============================================

const stats = [
  { value: 150, suffix: '+', label: 'Projets accompagnés', icon: Users },
  { value: 98, suffix: '%', label: 'Clients satisfaits', icon: TrendingUp },
  { value: 8, suffix: '', label: 'Départements couverts', icon: MapPin },
  { value: 15, suffix: 'M€', label: 'Volume de transactions', icon: BarChart3 },
]

export function StatsBar() {
  return (
    <section className="relative -mt-10 z-20 pb-4">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-black/8 p-5 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <Icon className="w-3.5 h-3.5 text-aquiz-green" />
                    <span className="text-xl md:text-2xl font-bold text-aquiz-black">
                      <CountUp end={stat.value} suffix={stat.suffix} duration={2.5} />
                    </span>
                  </div>
                  <p className="text-[11px] md:text-xs text-aquiz-gray">{stat.label}</p>
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
      'Un accompagnement personnalisé à chaque étape de votre projet. Analyse de faisabilité, stratégie d\'achat et sécurisation de votre premier achat immobilier.',
    features: ['Analyse de faisabilité', 'Stratégie d\'achat', 'Négociation prix', 'Suivi jusqu\'à la signature'],
    image: '/images/hall-maison.jpg',
  },
  {
    icon: Search,
    title: 'Chasse immobilière',
    description:
      'Recherche et identification du bien idéal grâce à un réseau exclusif de biens off-market et des outils de sourcing performants.',
    features: ['Biens off-market', 'Sourcing ciblé', 'Visites sélectionnées', 'Rapport détaillé'],
    image: '/images/salon-renovation.jpg',
  },
  {
    icon: Wallet,
    title: 'Solutions de financement',
    description:
      'Mise en relation avec nos courtiers partenaires pour des solutions de financement adaptées à votre profil et votre projet.',
    features: ['Courtiers partenaires', 'Meilleurs taux', 'PTZ & aides', 'Montage dossier'],
    image: '/images/sejour-idf.jpg',
  },
]

export function ServicesSection() {
  return (
    <section className="py-24 md:py-32 bg-white scroll-mt-20 md:scroll-mt-24" id="services">
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
          <p className="text-lg text-aquiz-gray max-w-2xl mx-auto">
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
                  className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
                >
                  {/* Image */}
                  <div className="relative h-52 overflow-hidden">
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

                  <div className="p-6">
                    <h3 className="text-lg font-bold text-aquiz-black mb-2">
                      {service.title}
                    </h3>

                    <p className="text-sm text-aquiz-gray leading-relaxed mb-5">
                      {service.description}
                    </p>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-6">
                      {service.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-aquiz-black/80">
                          <div className="w-5 h-5 rounded-full bg-aquiz-green/10 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-3.5 h-3.5 text-aquiz-green" />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-aquiz-green group-hover:gap-3 transition-all cursor-default">
                      Nous contacter
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerContainer>

        {/* ─── Types de biens — sous-section intégrée ─── */}
        <div className="mt-24 pt-16 border-t border-aquiz-gray-lighter/50">
          <FadeIn className="text-center mb-14">
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

          <div className="space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Appartement */}
            <FadeIn>
              <div className="group">
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-5">
                  <Image
                    src="/images/hero-appartement.jpg"
                    alt="Appartement parisien"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-aquiz-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium text-white border border-white/15">
                      Ancien &amp; contemporain
                    </span>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-aquiz-black mb-2">Appartement</h4>
                <p className="text-sm text-aquiz-gray leading-relaxed">
                  Nous vous accompagnons dans la recherche d&apos;appartements correspondant à vos critères : localisation stratégique, optimisation de l&apos;espace, potentiel locatif ou qualité de vie. Primo-accédant ou investisseur, bénéficiez de notre expertise du marché urbain et des opportunités off-market.
                </p>
              </div>
            </FadeIn>

            {/* Maison */}
            <FadeIn delay={0.1}>
              <div className="group">
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-5">
                  <Image
                    src="/images/hall-maison.jpg"
                    alt="Maison résidentielle"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-aquiz-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium text-white border border-white/15">
                      Résidentiel &amp; familial
                    </span>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-aquiz-black mb-2">Maison</h4>
                <p className="text-sm text-aquiz-gray leading-relaxed">
                  Vous rêvez d&apos;un jardin, de volumes ouverts ou d&apos;un cadre de vie plus paisible ? Grâce à une connaissance approfondie des quartiers résidentiels, des typologies et des évolutions de prix, nous vous guidons vers une maison qui combine confort, valeur patrimoniale et sérénité.
                </p>
              </div>
            </FadeIn>

            {/* VEFA */}
            <FadeIn delay={0.2}>
              <div className="group">
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-5">
                  <Image
                    src="/images/plans-vefa.jpg"
                    alt="Plans VEFA neuf"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-aquiz-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium text-white border border-white/15">
                      Neuf sur plan
                    </span>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-aquiz-black mb-2">VEFA</h4>
                <p className="text-sm text-aquiz-gray leading-relaxed">
                  La VEFA permet d&apos;acquérir un bien sur plan, mais exige un accompagnement rigoureux. Nous intervenons à chaque étape : choix du programme, analyse des plans, personnalisation des prestations, vérification du contrat, jusqu&apos;à la livraison. Notre rôle : sécuriser votre projet et négocier les meilleures conditions auprès des promoteurs.
                </p>
              </div>
            </FadeIn>
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
    description: 'Calculez votre budget maximum selon vos revenus, charges et apport personnel. Résultat conforme aux critères HCSF 2025.',
    features: ['Budget maximum', 'Mensualités estimées', 'Carte interactive IDF', 'Taux d\'endettement'],
    href: '/simulateur/mode-a',
    color: 'from-emerald-500/20 to-teal-500/10',
    popular: true,
  },
  {
    icon: Home,
    title: 'Ce qu\'il faut pour acheter',
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
    description: 'Comparez jusqu\'à 3 biens côte à côte : prix, charges, rentabilité et localisation en un coup d\'œil.',
    features: ['Jusqu\'à 3 biens', 'Analyse détaillée', 'Score par critère', 'Export résultats'],
    href: '/comparateur',
    color: 'from-purple-500/20 to-pink-500/10',
    popular: false,
  },
  {
    icon: BarChart3,
    title: 'Carte des prix',
    subtitle: 'Prix réels Île-de-France',
    description: 'Carte interactive des prix au m² basée sur les données DVF officielles. Visualisez le marché en temps réel.',
    features: ['Données DVF officielles', 'Prix au m² réels', 'Vue par département', 'Historique des ventes'],
    href: '/carte',
    color: 'from-amber-500/20 to-orange-500/10',
    popular: false,
  },
]

export function OutilsSection() {
  return (
    <section className="py-24 md:py-32 bg-aquiz-black relative overflow-hidden scroll-mt-20 md:scroll-mt-24" id="outils">
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
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-aquiz-green text-sm font-medium mb-6">
              <Calculator className="w-4 h-4" />
              Outils gratuits
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
              Simulez votre projet,{' '}
              <span className="text-aquiz-green">gratuitement.</span>
            </h2>
            <p className="text-lg text-white/45 leading-relaxed mb-8 max-w-lg">
              Nos outils en ligne analysent votre capacité d&apos;emprunt, comparent des biens et cartographient les prix du marché — le tout sans inscription.
            </p>

            <div className="flex flex-wrap gap-6 mb-8">
              <div>
                <p className="text-2xl font-bold text-white">4</p>
                <p className="text-xs text-white/30">Outils disponibles</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-aquiz-green">100%</p>
                <p className="text-xs text-white/30">Gratuit & sans inscription</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-white">HCSF</p>
                <p className="text-xs text-white/30">Normes 2025 respectées</p>
              </div>
            </div>

            <Link
              href="/simulateur/mode-a"
              className="inline-flex items-center gap-2 px-6 py-3 bg-aquiz-green text-white font-semibold rounded-xl shadow-lg shadow-aquiz-green/20 hover:brightness-110 hover:-translate-y-0.5 transition-all duration-300"
            >
              Lancer une simulation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeIn>

          {/* Right — floating UI mockups */}
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
                      {outil.popular && (
                        <span className="px-2 py-0.5 rounded-full bg-aquiz-green/15 text-aquiz-green text-[9px] font-bold uppercase tracking-wider">
                          Populaire
                        </span>
                      )}
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
                      Essayer
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
              Données officielles DVF
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
    description: 'Simulez votre capacité d\'emprunt avec nos outils gratuits, puis échangez avec un expert AQUIZ pour définir ensemble votre stratégie : budget réaliste, localisation, type de bien.',
    details: ['Simulation en ligne gratuite', 'Vérification éligibilité PTZ & aides', 'RDV stratégique 30 min · gratuit'],
    icon: Target,
  },
  {
    number: '02',
    title: 'Recherche & visites',
    description: 'Notre équipe prospecte activement les portails, agences partenaires et biens off-market. Nous vous accompagnons en visite pour identifier ce qui ne se voit pas : travaux, charges, potentiel.',
    details: ['Accès biens off-market', 'Présélection qualifiée', 'Analyse technique sur place'],
    icon: FileSearch,
  },
  {
    number: '03',
    title: 'Négociation & financement',
    description: 'Nous négocions le meilleur prix en nous appuyant sur les données DVF réelles du marché. En parallèle, nos courtiers partenaires obtiennent les conditions de financement optimales.',
    details: ['Négociation basée sur les données DVF', 'Mise en relation courtier', 'Montage dossier bancaire'],
    icon: Handshake,
  },
  {
    number: '04',
    title: 'Sécurisation jusqu\'aux clés',
    description: 'Du compromis à l\'acte authentique, nous vérifions chaque document : conditions suspensives, appel de fonds, levée de réserves. Vous signez en toute sérénité.',
    details: ['Suivi compromis & conditions', 'Coordination notaire', 'Remise des clés accompagnée'],
    icon: KeyRound,
  },
]

export function ProcessSection() {
  return (
    <section className="py-24 md:py-32 bg-white overflow-hidden scroll-mt-20 md:scroll-mt-24" id="methode">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aquiz-green/10 text-aquiz-green text-sm font-medium mb-4">
            <ArrowRight className="w-4 h-4" />
            Notre méthode
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-aquiz-black mb-4">
            4 étapes pour <span className="text-aquiz-green">réussir</span> votre acquisition
          </h2>
          <p className="text-lg text-aquiz-gray max-w-2xl mx-auto">
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
              className="inline-flex items-center gap-2 px-8 py-4 bg-aquiz-green text-white font-semibold rounded-full hover:bg-aquiz-green/90 transition-all shadow-lg shadow-aquiz-green/20 group"
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

const tarifs = [
  {
    price: '5 000€',
    label: 'Forfait Essentiel',
    condition: 'Pour un bien d\u2019une valeur',
    threshold: 'inférieure à 500 000€',
    features: ['Accompagnement complet', 'Négociation incluse', 'Suivi notaire'],
    popular: false,
  },
  {
    price: '8 900€',
    label: 'Forfait Premium',
    condition: 'Pour un bien d\u2019une valeur comprise',
    threshold: 'entre 500 000€ et 1 000 000€',
    features: ['Accompagnement premium', 'Chasse immobilière', 'Suivi personnalisé', 'Off-market'],
    popular: true,
  },
  {
    price: '1,2%',
    priceSuffix: ' HT',
    label: 'Sur mesure',
    condition: 'Pour un bien d\u2019une valeur',
    threshold: 'supérieure à 1 000 000€',
    features: ['Service dédié', 'Chasse exclusive', 'Conseil patrimonial', 'Conciergerie'],
    popular: false,
  },
]

export function TarifsSection() {
  return (
    <section className="py-24 md:py-32 bg-white scroll-mt-20 md:scroll-mt-24" id="tarifs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-aquiz-black mb-4">
            Nos <span className="text-aquiz-green">tarifs</span>
          </h2>
          <p className="text-lg text-aquiz-gray max-w-2xl mx-auto">
            Des honoraires clairs et compétitifs, sans frais cachés. Vous ne payez qu&apos;au succès.
          </p>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-3 gap-5 lg:gap-6" staggerDelay={0.1}>
          {tarifs.map((tarif) => (
            <StaggerItem key={tarif.label}>
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

                {/* Label */}
                <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${
                  tarif.popular ? 'text-aquiz-green' : 'text-aquiz-gray'
                }`}>
                  {tarif.label}
                </p>

                {/* Price */}
                <div className="mb-4">
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
                <p className={`text-sm leading-relaxed mb-6 ${
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
    quote: 'AQUIZ m\'a permis d\'y voir clair dans mon budget. En 2 minutes, je savais combien je pouvais emprunter. Le rendez-vous conseil a tout concrétisé.',
    name: 'Marie D.',
    role: 'Primo-accédante, Paris 11e',
    rating: 5,
    avatarBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    quote: 'Grâce à la chasse immobilière, nous avons trouvé un appartement off-market à un prix en dessous du marché. Un gain de temps incroyable.',
    name: 'Thomas & Julie L.',
    role: 'Couple, Boulogne-Billancourt',
    rating: 5,
    avatarBg: 'bg-blue-100 text-blue-700',
  },
  {
    quote: 'Le simulateur est vraiment bien fait, avec les données DVF réelles. Et l\'accompagnement ensuite est à la hauteur des promesses.',
    name: 'Karim B.',
    role: 'Investisseur, Saint-Denis',
    rating: 5,
    avatarBg: 'bg-amber-100 text-amber-700',
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-16 md:py-20 bg-aquiz-gray-lightest scroll-mt-20 md:scroll-mt-24" id="temoignages">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header compact + note globale */}
        <FadeIn className="mb-10">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-medium mb-3">
              <Star className="w-3.5 h-3.5" />
              Avis clients
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-aquiz-black">
              Ils nous font <span className="text-aquiz-green">confiance</span>
            </h2>
          </div>
        </FadeIn>

        {/* Cards */}
        <StaggerContainer className="grid md:grid-cols-3 gap-4" staggerDelay={0.1}>
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
              <div className="relative bg-white rounded-xl p-5 h-full border border-aquiz-gray-lighter/40 hover:border-aquiz-green/30 hover:shadow-md transition-all duration-300">
                {/* Top: stars + quote icon */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <Quote className="w-5 h-5 text-aquiz-green/15" />
                </div>

                <blockquote className="text-[13px] text-aquiz-black/65 leading-relaxed mb-4">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <div className="flex items-center gap-2.5 pt-3 border-t border-aquiz-gray-lighter/40">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t.avatarBg}`}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-aquiz-black">{t.name}</p>
                    <p className="text-[11px] text-aquiz-gray">{t.role}</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}


