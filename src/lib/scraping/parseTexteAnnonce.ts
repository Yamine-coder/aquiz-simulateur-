/**
 * Parseur côté client : extrait les données d'une annonce
 * depuis le texte copié-collé par l'utilisateur.
 * 
 * L'utilisateur va sur la page de l'annonce, fait Ctrl+A puis Ctrl+C,
 * et colle ici. On parse le texte brut pour extraire prix, surface, etc.
 * 
 * Fonctionne sans requête serveur → pas de blocage anti-bot.
 */

import type { ClasseDPE, TypeBienAnnonce } from '@/types/annonces'

export interface DonneesExtraites {
  prix?: number
  surface?: number
  pieces?: number
  chambres?: number
  type?: TypeBienAnnonce
  ville?: string
  codePostal?: string
  dpe?: ClasseDPE
  ges?: ClasseDPE
  etage?: number
  etagesTotal?: number
  chargesMensuelles?: number
  taxeFonciere?: number
  titre?: string
  description?: string
  ascenseur?: boolean
  balconTerrasse?: boolean
  parking?: boolean
  cave?: boolean
  anneeConstruction?: number
  nbSallesBains?: number
  orientation?: string
  imageUrl?: string
  images?: string[]
  /** Latitude GPS (fournie par certaines plateformes) */
  latitude?: number
  /** Longitude GPS (fournie par certaines plateformes) */
  longitude?: number
  /** URL détectée dans le texte collé (source de l'annonce) */
  url?: string
}

// ============================================
// HELPERS
// ============================================

function nettoyerTexte(texte: string): string {
  return texte
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    // Normaliser tous les espaces Unicode (insécables, fines, etc.) en espace standard
    // Couvre: \u00A0 (NBSP), \u202F (NNBSP), \u2007 (figure space), \u2009 (thin), etc.
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u2002\u2003\u2004\u2005\u2006\u2008]/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
}

/**
 * Isole le contenu principal d'une page d'annonce en supprimant les sections
 * "annonces similaires", estimations de marché, navigation, et footer.
 *
 * Quand un utilisateur fait Ctrl+A sur une page (ex. LeBonCoin), la sélection
 * inclut header, sidebar, annonces similaires, footer, etc.
 * Ces sections contiennent des prix, DPE et caractéristiques d'AUTRES biens
 * qui polluent le parsing → on les supprime avant d'extraire les données.
 */
