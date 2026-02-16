import type { MetadataRoute } from 'next'

/**
 * Web App Manifest pour le support PWA
 * Permet l'installation de l'app sur mobile
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AQUIZ — Simulateur immobilier',
    short_name: 'AQUIZ',
    description:
      'Simulez votre capacité d\'achat immobilier, explorez les prix en Île-de-France et découvrez vos aides.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a1a1a',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  }
}
