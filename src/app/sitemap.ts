import type { MetadataRoute } from 'next'

/**
 * Sitemap dynamique pour le SEO
 * Généré automatiquement par Next.js
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.aquiz.eu'
  const now = new Date()

  return [
    // Pages vitrine
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/a-propos`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // Outils / App
    {
      url: `${baseUrl}/simulateur`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/simulateur/mode-a`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/simulateur/mode-b`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/comparateur`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/carte`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/aides`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // Légal
    {
      url: `${baseUrl}/mentions-legales`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
