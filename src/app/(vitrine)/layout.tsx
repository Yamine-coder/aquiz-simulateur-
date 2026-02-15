import { Footer, Navbar } from '@/components/vitrine'

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
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}