function isolerContenuPrincipal(texte: string): string {
  let cleaned = texte

  // ══ STRIP SeLoger mega-menu ══
  // Le markdown Firecrawl de SeLoger commence par un énorme menu de navigation
  // (~260 lignes) contenant "Prix de l'immobilier", "Acheter", "Louer", etc.
  // qui déclencherait les coupures trop tôt. On le supprime avant d'appliquer les coupures.
  // Pattern : le menu se termine juste avant le prix de l'annonce (image agence + "XXX €")
  const selogerNavEnd = cleaned.match(
    /\[Déposer une annonce\][^\n]*\n+(?=!\[)/i
  )
  if (selogerNavEnd?.index !== undefined && selogerNavEnd.index < 8000) {
    cleaned = cleaned.substring(selogerNavEnd.index + selogerNavEnd[0].length)
  }

  // ══ COUPER TOUT CE QUI SUIT ces marqueurs ══
  // Les sections "annonces similaires", prix de marché, footer, etc.
  // contiennent des prix/DPE d'AUTRES biens qui polluent le parsing.
  const coupures: RegExp[] = [
    // LeBonCoin / portails
    /\bannonces?\s+similaires?\b/i,
    /\bces\s+annonces?\s+peuvent/i,
    /\bd[\u2019']?autres\s+(?:biens|annonces?)\b/i,
    /\bbiens?\s+similaires?\b/i,
    /\bvous\s+(?:aimerez|pourriez)\s+(?:aussi|[ée]galement)\b/i,
    /\bannonces?\s+proches?\b/i,
    /\bnos\s+(?:suggestions|recommandations)\b/i,
    /\bvoir\s+(?:aussi|d[\u2019']?autres|les\s+annonces)\b/i,
    /\brecherches?\s+similaires?\b/i,
    // Sections estimation / prix de marché (contiennent d'autres prix)
    /\bestim(?:er|ez|ation)\s+(?:votre|ce|du|le)\s+(?:prix|bien)\b/i,
    /\bprix\s+(?:au\s+)?m[²2]\s+(?:dans|du|de\s+(?:ce|la|l[\u2019']))\b/i,
    /\bhistorique\s+des?\s+prix\b/i,
    // SeLoger-safe: seulement "Prix de l'immobilier" précédé de "##" (section de la page)
    // Le même texte dans le nav a été supprimé par le strip ci-dessus.
    /^##\s+prix\s+(?:de\s+)?l[\u2019']?immobilier\b/im,
    // Fallback : "Prix de l'immobilier" non en début de ligne mais après le contenu principal
    /\bprix\s+dans\s+la\s+r[ée]gion\b/i,
    /\b[ée]volution\s+des?\s+prix\b/i,
    // SeLoger : section financement / simulation contient des prix parasites
    /\b##\s+D[ée]tails\s+du\s+prix\b/i,
    // SeLoger : formulaire de contact en fin de page
    /\benvie\s+de\s+visiter\b/i,
    /\bune\s+question\s+sur\s+ce\s+bien\b/i,
    // Footer
    /\bmentions?\s+l[ée]gales?\b/i,
    /\bconditions?\s+g[ée]n[ée]rales?\s+d[\u2019']?utilisation\b/i,
    /\bpolitique\s+de\s+confidentialit[ée]\b/i,
    /\bplan\s+du\s+site\b/i,
    /\b[àa]\s+propos\s+de\s+(?:leboncoin|seloger|pap|bien[\u2019']?ici)\b/i,
    // LeBonCoin spécifique
    /\bsignaler\s+l[\u2019']?annonce\b/i,
    /\bles?\s+annonces?\s+de\s+ce\s+pro\b/i,
    // NOTE: NE PAS mettre "Sécurisez votre achat" ni "Contacter le vendeur" ici !
    // Ils apparaissent AVANT les caractéristiques et équipements sur LeBonCoin.
    // NOTE: "Contacter l'agence" est aussi AVANT les caractéristiques sur SeLoger,
    // donc on ne le met PAS ici non plus.

    // ── Sections agent / conseiller / agence ──
    // Ces sections contiennent le nom + adresse postale de l'agent/agence
    // qui peut être dans une autre ville que le bien → pollution de la localisation.
    // Ex: LaForêt "Votre conseiller Dominique Frélaud 33260" au lieu de Colombes
    /\bvotre\s+conseill[eè]re?\b/i,
    /\bvotre\s+(?:agent|interlocuteur|interlocutrice|consultant)\b/i,
    // "Contacter" n'est plus un cutoff car sur SeLoger il apparaît AVANT
    // les caractéristiques, le DPE et les équipements.
    /\bl[\u2019']?agence\s+(?:lafor[eêèé]t|orpi|century\s*21|guy\s*hoquet|iad|capifrance|safti|foncia|nexity|stéphane\s+plaza|era\s+immobilier|square\s+habitat)\b/i,
    /\bagence\s+(?:immobili[eè]re|partenaire)\b/i,
    /\bnos\s+agents?\b/i,
    /\bprésent[ée]e?\s+par\b/i,
    /\bannonce\s+publi[ée]e\s+par\b/i,
    /\bref\s*\.?\s*(?:agence|mandat)\b/i,
    // Sections contact / RDV
    /\bdemande[rz]?\s+(?:un\s+)?rendez[\s-]?vous\b/i,
    /\bprendre\s+(?:un\s+)?rendez[\s-]?vous\b/i,
    /\b[eé]crire?\s+(?:à\s+)?l[\u2019']?(?:agence|agent|conseill)/i,
    /\bt[ée]l[ée]phone\s*:\s*(?:\+33|0[1-9])/i,
    // Sections honoraires/mandat (contiennent souvent l'adresse de l'agence)
    // Doit être en début de ligne pour éviter de couper sur "Honoraires charge vendeur"
    // qui apparaît inline dans les descriptions SeLoger.
    /(?:^|\n)\s*#{0,3}\s*honoraires?\s+(?:d[\u2019']?agence|ttc|ht)\b/im,
    /\bbarème\s+(?:d[\u2019']?)?honoraires?\b/i,
  ]

  // Trouver le premier marqueur de coupure (le plus tôt dans le texte, mais après 200 chars)
  let cutIndex = cleaned.length
  for (const pattern of coupures) {
    const match = cleaned.match(pattern)
    // Le marqueur doit être assez loin du début (> 200 chars) pour ne pas couper
    // une description qui mentionne ces mots naturellement
    if (match?.index !== undefined && match.index > 200 && match.index < cutIndex) {
      cutIndex = match.index
    }
  }

  if (cutIndex < cleaned.length) {
    cleaned = cleaned.substring(0, cutIndex)
  }

  return cleaned.trim()
}

/**
 * Nettoie les échelles visuelles DPE / GES du texte.
 * LeBonCoin et d'autres portails affichent la grille A B C D E F G.
 * Le parser attrape le premier "A" de la grille au lieu de la vraie classe.
 * On supprime ces séquences pour ne garder que la valeur réelle.
 *
 * IMPORTANT : les patterns kWh/kg avec "m²/an" (valeurs réelles) sont PRÉSERVÉS.
 * Seules les échelles (avec ≤/>/ à) sont supprimées.
 */
function nettoyerEchellesDPE(texte: string): string {
  return texte
    // "A B C D E F G" sur une MÊME ligne ([ \t]+ au lieu de \s+ pour ne pas croiser les lignes)
    .replace(/\b[A-G](?:[ \t]+[A-G]){4,6}\b/g, '')
    // Chaque lettre sur sa propre ligne (5-7 lettres verticales)
    .replace(/(?:^|\n)\s*[A-G]\s*\n\s*[A-G]\s*\n\s*[A-G]\s*\n\s*[A-G]\s*\n\s*[A-G](?:\s*\n\s*[A-G]){0,2}/gm, '')
    // Échelles inline avec plages de valeurs (LaForêt, Orpi, Century21, etc.) :
    // "A ≤ 50 B 51 à 90 C 91 à 150 D 151 à 230 E 231 à 330 F 331 à 450 G > 450"
    .replace(/\b[A-G]\s*(?:≤|<=|⩽|<)\s*\d+\s+[A-G]\s+\d+\s+[àa]\s+\d+(?:\s+[A-G]\s+\d+\s+[àa]\s+\d+){2,}\s+[A-G]\s*(?:>|>=|≥)\s*\d+/gi, '')
    // Variante : chaque palier kWh/kg sur sa propre ligne "A ≤ 50 kWh\nB 51 à 90 kWh\n..."
    // EXCLUT les lignes contenant "m²" (ce sont les valeurs réelles, ex: "D 198 kWh/m²/an")
    .replace(/(?:^|\n)\s*[A-G]\s*(?:≤|<=|⩽|<|>|>=|≥)?\s*\d+\s*(?:à\s*\d+)?\s*(?:kWh|kg)(?![^\n]*m[²2])[^\n]*(?:\n\s*[A-G]\s*(?:≤|<=|⩽|<|>|>=|≥)?\s*\d+\s*(?:à\s*\d+)?\s*(?:kWh|kg)(?![^\n]*m[²2])[^\n]*){3,}/gmi, '')
    // Variante : paliers SANS unité sur des lignes séparées "A ≤ 70\nB 71 à 110\nC 111 à 180\n..."
    // (SeLoger, Bienici) — 5+ lignes consécutives avec lettre + comparateur/plage
    .replace(/(?:^|\n)\s*[A-G]\s*(?:≤|<=|⩽|<|>|>=|≥)\s*\d+[^\n]*(?:\n\s*[A-G]\s+\d+\s+[àa]\s+\d+[^\n]*){3,}(?:\n\s*[A-G]\s*(?:>|>=|≥)\s*\d+[^\n]*)?/gmi, '')
    // Bienici : "A B C D E F G" suivi de lignes "≤50 51-90 91-150 ..." (échelle horizontale)
    .replace(/(?:≤|<=|⩽)\d+(?:\s+\d+\s*[-–]\s*\d+){3,}(?:\s+(?:>|>=|≥)\d+)?/g, '')
    // Variante inline sur une seule ligne : "A ≤ 50 kWh B 51 à 90 kWh ... G > 450 kWh"
    .replace(/\b[A-G]\s*(?:≤|<=|⩽|<)\s*\d+\s*(?:kWh|kg)[^\n]*?[A-G]\s*(?:>|>=|≥)\s*\d+\s*(?:kWh|kg)[^\n]*/gi, '')
    // LeBonCoin : "Logement économe" ... "Logement énergivore" ou "Faible émission" ... "Forte émission"
    .replace(/logement\s+[ée]conome/gi, '')
    .replace(/logement\s+[ée]nergivore/gi, '')
    .replace(/faible\s+[ée]mission/gi, '')
    .replace(/forte\s+[ée]mission/gi, '')
    .replace(/passoire\s+[ée]nerg[ée]tique/gi, '')
    .replace(/peu\s+polluant/gi, '')
    .replace(/tr[èe]s\s+polluant/gi, '')
    // Nettoyer les labels de notation graphique (LaForêt, SeLoger, etc.)
    .replace(/consommation[s]?\s*(?:conventionnelle[s]?)?\s*(?:en)?\s*énergie\s*primaire/gi, '')
    .replace(/indice\s*d['']?émission[s]?\s*de\s*gaz\s*à\s*effet\s*de\s*serre/gi, '')
}

/**
 * Extrait l'URL du bien depuis le texte collé.
 * Utile pour détecter la source (LeBonCoin, SeLoger, etc.)
 * et récupérer l'image via l'API og-image.
 */
function extraireUrl(texte: string): string | undefined {
  const patterns = [
    /https?:\/\/(?:www\.)?leboncoin\.fr\/\S+/i,
    /https?:\/\/(?:www\.)?seloger\.com\/\S+/i,
    /https?:\/\/(?:www\.)?selogerneuf\.com\/\S+/i,
    /https?:\/\/(?:www\.)?pap\.fr\/\S+/i,
    /https?:\/\/(?:www\.)?bienici\.com\/\S+/i,
    /https?:\/\/(?:www\.)?logic-immo\.com\/\S+/i,
    /https?:\/\/(?:www\.)?bien-ici\.com\/\S+/i,
    /https?:\/\/(?:www\.)?laforet\.com\/\S+/i,
    /https?:\/\/(?:www\.)?orpi\.com\/\S+/i,
    /https?:\/\/(?:www\.)?century21\.fr\/\S+/i,
    /https?:\/\/(?:www\.)?(?:guy-hoquet|guyhoquet)\.com\/\S+/i,
    /https?:\/\/(?:www\.)?iadfrance\.fr\/\S+/i,
    /https?:\/\/(?:www\.)?capifrance\.fr\/\S+/i,
    /https?:\/\/(?:www\.)?safti\.fr\/\S+/i,
    /https?:\/\/(?:www\.)?foncia\.com\/\S+/i,
    /https?:\/\/(?:www\.)?nexity\.fr\/\S+/i,
    /https?:\/\/(?:www\.)?paruvendu\.fr\/\S+/i,
  ]
  for (const p of patterns) {
    const m = texte.match(p)
    if (m) return m[0].replace(/[)\]}>"']+$/, '') // nettoyer ponctuation trailing
  }
  return undefined
}

function extraireNombre(s: string): number | null {
  const clean = s.replace(/[^\d,.\s]/g, '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

// ============================================
// EXTRACTEURS INDIVIDUELS
// ============================================

function extrairePrix(texte: string): number | undefined {
  // Patterns ordonnés du plus spécifique au plus générique
  // NOTE: [ \t\u00A0] (pas \s) dans les groupes de chiffres pour éviter
  // de croiser les lignes (ex: "13100\n695 000 €" → 100695000 faux positif)
  const patterns = [
    // "Prix : 450 000 €" ou "Prix de vente : 450 000€"
    /prix\s*(?:de\s*vente)?\s*:?\s*(\d{1,3}(?:[ \t\u00A0]\d{3})*)\s*€/i,
    // "450 000 €" (avec espaces)
    /(\d{1,3}(?:[ \t\u00A0]\d{3})+)\s*€/,
    // "450000€" (sans espaces, 6+ chiffres)
    /(\d{6,8})\s*€/,
    // "450 000 euros"
    /(\d{1,3}(?:[ \t\u00A0]\d{3})+)\s*euros?/i,
  ]

  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      const prix = extraireNombre(m[1])
      if (prix && prix >= 10000 && prix <= 50000000) return prix
    }
  }
  return undefined
}

function extraireSurface(texte: string): number | undefined {
  const patterns = [
    // "65,5 m²" ou "65 m2"
    /(\d+(?:[.,]\d+)?)\s*m[²2]/i,
    // "Surface : 65 m²"
    /surface\s*:?\s*(\d+(?:[.,]\d+)?)\s*m/i,
    // "Surface habitable : 65"
    /surface\s*habitable\s*:?\s*(\d+(?:[.,]\d+)?)/i,
  ]

  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      const s = parseFloat(m[1].replace(',', '.'))
      if (s >= 9 && s <= 1000) return Math.round(s * 100) / 100
    }
  }
  return undefined
}

function extrairePieces(texte: string): number | undefined {
  const patterns = [
    /(\d+)\s*pièces?/i,
    /(\d+)\s*pieces?/i,
    /\b[TF](\d)\b/i,
    /(\d+)\s*p\b/i,
  ]

  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      const n = parseInt(m[1])
      if (n >= 1 && n <= 20) return n
    }
  }
  return undefined
}

function extraireChambres(texte: string): number | undefined {
  const patterns = [
    // [ \t]* au lieu de \s* pour ne pas croiser les lignes
    // ("Pièces : 3\nChambres" → empêche de capturer 3)
    /(\d+)[ \t]*chambres?/i,
    /chambres?\s*:?\s*(\d+)/i,
  ]

  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      const n = parseInt(m[1])
      if (n >= 0 && n <= 15) return n
    }
  }
  return undefined
}

function extraireType(texte: string): TypeBienAnnonce {
  // 1. Patterns contextuels (label + valeur : le plus fiable)
  const contextPatterns = [
    // "Type de bien\n\nAppartement" (LeBonCoin markdown multiline)
    /type\s*(?:de\s*)?bien\s*[:\n]\s*\[?\s*(appartement|maison|studio|loft|duplex|villa|pavillon)/i,
    // "Type : Appartement"
    /type\s*:\s*(appartement|maison|studio|loft|duplex|villa|pavillon)\b/i,
  ]
  for (const p of contextPatterns) {
    const m = texte.match(p)
    if (m) {
      const val = m[1].toLowerCase()
      if (/maison|villa|pavillon/.test(val)) return 'maison'
      return 'appartement'
    }
  }

  // 2. Détection générique — exclure le bruit de navigation ("Maison & Jardin", etc.)
  const lower = texte.toLowerCase()
    .replace(/maison\s*&\s*jardin/g, '')
    .replace(/maison\s*et\s*jardin/g, '')
  // Maison a priorité dans la détection (plus spécifique)
  if (/\bmaison\b|\bvilla\b|\bpavillon\b|\bcorps\s+de\s+ferme\b|\blongère|\bchalet\b|\bpropriété/.test(lower)) return 'maison'
  // Si on mentionne explicitement un type d'appartement
  if (/\bappartement\b|\bstudio\b|\bloft\b|\bduplex\b|\btriplex\b|\batelier\b/.test(lower)) return 'appartement'
  // Défaut : appartement (type le plus courant)
  return 'appartement'
}

function extraireLocalisation(texte: string): { ville?: string; codePostal?: string } {
  const result: { ville?: string; codePostal?: string } = {}

  /** Valide un code postal français (dept 01-98, inclut DOM-TOM 97x) */
  const isValidCP = (cp: string): boolean => {
    if (!/^\d{5}$/.test(cp)) return false
    const dept = parseInt(cp.substring(0, 2))
    return dept >= 1 && dept <= 98
  }

  /** Mots français courants qu'il ne faut PAS prendre pour des villes */
  const MOTS_EXCLUS_RE = /^(appartement|maison|villa|studio|duplex|loft|pavillon|immeuble|résidence|programme|vente|achat|annonce|prix|surface|pièces?|chambres?|étage|orientation|construction|description|parking|garage|terrasse|balcon|cave|code|bien|local|situé|centre|quartier|ancien|neuf|lumineux|calme|proche|grand|petit|beau|belle|ville|secteur|rue|avenue|boulevard|sud|nord|est|ouest|au|aux|du|des|un|une|dans|vers|pour|avec|chez|entre)$/i

  /**
   * Nettoie une ville capturée en retirant les mots-clés exclus en début de chaîne.
   * Ex: "Appartement Paris" → "Paris", "Quartier calme" → "" (tout exclu), 
   *     "Boulogne-Billancourt" → "Boulogne-Billancourt" (pas exclu).
   */
  const nettoyerVille = (raw: string): string | undefined => {
    // Séparer par espaces (les mots liés par tiret restent groupés)
    const mots = raw.split(/\s+/)
    // Retirer les mots exclus en tête
    let debut = 0
    while (debut < mots.length && MOTS_EXCLUS_RE.test(mots[debut].replace(/-/g, ' ').split(/\s+/)[0])) {
      // Vérifier si le mot-tiret entier n'est PAS un nom de ville composé
      // Ex: "Centre-ville" → "Centre" est exclu, "ville" est exclu → tout exclu
      // Ex: "Boulogne-Billancourt" → "Boulogne" n'est PAS exclu → on garde tout
      const sousMots = mots[debut].split('-')
      if (sousMots.every(sm => MOTS_EXCLUS_RE.test(sm))) {
        debut++
      } else {
        break
      }
    }
    const cleaned = mots.slice(debut).join(' ').trim()
    if (!cleaned || cleaned.length < 2) return undefined
    // Vérifier que le résultat n'est pas entièrement composé de mots exclus
    const resteMots = cleaned.split(/[\s-]+/)
    if (resteMots.every(m => MOTS_EXCLUS_RE.test(m))) return undefined
    return cleaned
  }

  // ──── 1. Villes connues — LE PLUS FIABLE pour éviter les faux positifs ────
  // Chercher d'abord dans la liste de villes connues AVANT les patterns génériques.
  // Les patterns génériques type "Mot 75001" peuvent capturer des noms d'agents.
  const VILLES = [
    // Top 60 agglomérations
    'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes',
    'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille', 'Rennes',
    'Reims', 'Saint-Étienne', 'Le Havre', 'Toulon', 'Grenoble',
    'Dijon', 'Angers', 'Nîmes', 'Villeurbanne', 'Clermont-Ferrand',
    'Le Mans', 'Aix-en-Provence', 'Brest', 'Tours', 'Amiens',
    'Limoges', 'Annecy', 'Perpignan', 'Boulogne-Billancourt',
    'Metz', 'Besançon', 'Orléans', 'Rouen', 'Mulhouse', 'Caen',
    'Nancy', 'Saint-Denis', 'Argenteuil', 'Montreuil', 'Versailles',
    'Courbevoie', 'Vitry-sur-Seine', 'Colombes', 'Neuilly-sur-Seine',
    'Issy-les-Moulineaux', 'Levallois-Perret', 'Antony', 'Clichy',
    'Ivry-sur-Seine', 'Pantin', 'Bobigny', 'Clamart', 'Suresnes',
    'Massy', 'Meaux', 'Créteil', 'Nanterre', 'Rueil-Malmaison',
    'Champigny-sur-Marne', 'Saint-Maur-des-Fossés', 'Drancy',
    'Aulnay-sous-Bois', 'Aubervilliers', 'Noisy-le-Grand',
    'Fontenay-sous-Bois', 'Vincennes', 'Saint-Germain-en-Laye',
    // Villes moyennes importantes
    'La Rochelle', 'Colmar', 'Pau', 'Bayonne', 'Avignon',
    'Cannes', 'Antibes', 'Valence', 'Chambéry', 'Troyes',
    'Vannes', 'Lorient', 'Quimper', 'Saint-Brieuc', 'Saint-Nazaire',
    'La Roche-sur-Yon', 'Chartres', 'Bourges', 'Châteauroux',
    'Poitiers', 'Angoulême', 'Niort', 'Agen', 'Tarbes',
    'Béziers', 'Sète', 'Carcassonne', 'Narbonne', 'Albi',
    'Montauban', 'Rodez', 'Aurillac', 'Cahors', 'Périgueux',
    'Bergerac', 'Mont-de-Marsan', 'Dax', 'Biarritz',
    'Ajaccio', 'Bastia', 'Arles', 'Fréjus', 'Hyères',
    'Gap', 'Briançon', 'Épinal', 'Thionville', 'Belfort',
    'Beauvais', 'Compiègne', 'Saint-Quentin', 'Laon',
    'Dunkerque', 'Calais', 'Boulogne-sur-Mer', 'Lens', 'Douai',
    'Valenciennes', 'Maubeuge', 'Cambrai', 'Arras',
    'Évreux', 'Cherbourg', 'Saint-Lô', 'Alençon',
    'Blois', 'Vendôme', 'Auxerre', 'Sens', 'Nevers',
    'Mâcon', 'Chalon-sur-Saône', 'Lons-le-Saunier',
    'Bourg-en-Bresse', 'Oyonnax', 'Vienne', 'Roanne',
    'Villefranche-sur-Saône', 'Saint-Priest', 'Vénissieux',
    'Saint-Malo', 'Fougères', 'Vitré', 'Laval',
    // DOM-TOM
    'Fort-de-France', 'Pointe-à-Pitre', 'Cayenne',
    'Saint-Denis', 'Saint-Pierre', 'Mamoudzou',
  ]

  // Chercher une ville connue.
  // Stratégie : scanner TOUTES les villes connues, trouver TOUTES les paires ville+CP,
  // et choisir la meilleure. Cela évite de capturer "Paris 75001" depuis la navigation
  // LaForêt quand le bien est à "Colombes 92700" dans le corps de l'annonce.
  //
  // Heuristique : la paire ville+CP qui apparaît le plus tard dans le texte est
  // probablement celle du bien (la navigation est en haut, le footer/agent est déjà coupé
  // par isolerContenuPrincipal).
  const lower = texte.toLowerCase()

  /**
   * Cherche un code postal à proximité d'une occurrence de ville.
   * Retourne le CP si trouvé, sinon undefined.
   * Exclut les numéros de référence (Ref:, N°, Annonce n°, #).
   */
  const REF_PREFIX_RE = /(?:r[ée]f(?:[ée]rence)?|n°|annonce|#|id)\s*:?\s*$/i
  const chercherCPProche = (idx: number, villeLen: number): string | undefined => {
    // Après la ville : jusqu'à 80 chars (couvre "Colombes\nDisponible\n92700")
    // \b pour ne pas matcher "12345" dans "123456" (URLs)
    const apres = texte.substring(idx + villeLen, idx + villeLen + 80)
    const cpApres = apres.match(/\b(\d{5})\b/)
    if (cpApres && isValidCP(cpApres[1])) {
      // Exclure si précédé par un préfixe de référence (Ref: 88504)
      const contextBefore = texte.substring(Math.max(0, idx + villeLen + (cpApres.index ?? 0) - 20), idx + villeLen + (cpApres.index ?? 0))
      if (!REF_PREFIX_RE.test(contextBefore)) return cpApres[1]
    }
    // Avant la ville : jusqu'à 20 chars ("92700 Colombes")
    if (idx >= 5) {
      const avant = texte.substring(Math.max(0, idx - 20), idx)
      const cpAvant = avant.match(/\b(\d{5})\b(?:\s*$)/)
      if (cpAvant && isValidCP(cpAvant[1])) return cpAvant[1]
    }
    return undefined
  }

  // Scanner toutes les villes connues et collecter les paires ville+CP
  type VilleMatch = { ville: string; cp: string; idx: number }
  const villeCPMatches: VilleMatch[] = []
  let premiereVilleSansCP: { ville: string; idx: number } | undefined

  /** Vérifie que le match est un mot complet (pas "agen" dans "agence") */
  const isWordBoundary = (idx: number, len: number): boolean => {
    if (idx > 0) {
      const before = lower[idx - 1]
      // Lettres (dont accents) → pas une frontière de mot
      if (/[a-zà-ÿ]/.test(before)) return false
    }
    if (idx + len < lower.length) {
      const after = lower[idx + len]
      if (/[a-zà-ÿ]/.test(after)) return false
    }
    return true
  }

  for (const v of VILLES) {
    const vLower = v.toLowerCase()
    let searchStart = 0
    while (true) {
      const idx = lower.indexOf(vLower, searchStart)
      if (idx < 0) break

      // Vérifier frontière de mot : "Agen" ne doit pas matcher dans "agence"/"agent"
      if (isWordBoundary(idx, vLower.length)) {
        const cp = chercherCPProche(idx, v.length)
        if (cp) {
          villeCPMatches.push({ ville: v, cp, idx })
        } else if (!premiereVilleSansCP) {
          premiereVilleSansCP = { ville: v, idx }
        }
      }

      searchStart = idx + v.length
    }
  }

  // Choisir le meilleur match avec scoring :
  // - +1000 points si un numéro d'arrondissement ("17ème", "1er") est mentionné
  //   à proximité de la ville et correspond au CP (ex: "Paris 17ème" + "75017")
  // - +idx pour départager : le plus tardif dans le texte gagne
  //   (la navigation est en haut, le footer/agent est déjà coupé)
  if (villeCPMatches.length > 0) {
    const scoreMatch = (m: VilleMatch): number => {
      let score = m.idx
      // Bonus arrondissement : pour Paris/Lyon/Marseille, vérifier cohérence CP ↔ Nème
      const dept = m.cp.substring(0, 2)
      if (['75', '69', '13'].includes(dept)) {
        const cpArr = parseInt(m.cp.substring(2)) // 75017 → 17
        // Chercher "Nème" ou "Ner" dans les 30 chars après la ville
        const after = texte.substring(m.idx, m.idx + m.ville.length + 30)
        const arrMatch = after.match(/(\d{1,2})\s*(?:er?|[eè]me|ème)/i)
        if (arrMatch && parseInt(arrMatch[1]) === cpArr) {
          score += 1000 // Forte cohérence
        }
      }
      return score
    }
    const best = villeCPMatches.reduce((a, b) => scoreMatch(a) > scoreMatch(b) ? a : b)
    result.ville = best.ville
    result.codePostal = best.cp
  } else if (premiereVilleSansCP) {
    result.ville = premiereVilleSansCP.ville
  }

  // ──── 2. Code postal 5 chiffres (si pas encore trouvé via ville connue) ────
  // Si la ville est connue mais le CP n'a pas été trouvé à proximité,
  // chercher le CP APRÈS la position de la ville (pas le premier du texte,
  // qui peut venir de la navigation).
  if (!result.codePostal) {
    if (result.ville) {
      // Chercher le premier CP qui apparaît APRÈS la ville dans le texte
      const villeIdx = lower.indexOf(result.ville.toLowerCase())
      if (villeIdx >= 0) {
        const afterCity = texte.substring(villeIdx)
        const cpAfter = afterCity.match(/\b(\d{5})\b/)
        if (cpAfter && isValidCP(cpAfter[1])) {
          result.codePostal = cpAfter[1]
        }
      }
    }
    // Dernier recours : premier CP du texte
    if (!result.codePostal) {
      const cpMatch = texte.match(/\b(\d{5})\b/)
      if (cpMatch && isValidCP(cpMatch[1])) {
        result.codePostal = cpMatch[1]
      }
    }
  }

  // ──── 3. Pattern "Ville (75001)" ou "75001 Ville" — si aucune ville connue trouvée ────
  if (!result.ville) {
    const patternVilleCP = [
      // "Paris 11ème (75011)", "Lyon 3ème (69003)" — arrondissement avec CP
      /([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[- ][A-ZÀ-Ÿa-zà-ÿ]+)*)\s+\d+(?:er?|[eè]me|ème)\s*\(?(\d{5})\)?/,
      // "Ville (75001)" ou "Ville 75001"
      /([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[- ][A-ZÀ-Ÿa-zà-ÿ]+)*)\s*\(?\s*(\d{5})\s*\)?/,
      // "75001 Ville" 
      /(\d{5})\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[- ][A-ZÀ-Ÿa-zà-ÿ]+)*)/,
      // "à Ville" ou "de Ville" (localisation contextuelle)
      /(?:à|de|sur|en|près de)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[- ][A-ZÀ-Ÿa-zà-ÿ]+)*)\s*(?:\((\d{5})\))?/,
    ]
    
    for (const pattern of patternVilleCP) {
      const m = texte.match(pattern)
      if (m) {
        const [cp, villeRaw] = /^\d{5}$/.test(m[1])
          ? [m[1], m[2]]
          : [m[2], m[1]]

        const ville = villeRaw ? nettoyerVille(villeRaw) : undefined
        if (ville && ville.length >= 2) {
          if (!result.ville) result.ville = ville
          if (cp && isValidCP(cp) && !result.codePostal) result.codePostal = cp
          if (result.ville && result.codePostal) break
        }
      }
    }
  }

  // ──── 4. Déduire ville depuis code postal si Paris/Lyon/Marseille ────
  if (!result.ville && result.codePostal) {
    const dept = result.codePostal.substring(0, 2)
    if (dept === '75') result.ville = 'Paris'
    else if (dept === '69') result.ville = 'Lyon'
    else if (dept === '13') result.ville = 'Marseille'
  }

  return result
}

/**
 * Extrait la DERNIÈRE lettre A-G associée à une unité (kWh, kg CO₂) dans le texte.
 * Sur LeBonCoin, l'échelle DPE/GES affiche chaque lettre avec sa plage de valeurs :
 *   "A ≤ 50 kWh ... F 331 à 450 kWh ... G > 450 kWh"
 * suivi de la valeur réelle : "D 343 kWh/m²/an"
 * → La valeur réelle est toujours la DERNIÈRE occurrence.
 */
function derniereLettrePourUnite(texte: string, unitePattern: RegExp): ClasseDPE | undefined {
  const matches = [...texte.matchAll(unitePattern)]
  if (matches.length === 0) return undefined
  const last = matches[matches.length - 1]
  // Groupe 1 = lettre A-G
  return (last[1]?.toUpperCase() || undefined) as ClasseDPE | undefined
}

function extraireDPE(texte: string): ClasseDPE | undefined {
  // 1. Pattern le plus fiable : lettre + nombre + kWh — prendre la DERNIÈRE occurrence
  //    (l'échelle affiche A...G avec kWh, la valeur réelle est après)
  const kwhResult = derniereLettrePourUnite(
    texte,
    /\b([A-G])\s*(?:≤|<=|⩽)?\s*\d{1,4}\s*kWh/gi
  )
  if (kwhResult) return kwhResult

  // 1b. Pattern inversé : nombre + kWh/m²/an + lettre ("165 kWh/m²/an C", "195 kWh/m².an D")
  //     Stop at ')' to avoid capturing GES letter after DPE kWh (e.g. "DPE : D (215 kWh/m²/an). GES : C")
  const kwhReversed = [...texte.matchAll(/\d{1,4}\s*kWh[^\n)]{0,20}?\b([A-G])\b/gi)]
  if (kwhReversed.length > 0) {
    const last = kwhReversed[kwhReversed.length - 1]
    if (last[1]) return last[1].toUpperCase() as ClasseDPE
  }

  // 2. Patterns textuels (pas affectés par l'échelle)
  const patterns = [
    /classe\s*(?:énergie|énergétique)\s*:?\s*([A-G])\b/i,
    /DPE\s*:?\s*([A-G])(?![ \t]+[A-G](?![a-zA-Z]))/i,
    /\(DPE\)\s*([A-G])\b/i,
    /DPE\)\s*([A-G])\b/i,
    /diagnostic\s*(?:de\s*)?performance\s*énergétique\s*(?:\(DPE\))?\s*:?\s*([A-G])\b/i,
    /étiquette\s*énergie\s*:?\s*([A-G])\b/i,
    /consommation\s*(?:d[’']?)?énergie\s*(?:primaire)?\s*:?\s*([A-G])\b/i,
    /bilan\s*(?:énergétique|énergie)\s*:?\s*([A-G])\b/i,
    /[ée]nergie\s*:?\s*([A-G])\b/i,
    // PAP : "Classification : E"
    /classification\s*:?\s*([A-G])\b/i,
    // LaForêt, Orpi : "Consommation conventionnelle en énergie primaire D"
    /consommation\s*conventionnelle[^.]{0,50}?\s*([A-G])\b/i,
    // Pattern numérique sans unité : "DPE 234 D" ou "DPE : 234 kWh - D"
    /\bDPE\s*:?\s*\d+\s*(?:kWh[^.]*?)?\s*[-–]?\s*([A-G])\b/i,
    // Variante inversée : "D - 234 kWh/m²/an"
    /\b([A-G])\s*[-–]\s*\d+\s*kWh/i,
  ]

  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      for (let i = m.length - 1; i >= 1; i--) {
        if (m[i] && /^[A-G]$/i.test(m[i])) {
          return m[i].toUpperCase() as ClasseDPE
        }
      }
    }
  }
  return undefined
}

function extraireGES(texte: string): ClasseDPE | undefined {
  // 1. Pattern le plus fiable : lettre + nombre + kg CO₂ — prendre la DERNIÈRE occurrence
  //    (l'échelle affiche A...G avec kg CO₂, la valeur réelle est après)
  const kgResult = derniereLettrePourUnite(
    texte,
    /\b([A-G])\s*(?:≤|<=|⩽)?\s*\d{1,4}\s*kg\s*(?:CO|eq)/gi
  )
  if (kgResult) return kgResult

  // 1b. Pattern inversé : nombre + kg CO₂/m²/an + lettre ("28 kg CO₂/m²/an C")
  const kgReversed = [...texte.matchAll(/\d{1,4}\s*kg\s*(?:CO|eq)[^\n)]{0,20}?\b([A-G])\b/gi)]
  if (kgReversed.length > 0) {
    const last = kgReversed[kgReversed.length - 1]
    if (last[1]) return last[1].toUpperCase() as ClasseDPE
  }

  // 2. Patterns textuels
  const patterns = [
    /classe\s*(?:GES|climat)\s*:?\s*([A-G])\b/i,
    /\bGES\s*:?\s*([A-G])(?![ \t]+[A-G](?![a-zA-Z]))/i,
    /\(\bGES\)\s*([A-G])\b/i,
    /\bGES\)\s*([A-G])\b/i,
    /gaz\s*(?:à\s*)?effet\s*(?:de\s*)?serre\s*(?:\(GES\))?\s*:?\s*([A-G])\b/i,
    /étiquette\s*climat\s*:?\s*([A-G])\b/i,
    /émissions?\s*(?:de\s*)?(?:GES|CO2?|gaz)\s*:?\s*([A-G])\b/i,
    /bilan\s*(?:carbone|climat)\s*:?\s*([A-G])\b/i,
    // LaForêt, Orpi, Century21 : "Indice d'émission de gaz à effet de serre D"
    /indice\s*d['']?émission[s]?\s*(?:de\s*)?(?:gaz\s*(?:à\s*)?effet\s*(?:de\s*)?serre)?\s*:?\s*([A-G])\b/i,
    // Pattern numérique sans unité : "GES 12 D" ou "GES : 12 kg - D"
    /\bGES\s*:?\s*\d+\s*(?:kg[^.]*?)?\s*[-–]?\s*([A-G])\b/i,
    // Variante inversée : "D - 12 kg CO₂/m²/an"
    /\b([A-G])\s*[-–]\s*\d+\s*kg\s*CO/i,
  ]

  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      // Tous les patterns ont la lettre en dernier groupe capturant
      // Parcourir les groupes depuis la fin pour trouver la lettre
      for (let i = m.length - 1; i >= 1; i--) {
        if (m[i] && /^[A-G]$/i.test(m[i])) {
          return m[i].toUpperCase() as ClasseDPE
        }
      }
    }
  }
  return undefined
}

