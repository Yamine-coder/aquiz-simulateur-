/**
 * Service d'extraction de données depuis les URLs d'annonces
 * Extrait les infos principales des sites immobiliers
 */

import { parseTexteAnnonce } from '@/lib/scraping/parseTexteAnnonce'
import type { ClasseDPE, NouvelleAnnonce, TypeBienAnnonce } from '@/types/annonces'

// ============================================
// TYPES
// ============================================

export interface ExtractionResult {
  success: boolean
  data?: Partial<NouvelleAnnonce>
  source?: string
  error?: string
}

// ============================================
// DÉTECTION DE SOURCE
// ============================================

export function detecterSource(url: string): string | null {
  const urlLower = url.toLowerCase()
  
  // ── Top 3 (API interne dédiée — bypass anti-bot, JSON complet) ──
  if (urlLower.includes('selogerneuf.com')) return 'seloger'  // SeLoger Neuf (même API)
  if (urlLower.includes('seloger.com')) return 'seloger'      // SeLoger classique
  if (urlLower.includes('leboncoin.fr')) return 'leboncoin'
  if (urlLower.includes('bienici.com') || urlLower.includes('bien-ici.com')) return 'bienici'
  
  // ── Réseaux d'agences (API ou HTML accessible sans anti-bot) ──
  if (urlLower.includes('laforet.com')) return 'laforet'
  if (urlLower.includes('orpi.com')) return 'orpi'
  if (urlLower.includes('century21.fr')) return 'century21'
  if (urlLower.includes('guy-hoquet.com') || urlLower.includes('guyhoquet.com')) return 'guyhoquet'
  if (urlLower.includes('stephaneplaza')) return 'stephaneplaza'
  
  // ── Réseaux de mandataires (HTML / JSON-LD accessibles) ──
  if (urlLower.includes('iadfrance.fr')) return 'iad'
  if (urlLower.includes('capifrance.fr')) return 'capifrance'
  if (urlLower.includes('safti.fr')) return 'safti'
  if (urlLower.includes('optimhome.com')) return 'optimhome'
  
  // ── Portails immobiliers (HTML / JSON-LD accessibles) ──
  if (urlLower.includes('paruvendu.fr')) return 'paruvendu'
  if (urlLower.includes('superimmo.com')) return 'superimmo'
  if (urlLower.includes('avendrealouer.fr')) return 'avendrealouer'
  if (urlLower.includes('green-acres.') || urlLower.includes('greenacres.')) return 'greenacres'
  if (urlLower.includes('meilleursagents.com')) return 'meilleursagents'
  if (urlLower.includes('proprioo.com') || urlLower.includes('hosman.co') || urlLower.includes('hosman.com')) return 'hosman'
  
  // ── Promoteurs / Neuf (HTML / JSON-LD) ──
  if (urlLower.includes('nexity.fr')) return 'nexity'
  if (urlLower.includes('bouygues-immobilier.com')) return 'bouygues'
  if (urlLower.includes('kaufmanbroad.fr')) return 'kaufman'
  
  // ── Agences / Gestion (HTML / SPA) ──
  if (urlLower.includes('foncia.com')) return 'foncia'
  
  // ── Sites protégés (DataDome/Cloudflare — fallback cascade uniquement) ──
  if (urlLower.includes('logic-immo.com')) return 'logic-immo'
  if (urlLower.includes('pap.fr')) return 'pap'
  if (urlLower.includes('ouestfrance-immo.com')) return 'ouestfrance'
  if (urlLower.includes('explorimmo.com')) return 'figaro'  // redirige vers Figaro
  if (urlLower.includes('immo.lefigaro.fr') || urlLower.includes('immobilier.lefigaro.fr')) return 'figaro'
  
  return null
}

// ============================================
// DÉTECTION LOCATION (annonce de loyer, pas d'achat)
// ============================================

/**
 * Détecte si une URL correspond à une annonce de location (et non de vente).
 * Les patterns couvrent les principaux portails immobiliers français.
 */
export function isLocationUrl(url: string): boolean {
  const pathLower = new URL(url).pathname.toLowerCase()
  const patterns = [
    '/location/',           // SeLoger, Bien'ici, Foncia, etc.
    '/locations/',
    '/locations_immobilieres', // LeBonCoin
    '/louer/',              // Laforêt, Century21, Orpi
    '/annonce-location',
    '/detail-location',     // Logic-Immo
    '/a-louer/',
    '/rent/',
    '/colocation/',
  ]
  return patterns.some(p => pathLower.includes(p))
}

// ============================================
// HELPERS PARSING
// ============================================

/** Extrait un nombre d'une chaîne (gère les espaces, €, etc.) */
export function extraireNombre(texte: string): number | null {
  if (!texte) return null
  // Enlever tout sauf chiffres et virgule/point
  const clean = texte.replace(/[^\d,.\s]/g, '').replace(/\s/g, '').replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? null : num
}

/** Extrait la surface en m² */
export function extraireSurface(texte: string): number | null {
  // Cherche des patterns comme "65 m²", "65m2", "65 m2"
  const match = texte.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i)
  if (match) {
    return parseFloat(match[1].replace(',', '.'))
  }
  return extraireNombre(texte)
}

/** Extrait le nombre de pièces */
export function extrairePieces(texte: string): number | null {
  // "3 pièces", "T3", "F3", "3p"
  const matchPieces = texte.match(/(\d+)\s*(?:pièces?|pieces?|p\b)/i)
  if (matchPieces) return parseInt(matchPieces[1])
  
  const matchT = texte.match(/[TF](\d+)/i)
  if (matchT) return parseInt(matchT[1])
  
  return null
}

/** Extrait le nombre de chambres */
export function extraireChambres(texte: string): number | null {
  const match = texte.match(/(\d+)\s*(?:chambres?|ch\b)/i)
  return match ? parseInt(match[1]) : null
}

/** Extrait le DPE */
export function extraireDPE(texte: string): ClasseDPE {
  const match = texte.match(/DPE\s*:?\s*([A-G])/i) || texte.match(/classe\s*(?:énergie|énergétique)?\s*:?\s*([A-G])/i)
  if (match) {
    return match[1].toUpperCase() as ClasseDPE
  }
  return 'NC'
}

/** Extrait le type de bien */
export function extraireTypeBien(texte: string): TypeBienAnnonce {
  const lower = texte.toLowerCase()
  if (lower.includes('maison') || lower.includes('villa') || lower.includes('pavillon')) {
    return 'maison'
  }
  return 'appartement'
}

/** Extrait ville et code postal */
export function extraireLocalisation(texte: string): { ville?: string; codePostal?: string } {
  // Pattern: "Paris (75001)" ou "75001 Paris" ou "Paris 75001"
  const matchCP = texte.match(/(\d{5})/)
  const codePostal = matchCP ? matchCP[1] : undefined
  
  // Enlever le code postal pour avoir la ville
  let ville = texte.replace(/\d{5}/g, '').replace(/[()]/g, '').trim()
  // Nettoyer les caractères spéciaux
  ville = ville.replace(/^[\s,\-]+|[\s,\-]+$/g, '')
  
  return { ville: ville || undefined, codePostal }
}

// ============================================
// EXTRACTION DEPUIS HTML (côté serveur)
// ============================================

/** 
 * Parse le HTML d'une page d'annonce
 * Utilise des patterns génériques qui marchent sur plusieurs sites
 */
