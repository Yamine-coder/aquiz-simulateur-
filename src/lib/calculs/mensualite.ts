/**
 * Calcul de la mensualité de crédit
 * Formule standard d'annuité constante
 */

/**
 * Calcule la mensualité d'un crédit immobilier
 *
 * Formule : M = C × (t / (1 - (1 + t)^(-n)))
 * où M = mensualité, C = capital, t = taux mensuel, n = nombre de mois
 *
 * @param capital - Capital emprunté en euros
 * @param tauxAnnuel - Taux d'intérêt annuel (ex: 0.035 pour 3.5%)
 * @param dureeAns - Durée du prêt en années
 * @returns Mensualité hors assurance en euros
 *
 * @example
 * calculerMensualite(200000, 0.035, 20) // ~1159€
 */
export function calculerMensualite(
  capital: number,
  tauxAnnuel: number,
  dureeAns: number
): number {
  // Validation
  if (capital <= 0) return 0
  if (dureeAns <= 0) return 0

  // Cas taux à 0 (ex: PTZ)
  if (tauxAnnuel === 0) {
    return Math.round(capital / (dureeAns * 12))
  }

  const tauxMensuel = tauxAnnuel / 12
  const nbMois = dureeAns * 12

  // Formule d'annuité constante
  const mensualite = capital * (tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -nbMois)))

  return Math.round(mensualite * 100) / 100
}

/**
 * Calcule le capital empruntable à partir d'une mensualité
 *
 * Formule inverse : C = M × ((1 - (1 + t)^(-n)) / t)
 *
 * @param mensualite - Mensualité souhaitée en euros
 * @param tauxAnnuel - Taux d'intérêt annuel
 * @param dureeAns - Durée du prêt en années
 * @returns Capital empruntable en euros
 */
export function calculerCapitalDepuisMensualite(
  mensualite: number,
  tauxAnnuel: number,
  dureeAns: number
): number {
  if (mensualite <= 0 || dureeAns <= 0) return 0

  // Cas taux à 0
  if (tauxAnnuel === 0) {
    return Math.round(mensualite * dureeAns * 12)
  }

  const tauxMensuel = tauxAnnuel / 12
  const nbMois = dureeAns * 12

  // Formule inverse
  const capital = mensualite * ((1 - Math.pow(1 + tauxMensuel, -nbMois)) / tauxMensuel)

  return Math.round(capital)
}

/**
 * Calcule le coût total des intérêts
 *
 * @param capital - Capital emprunté
 * @param mensualite - Mensualité
 * @param dureeAns - Durée en années
 * @returns Coût total des intérêts
 */
export function calculerCoutInterets(
  capital: number,
  mensualite: number,
  dureeAns: number
): number {
  const totalRembourse = mensualite * dureeAns * 12
  return Math.round(totalRembourse - capital)
}

/**
 * Génère le tableau d'amortissement
 *
 * @param capital - Capital emprunté
 * @param tauxAnnuel - Taux annuel
 * @param dureeAns - Durée en années
 * @returns Tableau d'amortissement
 */
export function genererTableauAmortissement(
  capital: number,
  tauxAnnuel: number,
  dureeAns: number
): {
  mois: number
  mensualite: number
  interets: number
  capital: number
  capitalRestant: number
}[] {
  const mensualite = calculerMensualite(capital, tauxAnnuel, dureeAns)
  const tauxMensuel = tauxAnnuel / 12
  const nbMois = dureeAns * 12

  const tableau = []
  let capitalRestant = capital

  for (let mois = 1; mois <= nbMois; mois++) {
    const interetsMois = capitalRestant * tauxMensuel
    const capitalMois = mensualite - interetsMois
    capitalRestant -= capitalMois

    tableau.push({
      mois,
      mensualite: Math.round(mensualite * 100) / 100,
      interets: Math.round(interetsMois * 100) / 100,
      capital: Math.round(capitalMois * 100) / 100,
      capitalRestant: Math.max(0, Math.round(capitalRestant * 100) / 100),
    })
  }

  return tableau
}
