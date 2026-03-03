import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import { validateEmailServer } from '@/lib/validators/email.server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * API Route — Newsletter
 *
 * Gère l'inscription à la newsletter du blog AQUIZ.
 * - Validation email (regex + domaines jetables + MX)
 * - Upsert : réabonne si déjà existant mais désabonné
 * - Rate limiting par IP
 */

const newsletterSchema = z.object({
  email: z.string().email('Email invalide'),
  source: z.enum(['blog', 'article', 'homepage']).optional().default('blog'),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request.headers)
    const rateCheck = checkRateLimit(`newsletter:${ip}`, RATE_LIMITS.contact)
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

    const parsed = newsletterSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, source } = parsed.data

    // Validation avancée : domaines jetables + MX
    const emailValidation = await validateEmailServer(email)
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error || 'Email invalide' },
        { status: 400 }
      )
    }

    // Upsert : créer ou réactiver si désabonné
    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        source,
        ip,
        status: 'active',
      },
      update: {
        status: 'active',
        source,
        ip,
      },
    })

    return NextResponse.json({
      success: true,
      id: subscriber.id,
      message: 'Inscription confirmée ! Bienvenue dans la newsletter AQUIZ.',
    })
  } catch (error) {
    console.error('[newsletter] Erreur:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
