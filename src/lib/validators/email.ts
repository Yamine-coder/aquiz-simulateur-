/**
 * Validation d'email — utilisée côté client + API
 *
 * 3 niveaux :
 * 1. Regex stricte (format x@domaine.ext)
 * 2. Blocage des domaines jetables (Yopmail, Guerrillamail…)
 * 3. Vérification MX côté API (dns.resolveMx)
 */

/** Regex RFC-like simplifiée — couvre 99.9% des emails valides */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

/**
 * Domaines jetables / temporaires les plus courants
 * Source : agrégation des listes publiques (disposable-email-domains)
 */
const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  // Yopmail & variantes
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'yopmail.gq',
  // Guerrillamail
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.de', 'guerrillamailblock.com', 'grr.la', 'sharklasers.com', 'guerrillamail.info',
  // Mailinator
  'mailinator.com', 'mailinator2.com', 'mailinator.net',
  // Temp-mail
  'temp-mail.org', 'tempmail.com', 'temp-mail.io', 'tempail.com',
  // 10MinuteMail
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  // Jetable / Throwaway
  'jetable.org', 'throwaway.email', 'throwaway.com',
  // TrashMail
  'trashmail.com', 'trashmail.net', 'trashmail.org', 'trashmail.me', 'trashinbox.com',
  // Dispostable
  'dispostable.com', 'mailnesia.com', 'tempinbox.com',
  // Maildrop
  'maildrop.cc', 'maildrop.ml',
  // Mohmal
  'mohmal.com', 'emailondeck.com',
  // Fakeinbox / FakeMail
  'fakeinbox.com', 'fakemail.net', 'fakemail.fr',
  // Mailcatch
  'mailcatch.com', 'mailexpire.com', 'mailmoat.com',
  // Getairmail
  'getairmail.com', 'filzmail.com',
  // Mailnull / Spamgourmet
  'mailnull.com', 'spamgourmet.com', 'spamgourmet.net',
  // MailDrop alternatives
  'discard.email', 'discardmail.com', 'discardmail.de',
  // Crazymailing
  'crazymailing.com', 'armyspy.com', 'dayrep.com',
  // Bugmenot-related
  'bugmenot.com', 'einrot.com',
  // Misc populaires
  'mailforspam.com', 'safetymail.info', 'tempr.email', 'tempomail.fr',
  'emailfake.com', 'generator.email', 'inboxkitten.com',
  'mytemp.email', 'harakirimail.com', 'mt2015.com',
  'receiveee.com', 'tmail.ws', 'tmpmail.net', 'tmpmail.org',
  'emailtemporaire.com', 'mail-temporaire.fr',
  'getnada.com', 'nada.email', 'anonbox.net',
  'mintemail.com', 'tempmailo.com', 'burnermail.io',
  'mailsac.com', 'mailtemp.net',
])

interface EmailValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validation côté client (synchrone) — regex + domaines jetables
 */
export function validateEmailClient(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase()

  if (!trimmed) {
    return { valid: false, error: 'Email requis' }
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Format d\'email invalide' }
  }

  const domain = trimmed.split('@')[1]
  if (!domain) {
    return { valid: false, error: 'Format d\'email invalide' }
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, error: 'Les emails jetables ne sont pas acceptés' }
  }

  return { valid: true }
}
