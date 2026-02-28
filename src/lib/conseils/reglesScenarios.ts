/**
 * Règles de scénarios alternatifs AQUIZ — déclaratives
 *
 * Chaque scénario est un objet avec :
 * - id : identifiant unique
 * - poids : pertinence (les plus hauts apparaissent en premier)
 * - condition : quand proposer le scénario
 * - generer : calculer et produire le scénario (peut retourner null si non viable)
 *
 * Max 3 scénarios affichés (géré par le moteur).
 */

import {
    calculerCapital,
    estEligiblePTZ,
    formatMontant,
    getFraisNotaire,
    getMontantPTZ,
} from './contexteMarche'
import type { RegleScenario } from './moteurConseils'
import type { DonneesConseil } from './types'

// ============================================================================
// HELPERS
// ============================================================================

/** Calcule le nouveau prix achat à partir du budget total et du type de bien */
function budgetVersPrix(budget: number, typeBien: string): number {
  return budget / (1 + getFraisNotaire(typeBien))
}

/** Calcule le pourcentage d'apport */
function pctApport(data: DonneesConseil): number {
  return data.prixAchat > 0 ? (data.apport / data.prixAchat) * 100 : 0
}

// ============================================================================
// SCÉNARIO : Augmenter l'apport de 10 000 €
// ============================================================================

const apportPlus10k: RegleScenario = {
  id: 'apport-plus-10k',
  poids: 80,
  condition: (d) => pctApport(d) < 25,
  generer: (d) => {
    const nouvelApport = d.apport + 10000
    const nouveauBudget = nouvelApport + d.capitalEmpruntable
    const nouveauPrix = budgetVersPrix(nouveauBudget, d.typeBien)
    const nouveauPourcentage = (nouvelApport / nouveauPrix) * 100
    const gainTaux = nouveauPourcentage >= 20 ? 0.15 : 0.05
    const nouveauTaux = Math.max(d.tauxInteret - gainTaux, 2.5)

    return {
      id: 'apport-plus-10k',
      titre: 'Augmenter l\'apport de 10 000 €',
      description: 'Économisez pendant quelques mois pour renforcer votre dossier',
      modifications: { apport: nouvelApport },
      resultats: {
        nouveauBudget: nouveauPrix,
        nouveauTaux,
        nouvellesMensualites: d.mensualiteMax,
        economieOuCout: nouveauPrix - d.prixAchat,
      },
      avantages: [
        `Apport passe à ${Math.round(nouveauPourcentage)}%`,
        `Budget achat : +${formatMontant(nouveauPrix - d.prixAchat)} €`,
        gainTaux > 0.1 ? `Taux négociable à ${nouveauTaux.toFixed(2)}%` : 'Dossier renforcé',
      ],
      inconvenients: [
        `Nécessite ${formatMontant(10000)} € d'épargne supplémentaire`,
        'Report du projet de quelques mois',
      ],
      recommande: pctApport(d) < 15,
    }
  },
}

// ============================================================================
// SCÉNARIO : Allonger la durée de 5 ans
// ============================================================================

const dureePlus5: RegleScenario = {
  id: 'duree-plus-5',
  poids: 70,
  condition: (d) => d.dureeAns <= 20 && d.age + d.dureeAns + 5 <= 75,
  generer: (d) => {
    const nouvelleDuree = d.dureeAns + 5
    const nouveauCapital = calculerCapital(d.mensualiteMax, d.tauxInteret + 0.1, nouvelleDuree)
    const nouveauBudget = d.apport + nouveauCapital
    const nouveauPrix = budgetVersPrix(nouveauBudget, d.typeBien)
    const coutTotal25 = d.mensualiteMax * nouvelleDuree * 12
    const coutTotalActuel = d.mensualiteMax * d.dureeAns * 12
    const coutSupp = coutTotal25 - coutTotalActuel

    return {
      id: 'duree-plus-5',
      titre: `Passer à ${nouvelleDuree} ans`,
      description: 'Augmentez votre capacité d\'achat en allongeant la durée',
      modifications: { duree: nouvelleDuree },
      resultats: {
        nouveauBudget: nouveauPrix,
        nouveauTaux: d.tauxInteret + 0.1,
        nouvellesMensualites: d.mensualiteMax,
        economieOuCout: nouveauPrix - d.prixAchat,
      },
      avantages: [
        `Budget achat : +${formatMontant(nouveauPrix - d.prixAchat)} €`,
        'Même mensualité conservée',
        ...(d.surfaceGrandeCouronne > 0
          ? [`+${Math.round((nouveauPrix - d.prixAchat) / (d.prixAchat / d.surfaceGrandeCouronne))} m² potentiels`]
          : ['Surface accessible augmentée']),
      ],
      inconvenients: [
        `Coût total du crédit : +${formatMontant(coutSupp)} €`,
        'Taux légèrement plus élevé (+0.10%)',
      ],
      recommande: d.surfaceParis < 30,
    }
  },
}

