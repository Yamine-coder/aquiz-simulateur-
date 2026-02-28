import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aides à l\'achat immobilier & PTZ — Simulateur d\'éligibilité',
  description:
    'Découvrez toutes les aides financières pour votre achat immobilier : PTZ, Action Logement, TVA réduite, exonérations. Vérifiez votre éligibilité en ligne.',
  openGraph: {
    title: 'Aides immobilières & PTZ — AQUIZ',
    description:
      'Prêt à Taux Zéro, Action Logement, TVA réduite… Simulez vos aides à l\'achat immobilier en Île-de-France.',
    url: 'https://www.aquiz.eu/aides',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/aides',
  },
}

function AidesJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Aides & PTZ', item: 'https://www.aquiz.eu/aides' },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default function AidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AidesJsonLd />
      <Breadcrumbs items={[{ label: 'Aides & PTZ' }]} />
      {children}
    </>
  )
}
