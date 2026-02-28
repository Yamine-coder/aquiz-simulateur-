'use client'

import { BLOG_ARTICLES } from '@/data/blog-articles'
import type { BlogArticle, BlogCategory } from '@/types/blog'
import { CATEGORY_LABELS } from '@/types/blog'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Banknote, BookOpen, Calculator, ChevronDown, Clock, Hash, Mail, Search, Star, TrendingUp, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Design tokens ───

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Refined category pill colors — soft, no border */
const PILL_STYLES: Record<BlogCategory, string> = {
  financement: 'text-aquiz-green bg-aquiz-green/10',
  achat: 'text-aquiz-green bg-aquiz-green/10',
  simulation: 'text-aquiz-green bg-aquiz-green/10',
  marche: 'text-aquiz-green bg-aquiz-green/10',
  guides: 'text-aquiz-green bg-aquiz-green/10',
  investissement: 'text-aquiz-green bg-aquiz-green/10',
}

// ─── Section divider ───

function SectionDivider({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <div className="flex items-center gap-3">
        {accent && (
          <span className="w-2 h-2 rounded-full bg-aquiz-green" />
        )}
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-900">
          {label}
        </h2>
      </div>
      <div className={`h-px flex-1 ${accent ? 'bg-aquiz-green/20' : 'bg-gray-200/80'}`} />
    </div>
  )
}

// ─── Featured Card — Premium editorial ───

