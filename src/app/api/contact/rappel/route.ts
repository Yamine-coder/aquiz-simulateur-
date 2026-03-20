import { escapeHtml } from '@/lib/escapeHtml'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * API Route pour les demandes de rappel
 * 
 * Canaux de notification (configurables via .env):
 * 1. RAPPEL_EMAIL_TO + RESEND_API_KEY → Email de notification
 * 2. RAPPEL_WEBHOOK_URL → Slack/Discord/Make/Zapier
 * 3. Console log → Visible dans Vercel Function Logs
 */

/** Schéma Zod pour la validation stricte de la demande de rappel */
const rappelSchema = z.object({
  prenom: z.string().min(2, 'Prénom requis (2 caractères min)').max(100),
  telephone: z.string().regex(/^(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}$/, 'Numéro de téléphone français invalide'),
  creneau: z.enum(['matin', 'midi', 'soir']),
  budget: z.number().min(0).max(10_000_000).optional(),
  situation: z.string().max(200).optional(),
  tauxEndettement: z.number().min(0).max(100).optional(),
})

type RappelRequest = z.infer<typeof rappelSchema>

export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ─────────────────────────────────────
    const ip = getClientIP(request.headers)
    const rateCheck = checkRateLimit(`rappel:${ip}`, RATE_LIMITS.rappel)
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      )
    }

    // ── Parse JSON avec gestion d'erreur ──────────────────
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide' },
        { status: 400 }
      )
    }

    // ── Validation Zod ────────────────────────────────────
    const parsed = rappelSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const data: RappelRequest = parsed.data

    // Formater le téléphone
    const telFormate = data.telephone.replace(/\s/g, '')
    
    // ── Sauvegarder en base de données ──────────────────
    let rappelId: string | null = null
    try {
      const rappel = await prisma.rappel.create({
        data: {
          prenom: data.prenom,
          telephone: telFormate,
          creneau: data.creneau,
          budget: data.budget ?? null,
          situation: data.situation ?? null,
          tauxEndettement: data.tauxEndettement ?? null,
          ip,
        },
      })
      rappelId = rappel.id
      // Track rappel event (no PII)
      prisma.analyticsEvent.create({ data: { event: 'rappel-form', data: JSON.stringify({ creneau: data.creneau, budget: data.budget ? Math.round(data.budget / 10000) * 10000 : null }) } }).catch(() => {})
    } catch (dbError) {
      console.error('❌ Erreur sauvegarde BDD rappel:', dbError)
    }

    // Créer la demande (pour les logs et notifications)
    const demande = {
      id: rappelId ?? `rappel_${Date.now()}`,
      date: new Date().toISOString(),
      prenom: data.prenom,
      telephone: telFormate,
      creneau: data.creneau,
      budget: data.budget,
      situation: data.situation,
      tauxEndettement: data.tauxEndettement
    }

    // 1. Log serveur (toujours actif)
    console.info('📞 RAPPEL', JSON.stringify({
      id: demande.id,
      date: demande.date,
      creneau: demande.creneau,
      budget: demande.budget ?? null,
    }))

    // 2. Webhook (si configuré)
    const webhookUrl = process.env.RAPPEL_WEBHOOK_URL
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `📞 Nouvelle demande de rappel\n\n` +
                  `**${demande.prenom}** - ${demande.telephone}\n` +
                  `Créneau: ${demande.creneau}\n` +
                  `Budget: ${demande.budget ? new Intl.NumberFormat('fr-FR').format(demande.budget) + ' €' : 'N/A'}`,
            ...demande
          })
        })
        console.info('✅ Webhook envoyé')
        // Mettre à jour le flag webhookSent
        if (rappelId) {
          await prisma.rappel.update({
            where: { id: rappelId },
            data: { webhookSent: true },
          }).catch(() => {/* ignore */})
        }
      } catch (e) {
        console.error('❌ Erreur webhook:', e)
      }
    }

    // 3. Email (si configuré - exemple avec Resend)
    const emailTo = process.env.RAPPEL_EMAIL_TO
    const resendApiKey = process.env.RESEND_API_KEY
    if (emailTo && resendApiKey) {
      try {
        // Formater le créneau sans emoji
        const creneauLabel = demande.creneau === 'matin' 
          ? 'Matin (9h - 12h)' 
          : demande.creneau === 'midi' 
            ? 'Après-midi (14h - 17h)' 
            : 'Soir (17h - 20h)'

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'AQUIZ <onboarding@resend.dev>',
            to: emailTo,
            subject: `Nouvelle demande de rappel - ${demande.prenom}`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color: #6fcf97; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">AQUIZ</span>
                  </td>
                  <td align="right">
                    <span style="color: #6fcf97; background-color: rgba(111, 207, 151, 0.15); padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Nouveau lead</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">Demande de rappel</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #666666;">Un prospect souhaite être contacté</p>
            </td>
          </tr>

          <!-- Info Card -->
          <tr>
            <td style="padding: 0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 12px; border: 1px solid #eee;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <!-- Prénom -->
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Prénom</span>
                          <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${escapeHtml(demande.prenom)}</p>
                        </td>
                      </tr>
                      <!-- Téléphone -->
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Téléphone</span>
                          <p style="margin: 4px 0 0 0;">
                            <a href="tel:${escapeHtml(demande.telephone)}" style="font-size: 18px; font-weight: 700; color: #6fcf97; text-decoration: none;">${escapeHtml(demande.telephone)}</a>
                          </p>
                        </td>
                      </tr>
                      <!-- Créneau -->
                      <tr>
                        <td style="padding: 12px 0;${demande.budget ? ' border-bottom: 1px solid #eee;' : ''}">
                          <span style="color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Créneau préféré</span>
                          <p style="margin: 4px 0 0 0; font-size: 15px; color: #1a1a1a;">${creneauLabel}</p>
                        </td>
                      </tr>
                      ${demande.budget ? `
                      <!-- Budget -->
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Budget estimé</span>
                          <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">${new Intl.NumberFormat('fr-FR').format(demande.budget)} €</p>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="tel:${escapeHtml(demande.telephone)}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600;">
                      Appeler ${escapeHtml(demande.prenom)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px 32px; border-top: 1px solid #eee;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 12px; color: #999;">Reçu le ${new Date(demande.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${new Date(demande.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; color: #ccc;">via AQUIZ</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `
          })
        })
        
        const emailResult = await emailResponse.json()
        if (emailResponse.ok) {
          console.info('✅ Email rappel envoyé - ID:', emailResult.id)
          // Mettre à jour le flag emailSent
          if (rappelId) {
            await prisma.rappel.update({
              where: { id: rappelId },
              data: { emailSent: true },
            }).catch(() => {/* ignore */})
          }
        } else {
          console.error('❌ Erreur Resend:', emailResult)
        }
      } catch (e) {
        console.error('❌ Erreur email:', e)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Demande enregistrée',
      id: demande.id 
    })

  } catch (error) {
    console.error('Erreur API rappel:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
