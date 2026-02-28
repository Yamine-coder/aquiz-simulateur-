import { ActiveTOC } from '@/components/blog/ActiveTOC'
import { CopyLinkButton } from '@/components/blog/CopyLinkButton'
import { ReadingProgress } from '@/components/blog/ReadingProgress'
import { MobileScrollTop } from '@/components/blog/ScrollToTop'
import { BLOG_ARTICLES, getAdjacentArticles, getArticleBySlug, getRelatedArticles } from '@/data/blog-articles'
import type { BlogArticle } from '@/types/blog'
import { CATEGORY_LABELS } from '@/types/blog'
import { ArrowLeft, ArrowRight, Clock, ExternalLink, Mail } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// ─── Static params for SSG ───
export function generateStaticParams() {
  return BLOG_ARTICLES.map((article) => ({
    slug: article.slug,
  }))
}

// ─── Dynamic metadata ───
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return {}

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `https://www.aquiz.eu/blog/${article.slug}`,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: [article.author.name],
      locale: 'fr_FR',
      images: article.coverImage
        ? [
            {
              url: `https://www.aquiz.eu${article.coverImage}`,
              width: 1200,
              height: 800,
              alt: article.coverAlt ?? article.title,
            },
          ]
        : undefined,
    },
    alternates: {
      canonical: `https://www.aquiz.eu/blog/${article.slug}`,
    },
  }
}

// ─── JSON-LD ───
function ArticleJsonLd({ article }: { article: BlogArticle }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.aquiz.eu' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.aquiz.eu/blog' },
          { '@type': 'ListItem', position: 3, name: article.title, item: `https://www.aquiz.eu/blog/${article.slug}` },
        ],
      },
      {
        '@type': 'BlogPosting',
        '@id': `https://www.aquiz.eu/blog/${article.slug}#article`,
        headline: article.title,
        description: article.excerpt,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt ?? article.publishedAt,
        author: {
          '@type': 'Organization',
          name: article.author.name,
          url: 'https://www.aquiz.eu',
        },
        publisher: {
          '@type': 'Organization',
          name: 'AQUIZ',
          url: 'https://www.aquiz.eu',
          logo: {
            '@type': 'ImageObject',
            url: 'https://www.aquiz.eu/image%20AQUIZ.jpeg',
          },
        },
        mainEntityOfPage: `https://www.aquiz.eu/blog/${article.slug}`,
        ...(article.coverImage && {
          image: {
            '@type': 'ImageObject',
            url: `https://www.aquiz.eu${article.coverImage}`,
            width: 1200,
            height: 800,
          },
        }),
        articleSection: CATEGORY_LABELS[article.category],
        keywords: article.tags.join(', '),
        wordCount: article.sections.reduce((acc, s) => {
          const sectionWords = s.content.replace(/<[^>]*>/g, '').split(/\s+/).length
          const subWords = s.subsections?.reduce((a, sub) => a + sub.content.replace(/<[^>]*>/g, '').split(/\s+/).length, 0) ?? 0
          return acc + sectionWords + subWords
        }, 0),
        inLanguage: 'fr-FR',
      },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// ─── Heading → anchor ID ───
