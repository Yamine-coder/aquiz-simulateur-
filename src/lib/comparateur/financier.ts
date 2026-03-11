/**
 * Utilitaires financiers pour le comparateur
 * 
 * Calculs de mensualité, frais de notaire, coût total d'acquisition
 * Utilisé par TableauComparaison et VueMobileAccordeon
 */

import { SIMULATEUR_CONFIG } from '@/config/simulateur.config'

// ============================================
// MENSUALITÉ DE CRÉDIT
// ============================================

/**
 * Calcule la mensualité de crédit pour un bien immobilier
 * Inclut l'assurance emprunteur (norme HCSF : comptabilisée dans le taux d'endettement)
 * 
 * Formule crédit : M = (C × t) / (1 - (1 + t)^(-n))
 * Assurance : A = (C × tauxAssurance) / 12
 * Total : M + A
 * 
 * @param prixBien Prix du bien en euros
 * @param apport Apport personnel en euros
 * @param tauxAnnuel Taux d'intérêt annuel en % (ex: 3.5)
 * @param dureeAns Durée du prêt en années
 * @param tauxAssurance Taux d'assurance annuel en décimal (défaut: 0.0034 = 0.34%)
 */
export function calculerMensualite(
  prixBien: number,
  apport: number,
  tauxAnnuel: number,
  dureeAns: number,
  tauxAssurance: number = SIMULATEUR_CONFIG.tauxAssuranceMoyen
): number {
  const capitalEmprunte = prixBien - apport
  if (capitalEmprunte <= 0) return 0

  const tauxMensuel = tauxAnnuel / 100 / 12
  const nombreMensualites = dureeAns * 12

  let mensualiteCredit: number
  if (tauxMensuel === 0) {
    mensualiteCredit = capitalEmprunte / nombreMensualites
  } else {
    mensualiteCredit = (capitalEmprunte * tauxMensuel) /
      (1 - Math.pow(1 + tauxMensuel, -nombreMensualites))
  }

  // Assurance emprunteur sur capital initial (méthode la plus courante en France)
  const mensualiteAssurance = (capitalEmprunte * tauxAssurance) / 12

  return Math.round(mensualiteCredit + mensualiteAssurance)
}

// ============================================
// FRAIS DE NOTAIRE
// ============================================

/**
 * Estime les frais de notaire selon les normes françaises
 * - Neuf (< 5 ans / VEFA) : 2-3% du prix
 * - Ancien (> 5 ans) : 7-8% du prix
 * 
 * @param prix Prix du bien en euros
 * @param anneeConstruction Année de construction (optionnel)
 * @returns Frais de notaire estimés et taux appliqué
 */
export function estimerFraisNotaire(
  prix: number,
  anneeConstruction?: number
): { montant: number; taux: number; isNeuf: boolean } {
  const anneeActuelle = new Date().getFullYear()
  // Un bien est considéré "neuf" s'il a moins de 5 ans
  const isNeuf = anneeConstruction !== undefined && (anneeActuelle - anneeConstruction) <= 5

  const taux = isNeuf ? 0.025 : 0.075 // 2.5% neuf, 7.5% ancien
  const montant = Math.round(prix * taux)

  return { montant, taux, isNeuf }
}

// ============================================
// COÛT TOTAL D'ACQUISITION
// ============================================

/**
 * Calcule le coût total d'acquisition = prix + frais de notaire + travaux estimés
 */
export function calculerCoutTotal(
  prix: number,
  fraisNotaire: number,
  budgetTravaux?: number
): number {
  return prix + fraisNotaire + (budgetTravaux || 0)
}
