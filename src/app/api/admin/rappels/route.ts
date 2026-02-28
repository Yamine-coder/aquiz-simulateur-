import { checkAdminAuth } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/rappels
 * Liste les demandes de rappel avec pagination et filtres.
 * 
 * Query params:
 * - page (default: 1)
 * - limit (default: 20)
 * - status (nouveau | rappelé | traité | archivé)
 * - search (recherche dans prénom, téléphone)
 */
export async function GET(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20))
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (status) {
    where.status = status
  }
  if (search) {
    where.OR = [
      { prenom: { contains: search } },
      { telephone: { contains: search } },
    ]
  }

  const [rappels, total] = await Promise.all([
    prisma.rappel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.rappel.count({ where }),
  ])

  return NextResponse.json({
    rappels,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

/**
 * PATCH /api/admin/rappels
 * Met à jour le statut et les notes d'un rappel.
 * Body: { id: string, status?: string, notes?: string }
 */
export async function PATCH(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const body = (await request.json()) as { id: string; status?: string; notes?: string }

  const validStatuses = ['nouveau', 'rappelé', 'traité', 'archivé']
  if (!body.id) {
    return NextResponse.json(
      { error: 'id requis' },
      { status: 400 }
    )
  }
  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: 'status invalide (nouveau | rappelé | traité | archivé)' },
      { status: 400 }
    )
  }

  const data: Record<string, unknown> = {}
  if (body.status) data.status = body.status
  if (body.notes !== undefined) data.notes = body.notes

  const rappel = await prisma.rappel.update({
    where: { id: body.id },
    data,
  })

  return NextResponse.json({ rappel })
}

/**
 * DELETE /api/admin/rappels
 * Supprime un ou plusieurs rappels.
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

  const result = await prisma.rappel.deleteMany({
    where: { id: { in: body.ids } },
  })

  return NextResponse.json({ deleted: result.count })
}
