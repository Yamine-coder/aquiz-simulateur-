import { BLOG_ARTICLES } from '@/data/blog-articles'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog immobilier — Guides, conseils et actualités',
  description:
    'Retrouvez nos articles sur l\'achat immobilier à Paris & IDF : PTZ 2026, taux de crédit, guides primo-accédants, frais de notaire et astuces financement.',
  openGraph: {
    title: 'Blog immobilier — AQUIZ',
    description:
      'Guides, analyses et conseils pour réussir votre achat immobilier en Île-de-France. Par les experts AQUIZ.',
    url: 'https://www.aquiz.eu/blog',
  },
  alternates: {
    canonical: 'https://www.aquiz.eu/blog',
  },
}

function BlogJsonLd() {
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.aquiz.eu/blog' },
    ],
  }

  const blogLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog immobilier — AQUIZ',
    description:
      'Guides, analyses et conseils pour réussir votre achat immobilier en Île-de-France.',
    url: 'https://www.aquiz.eu/blog',
    publisher: {
      '@type': 'Organization',
      name: 'AQUIZ',
      url: 'https://www.aquiz.eu',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.aquiz.eu/images/logo.png',
      },
    },
    blogPost: BLOG_ARTICLES.map((article) => ({
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.excerpt,
      url: `https://www.aquiz.eu/blog/${article.slug}`,
      datePublished: article.publishedAt,
      ...(article.updatedAt && { dateModified: article.updatedAt }),
      image: `https://www.aquiz.eu${article.coverImage}`,
      author: {
        '@type': 'Organization',
        name: article.author.name,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }}
      />
    </>
  )
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BlogJsonLd />
      {children}
    </>
  )
}
