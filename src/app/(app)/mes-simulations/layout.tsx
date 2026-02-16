import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mes simulations sauvegardées',
  description:
    'Retrouvez et reprenez vos simulations immobilières sauvegardées. Historique complet de vos calculs de capacité d\'achat et de faisabilité.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function MesSimulationsLayout({ children }: { children: React.ReactNode }) {
  return children
}
