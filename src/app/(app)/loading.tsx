/**
 * Loading state pour les pages applicatives (simulateur, carte, comparateur, etc.)
 * Affiche un skeleton animé pendant le chargement de la page.
 */
export default function AppLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Spinner AQUIZ */}
        <div className="mx-auto w-12 h-12 rounded-full border-[3px] border-gray-200 border-t-aquiz-black animate-spin" />

        {/* Skeleton content */}
        <div className="space-y-3">
          <div className="h-6 bg-gray-100 rounded-lg w-48 mx-auto animate-pulse" />
          <div className="h-4 bg-gray-50 rounded-lg w-64 mx-auto animate-pulse" />
        </div>

        <p className="text-xs text-aquiz-gray/50">Chargement en cours…</p>
      </div>
    </div>
  )
}
