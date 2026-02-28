import type { MetadataRoute } from 'next'

/**
 * robots.txt dynamique pour le SEO
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/admin/',
          '/_next/',
          '/mes-simulations',
          '/resultats',
          '/favoris',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/mes-simulations', '/resultats', '/favoris'],
      },
    ],
    sitemap: 'https://www.aquiz.eu/sitemap.xml',
    host: 'https://www.aquiz.eu',
  }
}
