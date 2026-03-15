import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/analytics/event
 * Enregistre un événement analytics anonyme (pas de PII).
 * Appelé côté client à chaque action clé : simulation, comparaison, etc.
 */

const VALID_EVENTS = [
  'simulation-a',
  'simulation-b',
  'simulation-a-start',
  'simulation-b-start',
  'simulation-a-step',
  'simulation-b-step',
  'pdf-download',
  'comparaison',
  'carte-view',
  'aides-check',
  'lead-capture',
  'contact-form',
  'rappel-form',
  'cta-click',
] as const

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { event: string; data?: Record<string, unknown> }

    if (!body.event || !VALID_EVENTS.includes(body.event as (typeof VALID_EVENTS)[number])) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    // Sanitize data — remove any PII-like fields
    const safeData = body.data ?? {}
    delete safeData.email
    delete safeData.nom
    delete safeData.prenom
    delete safeData.telephone
    delete safeData.ip

    await prisma.analyticsEvent.create({
      data: {
        event: body.event,
        data: JSON.stringify(safeData),
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
