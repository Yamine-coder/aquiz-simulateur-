import { ScrollToTop } from '@/components/ScrollToTop'
import { Footer, Navbar } from '@/components/vitrine'

/**
 * Layout pour les pages applicatives (simulateur, carte, aides, comparateur, historique).
 * Utilise le même Navbar/Footer que la vitrine pour une expérience unifiée.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
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
      <main id="main-content" className="pt-18 md:pt-22">{children}</main>
      <Footer />
    </>
  )
}
