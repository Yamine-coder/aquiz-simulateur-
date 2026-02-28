import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import { validateEmailServer } from '@/lib/validators/email.server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * API Route — Persistance des leads
 * 
 * Stocke les leads capturés depuis :
 * - Comparateur (LockedSection email)
 * - Simulateur Mode A / Mode B (PDF gate)
 * - Carte interactive / Aides (futurs)
 * 
 * Validation email : regex + domaines jetables + vérification MX
 */

const leadSchema = z.object({
  email: z.string().email('Email invalide'),
  prenom: z.string().max(100).optional().default(''),
  source: z.enum(['comparateur', 'simulateur-a', 'simulateur-b', 'carte', 'aides']),
  contexte: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request.headers)
    const rateCheck = checkRateLimit(`lead:${ip}`, RATE_LIMITS.contact)
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      )
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    const parsed = leadSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, prenom, source, contexte } = parsed.data

    // Validation avancée : domaines jetables + MX
    const emailValidation = await validateEmailServer(email)
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error || 'Email invalide' },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.create({
      data: {
        email,
        prenom: prenom || '',
        source,
        contexte: contexte ? JSON.stringify(contexte) : '',
        ip,
      },
    })

    return NextResponse.json({ success: true, id: lead.id })
  } catch (error) {
    console.error('[leads] Erreur:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