export function parseAnnonceHTML(html: string, url: string): Partial<NouvelleAnnonce> {
  const data: Partial<NouvelleAnnonce> = { url }
  
  // ===== PRIX =====
  // Patterns courants pour le prix
  // Note: \d{1,3} au lieu de \d{2,3} pour capturer les prix >= 1 000 000 € (ex: "1 400 000")
  const prixPatterns = [
    /"price":\s*"?(\d[\d\s]*)"?/i,
    /prix["\s:]*(\d[\d\s€]+)/i,
    /(\d{1,3}(?:[\s\u00A0]\d{3})+)\s*€/,  // 1 400 000 € ou 400 000 € (avec espaces normaux ou insécables)
    /(\d{4,8})\s*€/,  // Prix sans espaces: 1400000€
    /"amount":\s*(\d+)/i,
  ]
  
  for (const pattern of prixPatterns) {
    const match = html.match(pattern)
    if (match) {
      const prix = extraireNombre(match[1])
      if (prix && prix > 10000 && prix < 50000000) {
        data.prix = prix
        break
      }
    }
  }
  
  // ===== SURFACE =====
  const surfacePatterns = [
    /"surface":\s*"?(\d+(?:[.,]\d+)?)"?/i,
    /(\d+(?:[.,]\d+)?)\s*m[²2]/i,
    /"area":\s*(\d+)/i,
  ]
  
  for (const pattern of surfacePatterns) {
    const match = html.match(pattern)
    if (match) {
      const surface = extraireSurface(match[1])
      if (surface && surface >= 9 && surface <= 1000) {
        data.surface = surface
        break
      }
    }
  }
  
  // ===== PIECES =====
  const piecesMatch = html.match(/"rooms?":\s*"?(\d+)"?/i) || 
                      html.match(/(\d+)\s*(?:pièces?|pieces?)/i) ||
                      html.match(/[TF](\d)\b/i)
  if (piecesMatch) {
    const pieces = parseInt(piecesMatch[1])
    if (pieces >= 1 && pieces <= 20) {
      data.pieces = pieces
    }
  }
  
  // ===== CHAMBRES =====
  const chambresMatch = html.match(/"bedrooms?":\s*"?(\d+)"?/i) ||
                        html.match(/(\d+)\s*(?:chambres?|ch\.)/i)
  if (chambresMatch) {
    data.chambres = parseInt(chambresMatch[1])
  }
  
  // ===== TYPE =====
  // Ne PAS mettre de default 'appartement' ici — completerDonnees() le fera
  // Sinon on écrase un type 'maison' trouvé par un parser de priorité inférieure
  if (/maison|villa|pavillon/i.test(html)) {
    data.type = 'maison'
  } else if (/appartement|studio|duplex|triplex|loft/i.test(html)) {
    data.type = 'appartement'
  }
  
  // ===== LOCALISATION =====
  // JSON-LD / Schema.org patterns (les plus fiables)
  const jsonLdCityMatch = html.match(/"addressLocality"\s*:\s*"([^"]+)"/i) ||
                          html.match(/"city(?:Name)?"\s*:\s*"([^"]+)"/i) ||
                          html.match(/"locality"\s*:\s*"([^"]+)"/i)
  if (jsonLdCityMatch) {
    data.ville = jsonLdCityMatch[1].trim()
  }
  
  const jsonLdPostalMatch = html.match(/"postalCode"\s*:\s*"?(\d{5})"?/i) ||
                            html.match(/"zipCode"\s*:\s*"?(\d{5})"?/i) ||
                            html.match(/"zip"\s*:\s*"?(\d{5})"?/i)
  if (jsonLdPostalMatch) {
    data.codePostal = jsonLdPostalMatch[1]
  }
  
  // ===== ADRESSE COMPLÈTE =====
  // JSON-LD Schema.org streetAddress (le plus fiable)
  const streetAddressMatch = html.match(/"streetAddress"\s*:\s*"([^"]+)"/i) ||
                             html.match(/"street"\s*:\s*"([^"]+)"/i) ||
                             html.match(/"address"\s*:\s*"([^"]{5,50})"/i)
  if (streetAddressMatch) {
    const adresse = streetAddressMatch[1].trim()
    // Vérifier que c'est une vraie adresse (contient un numéro ou un mot-clé rue/avenue/etc)
    if (/^\d+|rue|avenue|boulevard|allée|impasse|place|chemin|passage|square/i.test(adresse)) {
      data.adresse = adresse
    }
  }
  
  // SeLoger specific - adresse
  if (!data.adresse) {
    const selogerAdresseMatch = html.match(/"address"\s*:\s*\{[^}]*"streetAddress"\s*:\s*"([^"]+)"/i)
    if (selogerAdresseMatch) {
      data.adresse = selogerAdresseMatch[1].trim()
    }
  }
  
  // LeBonCoin specific - adresse
  if (!data.adresse) {
    const lbcAdresseMatch = html.match(/"location"\s*:\s*\{[^}]*"address"\s*:\s*"([^"]+)"/i)
    if (lbcAdresseMatch) {
      data.adresse = lbcAdresseMatch[1].trim()
    }
  }
  
  // Bien'ici specific - adresse
  if (!data.adresse) {
    const bieniciAdresseMatch = html.match(/"street"\s*:\s*"([^"]+)"/i)
    if (bieniciAdresseMatch) {
      data.adresse = bieniciAdresseMatch[1].trim()
    }
  }
  
  // SeLoger specific - patterns améliorés
  if (!data.ville || !data.codePostal) {
    // Pattern SeLoger avec city object
    const selogerCityMatch = html.match(/"city"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i)
    if (selogerCityMatch && !data.ville) {
      data.ville = selogerCityMatch[1]
    }
    
    // Pattern alternatif SeLoger
    const selogerZipMatch = html.match(/"zipCode"\s*:\s*"?(\d{5})"?/i)
    if (selogerZipMatch && !data.codePostal) {
      data.codePostal = selogerZipMatch[1]
    }
    
    // Extraire depuis l'URL SeLoger (ex: /vitry-sur-seine-94/)
    const selogerUrlMatch = url.match(/seloger\.com\/annonces\/[^/]+\/[^/]+\/([a-z-]+)-(\d{2,3})\//i)
    if (selogerUrlMatch) {
      if (!data.ville) {
        // Convertir "vitry-sur-seine" en "Vitry-sur-Seine"
        data.ville = selogerUrlMatch[1]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('-')
      }
      // Le numéro après la ville est le département, pas le code postal complet
    }
  }
  
  // LeBonCoin specific
  if (!data.ville || !data.codePostal) {
    const lbcLocationMatch = html.match(/"location"\s*:\s*\{[^}]*"city"\s*:\s*"([^"]+)"[^}]*"zipcode"\s*:\s*"?(\d{5})"?/i)
    if (lbcLocationMatch) {
      if (!data.ville) data.ville = lbcLocationMatch[1]
      if (!data.codePostal) data.codePostal = lbcLocationMatch[2]
    }
    // Pattern alternatif LeBonCoin
    const lbcAltMatch = html.match(/"city_label"\s*:\s*"([^"]+)"/i)
    if (lbcAltMatch && !data.ville) {
      data.ville = lbcAltMatch[1]
    }
    const lbcZipMatch = html.match(/"zipcode"\s*:\s*"?(\d{5})"?/i)
    if (lbcZipMatch && !data.codePostal) {
      data.codePostal = lbcZipMatch[1]
    }
  }
  
  // Bien'ici specific
  if (!data.ville || !data.codePostal) {
    const bieniciMatch = html.match(/"postalCode"\s*:\s*"(\d{5})"[^}]*"city"\s*:\s*"([^"]+)"/i) ||
                         html.match(/"city"\s*:\s*"([^"]+)"[^}]*"postalCode"\s*:\s*"(\d{5})"/i)
    if (bieniciMatch) {
      if (!data.codePostal) data.codePostal = bieniciMatch[1].match(/\d{5}/)?.[0] || bieniciMatch[2]
      if (!data.ville) data.ville = bieniciMatch[2].match(/\d{5}/) ? bieniciMatch[1] : bieniciMatch[2]
    }
  }
  
  // PAP specific — PAP uses Nuxt.js and has specific CSS classes and data attributes
  if (url.includes('pap.fr')) {
    // PAP prix: class "item-price" or "prix" or data attributes
    if (!data.prix) {
      const papPrix = html.match(/class="[^"]*item-price[^"]*"[^>]*>([^<]+)/i)
        || html.match(/class="[^"]*prix[^"]*"[^>]*>([^<]+)/i)
        || html.match(/data-price="(\d+)"/i)
      if (papPrix) {
        const p = extraireNombre(papPrix[1])
        if (p && p > 10000 && p < 50000000) data.prix = p
      }
    }
    // PAP surface
    if (!data.surface) {
      const papSurf = html.match(/class="[^"]*item-tags[^"]*"[^>]*>[\s\S]*?(\d+(?:[.,]\d+)?)\s*m[²2]/i)
        || html.match(/data-surface="(\d+(?:[.,]\d+)?)"/i)
      if (papSurf) {
        const s = extraireSurface(papSurf[1])
        if (s && s >= 9 && s <= 1000) data.surface = s
      }
    }
    // PAP pieces
    if (!data.pieces) {
      const papPieces = html.match(/data-nb_rooms="(\d+)"/i)
        || html.match(/data-rooms="(\d+)"/i)
      if (papPieces) data.pieces = parseInt(papPieces[1])
    }
    // PAP ville / CP from data attributes
    if (!data.ville) {
      const papVille = html.match(/data-(?:city|ville)="([^"]+)"/i)
      if (papVille) data.ville = papVille[1]
    }
    if (!data.codePostal) {
      const papCp = html.match(/data-(?:zipcode|cp)="(\d{5})"/i)
        || html.match(/data-postal[_-]?code="(\d{5})"/i)
      if (papCp) data.codePostal = papCp[1]
    }
    // PAP DPE from SVG or data attributes
    if (!data.dpe) {
      const papDpe = html.match(/data-dpe="([A-G])"/i)
        || html.match(/class="[^"]*dpe-letter[^"]*"[^>]*>([A-G])</i)
        || html.match(/diagnosticEnergetique[^>]*>[^A-G]*([A-G])\b/i)
      if (papDpe) data.dpe = papDpe[1].toUpperCase() as ClasseDPE
    }
    if (!data.ges) {
      const papGes = html.match(/data-ges="([A-G])"/i)
        || html.match(/class="[^"]*ges-letter[^"]*"[^>]*>([A-G])</i)
      if (papGes) data.ges = papGes[1].toUpperCase() as ClasseDPE
    }
    // PAP type from URL
    if (!data.type) {
      if (url.match(/maison|villa|pavillon/i)) data.type = 'maison' as TypeBienAnnonce
      else if (url.match(/appartement/i)) data.type = 'appartement' as TypeBienAnnonce
    }
    // PAP images
    if (!data.imageUrl) {
      const papImg = html.match(/class="[^"]*owl-thumb-item[^"]*"[^>]*>[\s\S]*?src="(https?:\/\/photos[^"]+)"/i)
        || html.match(/data-src="(https?:\/\/photos\.pap\.fr[^"]+)"/i)
        || html.match(/src="(https?:\/\/photos\.pap\.fr\/[^"]+)"/i)
      if (papImg) data.imageUrl = papImg[1].replace(/\/thumb\//, '/')
    }
  }

  if (!data.ville || !data.codePostal) {
    const papMatch = html.match(/data-(?:city|ville)="([^"]+)"/i)
    if (papMatch && !data.ville) {
      data.ville = papMatch[1]
    }
    const papCpMatch = html.match(/data-(?:zipcode|cp)="(\d{5})"/i)
    if (papCpMatch && !data.codePostal) {
      data.codePostal = papCpMatch[1]
    }
  }
  
  // Pattern générique dans le titre ou description
  if (!data.codePostal) {
    // Cherche un code postal à 5 chiffres typique français
    const genericCpMatch = html.match(/(?:^|[^\d])(\d{5})(?:[^\d]|$)/g)
    if (genericCpMatch) {
      for (const match of genericCpMatch) {
        const cp = match.replace(/\D/g, '')
        // Valider que c'est un code postal français valide (01xxx à 98xxx)
        const cpNum = parseInt(cp.substring(0, 2))
        if (cpNum >= 1 && cpNum <= 98) {
          data.codePostal = cp
          break
        }
      }
    }
  }
  
  // Extraire le TITRE tôt — nécessaire pour le fallback ville-depuis-titre ci-dessous
  // (sera éventuellement écrasé par un titre plus précis trouvé ultérieurement via JSON-LD)
  if (!data.titre) {
    const earlyTitreMatch = html.match(/<title[^>]*>([^<]+)</i) ||
                            html.match(/<h1[^>]*>([^<]+)</i)
    if (earlyTitreMatch) {
      data.titre = earlyTitreMatch[1]
        .replace(/\s+/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
        .substring(0, 200)
    }
  }
  
  // Extraire la ville depuis le titre si on a toujours pas
  if (!data.ville && data.titre) {
    // Liste des grandes villes françaises pour matching
    const GRANDES_VILLES = [
      'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Montpellier',
      'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Saint-Étienne',
      'Le Havre', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne',
      'Clermont-Ferrand', 'Le Mans', 'Aix-en-Provence', 'Brest', 'Tours',
      'Amiens', 'Limoges', 'Annecy', 'Perpignan', 'Boulogne-Billancourt',
      'Metz', 'Besançon', 'Orléans', 'Rouen', 'Mulhouse', 'Caen', 'Nancy',
      'Saint-Denis', 'Argenteuil', 'Montreuil', 'Roubaix', 'Tourcoing',
      'Dunkerque', 'Avignon', 'Créteil', 'Poitiers', 'Nanterre', 'Versailles',
      'Courbevoie', 'Vitry-sur-Seine', 'Colombes', 'Asnières-sur-Seine',
      'Aulnay-sous-Bois', 'Rueil-Malmaison', 'Champigny-sur-Marne',
      'Aubervilliers', 'Saint-Maur-des-Fossés', 'Drancy', 'Issy-les-Moulineaux',
      'Levallois-Perret', 'Noisy-le-Grand', 'Antony', 'Neuilly-sur-Seine',
      'Cergy', 'Vénissieux', 'Clichy', 'Ivry-sur-Seine', 'La Rochelle',
      'Calais', 'Saint-Quentin', 'Béziers', 'Ajaccio', 'Bastia', 'Cannes',
      'Antibes', 'Mérignac', 'Pessac', 'Hyères', 'Fréjus', 'Lorient', 'Quimper',
      'Troyes', 'Sarcelles', 'Villejuif', 'Pantin', 'Bobigny', 'Bondy',
      'Fontenay-sous-Bois', 'Clamart', 'Chelles', 'Le Blanc-Mesnil', 'Évry',
      'Saint-Ouen', 'Meaux', 'Sevran', 'Montrouge', 'Suresnes', 'Massy'
    ]
    
    // Chercher une ville connue dans le titre
    const titreLower = data.titre.toLowerCase()
    for (const ville of GRANDES_VILLES) {
      if (titreLower.includes(ville.toLowerCase())) {
        data.ville = ville
        break
      }
    }
    
    // Si toujours pas trouvé, essayer le pattern "Ville (75001)"
    if (!data.ville) {
      const titleLocMatch = data.titre.match(/([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[-][A-ZÀ-Ÿ]?[a-zà-ÿ]+)*)\s*\(?(\d{5})\)?/) ||
                            data.titre.match(/(\d{5})\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[-][A-ZÀ-Ÿ]?[a-zà-ÿ]+)*)/)
      if (titleLocMatch) {
        if (/^\d{5}$/.test(titleLocMatch[1])) {
          if (!data.codePostal) data.codePostal = titleLocMatch[1]
          data.ville = titleLocMatch[2]
        } else {
          data.ville = titleLocMatch[1]
          if (!data.codePostal) data.codePostal = titleLocMatch[2]
        }
      }
    }
  }
  
  // Déduire la ville depuis le code postal pour Paris/Lyon/Marseille
  if (!data.ville && data.codePostal) {
    const dept = data.codePostal.substring(0, 2)
    if (dept === '75') data.ville = 'Paris'
    else if (dept === '69') data.ville = 'Lyon'
    else if (dept === '13') data.ville = 'Marseille'
  }
  
  // Nettoyer la ville
  if (data.ville) {
    // Ne pas mettre le titre entier comme ville
    // Détecter si c'est un titre d'annonce plutôt qu'une ville
    const villeInvalide = 
      data.ville.length > 40 ||
      data.ville.includes('€') ||
      data.ville.includes('m²') ||
      data.ville.includes('m2') ||
      /appartement|maison|vente|achat|pièces?|chambres?/i.test(data.ville) ||
      /T\d|F\d/i.test(data.ville) ||
      /\d+\s*(?:pièces?|chambres?|m)/i.test(data.ville)
    
    if (villeInvalide) {
      data.ville = undefined
    } else {
      data.ville = data.ville
        .replace(/\d{5}/g, '') // Enlever les codes postaux
        .replace(/[()]/g, '')
        .replace(/^\s*[-,]\s*|\s*[-,]\s*$/g, '')
        .trim()
      
      // Capitaliser correctement (gérer les tirets)
      if (data.ville) {
        data.ville = data.ville
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('-')
          .split(' ')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
      }
    }
  }
  
  // ===== DPE =====
  // IMPORTANT: Patterns ordonnés du plus fiable au moins fiable.
  // On évite les patterns trop larges qui capturent les lettres de l'échelle DPE (A, B, C...)
  // au lieu de la valeur réelle. SeLoger affiche un barème avec data-dpe="A", data-dpe="B" etc.
  const dpeMatch =
    // 1. JSON structuré : "dpe":"D" ou "energyClass":"D" (le plus fiable)
    html.match(/"(?:dpe|energyClass|energy[_.]?[rR]ating|energyPerformanceDiagnostic|diagnosticPerformanceEnergetique)"\s*:\s*"([A-G])"/i) ||
    // 2. JSON sans guillemets sur la valeur : "dpe": D ou "energyClass":D
    html.match(/"(?:dpe|energyClass|energyPerformanceDiagnostic)"\s*:\s*([A-G])\b/i) ||
    // 3. Attribut HTML indiquant la valeur active/courante
    html.match(/data-(?:current-?dpe|dpe-?value|dpe-?class|energy-?class|active-?dpe)[=:]\s*"?([A-G])"?/i) ||
    // 4. Texte visible : "classe énergie : D", "Classe énergétique : D"
    html.match(/classe\s*(?:énergie|énergétique)\s*:?\s*([A-G])\b/i) ||
    // 5. Texte visible avec séparateur explicite : "DPE : D" (le : est OBLIGATOIRE pour éviter l'échelle)
    html.match(/\bDPE\s*:\s*([A-G])\b/i) ||
    // 6. SeLoger format : "(DPE) D" — la parenthèse fermante avant la lettre
    html.match(/\(DPE\)\s*([A-G])\b/i) ||
    html.match(/DPE\)\s*([A-G])\b/i) ||
    // 7. Texte long : "diagnostic de performance énergétique (DPE) D"
    html.match(/performance\s*[eé]nerg[eé]tique\s*(?:\(DPE\))?\s*:?\s*([A-G])\b/i)
  // Ne PAS mettre dpe = 'NC' ici — completerDonnees() le fera en dernier recours
  // Sinon on écrase un DPE valide trouvé par un parser de priorité inférieure (meta tags)
  if (dpeMatch) {
    data.dpe = dpeMatch[1].toUpperCase() as ClasseDPE
  }
  
  // ===== GES =====
  const gesMatch =
    // 1. JSON structuré (le plus fiable)
    html.match(/"(?:ges|ghg|greenHouseGas|emissionClass|greenhouseGasEmission)"\s*:\s*"([A-G])"/i) ||
    // 2. JSON sans guillemets
    html.match(/"(?:ges|greenhouseGasEmission|emissionClass)"\s*:\s*([A-G])\b/i) ||
    // 3. Attribut HTML valeur active
    html.match(/data-(?:current-?ges|ges-?value|ges-?class|emission-?class)[=:]\s*"?([A-G])"?/i) ||
    // 4. Texte visible avec label explicite
    html.match(/gaz\s*(?:à\s*)?effet\s*(?:de\s*)?serre\s*(?:\(GES\))?\s*:?\s*([A-G])\b/i) ||
    html.match(/classe\s*(?:GES|climat)\s*:?\s*([A-G])\b/i) ||
    // 5. Texte "GES : D" (: obligatoire)
    html.match(/\bGES\s*:\s*([A-G])\b/i) ||
    // 6. SeLoger format : "(GES) D" — la parenthèse fermante avant la lettre
    html.match(/\(GES\)\s*([A-G])\b/i) ||
    html.match(/GES\)\s*([A-G])\b/i) ||
    // 7. Texte long : "émission de gaz à effet de serre (GES) D"
    html.match(/gaz\s*[àa]\s*effet\s*de\s*serre\s*\(GES\)\s*([A-G])\b/i)
  if (gesMatch) {
    data.ges = gesMatch[1].toUpperCase() as ClasseDPE
  }
  
  // ===== DESCRIPTION =====
  // JSON-LD description (la plus riche)
  const descJsonMatch = html.match(/"description"\s*:\s*"([^"]{50,2000})"/i)
  if (descJsonMatch) {
    data.description = descJsonMatch[1]
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, '')
      .replace(/\\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000)
  }
  // Fallback: og:description
  if (!data.description) {
    const ogDescMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]{50,})"/i) ||
                        html.match(/<meta[^>]+content="([^"]{50,})"[^>]+property="og:description"/i)
    if (ogDescMatch) {
      data.description = ogDescMatch[1].substring(0, 1000)
    }
  }
  
  // ===== ANNÉE CONSTRUCTION =====
  const anneePatterns: RegExp[] = [
    // JSON-LD / Schema.org / structured data
    /"yearBuilt"\s*:\s*"?((?:19|20)\d{2})"?/i,
    /"constructionYear"\s*:\s*"?((?:19|20)\d{2})"?/i,
    /"yearOfConstruction"\s*:\s*"?((?:19|20)\d{2})"?/i,
    /"dateBuilt"\s*:\s*"?((?:19|20)\d{2})"?/i,
    /"buildYear"\s*:\s*"?((?:19|20)\d{2})"?/i,
    /"anneeConstruction"\s*:\s*"?((?:19|20)\d{2})"?/i,
    /"anneeDeCnstruction"\s*:\s*"?((?:19|20)\d{2})"?/i,
    // Bien'ici: buildPeriod, SeLoger: yearOfConstruction
    /"buildPeriod"\s*:\s*"?((?:19|20)\d{2})"?/i,
    // LeBonCoin: {"key": "construction_year", "value": "1985"}
    /"construction_year"[^}]*"value"\s*:\s*"?((?:19|20)\d{2})"?/i,
    /"value"\s*:\s*"?((?:19|20)\d{2})"?[^}]*"construction_year"/i,
    // Attributs HTML data-*
    /data-(?:year|annee|construction)[^"]*="((?:19|20)\d{2})"/i,
    // SeLoger / sites avec label et valeur séparés par des tags HTML
    /[Aa]nn[ée]e\s*(?:de\s*)?construction[^<]{0,5}<[^>]*>[^<]*<[^>]*>\s*((?:18|19|20)\d{2})/,
    /[Aa]nn[ée]e\s*(?:de\s*)?construction(?:<[^>]*>|\s)*?((?:18|19|20)\d{2})/,
    // Texte libre dans le HTML
    /(?:construit|construction|année)\s*(?:en\s*)?:?\s*((?:19|20)\d{2})/i,
    /(?:bâti|édifié|livré)\s*(?:en\s*)?((?:19|20)\d{2})/i,
    /(?:immeuble|résidence|copropriété|bâtiment)\s+(?:de|du)\s+((?:19|20)\d{2})/i,
    /livraison\s*(?:prévue\s*)?(?:T\d\s*)?((?:19|20)\d{2})/i,
    // Très ancien (1800+)
    /[Aa]nn[ée]e\s*(?:de\s*)?construction\D{0,30}((?:18|19|20)\d{2})/,
  ]
  for (const pattern of anneePatterns) {
    const match = html.match(pattern)
    if (match) {
      const annee = parseInt(match[1])
      if (annee >= 1800 && annee <= 2030) {
        data.anneeConstruction = annee
        break
      }
    }
  }
  
  // ===== ÉTAGES TOTAL =====
  const etagesTotalPatterns = [
    /"nbFloors"\s*:\s*"?(\d+)"?/i,
    /"numberOfFloors"\s*:\s*"?(\d+)"?/i,
    /"totalFloors"\s*:\s*"?(\d+)"?/i,
    // Format "8ème étage/9 étages" ou "8e étage / 9" → capture le total
    /\d+(?:er?|[eè]me?)?\s*étage\s*\/\s*(\d+)/i,
    /\d+\s*\/\s*(\d+)\s*étages?/i,
    /(?:immeuble|bâtiment)\s*(?:de\s*)?(?:R\+)?(\d+)\s*étages?/i,
  ]
  for (const pattern of etagesTotalPatterns) {
    const match = html.match(pattern)
    if (match) {
      const n = parseInt(match[1])
      if (n >= 1 && n <= 60) {
        data.etagesTotal = n
        break
      }
    }
  }
  
  // ===== CHARGES MENSUELLES =====
  // Priorité aux formats les plus explicites
  const chargesPatterns = [
    // Format explicite "Charges annuelles : 1768.00 euros" (prioritaire)
    /charges?\s*annuelles?\s*:?\s*(\d[\d\s]*(?:[.,]\d+)?)\s*(?:€|euros?)/i,
    // SeLoger format: "Charges de copropriété3 168 €/an" ou similaire
    /charges?\s*(?:de\s+)?copropriété\s*:?\s*(\d[\d\s]*(?:[.,]\d+)?)\s*(?:€|euros?)?\s*(?:\/\s*an)?/i,
    // SeLoger specific JSON patterns
    /"charges?":\s*(\d+)/i,
    /"monthlyCharges?":\s*"?(\d+)"?/i,
    /"provisionCharges":\s*"?(\d+)"?/i,
    /"condominiumFees":\s*"?(\d+)"?/i,
    // Patterns textuels mensuels
    /charges?\s*mensuelles?\s*:?\s*(\d+(?:\s?\d+)*)\s*(?:€|euros?)/i,
    /provisions?\s*sur\s*charges?\s*:?\s*(\d+(?:\s?\d+)*)\s*(?:€|euros?)/i,
    /charges?\s*:\s*(\d+(?:\s?\d+)*)\s*(?:€|euros?)\s*\/\s*mois/i,
    // Pattern avec "par mois"
    /(\d+(?:\s?\d+)*)\s*(?:€|euros?)\s*(?:de\s+)?charges?\s*(?:par\s+mois|\/\s*mois|mensuelles?)/i,
    // Pattern sans symbole : "charges mensuelles : 235"
    /charges?\s*mensuelles?\s*:?\s*(\d+(?:\s?\d+)*)\b(?!\s*(?:lots?|copropriétaire))/i,
  ]
  
  for (const pattern of chargesPatterns) {
    const match = html.match(pattern)
    if (match) {
      const charges = extraireNombre(match[1])
      if (charges && charges > 0 && charges < 50000) {
        // Détecter la périodicité depuis le contexte du match
        const mIdx = html.indexOf(match[0])
        const ctx = html.slice(Math.max(0, mIdx - 30), mIdx + match[0].length + 30).toLowerCase()
        const isAnnual = /annuelles?|copropri[eé]t[eé]|par\s*an|\/?\s*an|condoannual/i.test(ctx)
        const isMonthly = /mensuelles?|par\s*mois|\/?\s*mois/i.test(ctx)

        if (isMonthly) {
          data.chargesMensuelles = Math.round(charges)
        } else if (isAnnual) {
          data.chargesMensuelles = Math.round(charges / 12)
        } else {
          // Heuristique : > 1200€ sans contexte → probablement annuel
          data.chargesMensuelles = charges > 1200 ? Math.round(charges / 12) : Math.round(charges)
        }
        break
      }
    }
  }
  
  // ===== TAXE FONCIÈRE =====
  const taxePatterns = [
    // SeLoger specific
    /"taxeFonciere":\s*"?(\d+)"?/i,
    /"propertyTax":\s*"?(\d+)"?/i,
    /"landTax":\s*"?(\d+)"?/i,
    // Patterns textuels (€ ou "euros")
    /taxe\s*foncière\s*:?\s*(\d+(?:\s?\d+)*)\s*(?:€|euros?)\b/i,
    /foncier(?:e|ère)?\s*:?\s*(\d+(?:\s?\d+)*)\s*(?:€|euros?)(?:\s*\/\s*an)?/i,
    /taxe\s*foncière\s*annuelle?\s*:?\s*(\d+(?:\s?\d+)*)\s*(?:€|euros?)\b/i,
    /(\d+(?:\s?\d+)*)\s*(?:€|euros?)\s*(?:de\s+)?taxe\s*foncière/i,
  ]
  
  for (const pattern of taxePatterns) {
    const match = html.match(pattern)
    if (match) {
      const taxe = extraireNombre(match[1])
      if (taxe && taxe > 0 && taxe < 20000) {
        data.taxeFonciere = taxe
        break
      }
    }
  }
  
  // ===== ÉTAGE =====
  const etagePatterns = [
    /(\d+)(?:er?|e|ème)?\s*étage/i,
    /"floor":\s*"?(\d+)"?/i,
    /"etage":\s*"?(\d+)"?/i,
    /étage\s*:?\s*(\d+)/i,
  ]
  
  for (const pattern of etagePatterns) {
    const match = html.match(pattern)
    if (match) {
      const etage = parseInt(match[1])
      if (etage >= 0 && etage <= 50) {
        data.etage = etage
        break
      }
    }
  }
  
  // RDC
  if (data.etage === undefined && /rez[- ]de[- ]chauss[ée]e|rdc/i.test(html)) {
    data.etage = 0
  }
  
  // ===== ÉQUIPEMENTS =====
  // Pour les checks basés sur le texte (non-JSON), on utilise uniquement la description
  // et le titre pour éviter les faux positifs depuis le footer/nav/pubs.
  // Les patterns JSON restent sur le HTML complet (données structurées fiables).
  let contentText = ((data.description || '') + ' ' + (data.titre || '')).toLowerCase()

  // Fallback : si aucune description/titre n'a été trouvé, utiliser le texte du body
  if (contentText.trim().length < 5) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
      contentText = bodyMatch[1].replace(/<[^>]+>/g, ' ').toLowerCase()
    }
  }
  
  // Ascenseur
  if (/"ascenseur"\s*:\s*true/i.test(html) ||
      /"elevator"\s*:\s*true/i.test(html) ||
      /"hasElevator"\s*:\s*true/i.test(html) ||
      /ascenseur/.test(contentText) && !/sans\s+ascenseur/.test(contentText)) {
    data.ascenseur = true
  }
  
  // Balcon / Terrasse
  if (/"balcon"\s*:\s*true/i.test(html) ||
      /"terrasse"\s*:\s*true/i.test(html) ||
      /"balcony"\s*:\s*true/i.test(html) ||
      /"terrace"\s*:\s*true/i.test(html) ||
      /"hasBalcony"\s*:\s*true/i.test(html) ||
      /"hasTerrace"\s*:\s*true/i.test(html) ||
      /\bbalcon\b/.test(contentText) ||
      /\bterrasse\b/.test(contentText) ||
      /\bloggia\b/.test(contentText)) {
    data.balconTerrasse = true
  }
  
  // Parking / Garage
  if (/"parking"\s*:\s*true/i.test(html) ||
      /"garage"\s*:\s*true/i.test(html) ||
      /"hasParking"\s*:\s*true/i.test(html) ||
      /"hasGarage"\s*:\s*true/i.test(html) ||
      /"parkingSpace"\s*:\s*[1-9]/i.test(html) ||
      /\bparking\b/.test(contentText) ||
      /\bgarage\b/.test(contentText) ||
      /\bbox\b/.test(contentText) ||
      /place\s+de\s+stationnement/.test(contentText)) {
    data.parking = true
  }
  
  // Cave
  if (/"cave"\s*:\s*true/i.test(html) ||
      /"cellar"\s*:\s*true/i.test(html) ||
      /"hasCellar"\s*:\s*true/i.test(html) ||
      /\bcave\b/.test(contentText) && !/cave à vin/.test(contentText)) {
    data.cave = true
  }
  
  // ===== SALLES DE BAINS =====
  const sdbPatterns = [
    /"(?:nb_?bathrooms?|nb_?shower_?rooms?|bathrooms?)"\s*:\s*"?(\d+)"?/i,
    /"(?:nbSallesBains|numberOfBathrooms|sallesDeBain)"\s*:\s*"?(\d+)"?/i,
    /(\d+)\s*(?:salles?\s*(?:de\s*)?bains?|salles?\s*d['']eau|sdb)/i,
    /salles?\s*(?:de\s*)?bains?\s*:?\s*(\d+)/i,
  ]
  for (const pattern of sdbPatterns) {
    const match = html.match(pattern)
    if (match) {
      const n = parseInt(match[1])
      if (n >= 1 && n <= 10) {
        data.nbSallesBains = n
        break
      }
    }
  }
  
  // ===== ORIENTATION =====
  const orientationPatterns = [
    /"(?:exposure|orientation)"\s*:\s*"([^"]+)"/i,
    /"(?:exposure|orientation)"[^}]*"value_?label"\s*:\s*"([^"]+)"/i,
    /(?:orientation|exposé|exposition)\s*:?\s*((?:plein\s*)?(?:nord|sud|est|ouest)(?:\s*[/\-]\s*(?:nord|sud|est|ouest))?)/i,
    /(?:double\s*exposition)\s*:?\s*((?:nord|sud|est|ouest)\s*[/\-]\s*(?:nord|sud|est|ouest))/i,
    // "DOUBLE EXPOSITION" sans direction spécifique
    /(double\s*exposition)/i,
  ]
  for (const pattern of orientationPatterns) {
    const match = html.match(pattern)
    if (match && match[1].length <= 30) {
      data.orientation = match[1].trim()
      break
    }
  }
  
  // ===== TITRE =====
  const titreMatch = html.match(/<title[^>]*>([^<]+)</i) ||
                     html.match(/"title":\s*"([^"]+)"/i) ||
                     html.match(/<h1[^>]*>([^<]+)</i)
  if (titreMatch) {
    data.titre = titreMatch[1]
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
      .substring(0, 200)
  }
  
  // ===== IMAGE =====
  const imageMatch = html.match(/"image(?:Url)?":\s*"([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i) ||
                     html.match(/og:image["\s]+content="([^"]+)"/i) ||
                     html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
  if (imageMatch) {
    data.imageUrl = imageMatch[1]
  }
  
  // ===== COORDONNÉES GPS =====
  // JSON-LD GeoCoordinates — courant sur SeLoger, LeBonCoin, Bien'ici
  if (!data.latitude || !data.longitude) {
    const latMatch = html.match(/"(?:latitude|lat)"\s*:\s*"?([-]?\d+(?:\.\d+)?)"?/i)
    const lngMatch = html.match(/"(?:longitude|lng)"\s*:\s*"?([-]?\d+(?:\.\d+)?)"?/i)
    if (latMatch && lngMatch) {
      const lat = parseFloat(latMatch[1])
      const lng = parseFloat(lngMatch[1])
      // Vérifier que ce sont des coordonnées en France (métropole + DOM-TOM)
      if (lat >= -22 && lat <= 52 && lng >= -62 && lng <= 56 && lat !== 0 && lng !== 0) {
        data.latitude = lat
        data.longitude = lng
      }
    }
  }
  
  return data
}

// ============================================
// EXTRACTION DEPUIS JSON-LD (Schema.org)
// ============================================

/**
 * Parse les blocs <script type="application/ld+json"> pour extraire les données structurées.
 * Les sites immobiliers majeurs (SeLoger, LeBonCoin, Bien'ici) embarquent souvent
 * leurs données en Schema.org, ce qui est la source la plus fiable.
 */
export function parseJsonLd(html: string): Partial<NouvelleAnnonce> {
  const data: Partial<NouvelleAnnonce> = {}
  
  // Trouver tous les blocs JSON-LD
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonStr = match[1].trim()
      const json = JSON.parse(jsonStr) as Record<string, unknown>
      
      // Gérer les tableaux et les objets simples
      const items = Array.isArray(json) ? json : [json]
      
      for (const item of items) {
        extractFromJsonLdItem(item as Record<string, unknown>, data)
        // Aussi checker @graph (utilisé par SeLoger, Schema.org standard)
        if (Array.isArray((item as Record<string, unknown>)['@graph'])) {
          for (const graphItem of (item as Record<string, unknown>)['@graph'] as Record<string, unknown>[]) {
            extractFromJsonLdItem(graphItem, data)
          }
        }
      }
    } catch {
      // JSON invalide, on skip silencieusement
    }
  }
  
  return data
}

/**
 * Extraire les données d'un item JSON-LD (Schema.org)
 * Supporte : Product, RealEstateListing, Accommodation, Apartment, House, Offer, Residence
 */
function extractFromJsonLdItem(item: Record<string, unknown>, data: Partial<NouvelleAnnonce>): void {
  const type = String(item['@type'] || '')
  
  // Types pertinents pour l'immobilier
  const isRelevant = /Product|RealEstateListing|Accommodation|Apartment|House|Residence|SingleFamilyResidence|Offer|Place/i.test(type)
  if (!isRelevant && type !== '') return
  
  // ===== PRIX =====
  if (!data.prix) {
    const offers = item.offers as Record<string, unknown> | Record<string, unknown>[] | undefined
    const offer = Array.isArray(offers) ? offers[0] : offers
    const price = offer?.price ?? offer?.lowPrice ?? item.price
    if (price !== undefined) {
      const n = typeof price === 'number' ? price : parseInt(String(price).replace(/\D/g, ''))
      if (n > 10000 && n < 50000000) data.prix = n
    }
  }
  
  // ===== TITRE =====
  if (!data.titre && item.name) {
    data.titre = String(item.name).substring(0, 200)
  }
  
  // ===== DESCRIPTION =====
  if (!data.description && item.description) {
    data.description = String(item.description)
      .replace(/\\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000)
  }
  
  // ===== IMAGE =====
  if (!data.imageUrl) {
    const img = item.image ?? item.photo ?? (item.images as unknown[])?.[0]
    if (typeof img === 'string' && img.startsWith('http')) {
      data.imageUrl = img
    } else if (typeof img === 'object' && img !== null) {
      const imgObj = img as Record<string, unknown>
      const imgUrl = imgObj.url ?? imgObj.contentUrl ?? imgObj.src
      if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
        data.imageUrl = imgUrl
      }
    }
  }
  
  // ===== SURFACE =====
  if (!data.surface) {
    const floorSize = item.floorSize as Record<string, unknown> | string | number | undefined
    let surfaceVal: number | undefined
    if (typeof floorSize === 'object' && floorSize !== null) {
      surfaceVal = parseFloat(String(floorSize.value || '0'))
    } else if (floorSize !== undefined) {
      surfaceVal = parseFloat(String(floorSize))
    }
    // Fallback: numberOfRooms n'est pas la surface, mais livingArea l'est
    if (!surfaceVal) {
      const livingArea = item.livingArea ?? item.area ?? item.surfaceArea
      if (livingArea !== undefined) {
        surfaceVal = parseFloat(String(typeof livingArea === 'object' ? (livingArea as Record<string, unknown>).value : livingArea))
      }
    }
    if (surfaceVal && surfaceVal >= 9 && surfaceVal <= 2000) {
      data.surface = surfaceVal
    }
  }
  
  // ===== PIÈCES =====
  if (!data.pieces && item.numberOfRooms) {
    const n = parseInt(String(item.numberOfRooms))
    if (n >= 1 && n <= 20) data.pieces = n
  }
  
  // ===== CHAMBRES =====
  if (!data.chambres) {
    const bedrooms = item.numberOfBedrooms ?? item.bedrooms
    if (bedrooms !== undefined) {
      const n = parseInt(String(bedrooms))
      if (n >= 0 && n <= 20) data.chambres = n
    }
  }
  
  // ===== LOCALISATION =====
  const address = (item.address ?? (item.location as Record<string, unknown>)?.address) as Record<string, unknown> | string | undefined
  if (address && typeof address === 'object') {
    if (!data.ville && address.addressLocality) {
      data.ville = String(address.addressLocality).trim()
    }
    if (!data.codePostal && address.postalCode) {
      const cp = String(address.postalCode)
      if (/^\d{5}$/.test(cp)) data.codePostal = cp
    }
    if (!data.adresse && address.streetAddress) {
      data.adresse = String(address.streetAddress).trim()
    }
  }
  
  // Location directe (LeBonCoin format)
  const location = item.location as Record<string, unknown> | undefined
  if (location && typeof location === 'object') {
    if (!data.ville && location.city) data.ville = String(location.city)
    if (!data.codePostal && location.zipcode) {
      const cp = String(location.zipcode)
      if (/^\d{5}$/.test(cp)) data.codePostal = cp
    }
  }
  
  // ===== DPE =====
  if (!data.dpe) {
    const dpe = item.energyClass ?? item.energyRating ?? item.dpe ?? item.energyPerformance ??
                item.energyPerformanceDiagnostic ?? item.diagnosticPerformanceEnergetique
    if (typeof dpe === 'string' && /^[A-G]$/i.test(dpe)) {
      data.dpe = dpe.toUpperCase() as ClasseDPE
    }
  }
  
  // ===== GES =====
  if (!data.ges) {
    const ges = item.emissionClass ?? item.ghgEmission ?? item.ges ?? item.greenHouseGas ??
                item.greenhouseGasEmission
    if (typeof ges === 'string' && /^[A-G]$/i.test(ges)) {
      data.ges = ges.toUpperCase() as ClasseDPE
    }
  }
  
  // ===== TYPE DE BIEN =====
  if (!data.type) {
    if (/House|SingleFamilyResidence|villa|maison|pavillon/i.test(type)) {
      data.type = 'maison'
    } else if (/Apartment|appartement/i.test(type)) {
      data.type = 'appartement'
    }
    // Aussi checker dans le nom/titre
    if (!data.type && item.name) {
      const name = String(item.name).toLowerCase()
      if (/maison|villa|pavillon/.test(name)) data.type = 'maison'
      else if (/appartement|studio|duplex|triplex/.test(name)) data.type = 'appartement'
    }
  }
  
  // ===== ANNÉE CONSTRUCTION =====
  if (!data.anneeConstruction) {
    const year = item.yearBuilt ?? item.constructionYear ?? item.dateBuilt ?? item.buildYear ??
                 item.yearOfConstruction ?? item.anneeConstruction ?? item.anneeDeCnstruction ??
                 item.buildPeriod
    if (year !== undefined) {
      const n = parseInt(String(year))
      if (n >= 1800 && n <= 2030) data.anneeConstruction = n
    }
  }
  
  // ===== ÉTAGE =====
  if (data.etage === undefined) {
    const floor = item.floorLevel ?? item.floor ?? item.etage
    if (floor !== undefined) {
      const n = parseInt(String(floor))
      if (n >= 0 && n <= 50) data.etage = n
    }
  }
  
  // ===== CHARGES =====
  if (!data.chargesMensuelles) {
    const charges = item.monthlyCharges ?? item.condominiumFees ?? item.charges
    if (charges !== undefined) {
      const n = parseInt(String(charges))
      if (n > 0 && n < 5000) data.chargesMensuelles = n
    }
  }
  
  // ===== SALLES DE BAINS =====
  if (!data.nbSallesBains) {
    const sdb = item.numberOfBathroomsTotal ?? item.numberOfBathrooms ?? item.bathrooms ??
                item.nbSallesBains ?? item.nb_bathrooms
    if (sdb !== undefined) {
      const n = parseInt(String(sdb))
      if (n >= 1 && n <= 10) data.nbSallesBains = n
    }
  }
  
  // ===== ORIENTATION =====
  if (!data.orientation) {
    const orient = item.exposure ?? item.orientation ?? item.facing
    if (typeof orient === 'string' && orient.length <= 30) {
      data.orientation = orient.trim()
    }
  }
}

