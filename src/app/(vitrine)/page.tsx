import {
    HeroSection,
    OutilsSection,
    ProcessSection,
    ServicesSection,
    StatsBar,
    TarifsSection,
    TestimonialsSection,
} from '@/components/vitrine'
import { ContactSection } from '@/components/vitrine/ContactSection'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AQUIZ — Conseil en acquisition immobilière à Paris & Île-de-France',
  description:
    'AQUIZ accompagne les primo-accédants et particuliers dans leur projet immobilier : conseil personnalisé, chasse immobilière, financement. Simulateur gratuit en ligne.',
  openGraph: {
    title: 'AQUIZ — Votre acquisition immobilière, notre mission',
    description:
      'Conseil en acquisition immobilière à Paris & IDF. Simulateur gratuit, chasse immobilière et accompagnement financement.',
    url: 'https://www.aquiz.eu',
    type: 'website',
    locale: 'fr_FR',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu',
  },
}

/** Données structurées JSON-LD pour le SEO */
function JsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': 'https://www.aquiz.eu/#business',
        name: 'AQUIZ',
        description:
          'Conseil en acquisition immobilière : accompagnement personnalisé des primo-accédants et particuliers à Paris et Île-de-France.',
        url: 'https://www.aquiz.eu',
        telephone: '+33749520106',
        email: 'contact@aquiz.eu',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '58 rue de Monceau',
          addressLocality: 'Paris',
          postalCode: '75008',
          addressCountry: 'FR',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 48.8789,
          longitude: 2.3074,
        },
        areaServed: {
          '@type': 'GeoCircle',
          geoMidpoint: { '@type': 'GeoCoordinates', latitude: 48.8566, longitude: 2.3522 },
          geoRadius: '50000',
        },
        priceRange: '€€',
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '19:00',
        },
      },
      {
        '@type': 'WebApplication',
        name: 'AQUIZ Simulateur immobilier',
        url: 'https://www.aquiz.eu/simulateur',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
        description:
          "Simulateur de capacité d'emprunt immobilier gratuit. Calculez votre budget, vos mensualités et découvrez les aides disponibles.",
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// ============================================
// FAQ — Server Component pour SEO
// ============================================

function FaqSection() {
  const faqs = [
    {
      question: 'Le simulateur est-il vraiment gratuit ?',
      answer: 'Oui, tous nos outils en ligne (simulateur, comparateur, carte des prix) sont 100% gratuits, sans inscription et sans engagement. Vous pouvez les utiliser autant de fois que vous le souhaitez.',
    },
    {
      question: "Comment fonctionne le calcul de capacité d'emprunt ?",
      answer: "Notre simulateur applique les critères HCSF en vigueur : taux d'endettement maximum de 35%, durée max 25 ans. Il intègre les frais de notaire, l'assurance emprunteur et les données de prix DVF officielles.",
    },
    {
      question: "Qu'est-ce que la chasse immobilière ?",
      answer: "La chasse immobilière consiste à mandater un expert pour rechercher à votre place le bien idéal. Nous accédons à des biens off-market (non publiés sur les portails) et effectuons une présélection selon vos critères.",
    },
    {
      question: 'Intervenez-vous en dehors de Paris ?',
      answer: "Nous intervenons sur Paris et toute l'Île-de-France (92, 93, 94, 77, 78, 91, 95). Notre connaissance fine du marché francilien nous permet de vous orienter vers les secteurs les plus adaptés à votre budget.",
    },
    {
      question: 'Suis-je éligible au PTZ (Prêt à Taux Zéro) ?',
      answer: "Le PTZ est réservé aux primo-accédants sous conditions de revenus. Notre simulateur calcule automatiquement votre éligibilité et le montant potentiel du PTZ selon la zone géographique et le type de bien.",
    },
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <section className="py-16 md:py-20 bg-white scroll-mt-20 md:scroll-mt-24" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[320px_1fr] gap-10 lg:gap-16">

          {/* Left — titre + CTA */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-medium mb-3">
              FAQ
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-aquiz-black mb-3">
              Questions fréquentes
            </h2>
            <p className="text-sm text-aquiz-gray leading-relaxed mb-6">
              Retrouvez les réponses aux questions les plus posées par nos clients.
            </p>
            <div className="hidden lg:flex flex-col gap-2">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 text-sm font-semibold text-aquiz-green hover:underline"
              >
                Une autre question ?
                <span className="text-lg">→</span>
              </a>
            </div>
          </div>

          {/* Right — accordion */}
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                className="group bg-aquiz-gray-lightest rounded-xl overflow-hidden transition-all hover:bg-aquiz-gray-lightest/80"
                {...(index === 0 ? { open: true } : {})}
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-[13px] font-semibold text-aquiz-black hover:text-aquiz-green transition-colors list-none">
                  {faq.question}
                  <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 ml-3 shadow-sm">
                    <span className="text-aquiz-gray group-open:rotate-45 transition-transform duration-200 text-xs leading-none font-bold">+</span>
                  </span>
                </summary>
                <div className="px-5 pb-4 text-[13px] text-aquiz-gray leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function HomePage() {
  return (
    <>
      <JsonLd />
      <HeroSection />
      <StatsBar />
      <ServicesSection />
      <OutilsSection />
      <ProcessSection />
      <TarifsSection />
      <TestimonialsSection />
      <FaqSection />
      <ContactSection />
    </>
  )
}
