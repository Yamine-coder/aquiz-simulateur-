import {
    Award,
    Building2,
    Heart,
    Home,
    Mail,
    MapPin,
    Phone,
    Ruler,
    Shield,
    Target,
    Train,
    Users
} from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { TrackedCalendlyLink } from '@/components/ui/TrackedCalendlyLink'
import { ContactButton } from '@/components/vitrine/ContactButton'

export const metadata: Metadata = {
  title: 'À propos — AQUIZ, conseil en acquisition immobilière',
  description:
    'Découvrez l\'équipe AQUIZ : experts en acquisition immobilière à Paris et Île-de-France. Notre mission : accompagner les primo-accédants vers la propriété.',
  openGraph: {
    title: 'À propos d\'AQUIZ — Conseil en acquisition immobilière',
    description:
      'Une équipe d\'experts passionnés par l\'immobilier à Paris et en Île-de-France, au service des primo-accédants.',
    url: 'https://www.aquiz.eu/a-propos',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/a-propos',
  },
}

/** JSON-LD AboutPage pour les signaux E-E-A-T */
function AboutJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': 'https://www.aquiz.eu/a-propos#about',
    name: 'À propos d\'AQUIZ',
    description: 'Experts en acquisition immobilière à Paris et Île-de-France, au service des primo-accédants.',
    url: 'https://www.aquiz.eu/a-propos',
    mainEntity: {
      '@type': 'Organization',
      '@id': 'https://www.aquiz.eu/#org',
      name: 'AQUIZ',
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default function AProposPage() {
  return (
    <>
      <AboutJsonLd />

      {/* ─── Hero (style mentions-légales) ─── */}
      <section className="relative bg-aquiz-black pt-28 pb-12 md:pt-36 md:pb-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        <div className="absolute -bottom-20 -left-20 w-100 h-100 rounded-full bg-aquiz-green/6 blur-[80px]" />
        <div className="absolute -top-10 -right-20 w-80 h-80 rounded-full bg-aquiz-green/4 blur-[80px]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/8 text-aquiz-green text-xs font-medium mb-5">
            <Users className="w-3.5 h-3.5" />
            Notre histoire
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Une équipe passionnée<br />
            <span className="text-aquiz-green">par l&apos;immobilier</span>
          </h1>
          <p className="mt-3 text-sm text-white/50 max-w-md">
            Conseil en acquisition immobilière à Paris et Île-de-France, au service des primo-accédants.
          </p>
        </div>
      </section>

      {/* ─── Contenu ─── */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 text-sm text-aquiz-gray leading-relaxed">

          {/* ── Notre mission ── */}
          <div>
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Qui sommes-nous</p>
            <h2 className="text-lg font-bold text-aquiz-black mb-3">Notre mission</h2>
            <p>
              AQUIZ est né d&apos;un constat simple : acheter un bien immobilier en Île-de-France
              est un parcours complexe, surtout quand on le fait pour la première fois.
            </p>
            <p className="mt-3">
              Nous accompagnons les <strong className="text-aquiz-black font-semibold">primo-accédants et particuliers</strong> dans
              toutes les étapes de leur projet immobilier, en leur offrant un conseil personnalisé,
              une expertise stratégique et un suivi rassurant afin de sécuriser leur achat.
            </p>
            <p className="mt-3">
              Notre approche combine des <strong className="text-aquiz-black font-semibold">outils technologiques performants</strong> —
              simulateur de capacité d&apos;emprunt, carte des prix, comparateur —
              avec un <strong className="text-aquiz-black font-semibold">accompagnement humain</strong> de proximité.
            </p>

            {/* Image */}
            <div className="mt-6 rounded-xl overflow-hidden">
              <Image
                src="/images/sejour-travaux.jpg"
                alt="Vue du séjour d'un appartement après travaux à Paris"
                width={640}
                height={360}
                className="w-full h-[240px] md:h-[300px] object-cover"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { value: 'Paris', label: '& IDF', green: false },
                { value: '+500', label: 'Projets', green: true },
                { value: '98%', label: 'Satisfaction', green: false },
                { value: '12k+', label: 'Simulations', green: true },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-3 bg-aquiz-gray-lightest/40 rounded-xl border border-aquiz-gray-lighter/50">
                  <p className={`text-lg font-bold ${stat.green ? 'text-aquiz-green' : 'text-aquiz-black'}`}>{stat.value}</p>
                  <p className="text-[10px] text-aquiz-gray">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Mini pills */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              {[
                { icon: Target, label: 'Approche sur-mesure' },
                { icon: Shield, label: 'Transparence totale' },
                { icon: Heart, label: 'Écoute & réactivité' },
                { icon: Award, label: 'Expertise du marché' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-center gap-2.5 p-2.5 bg-aquiz-gray-lightest/40 rounded-lg border border-aquiz-gray-lighter/50">
                    <Icon className="w-4 h-4 text-aquiz-green flex-shrink-0" />
                    <span className="text-xs font-medium text-aquiz-black">{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* ── Nos valeurs ── */}
          <div>
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Nos engagements</p>
            <h2 className="text-lg font-bold text-aquiz-black mb-3">Nos valeurs</h2>
            <p className="mb-5">
              Des engagements concrets qui guident chacun de nos accompagnements.
            </p>

            <div className="space-y-3">
              {[
                {
                  icon: Shield,
                  title: 'Transparence',
                  description: 'Pas de frais cachés, pas de surprises. Nous expliquons chaque étape, chaque coût, chaque décision de manière claire et honnête.',
                },
                {
                  icon: Users,
                  title: 'Accompagnement humain',
                  description: 'Derrière nos outils technologiques, il y a des experts passionnés qui prennent le temps de comprendre votre situation unique.',
                },
                {
                  icon: Target,
                  title: 'Résultats concrets',
                  description: 'Notre objectif n\'est pas de vendre du rêve mais de vous aider à trouver le bien qui correspond réellement à votre budget et vos critères.',
                },
              ].map((value) => {
                const Icon = value.icon
                return (
                  <div key={value.title} className="bg-aquiz-gray-lightest/40 rounded-xl p-4 border border-aquiz-gray-lighter/50">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Icon className="w-4 h-4 text-aquiz-green flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-aquiz-black">{value.title}</h3>
                    </div>
                    <p className="text-xs text-aquiz-gray leading-relaxed">{value.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* ── Notre expertise ── */}
          <div>
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Nos spécialités</p>
            <h2 className="text-lg font-bold text-aquiz-black mb-3">Notre expertise</h2>
            <p className="mb-5">
              Appartement, maison ou VEFA : nous maîtrisons chaque type d&apos;acquisition.
            </p>

            <div className="space-y-3">
              {[
                {
                  icon: Building2,
                  title: 'Appartement',
                  image: '/images/parquet-moulures.jpg',
                  imageAlt: 'Séjour avec parquet et moulures du charme parisien',
                  description: 'Localisation stratégique, optimisation de l\'espace, potentiel locatif ou qualité de vie — nous vous guidons vers l\'appartement idéal.',
                },
                {
                  icon: Home,
                  title: 'Maison',
                  image: '/images/hall-maison.jpg',
                  imageAlt: 'Hall d\'une maison chic en Île-de-France',
                  description: 'Jardin, volumes ouverts, cadre paisible — grâce à notre connaissance des quartiers résidentiels, nous trouvons la maison qui vous correspond.',
                },
                {
                  icon: Ruler,
                  title: 'VEFA (Neuf)',
                  image: '/images/plans-vefa.jpg',
                  imageAlt: 'Plans VEFA d\'un appartement en construction',
                  description: 'Du choix du programme à la livraison, nous sécurisons chaque étape et négocions les meilleures conditions.',
                },
              ].map((expertise) => {
                const Icon = expertise.icon
                return (
                  <div key={expertise.title} className="rounded-xl overflow-hidden border border-aquiz-gray-lighter/50">
                    <div className="relative h-40">
                      <Image
                        src={expertise.image}
                        alt={expertise.imageAlt}
                        width={640}
                        height={320}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 bg-aquiz-gray-lightest/40">
                      <div className="flex items-center gap-2.5 mb-2">
                        <Icon className="w-4 h-4 text-aquiz-green flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-aquiz-black">{expertise.title}</h3>
                      </div>
                      <p className="text-xs text-aquiz-gray leading-relaxed">{expertise.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* ── Nos bureaux ── */}
          <div>
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Nous trouver</p>
            <h2 className="text-lg font-bold text-aquiz-black mb-3">Nos bureaux</h2>

            <div className="bg-aquiz-gray-lightest/40 rounded-xl p-4 border border-aquiz-gray-lighter/50 space-y-2">
              <p><strong className="text-aquiz-black font-semibold">AQUIZ</strong> — Conseil en acquisition immobilière</p>
              <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-aquiz-green flex-shrink-0" />58 rue de Monceau, 75008 Paris</p>
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-aquiz-green flex-shrink-0" />07 49 52 01 06</p>
              <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-aquiz-green flex-shrink-0" /><a href="mailto:contact@aquiz.eu" className="text-aquiz-green hover:underline">contact@aquiz.eu</a></p>
              <p className="flex items-center gap-2"><Train className="w-3.5 h-3.5 text-aquiz-green flex-shrink-0" /><span className="text-xs text-aquiz-gray">Métro Monceau (ligne 2) · Villiers (lignes 2 &amp; 3)</span></p>
            </div>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* ── CTA ── */}
          <div className="text-center space-y-4">
            <h2 className="text-lg font-bold text-aquiz-black">Prêt à démarrer votre projet ?</h2>
            <p className="text-xs text-aquiz-gray">
              Commencez par une simulation gratuite ou prenez rendez-vous avec notre équipe.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/simulateur"
                className="inline-flex items-center justify-center px-6 py-2.5 bg-aquiz-green text-white text-xs font-semibold rounded-lg hover:bg-aquiz-green/90 transition-colors"
              >
                Simuler mon projet
              </Link>
              <TrackedCalendlyLink
                position="about-footer"
                className="inline-flex items-center justify-center px-6 py-2.5 bg-aquiz-gray-lightest text-aquiz-black text-xs font-semibold rounded-lg border border-aquiz-gray-lighter hover:bg-aquiz-gray-lighter/50 transition-colors"
              >
                Prendre rendez-vous
              </TrackedCalendlyLink>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-aquiz-gray-lighter/40">
            <p className="text-xs text-aquiz-gray-light">
              AQUIZ — Conseil en acquisition immobilière · Paris &amp; Île-de-France
            </p>
            <ContactButton />
          </div>
        </div>
      </section>
    </>
  )
}
