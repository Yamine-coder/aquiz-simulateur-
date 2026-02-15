/**
 * Base de données complète des aides à l'accession en France
 * Données 2024-2025-2026
 * 
 * Sources: Service-Public.fr, Action Logement, ANIL, legifrance.gouv.fr
 */

import type { ZonePTZ } from '@/types/aides'

// ============================================
// TYPES
// ============================================

export type CategorieAide = 
  | 'pret_aide' 
  | 'avantage_fiscal' 
  | 'subvention' 
  | 'dispositif_accession'
  | 'aide_travaux'
  | 'aide_locale'

export type PublicCible = 
  | 'primo_accedant' 
  | 'tous' 
  | 'modeste' 
  | 'tres_modeste'
  | 'salarie_prive'
  | 'fonctionnaire'
  | 'jeune'

export interface AideAccession {
  id: string
  nom: string
  nomCourt: string
  categorie: CategorieAide
  description: string
  avantages: string[]
  
  // Conditions d'éligibilité
  conditions: {
    primoAccedant?: boolean
    plafondRevenus?: boolean
    zoneTendue?: boolean
    typeBien?: ('neuf' | 'ancien' | 'ancien_travaux')[]
    residencePrincipale?: boolean
    salariePriveMin10?: boolean
    ancienneteEmploi?: number // en mois
    typeContrat?: ('CDI' | 'CDD' | 'fonctionnaire')[]
    ageMax?: number
    zonesEligibles?: ZonePTZ[]
    zoneANRU?: boolean
    zoneQPV?: boolean
  }
  
  // Montants et taux
  montant?: {
    min?: number
    max?: number
    calcul?: string // Formule ou description
  }
  taux?: number // en %
  dureeMax?: number // en années
  
  // Cumul
  cumulable: string[] // IDs des aides cumulables
  
  // Infos pratiques
  organisme: string
  urlOfficielle: string
  delaiTraitement?: string
  
  // Disponibilité géographique
  disponibilite: 'nationale' | 'regionale' | 'departementale' | 'communale'
  zonesDisponibles?: string[] // Codes départements ou régions
  
  // Statut
  actif: boolean
  dateMAJ: string
}

// ============================================
// AIDES NATIONALES
// ============================================