function FeaturedCard({ article }: { article: BlogArticle }) {
  return (
    <Link href={`/blog/${article.slug}`} className="group block">
      <article className="relative rounded-xl md:rounded-2xl overflow-hidden bg-white ring-1 ring-gray-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.08)] hover:ring-gray-200 transition-all duration-500 ease-out">

        <div className="grid md:grid-cols-[1.1fr_1fr] gap-0">

          {/* ── Image ── */}
          <div className="relative aspect-16/10 md:aspect-auto md:min-h-56 overflow-hidden">
            <Image
              src={article.coverImage}
              alt={article.coverAlt ?? article.title}
              fill
              className="object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
              sizes="(max-width: 768px) 100vw, 580px"
              priority
            />

            {/* Reading time chip */}
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-lg text-[11px] font-semibold text-gray-800 shadow-lg shadow-black/5">
                <Clock className="w-3 h-3 text-gray-500" />
                {article.readingTime} min de lecture
              </span>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="relative flex flex-col justify-between p-4 sm:p-5 lg:p-6">

            {/* Top section */}
            <div>
              {/* Badge + Meta row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ${PILL_STYLES[article.category]}`}>
                    {CATEGORY_LABELS[article.category]}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {formatDate(article.publishedAt)}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-950 text-white text-[9px] font-bold uppercase tracking-widest shrink-0 ml-3">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  A la une
                </span>
              </div>

              {/* Title */}
              <h2 className="text-lg sm:text-xl lg:text-[1.35rem] font-extrabold text-gray-950 leading-snug tracking-tight mb-2.5 group-hover:text-aquiz-green transition-colors duration-300">
                {article.title}
              </h2>

              {/* Excerpt */}
              <p className="text-gray-500 text-[13px] leading-relaxed line-clamp-2 mb-0">
                {article.excerpt}
              </p>
            </div>

            {/* Bottom section — Author + CTA */}
            <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-gray-100/80">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-full bg-gray-950 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-white">A</span>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-aquiz-green ring-2 ring-white flex items-center justify-center">
                    <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-gray-900">{article.author.name}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">{article.author.role}</p>
                </div>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-950 text-white text-[11px] font-bold group-hover:bg-aquiz-green transition-colors duration-300">
                Lire l&apos;article
                <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

// ─── Grid Card — Elevated hover ───

function GridCard({ article }: { article: BlogArticle }) {
  return (
    <Link href={`/blog/${article.slug}`} className="group block">
      <article className="h-full flex flex-col rounded-xl bg-white ring-1 ring-gray-100 overflow-hidden hover:ring-gray-200 hover:shadow-lg hover:shadow-gray-100/60 hover:-translate-y-0.5 transition-all duration-500 ease-out">

        {/* ── Image ── */}
        <div className="relative aspect-3/2 overflow-hidden">
          <Image
            src={article.coverImage}
            alt={article.coverAlt ?? article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
          />
          {/* Glass reading time badge */}
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-medium text-gray-600 shadow-sm">
              <Clock className="w-2.5 h-2.5" />
              {article.readingTime} min
            </span>
          </div>
          {/* Bottom gradient for polish */}
          <div className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-black/5 to-transparent" />
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col flex-1 p-3">

          {/* Category + date */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-block px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-wide ${PILL_STYLES[article.category]}`}>
              {CATEGORY_LABELS[article.category]}
            </span>
            <span className="text-[10px] text-gray-400">{formatDate(article.publishedAt)}</span>
          </div>

          {/* Title */}
          <h3 className="text-[13px] font-bold text-gray-950 leading-snug tracking-tight group-hover:text-aquiz-green transition-colors duration-300 line-clamp-2 mb-1">
            {article.title}
          </h3>

          {/* Excerpt */}
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-1 flex-1">
            {article.excerpt}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-950 flex items-center justify-center ring-1 ring-gray-100 shrink-0">
                <span className="text-[9px] font-bold text-white">A</span>
              </div>
              <span className="text-[11px] font-medium text-gray-600">{article.author.name}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-aquiz-green opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Lire
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

// ─── CTA Simulateur ───

function SimulateurCTA() {
  return (
    <div className="rounded-2xl bg-aquiz-green/5 border border-aquiz-green/10 p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
      <div className="w-11 h-11 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
        <Calculator className="w-5 h-5 text-aquiz-green" />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <p className="text-sm font-bold text-gray-900">Estimez votre budget</p>
        <p className="text-[12px] text-gray-400 mt-0.5">Calculez gratuitement votre capacite d&apos;achat immobilier.</p>
      </div>
      <Link
        href="/simulateur/mode-a"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aquiz-green text-white text-[13px] font-bold hover:bg-aquiz-green/90 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-aquiz-green/20 shrink-0"
      >
        Simuler
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

// ─── Page ───

const ITEMS_PER_LOAD = 6

type SortOption = 'recent' | 'oldest' | 'reading-time'

const SORT_LABELS: Record<SortOption, string> = {
  'recent': 'Plus récents',
  'oldest': 'Plus anciens',
  'reading-time': 'Temps de lecture',
}

/** Safely read a URL search param (returns fallback during SSR) */
function readParam(key: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(key)
}

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState<BlogCategory | null>(() => {
    const cat = readParam('category') as BlogCategory | null
    return (cat && Object.keys(CATEGORY_LABELS).includes(cat)) ? cat : null
  })
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_LOAD)
  const [searchQuery, setSearchQuery] = useState(() => {
    return readParam('q') || readParam('tag') || ''
  })
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const sort = readParam('sort') as SortOption | null
    return (sort && ['recent', 'oldest', 'reading-time'].includes(sort)) ? sort : 'recent'
  })
  const [isSortOpen, setIsSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync state → URL (replaceState to avoid history spam)
  const syncURL = useCallback(() => {
    const params = new URLSearchParams()
    if (activeCategory) params.set('category', activeCategory)
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    if (sortBy !== 'recent') params.set('sort', sortBy)
    const qs = params.toString()
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [activeCategory, searchQuery, sortBy])

  useEffect(() => { syncURL() }, [syncURL])

  const allArticles = BLOG_ARTICLES

  // Filter by category then by search query
  const filtered = allArticles
    .filter((a) => !activeCategory || a.category === activeCategory)
    .filter((a) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      )
    })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    if (sortBy === 'reading-time') return a.readingTime - b.readingTime
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })

  const featured = sorted[0]
  const trending = sorted.slice(1, 4)
  const rest = sorted.slice(4)

  const visibleRest = rest.slice(0, visibleCount)
  const hasMore = visibleCount < rest.length

  const categories = Object.entries(CATEGORY_LABELS) as [BlogCategory, string][]

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">

      {/* ── Decorative green shapes ── */}

      {/* Corner orb — top right (frames the header) */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-aquiz-green/6 rounded-full blur-3xl pointer-events-none" />

      {/* Corner orb — bottom left (frames the newsletter) */}
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-aquiz-green/5 rounded-full blur-3xl pointer-events-none" />

      {/* Edge orb — mid right (between trending & explorer) */}
      <div className="absolute top-1/2 -right-16 w-48 h-48 bg-aquiz-green/4 rounded-full blur-2xl pointer-events-none" />

      {/* Small crisp circle — near header, left */}
      <div className="absolute top-44 left-8 w-3 h-3 bg-aquiz-green/20 rounded-full pointer-events-none hidden lg:block" />

      {/* Small crisp circle — between sections, right */}
      <div className="absolute top-2/3 right-10 w-2.5 h-2.5 bg-aquiz-green/25 rounded-full pointer-events-none hidden lg:block" />

      <div className="relative z-10 mx-auto max-w-285 px-5 sm:px-6 pt-20 md:pt-24 pb-16">

        {/* ── Blog header bloc ── */}
        <div className="mb-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-4" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-aquiz-green transition-colors">Accueil</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500">Blog</span>
          </nav>

          {/* Row 1 — Title left, Search + Sort right */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
            {/* Left: title bloc */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight leading-none">
                Le blog<span className="text-aquiz-green">.</span>
              </h1>
              <p className="mt-1.5 text-[13px] text-gray-400">
                Immobilier, finances &amp; conseils pratiques
              </p>
            </div>

            {/* Right: Search + Sort */}
            <div className="flex items-center gap-2">
              {/* Search bar */}
              <div className="relative w-44 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(ITEMS_PER_LOAD) }}
                  placeholder="Rechercher..."
                  className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 bg-gray-50/60 text-gray-900 text-[12px] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green/30 focus:bg-white transition-all duration-300"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setVisibleCount(ITEMS_PER_LOAD) }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort — custom dropdown */}
              <div className="relative" ref={sortRef}>
                <button
                  type="button"
                  onClick={() => setIsSortOpen((v) => !v)}
                  className={`flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-lg border text-[12px] font-medium transition-all duration-200 cursor-pointer ${
                    isSortOpen
                      ? 'border-aquiz-green/30 bg-white ring-2 ring-aquiz-green/20 text-gray-900'
                      : 'border-gray-200 bg-gray-50/60 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {SORT_LABELS[sortBy]}
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {isSortOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl border border-gray-200 shadow-lg shadow-black/8 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setSortBy(key); setIsSortOpen(false) }}
                        className={`w-full text-left px-3 py-2 text-[12px] transition-colors duration-150 ${
                          sortBy === key
                            ? 'text-aquiz-green font-semibold bg-aquiz-green/5'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {sortBy === key && (
                            <span className="w-1.5 h-1.5 rounded-full bg-aquiz-green shrink-0" />
                          )}
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2 — Filter pills + count — with horizontal scroll on mobile */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
              <button
                type="button"
                onClick={() => { setActiveCategory(null); setVisibleCount(ITEMS_PER_LOAD) }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeCategory === null
                    ? 'bg-aquiz-green text-white shadow-sm shadow-aquiz-green/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-150 hover:text-gray-700'
                }`}
              >
                Tous
              </button>
              {categories.map(([key, label]) => {
                const count = allArticles.filter((a) => a.category === key).length
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setActiveCategory(activeCategory === key ? null : key); setVisibleCount(ITEMS_PER_LOAD) }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-200 ${
                      activeCategory === key
                        ? 'bg-aquiz-green text-white shadow-sm shadow-aquiz-green/20'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-150 hover:text-gray-700'
                    }`}
                  >
                    {label}
                    <span className="ml-1 text-[9px] opacity-50">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Spacer + result count */}
            <div className="ml-auto shrink-0">
              <span className="text-[11px] text-gray-300 tabular-nums whitespace-nowrap">
                {sorted.length} article{sorted.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════ */}
        {/* EMPTY STATE                                       */}
        {/* ══════════════════════════════════════════════════ */}
        {sorted.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-[15px] font-bold text-gray-900 mb-1">Aucun article trouve</p>
            <p className="text-[12px] text-gray-400 mb-4">Essayez de modifier vos filtres ou votre recherche.</p>
            <button
              type="button"
              onClick={() => { setActiveCategory(null); setSearchQuery(''); setVisibleCount(ITEMS_PER_LOAD) }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-950 text-white text-[12px] font-semibold hover:bg-gray-800 transition-colors"
            >
              Voir tous les articles
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* FEATURED                                          */}
        {/* ══════════════════════════════════════════════════ */}
        {featured && <FeaturedCard article={featured} />}

        {/* ══════════════════════════════════════════════════ */}
        {/* TRENDING                                          */}
        {/* ══════════════════════════════════════════════════ */}
        {trending.length > 0 && (
          <div className="mt-7">
            <SectionDivider label="Tendances" accent />

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trending.map((article, i) => (
                <motion.div
                  key={article.slug}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <GridCard article={article} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* CTA SIMULATEUR                                    */}
        {/* ══════════════════════════════════════════════════ */}
        <div className="mt-8">
          <SimulateurCTA />
        </div>

        {/* ══════════════════════════════════════════════════ */}
        {/* ALL ARTICLES                                      */}
        {/* ══════════════════════════════════════════════════ */}
        {rest.length > 0 && (
          <div className="mt-9">
            <SectionDivider label="Explorer" />

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleRest.map((article, i) => (
                <motion.div
                  key={article.slug}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <GridCard article={article} />
                </motion.div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex flex-col items-center mt-8 pt-6 border-t border-gray-100">
                <p className="text-[12px] text-gray-400 mb-3">
                  {visibleCount} sur {rest.length} articles
                </p>
                <button
                  type="button"
                  onClick={() => setVisibleCount((v) => v + ITEMS_PER_LOAD)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-950 text-white text-[13px] font-semibold shadow-sm hover:bg-gray-800 active:scale-[0.97] transition-all duration-200"
                >
                  Voir plus d&apos;articles
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* NEWSLETTER + TOPICS                               */}
        {/* ══════════════════════════════════════════════════ */}
        <div className="mt-12 rounded-2xl bg-gray-50 ring-1 ring-gray-200/60 relative isolate overflow-hidden">
          {/* Green accent bar */}
          <div className="absolute top-0 inset-x-0 h-0.75 bg-aquiz-green" />

          {/* Decorative orbs */}
          <div className="absolute -top-16 right-1/4 w-48 h-48 rounded-full bg-aquiz-green/6 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-aquiz-green/4 blur-3xl" />

          <div className="relative z-10 p-5 sm:p-7 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-8 items-center">

              {/* Left: Newsletter */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-aquiz-green/15 bg-aquiz-green/5 mb-4">
                  <Mail className="w-3 h-3 text-aquiz-green" />
                  <span className="text-[10px] font-bold text-aquiz-green tracking-wider uppercase">Newsletter</span>
                </div>

                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight mb-1.5 leading-snug">
                  Ne manquez aucun article
                </h2>
                <p className="text-[12px] text-gray-400 mb-4 max-w-sm leading-relaxed">
                  Analyses du marche, guides pratiques et conseils financiers — chaque semaine dans votre boite.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                    <input
                      type="email"
                      placeholder="votre@email.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-[13px] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green/30 transition-all duration-300"
                    />
                  </div>
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl bg-gray-950 text-white text-[13px] font-bold hover:bg-aquiz-green active:scale-[0.98] transition-all duration-300 shrink-0"
                  >
                    S&apos;abonner
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2.5 flex items-center gap-1.5">
                  <svg className="w-2.5 h-2.5 text-aquiz-green/50" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  Pas de spam. Desinscription en un clic.
                </p>
              </div>

              {/* Right: Topics */}
              <div className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  Sujets populaires
                </h3>

                <div className="flex flex-col gap-2">
                  {[
                    { icon: TrendingUp, label: 'Taux & marché immobilier', category: 'marche' as BlogCategory },
                    { icon: BookOpen, label: 'Guides pratiques', category: 'guides' as BlogCategory },
                    { icon: Banknote, label: 'Aides & financements', category: 'financement' as BlogCategory },
                  ].map((topic) => {
                    const count = allArticles.filter((a) => a.category === topic.category).length
                    return (
                      <button
                        key={topic.label}
                        type="button"
                        onClick={() => { setActiveCategory(topic.category); setVisibleCount(ITEMS_PER_LOAD); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 hover:bg-aquiz-green/5 hover:border-aquiz-green/20 transition-all duration-300 cursor-pointer group w-full text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-aquiz-green/10 text-aquiz-green flex items-center justify-center shrink-0 group-hover:bg-aquiz-green group-hover:text-white group-hover:shadow-md group-hover:shadow-aquiz-green/20 transition-all duration-300">
                          <topic.icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-gray-800 truncate group-hover:text-aquiz-green transition-colors duration-300">{topic.label}</p>
                          <p className="text-[10px] text-gray-400">{count} articles</p>
                        </div>
                        <ArrowUpRight className="w-3 h-3 text-gray-300 group-hover:text-aquiz-green transition-all duration-300" />
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
