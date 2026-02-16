import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Carte des prix immobiliers en Île-de-France',
  description:
    'Explorez les prix au m² par département et commune en Île-de-France. Données DVF officielles, carte interactive avec filtres par budget.',
  openGraph: {
    title: 'Carte des prix immobiliers IDF — AQUIZ',
    description:
      'Prix au m² en Île-de-France : Paris, Hauts-de-Seine, Seine-Saint-Denis… Carte interactive basée sur les données DVF.',
    url: 'https://www.aquiz.eu/carte',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/carte',
  },
}

function CarteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Carte des prix', item: 'https://www.aquiz.eu/carte' },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default function CarteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CarteJsonLd />
      {children}
    </>
  )
}
