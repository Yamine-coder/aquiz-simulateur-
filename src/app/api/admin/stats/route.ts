import { checkAdminAuth } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/stats
 * Statistiques globales pour le dashboard admin.
 */
export async function GET(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const [
    totalContacts,
    contactsNouveaux,
    totalRappels,
    rappelsNouveaux,
    contactsAujourdhui,
    rappelsAujourdhui,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { status: 'nouveau' } }),
    prisma.rappel.count(),
    prisma.rappel.count({ where: { status: 'nouveau' } }),
    prisma.contact.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.rappel.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ])

  return NextResponse.json({
    contacts: {
      total: totalContacts,
      nouveaux: contactsNouveaux,
      aujourdhui: contactsAujourdhui,
    },
    rappels: {
      total: totalRappels,
      nouveaux: rappelsNouveaux,
      aujourdhui: rappelsAujourdhui,
    },
  })
}
