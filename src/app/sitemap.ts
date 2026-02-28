import { BLOG_ARTICLES } from '@/data/blog-articles'
import type { MetadataRoute } from 'next'

/**
 * Sitemap statique pour le SEO
 * Timestamps manuels — mis à jour à chaque déploiement significatif.
 * Utiliser des dates fixes évite le piège du `new Date()` qui trompe
 * les moteurs de recherche en signalant un changement à chaque crawl.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.aquiz.eu'

  // Mettre à jour cette date lors de chaque déploiement majeur
  const DERNIERE_MAJ = '2026-02-26'

  // Articles de blog
  const blogEntries: MetadataRoute.Sitemap = BLOG_ARTICLES.map((article) => ({
    url: `${baseUrl}/blog/${article.slug}`,
    lastModified: article.updatedAt ?? article.publishedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    // Pages vitrine
    {
      url: baseUrl,
      lastModified: DERNIERE_MAJ,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/a-propos`,
      lastModified: DERNIERE_MAJ,
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // Blog
    {
      url: `${baseUrl}/blog`,
      lastModified: DERNIERE_MAJ,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogEntries,

    // Outils / App
    {
      url: `${baseUrl}/simulateur`,
      lastModified: DERNIERE_MAJ,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/simulateur/mode-a`,
      lastModified: DERNIERE_MAJ,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/simulateur/mode-b`,
      lastModified: DERNIERE_MAJ,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/comparateur`,
      lastModified: DERNIERE_MAJ,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/carte`,
      lastModified: DERNIERE_MAJ,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/aides`,
      lastModified: DERNIERE_MAJ,
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // Légal
    {
      url: `${baseUrl}/mentions-legales`,
      lastModified: DERNIERE_MAJ,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
