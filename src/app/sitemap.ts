import type { MetadataRoute } from 'next'
import { BLOG_ARTICLES, getActiveCategories } from '@/data/blog-articles'

const BASE_URL = 'https://www.aquiz.eu'

export default function sitemap(): MetadataRoute.Sitemap {
  const today = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: today, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/blog`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/simulateur`, lastModified: today, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${BASE_URL}/simulateur/mode-a`, lastModified: today, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/simulateur/mode-b`, lastModified: today, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/comparateur`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/carte`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/aides`, lastModified: today, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/mentions-legales`, lastModified: today, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const blogArticles: MetadataRoute.Sitemap = BLOG_ARTICLES.map(a => ({
    url: `${BASE_URL}/blog/${a.slug}`,
    lastModified: new Date(a.updatedAt ?? a.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const categories: MetadataRoute.Sitemap = getActiveCategories().map(cat => ({
    url: `${BASE_URL}/blog/categorie/${cat}`,
    lastModified: today,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  return [...staticPages, ...blogArticles, ...categories]
}
