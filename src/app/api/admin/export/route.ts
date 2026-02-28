import { checkAdminAuth } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/export?type=contacts|rappels
 * Exporte les données en CSV.
 */
export async function GET(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const url = new URL(request.url)
  const type = url.searchParams.get('type') ?? 'contacts'

  if (type === 'rappels') {
    const rappels = await prisma.rappel.findMany({ orderBy: { createdAt: 'desc' } })

    const SEP = ';'
    const header = ['ID','Date','Prénom','Téléphone','Créneau','Budget','Situation','Taux endettement','Statut','Notes','Email envoyé','Webhook envoyé'].join(SEP)
    const rows = rappels.map((r) =>
      [
        r.id,
        new Date(r.createdAt).toLocaleString('fr-FR'),
        escapeCSV(r.prenom),
        escapeCSV(r.telephone),
        r.creneau,
        r.budget ?? '',
        escapeCSV(r.situation ?? ''),
        r.tauxEndettement ?? '',
        r.status,
        escapeCSV(r.notes),
        r.emailSent ? 'Oui' : 'Non',
        r.webhookSent ? 'Oui' : 'Non',
      ].join(SEP)
    )

    const csv = '\uFEFF' + [header, ...rows].join('\r\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="aquiz-rappels-${formatFileDate()}.csv"`,
      },
    })
  }

  // Default: contacts
  const contacts = await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } })

  const SEP = ';'
  const header = ['ID','Date','Nom','Email','Téléphone','Message','Statut','Email envoyé'].join(SEP)
  const rows = contacts.map((c) =>
    [
      c.id,
      new Date(c.createdAt).toLocaleString('fr-FR'),
      escapeCSV(c.nom),
      escapeCSV(c.email),
      escapeCSV(c.telephone),
      escapeCSV(c.message),
      c.status,
      c.emailSent ? 'Oui' : 'Non',
    ].join(SEP)
  )

  const csv = '\uFEFF' + [header, ...rows].join('\r\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="aquiz-contacts-${formatFileDate()}.csv"`,
    },
  })
}

/** Échappe une valeur CSV (guillemets, retours à la ligne) */
function escapeCSV(value: string): string {
  if (!value) return ''
  if (value.includes(';') || value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Format: 2026-02-20 */
function formatFileDate(): string {
  return new Date().toISOString().slice(0, 10)
}