function extraireEtagesTotal(texte: string): number | undefined {
  const patterns = [
    // "Étage 8/9" ou "8ème étage/9 étages" → 9
    /étage\s*\d+\s*\/\s*(\d+)/i,
    /\d+(?:er?|e|ème)?\s*étage\s*\/\s*(\d+)/i,
    /(?:immeuble|bâtiment|résidence)\s*(?:de\s*)?(?:R\+)?(\d+)\s*étages?/i,
    // "immeuble de R+5", "résidence R+9" (sans "étages" après)
    /(?:immeuble|bâtiment|résidence)\s+(?:\w+\s+)*?(?:de\s*)?R\+(\d+)/i,
    /(\d+)\s*étages?\s*(?:au\s*total|en\s*tout)/i,
    /sur\s*(\d+)\s*étages?/i,
    // "2ème étage sur 5" (SeLoger format — no "étages" word after the total)
    /\d+(?:er?|e|ème)?\s*étage\s+sur\s+(\d+)/i,
    /(?:nombre\s*d'?étages?|étages?\s*total)\s*:?\s*(\d+)/i,
    // LeBonCoin markdown : "Nombre d'étages dans l'immeuble\n\n11"
    /nombre\s*d['’]?[ée]tages?\s+(?:dans\s+l['’]?immeuble)?[\s:]*(\d+)/i,
    // "8/9 étages" generic
    /\d+\s*\/\s*(\d+)\s*étages?/i,
    // "Étage : 5 / 8" — étage courant / total
    /étage\s*:?\s*\d+\s*\/\s*(\d+)/i,
    // "N étages" — plural only (fallback, avoids matching "5ème étage" singular)
    /\b(\d+)\s*étages\b/i,
    // "R+N" standalone (fallback)
    /\bR\+(\d+)\b/i,
  ]
  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      const n = parseInt(m[1])
      if (n >= 1 && n <= 60) return n
    }
  }
  return undefined
}

