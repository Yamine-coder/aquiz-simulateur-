/**
 * Loading state pour les pages vitrine (accueil, à propos, mentions légales)
 * Skeleton léger — ces pages sont Server Components statiques, le loading
 * ne s'affiche que sur la navigation client-side.
 */
export default function VitrineLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-10 h-10 rounded-full border-[3px] border-gray-200 border-t-aquiz-black animate-spin" />
        <div className="space-y-3">
          <div className="h-5 bg-gray-100 rounded-lg w-40 mx-auto animate-pulse" />
          <div className="h-4 bg-gray-50 rounded-lg w-56 mx-auto animate-pulse" />
        </div>
      </div>
    </div>
  )
}
