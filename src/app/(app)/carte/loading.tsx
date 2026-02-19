/**
 * Loading state pour la carte interactive
 */
export default function CarteLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full border-[3px] border-gray-200 border-t-aquiz-black animate-spin" />
        <div className="space-y-2">
          <div className="h-5 bg-gray-100 rounded-lg w-48 mx-auto animate-pulse" />
          <p className="text-xs text-aquiz-gray/50">Chargement de la carte…</p>
        </div>
      </div>
    </div>
  )
}
