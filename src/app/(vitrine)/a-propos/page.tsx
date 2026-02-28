import {
    ArrowRight,
    Award,
    Building2,
    Heart,
    Home,
    MapPin,
    Ruler,
    Shield,
    Target,
    Users
} from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

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
      {/* Hero */}
      <section className="relative bg-aquiz-black pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-aquiz-black to-aquiz-black-light" />
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-aquiz-green/5 blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aquiz-green/10 border border-aquiz-green/20 mb-6">
            <Users className="w-4 h-4 text-aquiz-green" />
            <span className="text-sm font-medium text-aquiz-green">Notre histoire</span>
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Une équipe passionnée<br />
            <span className="text-aquiz-green">par l&apos;immobilier</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            AQUIZ est né d&apos;un constat simple : acheter un bien immobilier en Île-de-France
            est un parcours complexe, surtout quand on le fait pour la première fois.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-aquiz-black mb-6">
                Notre mission
              </h2>
              <p className="text-lg text-aquiz-gray leading-relaxed mb-6">
                Nous accompagnons les <strong className="text-aquiz-black">primo-accédants et particuliers</strong> dans
                toutes les étapes de leur projet immobilier, en leur offrant un conseil personnalisé,
                une expertise stratégique et un suivi rassurant afin de sécuriser leur achat.
              </p>
              <p className="text-lg text-aquiz-gray leading-relaxed mb-8">
                Notre approche combine des <strong className="text-aquiz-black">outils technologiques performants</strong> — 
                simulateur de capacité d&apos;emprunt, carte des prix, comparateur — 
                avec un <strong className="text-aquiz-black">accompagnement humain</strong> de proximité.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Target, label: 'Approche sur-mesure' },
                  { icon: Shield, label: 'Transparence totale' },
                  { icon: Heart, label: 'Écoute & réactivité' },
                  { icon: Award, label: 'Expertise du marché' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-center gap-3 p-3 bg-aquiz-gray-lightest rounded-xl">
                      <Icon className="w-5 h-5 text-aquiz-green flex-shrink-0" />
                      <span className="text-sm font-medium text-aquiz-black">{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Image / Visual */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <Image
                  src="/images/sejour-travaux.jpg"
                  alt="Vue du séjour d'un appartement après travaux à Paris"
                  width={640}
                  height={640}
                  className="w-full h-[400px] object-cover"
                />
              </div>
              {/* Stats overlay */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                <div className="text-center p-3 bg-aquiz-gray-lightest rounded-xl">
                  <p className="text-xl font-bold text-aquiz-black">Paris</p>
                  <p className="text-[10px] text-aquiz-gray">& IDF</p>
                </div>
                <div className="text-center p-3 bg-aquiz-gray-lightest rounded-xl">
                  <p className="text-xl font-bold text-aquiz-green">+500</p>
                  <p className="text-[10px] text-aquiz-gray">Projets</p>
                </div>
                <div className="text-center p-3 bg-aquiz-gray-lightest rounded-xl">
                  <p className="text-xl font-bold text-aquiz-black">98%</p>
                  <p className="text-[10px] text-aquiz-gray">Satisfaction</p>
                </div>
                <div className="text-center p-3 bg-aquiz-gray-lightest rounded-xl">
                  <p className="text-xl font-bold text-aquiz-green">12k+</p>
                  <p className="text-[10px] text-aquiz-gray">Simulations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="py-20 md:py-28 bg-aquiz-gray-lightest">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-aquiz-black mb-4">Nos valeurs</h2>
            <p className="text-lg text-aquiz-gray max-w-2xl mx-auto">
              Des engagements concrets qui guident chacun de nos accompagnements.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
                <div key={value.title} className="bg-white rounded-2xl p-8 border border-aquiz-gray-lighter">
                  <div className="w-12 h-12 rounded-xl bg-aquiz-green/10 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-aquiz-green" />
                  </div>
                  <h3 className="text-lg font-bold text-aquiz-black mb-3">{value.title}</h3>
                  <p className="text-sm text-aquiz-gray leading-relaxed">{value.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Expertise: Appartement, Maison, VEFA */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-aquiz-black mb-4">Notre expertise</h2>
            <p className="text-lg text-aquiz-gray max-w-2xl mx-auto">
              Appartement, maison ou VEFA : nous maîtrisons chaque type d&apos;acquisition.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: 'Appartement',
                image: '/images/parquet-moulures.jpg',
                imageAlt: 'Séjour avec parquet et moulures du charme parisien',
                description: 'Nous vous accompagnons dans la recherche d\'appartements correspondant à vos critères : localisation stratégique, optimisation de l\'espace, potentiel locatif ou qualité de vie.',
              },
              {
                icon: Home,
                title: 'Maison',
                image: '/images/hall-maison.jpg',
                imageAlt: 'Hall d\'une maison chic en Île-de-France',
                description: 'Vous rêvez d\'un jardin, de volumes ouverts ou d\'un cadre paisible ? Grâce à notre connaissance des quartiers résidentiels, nous vous guidons vers la maison idéale.',
              },
              {
                icon: Ruler,
                title: 'VEFA',
                image: '/images/plans-vefa.jpg',
                imageAlt: 'Plans VEFA d\'un appartement en construction',
                description: 'La VEFA exige un accompagnement rigoureux. Nous intervenons du choix du programme à la livraison, en sécurisant chaque étape et en négociant les meilleures conditions.',
              },
            ].map((expertise) => {
              const Icon = expertise.icon
              return (
                <div key={expertise.title} className="group bg-white rounded-2xl border border-aquiz-gray-lighter overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={expertise.image}
                      alt={expertise.imageAlt}
                      width={640}
                      height={480}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-aquiz-green/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-aquiz-green" />
                      </div>
                      <h3 className="text-lg font-bold text-aquiz-black">{expertise.title}</h3>
                    </div>
                    <p className="text-sm text-aquiz-gray leading-relaxed">{expertise.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Localisation */}
      <section className="py-20 md:py-28 bg-aquiz-gray-lightest">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-aquiz-black mb-6 flex items-center gap-3">
                <MapPin className="w-8 h-8 text-aquiz-green" />
                Nos bureaux
              </h2>
              <div className="space-y-4 text-lg text-aquiz-gray">
                <p>
                  <strong className="text-aquiz-black">AQUIZ</strong><br />
                  58 rue de Monceau<br />
                  75008 Paris
                </p>
                <p>
                  <strong className="text-aquiz-black">Téléphone :</strong> 07 49 52 01 06<br />
                  <strong className="text-aquiz-black">Email :</strong> contact@aquiz.eu
                </p>
                <p className="text-sm">
                  Métro : Monceau (ligne 2) · Villiers (lignes 2 & 3)
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-aquiz-green text-white font-semibold rounded-xl hover:bg-aquiz-green/90 transition-all"
              >
                Nous contacter
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="bg-aquiz-gray-lightest rounded-2xl h-[300px] md:h-[400px] flex items-center justify-center text-aquiz-gray">
              <div className="text-center">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-aquiz-gray-light" />
                <p className="text-sm">58 rue de Monceau, 75008 Paris</p>
                <p className="text-xs text-aquiz-gray-light mt-1">Carte interactive à venir</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-aquiz-green">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Prêt à démarrer votre projet ?
          </h2>
          <p className="text-white/80 mb-8">
            Commencez par une simulation gratuite ou prenez rendez-vous avec notre équipe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/simulateur"
              className="px-8 py-4 bg-white text-aquiz-black font-semibold rounded-xl hover:bg-aquiz-gray-lightest transition-colors"
            >
              Simuler mon budget
            </Link>
            <Link
              href="https://calendly.com/contact-aquiz/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-colors"
            >
              Prendre rendez-vous
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