function extraireAnneeConstruction(texte: string): number | undefined {
  const patterns = [
    // Patterns explicites (les plus fiables)
    /(?:année\s*(?:de\s*)?construction)\s*:?\s*((?:18|19|20)\d{2})/i,
    /(?:date\s*(?:de\s*)?construction)\s*:?\s*((?:18|19|20)\d{2})/i,
    /(?:construit|construction)\s*(?:en\s*)?:?\s*((?:18|19|20)\d{2})/i,
    /(?:bâti|b[aâ]tie?|édifié|livré|livrée?)\s*(?:en\s*)?((?:18|19|20)\d{2})/i,
    // "Immeuble de 1972", "Résidence de 1985", "Copropriété de 1974"
    // Also handles: "copropriété bien entretenue de 1965" (up to 5 words in between)
    /(?:immeuble|résidence|r[eé]sidence|copropri[eé]t[eé]|programme|b[aâ]timent)\s+(?:\S+\s+){0,5}(?:de|du)\s+((?:18|19|20)\d{2})/i,
    // "Livraison 2024", "Livraison prévue T3 2025", "Livraison prévue 2025"
    /livraison\s*(?:prévue\s*)?(?:T\d\s*)?((?:19|20)\d{2})/i,
    // "Neuf - livré en 2024"
    /livr[eé]e?\s+(?:en\s+)?((?:19|20)\d{2})/i,
    // "Année : 1985", "Année de construction : 1985"
    /ann[eé]e\s*:?\s*((?:18|19|20)\d{2})/i,
    // "Construction year: 1985" (Jina/Firecrawl can return English)
    /(?:construction\s*year|year\s*(?:of\s*)?(?:construction|built))\s*:?\s*((?:18|19|20)\d{2})/i,
    // "Période de construction : 1970-1980" → prend la 1ère année
    /p[eé]riode\s*(?:de\s*)?construction\s*:?\s*((?:18|19|20)\d{2})/i,
    // "datant de 1975", "datant des années 70"
    /datant\s+(?:de\s+|des\s+ann[eé]es\s+)?((?:18|19|20)\d{2})/i,
    // Tableau markdown : "| Année | 1985 |" ou "| Construction | 1985 |"
    /\|\s*(?:année|ann[eé]e\s*(?:de\s*)?construction|construction|date\s*construction)\s*\|\s*((?:18|19|20)\d{2})\s*\|/i,
    // "Built in 1985" (Jina anglais)
    /built\s+in\s+((?:18|19|20)\d{2})/i,
    // Fallback : "année de construction" suivi de n'importe quoi puis année (SeLoger séparation HTML)
    /ann[eé]e\s*(?:de\s*)?construction\D{0,30}((?:18|19|20)\d{2})/i,
  ]
  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      const annee = parseInt(m[1])
      if (annee >= 1800 && annee <= 2030) return annee
    }
  }
  
  // Dernier recours : "années 70" → 1970, "années 60" → 1960
  const decennieMatch = texte.match(/(?:ann[eé]es|d[eé]cennie)\s+(\d{2})(?:\b|[^\d])/i)
  if (decennieMatch) {
    const dec = parseInt(decennieMatch[1])
    if (dec >= 50 && dec <= 99) return 1900 + dec
    if (dec >= 0 && dec <= 30) return 2000 + dec
  }
  
  return undefined
}

