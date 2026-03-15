import type { Metadata } from 'next'
import { AdminShell } from './AdminShell'

export const metadata: Metadata = {
  title: 'Admin — AQUIZ',
  robots: { index: false, follow: false },
}

/**
 * Layout admin — séparé du layout public (pas de Navbar/Footer)
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminShell>{children}</AdminShell>
    </div>
  )
}
