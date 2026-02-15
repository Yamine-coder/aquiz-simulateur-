/**
 * Export centralisé des fonctions de calcul
 */

// Endettement
export {
    calculerMensualiteMaximale, calculerTauxEndettement,
    verifierEndettement
} from './endettement'

// Mensualité
export {
    calculerCapitalDepuisMensualite,
    calculerCoutInterets, calculerMensualite, genererTableauAmortissement
} from './mensualite'

// Capacité d'emprunt
export {
    calculerCapaciteEmprunt,
    calculerCapacitesParDuree,
    trouverDureeOptimale
} from './capaciteEmprunt'

// Frais de notaire
export {
    calculerCoutTotalAcquisition, calculerFraisNotaire, calculerPrixMaxPourBudget
} from './fraisNotaire'

// Reste à vivre
export {
    calculerMensualiteMaxResteAVivre, calculerResteAVivre,
    calculerResteAVivreMinimum,
    verifierResteAVivre
} from './resteAVivre'

// Assurance
export {
    calculerAssuranceEmprunteur,
    calculerTAEA,
    comparerAssurances
} from './assurance'

// TAEG
export {
    calculerTAEG, estimerFraisGarantie, verifierTauxUsure
} from './taeg'

// Capacité d'achat
export {
    calculerApportNecessaire, calculerCapaciteAchatGlobale,
    verifierBienDansBudget
} from './capaciteAchat'

