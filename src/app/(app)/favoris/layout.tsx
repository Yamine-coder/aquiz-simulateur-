import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mes favoris — AQUIZ',
  description:
    'Retrouvez vos annonces immobilières favorites sauvegardées dans le comparateur AQUIZ.',
  robots: { index: false },
}

export default function FavorisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
