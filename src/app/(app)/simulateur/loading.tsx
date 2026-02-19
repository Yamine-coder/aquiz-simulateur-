/**
 * Loading state pour la page simulateur
 */
export default function SimulateurLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full space-y-6">
        {/* Header skeleton */}
        <div className="text-center space-y-3">
          <div className="h-8 bg-gray-100 rounded-lg w-64 mx-auto animate-pulse" />
          <div className="h-4 bg-gray-50 rounded-lg w-80 mx-auto animate-pulse" />
        </div>

        {/* Card skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="h-5 bg-gray-100 rounded w-40 animate-pulse" />
          <div className="space-y-3">
            <div className="h-10 bg-gray-50 rounded-lg animate-pulse" />
            <div className="h-10 bg-gray-50 rounded-lg animate-pulse" />
            <div className="h-10 bg-gray-50 rounded-lg animate-pulse" />
          </div>
          <div className="h-12 bg-gray-100 rounded-full w-full animate-pulse mt-4" />
        </div>
      </div>
    </div>
  )
}
