/**
 * Schémas de validation Zod pour le simulateur AQUIZ
 * Conforme aux spécifications du PDF
 */

import { z } from 'zod'

// ============================================
// SCHÉMA PROFIL COMMUN (utilisé par Mode A et B)
// ============================================

/** Validation du profil utilisateur (commun aux deux modes) */
export const profilSchema = z.object({
  // Situation foyer
  situationFoyer: z.enum(['celibataire', 'couple']),
  nombreEnfants: z.number().int().min(0).max(10),
  
  // Revenus
  salaire1: z.number().min(0, 'Le salaire doit être positif'),
  salaire2: z.number().min(0),
  autresRevenus: z.number().min(0),
  
  // Charges
  creditsEnCours: z.number().min(0),
  autresCharges: z.number().min(0),
})

export type ProfilFormData = z.infer<typeof profilSchema>

// ============================================
// SCHÉMA MODE A - "Ce que je peux acheter"
// L'utilisateur indique sa mensualité max, on calcule le prix max du bien
// ============================================

export const modeASchema = z.object({
  // Profil (étape 1)
  situationFoyer: z.enum(['celibataire', 'couple']),
  nombreEnfants: z.number().int().min(0).max(10),
  salaire1: z.number().min(0, 'Le salaire doit être positif'),
  salaire2: z.number().min(0),
  autresRevenus: z.number().min(0),
  creditsEnCours: z.number().min(0),
  autresCharges: z.number().min(0),
  
  // Paramètres Mode A (étape 2)
  mensualiteMax: z.number().min(100, 'Mensualité minimum : 100€').max(10000, 'Mensualité maximum : 10 000€'),
  dureeAns: z.number().min(10, 'Durée minimum : 10 ans').max(25, 'Durée maximum : 25 ans (norme HCSF)'),
  apport: z.number().min(0, 'L\'apport ne peut être négatif'),
  typeBien: z.enum(['neuf', 'ancien']),
  tauxInteret: z.number().min(0.5).max(10),
})

export type ModeAFormData = z.infer<typeof modeASchema>

// ============================================
// SCHÉMA MODE B - "Ce qu'il faut pour acheter"  
// L'utilisateur indique un bien précis, on vérifie s'il peut l'acheter
// ============================================

export const modeBSchema = z.object({
  // Profil
  situationFoyer: z.enum(['celibataire', 'couple']),
  nombreEnfants: z.number().int().min(0).max(10),
  salaire1: z.number().min(0, 'Le salaire doit être positif'),
  salaire2: z.number().min(0),
  autresRevenus: z.number().min(0),
  creditsEnCours: z.number().min(0),
  autresCharges: z.number().min(0),
  
  // Paramètres bien
  prixBien: z.number().min(10000, 'Prix minimum : 10 000€').max(5000000, 'Prix maximum : 5 000 000€'),
  typeBien: z.enum(['neuf', 'ancien']),
  codePostal: z.string(),
  typeLogement: z.enum(['appartement', 'maison']),
  
  // Financement
  apport: z.number().min(0, 'L\'apport ne peut être négatif'),
  dureeAns: z.number().min(10, 'Durée minimum : 10 ans').max(25, 'Durée maximum : 25 ans (norme HCSF)'),
  tauxInteret: z.number().min(0.5).max(10),
})

export type ModeBFormData = z.infer<typeof modeBSchema>

// ============================================
// SCHÉMAS UTILITAIRES
// ============================================

/** Validation d'un montant en euros */
export const montantSchema = z
  .number()
  .min(0, 'Le montant ne peut être négatif')
  .max(10000000, 'Montant trop élevé')

/** Validation d'un pourcentage */
export const pourcentageSchema = z
  .number()
  .min(0, 'Le pourcentage ne peut être négatif')
  .max(100, 'Le pourcentage ne peut dépasser 100%')

/** Validation d'une durée en années */
export const dureeSchema = z
  .number()
  .int('La durée doit être un nombre entier')
  .min(1, 'Durée minimum : 1 an')
  .max(30, 'Durée maximum : 30 ans')