// ============================================
// EXTRACTION DEPUIS __NEXT_DATA__ (Next.js)
// ============================================

/**
 * Parse le bloc <script id="__NEXT_DATA__"> pour extraire les données structurées.
 * SeLoger et d'autres sites immobiliers utilisent Next.js et embarquent les props
 * de la page dans ce bloc. C'est la source la plus fiable car c'est le même JSON
 * que le serveur utilise pour hydrater la page.
 */
export function parseNextData(html: string): Partial<NouvelleAnnonce> {
  const data: Partial<NouvelleAnnonce> = {}
  
  // ── Next.js: __NEXT_DATA__ ──
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1])
      extractFromNestedJson(json, data, 0)
    } catch { /* JSON invalide */ }
  }
  
  // ── Nuxt.js: window.__NUXT__ (PAP, etc.) ──
  if (!nextDataMatch) {
    const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/i)
      || html.match(/window\.__NUXT_DATA__\s*=\s*(\[[\s\S]*?\])\s*;?\s*<\/script>/i)
    if (nuxtMatch) {
      try {
        const json = JSON.parse(nuxtMatch[1])
        extractFromNestedJson(json, data, 0)
      } catch { /* JSON invalide */ }
    }
  }

  // ── Vue.js SPA: window.__INITIAL_STATE__ / __APP_STATE__ ──
  if (Object.keys(data).length <= 1) {
    const spaPatterns = [
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/i,
      /window\.__APP_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/i,
      /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/i,
    ]
    for (const pattern of spaPatterns) {
      const match = html.match(pattern)
      if (match) {
        try {
          const json = JSON.parse(match[1])
          extractFromNestedJson(json, data, 0)
        } catch { /* JSON invalide */ }
        break
      }
    }
  }
  
  return data
}

