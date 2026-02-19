/**
 * Score de faisabilité AQUIZ — Analyse multicritère bancaire
 * 
 * Reproduit l'évaluation réelle des banques françaises (HCSF 2024-2026)
 * inspiré des grilles de scoring Meilleurtaux, Pretto, CAFPI
 * 
 * 7 critères pondérés = 100 points max :
 *   1. Taux d'endettement      /30
 *   2. Reste à vivre            /20
 *   3. Apport (%)               /15
 *   4. Statut professionnel     /15
 *   5. Âge en fin de prêt       /10
 *   6. Durée du prêt            /5
 *   7. Charges existantes       /5
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ScoreFaisabiliteInput {
  /** Taux d'endettement du projet en % (ex: 32.5) */
  tauxEndettementProjet: number
  /** Niveau du reste à vivre calculé */
  niveauResteAVivre: 'ok' | 'limite' | 'risque'
  /** Reste à vivre en € */
  resteAVivre: number
  /** Reste à vivre minimum réglementaire en € */
  resteAVivreMin: number
  /** Montant de l'apport en € */
  apport: number
  /** Prix d'achat max (ou prix du bien) en € */
  prixAchat: number
  /** Statut professionnel */
  statutProfessionnel: string
  /** Âge de l'emprunteur */
  age: number
  /** Durée du prêt en années */
  dureeAns: number
  /** Charges mensuelles existantes (crédits en cours + autres) en € */
  chargesMensuelles: number
  /** Revenus mensuels totaux en € */
  revenusMensuels: number
}

export interface ScoreFaisabiliteResult {
  /** Score global 0-100 */
  score: number
  /** Détail par critère */
  details: ScoreDetail[]
  /** Label qualitatif */
  label: 'Excellent' | 'Bon' | 'Moyen' | 'Fragile' | 'Critique'
  /** Couleur associée */
  couleur: 'green' | 'amber' | 'orange' | 'red'
}

export interface ScoreDetail {
  critere: string
  score: number
  max: number
  commentaire: string
}

// ============================================================================
// CALCUL DU SCORE
// ============================================================================

/**
 * Calcule le score de faisabilité multicritère (0-100)
 * 
 * Méthode : chaque critère est noté indépendamment puis additionné.
 * La progressivité évite les effets de seuil brutaux.
 */
export function calculerScoreFaisabilite(input: ScoreFaisabiliteInput): ScoreFaisabiliteResult {
  const details: ScoreDetail[] = []

  // ── 1. TAUX D'ENDETTEMENT (max 30 pts) ──
  // Norme HCSF : 35% max. Les banques préfèrent < 30%.
  const scoreEndettement = calculerScoreEndettement(input.tauxEndettementProjet)
  details.push({
    critere: 'Taux d\'endettement',
    score: scoreEndettement,
    max: 30,
    commentaire: getCommentaireEndettement(input.tauxEndettementProjet),
  })

  // ── 2. RESTE À VIVRE (max 20 pts) ──
  // Le RAV est le 2e critère le plus important après l'endettement.
  const scoreRAV = calculerScoreResteAVivre(input.resteAVivre, input.resteAVivreMin)
  details.push({
    critere: 'Reste à vivre',
    score: scoreRAV,
    max: 20,
    commentaire: getCommentaireRAV(input.resteAVivre, input.resteAVivreMin),
  })

  // ── 3. APPORT (max 15 pts) ──
  // 10% = frais de notaire couverts. 20%+ = dossier solide.
  const pourcentageApport = input.prixAchat > 0 ? (input.apport / input.prixAchat) * 100 : 0
  const scoreApport = calculerScoreApport(pourcentageApport)
  details.push({
    critere: 'Apport personnel',
    score: scoreApport,
    max: 15,
    commentaire: getCommentaireApport(pourcentageApport),
  })

  // ── 4. STATUT PROFESSIONNEL (max 15 pts) ──
  // CDI/Fonctionnaire = gold. CDD/Intérim = très difficile.
  const scoreStatut = calculerScoreStatut(input.statutProfessionnel)
  details.push({
    critere: 'Statut professionnel',
    score: scoreStatut,
    max: 15,
    commentaire: getCommentaireStatut(input.statutProfessionnel),
  })

  // ── 5. ÂGE FIN DE PRÊT (max 10 pts) ──
  // Assurance emprunteur difficile/impossible au-delà de 75 ans.
  const ageFinPret = input.age + input.dureeAns
  const scoreAge = calculerScoreAge(ageFinPret, input.age)
  details.push({
    critere: 'Âge en fin de prêt',
    score: scoreAge,
    max: 10,
    commentaire: getCommentaireAge(ageFinPret),
  })

  // ── 6. DURÉE DU PRÊT (max 5 pts) ──
  // Plus la durée est courte, moins le risque bancaire.
  const scoreDuree = calculerScoreDuree(input.dureeAns)
  details.push({
    critere: 'Durée du prêt',
    score: scoreDuree,
    max: 5,
    commentaire: getCommentaireDuree(input.dureeAns),
  })

  // ── 7. CHARGES EXISTANTES (max 5 pts) ──
  // Pas de crédits en cours = banque rassurée.
  const ratioCharges = input.revenusMensuels > 0
    ? (input.chargesMensuelles / input.revenusMensuels) * 100
    : 0
  const scoreCharges = calculerScoreCharges(ratioCharges)
  details.push({
    critere: 'Charges existantes',
    score: scoreCharges,
    max: 5,
    commentaire: getCommentaireCharges(ratioCharges),
  })

  // ── TOTAL ──
  const score = Math.max(0, Math.min(100, details.reduce((sum, d) => sum + d.score, 0)))

  return {
    score,
    details,
    label: getLabel(score),
    couleur: getCouleur(score),
  }
}