function extraireNbSallesBains(texte: string): number | undefined {
  let total = 0

  // 1. Count all "N salle(s) de bains" with numbers before
  // Use [ \t]* (no newlines) between number and "salle" to avoid matching
  // "Chambres 2\nSalle de bain" across lines.
  for (const m of texte.matchAll(/(\d+)[ \t]*salles?[ \t]*(?:de[ \t]*)?bains?/gi)) {
    total += parseInt(m[1])
  }

  // 2. Count all "N salle(s) d'eau" with numbers before (both straight and curly apostrophes)
  for (const m of texte.matchAll(/(\d+)[ \t]*salles?[ \t]*d['\u2019]eau/gi)) {
    total += parseInt(m[1])
  }

  // 3. Count "salle(s) de bains : N" and "salle(s) d'eau : N" (number after)
  // Use [ \t]* before (\d+) to avoid matching across newlines.
  if (total === 0) {
    for (const m of texte.matchAll(/salles?\s*(?:de\s*)?bains?[ \t]*:?[ \t]*(\d+)/gi)) {
      total += parseInt(m[1])
    }
    for (const m of texte.matchAll(/salles?\s*d['\u2019]eau[ \t]*:?[ \t]*(\d+)/gi)) {
      total += parseInt(m[1])
    }
  }

  // 4. Count "N SDB"
  if (total === 0) {
    for (const m of texte.matchAll(/(\d+)\s*\bSDB\b/gi)) {
      total += parseInt(m[1])
    }
  }

  // 5. If still 0, check bare mentions (without number → count 1 each)
  if (total === 0) {
    if (/\bsalles?\s*(?:de\s*)?bains?\b/i.test(texte)) total += 1
    if (/\bsalles?\s*d['\u2019']eau\b/i.test(texte)) total += 1
  }

  return total >= 1 && total <= 10 ? total : undefined
}

function extraireOrientation(texte: string): string | undefined {
  // "Orientation sud", "Exposé plein sud", "Double exposition est/ouest"
  const patterns = [
    /(?:orientation|orientée?|exposée?|exposition)\s*:?\s*((?:plein\s*)?(?:nord|sud|est|ouest)(?:\s*[/\-]\s*(?:nord|sud|est|ouest))?)/i,
    /(?:double\s*exposition)\s*:?\s*((?:nord|sud|est|ouest)\s*[/\-]\s*(?:nord|sud|est|ouest))/i,
    // "DOUBLE EXPOSITION" sans direction spécifique
    /(double\s*exposition)/i,
  ]
  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      return m[1].trim().substring(0, 30)
    }
  }
  return undefined
}

function extraireDescription(texte: string): string | undefined {
  // Chercher un bloc de texte descriptif (phrases longues, contient des mots-clés immo)
  const lignes = texte.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const descLines: string[] = []
  
  for (const ligne of lignes) {
    // Ignorer les lignes qui sont des liens markdown, images, ou headings
    if (/^\[.*\]\(.*\)$/.test(ligne) || /^!\[/.test(ligne) || /^#{1,3}\s/.test(ligne)) continue
    // Lignes de 50+ chars avec des mots-clés immobiliers
    if (ligne.length >= 50 && ligne.length <= 2000 &&
        /appartement|maison|séjour|cuisine|chambre|salle|lumineu|calme|proche|quartier|situé|idéal|rénov|état|vue|jardin|parking|cave|balcon|terrasse|étage|résidence|copropriété|bien|immeuble/i.test(ligne)) {
      descLines.push(ligne)
      if (descLines.length >= 3) break
    }
  }
  
  if (descLines.length > 0) {
    return descLines.join(' ').substring(0, 1000)
  }
  return undefined
}

function extraireEtage(texte: string): number | undefined {
  const patterns = [
    // LeBonCoin markdown multiline : "Étage de votre bien\n\n9" ou "Étage\n\n5"
    /[ée]tage\s+(?:de\s+)?(?:votre\s+|ce\s+|le\s+)?bien[\s:]*\n\s*\n?\s*(\d+)/i,
    // [ \t]* au lieu de \s* pour ne pas croiser les lignes
    // ("Chambres : 2\nÉtage" → empêche de capturer 2)
    /(\d+)(?:er?|e|[èe]me)?[ \t]+(?:et\s+dernier\s+)?étage/i,
    /étage\s*:?\s*(\d+)/i,
  ]

  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      const e = parseInt(m[1])
      if (e >= 0 && e <= 50) return e
    }
  }

  if (/rez[- ]de[- ]chauss[ée]e|rdc/i.test(texte)) return 0
  return undefined
}

function extraireCharges(texte: string): number | undefined {
  const patterns = [
    // LeBonCoin markdown : "Charges annuelles de copropriété\n\n2 880 € par / an"
    /charges?\s+annuelles?\s+(?:de\s+)?copropri[ée]t[ée][\s:]*\n?\s*(\d[\d\s]*)\s*€/i,
    /charges?\s*(?:de\s+)?copro(?:priété)?\s*[:(]?\s*\(?\s*(\d[\d\s]*)\s*(?:€|euros?)?\s*(?:\/\s*(?:an|mois))?/i,
    /charges?\s*mensuelles?\s*:?\s*(\d[\d\s]*)\s*(?:€|euros?)/i,
    /charges?\s*pr[ée]visionnelles?\s*:?\s*(\d[\d\s]*)\s*(?:€|euros?)/i,
    /provisions?\s*sur\s*charges?\s*:?\s*(\d[\d\s]*)\s*(?:€|euros?)/i,
    /charges?\s*:\s*(\d[\d\s]*)\s*(?:€|euros?)\s*\/\s*mois/i,
    /(\d[\d\s]*)\s*(?:€|euros?)\s*(?:de\s+)?charges?\s*(?:par\s+mois|\/\s*mois|mensuelles?)/i,
    // Fallback générique : "charges 3600 €" (sans ":" ni qualificatif)
    /charges?\s+(\d[\d\s]*)\s*(?:€|euros?)/i,
    // Pattern sans symbole : "charges mensuelles : 235" (SeLoger JSON text)
    /charges?\s*mensuelles?\s*:?\s*(\d[\d\s.,]+)\b/i,
  ]

  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      const c = extraireNombre(m[1])
      if (c && c > 0 && c < 50000) {
        // Analyser le contexte autour du match pour détecter la périodicité
        const matchIndex = texte.indexOf(m[0])
        const context = texte.slice(Math.max(0, matchIndex - 30), matchIndex + m[0].length + 30).toLowerCase()

        const isAnnual = /\/\s*an|par\s+an|annuelles?|\/\s*année|copropri[eé]t[eé]/i.test(context)
        const isMonthly = /\/\s*mois|par\s+mois|mensuelles?/i.test(context)

        if (isMonthly) return c
        if (isAnnual) return Math.round(c / 12)
        // Heuristique de dernier recours :
        // > 1200€ sans contexte → probablement annuel (charges mensuelles rarement > 1200€)
        // Seuil relevé car à Paris, charges mensuelles > 500€ sont courantes
        return c > 1200 ? Math.round(c / 12) : c
      }
    }
  }
  return undefined
}

function extraireTaxeFonciere(texte: string): number | undefined {
  const patterns = [
    /taxe\s*foncière\s*:?\s*(\d[\d\s]*)\s*(?:€|euros?)/i,
    /foncière?\s*:?\s*(\d[\d\s]*)\s*(?:€|euros?)/i,
    // "320 € de taxe foncière" — same-line only ([ \t] not \s to avoid cross-line match)
    /(\d[\d\s]*)[ \t]*(?:€|euros?)[ \t]+(?:de[ \t]+)?taxe\s*foncière/i,
    // Pattern sans symbole euro (SeLoger : "Taxe Foncière: 1442 Euros")
    /taxe\s*foncière\s*:?\s*(\d[\d\s.,]+)(?:\s*(?:€|euros?|par\s*an|\/\s*an))?/i,
  ]

  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      const t = extraireNombre(m[1])
      if (t && t > 0 && t < 20000) return t
    }
  }
  return undefined
}

