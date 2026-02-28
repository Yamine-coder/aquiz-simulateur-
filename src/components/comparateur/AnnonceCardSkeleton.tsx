'use client'

/**
 * Skeleton de chargement pour AnnonceCard
 * Affiché pendant l'enrichissement API des annonces
 */

interface AnnonceCardSkeletonProps {
  compact?: boolean
}

export function AnnonceCardSkeleton({ compact = false }: AnnonceCardSkeletonProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white border border-aquiz-gray-lighter animate-pulse">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-lg bg-aquiz-gray-lightest shrink-0" />
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="h-4 w-24 bg-aquiz-gray-lightest rounded-md" />
            <div className="h-3 w-16 bg-aquiz-gray-lightest/70 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-14 bg-aquiz-gray-lightest rounded-md" />
            <div className="h-3 w-8 bg-aquiz-gray-lightest/70 rounded-md" />
            <div className="h-3 w-20 bg-aquiz-gray-lightest/70 rounded-md" />
          </div>
        </div>
        {/* Badge */}
        <div className="h-5 w-16 rounded-full bg-aquiz-gray-lightest shrink-0" />
      </div>
    )
  }

  // Grid card skeleton
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-aquiz-gray-lighter animate-pulse">
      {/* Image zone */}
      <div className="relative h-24 sm:h-40 bg-linear-to-br from-aquiz-gray-lightest to-slate-100">
        {/* Fake image shimmer */}
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent skeleton-shimmer" />
        {/* Source badge placeholder */}
        <div className="absolute bottom-2 left-2.5 h-4 w-16 bg-black/10 rounded-md" />
        {/* Faisabilité badge placeholder */}
        <div className="absolute bottom-2 right-2.5 h-4 w-20 bg-black/10 rounded-md" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 sm:p-4">
        {/* Prix */}
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-1">
            <div className="h-5 sm:h-6 w-24 sm:w-32 bg-aquiz-gray-lightest rounded-md" />
            <div className="h-3 w-4 bg-aquiz-gray-lightest/60 rounded-sm" />
          </div>
          <div className="hidden sm:block h-4 w-20 bg-aquiz-gray-lightest/60 rounded-md" />
        </div>

        {/* Métriques */}
        <div className="flex items-center gap-3 mb-3">
          <div className="h-3 w-12 bg-aquiz-gray-lightest rounded-md" />
          <div className="h-3 w-8 bg-aquiz-gray-lightest/70 rounded-md" />
          <div className="h-3 w-10 bg-aquiz-gray-lightest/70 rounded-md" />
        </div>

        {/* Location */}
        <div className="hidden sm:flex items-center gap-2 mb-3">
          <div className="h-3 w-3 rounded-full bg-aquiz-gray-lightest" />
          <div className="h-3 w-36 bg-aquiz-gray-lightest/60 rounded-md" />
        </div>

        {/* Tags */}
        <div className="hidden sm:flex flex-wrap gap-1.5 mb-3">
          <div className="h-5 w-14 bg-aquiz-gray-lightest/60 rounded-md" />
          <div className="h-5 w-12 bg-aquiz-gray-lightest/60 rounded-md" />
          <div className="h-5 w-16 bg-aquiz-gray-lightest/60 rounded-md" />
        </div>

        {/* Actions footer */}
        <div className="mt-auto pt-3 border-t border-aquiz-gray-lighter/70 flex items-center gap-1.5">
          <div className="flex-1 h-7 sm:h-8 bg-aquiz-gray-lightest rounded-lg" />
          <div className="hidden sm:block h-7 w-7 bg-aquiz-gray-lightest/60 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/**
 * Grille de skeletons pour l'état de chargement
 */
interface SkeletonGridProps {
  count?: number
  viewMode?: 'grid' | 'list'
}

export function AnnonceSkeletonGrid({ count = 3, viewMode = 'grid' }: SkeletonGridProps) {
  return (
    <div className={`grid gap-3 sm:gap-5 ${
      viewMode === 'grid'
        ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 max-w-3xl'
    }`}>
      {Array.from({ length: count }).map((_, i) => (
        <AnnonceCardSkeleton key={`skeleton-${i}`} compact={viewMode === 'list'} />
      ))}
    </div>
  )
}