/**
 * Parse le format d'attributs LeBonCoin : [{key, value, value_label, values}, ...]
 * LeBonCoin stocke la plupart des caractéristiques du bien dans ce format.
 * Ex: {"key":"ges","value":"10","value_label":"B"}, {"key":"energy_rate","value":"210","value_label":"D"}
 */
function parseLeBonCoinAttributes(attributes: unknown[], data: Partial<NouvelleAnnonce>): void {
  for (const attr of attributes) {
    if (!attr || typeof attr !== 'object') continue
    const a = attr as Record<string, unknown>
    const key = String(a.key ?? '').toLowerCase()
    if (!key) continue
    const value = String(a.value ?? '')
    const valueLabel = String(a.value_label ?? a.value ?? '')

    switch (key) {
      // --- DPE ---
      case 'energy_rate':
      case 'energy_value':
      case 'dpe': {
        if (!data.dpe) {
          // value_label contient la lettre (A-G), value contient la valeur numérique
          const letter = /^[A-G]$/i.test(valueLabel) ? valueLabel : /^[A-G]$/i.test(value) ? value : null
          if (letter) data.dpe = letter.toUpperCase() as ClasseDPE
        }
        break
      }
      // --- GES ---
      case 'ges':
      case 'greenhouse':
      case 'ges_value': {
        if (!data.ges) {
          const letter = /^[A-G]$/i.test(valueLabel) ? valueLabel : /^[A-G]$/i.test(value) ? value : null
          if (letter) data.ges = letter.toUpperCase() as ClasseDPE
        }
        break
      }
      // --- Pièces ---
      case 'rooms':
      case 'nb_rooms': {
        if (!data.pieces) {
          const n = parseInt(value)
          if (n >= 1 && n <= 20) data.pieces = n
        }
        break
      }
      // --- Surface ---
      case 'square':
      case 'surface': {
        if (!data.surface) {
          const n = parseFloat(value)
          if (n >= 9 && n <= 2000) data.surface = n
        }
        break
      }
      // --- Chambres ---
      case 'nb_bedrooms':
      case 'bedrooms': {
        if (!data.chambres) {
          const n = parseInt(value)
          if (n >= 0 && n <= 20) data.chambres = n
        }
        break
      }
      // --- Salles de bains ---
      case 'nb_bathrooms':
      case 'nb_shower_rooms':
      case 'bathrooms': {
        if (!data.nbSallesBains) {
          const n = parseInt(value)
          if (n >= 1 && n <= 10) data.nbSallesBains = n
        }
        break
      }
      // --- Étage ---
      case 'floor_number':
      case 'floor': {
        if (data.etage === undefined) {
          const n = parseInt(value)
          if (n >= 0 && n <= 50) data.etage = n
        }
        break
      }
      // --- Étages total ---
      case 'nb_floors_building':
      case 'floors_building': {
        if (!data.etagesTotal) {
          const n = parseInt(value)
          if (n >= 1 && n <= 60) data.etagesTotal = n
        }
        break
      }
      // --- Ascenseur ---
      case 'elevator':
      case 'lift': {
        if (value === '1' || /oui|yes|true/i.test(valueLabel)) {
          data.ascenseur = true
        }
        break
      }
      // --- Balcon / Terrasse ---
      case 'outside_access': {
        if (/balcon|terrasse|loggia|jardin/i.test(valueLabel) || /balcon|terrasse|loggia|jardin/i.test(value)) {
          data.balconTerrasse = true
        }
        break
      }
      // --- Parking ---
      case 'nb_parking':
      case 'parking': {
        const n = parseInt(value)
        if (n >= 1) data.parking = true
        break
      }
      // --- Cave ---
      case 'cellar':
      case 'cave': {
        if (value === '1' || /oui|yes|true/i.test(valueLabel)) {
          data.cave = true
        }
        break
      }
      // --- Année de construction ---
      case 'construction_year':
      case 'year_of_construction': {
        if (!data.anneeConstruction) {
          const n = parseInt(value)
          if (n >= 1800 && n <= 2030) data.anneeConstruction = n
        }
        break
      }
      // --- Orientation / Exposition ---
      case 'exposure':
      case 'orientation': {
        if (!data.orientation) {
          const label = valueLabel || value
          if (label && label !== 'undefined') data.orientation = label.substring(0, 30)
        }
        break
      }
      // --- Charges mensuelles ---
      case 'charges':
      case 'monthly_charges':
      case 'charges_amount': {
        if (!data.chargesMensuelles) {
          const n = parseFloat(value)
          if (n > 0 && n < 50000) {
            // Seuil 1200€ : à Paris charges mensuelles 500-800€ sont courantes
            // Au-delà de 1200€ c'est quasi certainement annuel → diviser par 12
            data.chargesMensuelles = n > 1200 ? Math.round(n / 12) : Math.round(n)
          }
        }
        break
      }
      // --- Taxe foncière ---
      case 'property_tax':
      case 'foncier':
      case 'taxe_fonciere': {
        if (!data.taxeFonciere) {
          const n = parseFloat(value)
          if (n > 0 && n < 20000) data.taxeFonciere = Math.round(n)
        }
        break
      }
      // --- Type de bien ---
      case 'real_estate_type':
      case 'property_type': {
        if (!data.type) {
          if (/maison|villa|pavillon|house/i.test(valueLabel)) data.type = 'maison'
          else if (/appartement|studio|duplex|triplex|apartment/i.test(valueLabel)) data.type = 'appartement'
        }
        break
      }
      default:
        break
    }
  }
}

