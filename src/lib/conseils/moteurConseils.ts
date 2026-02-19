/**
 * Moteur de règles pour les conseils AQUIZ
 * Pattern : Rules Engine avec exclusion mutuelle par groupe
 *
 * Principe :
 * - Chaque règle appartient à un GROUPE (ex: 'endettement', 'apport')
 * - Une seule règle par groupe peut se déclencher (la plus prioritaire par poids)
 * - Un budget d'affichage limite le nombre total de conseils affichés
 * - Résultat : zéro doublon par construction
 */

import type {
    ConseilAQUIZ,
    DiagnosticBancaire,
    DonneesConseil,
    ScenarioAlternatif,
} from './types';

// ============================================================================
// TYPES DU MOTEUR
// ============================================================================

/** Groupes d'exclusion mutuelle — 1 seule règle se déclenche par groupe */
export type GroupeConseil =
  | 'score'
  | 'endettement'
  | 'apport'
  | 'statut'
  | 'age'
  | 'duree'
  | 'ptz'
  | 'geographie'
  | 'marche'

export interface RegleConseil {
  /** Identifiant unique */
  id: string;
  /** Groupe d'exclusion mutuelle */
  groupe: GroupeConseil;
  /** 1 = critique, 2 = important, 3 = optimisation */
  priorite: 1 | 2 | 3;
  /** Poids dans le groupe : la règle avec le poids le plus haut gagne */
  poids: number;
  /** Condition d'activation */
  condition: (data: DonneesConseil) => boolean;
  /** Générateur du conseil (appelé seulement si condition = true) */
  generer: (data: DonneesConseil, diagnostic: DiagnosticBancaire) => Omit<ConseilAQUIZ, 'id' | 'priorite'>;
}

export interface RegleScenario {
  /** Identifiant unique */
  id: string;
  /** Poids de tri : les scénarios les plus pertinents en premier */
  poids: number;
  /** Condition d'activation */
  condition: (data: DonneesConseil) => boolean;
  /** Générateur du scénario (peut retourner null si non viable après calcul) */
  generer: (data: DonneesConseil) => ScenarioAlternatif | null;
}

// ============================================================================
// BUDGET D'AFFICHAGE
// ============================================================================

interface BudgetAffichage {
  maxPriorite1: number;
  maxPriorite2: number;
  maxPriorite3: number;
  maxTotal: number;
}

const BUDGET_DEFAUT: BudgetAffichage = {
  maxPriorite1: 2,
  maxPriorite2: 2,
  maxPriorite3: 2,
  maxTotal: 6,
}

// ============================================================================
// ÉVALUATION DES RÈGLES DE CONSEILS
// ============================================================================

/**
 * Évalue les règles de conseils :
 * 1. Filtre par condition (seules les règles vraies passent)
 * 2. Dédup par groupe (la règle avec le poids le plus haut gagne)
 * 3. Tri par priorité
 * 4. Application du budget d'affichage (mix équilibré P1/P2/P3)
 */
export function evaluerConseils(
  regles: RegleConseil[],
  data: DonneesConseil,
  diagnostic: DiagnosticBancaire,
  budget: BudgetAffichage = BUDGET_DEFAUT
): ConseilAQUIZ[] {
  // 1. Filtrer par condition
  const reglesActives = regles.filter(r => r.condition(data))

  // 2. Dédup par groupe : garder la règle avec le poids le plus élevé
  const parGroupe = new Map<string, RegleConseil>()
  for (const regle of reglesActives) {
    const existante = parGroupe.get(regle.groupe)
    if (!existante || regle.poids > existante.poids) {
      parGroupe.set(regle.groupe, regle)
    }
  }

  // 3. Générer les conseils
  const conseilsBruts: ConseilAQUIZ[] = []
  for (const regle of parGroupe.values()) {
    const conseil = regle.generer(data, diagnostic)
    conseilsBruts.push({
      ...conseil,
      id: regle.id,
      priorite: regle.priorite,
    })
  }

  // 4. Trier par priorité
  conseilsBruts.sort((a, b) => a.priorite - b.priorite)

  // 5. Appliquer budget d'affichage
  const resultat: ConseilAQUIZ[] = []
  let countP1 = 0
  let countP2 = 0
  let countP3 = 0

  for (const conseil of conseilsBruts) {
    if (resultat.length >= budget.maxTotal) break

    if (conseil.priorite === 1 && countP1 < budget.maxPriorite1) {
      resultat.push(conseil)
      countP1++
    } else if (conseil.priorite === 2 && countP2 < budget.maxPriorite2) {
      resultat.push(conseil)
      countP2++
    } else if (conseil.priorite === 3 && countP3 < budget.maxPriorite3) {
      resultat.push(conseil)
      countP3++
    }
  }

  return resultat
}

// ============================================================================
// ÉVALUATION DES RÈGLES DE SCÉNARIOS
// ============================================================================

/**
 * Évalue les règles de scénarios :
 * 1. Filtre par condition
 * 2. Tri par poids (pertinence décroissante)
 * 3. Génère chaque scénario (skip null = non viable)
 * 4. Limite à maxScenarios
 */
export function evaluerScenarios(
  regles: RegleScenario[],
  data: DonneesConseil,
  maxScenarios: number = 3
): ScenarioAlternatif[] {
  const actifs = regles
    .filter(r => r.condition(data))
    .sort((a, b) => b.poids - a.poids)

  const scenarios: ScenarioAlternatif[] = []

  for (const regle of actifs) {
    if (scenarios.length >= maxScenarios) break
    const scenario = regle.generer(data)
    if (scenario) scenarios.push(scenario)
  }

  return scenarios
}
