/**
 * Calculateur d'éligibilité PAS (Prêt d'Accession Sociale)
 * Réglementation 2024-2025
 *
 * Source : articles L.312-1 et R.312-3 du CCH
 * Le PAS est un prêt conventionné plafonné, destiné aux ménages à revenus modestes.
 */

import { AIDES_CONFIG } from '@/config/aides.config'
import type {
    Condition,
    ParametresPAS,
    ResultatEligibilite,
    ZonePAS,
} from '@/types/aides'

/**
 * Mappe une zone PTZ vers une zone PAS simplifiée.
 * - Abis / A  → A
 * - B1        → B
 * - B2 / C    → C
 */
export function zonePTZversZonePAS(zonePTZ: string): ZonePAS {
  if (zonePTZ === 'Abis' || zonePTZ === 'A') return 'A'
  if (zonePTZ === 'B1') return 'B'
  return 'C'
}

/**
 * Vérifie l'éligibilité au PAS et renvoie les conditions détaillées.
 *
 * @param params - Paramètres du profil acheteur
 * @returns Résultat d'éligibilité PAS
 */
export function verifierEligibilitePAS(
  params: ParametresPAS
): ResultatEligibilite {
  const { revenusN2, nombrePersonnes, zonePAS, montantOperation } = params
  const cfg = AIDES_CONFIG.pas
  const conditions: Condition[] = []
  const raisons: string[] = []

  // 1 — Plafond de revenus
  const nbCapped = Math.min(nombrePersonnes, 5) as 1 | 2 | 3 | 4 | 5
  const plafondRevenus =
    (cfg.plafondsRevenus[zonePAS] as Record<number, number>)?.[nbCapped] ?? 0
  const revenusSousPlafond = revenusN2 <= plafondRevenus

  conditions.push({
    critere: 'Plafond de revenus',
    remplie: revenusSousPlafond,
    valeurActuelle: revenusN2,
    valeurRequise: plafondRevenus,
    description: `Vos revenus fiscaux (${revenusN2.toLocaleString('fr-FR')} €) doivent être ≤ ${plafondRevenus.toLocaleString('fr-FR')} € pour ${nombrePersonnes} personne(s) en zone ${zonePAS}.`,
  })
  if (!revenusSousPlafond)
    raisons.push(
      `Revenus (${revenusN2.toLocaleString('fr-FR')} €) supérieurs au plafond PAS (${plafondRevenus.toLocaleString('fr-FR')} €).`
    )

  // 2 — Résidence principale
  conditions.push({
    critere: 'Résidence principale',
    remplie: true, // Le PAS finance uniquement la résidence principale — implicitement vrai dans notre contexte
    valeurActuelle: true,
    valeurRequise: true,
    description: 'Le PAS finance uniquement l\'acquisition de votre résidence principale.',
  })

  // 3 — Montant d'opération positif
  const montantValide = montantOperation > 0
  conditions.push({
    critere: 'Montant d\'opération',
    remplie: montantValide,
    valeurActuelle: montantOperation,
    valeurRequise: '> 0 €',
    description: 'Le montant de l\'opération immobilière doit être positif.',
  })
  if (!montantValide) raisons.push('Montant d\'opération invalide.')

  const eligible = conditions.every((c) => c.remplie)

  return {
    eligible,
    montantMax: eligible ? montantOperation : undefined, // Le PAS peut financer 100% de l'opération
    dureeMax: eligible ? cfg.dureeMaxAns : undefined,
    taux: eligible ? cfg.tauxMax : undefined,
    conditions,
    raisons: raisons.length > 0 ? raisons : undefined,
  }
}
