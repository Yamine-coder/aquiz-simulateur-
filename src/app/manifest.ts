import type { MetadataRoute } from 'next'

/**
 * Web App Manifest pour le support PWA
 * Permet l'installation de l'app sur mobile (Android + iOS)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AQUIZ — Simulateur immobilier & conseil en acquisition',
    short_name: 'AQUIZ',
    description:
      'Simulez votre capacité d\'achat immobilier, explorez les prix en Île-de-France et découvrez vos aides. Conseil en acquisition à Paris & IDF.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1a1a1a',
    lang: 'fr',
    categories: ['finance', 'business', 'lifestyle'],
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
