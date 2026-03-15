import { checkAdminAuth } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/leads
 * Liste les leads avec pagination, filtres par source et niveau.
 */
export async function GET(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20))
  const source = url.searchParams.get('source')
  const search = url.searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (source) where.source = source
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { prenom: { contains: search } },
    ]
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ])

  return NextResponse.json({
    leads,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

/**
 * DELETE /api/admin/leads
 * Supprime un ou plusieurs leads.
 */
export async function DELETE(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const body = (await request.json()) as { ids: string[] }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'ids requis' }, { status: 400 })
  }

  const result = await prisma.lead.deleteMany({ where: { id: { in: body.ids } } })
  return NextResponse.json({ deleted: result.count })
}
