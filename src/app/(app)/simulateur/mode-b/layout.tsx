import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Puis-je acheter ce bien ? — Simulateur faisabilité immobilière 2026',
  description:
    'Entrez le prix d\'un bien et vérifiez si vous pouvez l\'acheter : salaire minimum requis, apport conseillé, mensualités et taux d\'endettement. 100% gratuit, résultat instantané.',
  keywords: [
    'puis-je acheter ce bien',
    'faisabilité achat immobilier',
    'vérifier financement immobilier',
    'salaire minimum pour acheter',
    'simulateur faisabilité',
    'revenu nécessaire achat appartement',
    'peut-on acheter avec tel salaire',
    'financement bien immobilier Paris',
    'apport nécessaire achat immobilier',
    'mensualité crédit immobilier',
    'quel salaire pour acheter un appartement',
    'calculer mensualité prêt immobilier',
    'achat immobilier sans apport',
    'budget achat appartement Paris',
  ],
  openGraph: {
    title: 'Puis-je acheter ce bien ? — Vérifiez en 30 secondes | AQUIZ',
    description:
      'Entrez le prix du bien et découvrez les revenus nécessaires, l\'apport optimal et la mensualité estimée. Gratuit, sans inscription.',
    url: 'https://www.aquiz.eu/simulateur/mode-b',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/simulateur/mode-b',
  },
}

function ModeBJsonLd() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Simulateur', item: 'https://www.aquiz.eu/simulateur' },
      { '@type': 'ListItem', position: 3, name: 'Faisabilité', item: 'https://www.aquiz.eu/simulateur/mode-b' },
    ],
  }
  const softwareApp = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Simulateur de faisabilité d\'achat AQUIZ',
    url: 'https://www.aquiz.eu/simulateur/mode-b',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '94',
      bestRating: '5',
    },
    description: 'Vérifiez si vous pouvez acheter un bien immobilier : salaire minimum requis, apport conseillé, mensualités. Gratuit et instantané.',
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Comment savoir si je peux acheter un bien immobilier ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Entrez le prix du bien dans notre simulateur : il calcule automatiquement le salaire minimum requis, l\'apport conseillé, la mensualité et le taux d\'endettement. Si votre taux reste sous 35% (norme HCSF), le bien est finançable.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quel salaire pour acheter un appartement à 300 000 € ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pour un bien à 300\u00a0000\u00a0€ avec 10% d\'apport (30\u00a0000\u00a0€), il faut emprunter 270\u00a0000\u00a0€. Sur 25 ans à 3,5%, la mensualité est d\'environ 1\u00a0350\u00a0€, soit un salaire minimum de 3\u00a0860\u00a0€ net/mois.',
        },
      },
      {
        '@type': 'Question',
        name: 'Faut-il un apport pour acheter un bien immobilier ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Un apport de 10% minimum est recommandé pour couvrir les frais de notaire (7-8% dans l\'ancien, 2-3% dans le neuf). Certaines banques acceptent des dossiers sans apport pour les primo-accédants avec de bons revenus et un CDI.',
        },
      },
      {
        '@type': 'Question',
        name: 'Combien de frais de notaire pour un achat immobilier ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Les frais de notaire représentent environ 7 à 8% du prix pour un bien ancien et 2 à 3% pour un bien neuf (VEFA). Pour un bien à 250\u00a0000\u00a0€ dans l\'ancien, comptez environ 18\u00a0000 à 20\u00a0000\u00a0€ de frais de notaire. Notre simulateur les intègre automatiquement.',
        },
      },
      {
        '@type': 'Question',
        name: 'Peut-on acheter un appartement à Paris avec un petit salaire ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Oui, grâce aux prêts aidés (PTZ, Action Logement, Prêt Paris Logement) et en ciblant les communes accessibles de la petite couronne. Avec 2\u00a0000\u00a0€/mois, vous pouvez emprunter environ 140\u00a0000\u00a0€. Utilisez notre simulateur pour trouver votre budget exact.',
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

export default function ModeBLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ModeBJsonLd />
      {children}
    </>
  )
}
