/**
 * Calculateur d'éligibilité PTZ (Prêt à Taux Zéro)
 * Réglementation 2024-2025
 *
 * Source : décret n° 2023-1230, articles L.31-10-1 et suivants du CCH
 */

import { AIDES_CONFIG } from '@/config/aides.config'
import type {
    Condition,
    ParametresPTZ,
    ResultatEligibilite,
    ZonePTZ,
} from '@/types/aides'

/** Zones tendues où le PTZ neuf reste disponible (depuis 2024) */
const ZONES_PTZ_NEUF: ZonePTZ[] = ['Abis', 'A', 'B1']

/**
 * Vérifie l'éligibilité au PTZ et calcule le montant potentiel.
 *
 * @param params - Paramètres du profil acheteur et du bien
 * @returns Résultat d'éligibilité détaillé
 */
export function verifierEligibilitePTZ(
  params: ParametresPTZ
): ResultatEligibilite {
  const { zonePTZ, typeBien, prixAchat, revenusN2, nombrePersonnes, primoAccedant } = params
  const cfg = AIDES_CONFIG.ptz
  const conditions: Condition[] = []
  const raisons: string[] = []

  // 1 — Primo-accédant
  conditions.push({
    critere: 'Primo-accédant',
    remplie: primoAccedant,
    valeurActuelle: primoAccedant,
    valeurRequise: true,
    description: 'Vous ne devez pas avoir été propriétaire de votre résidence principale au cours des 2 dernières années.',
  })
  if (!primoAccedant) raisons.push('Le PTZ est réservé aux primo-accédants.')

  // 2 — Zone éligible pour le type de bien
  const zoneEligible =
    typeBien === 'neuf'
      ? ZONES_PTZ_NEUF.includes(zonePTZ)
      : true // ancien rénové potentiellement partout
  conditions.push({
    critere: 'Zone éligible',
    remplie: zoneEligible,
    valeurActuelle: zonePTZ,
    valeurRequise: typeBien === 'neuf' ? ZONES_PTZ_NEUF.join(', ') : 'Toutes zones',
    description:
      typeBien === 'neuf'
        ? `Le PTZ neuf est disponible en zones ${ZONES_PTZ_NEUF.join(', ')}.`
        : `Le PTZ ancien avec travaux est disponible dans toutes les zones.`,
  })
  if (!zoneEligible) raisons.push(`Le PTZ neuf n'est pas disponible en zone ${zonePTZ}.`)

  // 3 — Plafond de revenus
  const nbPersonnesCapped = Math.min(nombrePersonnes, 5) as 1 | 2 | 3 | 4 | 5
  const plafondRevenus = cfg.plafondsRevenus[zonePTZ]?.[nbPersonnesCapped] ?? 0
  const revenusSousPlafond = revenusN2 <= plafondRevenus
  conditions.push({
    critere: 'Plafond de revenus',
    remplie: revenusSousPlafond,
    valeurActuelle: revenusN2,
    valeurRequise: plafondRevenus,
    description: `Vos revenus fiscaux (${revenusN2.toLocaleString('fr-FR')} €) doivent être ≤ ${plafondRevenus.toLocaleString('fr-FR')} € pour ${nombrePersonnes} personne(s) en zone ${zonePTZ}.`,
  })
  if (!revenusSousPlafond) raisons.push(`Revenus (${revenusN2.toLocaleString('fr-FR')} €) supérieurs au plafond (${plafondRevenus.toLocaleString('fr-FR')} €).`)

  // Éligibilité globale
  const eligible = conditions.every((c) => c.remplie)

  // Calcul du montant
  let montantMax = 0
  if (eligible) {
    const quotite =
      typeBien === 'neuf' ? cfg.quotiteMax.neuf : cfg.quotiteMax.ancienRenove
    const plafondPrix = cfg.prixPlafonds[zonePTZ] ?? 0
    const assiette = Math.min(prixAchat, plafondPrix)
    montantMax = Math.round(assiette * quotite)
  }

  return {
    eligible,
    montantMax: eligible ? montantMax : undefined,
    dureeMax: eligible ? cfg.dureeMaxAns : undefined,
    taux: 0, // PTZ = 0 %
    conditions,
    raisons: raisons.length > 0 ? raisons : undefined,
  }
}
