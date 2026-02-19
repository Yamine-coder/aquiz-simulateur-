/**
 * Échappe les caractères spéciaux HTML pour prévenir les injections XSS
 * dans les templates email (ou tout contexte HTML dynamique).
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
