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
  etage?: number
  chargesMensuelles?: number
  taxeFonciere?: number
  titre?: string
  ascenseur?: boolean
  balconTerrasse?: boolean
  parking?: boolean
  cave?: boolean
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

  // Code postal 5 chiffres
  const cpMatch = texte.match(/\b(\d{5})\b/)
  if (cpMatch) {
    const cp = cpMatch[1]
    const dept = parseInt(cp.substring(0, 2))
    if (dept >= 1 && dept <= 98) {
      result.codePostal = cp
    }
  }

  // Pattern "Ville (75001)" ou "75001 Ville"
  const villeAvecCP = texte.match(/([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[- ][A-ZÀ-Ÿa-zà-ÿ]+)*)\s*\(?\s*(\d{5})\s*\)?/) ||
                      texte.match(/(\d{5})\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[- ][A-ZÀ-Ÿa-zà-ÿ]+)*)/)
  if (villeAvecCP) {
    if (/^\d{5}$/.test(villeAvecCP[1])) {
      result.codePostal = villeAvecCP[1]
      result.ville = villeAvecCP[2]
    } else {
      result.ville = villeAvecCP[1]
      result.codePostal = villeAvecCP[2]
    }
  }

  // Fallback : villes connues
  if (!result.ville) {
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
  }

  // Déduire ville depuis code postal si Paris/Lyon/Marseille
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
export function parseTexteAnnonce(texteColle: string): DonneesExtraites {
  const texte = nettoyerTexte(texteColle)
  if (!texte) return {}

  const localisation = extraireLocalisation(texte)
  const equipements = extraireEquipements(texte)

  const resultat: DonneesExtraites = {
    prix: extrairePrix(texte),
    surface: extraireSurface(texte),
    pieces: extrairePieces(texte),
    chambres: extraireChambres(texte),
    type: extraireType(texte),
    ville: localisation.ville,
    codePostal: localisation.codePostal,
    dpe: extraireDPE(texte),
    etage: extraireEtage(texte),
    chargesMensuelles: extraireCharges(texte),
    taxeFonciere: extraireTaxeFonciere(texte),
    titre: extraireTitre(texte),
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
  if (data.etage !== undefined) count++
  if (data.chargesMensuelles) count++
  if (data.taxeFonciere) count++
  return count
}