/**
 * Recherche récursive dans un objet JSON pour trouver les données immobilières.
 * Parcourt l'arbre en profondeur et extrait DPE, GES, année, prix, surface, etc.
 * Priorité au PREMIER objet trouvé avec ces propriétés (généralement le listing principal).
 */
function extractFromNestedJson(
  obj: unknown,
  data: Partial<NouvelleAnnonce>,
  depth: number
): void {
  if (depth > 20 || !obj || typeof obj !== 'object') return
  
  const record = obj as Record<string, unknown>
  
  // ── LeBonCoin attributes array: [{key, value, value_label}, ...] ──
  // LeBonCoin stores most property details in this format within __NEXT_DATA__
  if (Array.isArray(record.attributes)) {
    const attrs = record.attributes as unknown[]
    if (attrs.length > 0 && typeof attrs[0] === 'object' && attrs[0] !== null && 'key' in (attrs[0] as Record<string, unknown>)) {
      parseLeBonCoinAttributes(attrs, data)
    }
  }
  
  // ── LeBonCoin price as array: price: [350000] ──
  if (!data.prix && Array.isArray(record.price)) {
    const first = (record.price as unknown[])[0]
    if (typeof first === 'number' && first > 10000 && first < 50000000) {
      data.prix = first
    }
  }
  
  // ── LeBonCoin title: "subject" ──
  if (!data.titre && typeof record.subject === 'string' && record.subject.length > 5) {
    data.titre = record.subject.substring(0, 200)
  }
  
  // ── LeBonCoin description: "body" ──
  if (!data.description && typeof record.body === 'string' && (record.body as string).length >= 30) {
    data.description = (record.body as string)
      .replace(/\\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000)
  }
  
  // ── LeBonCoin images: images.urls or images.urls_large ──
  if (!data.imageUrl) {
    const imgContainer = record.images as Record<string, unknown> | undefined
    if (imgContainer && typeof imgContainer === 'object') {
      const urls = (imgContainer.urls_large ?? imgContainer.urls ?? imgContainer.thumb_url) as string[] | undefined
      if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string') {
        data.imageUrl = urls[0]
        if (!data.images) {
          data.images = urls.filter((u: unknown) => typeof u === 'string').slice(0, 20)
        }
      }
    }
  }
  
  // --- DPE ---
  if (!data.dpe) {
    const dpeVal = record.energyPerformanceDiagnostic ?? record.energyClass ??
                   record.energyRating ?? record.dpe ?? record.classeDpe ??
                   record.diagnosticPerformanceEnergetique ?? record.energy_class
    if (typeof dpeVal === 'string' && /^[A-G]$/i.test(dpeVal)) {
      data.dpe = dpeVal.toUpperCase() as ClasseDPE
    }
    // Objet imbriqué ex: {dpe: {grade: "D", value: 350}}
    if (typeof dpeVal === 'object' && dpeVal !== null) {
      const dpeObj = dpeVal as Record<string, unknown>
      const grade = dpeObj.grade ?? dpeObj.letter ?? dpeObj.classe ?? dpeObj.value ?? dpeObj.label
      if (typeof grade === 'string' && /^[A-G]$/i.test(grade)) {
        data.dpe = grade.toUpperCase() as ClasseDPE
      }
    }
  }
  
  // --- GES ---
  if (!data.ges) {
    const gesVal = record.greenhouseGasEmission ?? record.ges ?? record.ghgEmission ??
                   record.emissionClass ?? record.classeGes ?? record.greenHouseGas ??
                   record.ghg_class ?? record.emission_class
    if (typeof gesVal === 'string' && /^[A-G]$/i.test(gesVal)) {
      data.ges = gesVal.toUpperCase() as ClasseDPE
    }
    if (typeof gesVal === 'object' && gesVal !== null) {
      const gesObj = gesVal as Record<string, unknown>
      const grade = gesObj.grade ?? gesObj.letter ?? gesObj.classe ?? gesObj.value ?? gesObj.label
      if (typeof grade === 'string' && /^[A-G]$/i.test(grade)) {
        data.ges = grade.toUpperCase() as ClasseDPE
      }
    }
  }
  
  // --- Année de construction ---
  if (!data.anneeConstruction) {
    const yearVal = record.yearBuilt ?? record.constructionYear ?? record.yearOfConstruction ??
                    record.anneeConstruction ?? record.buildYear ?? record.dateBuilt ??
                    record.anneeDeCnstruction ?? record.buildPeriod ?? record.construction_year
    if (yearVal !== undefined) {
      const n = parseInt(String(yearVal))
      if (n >= 1800 && n <= 2030) data.anneeConstruction = n
    }
  }
  
  // --- Prix ---
  if (!data.prix) {
    const priceVal = record.price ?? record.prix ?? record.amount
    if (priceVal !== undefined) {
      const n = typeof priceVal === 'number' ? priceVal : parseInt(String(priceVal).replace(/\D/g, ''))
      if (n > 10000 && n < 50000000) data.prix = n
    }
  }
  
  // --- Surface ---
  if (!data.surface) {
    const surfVal = record.livingArea ?? record.surface ?? record.surfaceArea ??
                    record.area ?? record.floorSize ?? record.livingSpace
    if (surfVal !== undefined) {
      const raw = typeof surfVal === 'object' && surfVal !== null
        ? (surfVal as Record<string, unknown>).value
        : surfVal
      const n = parseFloat(String(raw))
      if (n >= 9 && n <= 2000) data.surface = n
    }
  }
  
  // --- Pièces ---
  if (!data.pieces) {
    const roomsVal = record.numberOfRooms ?? record.rooms ?? record.nbRooms ?? record.pieces
    if (roomsVal !== undefined) {
      const n = parseInt(String(roomsVal))
      if (n >= 1 && n <= 20) data.pieces = n
    }
  }
  
  // --- Ville / Code postal ---
  if (!data.ville || !data.codePostal) {
    const loc = (record.location ?? record.address ?? record.localisation) as Record<string, unknown> | undefined
    if (loc && typeof loc === 'object') {
      if (!data.ville) {
        const city = loc.city ?? loc.addressLocality ?? loc.ville ?? loc.name
        if (typeof city === 'string' && city.length > 1) data.ville = city
      }
      if (!data.codePostal) {
        const cp = String(loc.postalCode ?? loc.zipcode ?? loc.zipCode ?? loc.codePostal ?? '')
        if (/^\d{5}$/.test(cp)) data.codePostal = cp
      }
    }
  }
  
  // --- Chambres ---
  if (!data.chambres) {
    const bedVal = record.numberOfBedrooms ?? record.bedrooms ?? record.nbBedrooms ?? record.chambres ?? record.nb_bedrooms
    if (bedVal !== undefined) {
      const n = parseInt(String(bedVal))
      if (n >= 0 && n <= 20) data.chambres = n
    }
  }
  
  // --- Salles de bains ---
  if (!data.nbSallesBains) {
    const sdbVal = record.numberOfBathroomsTotal ?? record.numberOfBathrooms ?? record.bathrooms ??
                   record.nbSallesBains ?? record.nb_bathrooms ?? record.nb_shower_rooms
    if (sdbVal !== undefined) {
      const n = parseInt(String(sdbVal))
      if (n >= 1 && n <= 10) data.nbSallesBains = n
    }
  }
  
  // --- Orientation ---
  if (!data.orientation) {
    const orientVal = record.exposure ?? record.orientation ?? record.facing
    if (typeof orientVal === 'string' && orientVal.length > 0 && orientVal.length <= 30) {
      data.orientation = orientVal.trim()
    }
  }

  // --- Coordonnées GPS (lat/lng, latitude/longitude) ---
  if (!data.latitude || !data.longitude) {
    const latVal = record.lat ?? record.latitude
    const lngVal = record.lng ?? record.longitude
    if (typeof latVal === 'number' && typeof lngVal === 'number') {
      if (latVal >= -22 && latVal <= 52 && lngVal >= -62 && lngVal <= 56 && latVal !== 0 && lngVal !== 0) {
        data.latitude = latVal
        data.longitude = lngVal
      }
    }
  }
  
  // --- Récursion dans les valeurs ---
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      // Pour les arrays, ne parcourir que les 15 premiers éléments (éviter les listings similaires)
      // Augmenté de 5 à 15 : certains __NEXT_DATA__ ont les données du bien au-delà du 5e élément
      for (let i = 0; i < Math.min(value.length, 15); i++) {
        extractFromNestedJson(value[i], data, depth + 1)
      }
    } else if (typeof value === 'object' && value !== null) {
      extractFromNestedJson(value, data, depth + 1)
    }
  }
}

