import { getActiveCategories, getArticlesByCategory } from '@/data/blog-articles'
import type { BlogCategory } from '@/types/blog'
import { CATEGORY_LABELS } from '@/types/blog'
import { ArrowLeft, Clock } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// ─── Static params for SSG ───
export function generateStaticParams() {
  return getActiveCategories().map((category) => ({ category }))
}

// ─── CATEGORY_DESCRIPTIONS for meta ───
const CATEGORY_DESCRIPTIONS: Record<BlogCategory, string> = {
  financement: 'Tout sur le financement immobilier : prêt, taux, apport, PTZ et stratégies pour optimiser votre emprunt.',
  achat: 'Guides et conseils pour réussir votre achat immobilier à Paris et en Île-de-France.',
  simulation: 'Apprenez à utiliser nos simulateurs pour estimer votre capacité d\'emprunt et votre budget d\'achat.',
  marche: 'Analyses du marché immobilier en Île-de-France : tendances, prix, villes accessibles.',
  guides: 'Guides pratiques étape par étape pour les primo-accédants et acheteurs immobiliers.',
  investissement: 'Stratégies d\'investissement immobilier : locatif, SCI, indivision et optimisation fiscale.',
}

// ─── Dynamic metadata ───
export async function generateMetadata({    
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const label = CATEGORY_LABELS[category as BlogCategory]
  if (!label) return {}

  const description = CATEGORY_DESCRIPTIONS[category as BlogCategory]

  return {
    title: `${label} — Blog immobilier AQUIZ`,
    description,
    openGraph: {
      title: `${label} — Blog immobilier AQUIZ`,
      description,
      url: `https://www.aquiz.eu/blog/categorie/${category}`,
    },
    alternates: {
      canonical: `https://www.aquiz.eu/blog/categorie/${category}`,
    },
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const cat = category as BlogCategory
  const label = CATEGORY_LABELS[cat]
  if (!label) notFound()

  const articles = getArticlesByCategory(cat)
  const description = CATEGORY_DESCRIPTIONS[cat]

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.aquiz.eu/blog' },
          { '@type': 'ListItem', position: 3, name: label, item: `https://www.aquiz.eu/blog/categorie/${category}` },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: `${label} — Blog AQUIZ`,
        description,
        url: `https://www.aquiz.eu/blog/categorie/${category}`,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: articles.length,
          itemListElement: articles.map((a, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://www.aquiz.eu/blog/${a.slug}`,
            name: a.title,
          })),
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── Hero ─── */}
      <section className="relative bg-aquiz-black pt-28 pb-12 md:pt-36 md:pb-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        <div className="absolute -bottom-20 -left-20 w-100 h-100 rounded-full bg-aquiz-green/6 blur-[80px]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors mb-4"
          >
            <ArrowLeft className="w-3 h-3" />
            Retour au blog
          </Link>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/8 text-aquiz-green text-xs font-medium mb-5">
            {label}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            {label}
          </h1>
          <p className="mt-3 text-sm text-white/50 max-w-lg">
            {description}
          </p>
          <p className="mt-2 text-xs text-white/30">
            {articles.length} article{articles.length > 1 ? 's' : ''}
          </p>
        </div>
      </section>

      {/* ─── Articles ─── */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="group block rounded-xl border border-gray-100 overflow-hidden hover:border-aquiz-green/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="sm:flex">
                  {/* Image */}
                  <div className="relative sm:w-56 h-44 sm:h-auto flex-shrink-0 overflow-hidden">
                    <Image
                      src={article.coverImage}
                      alt={article.coverAlt ?? article.title}
                      width={400}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col justify-center">
                    <h2 className="text-base font-bold text-gray-900 group-hover:text-aquiz-green transition-colors leading-snug mb-2">
                      {article.title}
                    </h2>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span>{formatDate(article.publishedAt)}</span>
                      <span className="text-gray-200">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readingTime} min
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Other categories */}
          <div className="mt-16 pt-8 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Autres catégories</h2>
            <div className="flex flex-wrap gap-2">
              {getActiveCategories()
                .filter((c) => c !== cat)
                .map((c) => (
                  <Link
                    key={c}
                    href={`/blog/categorie/${c}`}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-full hover:bg-aquiz-green/10 hover:text-aquiz-green transition-colors"
                  >
                    {CATEGORY_LABELS[c]} ({getArticlesByCategory(c).length})
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
