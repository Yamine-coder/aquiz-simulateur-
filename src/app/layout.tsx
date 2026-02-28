import { ConditionalAnalytics } from "@/components/ConditionalAnalytics";
import { CookieConsent } from "@/components/CookieConsent";
import { SplashScreen } from "@/components/SplashScreen";
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
    "acheter un appartement à Paris",
    "premier achat immobilier",
    "chasse immobilière Paris",
    "prêt immobilier",
    "PTZ 2026",
    "primo-accédant Île-de-France",
    "frais de notaire calcul",
    "taux crédit immobilier 2026",
    "prix immobilier Île-de-France",
    "budget immobilier",
    "achat appartement Paris",
    "achat maison IDF",
    "taux d'endettement 35%",
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
  },
  metadataBase: new URL("https://www.aquiz.eu"),
  twitter: {
    card: "summary_large_image",
    title: "AQUIZ — Acquisition immobilière Paris & IDF",
    description:
      "Simulateur immobilier gratuit, chasse immobilière et accompagnement financement. 100% gratuit, sans inscription.",
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
      {
        '@type': 'SiteNavigationElement',
        name: 'À propos',
        url: 'https://www.aquiz.eu/a-propos',
        description: 'Découvrez l\'équipe AQUIZ et notre mission.',
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
        {/* Preconnect — accélère les requêtes DNS pour les API externes */}
        <link rel="preconnect" href="https://api-adresse.data.gouv.fr" />
        <link rel="preconnect" href="https://geo.api.gouv.fr" />
        <link rel="dns-prefetch" href="https://api-adresse.data.gouv.fr" />
        <link rel="dns-prefetch" href="https://geo.api.gouv.fr" />
        <link rel="dns-prefetch" href="https://files.data.gouv.fr" />
        {/* Geo meta tags — SEO local Paris & IDF */}
        <meta name="geo.region" content="FR-75" />
        <meta name="geo.placename" content="Paris" />
        <meta name="geo.position" content="48.8789;2.3074" />
        <meta name="ICBM" content="48.8789, 2.3074" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
      >
        <SplashScreen>
          {children}
          <CookieConsent />
        </SplashScreen>
        <ConditionalAnalytics />
      </body>
    </html>
  );
}
