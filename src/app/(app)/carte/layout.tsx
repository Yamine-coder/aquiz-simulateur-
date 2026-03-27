import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Carte des prix immobiliers au m² à Paris & Île-de-France — 2026',
  description:
    'Découvrez les prix immobiliers au m² par commune en Île-de-France. Carte interactive avec données DVF officielles : Paris, 92, 93, 94, 77, 78, 91, 95. Filtrez par budget. 100% gratuit.',
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
    'estimation prix immobilier',
    'prix immobilier par ville',
    'marché immobilier Île-de-France 2026',
    'où acheter en Île-de-France',
    'prix m2 petite couronne',
  ],
  openGraph: {
    title: 'Carte des prix immobiliers à Paris & IDF — Données DVF 2026 | AQUIZ',
    description:
      'Prix au m² en Île-de-France : Paris, Hauts-de-Seine, Seine-Saint-Denis… Carte interactive avec données DVF officielles et filtres par budget.',
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
  const dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Prix immobiliers au m² en Île-de-France',
    description: 'Données de prix immobiliers au m² par commune en Île-de-France, issues des Demandes de Valeurs Foncières (DVF) de la DGFiP.',
    url: 'https://www.aquiz.eu/carte',
    creator: { '@type': 'Organization', name: 'AQUIZ', url: 'https://www.aquiz.eu' },
    license: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence/',
    spatialCoverage: { '@type': 'Place', name: 'Île-de-France, France' },
    temporalCoverage: '2023/2026',
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
          text: 'Les communes les plus accessibles se trouvent en Seine-et-Marne (77), Essonne (91) et Val-d\'Oise (95), avec des prix entre 2\u00a0500 et 4\u00a0000\u00a0€/m². Utilisez nos filtres par budget pour identifier les zones adaptées à votre capacité d\'emprunt.',
        },
      },
      {
        '@type': 'Question',
        name: 'D\'où viennent les données de prix immobilier ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Nos données proviennent des DVF (Demandes de Valeurs Foncières), la base officielle des transactions immobilières publiée par la DGFiP. Elles sont mises à jour régulièrement et couvrent toutes les communes d\'Île-de-France.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quel est le prix moyen au m² à Paris en 2026 ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Le prix moyen au m² à Paris en 2026 est d\'environ 9\u00a0500\u00a0€, avec des écarts importants selon les arrondissements : de 8\u00a0000\u00a0€/m² dans le 19e à plus de 13\u00a0000\u00a0€/m² dans le 6e. Consultez notre carte pour voir les prix quartier par quartier.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quelles sont les villes les moins chères en petite couronne (92, 93, 94) ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'En petite couronne, les villes les plus accessibles sont en Seine-Saint-Denis (93) : Clichy-sous-Bois, Stains, La Courneuve avec des prix autour de 3\u00a0000 à 4\u00a0000\u00a0€/m². En Val-de-Marne (94), Villeneuve-Saint-Georges et Orly sont aussi accessibles. Utilisez notre carte pour comparer en temps réel.',
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }}
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