// ============================================
// EXTRACTION DEPUIS META TAGS (côté client)
// ============================================

/**
 * Tente d'extraire des infos depuis les Open Graph / meta tags
 * Plus fiable car standardisé
 */
export function parseMetaTags(html: string): Partial<NouvelleAnnonce> {
  const data: Partial<NouvelleAnnonce> = {}
  
  // og:title
  const titleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
                     html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)
  if (titleMatch) {
    data.titre = titleMatch[1]
    
    // Extract prix and surface from og:title (e.g. "Maison 4P 120m² Toulouse 350 000 €")
    const titleText = titleMatch[1]
    if (!data.prix) {
      const prixMatch = titleText.match(/(\d{1,3}(?:[\s\u00A0]\d{3})+)\s*€/) || titleText.match(/(\d{4,8})\s*€/)
      const prix = extraireNombre(prixMatch?.[1] || '')
      if (prix && prix > 10000) data.prix = prix
    }
    if (!data.surface) {
      const surface = extraireSurface(titleText)
      if (surface) data.surface = surface
    }
  }
  
  // og:image
  const imageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                     html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)
  if (imageMatch) {
    data.imageUrl = imageMatch[1]
  }
  
  // og:description - peut contenir des infos utiles
  const descMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
                    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i)
  if (descMatch) {
    const desc = descMatch[1]
    
    // Essayer d'extraire des infos de la description
    // Pattern amélioré pour les prix >= 1 000 000 € (ex: "1 400 000 €")
    if (!data.prix) {
      const prixMatch = desc.match(/(\d{1,3}(?:[\s\u00A0]\d{3})+)\s*€/) || desc.match(/(\d{4,8})\s*€/)
      const prix = extraireNombre(prixMatch?.[1] || '')
      if (prix && prix > 10000) data.prix = prix
    }
    
    if (!data.surface) {
      const surface = extraireSurface(desc)
      if (surface) data.surface = surface
    }
    
    const pieces = extrairePieces(desc)
    if (pieces) data.pieces = pieces
    
    // Essayer d'extraire la localisation de la description
    const descLoc = extraireLocalisation(desc)
    if (descLoc.ville) data.ville = descLoc.ville
    if (descLoc.codePostal) data.codePostal = descLoc.codePostal
  }
  
  // og:locality ou geo.placename (utilisé par certains sites)
  const localityMatch = html.match(/<meta[^>]+(?:property|name)="(?:og:locality|geo\.placename)"[^>]+content="([^"]+)"/i)
  if (localityMatch && !data.ville) {
    data.ville = localityMatch[1]
  }
  
  // geo.position ou ICBM pour les coordonnées (moins utile mais bon à avoir)
  const geoMatch = html.match(/<meta[^>]+name="geo\.region"[^>]+content="FR-(\d{2})"/i)
  if (geoMatch && !data.codePostal) {
    // On a le département, pas le code postal complet
    // Mais c'est mieux que rien pour certaines validations
  }
  
  // Essayer d'extraire l'adresse du og:street-address ou og:description
  const streetMeta = html.match(/<meta[^>]+(?:property|name)="(?:og:street-address|street-address)"[^>]+content="([^"]+)"/i)
  if (streetMeta) {
    const adresse = streetMeta[1].trim()
    if (/^\d+|rue|avenue|boulevard|allée|impasse|place|chemin|passage|square/i.test(adresse)) {
      data.adresse = adresse
    }
  }
  
  return data
}