const headingToId = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// ─── PAGE ───
export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const related = getRelatedArticles(article, 3)
  const { prev, next } = getAdjacentArticles(article)

  const shareUrl = encodeURIComponent(`https://www.aquiz.eu/blog/${article.slug}`)
  const shareText = encodeURIComponent(article.title)

  // Prepare TOC sections for ActiveTOC component (H2 + H3)
  const tocSections = article.sections.map((s) => ({
    heading: s.heading,
    id: headingToId(s.heading),
    children: s.subsections?.map((sub) => ({
      heading: sub.heading,
      id: headingToId(sub.heading),
    })),
  }))

  return (
    <main className="min-h-screen bg-white">
      <ReadingProgress />
      <ArticleJsonLd article={article} />

      {/* ═══════════ GREEN ACCENT STRIPE ═══════════ */}
      <div className="pt-18 md:pt-22">
        <div className="h-1 bg-linear-to-r from-aquiz-green via-aquiz-green/60 to-transparent" />
      </div>

      {/* ═══════ HEADER — side-by-side : text left, image right ═══════ */}
      <div className="mx-auto max-w-5xl px-5 sm:px-8 pt-5 sm:pt-7 pb-6 sm:pb-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11.5px] text-gray-400 mb-4" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-aquiz-green transition-colors">Accueil</Link>
          <span className="text-gray-300">/</span>
          <Link href="/blog" className="hover:text-aquiz-green transition-colors">Blog</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-500">{CATEGORY_LABELS[article.category]}</span>
        </nav>

        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:items-start">

          {/* ── Left: text block ── */}
          <div className="flex flex-col justify-center">
            {/* Category pill */}
            <span className="inline-block self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-aquiz-green shadow-sm shadow-aquiz-green/20 mb-4">
              {CATEGORY_LABELS[article.category]}
            </span>

            {/* Title */}
            <h1 className="text-[1.5rem] sm:text-[1.75rem] lg:text-[2.1rem] font-extrabold text-aquiz-black leading-[1.15] tracking-tight mb-3">
              {article.title}
            </h1>

            {/* Excerpt */}
            <p className="text-[14px] sm:text-[14.5px] text-gray-500 leading-[1.6] mb-4 max-w-lg">
              {article.excerpt}
            </p>

            {/* Author + meta */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11.5px] text-gray-400">
              <span className="font-semibold text-aquiz-black">{article.author.name}</span>
              <span className="w-1 h-1 rounded-full bg-aquiz-green/40" />
              <time>
                {new Date(article.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </time>
              <span className="w-1 h-1 rounded-full bg-aquiz-green/40" />
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-aquiz-green/50" />
                {article.readingTime} min
              </span>
              {article.updatedAt && article.updatedAt !== article.publishedAt && (
                <>
                  <span className="w-1 h-1 rounded-full bg-aquiz-green/40" />
                  <span className="italic">
                    Mis à jour le {new Date(article.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── Right: cover image ── */}
          {article.coverImage && (
            <div className="mt-6 lg:mt-0">
              <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-gray-100 ring-1 ring-black/5">
                <Image
                  src={article.coverImage}
                  alt={article.coverAlt ?? article.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 380px"
                  priority
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thin separator */}
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="h-px bg-gray-100" />
      </div>

      {/* ══════════════════ CONTENT : 2-col desktop, 1-col mobile ══════════════════════ */}
      <div className="mx-auto max-w-5xl px-5 sm:px-8 pt-8 sm:pt-10 pb-10">
        <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-10">

          {/* ── Left: article content ── */}
          <div className="min-w-0">

            {/* TOC — mobile only */}
            <nav className="lg:hidden mb-8 py-4 px-4 rounded-lg bg-aquiz-green/3 border border-aquiz-green/10" aria-label="Sommaire">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-0.5 w-5 bg-aquiz-green rounded-full" />
                <p className="text-[10px] font-bold text-aquiz-black uppercase tracking-[0.12em]">Sommaire</p>
              </div>
              <ol className="space-y-1.5">
                {article.sections.map((section, i) => (
                  <li key={section.heading}>
                    <a
                      href={`#${headingToId(section.heading)}`}
                      className="flex items-start gap-2 py-0.5 text-[12.5px] text-gray-500 hover:text-aquiz-green transition-colors leading-snug"
                    >
                      <span className="text-[10px] text-gray-300 font-medium mt-px shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      {section.heading}
                    </a>
                    {section.subsections && section.subsections.length > 0 && (
                      <ol className="ml-6 mt-1 space-y-1">
                        {section.subsections.map((sub) => (
                          <li key={sub.heading}>
                            <a
                              href={`#${headingToId(sub.heading)}`}
                              className="block text-[11px] text-gray-400 hover:text-aquiz-green transition-colors leading-snug"
                            >
                              {sub.heading}
                            </a>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            {/* Sections */}
            <article>
              {article.sections.map((section, sectionIdx) => (
                <section
                  key={section.heading}
                  className={sectionIdx > 0 ? 'mt-9' : ''}
                >
                  <h2
                    id={headingToId(section.heading)}
                    className="text-[1.05rem] sm:text-[1.15rem] font-bold text-aquiz-black leading-snug scroll-mt-28 mb-3.5 flex items-center gap-2.5"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-aquiz-green/10 text-aquiz-green text-[11px] font-bold shrink-0">
                      {sectionIdx + 1}
                    </span>
                    {section.heading}
                  </h2>

                  <div
                    className="prose-aquiz"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />

                  {section.subsections?.map((sub) => (
                    <div key={sub.heading} className="mt-6">
                      <h3
                        id={headingToId(sub.heading)}
                        className="text-[14.5px] font-semibold text-aquiz-black mb-2 scroll-mt-28"
                      >
                        {sub.heading}
                      </h3>
                      <div
                        className="prose-aquiz"
                        dangerouslySetInnerHTML={{ __html: sub.content }}
                      />
                    </div>
                  ))}

                  {sectionIdx < article.sections.length - 1 && (
                    <div className="mt-9 flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-100" />
                      <div className="w-1.5 h-1.5 rounded-full bg-aquiz-green/30" />
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                  )}
                </section>
              ))}
            </article>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  {article.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog?tag=${encodeURIComponent(tag)}`}
                      className="px-2.5 py-1 rounded-full bg-gray-50 text-[11px] text-gray-500 font-medium border border-gray-100 hover:bg-aquiz-green/5 hover:border-aquiz-green/20 hover:text-aquiz-green transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related tools */}
            {article.relatedTools && article.relatedTools.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">Outils en lien</p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {article.relatedTools.map((tool) => (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className="flex items-center gap-3 p-3.5 rounded-lg bg-gray-50 border border-gray-100 hover:border-aquiz-green/30 hover:bg-aquiz-green/2 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-aquiz-black group-hover:text-aquiz-green transition-colors">{tool.label}</p>
                        <p className="text-[10.5px] text-gray-400 mt-0.5">{tool.description}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-aquiz-green shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Author card */}
            <div className="mt-10 pt-6 border-t border-gray-100">
              <div className="flex items-start gap-4 p-5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-11 h-11 rounded-full bg-aquiz-green/10 flex items-center justify-center shrink-0">
                  <span className="text-aquiz-green font-bold text-[14px]">{article.author.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-aquiz-black">{article.author.name}</p>
                  <p className="text-[11.5px] text-gray-400 mt-0.5">{article.author.role}</p>
                  <p className="text-[12px] text-gray-500 mt-2 leading-relaxed">AQUIZ vous accompagne dans votre projet immobilier avec des outils gratuits et des conseils personnalises.</p>
                </div>
              </div>
            </div>

            {/* Share */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em]">Partager</p>
              <div className="flex items-center gap-2">
                <CopyLinkButton />
                <a href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-aquiz-green hover:text-white transition-colors" aria-label="Partager sur X">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-aquiz-green hover:text-white transition-colors" aria-label="Partager sur Facebook">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-aquiz-green hover:text-white transition-colors" aria-label="Partager sur WhatsApp">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
                <a href="https://www.instagram.com/aquiz.immo/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-aquiz-green hover:text-white transition-colors" aria-label="Instagram">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://www.linkedin.com/company/aquiz" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-aquiz-green hover:text-white transition-colors" aria-label="LinkedIn">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://www.tiktok.com/@aquiz.immo" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-aquiz-green hover:text-white transition-colors" aria-label="TikTok">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.15v-3.44a4.85 4.85 0 01-3.99-2.02v-3z"/></svg>
                </a>
              </div>
            </div>
          </div>

          {/* ── Right: sticky sidebar TOC — desktop only ── */}
          <aside className="hidden lg:block" aria-label="Sommaire">
            <div className="sticky top-26">
              {/* Back to blog */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-aquiz-green transition-colors mb-4"
              >
                <ArrowLeft className="w-3 h-3" />
                Retour au blog
              </Link>

              {/* Green top accent bar */}
              <div className="h-0.5 w-8 bg-aquiz-green rounded-full mb-3" />
              <p className="text-[10px] font-bold text-aquiz-black uppercase tracking-[0.12em] mb-3">Sommaire</p>
              <ActiveTOC sections={tocSections} readingTime={article.readingTime} />

              {/* CTA box in sidebar — green branded */}
              <div className="mt-6 p-4 rounded-lg bg-aquiz-green/5 border border-aquiz-green/15 relative overflow-hidden">
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-aquiz-green/5 rounded-bl-[40px]" />
                <p className="text-[12.5px] font-semibold text-aquiz-black mb-1 relative">Estimez votre budget</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mb-3 relative">Calculez gratuitement votre capacite d&apos;achat immobilier.</p>
                <Link
                  href="/simulateur/mode-a"
                  className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-aquiz-green text-white font-semibold text-[12px] hover:bg-aquiz-green/90 shadow-sm shadow-aquiz-green/25 transition-colors w-full justify-center"
                >
                  Simuler
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* ═════════════ NEWSLETTER CTA (in article) ═════════════ */}
      <div className="mx-auto max-w-5xl px-5 sm:px-8 pb-6">
        <div className="rounded-2xl bg-gray-50 ring-1 ring-gray-200/60 p-5 sm:p-7 relative isolate overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.75 bg-aquiz-green" />
          <div className="absolute -top-12 right-1/4 w-40 h-40 rounded-full bg-aquiz-green/6 blur-3xl" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="w-11 h-11 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-aquiz-green" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-[14px] font-bold text-gray-900">Vous avez aime cet article ?</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Recevez nos prochains guides et analyses chaque semaine.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="email"
                placeholder="votre@email.com"
                className="flex-1 sm:w-48 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-[12px] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green/30 transition-all"
              />
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-gray-950 text-white text-[12px] font-bold hover:bg-aquiz-green active:scale-[0.98] transition-all shrink-0"
              >
                S&apos;abonner
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════ PREV / NEXT ARTICLE ═════════════ */}
      {(prev || next) && (
        <div className="mx-auto max-w-5xl px-5 sm:px-8 pb-8">
          <div className="grid sm:grid-cols-2 gap-3">
            {prev ? (
              <Link
                href={`/blog/${prev.slug}`}
                className="group flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-aquiz-green/20 hover:bg-aquiz-green/2 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-aquiz-green group-hover:text-white flex items-center justify-center text-gray-400 transition-colors shrink-0">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Precedent</p>
                  <p className="text-[12.5px] font-semibold text-gray-900 line-clamp-1 group-hover:text-aquiz-green transition-colors">{prev.title}</p>
                </div>
              </Link>
            ) : <div />}
            {next ? (
              <Link
                href={`/blog/${next.slug}`}
                className="group flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-aquiz-green/20 hover:bg-aquiz-green/2 transition-all text-right"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Suivant</p>
                  <p className="text-[12.5px] font-semibold text-gray-900 line-clamp-1 group-hover:text-aquiz-green transition-colors">{next.title}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-aquiz-green group-hover:text-white flex items-center justify-center text-gray-400 transition-colors shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ) : <div />}
          </div>
        </div>
      )}

      {/* ═══════════════ RECOMMENDED ARTICLES ═════════════════ */}
      {related.length > 0 && (
        <section className="bg-gray-50/60 border-t border-gray-100">
          <div className="mx-auto max-w-5xl px-5 sm:px-8 py-12 lg:py-16">

            {/* Section header — centered */}
            <div className="text-center mb-10">
              <p className="text-[10.5px] font-bold text-aquiz-green uppercase tracking-[0.15em] mb-1.5">A lire aussi</p>
              <h2 className="text-[1.15rem] sm:text-[1.3rem] font-extrabold text-aquiz-black">
                Continuer la lecture
              </h2>
            </div>

            {/* Cards — auto-center when < 3 */}
            <div className={`grid gap-6 ${related.length >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : related.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'max-w-sm mx-auto'}`}>
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group relative flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-aquiz-green/20 hover:shadow-xl hover:shadow-black/4 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="relative aspect-16/10 overflow-hidden shrink-0">
                    <Image
                      src={r.coverImage}
                      alt={r.coverAlt ?? r.title}
                      fill
                      className="object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/15 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white bg-aquiz-green/90 backdrop-blur-sm shadow-sm">
                      {CATEGORY_LABELS[r.category]}
                    </span>
                  </div>

                  {/* Content — flex-1 so footer aligns */}
                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="text-[14px] font-bold text-aquiz-black leading-[1.4] group-hover:text-aquiz-green transition-colors duration-200 mb-2 line-clamp-2">
                      {r.title}
                    </h3>
                    <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-2 flex-1">
                      {r.excerpt}
                    </p>
                    {/* Footer row */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                      <span className="inline-flex items-center gap-1.5 text-[10.5px] text-gray-300">
                        <Clock className="w-3 h-3" />
                        {r.readingTime} min de lecture
                      </span>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 group-hover:bg-aquiz-green group-hover:text-white text-gray-400 transition-all duration-300">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Bottom green line on hover */}
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-aquiz-green scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
              ))}
            </div>

            {/* "Voir tous les articles" centered link */}
            <div className="text-center mt-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-gray-400 hover:text-aquiz-green transition-colors"
              >
                Voir tous les articles
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Mobile bottom nav — fixed */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-aquiz-green transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Tous les articles
        </Link>
        <MobileScrollTop />
        <Link
          href="/simulateur/mode-a"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-aquiz-green text-white font-semibold text-[13px] hover:bg-aquiz-green/90 shadow-sm shadow-aquiz-green/25 transition-colors"
        >
          Simuler
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {/* Spacer for fixed mobile nav */}
      <div className="lg:hidden h-16" />
    </main>
  )
}