// ============================================================================
// SCÉNARIO : Mensualité sécurisée à 30%
// ============================================================================

const mensualiteSecurisee: RegleScenario = {
  id: 'mensualite-securisee',
  poids: 90, // Haute priorité si endettement élevé
  condition: (d) => d.tauxEndettement > 32,
  generer: (d) => {
    const mensualiteSec = Math.round(d.revenus * 0.30 - d.charges)
    const capitalSecurise = calculerCapital(mensualiteSec, d.tauxInteret, d.dureeAns)
    const nouveauBudget = d.apport + capitalSecurise
    const nouveauPrix = budgetVersPrix(nouveauBudget, d.typeBien)
    const reductionMensuelle = d.mensualiteMax - mensualiteSec

    if (reductionMensuelle <= 50) return null // Pas assez significatif

    return {
      id: 'mensualite-securisee',
      titre: 'Mensualité sécurisée à 30%',
      description: 'Réduisez votre mensualité pour un dossier béton',
      modifications: { mensualite: mensualiteSec },
      resultats: {
        nouveauBudget: nouveauPrix,
        nouveauTaux: d.tauxInteret,
        nouvellesMensualites: mensualiteSec,
        economieOuCout: -(d.prixAchat - nouveauPrix),
      },
      avantages: [
        'Endettement à 30% (marge de sécurité)',
        `Économie mensuelle : ${formatMontant(reductionMensuelle)} €`,
        'Acceptation quasi-garantie',
      ],
      inconvenients: [
        `Budget réduit de ${formatMontant(d.prixAchat - nouveauPrix)} €`,
        'Surface accessible réduite',
      ],
      recommande: d.scoreFaisabilite < 70,
    }
  },
}

// ============================================================================
// SCÉNARIO : Neuf vs Ancien
// ============================================================================

const passerAuNeuf: RegleScenario = {
  id: 'passer-au-neuf',
  poids: 60,
  condition: (d) => d.typeBien === 'ancien',
  generer: (d) => {
    const budgetNeuf = budgetVersPrix(d.apport + d.capitalEmpruntable, 'neuf')
    const gainPrix = budgetNeuf - d.prixAchat

    if (gainPrix <= 5000) return null // Pas assez significatif

    return {
      id: 'passer-au-neuf',
      titre: 'Opter pour le neuf',
      description: 'Profitez des frais de notaire réduits et du PTZ',
      modifications: {},
      resultats: {
        nouveauBudget: budgetNeuf,
        nouveauTaux: d.tauxInteret,
        nouvellesMensualites: d.mensualiteMax,
        economieOuCout: gainPrix,
      },
      avantages: [
        `Budget achat : +${formatMontant(gainPrix)} €`,
        'Frais de notaire : 2-3% au lieu de 7-8%',
        'Éligibilité PTZ possible',
        'Pas de travaux à prévoir',
      ],
      inconvenients: [
        'Choix géographique plus limité',
        'Délai de livraison (VEFA)',
      ],
      recommande: true,
    }
  },
}

// ============================================================================
// SCÉNARIO : PTZ
// ============================================================================

