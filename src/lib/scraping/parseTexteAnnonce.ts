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

  // ══ COUPER TOUT CE QUI SUIT ces marqueurs ══
  // Les sections "similaires" contiennent d'autres prix/DPE qui perturbent le parsing
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
    /\bprix\s+(?:de\s+)?l[\u2019']?immobilier\b/i,
    /\b[ée]volution\s+des?\s+prix\b/i,
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

  // ══ Supprimer les échelles DPE / GES ══
  // LeBonCoin et d'autres portails affichent la grille A B C D E F G.
  // Le parser attrape le premier "A" de la grille au lieu de la vraie classe.
  // On supprime ces séquences pour ne garder que la valeur réelle.
  // Pattern : lettres A à G (ou sous-ensembles ordonnés) séparées par espaces/newlines
  cleaned = cleaned
    .replace(/\b[A-G](?:\s+[A-G]){4,6}\b/g, '') // "A B C D E F G" sur une ligne
    .replace(/(?:^|\n)\s*[A-G]\s*\n\s*[A-G]\s*\n\s*[A-G]\s*\n\s*[A-G]\s*\n\s*[A-G](?:\s*\n\s*[A-G]){0,2}/gm, '') // Chaque lettre sur sa propre ligne
    // LeBonCoin : "Logement économe" ... "Logement énergivore" ou "Faible émission" ... "Forte émission"
    .replace(/logement\s+[ée]conome/gi, '')
    .replace(/logement\s+[ée]nergivore/gi, '')
    .replace(/faible\s+[ée]mission/gi, '')
    .replace(/forte\s+[ée]mission/gi, '')
    .replace(/passoire\s+[ée]nerg[ée]tique/gi, '')
    .replace(/peu\s+polluant/gi, '')
    .replace(/tr[èe]s\s+polluant/gi, '')

  return cleaned.trim()
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
    /https?:\/\/(?:www\.)?pap\.fr\/\S+/i,
    /https?:\/\/(?:www\.)?bienici\.com\/\S+/i,
    /https?:\/\/(?:www\.)?logic-immo\.com\/\S+/i,
    /https?:\/\/(?:www\.)?bien-ici\.com\/\S+/i,
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

  // ──── 1. Code postal 5 chiffres (avec validation dept) — priorité haute ────
  const cpMatch = texte.match(/\b(\d{5})\b/)
  if (cpMatch && isValidCP(cpMatch[1])) {
    result.codePostal = cpMatch[1]
  }

  // ──── 2. Pattern "Ville (75001)" ou "75001 Ville" — le plus fiable pour extraire le nom ────
  const patternVilleCP = [
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

  // ──── 3. Villes connues (fallback si pattern ci-dessus n'a rien trouvé) ────
  if (!result.ville) {
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
    const lower = texte.toLowerCase()
    for (const v of VILLES) {
      if (lower.includes(v.toLowerCase())) {
        result.ville = v
        break
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

  // 2. Patterns textuels (pas affectés par l'échelle)
  const patterns = [
    /classe\s*(?:énergie|énergétique)\s*:?\s*([A-G])\b/i,
    /DPE\s*:?\s*([A-G])(?![ \t]+[A-G](?![a-zA-Z]))/i,
    /\(DPE\)\s*([A-G])\b/i,
    /DPE\)\s*([A-G])\b/i,
    /diagnostic\s*(?:de\s*)?performance\s*énergétique\s*(?:\(DPE\))?\s*:?\s*([A-G])\b/i,
    /étiquette\s*énergie\s*:?\s*([A-G])\b/i,
    /[ée]nergie\s*:?\s*([A-G])\b/i,
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

  // 2. Patterns textuels
  const patterns = [
    /classe\s*(?:GES|climat)\s*:?\s*([A-G])\b/i,
    /GES\s*:?\s*([A-G])(?![ \t]+[A-G](?![a-zA-Z]))/i,
    /\(GES\)\s*([A-G])\b/i,
    /GES\)\s*([A-G])\b/i,
    /gaz\s*(?:à\s*)?effet\s*(?:de\s*)?serre\s*(?:\(GES\))?\s*:?\s*([A-G])\b/i,
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
    // "Étage 8/9" ou "8ème étage/9 étages" → 9
    /étage\s*\d+\s*\/\s*(\d+)/i,
    /\d+(?:er?|e|ème)?\s*étage\s*\/\s*(\d+)/i,
    /(?:immeuble|bâtiment|résidence)\s*(?:de\s*)?(?:R\+)?(\d+)\s*étages?/i,
    /(\d+)\s*étages?\s*(?:au\s*total|en\s*tout)/i,
    /sur\s*(\d+)\s*étages?/i,
    /(?:nombre\s*d'?étages?|étages?\s*total)\s*:?\s*(\d+)/i,
    // "8/9 étages" generic
    /\d+\s*\/\s*(\d+)\s*étages?/i,
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
    /charges?\s*(?:de\s+)?copropriété\s*:?\s*(\d[\d\s]*)\s*(?:€|euros?)?\s*(?:\/\s*(?:an|mois))?/i,
    /charges?\s*mensuelles?\s*:?\s*(\d[\d\s]*)\s*(?:€|euros?)/i,
    /provisions?\s*sur\s*charges?\s*:?\s*(\d[\d\s]*)\s*(?:€|euros?)/i,
    /charges?\s*:\s*(\d[\d\s]*)\s*(?:€|euros?)\s*\/\s*mois/i,
    /(\d[\d\s]*)\s*(?:€|euros?)\s*(?:de\s+)?charges?\s*(?:par\s+mois|\/\s*mois|mensuelles?)/i,
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

        const isAnnual = /\/\s*an|par\s+an|annuel|\/\s*année|charges?\s*(?:de\s+)?copropriété/i.test(context)
        const isMonthly = /\/\s*mois|par\s+mois|mensuel/i.test(context)

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
    /taxe\s*foncière\s*:?\s*(\d[\d\s]*)\s*(?:€|euros?)\b/i,
    /foncière?\s*:?\s*(\d[\d\s]*)\s*(?:€|euros?)\b/i,
    /(\d[\d\s]*)\s*(?:€|euros?)\s*(?:de\s+)?taxe\s*foncière/i,
    // Pattern sans symbole euro (SeLoger : "Taxe Foncière: 1442 Euros")
    /taxe\s*foncière\s*:?\s*(\d[\d\s.,]+)(?:\s*(?:€|euros?|par\s*an|\/\s*an))?\b/i,
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

  const NEG_ASCENSEUR = [/sans\s+ascenseur/, /pas\s+d['’e]?\s*ascenseur/, /aucun\s+ascenseur/]
  const NEG_BALCON = [/sans\s+(?:balcon|terrasse)/, /pas\s+d['’e]?\s*(?:balcon|terrasse)/, /aucun\s+(?:balcon|terrasse)/]
  const NEG_PARKING = [/sans\s+(?:parking|garage)/, /pas\s+d['’e]?\s*(?:parking|garage)/, /aucun\s+(?:parking|garage)/]
  const NEG_CAVE = [/sans\s+cave/, /pas\s+d['’e]?\s*cave/, /aucune?\s+cave/]

  return {
    ascenseur: presente(/\bascenseur\b/, NEG_ASCENSEUR),
    balconTerrasse: presente(/\bbalcon\b|\bterrasse\b|\bloggia\b/, NEG_BALCON),
    parking: presente(/\bparking\b|\bgarage\b|\bbox\b|place\s+de\s+stationnement/, NEG_PARKING),
    cave: presente(/\bcave\b/, NEG_CAVE),
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
  const texteBrut = texte.length > MAX_TEXT_LENGTH ? texte.substring(0, MAX_TEXT_LENGTH) : texte

  // ══ Isoler le contenu principal ══
  // Supprime "annonces similaires", footer, prix de marché, etc.
  // pour éviter de parser les données d'AUTRES biens
  const texteSafe = isolerContenuPrincipal(texteBrut)

  // Extraire l'URL du bien (utile pour la source et les images)
  const url = extraireUrl(texteBrut) // chercher dans le texte complet

  const localisation = extraireLocalisation(texteSafe)
  const equipements = extraireEquipements(texteSafe)

  const resultat: DonneesExtraites & { url?: string } = {
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

  // 3. Toutes les <img> — v\u00e9rifier src, data-src, data-lazy-src, srcset
  const imgTagRegex = /<img[^>]+>/gi
  let imgTag: RegExpExecArray | null
  while ((imgTag = imgTagRegex.exec(html)) !== null) {
    const tag = imgTag[0]
    
    // Extraire les diff\u00e9rentes sources possibles (ordre de qualit\u00e9 d\u00e9croissante)
    const dataSrcMatch = tag.match(/data-(?:lazy-)?src=["']([^"']+)["']/i)
    const srcSetMatch = tag.match(/(?:data-)?srcset=["']([^"']+)["']/i)
    // Utiliser un espace ou début de tag avant "src=" pour ne pas re-matcher data-src
    const srcMatch = tag.match(/(?:^|[\s"'])src=["']([^"']+)["']/i)
    
    // Privil\u00e9gier la plus grande image du srcset
    let bestUrl: string | undefined
    if (srcSetMatch?.[1]) {
      const entries = srcSetMatch[1].split(',').map(s => s.trim())
      let bestWidth = 0
      for (const entry of entries) {
        const parts = entry.split(/\\s+/)
        const url = parts[0]?.trim()
        const widthStr = parts[1]?.replace('w', '')
        const w = widthStr ? parseInt(widthStr) : 0
        if (url?.startsWith('http') && w > bestWidth) {
          bestWidth = w
          bestUrl = url
        }
      }
    }
    
    // Puis data-src (image lazy-load\u00e9e = souvent la vraie image haute qualit\u00e9)
    if (!bestUrl && dataSrcMatch?.[1]?.startsWith('http')) {
      bestUrl = dataSrcMatch[1].trim()
    }
    
    // Enfin src classique
    if (!bestUrl && srcMatch?.[1]?.startsWith('http')) {
      bestUrl = srcMatch[1].trim()
    }
    
    if (!bestUrl) continue
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
      const url = urlMatch[0]
      if (!allImages.includes(url)) {
        if (!mainImage) mainImage = url
        allImages.push(url)
      }
      if (allImages.length >= 20) break
    }
  }

  // Dédupliquer les URLs
  const uniqueImages = [...new Set(allImages)]

  return { imageUrl: mainImage, images: uniqueImages.length > 1 ? uniqueImages : [] }
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
