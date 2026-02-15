import os

page_content = r"""import type { Metadata } from 'next'
import {
  HeroSection,
  ServicesSection,
  OutilsSection,
  ProcessSection,
  TestimonialsSection,
  CtaFinalSection,
} from '@/components/vitrine'

export const metadata: Metadata = {
  title: 'AQUIZ \u2014 Conseil en acquisition immobili\u00e8re \u00e0 Paris & \u00cele-de-France',
  description:
    'AQUIZ accompagne les primo-acc\u00e9dants et particuliers dans leur projet immobilier : conseil personnalis\u00e9, chasse immobili\u00e8re, financement. Simulateur gratuit en ligne.',
  openGraph: {
    title: 'AQUIZ \u2014 Votre acquisition immobili\u00e8re, notre mission',
    description:
      'Conseil en acquisition immobili\u00e8re \u00e0 Paris & IDF. Simulateur gratuit, chasse immobili\u00e8re et accompagnement financement.',
    url: 'https://www.aquiz.eu',
    type: 'website',
    locale: 'fr_FR',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu',
  },
}

/** Donn\u00e9es structur\u00e9es JSON-LD pour le SEO */
function JsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': 'https://www.aquiz.eu/#business',
        name: 'AQUIZ',
        description:
          'Conseil en acquisition immobili\u00e8re : accompagnement personnalis\u00e9 des primo-acc\u00e9dants et particuliers \u00e0 Paris et \u00cele-de-France.',
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
        priceRange: '\u20ac\u20ac',
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
          "Simulateur de capacit\u00e9 d'emprunt immobilier gratuit. Calculez votre budget, vos mensualit\u00e9s et d\u00e9couvrez les aides disponibles.",
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
// FAQ \u2014 Server Component pour SEO
// ============================================

function FaqSection() {
  const faqs = [
    {
      question: 'Le simulateur est-il vraiment gratuit ?',
      answer: "Oui, tous nos outils en ligne (simulateur, comparateur, carte des prix) sont 100% gratuits, sans inscription et sans engagement. Vous pouvez les utiliser autant de fois que vous le souhaitez.",
    },
    {
      question: "Comment fonctionne le calcul de capacit\u00e9 d'emprunt ?",
      answer: "Notre simulateur applique les crit\u00e8res HCSF en vigueur : taux d'endettement maximum de 35%, dur\u00e9e max 25 ans. Il int\u00e8gre les frais de notaire, l'assurance emprunteur et les donn\u00e9es de prix DVF officielles.",
    },
    {
      question: "Qu'est-ce que la chasse immobili\u00e8re ?",
      answer: "La chasse immobili\u00e8re consiste \u00e0 mandater un expert pour rechercher \u00e0 votre place le bien id\u00e9al. Nous acc\u00e9dons \u00e0 des biens off-market (non publi\u00e9s sur les portails) et effectuons une pr\u00e9s\u00e9lection selon vos crit\u00e8res.",
    },
    {
      question: 'Intervenez-vous en dehors de Paris ?',
      answer: "Nous intervenons sur Paris et toute l'\u00cele-de-France (92, 93, 94, 77, 78, 91, 95). Notre connaissance fine du march\u00e9 francilien nous permet de vous orienter vers les secteurs les plus adapt\u00e9s \u00e0 votre budget.",
    },
    {
      question: 'Suis-je \u00e9ligible au PTZ (Pr\u00eat \u00e0 Taux Z\u00e9ro) ?',
      answer: "Le PTZ est r\u00e9serv\u00e9 aux primo-acc\u00e9dants sous conditions de revenus. Notre simulateur calcule automatiquement votre \u00e9ligibilit\u00e9 et le montant potentiel du PTZ selon la zone g\u00e9ographique et le type de bien.",
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
    <section className="py-24 md:py-32 bg-white" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-aquiz-black mb-4">
            Questions fr\u00e9quentes
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group bg-aquiz-gray-lightest rounded-xl border border-aquiz-gray-lighter overflow-hidden transition-shadow hover:shadow-md"
            >
              <summary className="flex items-center justify-between px-6 py-5 cursor-pointer text-sm font-semibold text-aquiz-black hover:text-aquiz-green transition-colors list-none">
                {faq.question}
                <span className="text-aquiz-gray group-open:rotate-45 transition-transform duration-300 text-xl ml-4 flex-shrink-0">+</span>
              </summary>
              <div className="px-6 pb-5 text-sm text-aquiz-gray leading-relaxed">
                {faq.answer}
              </div>
            </details>
          ))}
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
      <ServicesSection />
      <OutilsSection />
      <ProcessSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaFinalSection />
    </>
  )
}
"""

filepath = r"c:\Users\mouss\Documents\Projets\AQUIZ PROJECT\aquiz-simulateur\src\app\(vitrine)\page.tsx"
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(page_content)

print("Homepage rewritten successfully")
