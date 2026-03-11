'use client'

/**
 * TableauComparaisonSkeleton — Squelette de chargement pour le tableau de comparaison.
 * Affiché brièvement pendant le premier calcul des scores / enrichissement API.
 */

interface TableauComparaisonSkeletonProps {
  count?: number  // nombre d'annonces (colonnes)
}

function Pulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-aquiz-gray-lightest ${className}`} />
}

export function TableauComparaisonSkeleton({ count = 2 }: TableauComparaisonSkeletonProps) {
  const cols = Array.from({ length: count })

  return (
    <div className="space-y-4">
      {/* Profil scoring skeleton */}
      <div className="flex items-center gap-2 mb-2">
        <Pulse className="w-4 h-4 rounded-full" />
        <Pulse className="w-28 h-4" />
        <Pulse className="w-40 h-3" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <Pulse key={i} className="h-9 w-24 rounded-lg shrink-0" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="overflow-x-auto rounded-2xl border border-aquiz-gray-lighter/60 bg-white">
        <table className="w-full min-w-150">
          {/* Header */}
          <thead>
            <tr className="border-b-2 border-aquiz-gray-lighter/80 bg-aquiz-gray-lightest/30">
              <th className="py-5 px-5 text-left w-48">
                <Pulse className="w-24 h-3" />
              </th>
              {cols.map((_, i) => (
                <th key={i} className="py-5 px-3 min-w-48 align-top">
                  <div className="space-y-3 p-2">
                    {/* Image placeholder */}
                    <Pulse className="w-full h-24 rounded-xl" />
                    {/* Price */}
                    <Pulse className="w-24 h-5 mx-auto" />
                    {/* Ville */}
                    <Pulse className="w-20 h-3 mx-auto" />
                    {/* Score circle */}
                    <div className="flex items-center gap-2 justify-center">
                      <Pulse className="w-12 h-12 rounded-full" />
                      <div className="space-y-1">
                        <Pulse className="w-10 h-4" />
                        <Pulse className="w-14 h-2" />
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Section header */}
            <tr className="bg-aquiz-green/5">
              <td colSpan={count + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-green">
                <Pulse className="w-32 h-3" />
              </td>
            </tr>

            {/* Data rows */}
            {Array.from({ length: 6 }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-aquiz-gray-lightest/70">
                <td className="py-3.5 px-5">
                  <Pulse className="w-28 h-3" />
                </td>
                {cols.map((_, colIdx) => (
                  <td key={colIdx} className="py-3.5 px-4 text-center">
                    <Pulse className="w-16 h-4 mx-auto" />
                  </td>
                ))}
              </tr>
            ))}

            {/* Section header 2 */}
            <tr className="bg-aquiz-gray-lightest/60">
              <td colSpan={count + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-gray-light">
                <Pulse className="w-28 h-3" />
              </td>
            </tr>

            {/* More data rows */}
            {Array.from({ length: 5 }).map((_, rowIdx) => (
              <tr key={`b-${rowIdx}`} className="border-b border-aquiz-gray-lightest/70">
                <td className="py-3.5 px-5">
                  <Pulse className="w-24 h-3" />
                </td>
                {cols.map((_, colIdx) => (
                  <td key={colIdx} className="py-3.5 px-4 text-center">
                    <Pulse className="w-14 h-3 mx-auto" />
                  </td>
                ))}
              </tr>
            ))}

            {/* Scoring section */}
            <tr className="bg-aquiz-green/5">
              <td colSpan={count + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-green">
                <Pulse className="w-36 h-3" />
              </td>
            </tr>

            {/* Score rows with bars */}
            {Array.from({ length: 8 }).map((_, rowIdx) => (
              <tr key={`s-${rowIdx}`} className="border-b border-aquiz-gray-lightest/70">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-2">
                    <Pulse className="w-20 h-3" />
                    <Pulse className="w-3 h-3 rounded-full" />
                    <Pulse className="w-6 h-2 ml-auto" />
                  </div>
                </td>
                {cols.map((_, colIdx) => (
                  <td key={colIdx} className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Pulse className="w-10 h-3" />
                      <Pulse className="w-16 h-1.5 rounded-full" />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