// ============================================================================
// SOUS-SCORES PAR CRITÈRE
// ============================================================================

/** Endettement — /30 (progressif) */
function calculerScoreEndettement(taux: number): number {
  if (taux <= 25) return 30           // Excellent : grosse marge
  if (taux <= 28) return 27           // Très confortable
  if (taux <= 30) return 24           // Confortable
  if (taux <= 33) return 18           // Acceptable (norme courante)
  if (taux <= 35) return 10           // Limite HCSF
  if (taux <= 37) return 4            // Hors norme (dérogation possible)
  return 0                             // Refus quasi certain
}

/** Reste à vivre — /20 (ratio vs minimum réglementaire) */
function calculerScoreResteAVivre(rav: number, ravMin: number): number {
  if (ravMin <= 0) return 10 // Pas de données suffisantes
  const ratio = rav / ravMin
  if (ratio >= 2.0) return 20          // RAV = 2× le minimum : très confortable
  if (ratio >= 1.5) return 16          // Bonne marge
  if (ratio >= 1.2) return 12          // Marge correcte
  if (ratio >= 1.0) return 7           // Juste au minimum
  if (ratio >= 0.8) return 3           // En dessous du minimum
  return 0                              // RAV critique
}

/** Apport — /15 (progressif) */
function calculerScoreApport(pourcentage: number): number {
  if (pourcentage >= 30) return 15     // Apport exceptionnel
  if (pourcentage >= 20) return 13     // Solide
  if (pourcentage >= 15) return 11     // Bon
  if (pourcentage >= 10) return 8      // Couvre les frais de notaire
  if (pourcentage >= 5) return 5       // Minimum acceptable
  if (pourcentage > 0) return 2        // Apport symbolique
  return 0                              // Pas d'apport = risque élevé
}

/** Statut professionnel — /15 */
function calculerScoreStatut(statut: string): number {
  switch (statut.toLowerCase()) {
    case 'fonctionnaire':
      return 15                         // Emploi garanti à vie
    case 'cdi':
      return 14                         // Standard bancaire
    case 'profession_liberale':
    case 'professionliberale':
      return 10                         // OK si 3+ ans d'ancienneté
    case 'independant':
    case 'auto_entrepreneur':
    case 'autoentrepreneur':
      return 8                          // Revenus irréguliers
    case 'cdd':
      return 5                          // Accepté sous conditions
    case 'interim':
    case 'intérimaire':
      return 3                          // Très difficile
    case 'retraite':
    case 'retraité':
      return 10                         // Revenus stables mais assurance chère
    case 'etudiant':
    case 'étudiant':
      return 1                          // Quasi impossible seul
    default:
      return 7                          // Autre : évaluation au cas par cas
  }
}

/** Âge en fin de prêt — /10 */
function calculerScoreAge(ageFinPret: number, ageActuel: number): number {
  // Pénalité si trop jeune (< 22 ans = peu d'historique bancaire)
  const penaliteJeune = ageActuel < 22 ? -1 : 0

  if (ageFinPret <= 60) return 10 + penaliteJeune    // Optimal
  if (ageFinPret <= 65) return 9 + penaliteJeune      // Très bien
  if (ageFinPret <= 70) return 7 + penaliteJeune      // Assurance standard
  if (ageFinPret <= 75) return 4                       // Assurance majorée
  if (ageFinPret <= 80) return 2                       // Très difficile
  return 0                                              // Quasi impossible
}

