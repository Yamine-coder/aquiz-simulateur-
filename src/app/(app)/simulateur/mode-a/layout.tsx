import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Simulation capacité d\'emprunt immobilier — Calculez votre budget 2026',
  description:
    'Calculez gratuitement votre capacité d\'emprunt immobilier en 2 min. Revenus, charges, apport, durée : découvrez combien vous pouvez emprunter. Conforme HCSF 35%. Résultat instantané.',
  keywords: [
    'capacité d\'emprunt immobilier',
    'combien puis-je emprunter',
    'calculer budget achat immobilier',
    'simulateur capacité emprunt',
    'simulation prêt immobilier gratuit',
    'que puis-je acheter immobilier',
    'budget maximum achat appartement',
    'capacité emprunt Paris',
    'taux endettement calcul',
    'primo-accédant capacité achat',
    'quel salaire pour emprunter 200 000',
    'quel salaire pour emprunter 300 000',
    'calculette prêt immobilier',
    'mensualité crédit immobilier',
    'combien emprunter avec mon salaire',
  ],
  openGraph: {
    title: 'Simulation capacité d\'emprunt — Calculez votre budget | AQUIZ',
    description:
      'Combien pouvez-vous emprunter ? Calculez votre budget d\'achat, vos mensualités et votre taux d\'endettement. Gratuit, sans inscription.',
    url: 'https://www.aquiz.eu/simulateur/mode-a',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/simulateur/mode-a',
  },
}

function ModeAJsonLd() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Simulateur', item: 'https://www.aquiz.eu/simulateur' },
      { '@type': 'ListItem', position: 3, name: 'Capacité d\'emprunt', item: 'https://www.aquiz.eu/simulateur/mode-a' },
    ],
  }
  const softwareApp = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Simulateur de capacité d\'emprunt AQUIZ',
    url: 'https://www.aquiz.eu/simulateur/mode-a',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '127',
      bestRating: '5',
    },
    description: 'Calculez gratuitement votre capacité d\'emprunt immobilier : revenus, charges, apport, durée. Conforme HCSF 35%. Résultat instantané.',
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Comment calculer sa capacité d\'emprunt immobilier ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'La capacité d\'emprunt dépend de vos revenus nets, charges mensuelles, apport personnel et durée de prêt. Le taux d\'endettement ne doit pas dépasser 35% (norme HCSF 2026). Formule : (Revenus × 35% − Charges) = Mensualité max. Notre simulateur calcule automatiquement votre budget maximum en 2 minutes.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quel salaire pour emprunter 200 000 € ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pour emprunter 200\u00a0000\u00a0€ sur 25 ans à 3,5%, la mensualité est d\'environ 1\u00a0000\u00a0€. Avec la règle des 35%, il faut gagner au minimum 2\u00a0860\u00a0€ net/mois. Sur 20 ans, il faut environ 3\u00a0300\u00a0€/mois. Utilisez notre simulateur pour un calcul précis selon votre situation.',
        },
      },
      {
        '@type': 'Question',
        name: 'Combien puis-je emprunter avec 2 500 € de salaire ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Avec 2\u00a0500\u00a0€ net/mois et sans charges, votre mensualité max est de 875\u00a0€ (35%). Sur 25 ans à 3,5%, cela représente environ 175\u00a0000\u00a0€ d\'emprunt. L\'apport personnel s\'ajoute à cette capacité.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quel salaire pour emprunter 300 000 € ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pour emprunter 300\u00a0000\u00a0€ sur 25 ans au taux de 3,5%, la mensualité est d\'environ 1\u00a0500\u00a0€/mois. Avec la règle HCSF des 35%, il faut un salaire net d\'au moins 4\u00a0285\u00a0€/mois. Avec un apport de 30\u00a0000\u00a0€, vous pouvez viser un bien à 330\u00a0000\u00a0€.',
        },
      },
      {
        '@type': 'Question',
        name: 'Comment augmenter sa capacité d\'emprunt ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pour augmenter votre capacité d\'emprunt : 1) Soldez vos crédits en cours (auto, conso), 2) Augmentez la durée du prêt (jusqu\'à 25 ans), 3) Constituez un apport plus important, 4) Bénéficiez de prêts aidés (PTZ, Action Logement) qui ne comptent pas dans l\'endettement, 5) Faites jouer la concurrence entre banques via un courtier.',
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  )
}

export default function ModeALayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ModeAJsonLd />
      {children}
    </>
  )
}
