import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Comparateur de biens immobiliers — Comparez jusqu\'à 4 biens',
  description:
    'Comparez jusqu\'à 4 biens immobiliers côte à côte : prix, surface, charges, rentabilité. Outil gratuit pour faire le bon choix.',
  openGraph: {
    title: 'Comparateur immobilier — AQUIZ',
    description:
      'Comparez prix, surface, charges et localisation de plusieurs biens immobiliers pour prendre la meilleure décision.',
    url: 'https://www.aquiz.eu/comparateur',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/comparateur',
  },
}

function ComparateurJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Comparateur', item: 'https://www.aquiz.eu/comparateur' },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
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
