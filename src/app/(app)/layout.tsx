import { Footer, Navbar } from '@/components/vitrine'

/**
 * Layout pour les pages applicatives (simulateur, carte, aides, comparateur, historique).
 * Utilise le même Navbar/Footer que la vitrine pour une expérience unifiée.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-[72px] md:pt-[88px]">{children}</main>
      <Footer />
    </>
  )
}
