import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Puis-je acheter ce bien ? — Vérification faisabilité immobilière 2026',
  description:
    'Entrez le prix d\'un bien et vérifiez si vous pouvez l\'acheter : salaire minimum, apport conseillé, mensualités. Gratuit et instantané.',
  keywords: [
    'puis-je acheter ce bien',
    'faisabilité achat immobilier',
    'vérifier financement immobilier',
    'salaire minimum pour acheter',
    'simulateur faisabilité',
    'revenu nécessaire achat appartement',
    'peut-on acheter avec tel salaire',
    'financement bien immobilier Paris',
    'apport nécessaire achat immobilier',
    'mensualité crédit immobilier',
  ],
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
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Simulateur', item: 'https://www.aquiz.eu/simulateur' },
      { '@type': 'ListItem', position: 3, name: 'Faisabilité', item: 'https://www.aquiz.eu/simulateur/mode-b' },
    ],
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Comment savoir si je peux acheter un bien immobilier ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Entrez le prix du bien dans notre simulateur : il calcule automatiquement le salaire minimum requis, l\'apport conseillé, la mensualité et le taux d\'endettement. Si votre taux reste sous 35% (norme HCSF), le bien est finançable.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quel salaire pour acheter un appartement à 300 000 € ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pour un bien à 300\u00a0000\u00a0€ avec 10% d\'apport (30\u00a0000\u00a0€), il faut emprunter 270\u00a0000\u00a0€. Sur 25 ans à 3,5%, la mensualité est d\'environ 1\u00a0350\u00a0€, soit un salaire minimum de 3\u00a0860\u00a0€ net/mois.',
        },
      },
      {
        '@type': 'Question',
        name: 'Faut-il un apport pour acheter un bien immobilier ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Un apport de 10% minimum est recommandé pour couvrir les frais de notaire (7-8% dans l\'ancien). Certaines banques acceptent des dossiers sans apport pour les primo-accédants avec de bons revenus.',
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

export default function ModeBLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ModeBJsonLd />
      {children}
    </>
  )
}