function extraireEquipements(texte: string) {
  const lower = texte.toLowerCase()

  /** Vérifie qu'un équipement est mentionné positivement (pas de négation avant) */
  const presente = (motif: RegExp, exclusions: RegExp[]): boolean => {
    if (!motif.test(lower)) return false
    // Vérifier qu'aucune exclusion n'est présente
    return !exclusions.some(excl => excl.test(lower))
  }

  const NEG_ASCENSEUR = [/sans\s+ascenseur/, /pas\s+d['’e]?\s*ascenseur/, /aucun\s+ascenseur/, /ascenseur\s*:\s*non/, /ni\s+d['’e]?\s*ascenseur/]
  const NEG_BALCON_ONLY = [/sans\s+balcon/, /pas\s+d['’e]?\s*balcon/, /aucun\s+balcon/, /balcon\s*:\s*non/, /ni\s+d['’e]?\s*balcon/]
  const NEG_TERRASSE_ONLY = [/sans\s+terrasse/, /pas\s+d['’e]?\s*terrasse/, /aucune?\s+terrasse/, /terrasse\s*:\s*non/, /ni\s+d['’e]?\s*terrasse/]
  const NEG_PARKING = [/sans\s+(?:parking|garage)/, /pas\s+d['’e]?\s*(?:parking|garage)/, /aucun\s+(?:parking|garage)/, /parking\s*:\s*non/, /garage\s*:\s*non/, /ni\s+d['’e]?\s*(?:parking|garage)/]
  const NEG_CAVE = [/sans\s+cave/, /pas\s+d['’e]?\s*cave/, /aucune?\s+cave/, /cave\s*:\s*non/, /ni\s+d['’e]?\s*cave/]

  // balconTerrasse : SeLoger peut avoir "Pas de balcon" ET "Terrasse" séparément.
  // Chaque élément (balcon, terrasse, loggia) est vérifié indépendamment.
  const hasBalcon = presente(/\bbalcon\b/, NEG_BALCON_ONLY)
  const hasTerrasse = presente(/\bterrasse\b/, NEG_TERRASSE_ONLY)
  const hasLoggia = /\bloggia\b/.test(lower)

  return {
    ascenseur: presente(/\bascenseur\b/, NEG_ASCENSEUR),
    balconTerrasse: hasBalcon || hasTerrasse || hasLoggia,
    parking: presente(/\bparking\b|\bgarage\b|\bbox\b|place\s+de\s+stationnement/, NEG_PARKING),
    cave: presente(/\bcave\b/, NEG_CAVE),
  }
}

