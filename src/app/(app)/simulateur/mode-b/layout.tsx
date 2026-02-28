import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Puis-je acheter ce bien ? — Vérification de faisabilité',
  description:
    'Vérifiez si un bien immobilier est finançable : revenus minimums requis, apport conseillé, mensualité à prévoir. Simulation instantanée et gratuite.',
  openGraph: {
    title: 'Faisabilité d\'achat immobilier — Simulateur AQUIZ',
    description:
      'Entrez le prix du bien et découvrez les revenus nécessaires, l\'apport optimal et la mensualité estimée.',
    url: 'https://www.aquiz.eu/simulateur/mode-b',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/simulateur/mode-b',
  },
}

function ModeBJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Simulateur', item: 'https://www.aquiz.eu/simulateur' },
      { '@type': 'ListItem', position: 3, name: 'Faisabilité', item: 'https://www.aquiz.eu/simulateur/mode-b' },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default function ModeBLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ModeBJsonLd />
      <Breadcrumbs items={[
        { label: 'Simulateur', href: '/simulateur' },
        { label: 'Faisabilit\u00e9' },
      ]} />
      {children}
    </>
  )
}
