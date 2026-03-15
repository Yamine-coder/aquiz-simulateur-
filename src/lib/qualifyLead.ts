/**
 * Auto-qualification du lead basée sur les données contextuelles.
 * Score 0-100, niveau hot/warm/cold.
 */
export function qualifyLead(source: string, ctx: Record<string, unknown> | undefined): { score: number; niveau: 'hot' | 'warm' | 'cold' } {
  let score = 0

  // +25 si simulateur (intention forte)
  if (source === 'simulateur-a' || source === 'simulateur-b') score += 25
  // +15 si comparateur (comparaison active)
  else if (source === 'comparateur') score += 15
  // +5 pour carte/aides (exploration)
  else score += 5

  if (!ctx) return { score: Math.min(score, 100), niveau: score >= 60 ? 'hot' : score >= 30 ? 'warm' : 'cold' }

  // +15 si budget renseigné et > 0
  const budget = ctx.budgetMax ?? ctx.prixAchatMax ?? ctx.prixBien ?? ctx.capitalEmpruntable
  if (typeof budget === 'number' && budget > 0) score += 15

  // +10 si apport renseigné et > 0
  if (typeof ctx.apport === 'number' && ctx.apport > 0) score += 10

  // +10 si durée renseignée
  if (typeof ctx.dureeAns === 'number' && ctx.dureeAns > 0) score += 10

  // +10 si type de bien renseigné
  if (typeof ctx.typeBien === 'string' && ctx.typeBien) score += 10

  // +10 si taux endettement calculé (simulation complète)
  if (typeof ctx.tauxEndettement === 'number') score += 10

  // +10 si score faisabilité présent
  if (typeof ctx.scoreFaisabilite === 'number') score += 10

  // +5 si UTM source présente (trafic qualifié)
  if (typeof ctx.utm_source === 'string' && ctx.utm_source) score += 5

  // +5 si gate = result-unlock (a débloqué les résultats)
  if (ctx.gate === 'result-unlock') score += 5

  score = Math.min(score, 100)
  const niveau = score >= 60 ? 'hot' : score >= 30 ? 'warm' : 'cold'
  return { score, niveau }
}