// ============================================
// SMART MERGE — fusion intelligente sans écraser de données valides
// ============================================

/**
 * Fusionne plusieurs résultats d'extraction en priorisant les sources
 * dans l'ordre donné (dernier argument = priorité la plus haute).
 * 
 * Contrairement à Object spread, smartMerge :
 * - Ne copie JAMAIS une valeur `undefined` ou `null`
 * - Ne remplace PAS un DPE/GES valide par 'NC'
 * - Ne remplace PAS un type valide par un fallback
 */
export function smartMerge(
  ...sources: Array<Partial<NouvelleAnnonce> | Record<string, unknown>>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      // Skip undefined / null
      if (value === undefined || value === null) continue

      // Ne pas écraser un DPE/GES valide avec 'NC'
      if ((key === 'dpe' || key === 'ges') && value === 'NC') {
        if (result[key] && result[key] !== 'NC') continue
      }

      result[key] = value
    }
  }

  return result
}

/**
 * Extrait le texte brut du HTML et utilise parseTexteAnnonce pour
 * compléter les champs manquants dans `data`.
 * 
 * Contrairement au fallback original, cette version :
 * - Tourne TOUJOURS (pas seulement quand prix+surface manquent)
 * - Remplit les trous sans écraser les données existantes
 */
export function supplementWithTextParsing(
  html: string,
  data: Record<string, unknown>
): void {
  const texte = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

  if (texte.length < 50) return

  const textData = parseTexteAnnonce(texte)
  const textRecord = textData as unknown as Record<string, unknown>

  for (const [key, value] of Object.entries(textRecord)) {
    if (value === undefined || value === null) continue
    // Ne remplir que les champs absents ou vides
    if (data[key] === undefined || data[key] === null || data[key] === 'NC') {
      // Ne pas remplacer 'NC' par 'NC'
      if (value === 'NC') continue
      data[key] = value
    }
  }
}

