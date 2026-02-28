import * as Sentry from '@sentry/nextjs'

/**
 * Logger client — supprime les logs verbeux en production.
 * Les erreurs sont toujours envoyées à Sentry (si configuré).
 * Côté serveur (API routes), utiliser console.info/console.error directement.
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  error: (...args: unknown[]): void => {
    if (isDev) console.error(...args)
    // Toujours envoyer les erreurs à Sentry en prod
    const err = args[0]
    if (err instanceof Error) {
      Sentry.captureException(err)
    } else {
      Sentry.captureMessage(String(args[0]), {
        level: 'error',
        extra: { details: args.slice(1) },
      })
    }
  },
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn(...args)
  },
  info: (...args: unknown[]): void => {
    if (isDev) console.info(...args)
  },
} as const
