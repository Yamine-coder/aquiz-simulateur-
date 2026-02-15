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
    default: "AQUIZ - Simulateur immobilier gratuit",
    template: "%s | AQUIZ",
  },
  description:
    "Simulez votre capacité d'achat immobilier, calculez vos mensualités et découvrez les aides financières disponibles. Conforme aux critères HCSF (35% max).",
  keywords: [
    "simulateur immobilier",
    "capacité d'emprunt",
    "prêt immobilier",
    "achat appartement",
    "achat maison",
    "taux d'endettement",
    "PTZ",
    "primo-accédant",
    "frais de notaire",
    "mensualité crédit",
  ],
  authors: [{ name: "AQUIZ" }],
  creator: "AQUIZ",
  publisher: "AQUIZ",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://www.aquiz.eu",
    siteName: "AQUIZ",
    title: "AQUIZ - Conseil en acquisition immobilière",
    description:
      "Conseil en acquisition immobilière à Paris & IDF. Simulateur gratuit, chasse immobilière et financement.",
  },
  metadataBase: new URL("https://www.aquiz.eu"),
  twitter: {
    card: "summary_large_image",
    title: "AQUIZ - Simulateur immobilier gratuit",
    description:
      "Simulez votre capacité d'achat immobilier et calculez vos mensualités. 100% gratuit.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
      >
        {children}
      </body>
    </html>
  );
}