// ============================================
// PIPELINE CENTRALISÉ D'EXTRACTION
// ============================================

/**
 * Pipeline centralisé d'extraction depuis du HTML brut.
 * C'est LE POINT D'ENTRÉE UNIQUE pour toute extraction.
 * 
 * Enchaîne 5 couches d'extraction par ordre de fiabilité :
 * 1. __NEXT_DATA__ (données React/Next.js pré-rendues)
 * 2. JSON-LD (Schema.org — le standard du web sémantique)
 * 3. HTML patterns (regex sur le HTML — DPE, prix, surface, équipements...)
 * 4. Meta tags (og:*, meta name, twitter:*)
 * 5. Texte brut (regex sur le texte visible — filet de sécurité final)
 * 
 * + Accepte des `seedData` optionnelles (ex: d'une API JSON) qui sont
 *   fusionnées en priorité HAUTE (elles ne seront pas écrasées).
 * 
 * @param html    Le HTML brut de la page
 * @param url     L'URL de l'annonce
 * @param seedData Données pré-extraites (API JSON, DOM eval, etc.) — priorité haute
 * @returns       Les données fusionnées de toutes les couches
 */
export function extractFromHTML(
  html: string,
  url: string,
  seedData?: Record<string, unknown>
): Record<string, unknown> {
  // Couches structurées (du moins fiable au plus fiable)
  const dataFromMeta = parseMetaTags(html)
  const dataFromHTML = parseAnnonceHTML(html, url)
  const dataFromJsonLd = parseJsonLd(html)
  const dataFromNextData = parseNextData(html)

  // Fusion : Meta < HTML < JSON-LD < __NEXT_DATA__ < seedData (API)
  const sources: Array<Partial<NouvelleAnnonce> | Record<string, unknown>> = [
    { url },
    dataFromMeta,
    dataFromHTML,
    dataFromJsonLd,
    dataFromNextData,
  ]

  // Les seedData sont les plus fiables (API JSON directe)
  if (seedData) {
    sources.push(seedData)
  }

  const data = smartMerge(...sources)

  // Couche finale : texte brut (filet de sécurité pour les champs manquants)
  supplementWithTextParsing(html, data)

  return data
}