/** Durée — /5 */
function calculerScoreDuree(dureeAns: number): number {
  if (dureeAns <= 15) return 5          // Courte = faible risque
  if (dureeAns <= 20) return 4          // Standard
  if (dureeAns <= 22) return 3          // Acceptable
  if (dureeAns <= 25) return 2          // Limite HCSF
  return 0                              // Hors norme
}

/** Charges existantes — /5 (ratio charges/revenus hors projet) */
function calculerScoreCharges(ratioCharges: number): number {
  if (ratioCharges <= 0) return 5       // Aucun crédit en cours
  if (ratioCharges <= 5) return 4       // Charges négligeables
  if (ratioCharges <= 10) return 3      // Charges légères
  if (ratioCharges <= 15) return 2      // Charges modérées
  if (ratioCharges <= 20) return 1      // Charges lourdes
  return 0                              // Déjà très endetté
}

// ============================================================================
// COMMENTAIRES PAR CRITÈRE
// ============================================================================

function getCommentaireEndettement(taux: number): string {
  if (taux <= 25) return 'Excellent — large marge sous la norme HCSF'
  if (taux <= 30) return 'Confortable — bien sous les 35%'
  if (taux <= 33) return 'Acceptable — conforme norme bancaire courante'
  if (taux <= 35) return 'Limite HCSF — dossier accepté sous conditions'
  return 'Hors norme HCSF — risque de refus élevé'
}

function getCommentaireRAV(rav: number, ravMin: number): string {
  const ratio = ravMin > 0 ? rav / ravMin : 1
  if (ratio >= 2.0) return 'Reste à vivre très confortable'
  if (ratio >= 1.2) return 'Reste à vivre suffisant'
  if (ratio >= 1.0) return 'Reste à vivre juste au minimum'
  return 'Reste à vivre insuffisant'
}

function getCommentaireApport(pourcentage: number): string {
  if (pourcentage >= 20) return `Apport solide (${Math.round(pourcentage)}%)`
  if (pourcentage >= 10) return `Apport correct couvrant les frais (${Math.round(pourcentage)}%)`
  if (pourcentage > 0) return `Apport faible (${Math.round(pourcentage)}%) — frais non couverts`
  return 'Aucun apport — financement à 110%'
}

function getCommentaireStatut(statut: string): string {
  switch (statut.toLowerCase()) {
    case 'fonctionnaire': return 'Fonctionnaire — profil très apprécié des banques'
    case 'cdi': return 'CDI — statut standard pour l\'emprunt'
    case 'profession_liberale':
    case 'professionliberale': return 'Profession libérale — accepté avec 3+ ans d\'ancienneté'
    case 'independant':
    case 'auto_entrepreneur':
    case 'autoentrepreneur': return 'Indépendant — revenus variables, bilans exigés'
    case 'cdd': return 'CDD — conditions d\'acceptation restrictives'
    case 'interim':
    case 'intérimaire': return 'Intérimaire — très peu de banques acceptent'
    case 'retraite':
    case 'retraité': return 'Retraité — revenus stables mais assurance majorée'
    default: return 'Statut à évaluer au cas par cas'
  }
}

function getCommentaireAge(ageFinPret: number): string {
  if (ageFinPret <= 65) return `Fin de prêt à ${ageFinPret} ans — optimal`
  if (ageFinPret <= 70) return `Fin de prêt à ${ageFinPret} ans — assurance standard`
  if (ageFinPret <= 75) return `Fin de prêt à ${ageFinPret} ans — surprime assurance`
  return `Fin de prêt à ${ageFinPret} ans — assurance difficile à obtenir`
}

function getCommentaireDuree(dureeAns: number): string {
  if (dureeAns <= 15) return `${dureeAns} ans — durée courte, risque faible`
  if (dureeAns <= 20) return `${dureeAns} ans — durée standard`
  if (dureeAns <= 25) return `${dureeAns} ans — durée longue (limite HCSF)`
  return `${dureeAns} ans — hors norme HCSF`
}

function getCommentaireCharges(ratio: number): string {
  if (ratio <= 0) return 'Aucun crédit en cours — atout majeur'
  if (ratio <= 10) return 'Charges légères — impact faible'
  if (ratio <= 20) return 'Charges significatives à intégrer'
  return 'Endettement préexistant lourd'
}

// ============================================================================
// HELPERS
// ============================================================================

function getLabel(score: number): ScoreFaisabiliteResult['label'] {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Bon'
  if (score >= 50) return 'Moyen'
  if (score >= 35) return 'Fragile'
  return 'Critique'
}

function getCouleur(score: number): ScoreFaisabiliteResult['couleur'] {
  if (score >= 80) return 'green'
  if (score >= 65) return 'amber'
  if (score >= 50) return 'orange'
  return 'red'
}
