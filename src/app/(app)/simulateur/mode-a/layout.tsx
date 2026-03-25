import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calculer ma capacité d\'achat immobilière — Simulateur gratuit 2026',
  description:
    'Combien puis-je emprunter pour acheter ? Estimez votre budget max à Paris & IDF : revenus, charges, apport. Calcul HCSF 35%, résultats instantanés et gratuits.',
  keywords: [
    'capacité d\'achat immobilier',
    'combien puis-je emprunter',
    'calculer budget achat immobilier',
    'simulateur capacité emprunt',
    'que puis-je acheter immobilier',
    'budget maximum achat appartement',
    'capacité emprunt Paris',
    'taux endettement calcul',
    'simulation prêt immobilier gratuit',
    'primo-accédant capacité achat',
  ],
  openGraph: {
    title: 'Capacité d\'achat immobilière — Simulateur AQUIZ',
    description:
      'Combien pouvez-vous emprunter ? Calculez votre budget d\'achat, vos mensualités et votre taux d\'endettement.',
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
      { '@type': 'ListItem', position: 3, name: 'Capacité d\'achat', item: 'https://www.aquiz.eu/simulateur/mode-a' },
    ],
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Comment calculer sa capacité d\'achat immobilier ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'La capacité d\'achat dépend de vos revenus nets, charges mensuelles, apport personnel et durée de prêt. Le taux d\'endettement ne doit pas dépasser 35% (norme HCSF 2026). Notre simulateur calcule automatiquement votre budget maximum en 2 minutes.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quel salaire pour emprunter 200 000 € ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pour emprunter 200\u00a0000\u00a0€ sur 25 ans à 3,5%, la mensualité est d\'environ 1\u00a0000\u00a0€. Avec la règle des 35%, il faut gagner au minimum 2\u00a0860\u00a0€ net/mois. Utilisez notre simulateur pour un calcul précis selon votre situation.',
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
