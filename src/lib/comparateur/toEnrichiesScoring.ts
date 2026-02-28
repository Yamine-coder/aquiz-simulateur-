/**
 * Convertit une AnalyseComplete (du hook useAnalyseEnrichie)
 * en DonneesEnrichiesScoring (pour le moteur de scoring pro)
 */

import type { DonneesEnrichiesScoring } from '@/lib/comparateur/scoreComparateur';

interface AnalyseMinimale {
  marche: { success: boolean; ecartPrixM2?: number; verdict?: string; evolution12Mois?: number; prixM2MedianMarche?: number; nbTransactions?: number }
  risques: { success: boolean; scoreRisque?: number; verdict?: string; zoneInondable?: boolean; niveauRadon?: number }
  quartier: { success: boolean; scoreQuartier?: number; transports?: number; commerces?: number; ecoles?: number; sante?: number; espaceVerts?: number }
}

export function toEnrichiesScoring(analyse: AnalyseMinimale | null): DonneesEnrichiesScoring | undefined {
  if (!analyse) return undefined
  return {
    marche: analyse.marche.success ? {
      ...analyse.marche,
      verdict: analyse.marche.verdict as DonneesEnrichiesScoring['marche'] extends { verdict?: infer V } ? V : never
    } : undefined,
    risques: analyse.risques.success ? {
      ...analyse.risques,
      verdict: analyse.risques.verdict as DonneesEnrichiesScoring['risques'] extends { verdict?: infer V } ? V : never
    } : undefined,
    quartier: analyse.quartier.success ? analyse.quartier : undefined,
  }
}
