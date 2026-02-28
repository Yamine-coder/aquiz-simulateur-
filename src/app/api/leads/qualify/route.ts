import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * API Route — Qualification d'un lead existant
 * 
 * Met à jour le champ `contexte` d'un lead déjà créé
 * avec les réponses du questionnaire post-unlock :
 * - Type de projet
 * - Délai
 * - Score calculé (hot/warm/cold)
 */

const qualifySchema = z.object({
  email: z.string().email('Email invalide'),
  typeProjet: z.enum(['residence_principale', 'investissement', 'curieux']),
  delai: z.enum(['moins_3_mois', '3_6_mois', 'plus_6_mois', 'ne_sait_pas']),
})

/** Calcule le score du lead (0-100) */
function scoreLead(type: string, delai: string): { score: number; niveau: 'hot' | 'warm' | 'cold' } {
  let score = 0

  // Type de projet
  if (type === 'residence_principale') score += 50
  else if (type === 'investissement') score += 40
  else score += 10 // curieux

  // Délai
  if (delai === 'moins_3_mois') score += 50
  else if (delai === '3_6_mois') score += 35
  else if (delai === 'plus_6_mois') score += 20
  else score += 10 // ne sait pas

  const niveau = score >= 75 ? 'hot' : score >= 50 ? 'warm' : 'cold'
  return { score, niveau }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request.headers)
    const rateCheck = checkRateLimit(`qualify:${ip}`, RATE_LIMITS.contact)
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes.' },
        { status: 429 }
      )
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    const parsed = qualifySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, typeProjet, delai } = parsed.data
    const { score, niveau } = scoreLead(typeProjet, delai)

    // Trouver le lead le plus récent avec cet email
    const existingLead = await prisma.lead.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    })

    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead non trouvé' },
        { status: 404 }
      )
    }

    // Merge les données de qualification dans contexte (JSON)
    let contexte: Record<string, unknown> = {}
    try {
      if (existingLead.contexte) {
        contexte = JSON.parse(existingLead.contexte)
      }
    } catch {
      // Si contexte n'est pas du JSON valide, on repart de zéro
    }

    contexte.qualification = {
      typeProjet,
      delai,
      score,
      niveau,
      qualifiedAt: new Date().toISOString(),
    }

    await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        contexte: JSON.stringify(contexte),
      },
    })

    return NextResponse.json({ success: true, score, niveau })
  } catch (error) {
    console.error('[leads/qualify] Erreur:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
