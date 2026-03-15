export default function SimulateurLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-aquiz-green/30 border-t-aquiz-green rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Chargement du simulateur…</p>
      </div>
    </div>
  )
}
