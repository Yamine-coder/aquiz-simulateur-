import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Nettoie un nom de ville issu du scraping.
 * Retire les codes postaux, suffixes quartier/gare, etc.
 * Ex: "Rosny-sous-Bois 93110 Rosny Sud - Gare RER A" → "Rosny-sous-Bois"
 */
export function cleanVille(ville: string): string {
  let v = ville.trim()
  // Retirer tout ce qui est après un code postal (5 chiffres)
  v = v.replace(/\s+\d{5}\b.*$/, '')
  // Retirer les suffixes type "- Gare RER A", "- Centre Ville", "- Quartier Nord"
  v = v.replace(/\s*[-–]\s*(Gare|Centre|Quartier|Secteur|Proche|Résidence|Prog)\b.*$/i, '')
  // Heuristique : si le résultat fait plus de 35 chars, tronquer au premier " - "
  if (v.length > 35) {
    const dashIdx = v.indexOf(' - ')
    if (dashIdx > 0) v = v.substring(0, dashIdx)
  }
  // Dernière limite
  if (v.length > 40) v = v.substring(0, 40) + '…'
  return v || ville.trim().substring(0, 30)
}
