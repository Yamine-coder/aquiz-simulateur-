import { ScrollToTop } from '@/components/ScrollToTop'
import { Footer, Navbar, ScrollToTopButton } from '@/components/vitrine'

/**
 * Layout pour les pages vitrine (accueil, services, contact, etc.)
 * Inclut la Navbar et le Footer corporate
 */
export default function VitrineLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <ScrollToTop />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-aquiz-green focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Aller au contenu principal
      </a>
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
      <ScrollToTopButton />
    </>
  )
}
