/**
 * Types principaux du simulateur AQUIZ
 */

// ============================================
// ENUMS ET TYPES DE BASE
// ============================================

/** Mode de simulation */
export type ModeSimulation = 'A' | 'B'

/** Type de bien immobilier */
export type TypeBien = 'neuf' | 'ancien'

/** Type de logement */
export type TypeLogement = 'appartement' | 'maison'

/** Situation du foyer */
export type SituationFoyer = 'celibataire' | 'couple'

/** Niveau de risque du projet */
export type NiveauRisque = 'confortable' | 'acceptable' | 'tendu' | 'impossible'

/** Niveau d'endettement */
export type NiveauEndettement = 'ok' | 'limite' | 'depassement'

// ============================================
// INTERFACES PROFIL UTILISATEUR
// ============================================

/**
 * Profil financier de l'utilisateur
 */
export interface ProfilUtilisateur {
  /** Revenus nets mensuels (tous les revenus du foyer) */
  revenusNets: number
  /** Charges mensuelles récurrentes (crédits en cours, pensions...) */
  chargesMensuelles: number
  /** Situation familiale */
  situationFoyer: SituationFoyer
  /** Nombre d'enfants à charge */
  nombreEnfants: number
}

// ============================================
// INTERFACES PARAMÈTRES MODE A
// ============================================

/**
 * Paramètres pour le Mode A "Que puis-je acheter ?"
 */
export interface ParametresModeA {
  /** Profil de l'utilisateur */
  profil: ProfilUtilisateur
  /** Apport personnel disponible */
  apport: number
  /** Durée souhaitée du prêt en années */
  dureeAns: number
  /** Type de bien recherché */
  typeBien: TypeBien
  /** Taux d'intérêt annuel (optionnel, sinon taux par défaut) */
  tauxInteret?: number
}

// ============================================
// INTERFACES PARAMÈTRES MODE B
// ============================================

/**
 * Paramètres pour le Mode B "Puis-je acheter ce bien ?"
 */
export interface ParametresModeB {
  /** Profil de l'utilisateur */
  profil: ProfilUtilisateur
  /** Prix du bien ciblé */
  prixBien: number
  /** Type de bien */
  typeBien: TypeBien
  /** Type de logement */
  typeLogement: TypeLogement
  /** Code postal du bien */
  codePostal: string
  /** Apport personnel disponible */
  apport: number
  /** Durée souhaitée du prêt en années */
  dureeAns: number
  /** Taux d'intérêt annuel (optionnel) */
  tauxInteret?: number
}

// ============================================
// INTERFACES RÉSULTATS
// ============================================

/**
 * Résultats de la simulation
 */
export interface ResultatsSimulation {
  /** Mode de simulation utilisé */
  mode: ModeSimulation

  // Capacités calculées
  /** Capacité d'emprunt maximale */
  capaciteEmprunt: number
  /** Capacité d'achat maximale (emprunt + apport - frais) */
  capaciteAchatMax: number

  // Mensualités
  /** Mensualité du crédit hors assurance */
  mensualiteHorsAssurance: number
  /** Mensualité de l'assurance */
  mensualiteAssurance: number
  /** Mensualité totale */
  mensualiteTotal: number

  // Taux et ratios
  /** Taux d'endettement en pourcentage */
  tauxEndettement: number
  /** Taux d'intérêt appliqué */
  tauxInteret: number

  // Coûts
  /** Frais de notaire estimés */
  fraisNotaire: number
  /** Coût total du crédit (intérêts + assurance) */
  coutTotalCredit: number
  /** TAEG estimé */
  taeg: number

  // Reste à vivre
  /** Reste à vivre mensuel */
  resteAVivre: number
  /** Reste à vivre minimum recommandé */
  resteAVivreMinimum: number

  // Évaluation
  /** Niveau de risque du projet */
  niveauRisque: NiveauRisque
  /** Le projet est-il faisable ? */
  faisable: boolean
  /** Messages et alertes */
  alertes: Alerte[]

  // Mode B spécifique
  /** Capital à emprunter (Mode B) */
  capitalAEmprunter?: number
  /** Ajustements suggérés si non faisable */
  ajustements?: Ajustement[]
}

/**
 * Alerte ou message à l'utilisateur
 */
export interface Alerte {
  /** Type d'alerte */
  type: 'info' | 'warning' | 'error' | 'success'
  /** Message à afficher */
  message: string
  /** Code de l'alerte pour l'identifier */
  code: string
}

/**
 * Suggestion d'ajustement pour rendre le projet faisable
 */
export interface Ajustement {
  /** Type d'ajustement proposé */
  type:
    | 'augmenter_apport'
    | 'allonger_duree'
    | 'reduire_prix'
    | 'augmenter_revenus'
    | 'reduire_charges'
  /** Valeur actuelle */
  valeurActuelle: number
  /** Valeur suggérée */
  valeurSuggeree: number
  /** Impact sur l'endettement */
  impactEndettement: number
  /** Description lisible */
  description: string
}

// ============================================
// INTERFACES VÉRIFICATION
// ============================================

/**
 * Résultat de vérification de l'endettement
 */
export interface VerificationEndettement {
  /** L'endettement est-il valide ? */
  valide: boolean
  /** Niveau d'endettement */
  niveau: NiveauEndettement
  /** Dépassement par rapport au max (peut être négatif) */
  depassement: number
  /** Message explicatif */
  message: string
}

/**
 * Résultat de vérification du reste à vivre
 */
export interface VerificationResteAVivre {
  /** Le reste à vivre est-il suffisant ? */
  suffisant: boolean
  /** Montant du reste à vivre */
  montant: number
  /** Minimum recommandé */
  minimum: number
  /** Marge (peut être négative) */
  marge: number
}
