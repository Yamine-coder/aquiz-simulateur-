/**
 * Calculateur d'éligibilité Prêt Action Logement (ex-1% Logement)
 * Réglementation 2024-2025
 *
 * Source : Action Logement Services — https://www.actionlogement.fr
 * Conditions : salarié du secteur privé, entreprise ≥ 10 salariés, CDI ou CDD, ancienneté ≥ 6 mois.
 */

import { AIDES_CONFIG } from '@/config/aides.config'
import type {
    Condition,
    ParametresActionLogement,
    ResultatEligibilite,
} from '@/types/aides'

/**
 * Vérifie l'éligibilité au prêt Action Logement et calcule le montant potentiel.
 *
 * @param params - Paramètres du profil salarié
 * @returns Résultat d'éligibilité Action Logement
 */
export function verifierEligibiliteActionLogement(
  params: ParametresActionLogement
): ResultatEligibilite {
  const { secteurActivite, tailleEntreprise, ancienneteMois, typeContrat, zoneTendue } = params
  const cfg = AIDES_CONFIG.actionLogement
  const conditions: Condition[] = []
  const raisons: string[] = []

  // 1 — Secteur privé
  const estPrive = secteurActivite === 'prive'
  conditions.push({
    critere: 'Secteur privé',
    remplie: estPrive,
    valeurActuelle: secteurActivite,
    valeurRequise: 'prive',
    description: 'L\'Action Logement est réservée aux salariés du secteur privé (hors agricole).',
  })
  if (!estPrive) raisons.push('Le prêt Action Logement est réservé au secteur privé.')

  // 2 — Taille de l'entreprise
  const tailleOk = tailleEntreprise >= cfg.tailleEntrepriseMin
  conditions.push({
    critere: 'Taille entreprise',
    remplie: tailleOk,
    valeurActuelle: tailleEntreprise,
    valeurRequise: cfg.tailleEntrepriseMin,
    description: `Votre entreprise doit compter au moins ${cfg.tailleEntrepriseMin} salariés.`,
  })
  if (!tailleOk)
    raisons.push(`Entreprise trop petite (${tailleEntreprise} salariés, minimum ${cfg.tailleEntrepriseMin}).`)

  // 3 — Ancienneté
  const ancienneteOk = ancienneteMois >= cfg.ancienneteMinMois
  conditions.push({
    critere: 'Ancienneté',
    remplie: ancienneteOk,
    valeurActuelle: ancienneteMois,
    valeurRequise: cfg.ancienneteMinMois,
    description: `Vous devez justifier d'au moins ${cfg.ancienneteMinMois} mois d'ancienneté.`,
  })
  if (!ancienneteOk)
    raisons.push(`Ancienneté insuffisante (${ancienneteMois} mois, minimum ${cfg.ancienneteMinMois}).`)

  // 4 — Type de contrat
  const contratAccepte = typeContrat === 'CDI' || typeContrat === 'CDD'
  conditions.push({
    critere: 'Type de contrat',
    remplie: contratAccepte,
    valeurActuelle: typeContrat,
    valeurRequise: 'CDI ou CDD',
    description: 'Le prêt est accessible aux salariés en CDI ou CDD (pas d\'intérim).',
  })
  if (!contratAccepte)
    raisons.push(`Contrat ${typeContrat} non éligible (CDI ou CDD requis).`)

  const eligible = conditions.every((c) => c.remplie)

  // Montant selon la zone
  const montantMax = eligible
    ? (zoneTendue ? cfg.montantMax.zoneTendue : cfg.montantMax.zoneNonTendue)
    : undefined

  return {
    eligible,
    montantMax,
    dureeMax: eligible ? cfg.dureeMaxAns : undefined,
    taux: eligible ? cfg.taux : undefined,
    conditions,
    raisons: raisons.length > 0 ? raisons : undefined,
  }
}
