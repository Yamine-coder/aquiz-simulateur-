import { checkAdminAuth } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/newsletter
 * Liste les abonnés newsletter avec pagination et filtres.
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
  if (status) where.status = status
  if (search) {
    where.email = { contains: search }
  }

  const [subscribers, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { subscribedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.newsletterSubscriber.count({ where }),
  ])

  return NextResponse.json({
    subscribers,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

/**
 * PATCH /api/admin/newsletter
 * Met à jour le statut d'un abonné.
 */
export async function PATCH(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const body = (await request.json()) as { id: string; status: string }
  if (!body.id || !['active', 'unsubscribed'].includes(body.status)) {
    return NextResponse.json({ error: 'id et status requis (active | unsubscribed)' }, { status: 400 })
  }

  const subscriber = await prisma.newsletterSubscriber.update({
    where: { id: body.id },
    data: { status: body.status },
  })

  return NextResponse.json({ subscriber })
}

/**
 * DELETE /api/admin/newsletter
 * Supprime des abonnés.
 */
export async function DELETE(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const body = (await request.json()) as { ids: string[] }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'ids requis' }, { status: 400 })
  }

  const result = await prisma.newsletterSubscriber.deleteMany({ where: { id: { in: body.ids } } })
  return NextResponse.json({ deleted: result.count })
}
