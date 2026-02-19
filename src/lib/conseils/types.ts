/**
 * Types du système de conseils AQUIZ
 * Source de vérité unique pour tous les modules conseil
 */

// ============================================================================
// TYPES PUBLICS (exportés vers les composants UI)
// ============================================================================

export interface ConseilAQUIZ {
  id: string;
  priorite: 1 | 2 | 3; // 1 = critique, 2 = important, 3 = optimisation
  categorie: 'diagnostic' | 'action' | 'scenario' | 'strategie';
  titre: string;
  conseil: string;
  impact?: string;
  action?: ActionConcrète;
  type: 'succes' | 'amelioration' | 'optimisation' | 'alerte' | 'info';
}

export interface ActionConcrète {
  label: string;
  timeline?: string;
  gain?: string;
}

export interface ScenarioAlternatif {
  id: string;
  titre: string;
  description: string;
  modifications: {
    apport?: number;
    duree?: number;
    mensualite?: number;
  };
  resultats: {
    nouveauBudget: number;
    nouveauTaux: number;
    nouvellesMensualites: number;
    economieOuCout: number;
  };
  avantages: string[];
  inconvenients: string[];
  recommande: boolean;
}

export interface DiagnosticBancaire {
  scoreGlobal: number;
  probabiliteAcceptation: 'très élevée' | 'élevée' | 'moyenne' | 'faible' | 'très faible';
  pointsForts: string[];
  pointsVigilance: string[];
  banquesRecommandees: string[];
  delaiEstime: string;
}

// ============================================================================
// DONNÉES D'ENTRÉE
// ============================================================================

export interface DonneesConseil {
  // Profil
  age: number;
  statutProfessionnel: string;
  situationFoyer: string;
  nombreEnfants: number;

  // Revenus & charges
  revenus: number;
  charges: number;

  // Projet
  apport: number;
  mensualiteMax: number;
  mensualiteRecommandee: number;
  dureeAns: number;
  tauxInteret: number;
  typeBien: string;

  // Résultats calculés
  prixAchat: number;
  capitalEmpruntable: number;
  tauxEndettement: number;
  resteAVivre: number;
  resteAVivreMin: number;
  niveauResteAVivre: 'ok' | 'limite' | 'risque';
  scoreFaisabilite: number;

  // Géographie
  surfaceParis: number;
  surfacePetiteCouronne: number;
  surfaceGrandeCouronne: number;
}

// ============================================================================
// RÉSULTAT FINAL
// ============================================================================

export interface ResultatConseilsAvances {
  diagnostic: DiagnosticBancaire;
  conseils: ConseilAQUIZ[];
  scenarios: ScenarioAlternatif[];
  resumeExecutif: string;
}