function extraireTitre(texte: string): string | undefined {
  // 1. Markdown H1 heading (Firecrawl)
  const h1Match = texte.match(/^#\s+(.+)$/m)
  if (h1Match && /appartement|maison|studio|loft|duplex|villa|pièces?|chambres?|T\d|F\d/i.test(h1Match[1])) {
    // Nettoyer : SeLoger colle le prix + liens dans le H1 (peut faire 600+ chars)
    let titre = h1Match[1].trim()
    // Couper avant le premier prix ou lien markdown
    titre = titre.replace(/\s*\d[\d\s]*€.*$/, '').replace(/\s*\[.*$/, '').trim()
    if (titre.length >= 5 && titre.length <= 200) return titre
  }

  // 2. Markdown H2 heading with real estate keywords
  const h2Match = texte.match(/^##\s+(\d+\s+pièces?)\b/m)
  if (h2Match) {
    // SeLoger: "## 4 pièces" — combine with type if available
    return h2Match[1].trim()
  }

  // 2. Prendre la première ligne non vide qui ressemble à un titre
  const lignes = texte.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  for (const ligne of lignes.slice(0, 15)) {
    // Cherche une ligne qui contient des mots-clés immobiliers
    if (/appartement|maison|studio|loft|duplex|villa|pièces?|chambres?|T\d|F\d/i.test(ligne) && ligne.length < 200) {
      return ligne.substring(0, 200)
    }
  }
  return undefined
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

/**
 * Parse le texte collé par l'utilisateur et extrait les données de l'annonce.
 * Fonctionne entièrement côté client, sans requête serveur.
 */
/** Limite de taille pour éviter les ReDoS sur texte très long */
const MAX_TEXT_LENGTH = 200_000

/**
 * Parse le texte collé par l'utilisateur et extrait les données de l'annonce.
 * Fonctionne entièrement côté client, sans requête serveur.
 */
export function parseTexteAnnonce(texteColle: string): DonneesExtraites {
  const texte = nettoyerTexte(texteColle)
  if (!texte) return {}

  // Protection ReDoS : tronquer les textes trop longs
  const texteBrut = texte.length > MAX_TEXT_LENGTH ? texte.substring(0, MAX_TEXT_LENGTH) : texte

  // ══ Isoler le contenu principal (2 étapes) ══
  // Étape 1 : Supprimer sections parasites (similaires, footer, agent, etc.)
  const texteCoupe = isolerContenuPrincipal(texteBrut)
  // Étape 2 : Nettoyer les échelles visuelles DPE/GES
  const texteSafe = nettoyerEchellesDPE(texteCoupe)

  // Extraire l'URL du bien (utile pour la source et les images)
  const url = extraireUrl(texteBrut) // chercher dans le texte complet

  // ══ DPE / GES ══
  // Extraire d'abord sur texteCoupe (AVANT nettoyage échelles) avec les patterns
  // kWh/kg qui utilisent derniereLettrePourUnite — gère les échelles nativement.
  // Si ça échoue, fallback sur texteSafe (APRÈS nettoyage) avec les patterns textuels.
  const dpe = extraireDPE(texteCoupe) || extraireDPE(texteSafe)
  const ges = extraireGES(texteCoupe) || extraireGES(texteSafe)

  const localisation = extraireLocalisation(texteSafe)
  const equipements = extraireEquipements(texteSafe)

  const resultat: DonneesExtraites = {
    prix: extrairePrix(texteSafe),
    surface: extraireSurface(texteSafe),
    pieces: extrairePieces(texteSafe),
    chambres: extraireChambres(texteSafe),
    type: extraireType(texteSafe),
    ville: localisation.ville,
    codePostal: localisation.codePostal,
    dpe,
    ges,
    etage: extraireEtage(texteSafe),
    etagesTotal: extraireEtagesTotal(texteSafe),
    chargesMensuelles: extraireCharges(texteSafe),
    taxeFonciere: extraireTaxeFonciere(texteSafe),
    titre: extraireTitre(texteSafe),
    description: extraireDescription(texteSafe),
    anneeConstruction: extraireAnneeConstruction(texteSafe),
    nbSallesBains: extraireNbSallesBains(texteSafe),
    orientation: extraireOrientation(texteSafe),
    ...equipements,
    ...(url ? { url } : {}),
  }

  // Déduire chambres si on a les pièces
  if (!resultat.chambres && resultat.pieces) {
    resultat.chambres = Math.max(0, resultat.pieces - 1)
  }

  // Déduire pièces si on a les chambres
  if (!resultat.pieces && resultat.chambres) {
    resultat.pieces = resultat.chambres + 1
  }

  return resultat
}

/**
 * Compte combien de champs ont été extraits avec succès
 */
/**
 * Transforme une URL d'image thumbnail en version haute résolution.
 * Gère les patterns connus des portails immobiliers français.
 *
 * @example
 * upgradeImageUrl('https://v.seloger.com/s/crop/310x225/visuels/xxx.jpg')
 * // → 'https://v.seloger.com/s/width/1280/visuels/xxx.jpg'
 */
export function upgradeImageUrl(url: string): string {
  if (!url) return url
  try {
    // ── SeLoger / se-loger ──
    // /s/crop/310x225/ ou /s/width/420/ → /s/width/1280/
    if (url.includes('seloger.com')) {
      return url
        .replace(/\/s\/crop\/\d+x\d+\//, '/s/width/1280/')
        .replace(/\/s\/width\/\d+\//, '/s/width/1280/')
        .replace(/\/s\/height\/\d+\//, '/s/width/1280/')
    }

    // ── LeBonCoin ──
    // Formats connus :
    //   /api/v1/lbcpb1/images/<id>/300x300.webp → /api/v1/lbcpb1/images/<id>/ad-large.jpg
    //   /ad-thumb/<id>.jpg → /ad-image/<id>.jpg
    //   ?rule=ad-thumb → supprimer ou ?rule=ad-large
    if (url.includes('leboncoin.fr') || url.includes('img.lbc')) {
      let upgraded = url
      // Path-based size: /300x300.webp, /600x400.jpg → /ad-large.jpg
      upgraded = upgraded.replace(/\/\d+x\d+\.\w+$/, '/ad-large.jpg')
      // ad-thumb → ad-image (full size)
      upgraded = upgraded.replace(/\/ad-thumb\//, '/ad-image/')
      upgraded = upgraded.replace(/\/ad-small\//, '/ad-image/')
      // Query param: ?rule=ad-thumb ou ?rule=ad-small → supprimer
      upgraded = upgraded.replace(/[?&]rule=ad-(?:thumb|small)[^&]*/gi, '')
      // Clean trailing ? or &
      upgraded = upgraded.replace(/[?&]$/, '')
      return upgraded
    }

    // ── Bien'ici ──
    // /fit-in/360x270/ → /fit-in/1280x960/
    if (url.includes('bienici.com') || url.includes('bien-ici')) {
      return url.replace(/\/fit-in\/\d+x\d+\//, '/fit-in/1280x960/')
    }

    // ── PAP ──
    // /thumb/ → supprimer
    if (url.includes('pap.fr')) {
      return url.replace(/\/thumb\//, '/')
    }

    // ── Logic-Immo ──
    // /i/200x200/ → /i/1280x960/
    if (url.includes('logic-immo')) {
      return url.replace(/\/i\/\d+x\d+\//, '/i/1280x960/')
    }

    // ── Explorimmo / Figaro Immo ──
    if (url.includes('explorimmo') || url.includes('figaro')) {
      return url.replace(/\/\d+x\d+\//, '/1280x960/')
    }

    // ── Orpi ──
    if (url.includes('orpi.com')) {
      return url
        .replace(/\/cache\/[^/]+\//, '/cache/1280x960/')
        .replace(/\/\d+x\d+\//, '/1280x960/')
    }

    // ── Century21 ──
    if (url.includes('century21')) {
      return url.replace(/\/\d+x\d+\//, '/1280x960/')
    }

    // ── Generic CDN patterns ──
    const parsed = new URL(url)
    let changed = false

    // ?w=200&h=150 → ?w=1280&h=960
    for (const key of ['w', 'width', 'iw']) {
      if (parsed.searchParams.has(key)) {
        const val = parseInt(parsed.searchParams.get(key) || '0')
        if (val > 0 && val < 800) {
          parsed.searchParams.set(key, '1280')
          changed = true
        }
      }
    }
    for (const key of ['h', 'height', 'ih']) {
      if (parsed.searchParams.has(key)) {
        const val = parseInt(parsed.searchParams.get(key) || '0')
        if (val > 0 && val < 600) {
          parsed.searchParams.set(key, '960')
          changed = true
        }
      }
    }

    // ?size=small|thumbnail|medium → supprimer
    if (parsed.searchParams.has('size')) {
      const s = parsed.searchParams.get('size')?.toLowerCase()
      if (s === 'small' || s === 'thumbnail' || s === 'thumb' || s === 'medium') {
        parsed.searchParams.delete('size')
        changed = true
      }
    }

    // ?quality=50 → ?quality=85
    if (parsed.searchParams.has('quality')) {
      const q = parseInt(parsed.searchParams.get('quality') || '85')
      if (q < 70) {
        parsed.searchParams.set('quality', '85')
        changed = true
      }
    }

    if (changed) return parsed.toString()

    // Path-based generic patterns: /thumbs/ → /, _thumb.jpg → .jpg
    let upgraded = url
    upgraded = upgraded.replace(/\/thumbs?\//, '/')
    upgraded = upgraded.replace(/_thumb(\.\w+)$/, '$1')
    upgraded = upgraded.replace(/_small(\.\w+)$/, '$1')
    upgraded = upgraded.replace(/_medium(\.\w+)$/, '_large$1')

    return upgraded
  } catch {
    return url
  }
}

/**
 * Extrait les URLs des photos depuis le HTML du clipboard.
 * Quand l'utilisateur fait Ctrl+A → Ctrl+C, le clipboard contient
 * à la fois du texte brut ET du HTML. Le HTML a les balises <img>
 * avec les URLs des photos — on en profite.
 *
 * Retourne l'image principale + toutes les images trouvées.
 * Priorités pour l'image principale : og:image > twitter:image > première grande <img>
 * Les URLs sont automatiquement transformées en version haute résolution.
 */

/**
 * Décoder les URLs Next.js /_next/image?url=ENCODED pour récupérer l'image originale.
 * LaForêt, SeLoger neuf et d'autres sites Next.js wrappent les images via ce proxy :
 *   https://www.laforet.com/_next/image?url=https%3A%2F%2Fmedia.laforet.com%2Fphoto.jpg&w=640&q=75
 * → On extrait l'URL originale : https://media.laforet.com/photo.jpg
 */
function decodeNextImageUrl(url: string): string {
  try {
    if (!url.includes('/_next/image')) return url
    const urlObj = new URL(url)
    const originalUrl = urlObj.searchParams.get('url')
    if (originalUrl && originalUrl.startsWith('http')) {
      return originalUrl
    }
  } catch { /* URL malformée, on retourne l'originale */ }
  return url
}

export function extraireImagesFromHTML(html: string): { imageUrl?: string; images: string[] } {
  if (!html || html.length < 20) return { images: [] }

  const allImages: string[] = []
  let mainImage: string | undefined

  // 1. og:image (la plus fiable — utilisée par tous les portails immo)
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  if (ogMatch?.[1]) {
    const url = ogMatch[1].trim()
    if (url.startsWith('http')) {
      mainImage = url
      allImages.push(url)
    }
  }

  // 2. twitter:image
  const twMatch = html.match(/<meta[^>]+(?:name|property)=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
  if (twMatch?.[1]) {
    const url = twMatch[1].trim()
    if (url.startsWith('http') && !allImages.includes(url)) {
      if (!mainImage) mainImage = url
      allImages.push(url)
    }
  }

  // 3. Toutes les <img> — vérifier src, data-src, data-lazy-src, srcset
  const imgTagRegex = /<img[^>]+>/gi
  let imgTag: RegExpExecArray | null
  while ((imgTag = imgTagRegex.exec(html)) !== null) {
    const tag = imgTag[0]
    
    // Extraire les différentes sources possibles (ordre de qualité décroissante)
    const dataSrcMatch = tag.match(/data-(?:lazy-)?src=["']([^"']+)["']/i)
    const srcSetMatch = tag.match(/(?:data-)?srcset=["']([^"']+)["']/i)
    // Utiliser un espace ou début de tag avant "src=" pour ne pas re-matcher data-src
    const srcMatch = tag.match(/(?:^|[\s"'])src=["']([^"']+)["']/i)
    
    // Privilégier la plus grande image du srcset
    let bestUrl: string | undefined
    if (srcSetMatch?.[1]) {
      const entries = srcSetMatch[1].split(',').map(s => s.trim())
      let bestWidth = 0
      for (const entry of entries) {
        const parts = entry.split(/\s+/)
        const url = parts[0]?.trim()
        const widthStr = parts[1]?.replace('w', '')
        const w = widthStr ? parseInt(widthStr) : 0
        if (url?.startsWith('http') && w > bestWidth) {
          bestWidth = w
          bestUrl = url
        }
      }
    }
    
    // Puis data-src (image lazy-loadée = souvent la vraie image haute qualité)
    if (!bestUrl && dataSrcMatch?.[1]?.startsWith('http')) {
      bestUrl = dataSrcMatch[1].trim()
    }
    
    // Enfin src classique
    if (!bestUrl && srcMatch?.[1]?.startsWith('http')) {
      bestUrl = srcMatch[1].trim()
    }
    
    if (!bestUrl) continue

    // Décoder les URLs Next.js /_next/image?url=ENCODED pour récupérer l'image originale haute-res
    bestUrl = decodeNextImageUrl(bestUrl)

    if (/\.svg(\?|$)/i.test(bestUrl)) continue
    if (/logo|icon|avatar|sprite|pixel|tracking|badge|button|loader|spinner/i.test(bestUrl)) continue
    const widthMatch = tag.match(/width=["']?(\d+)/i)
    const heightMatch = tag.match(/height=["']?(\d+)/i)
    if (widthMatch && parseInt(widthMatch[1]) < 100) continue
    if (heightMatch && parseInt(heightMatch[1]) < 100) continue
    if (!allImages.includes(bestUrl)) {
      if (!mainImage) mainImage = bestUrl
      allImages.push(bestUrl)
    }
    if (allImages.length >= 20) break
  }

  // 4. Fallback : URLs d'image dans le HTML brut
  if (allImages.length === 0) {
    const urlRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi
    let urlMatch: RegExpExecArray | null
    while ((urlMatch = urlRegex.exec(html)) !== null) {
      let url = urlMatch[0]
      url = decodeNextImageUrl(url)
      if (/logo|icon|avatar|sprite|pixel|tracking/i.test(url)) continue
      if (!allImages.includes(url)) {
        if (!mainImage) mainImage = url
        allImages.push(url)
      }
      if (allImages.length >= 20) break
    }
  }

  // Dédupliquer les URLs et décoder les /_next/image restantes
  const uniqueImages = [...new Set(allImages.map(u => decodeNextImageUrl(u)))]
  const finalMain = mainImage ? decodeNextImageUrl(mainImage) : undefined

  return { imageUrl: finalMain, images: uniqueImages.length > 1 ? uniqueImages : [] }
}

/** @deprecated Utiliser extraireImagesFromHTML à la place */
export function extraireImageFromHTML(html: string): string | undefined {
  return extraireImagesFromHTML(html).imageUrl
}

export function compterChampsExtraits(data: DonneesExtraites): number {
  let count = 0
  if (data.prix) count++
  if (data.surface) count++
  if (data.pieces) count++
  if (data.chambres) count++
  if (data.ville) count++
  if (data.codePostal) count++
  if (data.dpe && data.dpe !== 'NC') count++
  if (data.ges && data.ges !== 'NC') count++
  if (data.etage !== undefined) count++
  if (data.etagesTotal) count++
  if (data.chargesMensuelles) count++
  if (data.taxeFonciere) count++
  if (data.description) count++
  if (data.anneeConstruction) count++
  if (data.nbSallesBains) count++
  if (data.orientation) count++
  if (data.imageUrl) count++
  // BUG-4 : compter les booléens extraits (ascenseur, parking, etc.)
  if (data.ascenseur === true) count++
  if (data.balconTerrasse === true) count++
  if (data.parking === true) count++
  if (data.cave === true) count++
  return count
}
