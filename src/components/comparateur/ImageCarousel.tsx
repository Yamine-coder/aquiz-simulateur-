'use client'

/**
 * ImageCarousel — Carrousel d'images pour les cartes d'annonces
 * 
 * Swipe tactile + flèches clavier + dots navigation
 * Optimisé pour les performances avec lazy loading
 */

import { cn } from '@/lib/utils'
import { Building2, ChevronLeft, ChevronRight, Home } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

interface ImageCarouselProps {
  /** URLs des images (déjà en HD si possible) */
  images: string[]
  /** Alt text par défaut */
  alt?: string
  /** Type de bien pour l'icône fallback */
  typeBien?: 'appartement' | 'maison'
  /** Classe CSS additionnelle sur le conteneur */
  className?: string
  /** Taille pour next/image `sizes` */
  sizes?: string
  /** Overlay enfants (badges, boutons) */
  children?: React.ReactNode
  /** Empêcher la propagation du clic (pour ne pas trigger la sélection de la card) */
  stopClickPropagation?: boolean
}

export function ImageCarousel({
  images,
  alt = 'Bien immobilier',
  typeBien = 'appartement',
  className,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px',
  children,
  stopClickPropagation = true,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [errorIndexes, setErrorIndexes] = useState<Set<number>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const IconType = typeBien === 'maison' ? Home : Building2

  // Filtrer les images en erreur
  const validImages = images.filter((_, i) => !errorIndexes.has(i))
  const hasImages = validImages.length > 0
  const showNav = images.length > 1

  // Garantir que l'index est dans les bornes
  useEffect(() => {
    if (currentIndex >= images.length) {
      setCurrentIndex(0)
    }
  }, [images.length, currentIndex])

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, images.length - 1)))
  }, [images.length])

  const goNext = useCallback((e?: React.MouseEvent) => {
    if (stopClickPropagation) e?.stopPropagation()
    setCurrentIndex(prev => (prev + 1) % images.length)
  }, [images.length, stopClickPropagation])

  const goPrev = useCallback((e?: React.MouseEvent) => {
    if (stopClickPropagation) e?.stopPropagation()
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
  }, [images.length, stopClickPropagation])

  // Touch / Pointer swipe
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!showNav) return
    startXRef.current = e.clientX
    setIsDragging(true)
  }, [showNav])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    const diff = e.clientX - startXRef.current
    const threshold = 40
    if (diff > threshold) {
      goPrev()
    } else if (diff < -threshold) {
      goNext()
    }
  }, [isDragging, goNext, goPrev])

  const handleImageError = useCallback((index: number) => {
    setErrorIndexes(prev => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }, [])

  // Keyboard navigation quand le container est focused
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goPrev()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      goNext()
    }
  }, [goNext, goPrev])

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden group/carousel', className)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={showNav ? 0 : undefined}
      role={showNav ? 'region' : undefined}
      aria-label={showNav ? `Carrousel d'images, ${images.length} photos` : undefined}
      aria-roledescription={showNav ? 'carousel' : undefined}
    >
      {/* Images */}
      {hasImages ? (
        <>
          {images.map((src, i) => (
            <div
              key={`${i}-${src}`}
              className={cn(
                'absolute inset-0 transition-opacity duration-300',
                i === currentIndex ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
              )}
              aria-hidden={i !== currentIndex}
            >
              {/* Only render near neighbours for perf */}
              {(Math.abs(i - currentIndex) <= 1 || i === 0 || i === images.length - 1) && !errorIndexes.has(i) ? (
                <Image
                  src={src}
                  alt={`${alt} — photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  fill
                  sizes={sizes}
                  unoptimized
                  onError={() => handleImageError(i)}
                />
              ) : null}
            </div>
          ))}

          {/* Gradient bas */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/30 to-transparent pointer-events-none z-[2]" />
        </>
      ) : (
        /* Placeholder sans image */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center mb-2 shadow-sm">
            <IconType className="h-7 w-7 text-aquiz-gray-light" />
          </div>
          <span className="text-[10px] text-aquiz-gray-light font-medium">Pas d&apos;image</span>
        </div>
      )}

      {/* Navigation flèches — desktop hover only */}
      {showNav && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-white shadow-sm"
            aria-label="Image précédente"
          >
            <ChevronLeft className="h-4 w-4 text-aquiz-black" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-white shadow-sm"
            aria-label="Image suivante"
          >
            <ChevronRight className="h-4 w-4 text-aquiz-black" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {showNav && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
          {images.length <= 5 ? (
            // Dots for ≤5 images
            images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  if (stopClickPropagation) e.stopPropagation()
                  goTo(i)
                }}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-200',
                  i === currentIndex
                    ? 'bg-white w-3'
                    : 'bg-white/50 hover:bg-white/80'
                )}
                aria-label={`Photo ${i + 1}`}
                aria-current={i === currentIndex ? 'true' : undefined}
              />
            ))
          ) : (
            // Counter for >5 images
            <span className="text-[10px] font-semibold text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {currentIndex + 1}/{images.length}
            </span>
          )}
        </div>
      )}

      {/* Overlay enfants (badges, boutons select/favori, etc.) */}
      {children && <div className="absolute inset-0 z-[3]">{children}</div>}
    </div>
  )
}
