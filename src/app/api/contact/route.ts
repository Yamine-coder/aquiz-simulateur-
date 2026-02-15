import { NextResponse } from 'next/server'

/** Shape of the contact form payload */
interface ContactPayload {
  nom: string
  email: string
  telephone: string
  message: string
  rgpdConsent: boolean
}

/**
 * Envoie un email via Resend API.
 * Nécessite RESEND_API_KEY et CONTACT_EMAIL_TO dans les variables d'environnement.
 */
async function sendEmailViaResend(body: ContactPayload): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY
  const emailTo = process.env.CONTACT_EMAIL_TO

  if (!resendApiKey || !emailTo) return false

  const dateFormatee = new Date().toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AQUIZ <onboarding@resend.dev>',
      to: emailTo,
      subject: `Nouveau message de ${body.nom.trim()}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        <tr><td style="background:#1a1a1a;padding:28px 32px;">
          <table width="100%"><tr>
            <td><span style="color:#22c55e;font-size:24px;font-weight:700;">AQUIZ</span></td>
            <td align="right"><span style="color:#22c55e;background:rgba(34,197,94,0.15);padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;">Nouveau message</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">Message de contact</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#666;">Reçu le ${dateFormatee}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
              <span style="font-size:12px;color:#999;text-transform:uppercase;">Nom</span><br>
              <span style="font-size:15px;color:#1a1a1a;font-weight:500;">${body.nom.trim()}</span>
            </td></tr>
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
              <span style="font-size:12px;color:#999;text-transform:uppercase;">Email</span><br>
              <a href="mailto:${body.email.trim()}" style="font-size:15px;color:#22c55e;text-decoration:none;">${body.email.trim()}</a>
            </td></tr>
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
              <span style="font-size:12px;color:#999;text-transform:uppercase;">Téléphone</span><br>
              <a href="tel:${body.telephone?.trim() ?? ''}" style="font-size:15px;color:#22c55e;text-decoration:none;">${body.telephone?.trim() || 'Non renseigné'}</a>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <span style="font-size:12px;color:#999;text-transform:uppercase;">Message</span><br>
              <p style="margin:8px 0 0;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">${body.message.trim()}</p>
            </td></tr>
          </table>
          <table width="100%" style="margin-top:24px;"><tr><td align="center">
            <a href="mailto:${body.email.trim()}?subject=Re: Votre demande AQUIZ" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">Répondre à ${body.nom.trim().split(' ')[0]}</a>
          </td></tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    }),
  })

  return res.ok
}

/**
 * POST /api/contact
 * Receives a contact form submission, validates it, and sends a notification email.
 * Falls back to console log if Resend is not configured.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactPayload

    // ── Validation ───────────────────────────────────────
    const errors: string[] = []

    if (!body.nom || body.nom.trim().length < 2) {
      errors.push('Le nom est requis (2 caractères minimum)')
    }

    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.push('Adresse email invalide')
    }

    if (!body.message || body.message.trim().length < 3) {
      errors.push('Le message doit contenir au moins 3 caractères')
    }

    if (!body.rgpdConsent) {
      errors.push('Vous devez accepter la politique de confidentialité')
    }

    if (errors.length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    // ── Log serveur (toujours actif) ─────────────────────
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.info('📩 NOUVEAU MESSAGE DE CONTACT')
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.info(`Nom: ${body.nom.trim()}`)
    console.info(`Email: ${body.email.trim()}`)
    console.info(`Tél: ${body.telephone?.trim() ?? 'N/A'}`)
    console.info(`Message: ${body.message.trim().slice(0, 100)}…`)
    console.info(`Date: ${new Date().toLocaleString('fr-FR')}`)
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // ── Email via Resend (si configuré) ──────────────────
    try {
      const emailSent = await sendEmailViaResend(body)
      if (emailSent) {
        console.info('✅ Email envoyé via Resend')
      } else {
        console.info('ℹ️  Resend non configuré — message uniquement loggé')
      }
    } catch (emailError) {
      console.error('❌ Erreur envoi email:', emailError)
      // On ne bloque pas la réponse si l'email échoue
    }

    return NextResponse.json({
      success: true,
      message: 'Votre message a bien été envoyé. Nous vous répondrons sous 24h.',
    })
  } catch {
    return NextResponse.json(
      { success: false, errors: ['Erreur serveur. Veuillez réessayer.'] },
      { status: 500 },
    )
  }
}
