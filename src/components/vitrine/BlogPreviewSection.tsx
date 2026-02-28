import { BLOG_ARTICLES } from '@/data/blog-articles'
import { CATEGORY_LABELS } from '@/types/blog'
import { ArrowRight, Clock, Newspaper } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { FadeIn, StaggerContainer, StaggerItem } from './Motion'

/** Featured article slugs — hand-picked for visual diversity on the homepage. */
const FEATURED_SLUGS = [
  'premier-achat-immobilier-paris-guide',
  'investissement-locatif-2026-rentabilite-fiscalite',
  'primo-accedant-10-erreurs-a-eviter',
]

/**
 * Blog preview section for the homepage — shows 3 hand-picked articles.
 * Integrates seamlessly into the one-page scroll flow.
 */
export function BlogPreviewSection() {
  const latestArticles = FEATURED_SLUGS.map(
    (slug) => BLOG_ARTICLES.find((a) => a.slug === slug)!
  ).filter(Boolean)

  return (
    <section
      className="py-12 sm:py-16 md:py-20 bg-white scroll-mt-20 md:scroll-mt-24"
      id="blog"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <FadeIn className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-medium mb-3">
                <Newspaper className="w-3.5 h-3.5" />
                Blog
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-aquiz-black">
                Nos derniers <span className="text-aquiz-green">articles</span>
              </h2>
              <p className="mt-2 text-sm text-aquiz-gray max-w-md leading-relaxed">
                Guides, analyses du marché et conseils pratiques pour réussir votre acquisition immobilière.
              </p>
            </div>

            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-aquiz-green hover:underline shrink-0 self-start sm:self-auto"
            >
              Voir tous les articles
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </FadeIn>

        {/* ── Cards grid ── */}
        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestArticles.map((article) => (
            <StaggerItem key={article.slug}>
              <Link href={`/blog/${article.slug}`} className="group block h-full">
                <article className="h-full flex flex-col bg-white rounded-2xl border border-aquiz-gray-lighter/70 overflow-hidden hover:border-aquiz-green/30 hover:shadow-xl hover:shadow-black/4 transition-all duration-300 hover:-translate-y-1">

                  {/* Image */}
                  <div className="relative aspect-16/10 overflow-hidden shrink-0">
                    <Image
                      src={article.coverImage}
                      alt={article.coverAlt ?? article.title}
                      fill
                      className="object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent" />

                    {/* Category pill */}
                    <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white bg-aquiz-green/90 backdrop-blur-sm shadow-sm">
                      {CATEGORY_LABELS[article.category]}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="text-[14px] font-bold text-aquiz-black leading-[1.4] group-hover:text-aquiz-green transition-colors duration-200 mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-[12px] text-aquiz-gray leading-relaxed line-clamp-2 flex-1">
                      {article.excerpt}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-aquiz-gray-lighter/50">
                      <span className="inline-flex items-center gap-1.5 text-[10.5px] text-aquiz-gray-light">
                        <Clock className="w-3 h-3" />
                        {article.readingTime} min de lecture
                      </span>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-aquiz-gray-lightest group-hover:bg-aquiz-green group-hover:text-white text-aquiz-gray-light transition-all duration-300">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Bottom green line on hover */}
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-aquiz-green scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </article>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* ── Bottom CTA ── */}
        <FadeIn className="mt-10 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-aquiz-black text-white text-sm font-semibold hover:bg-aquiz-green active:scale-[0.98] transition-all duration-300 shadow-sm"
          >
            Explorer le blog
            <ArrowRight className="w-4 h-4" />
          </Link>
        </FadeIn>
      </div>
    </section>
  )
}
