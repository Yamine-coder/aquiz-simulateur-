import { checkAdminAuth } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/contacts
 * Liste les messages de contact avec pagination et filtres.
 * 
 * Query params:
 * - page (default: 1)
 * - limit (default: 20)
 * - status (nouveau | lu | traité | archivé)
 * - search (recherche dans nom, email, message)
 */
export async function GET(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20))
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')

  // Construire les filtres
  const where: Record<string, unknown> = {}
  if (status) {
    where.status = status
  }
  if (search) {
    where.OR = [
      { nom: { contains: search } },
      { email: { contains: search } },
      { message: { contains: search } },
    ]
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ])

  return NextResponse.json({
    contacts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

/**
 * PATCH /api/admin/contacts
 * Met à jour le statut d'un contact.
 * Body: { id: string, status: string }
 */
export async function PATCH(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const body = (await request.json()) as { id: string; status: string }

  const validStatuses = ['nouveau', 'lu', 'traité', 'archivé']
  if (!body.id || !validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: 'id et status requis (nouveau | lu | traité | archivé)' },
      { status: 400 }
    )
  }

  const contact = await prisma.contact.update({
    where: { id: body.id },
    data: { status: body.status },
  })

  return NextResponse.json({ contact })
}

/**
 * DELETE /api/admin/contacts
 * Supprime un ou plusieurs contacts.
 * Body: { ids: string[] }
 */
export async function DELETE(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const body = (await request.json()) as { ids: string[] }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json(
      { error: 'ids requis (tableau de string)' },
      { status: 400 }
    )
  }

  const result = await prisma.contact.deleteMany({
    where: { id: { in: body.ids } },
  })

  return NextResponse.json({ deleted: result.count })
}
