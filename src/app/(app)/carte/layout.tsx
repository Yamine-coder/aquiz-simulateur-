import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prix immobilier au m² en Île-de-France — Carte interactive 2026',
  description:
    'Carte des prix immobiliers au m² par commune en Île-de-France : Paris, 92, 93, 94, 77, 78, 91, 95. Données DVF officielles, filtres par budget. Gratuit.',
  keywords: [
    'prix immobilier au m2 Île-de-France',
    'carte prix immobilier Paris',
    'prix m2 par commune IDF',
    'prix immobilier Hauts-de-Seine',
    'prix immobilier Seine-Saint-Denis',
    'prix immobilier Val-de-Marne',
    'données DVF immobilier',
    'prix appartement Paris 2026',
    'carte interactive immobilier',
    'prix moyen m2 Île-de-France',
  ],
  openGraph: {
    title: 'Carte des prix immobiliers IDF — AQUIZ',
    description:
      'Prix au m² en Île-de-France : Paris, Hauts-de-Seine, Seine-Saint-Denis… Carte interactive basée sur les données officielles.',
    url: 'https://www.aquiz.eu/carte',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/carte',
  },
}

function CarteJsonLd() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Carte des prix', item: 'https://www.aquiz.eu/carte' },
    ],
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Quel est le prix au m² en Île-de-France en 2026 ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'En 2026, le prix moyen au m² en Île-de-France varie de 2\u00a0500\u00a0€ en grande couronne à plus de 10\u00a0000\u00a0€ à Paris intra-muros. Notre carte interactive affiche les prix DVF officiels commune par commune.',
        },
      },
      {
        '@type': 'Question',
        name: 'Où acheter en Île-de-France avec un petit budget ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Les communes les plus accessibles se trouvent en Seine-et-Marne (77), Essonne (91) et Val-d\'Oise (95), avec des prix entre 2\u00a0500 et 4\u00a0000\u00a0€/m². Utilisez nos filtres par budget pour trouver les zones adaptées.',
        },
      },
      {
        '@type': 'Question',
        name: 'D\'où viennent les données de prix immobilier ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Nos données proviennent des DVF (Demandes de Valeurs Foncières), la base officielle des transactions immobilières publiée par la DGFiP. Elles sont mises à jour régulièrement.',
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

export default function CarteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CarteJsonLd />
      {children}
    </>
  )
}
