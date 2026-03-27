import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PTZ 2026 : Éligibilité, plafonds & aides achat immobilier — Simulateur gratuit',
  description:
    'Éligible au PTZ 2026 ? Vérifiez en 30 secondes vos aides : Prêt à Taux Zéro (jusqu\'à 50% du prix), Action Logement (40 000 € à 1%), TVA réduite, Prêt Paris Logement. Résultat personnalisé gratuit.',
  keywords: [
    'PTZ 2026',
    'prêt à taux zéro 2026',
    'aide achat immobilier',
    'éligibilité PTZ',
    'Action Logement achat',
    'aide premier achat immobilier',
    'aide primo-accédant',
    'TVA réduite immobilier neuf',
    'prêt Paris Logement',
    'aides financières achat appartement',
    'plafond PTZ zone A',
    'simulateur PTZ 2026',
    'aide accession propriété',
    'prêt accession sociale',
    'conditions PTZ 2026',
    'zone PTZ Île-de-France',
  ],
  openGraph: {
    title: 'PTZ 2026 & aides achat immobilier — Testez votre éligibilité | AQUIZ',
    description:
      'PTZ, Action Logement, TVA réduite, Prêt Paris Logement… Vérifiez en 30 secondes quelles aides vous pouvez obtenir pour acheter en Île-de-France. Résultat personnalisé par département.',
    url: 'https://www.aquiz.eu/aides',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/aides',
  },
}

function AidesJsonLd() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Aides & PTZ', item: 'https://www.aquiz.eu/aides' },
    ],
  }
  const webApp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Simulateur d\'éligibilité PTZ et aides immobilières',
    url: 'https://www.aquiz.eu/aides',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    description: 'Vérifiez gratuitement votre éligibilité au PTZ 2026, Action Logement, TVA réduite et autres aides à l\'achat immobilier en Île-de-France.',
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Qui a droit au PTZ en 2026 ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Le PTZ 2026 est accessible aux primo-accédants (pas propriétaire depuis 2 ans) sous conditions de revenus. Les plafonds varient selon la zone (A, B1, B2, C) et la composition du foyer. Notre simulateur vérifie votre éligibilité en 30 secondes.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quelles sont les aides pour un premier achat immobilier ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Les principales aides sont : le PTZ (jusqu\'à 40% du prix), Action Logement (jusqu\'à 40\u00a0000\u00a0€ à 1%), la TVA réduite à 5,5% en zone ANRU, le Prêt Paris Logement (jusqu\'à 39\u00a0600\u00a0€ à 0%), et les exonérations de taxe foncière.',
        },
      },
      {
        '@type': 'Question',
        name: 'Comment savoir si je suis éligible au PTZ ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'L\'éligibilité au PTZ dépend de 3 critères : être primo-accédant, respecter les plafonds de revenus de votre zone géographique, et acheter un logement éligible (neuf ou ancien avec travaux en zone B2/C). Testez votre éligibilité gratuitement sur AQUIZ.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quel est le plafond de revenus pour le PTZ en zone A et Abis ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'En 2026, le plafond de revenus PTZ en zone A/Abis (Paris, Hauts-de-Seine, petite couronne) est de 49\u00a0000\u00a0€ pour 1 personne, 73\u00a0500\u00a0€ pour 2 personnes, et 88\u00a0200\u00a0€ pour 3 personnes. Ces plafonds correspondent au revenu fiscal de référence N-2.',
        },
      },
      {
        '@type': 'Question',
        name: 'Peut-on cumuler le PTZ avec Action Logement ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Oui, le PTZ est cumulable avec le prêt Action Logement (jusqu\'à 40\u00a0000\u00a0€ à 1%), le Prêt Paris Logement, et un prêt bancaire classique. Le cumul de ces aides peut réduire significativement le coût total de l\'acquisition.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quelles aides pour acheter à Paris en 2026 ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'À Paris (zone Abis), les primo-accédants peuvent bénéficier du PTZ, du prêt Action Logement, du Prêt Paris Logement (jusqu\'à 39\u00a0600\u00a0€ à 0%), de la TVA réduite en zone ANRU, et de l\'exonération partielle de taxe foncière dans le neuf.',
        },
      },
      {
        '@type': 'Question',
        name: 'Action Logement : qui peut en bénéficier ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Le prêt Action Logement (ex 1% Logement) est réservé aux salariés d\'entreprises privées de 10 employés ou plus. Il finance l\'achat de la résidence principale avec un prêt allant jusqu\'à 40\u00a0000\u00a0€ à un taux de 1%, cumulable avec le PTZ.',
        },
      },
    ],
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  )
}

export default function AidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AidesJsonLd />
      {children}
    </>
  )
}
