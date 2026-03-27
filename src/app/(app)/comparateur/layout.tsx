import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Comparateur immobilier gratuit — Comparez jusqu\'à 4 biens côte à côte',
  description:
    'Comparez jusqu\'à 4 biens immobiliers : prix au m² vs marché DVF, scoring IA sur 10 axes, DPE, risques naturels, transports. Outil 100% gratuit, sans inscription.',
  keywords: [
    'comparateur immobilier',
    'comparer annonces immobilières',
    'prix au m2',
    'scoring immobilier',
    'analyse immobilière IA',
    'DPE comparaison',
    'acheter un bien immobilier',
    'comparateur prix immobilier',
    'outil comparaison bien immobilier',
    'analyser annonce immobilière',
    'rapport immobilier gratuit',
  ],
  openGraph: {
    title: 'Comparateur immobilier gratuit — Scoring IA sur 10 axes | AQUIZ',
    description:
      'Comparez prix, surface, charges et localisation de plusieurs biens immobiliers pour prendre la meilleure décision.',
    url: 'https://www.aquiz.eu/comparateur',
    siteName: 'AQUIZ',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comparateur immobilier gratuit — AQUIZ',
    description: 'Comparez jusqu\'à 4 biens côte à côte avec scoring IA, prix DVF et analyse des risques.',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/comparateur',
  },
}

function ComparateurJsonLd() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Comparateur', item: 'https://www.aquiz.eu/comparateur' },
    ],
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Comment fonctionne le comparateur AQUIZ ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Ajoutez de 2 à 4 annonces immobilières (par URL ou manuellement). AQUIZ analyse automatiquement chaque bien sur 10 axes : prix vs marché DVF, DPE, transports, risques naturels, etc. Vous obtenez un score sur 100 et un rapport PDF complet.',
        },
      },
      {
        '@type': 'Question',
        name: 'Est-ce que le comparateur est gratuit ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Oui, le comparateur AQUIZ est 100\u00a0% gratuit. L\'analyse comparative, le scoring 10 axes et le rapport PDF sont accessibles sans abonnement.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quels sites d\'annonces sont supportés ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AQUIZ supporte les annonces de SeLoger, LeBonCoin, Bien\'ici, PAP, Logic-Immo, Orpi, Century 21, Laforêt, IAD France, et bien d\'autres portails immobiliers français.',
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

export default function ComparateurLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ComparateurJsonLd />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        {children}
      </Suspense>
    </>
  )
}
