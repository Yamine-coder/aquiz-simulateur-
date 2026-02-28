import { PrismaClient } from '@/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

/**
 * Singleton Prisma Client avec adapter LibSQL/SQLite
 * 
 * En développement, on réutilise l'instance entre les hot-reloads
 * pour éviter d'épuiser les connexions.
 * En production, on crée une seule instance.
 * 
 * Pour migrer vers Postgres : remplacer l'adapter par @prisma/adapter-pg
 * et modifier DATABASE_URL vers une URL PostgreSQL.
 */

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  })
  return new PrismaClient({ adapter }) as unknown as PrismaClient
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
