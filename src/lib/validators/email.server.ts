/**
 * Validation d'email côté serveur — Node.js uniquement (dns.resolveMx)
 * Ne PAS importer dans un composant client.
 */

import { promisify } from 'util'
import { validateEmailClient } from './email'

interface EmailValidationResult {
  valid: boolean
  error?: string
}

/**
 * Vérifie qu'un domaine a des enregistrements MX (serveur mail)
 * Côté API uniquement (Node.js dns module)
 */
export async function verifyMxRecord(email: string): Promise<EmailValidationResult> {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) {
    return { valid: false, error: 'Format d\'email invalide' }
  }

  try {
    const dns = await import('dns')
    const resolveMx = promisify(dns.resolveMx)

    const records = await resolveMx(domain)
    if (!records || records.length === 0) {
      return { valid: false, error: 'Ce domaine n\'accepte pas les emails' }
    }

    return { valid: true }
  } catch {
    // ENOTFOUND, ENODATA → pas de MX
    return { valid: false, error: 'Ce domaine n\'accepte pas les emails' }
  }
}

/**
 * Validation complète côté API (regex + jetables + MX)
 */
export async function validateEmailServer(email: string): Promise<EmailValidationResult> {
  // D'abord les checks synchrones
  const clientCheck = validateEmailClient(email)
  if (!clientCheck.valid) return clientCheck

  // Puis MX
  const mxCheck = await verifyMxRecord(email)
  if (!mxCheck.valid) return mxCheck

  return { valid: true }
}
