/**
 * Loading state pour le comparateur
 */
export default function ComparateurLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="h-8 bg-gray-100 rounded-lg w-56 mx-auto animate-pulse" />
          <div className="h-4 bg-gray-50 rounded-lg w-72 mx-auto animate-pulse" />
        </div>

        {/* Grid skeleton (cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="h-32 bg-gray-50 rounded-lg animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-gray-50 rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
