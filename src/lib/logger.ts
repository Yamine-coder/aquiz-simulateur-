/**
 * Logger client — supprime les logs en production.
 * Côté serveur (API routes), utiliser console.info/console.error directement.
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  error: (...args: unknown[]): void => {
    if (isDev) console.error(...args)
  },
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn(...args)
  },
  info: (...args: unknown[]): void => {
    if (isDev) console.info(...args)
  },
} as const
