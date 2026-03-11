/**
 * Complète les champs manquants d'une annonce avec des estimations raisonnables.
 * Fonction partagée entre les différents extracteurs (route API, extracteur HTML, Playwright).
 *
 * Règles appliquées :
 * - Nettoie le nom de ville (arrondissements Paris/Lyon/Marseille)
 * - Déduit le nombre de pièces depuis la surface (~22m²/pièce)
 * - Déduit le nombre de chambres depuis les pièces (pièces - 1)
 * - DPE par défaut : 'NC'
 * - Type par défaut : 'appartement'
 * - Département déduit du code postal (DOM-TOM, Corse, métropole)
 */
export function completerDonnees(data: Record<string, unknown>): void {
  // Nettoyer le nom de ville
  if (data.ville && typeof data.ville === 'string') {
    data.ville = nettoyerVille(data.ville, data.codePostal as string | undefined)
  }

  if (!data.pieces && data.surface) {
    data.pieces = Math.max(1, Math.round((data.surface as number) / 22))
  }
  if (!data.chambres && data.pieces) {
    data.chambres = Math.max(0, (data.pieces as number) - 1)
  }
  if (!data.dpe) data.dpe = 'NC'
  // Ne forcer 'appartement' que si on n'a aucune info — la description peut contenir 'maison'
  if (!data.type) {
    // Tenter de déduire depuis titre/description avant le fallback
    const texte = `${data.titre ?? ''} ${data.description ?? ''}`.toLowerCase()
    if (/\bmaison\b|\bvilla\b|\bpavillon\b/.test(texte)) {
      data.type = 'maison'
    } else {
      data.type = 'appartement'
    }
  }

  // Déduire le département depuis le code postal
  if (data.codePostal && !data.departement) {
    const cp = data.codePostal as string
    if (cp.startsWith('97')) {
      data.departement = cp.substring(0, 3) // DOM-TOM
    } else if (cp.startsWith('20')) {
      // Corse : 20000-20190 = 2A, 20200+ = 2B
      const num = parseInt(cp)
      data.departement = num < 20200 ? '2A' : '2B'
    } else {
      data.departement = cp.substring(0, 2)
    }
  }
}

/**
 * Nettoie et normalise un nom de ville.
 * - Corrige les arrondissements tronqués ("8ème" → "Paris 8ème", "ème" → déduit depuis le code postal)
 * - Formate "Paris-8Eme" → "Paris 8ème"
 * - Corrige les suffixes d'arrondissement isolés
 */
export function nettoyerVille(ville: string, codePostal?: string): string {
  let v = ville.trim()

  // Cas 1 : ville complètement vide ou juste un suffixe ordinal isolé ("eme", "ème", "er")
  if (/^[eè]me$/i.test(v) || /^er$/i.test(v) || /^\d{1,2}[eè](?:me)?$/i.test(v) || /^\d{1,2}er$/i.test(v)) {
    // Déduire la ville depuis le code postal
    if (codePostal) {
      const cp = codePostal.substring(0, 2)
      // Extraire le numéro d'arrondissement
      let arrNum = v.match(/(\d{1,2})/)?.[1]
      if (!arrNum && codePostal.length === 5) {
        // Déduire depuis le code postal : 75008 → 8, 13001 → 1, 69001 → 1
        const suffix = parseInt(codePostal.substring(2))
        if (suffix > 0 && suffix <= 20) arrNum = String(suffix)
      }
      const arrSuffix = arrNum ? ` ${arrNum}${arrNum === '1' ? 'er' : 'ème'}` : ''
      if (cp === '75') return `Paris${arrSuffix}`
      if (cp === '13') return `Marseille${arrSuffix}`
      if (cp === '69') return `Lyon${arrSuffix}`
    }
    return '' // Impossible de déduire, laisser vide pour que les fallbacks prennent le relais
  }

  // Cas 2 : "Paris-8Eme" ou "paris-8eme" → "Paris 8ème"
  v = v.replace(/^(Paris|Lyon|Marseille)[\s\-_]*(\d{1,2})[eè](?:me)?/i, (_, city, num) => {
    const cityClean = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
    return `${cityClean} ${num}${num === '1' ? 'er' : 'ème'}`
  })

  // Cas 3 : "8eme Paris" → "Paris 8ème"
  v = v.replace(/^(\d{1,2})[eè](?:me)?\s+(Paris|Lyon|Marseille)/i, (_, num, city) => {
    const cityClean = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
    return `${cityClean} ${num}${num === '1' ? 'er' : 'ème'}`
  })

  // Cas 4 : ville avec des tirets → capitaliser chaque mot
  // "fontenay-sous-bois" → "Fontenay-sous-Bois" (garder les articles en minuscule)
  const ARTICLES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'en', 'sur', 'sous', 'l', 'd'])
  if (v.includes('-') && v === v.toLowerCase()) {
    v = v.split('-').map((word, i) => {
      if (i > 0 && ARTICLES.has(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    }).join('-')
  }

  return v
}
