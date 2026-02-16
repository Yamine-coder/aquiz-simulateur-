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
        disallow: ['/api/', '/mes-simulations', '/resultats'],
      },
    ],
    sitemap: 'https://www.aquiz.eu/sitemap.xml',
  }
}
