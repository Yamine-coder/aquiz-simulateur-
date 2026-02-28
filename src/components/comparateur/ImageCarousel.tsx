'use client'

/**
 * Carousel d'images pour les cartes d'annonces
 * Touch swipe sur mobile, flèches sur desktop
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'

interface ImageCarouselProps {
  /** Liste d'URLs d'images */
  images: string[]
  /** Texte alternatif pour les images */
  alt: string
  /** Hauteur CSS du container (ex: 'h-24 sm:h-40') */
  className?: string
  /** Callback au clic sur une image */
  onClick?: () => void
}

export function ImageCarousel({ images, alt, className = '', onClick }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchDeltaX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const total = images.length
  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < total - 1

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(total - 1, index)))
  }, [total])

  const goPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (canGoPrev) goTo(currentIndex - 1)
  }, [canGoPrev, currentIndex, goTo])

  const goNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (canGoNext) goTo(currentIndex + 1)
  }, [canGoNext, currentIndex, goTo])

  // Touch handlers pour le swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchDeltaX.current = 0
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const SWIPE_THRESHOLD = 50
    if (Math.abs(touchDeltaX.current) > SWIPE_THRESHOLD) {
      if (touchDeltaX.current < 0 && canGoNext) {
        goTo(currentIndex + 1)
      } else if (touchDeltaX.current > 0 && canGoPrev) {
        goTo(currentIndex - 1)
      }
    }
    touchStartX.current = null
    touchDeltaX.current = 0
  }, [canGoNext, canGoPrev, currentIndex, goTo])

  if (total === 0) return null

  // Image unique — pas de carousel
  if (total === 1) {
    return (
      <div className={`relative overflow-hidden ${className}`} onClick={onClick}>
        <Image
          src={images[0]}
          alt={alt}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          fill
          sizes="(max-width: 768px) 100vw, 300px"
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
    >
      {/* Images track */}
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((src, i) => (
          <div key={`img-${i}`} className="relative w-full h-full shrink-0">
            <Image
              src={src}
              alt={`${alt} - Photo ${i + 1}`}
              className="w-full h-full object-cover"
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows — desktop only */}
      {canGoPrev && (
        <button
          onClick={goPrev}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm items-center justify-center text-aquiz-black hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-sm z-10 sm:flex max-sm:hidden"
          aria-label="Image précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canGoNext && (
        <button
          onClick={goNext}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm items-center justify-center text-aquiz-black hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-sm z-10 sm:flex max-sm:hidden"
          aria-label="Image suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
        {total <= 5 ? (
          // Afficher tous les dots si <= 5 images
          images.map((_, i) => (
            <button
              key={`dot-${i}`}
              onClick={(e) => { e.stopPropagation(); goTo(i) }}
              className={`rounded-full transition-all duration-200 ${
                i === currentIndex
                  ? 'w-4 h-1.5 bg-white shadow-sm'
                  : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80'
              }`}
              aria-label={`Voir image ${i + 1}`}
            />
          ))
        ) : (
          // Indicateur compact pour > 5 images
          <span className="text-[9px] font-semibold text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {currentIndex + 1} / {total}
          </span>
        )}
      </div>

      {/* Counter badge top-right — toujours visible */}
      <span className="absolute top-2 right-10 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-black/40 text-white backdrop-blur-sm z-10">
        {total} photos
      </span>
    </div>
  )
}
