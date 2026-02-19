/**
 * Service d'extraction de données depuis les URLs d'annonces
 * Extrait les infos principales des sites immobiliers
 */

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
  
  if (urlLower.includes('seloger.com')) return 'seloger'
  if (urlLower.includes('leboncoin.fr')) return 'leboncoin'
  if (urlLower.includes('pap.fr')) return 'pap'
  if (urlLower.includes('bienici.com')) return 'bienici'
  if (urlLower.includes('logic-immo.com')) return 'logic-immo'
  if (urlLower.includes('ouestfrance-immo.com')) return 'ouestfrance'
  if (urlLower.includes('bien-ici.com')) return 'bienici'
  if (urlLower.includes('immo.lefigaro.fr')) return 'figaro'
  
  return null
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
  if (/maison|villa|pavillon/i.test(html)) {
    data.type = 'maison'
  } else {
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
  
  // PAP specific
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
  const dpeMatch = html.match(/(?:dpe|energyClass|energy.?rating)["\s:]*"?([A-G])"?/i) ||
                   html.match(/classe\s*(?:énergie|énergétique)["\s:]*([A-G])/i)
  if (dpeMatch) {
    data.dpe = dpeMatch[1].toUpperCase() as ClasseDPE
  } else {
    data.dpe = 'NC'
  }
  
  // ===== GES =====
  const gesMatch = html.match(/(?:ges|greenHouseGas|ghg|emissionClass)["\s:]*"?([A-G])"?/i) ||
                   html.match(/gaz\s*(?:à\s*)?effet\s*(?:de\s*)?serre["\s:]*([A-G])/i) ||
                   html.match(/classe\s*(?:GES|climat)["\s:]*([A-G])/i) ||
                   html.match(/"ges"\s*:\s*"?([A-G])"?/i)
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
    const ogDescMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]{50,})"/i)
    if (ogDescMatch) {
      data.description = ogDescMatch[1].substring(0, 1000)
    }
  }
  
  // ===== ANNÉE CONSTRUCTION =====
  const anneePatterns = [
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
    // Texte libre dans le HTML
    /(?:construit|construction|année)\s*(?:en\s*)?:?\s*((?:19|20)\d{2})/i,
    /(?:bâti|édifié|livré)\s*(?:en\s*)?((?:19|20)\d{2})/i,
    /(?:immeuble|résidence|copropriété|bâtiment)\s+(?:de|du)\s+((?:19|20)\d{2})/i,
    /livraison\s*(?:prévue\s*)?(?:T\d\s*)?((?:19|20)\d{2})/i,
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
    /charges?\s*(?:de\s+)?copropriété\s*:?\s*(\d[\d\s]*(?:[.,]\d+)?)\s*€?\s*(?:\/\s*an)?/i,
    // SeLoger specific JSON patterns
    /"charges?":\s*(\d+)/i,
    /"monthlyCharges?":\s*"?(\d+)"?/i,
    /"provisionCharges":\s*"?(\d+)"?/i,
    /"condominiumFees":\s*"?(\d+)"?/i,
    // Patterns textuels mensuels
    /charges?\s*mensuelles?\s*:?\s*(\d+(?:\s?\d+)*)\s*€/i,
    /provisions?\s*sur\s*charges?\s*:?\s*(\d+(?:\s?\d+)*)\s*€/i,
    /charges?\s*:\s*(\d+(?:\s?\d+)*)\s*€\s*\/\s*mois/i,
    // Pattern avec "par mois"
    /(\d+(?:\s?\d+)*)\s*€\s*(?:de\s+)?charges?\s*(?:par\s+mois|\/\s*mois|mensuelles?)/i,
  ]
  
  for (const pattern of chargesPatterns) {
    const match = html.match(pattern)
    if (match) {
      const charges = extraireNombre(match[1])
      if (charges && charges > 0 && charges < 50000) {
        // Si c'est une charge annuelle (> 500€), convertir en mensuel
        if (charges > 500) {
          data.chargesMensuelles = Math.round(charges / 12)
        } else {
          data.chargesMensuelles = charges
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
    // Patterns textuels
    /taxe\s*foncière\s*:?\s*(\d+(?:\s?\d+)*)\s*€/i,
    /foncier(?:e|ère)?\s*:?\s*(\d+(?:\s?\d+)*)\s*€(?:\s*\/\s*an)?/i,
    /taxe\s*foncière\s*annuelle?\s*:?\s*(\d+(?:\s?\d+)*)/i,
    /(\d+(?:\s?\d+)*)\s*€\s*(?:de\s+)?taxe\s*foncière/i,
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
  // Ascenseur
  if (/"ascenseur"\s*:\s*true/i.test(html) ||
      /"elevator"\s*:\s*true/i.test(html) ||
      /"hasElevator"\s*:\s*true/i.test(html) ||
      /ascenseur/i.test(html) && !/sans\s+ascenseur/i.test(html)) {
    data.ascenseur = true
  }
  
  // Balcon / Terrasse
  if (/"balcon"\s*:\s*true/i.test(html) ||
      /"terrasse"\s*:\s*true/i.test(html) ||
      /"balcony"\s*:\s*true/i.test(html) ||
      /"terrace"\s*:\s*true/i.test(html) ||
      /"hasBalcony"\s*:\s*true/i.test(html) ||
      /"hasTerrace"\s*:\s*true/i.test(html) ||
      /\bbalcon\b/i.test(html) ||
      /\bterrasse\b/i.test(html) ||
      /\bloggia\b/i.test(html)) {
    data.balconTerrasse = true
  }
  
  // Parking / Garage
  if (/"parking"\s*:\s*true/i.test(html) ||
      /"garage"\s*:\s*true/i.test(html) ||
      /"hasParking"\s*:\s*true/i.test(html) ||
      /"hasGarage"\s*:\s*true/i.test(html) ||
      /"parkingSpace"\s*:\s*[1-9]/i.test(html) ||
      /\bparking\b/i.test(html) ||
      /\bgarage\b/i.test(html) ||
      /\bbox\b/i.test(html) ||
      /place\s+de\s+stationnement/i.test(html)) {
    data.parking = true
  }
  
  // Cave
  if (/"cave"\s*:\s*true/i.test(html) ||
      /"cellar"\s*:\s*true/i.test(html) ||
      /"hasCellar"\s*:\s*true/i.test(html) ||
      /\bcave\b/i.test(html) && !/\bcave à vin\b/i.test(html)) {
    data.cave = true
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
  
  return data
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
  }
  
  // og:image
  const imageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                     html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)
  if (imageMatch) {
    data.imageUrl = imageMatch[1]
  }
  
  // og:description - peut contenir des infos utiles
  const descMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
  if (descMatch) {
    const desc = descMatch[1]
    
    // Essayer d'extraire des infos de la description
    // Pattern amélioré pour les prix >= 1 000 000 € (ex: "1 400 000 €")
    const prixMatch = desc.match(/(\d{1,3}(?:[\s\u00A0]\d{3})+)\s*€/) || desc.match(/(\d{4,8})\s*€/)
    const prix = extraireNombre(prixMatch?.[1] || '')
    if (prix && prix > 10000) data.prix = prix
    
    const surface = extraireSurface(desc)
    if (surface) data.surface = surface
    
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
