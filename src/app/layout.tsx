import { ConditionalAnalytics } from "@/components/ConditionalAnalytics";
import { CookieConsent } from "@/components/CookieConsent";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AQUIZ — Conseil en acquisition immobilière à Paris & Île-de-France",
    template: "%s | AQUIZ",
  },
  description:
    "AQUIZ accompagne les primo-accédants à Paris & IDF : simulateur immobilier gratuit, chasse immobilière, financement. Conforme HCSF 35%. Simulez en 2 min.",
  keywords: [
    "conseil acquisition immobilière Paris",
    "simulateur immobilier gratuit",
    "capacité d'emprunt",
    "combien puis-je emprunter",
    "acheter un appartement à Paris",
    "premier achat immobilier",
    "chasse immobilière Paris",
    "prêt immobilier 2026",
    "PTZ 2026",
    "primo-accédant Île-de-France",
    "frais de notaire calcul",
    "taux crédit immobilier 2026",
    "prix immobilier Île-de-France",
    "budget immobilier",
    "achat appartement Paris",
    "achat maison IDF",
    "taux d'endettement 35%",
    "simulation prêt immobilier",
    "calcul mensualité crédit immobilier",
    "quel salaire pour emprunter",
    "calculette prêt immobilier",
    "courtier immobilier Paris",
    "AQUIZ",
  ],
  authors: [{ name: "AQUIZ" }],
  creator: "AQUIZ",
  publisher: "AQUIZ",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://www.aquiz.eu",
    siteName: "AQUIZ",
    title: "AQUIZ — Conseil en acquisition immobilière à Paris & Île-de-France",
    description:
      "Accompagnement personnalisé des primo-accédants à Paris & IDF. Simulateur gratuit, chasse immobilière et solutions de financement sur mesure.",
    images: [
      {
        url: "https://www.aquiz.eu/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "AQUIZ — Simulateur immobilier gratuit Paris & Île-de-France",
      },
    ],
  },
  metadataBase: new URL("https://www.aquiz.eu"),
  twitter: {
    card: "summary_large_image",
    title: "AQUIZ — Acquisition immobilière Paris & IDF",
    description:
      "Simulateur immobilier gratuit, chasse immobilière et accompagnement financement. 100% gratuit, sans inscription.",
    images: ["https://www.aquiz.eu/images/og-default.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1a1a",
};

/** JSON-LD Organisation — visible sur tout le site pour E-E-A-T */
function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://www.aquiz.eu/#org',
    name: 'AQUIZ',
    url: 'https://www.aquiz.eu',
    logo: 'https://www.aquiz.eu/image%20AQUIZ.jpeg',
    description: 'Conseil en acquisition immobilière à Paris & Île-de-France. Accompagnement personnalisé des primo-accédants : simulateur gratuit, chasse immobilière, financement.',
    email: 'contact@aquiz.eu',
    telephone: '+33749520106',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '58 rue de Monceau',
      addressLocality: 'Paris',
      postalCode: '75008',
      addressCountry: 'FR',
    },
    areaServed: {
      '@type': 'Place',
      name: 'Paris et Île-de-France',
    },
    sameAs: [
      'https://www.instagram.com/aquiz.eu/',
      'https://www.linkedin.com/company/aquiz/',
    ],
    knowsAbout: [
      'Acquisition immobilière',
      'Crédit immobilier',
      'Capacité d\'emprunt',
      'Prêt à taux zéro',
      'Primo-accédant',
      'Prix immobilier Île-de-France',
      'Frais de notaire',
      'Taux d\'endettement HCSF',
      'Chasse immobilière',
    ],
    knowsLanguage: 'fr',
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

/** JSON-LD WebSite — identité du site + SearchAction pour sitelinks search box */
function WebSiteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://www.aquiz.eu/#website',
    name: 'AQUIZ',
    url: 'https://www.aquiz.eu',
    publisher: { '@id': 'https://www.aquiz.eu/#org' },
    inLanguage: 'fr-FR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.aquiz.eu/blog?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

/** JSON-LD SiteNavigationElement — aide Google à générer les sitelinks */
function SiteNavigationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SiteNavigationElement',
        name: 'Simulateur immobilier',
        url: 'https://www.aquiz.eu/simulateur',
        description: 'Calculez votre capacité d\'achat ou vérifiez la faisabilité d\'un bien.',
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'Capacité d\'achat',
        url: 'https://www.aquiz.eu/simulateur/mode-a',
        description: 'Estimez votre budget maximum d\'achat immobilier.',
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'Faisabilité d\'achat',
        url: 'https://www.aquiz.eu/simulateur/mode-b',
        description: 'Vérifiez si un bien est finançable avec vos revenus.',
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'Carte des prix immobiliers',
        url: 'https://www.aquiz.eu/carte',
        description: 'Prix au m² en Île-de-France : carte interactive.',
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'Aides & PTZ',
        url: 'https://www.aquiz.eu/aides',
        description: 'Vérifiez votre éligibilité aux aides à l\'achat immobilier.',
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'Comparateur de biens',
        url: 'https://www.aquiz.eu/comparateur',
        description: 'Comparez plusieurs biens immobiliers côte à côte.',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        <OrganizationJsonLd />
        <SiteNavigationJsonLd />
        <WebSiteJsonLd />
        {/* Preconnect — accélère les requêtes DNS pour les API externes */}
        <link rel="preconnect" href="https://api-adresse.data.gouv.fr" />
        <link rel="preconnect" href="https://geo.api.gouv.fr" />
        <link rel="dns-prefetch" href="https://api-adresse.data.gouv.fr" />
        <link rel="dns-prefetch" href="https://geo.api.gouv.fr" />
        <link rel="dns-prefetch" href="https://files.data.gouv.fr" />
        {/* MapLibre tile CDNs — dns-prefetch pour accélérer le chargement carte */}
        <link rel="dns-prefetch" href="https://a.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://b.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://c.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://fonts.openmaptiles.org" />
        {/* Geo meta tags — SEO local Paris & IDF */}
        <meta name="geo.region" content="FR-75" />
        <meta name="geo.placename" content="Paris" />
        <meta name="geo.position" content="48.8789;2.3074" />
        <meta name="ICBM" content="48.8789, 2.3074" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
      >
          {children}
          <CookieConsent />
        <ConditionalAnalytics />
      </body>
    </html>
  );
}
