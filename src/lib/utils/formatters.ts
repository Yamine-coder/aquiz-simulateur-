/**
 * Fonctions de formatage pour l'affichage
 */

/**
 * Formate un montant en euros avec séparateur de milliers
 * @param montant - Montant à formater
 * @returns Montant formaté (ex: "150 000")
 */
export function formatMontant(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(Math.round(montant))
}

/**
 * Formate un montant en euros avec le symbole €
 * @param montant - Montant à formater
 * @returns Montant formaté (ex: "150 000 €")
 */
export function formatEuros(montant: number): string {
  return `${formatMontant(montant)} €`
}

/**
 * Formate un pourcentage
 * @param valeur - Valeur à formater (0.35 pour 35%)
 * @param decimales - Nombre de décimales
 * @returns Pourcentage formaté (ex: "35,00 %")
 */
export function formatPourcentage(valeur: number, decimales: number = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valeur)
}

/**
 * Formate une surface en m²
 * @param surface - Surface en m²
 * @returns Surface formatée (ex: "45 m²")
 */
export function formatSurface(surface: number): string {
  return `${Math.round(surface)} m²`
}

/**
 * Formate un prix au m²
 * @param prixM2 - Prix au m²
 * @returns Prix formaté (ex: "4 500 €/m²")
 */
export function formatPrixM2(prixM2: number): string {
  return `${formatMontant(prixM2)} €/m²`
}

/**
 * Formate une durée en années
 * @param annees - Nombre d'années
 * @returns Durée formatée (ex: "25 ans")
 */
export function formatDuree(annees: number): string {
  return `${annees} an${annees > 1 ? 's' : ''}`
}

/**
 * Formate un taux d'intérêt
 * @param taux - Taux (ex: 3.5 pour 3.5%)
 * @returns Taux formaté (ex: "3,50 %")
 */
export function formatTaux(taux: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(taux) + ' %'
}
