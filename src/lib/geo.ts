/**
 * Extrait le code département à partir d'un code postal français.
 * Gère les cas spéciaux : Corse (2A/2B), DOM-TOM (97x), Paris & petite couronne.
 */
export function getDepartementFromCodePostal(codePostal: string): string {
  if (codePostal.startsWith('97')) return codePostal.substring(0, 3) // DOM-TOM
  if (codePostal.startsWith('20')) return parseInt(codePostal) < 20200 ? '2A' : '2B' // Corse
  return codePostal.substring(0, 2)
}