const scenarioPTZ: RegleScenario = {
  id: 'ptz-eligible',
  poids: 95, // Très haute priorité si éligible
  condition: (d) => estEligiblePTZ(d),
  generer: (d) => {
    const montantPTZ = getMontantPTZ(d.situationFoyer, d.nombreEnfants)
    const nouveauCapital = d.capitalEmpruntable + montantPTZ
    const nouveauBudget = d.apport + nouveauCapital
    const nouveauPrix = budgetVersPrix(nouveauBudget, d.typeBien)

    return {
      id: 'ptz-eligible',
      titre: `Activer le PTZ (${formatMontant(montantPTZ)} €)`,
      description: 'Prêt à Taux Zéro : emprunt complémentaire sans intérêts',
      modifications: {},
      resultats: {
        nouveauBudget: nouveauPrix,
        nouveauTaux: 0,
        nouvellesMensualites: d.mensualiteMax,
        economieOuCout: nouveauPrix - d.prixAchat,
      },
      avantages: [
        `Budget achat : +${formatMontant(nouveauPrix - d.prixAchat)} €`,
        `${formatMontant(montantPTZ)} € à 0% d'intérêts`,
        'Différé de remboursement possible (5-15 ans)',
      ],
      inconvenients: [
        'Soumis à conditions de ressources',
        d.typeBien === 'ancien' ? 'Limité aux zones B2/C en ancien' : 'Uniquement en neuf ou VEFA',
      ],
      recommande: true,
    }
  },
}

// ============================================================================
// SCÉNARIO : Co-emprunteur
// ============================================================================

const coEmprunteur: RegleScenario = {
  id: 'co-emprunteur',
  poids: 65,
  condition: (d) => d.situationFoyer === 'celibataire' && d.scoreFaisabilite < 80,
  generer: (d) => {
    const revenusEstimesCo = d.revenus * 1.6
    const nouvelleMensualite = Math.round(revenusEstimesCo * 0.33 - d.charges)
    const nouveauCapital = calculerCapital(nouvelleMensualite, d.tauxInteret, d.dureeAns)
    const nouveauBudget = d.apport + nouveauCapital
    const nouveauPrix = budgetVersPrix(nouveauBudget, d.typeBien)

    return {
      id: 'co-emprunteur',
      titre: 'Ajouter un co-emprunteur',
      description: 'Doublez votre capacité en empruntant à deux',
      modifications: {},
      resultats: {
        nouveauBudget: nouveauPrix,
        nouveauTaux: d.tauxInteret,
        nouvellesMensualites: nouvelleMensualite,
        economieOuCout: nouveauPrix - d.prixAchat,
      },
      avantages: [
        `Budget potentiel : ${formatMontant(nouveauPrix)} € (estimation)`,
        'Endettement partagé, dossier renforcé',
        'Assurance répartie sur 2 têtes',
      ],
      inconvenients: [
        'Engagement solidaire sur la dette',
        'Nécessite un co-emprunteur solvable',
        'Indivision à gérer en cas de séparation',
      ],
      recommande: d.scoreFaisabilite < 60,
    }
  },
}

// ============================================================================
// SCÉNARIO : Solder un crédit en cours
// ============================================================================

const solderCredit: RegleScenario = {
  id: 'solder-credit',
  poids: 85,
  condition: (d) => d.charges >= 200,
  generer: (d) => {
    const capitalSansCharges = calculerCapital(
      d.mensualiteMax + d.charges * 0.5,
      d.tauxInteret,
      d.dureeAns
    )
    const nouveauBudget = d.apport + capitalSansCharges
    const nouveauPrix = budgetVersPrix(nouveauBudget, d.typeBien)
    const gainBudget = nouveauPrix - d.prixAchat

    if (gainBudget <= 5000) return null

    return {
      id: 'solder-credit',
      titre: 'Réduire les charges existantes',
      description: 'Soldez ou regroupez vos crédits en cours avant d\'emprunter',
      modifications: { mensualite: d.mensualiteMax + Math.round(d.charges * 0.5) },
      resultats: {
        nouveauBudget: nouveauPrix,
        nouveauTaux: d.tauxInteret,
        nouvellesMensualites: d.mensualiteMax + Math.round(d.charges * 0.5),
        economieOuCout: gainBudget,
      },
      avantages: [
        `Budget achat : +${formatMontant(gainBudget)} €`,
        'Endettement réduit, meilleur dossier',
        'Taux potentiellement plus bas',
      ],
      inconvenients: [
        'Nécessite de l\'épargne pour solder',
        'Indemnités de remboursement anticipé éventuelles',
      ],
      recommande: d.tauxEndettement > 33,
    }
  },
}

// ============================================================================
// EXPORT : tableau complet des règles scénarios
// ============================================================================

export const REGLES_SCENARIOS: RegleScenario[] = [
  scenarioPTZ,
  mensualiteSecurisee,
  solderCredit,
  apportPlus10k,
  dureePlus5,
  coEmprunteur,
  passerAuNeuf,
]
