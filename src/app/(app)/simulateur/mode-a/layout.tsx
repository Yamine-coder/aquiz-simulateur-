import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calculer ma capacité d\'achat immobilière — Simulateur gratuit',
  description:
    'Estimez votre budget maximum d\'achat immobilier à partir de vos revenus, charges et apport. Calcul conforme HCSF (35% max), résultats instantanés.',
  openGraph: {
    title: 'Capacité d\'achat immobilière — Simulateur AQUIZ',
    description:
      'Combien pouvez-vous emprunter ? Calculez votre budget d\'achat, vos mensualités et votre taux d\'endettement.',
    url: 'https://www.aquiz.eu/simulateur/mode-a',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/simulateur/mode-a',
  },
}

function ModeAJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Simulateur', item: 'https://www.aquiz.eu/simulateur' },
      { '@type': 'ListItem', position: 3, name: 'Capacité d\'achat', item: 'https://www.aquiz.eu/simulateur/mode-a' },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default function ModeALayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ModeAJsonLd />
      <Breadcrumbs items={[
        { label: 'Simulateur', href: '/simulateur' },
        { label: 'Capacit\u00e9 d\u2019achat' },
      ]} />
      {children}
    </>
  )
}
