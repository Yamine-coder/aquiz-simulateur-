'use client'

import NewsletterForm from '@/components/blog/NewsletterForm'
import { BLOG_ARTICLES } from '@/data/blog-articles'
import type { BlogArticle, BlogCategory } from '@/types/blog'
import { CATEGORY_LABELS } from '@/types/blog'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Banknote, BookOpen, Calculator, Check, ChevronDown, Clock, Hash, Mail, Search, Star, TrendingUp, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
      <div className="flex items-center gap-2 sm:gap-3">
        {accent && (
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-aquiz-green" />
        )}
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-gray-900">
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
          <div className="relative aspect-[16/10] md:aspect-auto md:min-h-56 overflow-hidden">
            <Image
              src={article.coverImage}
              alt={article.coverAlt ?? article.title}
              fill
              className="object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
              sizes="(max-width: 768px) 100vw, 580px"
              priority
            />

            {/* Reading time chip */}
            <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3">
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/90 backdrop-blur-lg text-[10px] sm:text-[11px] font-semibold text-gray-800 shadow-lg shadow-black/5">
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-500" />
                {article.readingTime} min de lecture
              </span>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="relative flex flex-col justify-between p-3.5 sm:p-5 lg:p-6">

            {/* Top section */}
            <div>
              {/* Badge + Meta row */}
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className={`inline-block px-2 sm:px-2.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wide ${PILL_STYLES[article.category]}`}>
                    {CATEGORY_LABELS[article.category]}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-gray-400">
                    {formatDate(article.publishedAt)}
                  </span>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-950 text-white text-[9px] font-bold uppercase tracking-widest shrink-0 ml-3">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  A la une
                </span>
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-xl lg:text-[1.35rem] font-extrabold text-gray-950 leading-snug tracking-tight mb-2 sm:mb-2.5 group-hover:text-aquiz-green transition-colors duration-300">
                {article.title}
              </h2>

              {/* Excerpt */}
              <p className="text-gray-500 text-[12px] sm:text-[13px] leading-relaxed line-clamp-2 mb-0">
                {article.excerpt}
              </p>
            </div>

            {/* Bottom section — Author + CTA */}
            <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-3.5 border-t border-gray-100/80">
              <div className="flex items-center gap-2">
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-950 flex items-center justify-center shrink-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-white">A</span>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-aquiz-green ring-2 ring-white flex items-center justify-center">
                    <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] sm:text-[12px] font-bold text-gray-900">{article.author.name}</p>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 leading-tight">{article.author.role}</p>
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
        <div className="relative aspect-[16/10] sm:aspect-3/2 overflow-hidden">
          <Image
            src={article.coverImage}
            alt={article.coverAlt ?? article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
          />
          {/* Glass reading time badge */}
          <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5">
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-[9px] sm:text-[10px] font-medium text-gray-600 shadow-sm">
              <Clock className="w-2.5 h-2.5" />
              {article.readingTime} min
            </span>
          </div>
          {/* Bottom gradient for polish */}
          <div className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-black/5 to-transparent" />
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col flex-1 p-2.5 sm:p-3">

          {/* Category + date */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
            <span className={`inline-block px-1.5 sm:px-2 py-px rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wide ${PILL_STYLES[article.category]}`}>
              {CATEGORY_LABELS[article.category]}
            </span>
            <span className="text-[9px] sm:text-[10px] text-gray-400">{formatDate(article.publishedAt)}</span>
          </div>

          {/* Title */}
          <h3 className="text-[12px] sm:text-[13px] font-bold text-gray-950 leading-snug tracking-tight group-hover:text-aquiz-green transition-colors duration-300 line-clamp-2 mb-0.5 sm:mb-1">
            {article.title}
          </h3>

          {/* Excerpt */}
          <p className="hidden sm:block text-[11px] text-gray-500 leading-relaxed line-clamp-1 flex-1">
            {article.excerpt}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 mt-1.5 sm:mt-2 border-t border-gray-50">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-950 flex items-center justify-center ring-1 ring-gray-100 shrink-0">
                <span className="text-[8px] sm:text-[9px] font-bold text-white">A</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-gray-600">{article.author.name}</span>
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
    <div className="rounded-xl sm:rounded-2xl bg-aquiz-green/5 border border-aquiz-green/10 p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
        <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-aquiz-green" />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <p className="text-[13px] sm:text-sm font-bold text-gray-900">Estimez votre budget</p>
        <p className="text-[11px] sm:text-[12px] text-gray-400 mt-0.5">Calculez gratuitement votre capacite d&apos;achat immobilier.</p>
      </div>
      <Link
        href="/simulateur/mode-a"
        className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-aquiz-green text-white text-[12px] sm:text-[13px] font-bold hover:bg-aquiz-green/90 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-aquiz-green/20 shrink-0 w-full sm:w-auto justify-center"
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

export default function BlogPage() {
  const searchParams = useSearchParams()

  const [activeCategory, setActiveCategory] = useState<BlogCategory | null>(() => {
    const cat = searchParams.get('category') as BlogCategory | null
    return (cat && Object.keys(CATEGORY_LABELS).includes(cat)) ? cat : null
  })
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_LOAD)
  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get('q') || searchParams.get('tag') || ''
  })
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const sort = searchParams.get('sort') as SortOption | null
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

      {/* ── AMBIANCE BACKGROUND: Global layout ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden block">
        {/* === HEADER AREA DECORATION === */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-aquiz-green/[0.04] rounded-full blur-[80px]" />
        
        <div className="absolute top-24 left-[8%] w-4 h-4 hidden xl:block opacity-30">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-600 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 w-[1px] h-full bg-gray-600 -translate-x-1/2" />
        </div>

        <div className="absolute top-32 right-12 w-24 h-24 hidden xl:grid grid-cols-4 grid-rows-4 gap-2 opacity-[0.03]">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={`grid1-${i}`} className="w-1.5 h-1.5 rounded-full bg-gray-900" />
          ))}
        </div>

        <div className="absolute top-44 left-[20%] w-3 h-3 rounded-full bg-aquiz-green/40 shadow-[0_0_15px_rgba(20,184,129,0.5)] hidden md:block animate-pulse" />



        {/* === FEATURED CARD & TRENDING AREA DECORATION (Middle Page) === */}
        <div className="absolute top-[35%] -right-48 w-[800px] h-[800px] bg-aquiz-green/[0.025] rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -left-20 w-[500px] h-[500px] bg-aquiz-green/[0.02] rounded-full blur-[100px]" />

        <svg className="absolute top-[38%] -left-8 w-48 h-48 text-gray-200 opacity-60 hidden md:block" viewBox="0 0 100 100" fill="none">
          <path d="M 0 50 Q 25 20 50 50 T 100 50" stroke="currentColor" strokeWidth="0.5" />
        </svg>

        <div className="absolute top-[45%] right-[5%] w-2 h-2 rounded-full bg-aquiz-green/30 shadow-[0_0_10px_rgba(20,184,129,0.4)] hidden lg:block" />

        <div className="absolute top-[50%] left-[8%] w-5 h-5 hidden xl:block opacity-20 rotate-45">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-600 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 w-[1px] h-full bg-gray-600 -translate-x-1/2" />
        </div>


        {/* === BOTTOM AREA DECORATION (Explorer & Newsletter) === */}
        <div className="absolute bottom-[10%] left-[20%] w-[900px] h-[600px] bg-aquiz-green/[0.03] rounded-[100%] blur-[120px] -translate-x-1/2" />



        <div className="absolute bottom-[15%] left-[5%] w-20 h-20 hidden lg:grid grid-cols-3 grid-rows-3 gap-3 opacity-[0.04]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={`grid2-${i}`} className="w-1.5 h-1.5 rounded-full bg-gray-900" />
          ))}
        </div>

        <div className="absolute bottom-[5%] right-[25%] w-2.5 h-2.5 rounded-full bg-aquiz-green/50 shadow-[0_0_12px_rgba(20,184,129,0.6)] hidden md:block" />
        

      </div>

      <div className="relative z-10 mx-auto max-w-285 px-4 sm:px-6 pt-20 sm:pt-22 md:pt-24 pb-8 sm:pb-16">

        {/* ── Blog header bloc ── */}
        <div className="mb-6 sm:mb-8 lg:mb-10 max-w-4xl mx-auto">

          {/* Top: Title */}
          <div className="mb-4 sm:mb-6 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-950 tracking-tight leading-none mb-2 sm:mb-3 relative inline-block">
              Le blog<span className="text-aquiz-green">.</span>
            </h1>
            <p className="text-[13px] sm:text-[15px] text-gray-500 font-medium mx-auto max-w-lg">
              Immobilier, finances &amp; conseils pratiques
            </p>
          </div>

          {/* Bottom: Unified Control Bar */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] p-1.5 sm:p-2.5 transition-all relative z-50">
            {/* Search and Sort Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              {/* Search */}
              <div className="relative w-full sm:max-w-[280px] group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-aquiz-green transition-colors duration-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(ITEMS_PER_LOAD) }}
                  placeholder="Rechercher un article..."
                  className="w-full pl-10 pr-9 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-100 bg-gray-50/50 text-[12px] sm:text-[13px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-aquiz-green/10 focus:border-aquiz-green/30 focus:bg-white transition-all duration-300"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setVisibleCount(ITEMS_PER_LOAD) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Stats & Sort */}
              <div className="flex items-center justify-between sm:justify-end gap-4 px-1 sm:px-0 shrink-0">
                <div className="text-[11px] font-medium text-gray-400">
                  <span className="text-gray-900 font-bold">{sorted.length}</span> article{sorted.length > 1 ? 's' : ''}
                </div>
                
                <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>

                {/* Custom Sort Dropdown */}
                <div className="relative" ref={sortRef}>
                  <button
                    type="button"
                    onClick={() => setIsSortOpen((v) => !v)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                      isSortOpen
                        ? 'bg-aquiz-green/10 text-aquiz-green ring-1 ring-aquiz-green/20'
                        : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 ring-1 ring-inset ring-gray-200 shadow-sm'
                    }`}
                  >
                    <span className="opacity-70 hidden sm:inline">Trier par :</span> {SORT_LABELS[sortBy]}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSortOpen ? 'rotate-180 text-aquiz-green' : 'text-gray-400'}`} />
                  </button>

                  <AnimatePresence>
                    {isSortOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-[calc(100%+6px)] w-44 bg-white rounded-xl border border-gray-150 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] p-1.5 z-50"
                      >
                        {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => { setSortBy(key); setIsSortOpen(false) }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-medium transition-colors duration-150 ${
                              sortBy === key
                                ? 'bg-aquiz-green/10 text-aquiz-green'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {label}
                            {sortBy === key && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="pt-1.5 sm:pt-2 border-t border-gray-100 flex items-center">
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 w-full sm:justify-center">
                <button
                  type="button"
                  onClick={() => { setActiveCategory(null); setVisibleCount(ITEMS_PER_LOAD) }}
                  className={`px-3 py-1 rounded-md text-[11px] shrink-0 transition-all duration-300 ${
                    activeCategory === null
                      ? 'bg-aquiz-green text-white font-semibold shadow-md shadow-aquiz-green/20 scale-[1.02]'
                      : 'bg-transparent text-gray-500 font-medium hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  Tous
                </button>
                
                {categories.map(([key, label]) => {
                  const count = allArticles.filter((a) => a.category === key).length
                  const isActive = activeCategory === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setActiveCategory(isActive ? null : key); setVisibleCount(ITEMS_PER_LOAD) }}
                      className={`group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-[11px] shrink-0 transition-all duration-300 border ${
                        isActive
                          ? 'border-transparent bg-aquiz-green text-white font-semibold shadow-md shadow-aquiz-green/20 scale-[1.02]'
                          : 'border-gray-100/50 bg-gray-50/50 text-gray-600 font-medium hover:bg-white hover:border-gray-200 hover:text-gray-900 hover:shadow-sm'
                      }`}
                    >
                      {label}
                      <span className={`flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded text-[9px] font-bold transition-all duration-300 ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gray-200/50 text-gray-500 group-hover:bg-gray-100 group-hover:text-gray-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
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
          <div className="mt-5 sm:mt-7">
            <SectionDivider label="Tendances" accent />

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
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
        <div className="mt-6 sm:mt-8">
          <SimulateurCTA />
        </div>

        {/* ══════════════════════════════════════════════════ */}
        {/* ALL ARTICLES                                      */}
        {/* ══════════════════════════════════════════════════ */}
        {rest.length > 0 && (
          <div className="mt-7 sm:mt-9">
            <SectionDivider label="Explorer" />

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
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
              <div className="flex flex-col items-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">
                <p className="text-[11px] sm:text-[12px] text-gray-400 mb-2.5 sm:mb-3">
                  {visibleCount} sur {rest.length} articles
                </p>
                <button
                  type="button"
                  onClick={() => setVisibleCount((v) => v + ITEMS_PER_LOAD)}
                  className="inline-flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gray-950 text-white text-[12px] sm:text-[13px] font-semibold shadow-sm hover:bg-gray-800 active:scale-[0.97] transition-all duration-200 w-full sm:w-auto justify-center"
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
        <div className="mt-8 sm:mt-12 rounded-xl sm:rounded-2xl bg-gray-50 ring-1 ring-gray-200/60 relative isolate overflow-hidden">
          {/* Green accent bar */}
          <div className="absolute top-0 inset-x-0 h-0.75 bg-aquiz-green" />

          {/* Decorative orbs */}
          <div className="absolute -top-16 right-1/4 w-48 h-48 rounded-full bg-aquiz-green/6 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-aquiz-green/4 blur-3xl" />

          <div className="relative z-10 p-4 sm:p-7 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 sm:gap-6 lg:gap-8 items-center">

              {/* Left: Newsletter */}
              <div>
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-aquiz-green/15 bg-aquiz-green/5 mb-3 sm:mb-4">
                  <Mail className="w-3 h-3 text-aquiz-green" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-aquiz-green tracking-wider uppercase">Newsletter</span>
                </div>

                <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 tracking-tight mb-1.5 leading-snug">
                  Ne manquez aucun article
                </h2>
                <p className="text-[11px] sm:text-[12px] text-gray-400 mb-3 sm:mb-4 max-w-sm leading-relaxed">
                  Analyses du marche, guides pratiques et conseils financiers — chaque semaine dans votre boite.
                </p>

                <NewsletterForm source="blog" variant="inline" />
                <p className="text-[10px] text-gray-400 mt-2.5 flex items-center gap-1.5">
                  <svg className="w-2.5 h-2.5 text-aquiz-green/50" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  Pas de spam. Désinscription en un clic.
                </p>
              </div>

              {/* Right: Topics */}
              <div className="rounded-xl border border-gray-200/80 bg-white p-3.5 sm:p-5 shadow-sm">
                <h3 className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 sm:mb-3 flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  Sujets populaires
                </h3>

                <div className="flex flex-col gap-1.5 sm:gap-2">
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
                        className="flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg bg-gray-50 border border-gray-100 hover:bg-aquiz-green/5 hover:border-aquiz-green/20 transition-all duration-300 cursor-pointer group w-full text-left"
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-aquiz-green/10 text-aquiz-green flex items-center justify-center shrink-0 group-hover:bg-aquiz-green group-hover:text-white group-hover:shadow-md group-hover:shadow-aquiz-green/20 transition-all duration-300">
                          <topic.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] sm:text-[12px] font-semibold text-gray-800 truncate group-hover:text-aquiz-green transition-colors duration-300">{topic.label}</p>
                          <p className="text-[9px] sm:text-[10px] text-gray-400">{count} articles</p>
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
