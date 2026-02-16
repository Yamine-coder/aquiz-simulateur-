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
      <Navbar />
      <main className="pt-18 md:pt-22">{children}</main>
      <Footer />
    </>
  )
}
