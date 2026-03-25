import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Simulateur immobilier gratuit — Capacité d\'achat & faisabilité | AQUIZ',
  description:
    'Calculez gratuitement votre capacité d\'achat immobilier ou vérifiez la faisabilité d\'un bien à Paris & IDF. Simulateur conforme HCSF 2026, résultat en 2 min.',
  keywords: [
    'simulateur immobilier gratuit',
    'simulation achat immobilier',
    'capacité d\'achat immobilier',
    'calculer budget immobilier',
    'simulateur prêt immobilier',
    'taux endettement 35%',
    'combien emprunter immobilier',
    'simulation crédit immobilier Paris',
    'faisabilité achat immobilier',
    'HCSF 2026',
  ],
  openGraph: {
    title: 'Simulateur immobilier gratuit — AQUIZ',
    description:
      'Estimez votre budget d\'achat ou validez la faisabilité d\'un bien ciblé. Conforme aux normes HCSF (35% max).',
    url: 'https://www.aquiz.eu/simulateur',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/simulateur',
  },
}

function SimulateurJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
          { '@type': 'ListItem', position: 2, name: 'Simulateur', item: 'https://www.aquiz.eu/simulateur' },
        ],
      },
      {
        '@type': 'WebApplication',
        name: 'Simulateur immobilier AQUIZ',
        url: 'https://www.aquiz.eu/simulateur',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        description: 'Calculez votre capacit\u00e9 d\'achat immobilier ou v\u00e9rifiez la faisabilit\u00e9 d\'un bien.',
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

export default function SimulateurLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SimulateurJsonLd />
      {children}
    </>
  )
}
