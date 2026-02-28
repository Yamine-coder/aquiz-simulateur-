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
}

// ============================================
// HELPERS
// ============================================

function nettoyerTexte(texte: string): string {
  return texte
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
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
  const patterns = [
    // "Prix : 450 000 €" ou "Prix de vente : 450 000€"
    /prix\s*(?:de\s*vente)?\s*:?\s*(\d{1,3}(?:[\s\u00A0]\d{3})*)\s*€/i,
    // "450 000 €" (avec espaces)
    /(\d{1,3}(?:[\s\u00A0]\d{3})+)\s*€/,
    // "450000€" (sans espaces, 6+ chiffres)
    /(\d{6,8})\s*€/,
    // "450 000 euros"
    /(\d{1,3}(?:[\s\u00A0]\d{3})+)\s*euros?/i,
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
      if (s >= 9 && s <= 1000) return s
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
    /(\d+)\s*chambres?/i,
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
  const lower = texte.toLowerCase()
  if (/\bmaison\b|\bvilla\b|\bpavillon\b/.test(lower)) return 'maison'
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
  const MOTS_EXCLUS = /^(appartement|maison|villa|studio|duplex|loft|pavillon|immeuble|résidence|programme|vente|achat|annonce|prix|surface|pièces?|chambres?|étage|orientation|construction|description|parking|garage|terrasse|balcon|cave|code|bien|local|situé|centre|quartier)$/i

  // ──── 1. Villes connues (le plus fiable) ────
  const VILLES = [
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
  ]
  const lower = texte.toLowerCase()
  for (const v of VILLES) {
    if (lower.includes(v.toLowerCase())) {
      result.ville = v
      break
    }
  }

  // ──── 2. Code postal 5 chiffres (avec validation dept) ────
  const cpMatch = texte.match(/\b(\d{5})\b/)
  if (cpMatch && isValidCP(cpMatch[1])) {
    result.codePostal = cpMatch[1]
  }

  // ──── 3. Pattern "Ville (75001)" ou "75001 Ville" (seulement si pas déjà trouvé) ────
  if (!result.ville) {
    const villeAvecCP = texte.match(/([A-ZÀ-Ÿ][a-zà-ÿ]+(?:-[A-ZÀ-Ÿa-zà-ÿ]+)*)\s*\(\s*(\d{5})\s*\)/) ||
                        texte.match(/(\d{5})\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:-[A-ZÀ-Ÿa-zà-ÿ]+)*)/)
    if (villeAvecCP) {
      const [cp, ville] = /^\d{5}$/.test(villeAvecCP[1])
        ? [villeAvecCP[1], villeAvecCP[2]]
        : [villeAvecCP[2], villeAvecCP[1]]

      // Valider : CP valide ET nom de ville pas un mot courant
      if (isValidCP(cp) && !MOTS_EXCLUS.test(ville)) {
        result.ville = ville
        result.codePostal = cp
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

function extraireDPE(texte: string): ClasseDPE | undefined {
  const patterns = [
    /DPE\s*:?\s*([A-G])\b/i,
    /classe\s*(?:énergie|énergétique)\s*:?\s*([A-G])\b/i,
    /diagnostic\s*(?:de\s*)?performance\s*énergétique\s*:?\s*([A-G])\b/i,
    /étiquette\s*énergie\s*:?\s*([A-G])\b/i,
  ]

  for (const p of patterns) {
    const m = texte.match(p)
    if (m) return m[1].toUpperCase() as ClasseDPE
  }
  return undefined
}

function extraireGES(texte: string): ClasseDPE | undefined {
  const patterns = [
    /GES\s*:?\s*([A-G])\b/i,
    /gaz\s*(?:à\s*)?effet\s*(?:de\s*)?serre\s*:?\s*([A-G])\b/i,
    /classe\s*(?:GES|climat)\s*:?\s*([A-G])\b/i,
    /étiquette\s*climat\s*:?\s*([A-G])\b/i,
    /émissions?\s*(?:de\s*)?(?:GES|CO2?)\s*:?\s*([A-G])\b/i,
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
    /(?:immeuble|bâtiment|résidence)\s*(?:de\s*)?(?:R\+)?(\d+)\s*étages?/i,
    /(\d+)\s*étages?\s*(?:au\s*total|en\s*tout)/i,
    /sur\s*(\d+)\s*étages?/i,
    /(?:nombre\s*d'?étages?|étages?\s*total)\s*:?\s*(\d+)/i,
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
    /(?:immeuble|résidence|r[eé]sidence|copropri[eé]t[eé]|programme|b[aâ]timent)\s+(?:de|du)\s+((?:18|19|20)\d{2})/i,
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
  const patterns = [
    /(\d+)\s*salles?\s*(?:de\s*)?bains?/i,
    /salles?\s*(?:de\s*)?bains?\s*:?\s*(\d+)/i,
    /(\d+)\s*salles?\s*d'eau/i,
    /salles?\s*d'eau\s*:?\s*(\d+)/i,
    /(\d+)\s*(?:SDB|sdb)/i,
  ]
  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      // Groupe de capture peut être en position 1 ou 2 selon le pattern
      const val = m[1] || m[2]
      const n = parseInt(val)
      if (n >= 1 && n <= 10) return n
    }
  }
  return undefined
}

function extraireOrientation(texte: string): string | undefined {
  // "Orientation sud", "Exposé plein sud", "Double exposition est/ouest"
  const patterns = [
    /(?:orientation|orienté|exposé|exposition)\s*:?\s*((?:plein\s*)?(?:nord|sud|est|ouest)(?:\s*[/\-]\s*(?:nord|sud|est|ouest))?)/i,
    /(?:double\s*exposition)\s*:?\s*((?:nord|sud|est|ouest)\s*[/\-]\s*(?:nord|sud|est|ouest))/i,
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
    /(\d+)(?:er?|e|ème)?\s*étage/i,
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
    /charges?\s*(?:de\s+)?copropriété\s*:?\s*(\d[\d\s]*)\s*€?\s*(?:\/\s*(?:an|mois))?/i,
    /charges?\s*mensuelles?\s*:?\s*(\d[\d\s]*)\s*€/i,
    /provisions?\s*sur\s*charges?\s*:?\s*(\d[\d\s]*)\s*€/i,
    /charges?\s*:\s*(\d[\d\s]*)\s*€\s*\/\s*mois/i,
    /(\d[\d\s]*)\s*€\s*(?:de\s+)?charges?\s*(?:par\s+mois|\/\s*mois|mensuelles?)/i,
  ]

  for (const p of patterns) {
    const m = texte.match(p)
    if (m) {
      const c = extraireNombre(m[1])
      if (c && c > 0 && c < 50000) {
        return c > 500 ? Math.round(c / 12) : c
      }
    }
  }
  return undefined
}

function extraireTaxeFonciere(texte: string): number | undefined {
  const patterns = [
    /taxe\s*foncière\s*:?\s*(\d[\d\s]*)\s*€/i,
    /foncière?\s*:?\s*(\d[\d\s]*)\s*€/i,
    /(\d[\d\s]*)\s*€\s*(?:de\s+)?taxe\s*foncière/i,
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
  return {
    ascenseur: /\bascenseur\b/.test(lower) && !/sans\s+ascenseur/.test(lower),
    balconTerrasse: /\bbalcon\b|\bterrasse\b|\bloggia\b/.test(lower),
    parking: /\bparking\b|\bgarage\b|\bbox\b|place\s+de\s+stationnement/.test(lower),
    cave: /\bcave\b/.test(lower),
  }
}

function extraireTitre(texte: string): string | undefined {
  // Prendre la première ligne non vide qui ressemble à un titre
  const lignes = texte.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  for (const ligne of lignes.slice(0, 10)) {
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
  const texteSafe = texte.length > MAX_TEXT_LENGTH ? texte.substring(0, MAX_TEXT_LENGTH) : texte

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
    dpe: extraireDPE(texteSafe),
    ges: extraireGES(texteSafe),
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
  return count
}
