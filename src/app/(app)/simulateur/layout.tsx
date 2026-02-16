import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Simulateur immobilier gratuit — Capacité d\'achat & faisabilité',
  description:
    'Calculez votre capacité d\'achat immobilier ou vérifiez la faisabilité d\'un bien. Simulateur conforme HCSF, 100% gratuit, sans inscription.',
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
