import {
    BlogPreviewSection,
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
    'AQUIZ accompagne les primo-accédants à Paris & IDF : conseil personnalisé, chasse immobilière, simulateur gratuit et financement. Devis gratuit.',
  keywords: [
    'conseil acquisition immobilière Paris',
    'acheter un appartement à Paris',
    'chasse immobilière Paris',
    'premier achat immobilier IDF',
    'simulateur immobilier gratuit',
    'AQUIZ',
  ],
  openGraph: {
    title: 'AQUIZ — Votre acquisition immobilière à Paris, notre mission',
    description:
      'Accompagnement personnalisé des primo-accédants à Paris & IDF. Simulateur gratuit, chasse immobilière off-market et solutions de financement sur mesure.',
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
      // ── ProfessionalService avec AggregateRating ──
      {
        '@type': ['LocalBusiness', 'ProfessionalService'],
        '@id': 'https://www.aquiz.eu/#business',
        name: 'AQUIZ',
        alternateName: 'AQUIZ Conseil Immobilier',
        description:
          'Conseil en acquisition immobilière à Paris & Île-de-France : accompagnement personnalisé des primo-accédants, chasse immobilière, simulateur gratuit et solutions de financement sur mesure.',
        url: 'https://www.aquiz.eu',
        telephone: '+33749520106',
        email: 'contact@aquiz.eu',
        image: 'https://www.aquiz.eu/image%20AQUIZ.jpeg',
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
        areaServed: [
          { '@type': 'City', name: 'Paris' },
          { '@type': 'AdministrativeArea', name: 'Hauts-de-Seine (92)' },
          { '@type': 'AdministrativeArea', name: 'Seine-Saint-Denis (93)' },
          { '@type': 'AdministrativeArea', name: 'Val-de-Marne (94)' },
          { '@type': 'AdministrativeArea', name: 'Seine-et-Marne (77)' },
          { '@type': 'AdministrativeArea', name: 'Yvelines (78)' },
          { '@type': 'AdministrativeArea', name: 'Essonne (91)' },
          { '@type': 'AdministrativeArea', name: 'Val-d\'Oise (95)' },
        ],
        priceRange: '€€',
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '19:00',
        },
        sameAs: [
          'https://www.instagram.com/aquiz.eu/',
          'https://www.linkedin.com/company/aquiz/',
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '5',
          bestRating: '5',
          ratingCount: '3',
          reviewCount: '3',
        },
        review: [
          {
            '@type': 'Review',
            author: { '@type': 'Person', name: 'Marie D.' },
            datePublished: '2025-11-15',
            reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
            reviewBody: 'AQUIZ m\'a permis d\'y voir clair dans mon budget. En 2 minutes, je savais combien je pouvais emprunter. Le rendez-vous conseil a tout concrétisé.',
          },
          {
            '@type': 'Review',
            author: { '@type': 'Person', name: 'Thomas & Julie L.' },
            datePublished: '2025-12-20',
            reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
            reviewBody: 'Grâce à la chasse immobilière, nous avons trouvé un appartement off-market à un prix en dessous du marché. Un gain de temps incroyable.',
          },
          {
            '@type': 'Review',
            author: { '@type': 'Person', name: 'Karim B.' },
            datePublished: '2026-01-10',
            reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
            reviewBody: 'Le simulateur est vraiment bien fait, avec les données de prix réelles. Et l\'accompagnement ensuite est à la hauteur des promesses.',
          },
        ],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Services AQUIZ',
          itemListElement: [
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Conseil en acquisition immobilière',
                description: 'Analyse de faisabilité, stratégie d\'achat et accompagnement personnalisé pour votre premier achat immobilier à Paris & IDF.',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Chasse immobilière Paris & IDF',
                description: 'Recherche active de biens, accès off-market, présélection qualifiée et accompagnement en visite avec analyse technique.',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Solutions de financement immobilier',
                description: 'Négociation du meilleur prix, mise en relation courtier, montage dossier bancaire et optimisation des conditions de prêt.',
              },
            },
          ],
        },
      },
      // ── WebApplication ──
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
          "Simulateur de capacité d'emprunt immobilier gratuit conforme HCSF 2026. Calculez votre budget d'achat, vos mensualités et découvrez les aides disponibles (PTZ, Action Logement).",
        featureList: [
          'Calcul capacité d\'achat immobilier',
          'Vérification faisabilité d\'un bien',
          'Carte des prix immobiliers IDF',
          'Comparateur de biens immobiliers',
          'Éligibilité PTZ et aides',
        ],
      },
      // ── HowTo — 4 étapes pour réussir votre acquisition ──
      {
        '@type': 'HowTo',
        name: 'Comment réussir son acquisition immobilière à Paris & IDF',
        description: 'Les 4 étapes clés pour acheter un bien immobilier avec l\'accompagnement AQUIZ, de la simulation à la remise des clés.',
        totalTime: 'P90D',
        estimatedCost: {
          '@type': 'MonetaryAmount',
          currency: 'EUR',
          value: '5900',
        },
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Étude de votre projet',
            text: 'Simulez votre capacité d\'emprunt avec nos outils gratuits, puis échangez avec un expert AQUIZ pour définir votre stratégie : budget réaliste, localisation, type de bien.',
            url: 'https://www.aquiz.eu/simulateur',
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Recherche & visites',
            text: 'Notre équipe prospecte activement les portails, agences partenaires et biens off-market. Nous vous accompagnons en visite pour identifier travaux, charges et potentiel.',
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: 'Négociation & financement',
            text: 'Nous négocions le meilleur prix grâce aux données réelles du marché. Nos courtiers partenaires obtiennent les conditions de financement optimales.',
          },
          {
            '@type': 'HowToStep',
            position: 4,
            name: 'Sécurisation jusqu\'aux clés',
            text: 'Du compromis à l\'acte authentique, nous vérifions chaque document : conditions suspensives, appel de fonds, levée de réserves. Vous signez en toute sérénité.',
          },
        ],
      },
      // ── WebSite avec SearchAction potentiel ──
      {
        '@type': 'WebSite',
        '@id': 'https://www.aquiz.eu/#website',
        name: 'AQUIZ',
        url: 'https://www.aquiz.eu',
        publisher: { '@id': 'https://www.aquiz.eu/#org' },
        inLanguage: 'fr-FR',
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
      answer: "Notre simulateur applique les normes bancaires en vigueur : taux d'endettement maximum de 35% (norme HCSF 2026), durée max 25 ans. Il intègre les frais de notaire, l'assurance emprunteur et les données de prix officielles.",
    },
    {
      question: "Qu'est-ce que la chasse immobilière ?",
      answer: "La chasse immobilière consiste à mandater un expert pour rechercher à votre place le bien idéal. Nous accédons à des biens off-market (non publiés sur les portails) et effectuons une présélection selon vos critères.",
    },
    {
      question: 'Intervenez-vous en dehors de Paris ?',
      answer: "Nous intervenons sur Paris et toute l'Île-de-France : Hauts-de-Seine (92), Seine-Saint-Denis (93), Val-de-Marne (94), Seine-et-Marne (77), Yvelines (78), Essonne (91) et Val-d'Oise (95). Notre connaissance fine du marché francilien nous permet de vous orienter vers les secteurs les plus adaptés à votre budget.",
    },
    {
      question: 'Suis-je éligible au PTZ (Prêt à Taux Zéro) en 2026 ?',
      answer: "Le PTZ 2026 est réservé aux primo-accédants sous conditions de revenus. Notre simulateur calcule automatiquement votre éligibilité et le montant potentiel du PTZ selon la zone géographique et le type de bien (neuf ou ancien avec travaux).",
    },
    {
      question: 'Combien coûte un accompagnement AQUIZ ?',
      answer: "Nos tarifs démarrent à 5 900 € TTC pour un projet jusqu'à 500 000 €. Le rendez-vous stratégique initial de 30 minutes est gratuit et sans engagement. Tous nos outils en ligne (simulateur, comparateur, carte des prix) sont 100% gratuits.",
    },
    {
      question: 'Quel est le taux d\'endettement maximum pour acheter en 2026 ?',
      answer: "Depuis la norme HCSF, le taux d'endettement maximum est fixé à 35% de vos revenus nets, assurance emprunteur incluse. Notre simulateur calcule automatiquement votre taux et vous indique votre capacité d'emprunt.",
    },
    {
      question: 'Comment calculer les frais de notaire pour un achat immobilier ?',
      answer: "Les frais de notaire représentent environ 7-8% du prix pour un bien ancien et 2-3% pour un bien neuf (VEFA). Notre simulateur les intègre automatiquement dans le calcul de votre budget global.",
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
    <section className="py-12 sm:py-16 md:py-20 bg-white scroll-mt-20 md:scroll-mt-24" id="faq">
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
            <a
              href="#contact"
              className="inline-flex items-center gap-2 text-sm font-semibold text-aquiz-green hover:underline"
            >
              Une autre question ?
              <span className="text-lg">→</span>
            </a>
          </div>

          {/* Right — accordion */}
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                className="group rounded-xl bg-white border border-aquiz-gray-lighter/70 overflow-hidden transition-colors hover:border-aquiz-gray-lighter open:border-aquiz-green/30"
                {...(index === 0 ? { open: true } : {})}
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none">
                  <span className="text-[13px] sm:text-sm font-semibold text-aquiz-black group-open:text-aquiz-black transition-colors">
                    {faq.question}
                  </span>
                  <span className="w-6 h-6 rounded-full bg-aquiz-gray-lightest flex items-center justify-center shrink-0 ml-3">
                    <svg
                      className="w-3.5 h-3.5 text-aquiz-gray group-open:rotate-180 transition-transform duration-200"
                      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
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
      <BlogPreviewSection />
      <FaqSection />
      <ContactSection />
    </>
  )
}