export const AIDES_NATIONALES: AideAccession[] = [
  // ==========================================
  // PRÊTS AIDÉS
  // ==========================================
  {
    id: 'ptz',
    nom: 'Prêt à Taux Zéro (PTZ)',
    nomCourt: 'PTZ',
    categorie: 'pret_aide',
    description: 'Prêt immobilier sans intérêts ni frais de dossier, accordé sous conditions de ressources pour compléter un prêt principal.',
    avantages: [
      'Taux d\'intérêt à 0%',
      'Pas de frais de dossier',
      'Différé de remboursement possible (5 à 15 ans)',
      'Durée jusqu\'à 25 ans',
      'Peut financer jusqu\'à 50% du projet'
    ],
    conditions: {
      primoAccedant: true,
      plafondRevenus: true,
      typeBien: ['neuf', 'ancien_travaux'],
      residencePrincipale: true,
      zonesEligibles: ['Abis', 'A', 'B1'] // Depuis 2024, recentré zones tendues pour le neuf
    },
    montant: {
      calcul: '20% à 50% du coût de l\'opération selon zone et revenus',
      max: 150000 // Plafond par tranche de revenus
    },
    taux: 0,
    dureeMax: 25,
    cumulable: ['pas', 'pret_conventionné', 'action_logement', 'pel', 'cel', 'pret_employeur'],
    organisme: 'Banques conventionnées',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F10871',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'pas',
    nom: 'Prêt d\'Accession Sociale (PAS)',
    nomCourt: 'PAS',
    categorie: 'pret_aide',
    description: 'Prêt conventionné à taux plafonné, ouvrant droit à l\'APL accession.',
    avantages: [
      'Taux plafonné (inférieur au marché)',
      'Ouvre droit à l\'APL accession',
      'Frais de dossier plafonnés',
      'Garantie de l\'État (exonération taxe publicité foncière)',
      'Peut financer 100% de l\'opération'
    ],
    conditions: {
      plafondRevenus: true,
      typeBien: ['neuf', 'ancien', 'ancien_travaux'],
      residencePrincipale: true
    },
    montant: {
      calcul: 'Peut financer la totalité de l\'opération (hors frais de notaire)'
    },
    taux: 3.45, // Taux max variable selon durée
    dureeMax: 35,
    cumulable: ['ptz', 'action_logement', 'pel', 'cel', 'pret_employeur'],
    organisme: 'Banques conventionnées',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F22158',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'pret_conventionne',
    nom: 'Prêt Conventionné (PC)',
    nomCourt: 'PC',
    categorie: 'pret_aide',
    description: 'Prêt à taux plafonné, sans condition de ressources, ouvrant droit à l\'APL.',
    avantages: [
      'Sans condition de ressources',
      'Ouvre droit à l\'APL accession',
      'Frais de notaire réduits sur l\'hypothèque',
      'Peut financer 100% de l\'opération'
    ],
    conditions: {
      typeBien: ['neuf', 'ancien', 'ancien_travaux'],
      residencePrincipale: true
    },
    taux: 3.65, // Taux max
    dureeMax: 35,
    cumulable: ['ptz', 'action_logement', 'pel', 'cel'],
    organisme: 'Banques conventionnées',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F10793',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'action_logement',
    nom: 'Prêt Accession Action Logement',
    nomCourt: 'Action Logement',
    categorie: 'pret_aide',
    description: 'Prêt à 1% pour les salariés du secteur privé (entreprises 10+ salariés).',
    avantages: [
      'Taux fixe de 1%',
      'Jusqu\'à 30 000 €',
      'Durée jusqu\'à 25 ans',
      'Cumulable avec PTZ et autres aides'
    ],
    conditions: {
      salariePriveMin10: true,
      ancienneteEmploi: 6,
      plafondRevenus: true,
      typeBien: ['neuf', 'ancien'],
      residencePrincipale: true
    },
    montant: {
      max: 30000
    },
    taux: 1,
    dureeMax: 25,
    cumulable: ['ptz', 'pas', 'pret_conventionne', 'pel'],
    organisme: 'Action Logement Services',
    urlOfficielle: 'https://www.actionlogement.fr/le-pret-accession',
    delaiTraitement: '25 jours ouvrés',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'pel',
    nom: 'Prêt Épargne Logement (PEL)',
    nomCourt: 'PEL',
    categorie: 'pret_aide',
    description: 'Prêt lié à un Plan Épargne Logement, à taux connu à l\'avance.',
    avantages: [
      'Taux garanti dès l\'ouverture du PEL',
      'Prime d\'État (anciens PEL)',
      'Montant selon intérêts acquis',
      'Cumulable avec autres prêts'
    ],
    conditions: {
      typeBien: ['neuf', 'ancien', 'ancien_travaux'],
      residencePrincipale: true
    },
    montant: {
      max: 92000,
      calcul: 'Selon droits à prêt acquis (2,5 x intérêts)'
    },
    dureeMax: 15,
    cumulable: ['ptz', 'pas', 'action_logement', 'cel'],
    organisme: 'Banque du PEL',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F16142',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'cel',
    nom: 'Prêt Épargne Logement (CEL)',
    nomCourt: 'CEL',
    categorie: 'pret_aide',
    description: 'Prêt lié à un Compte Épargne Logement.',
    avantages: [
      'Taux garanti',
      'Plus souple que le PEL',
      'Prime d\'État (sous conditions)'
    ],
    conditions: {
      typeBien: ['neuf', 'ancien', 'ancien_travaux'],
      residencePrincipale: true
    },
    montant: {
      max: 23000,
      calcul: 'Selon droits à prêt acquis'
    },
    dureeMax: 15,
    cumulable: ['ptz', 'pas', 'action_logement', 'pel'],
    organisme: 'Banque du CEL',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F16139',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'eco_ptz',
    nom: 'Éco-Prêt à Taux Zéro',
    nomCourt: 'Éco-PTZ',
    categorie: 'aide_travaux',
    description: 'Prêt sans intérêts pour financer des travaux de rénovation énergétique.',
    avantages: [
      'Taux 0%',
      'Jusqu\'à 50 000 €',
      'Sans condition de ressources',
      'Cumulable avec MaPrimeRénov\''
    ],
    conditions: {
      typeBien: ['ancien'],
      residencePrincipale: true
    },
    montant: {
      min: 7000,
      max: 50000,
      calcul: 'Selon nombre d\'actions de travaux'
    },
    taux: 0,
    dureeMax: 20,
    cumulable: ['ptz', 'ma_prime_renov', 'action_logement'],
    organisme: 'Banques conventionnées',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F19905',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },

  // ==========================================
  // AVANTAGES FISCAUX
  // ==========================================
  {
    id: 'tva_reduite_anru',
    nom: 'TVA à 5,5% en zone ANRU/QPV',
    nomCourt: 'TVA 5,5%',
    categorie: 'avantage_fiscal',
    description: 'TVA réduite pour l\'achat d\'un logement neuf en zone de rénovation urbaine.',
    avantages: [
      'TVA à 5,5% au lieu de 20%',
      'Économie de ~15% sur le prix',
      'Applicable sur le neuf uniquement'
    ],
    conditions: {
      plafondRevenus: true,
      typeBien: ['neuf'],
      residencePrincipale: true,
      zoneANRU: true
    },
    montant: {
      calcul: 'Économie de 14,5% du prix HT (20% - 5,5%)'
    },
    cumulable: ['ptz', 'pas', 'action_logement'],
    organisme: 'Promoteur immobilier',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F31151',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'exoneration_taxe_fonciere',
    nom: 'Exonération de taxe foncière (2 ans)',
    nomCourt: 'Exo. Taxe Foncière',
    categorie: 'avantage_fiscal',
    description: 'Exonération temporaire de taxe foncière pour les logements neufs.',
    avantages: [
      'Exonération pendant 2 ans',
      'Automatique pour le neuf',
      'Peut être prolongée (BBC, BEPOS)'
    ],
    conditions: {
      typeBien: ['neuf']
    },
    montant: {
      calcul: 'Exonération totale pendant 2 ans'
    },
    cumulable: ['ptz', 'tva_reduite_anru'],
    organisme: 'Service des impôts',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F59',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },

  // ==========================================
  // DISPOSITIFS ACCESSION
  // ==========================================
  {
    id: 'psla',
    nom: 'Prêt Social Location-Accession (PSLA)',
    nomCourt: 'PSLA',
    categorie: 'dispositif_accession',
    description: 'Dispositif permettant d\'acheter après une phase de location.',
    avantages: [
      'Phase locative test (6 mois à 4 ans)',
      'Prix plafonné',
      'TVA réduite 5,5%',
      'Exonération taxe foncière 15 ans',
      'Garantie de rachat et relogement'
    ],
    conditions: {
      plafondRevenus: true,
      typeBien: ['neuf'],
      residencePrincipale: true
    },
    montant: {
      calcul: 'Prix plafonné selon zone géographique'
    },
    cumulable: ['ptz', 'action_logement'],
    organisme: 'Opérateurs agréés HLM',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F32274',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'brs',
    nom: 'Bail Réel Solidaire (BRS)',
    nomCourt: 'BRS',
    categorie: 'dispositif_accession',
    description: 'Achat du bâti sans le terrain (dissociation foncière), prix réduit de 20 à 40%.',
    avantages: [
      'Prix réduit de 20 à 40%',
      'TVA à 5,5%',
      'Exonération taxe foncière',
      'Bail de 18 à 99 ans renouvelable',
      'Accession sécurisée'
    ],
    conditions: {
      plafondRevenus: true,
      typeBien: ['neuf', 'ancien'],
      residencePrincipale: true
    },
    montant: {
      calcul: 'Économie de 20% à 40% sur le prix du marché'
    },
    cumulable: ['ptz', 'pas', 'action_logement'],
    organisme: 'Organismes de Foncier Solidaire (OFS)',
    urlOfficielle: 'https://www.ecologie.gouv.fr/bail-reel-solidaire',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'vente_hlm',
    nom: 'Vente HLM',
    nomCourt: 'Vente HLM',
    categorie: 'dispositif_accession',
    description: 'Achat d\'un logement social par son locataire ou un tiers.',
    avantages: [
      'Prix inférieur au marché (décote)',
      'Frais de notaire réduits',
      'Éligible au prêt Action Logement',
      'Garantie de rachat 10 ans'
    ],
    conditions: {
      typeBien: ['ancien'],
      residencePrincipale: true
    },
    montant: {
      calcul: 'Décote variable selon bailleur et ancienneté'
    },
    cumulable: ['ptz', 'action_logement', 'pas'],
    organisme: 'Bailleurs sociaux',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F2040',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },

  // ==========================================
  // AIDES TRAVAUX / RÉNOVATION
  // ==========================================
  {
    id: 'ma_prime_renov',
    nom: 'MaPrimeRénov\'',
    nomCourt: 'MaPrimeRénov\'',
    categorie: 'aide_travaux',
    description: 'Subvention pour les travaux de rénovation énergétique.',
    avantages: [
      'Subvention directe (non remboursable)',
      'Jusqu\'à 70 000 € (rénovation globale)',
      'Versement à la fin des travaux',
      'Cumulable avec Éco-PTZ'
    ],
    conditions: {
      typeBien: ['ancien'],
      residencePrincipale: true
    },
    montant: {
      max: 70000,
      calcul: 'Selon revenus et type de travaux'
    },
    cumulable: ['eco_ptz', 'cee'],
    organisme: 'ANAH (Agence nationale de l\'habitat)',
    urlOfficielle: 'https://www.maprimerenov.gouv.fr/',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'cee',
    nom: 'Certificats d\'Économies d\'Énergie (CEE)',
    nomCourt: 'Prime CEE',
    categorie: 'aide_travaux',
    description: 'Prime versée par les fournisseurs d\'énergie pour les travaux d\'économie d\'énergie.',
    avantages: [
      'Prime variable selon travaux',
      'Cumulable avec MaPrimeRénov\'',
      'Sans condition de ressources',
      'Versée par le fournisseur d\'énergie'
    ],
    conditions: {
      typeBien: ['ancien']
    },
    montant: {
      calcul: 'Selon type de travaux et zone géographique'
    },
    cumulable: ['ma_prime_renov', 'eco_ptz'],
    organisme: 'Fournisseurs d\'énergie',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F35584',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },

  // ==========================================
  // AIDES SPÉCIFIQUES
  // ==========================================
  {
    id: 'pret_fonctionnaire',
    nom: 'Prêt Fonctionnaire',
    nomCourt: 'Prêt Fonct.',
    categorie: 'pret_aide',
    description: 'Prêt à taux préférentiel pour les agents de la fonction publique.',
    avantages: [
      'Taux préférentiel',
      'Conditions avantageuses',
      'Selon ministère/administration'
    ],
    conditions: {
      typeContrat: ['fonctionnaire'],
      residencePrincipale: true
    },
    montant: {
      calcul: 'Variable selon administration'
    },
    cumulable: ['ptz', 'pas'],
    organisme: 'Mutuelles fonction publique',
    urlOfficielle: 'https://www.service-public.fr/particuliers/vosdroits/F1652',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'procivis',
    nom: 'Prêt Pass-Foncier / Procivis',
    nomCourt: 'Procivis',
    categorie: 'pret_aide',
    description: 'Avance remboursable pour compléter le financement.',
    avantages: [
      'Taux 0%',
      'Différé de remboursement',
      'Complément d\'apport'
    ],
    conditions: {
      primoAccedant: true,
      plafondRevenus: true,
      residencePrincipale: true
    },
    montant: {
      max: 10000,
      calcul: 'Selon zone et revenus'
    },
    taux: 0,
    cumulable: ['ptz', 'pas', 'action_logement'],
    organisme: 'Réseau Procivis',
    urlOfficielle: 'https://www.procivis.fr/',
    disponibilite: 'nationale',
    actif: true,
    dateMAJ: '2025-01'
  }
]

// ============================================
// AIDES RÉGIONALES / LOCALES (IDF focus)
// ============================================

export const AIDES_ILE_DE_FRANCE: AideAccession[] = [
  {
    id: 'ppl_0',
    nom: 'Prêt Paris Logement 0% (PPL 0%)',
    nomCourt: 'PPL 0%',
    categorie: 'aide_locale',
    description: 'Prêt à taux 0% de la Ville de Paris pour les primo-accédants.',
    avantages: [
      'Taux 0%',
      'Jusqu\'à 39 600 € (couple avec enfant)',
      'Sans frais de dossier',
      'Différé total possible'
    ],
    conditions: {
      primoAccedant: true,
      plafondRevenus: true,
      residencePrincipale: true,
      typeBien: ['neuf', 'ancien']
    },
    montant: {
      min: 24200, // Personne seule
      max: 39600, // Couple avec enfant
      calcul: '24 200€ (seul) à 39 600€ (couple + enfant)'
    },
    taux: 0,
    dureeMax: 15,
    cumulable: ['ptz', 'pas', 'action_logement'],
    organisme: 'Ville de Paris',
    urlOfficielle: 'https://www.paris.fr/pages/les-aides-a-l-accession-3261',
    disponibilite: 'communale',
    zonesDisponibles: ['75'],
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'cheque_premier_logement_idf',
    nom: 'Chèque Premier Logement Île-de-France',
    nomCourt: 'Chèque IDF',
    categorie: 'aide_locale',
    description: 'Aide de la Région Île-de-France pour les primo-accédants.',
    avantages: [
      'Subvention directe (non remboursable)',
      'Jusqu\'à 10 000 €',
      'Cumulable avec PTZ'
    ],
    conditions: {
      primoAccedant: true,
      plafondRevenus: true,
      residencePrincipale: true,
      ageMax: 35
    },
    montant: {
      max: 10000,
      calcul: 'Variable selon revenus et composition familiale'
    },
    cumulable: ['ptz', 'ppl_0', 'action_logement'],
    organisme: 'Région Île-de-France',
    urlOfficielle: 'https://www.iledefrance.fr/aides-et-appels-projets',
    disponibilite: 'regionale',
    zonesDisponibles: ['75', '77', '78', '91', '92', '93', '94', '95'],
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'aide_hauts_de_seine',
    nom: 'Aide à l\'accession Hauts-de-Seine',
    nomCourt: 'Aide 92',
    categorie: 'aide_locale',
    description: 'Prêt bonifié du département des Hauts-de-Seine.',
    avantages: [
      'Prêt à taux réduit',
      'Complément d\'apport',
      'Réservé aux résidents 92'
    ],
    conditions: {
      plafondRevenus: true,
      residencePrincipale: true
    },
    montant: {
      max: 20000,
      calcul: 'Selon revenus et zone'
    },
    cumulable: ['ptz', 'action_logement'],
    organisme: 'Département des Hauts-de-Seine',
    urlOfficielle: 'https://www.hauts-de-seine.fr/',
    disponibilite: 'departementale',
    zonesDisponibles: ['92'],
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'aide_seine_saint_denis',
    nom: 'Aide à l\'accession Seine-Saint-Denis',
    nomCourt: 'Aide 93',
    categorie: 'aide_locale',
    description: 'Dispositifs d\'aide du département 93.',
    avantages: [
      'Subventions possibles',
      'Zones ANRU nombreuses',
      'TVA 5,5% fréquente'
    ],
    conditions: {
      plafondRevenus: true,
      residencePrincipale: true
    },
    montant: {
      calcul: 'Variable selon commune et programme'
    },
    cumulable: ['ptz', 'tva_reduite_anru'],
    organisme: 'Département Seine-Saint-Denis',
    urlOfficielle: 'https://seinesaintdenis.fr/',
    disponibilite: 'departementale',
    zonesDisponibles: ['93'],
    actif: true,
    dateMAJ: '2025-01'
  },
  {
    id: 'aide_val_de_marne',
    nom: 'Aide à l\'accession Val-de-Marne',
    nomCourt: 'Aide 94',
    categorie: 'aide_locale',
    description: 'Aides du département du Val-de-Marne.',
    avantages: [
      'Prêts bonifiés selon communes',
      'Accompagnement personnalisé'
    ],
    conditions: {
      plafondRevenus: true,
      residencePrincipale: true
    },
    montant: {
      calcul: 'Variable selon commune'
    },
    cumulable: ['ptz', 'action_logement'],
    organisme: 'Département Val-de-Marne',
    urlOfficielle: 'https://www.valdemarne.fr/',
    disponibilite: 'departementale',
    zonesDisponibles: ['94'],
    actif: true,
    dateMAJ: '2025-01'
  }
]

// ============================================
// TOUTES LES AIDES
// ============================================

export const TOUTES_AIDES: AideAccession[] = [
  ...AIDES_NATIONALES,
  ...AIDES_ILE_DE_FRANCE
]

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Filtre les aides selon le profil utilisateur
 */
export function filtrerAidesParProfil(options: {
  codePostal?: string
  primoAccedant?: boolean
  revenus?: number
  typeBien?: 'neuf' | 'ancien' | 'ancien_travaux'
  salariePriveMin10?: boolean
  fonctionnaire?: boolean
  age?: number
}): AideAccession[] {
  const { codePostal, primoAccedant, typeBien, salariePriveMin10, fonctionnaire, age } = options
  const codeDept = codePostal?.substring(0, 2)
  
  return TOUTES_AIDES.filter(aide => {
    if (!aide.actif) return false
    
    // Filtre géographique
    if (aide.disponibilite !== 'nationale') {
      if (!codeDept || !aide.zonesDisponibles?.includes(codeDept)) {
        return false
      }
    }
    
    // Primo-accédant requis
    if (aide.conditions.primoAccedant && !primoAccedant) {
      return false
    }
    
    // Type de bien
    if (typeBien && aide.conditions.typeBien && !aide.conditions.typeBien.includes(typeBien)) {
      return false
    }
    
    // Salarié privé pour Action Logement
    if (aide.conditions.salariePriveMin10 && !salariePriveMin10) {
      return false
    }
    
    // Fonctionnaire
    if (aide.conditions.typeContrat?.includes('fonctionnaire') && !fonctionnaire) {
      // Ce n'est pas un filtre exclusif, juste une aide spécifique
      if (aide.id === 'pret_fonctionnaire') return false
    }
    
    // Âge max
    if (aide.conditions.ageMax && age && age > aide.conditions.ageMax) {
      return false
    }
    
    return true
  })
}

/**
 * Groupe les aides par catégorie
 */
export function grouperAidesParCategorie(aides: AideAccession[]): Record<CategorieAide, AideAccession[]> {
  const grouped: Record<CategorieAide, AideAccession[]> = {
    pret_aide: [],
    avantage_fiscal: [],
    subvention: [],
    dispositif_accession: [],
    aide_travaux: [],
    aide_locale: []
  }
  
  aides.forEach(aide => {
    grouped[aide.categorie].push(aide)
  })
  
  return grouped
}

/**
 * Calcule le montant total potentiel des aides
 */
export function calculerTotalAides(aides: AideAccession[]): { min: number; max: number } {
  let min = 0
  let max = 0
  
  aides.forEach(aide => {
    if (aide.montant?.min) min += aide.montant.min
    if (aide.montant?.max) max += aide.montant.max
  })
  
  return { min, max }
}

/**
 * Labels des catégories
 */
export const LABELS_CATEGORIES: Record<CategorieAide, string> = {
  pret_aide: 'Prêts aidés',
  avantage_fiscal: 'Avantages fiscaux',
  subvention: 'Subventions',
  dispositif_accession: 'Dispositifs d\'accession',
  aide_travaux: 'Aides travaux',
  aide_locale: 'Aides locales'
}
