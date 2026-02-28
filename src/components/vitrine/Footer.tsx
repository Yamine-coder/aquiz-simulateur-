'use client'

import { Mail, MapPin, Phone } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Lien footer qui force le scroll même si le hash est déjà actif */
function FooterLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isHashLink = href.startsWith('/#')
  const sectionId = isHashLink ? href.replace('/#', '') : null

  const handleClick = (e: React.MouseEvent) => {
    if (!sectionId) return
    // Si déjà sur la homepage, scroll manuellement
    if (pathname === '/') {
      e.preventDefault()
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="text-[13px] text-white/50 hover:text-white transition-colors"
    >
      {label}
    </Link>
  )
}

const FOOTER_SERVICES = [
  { label: 'Conseil en acquisition', href: '/#services' },
  { label: 'Chasse immobilière', href: '/#services' },
  { label: 'Solutions de financement', href: '/#services' },
]

const FOOTER_OUTILS = [
  { label: 'Simulateur immobilier', href: '/simulateur' },
  { label: 'Capacité d\'achat', href: '/simulateur/mode-a' },
  { label: 'Faisabilité de projet', href: '/simulateur/mode-b' },
  { label: 'Comparateur de biens', href: '/comparateur' },
  { label: 'Carte des prix IDF', href: '/carte' },
  { label: 'Aides & PTZ', href: '/aides' },
]

const FOOTER_LIENS = [
  { label: 'Accueil', href: '/' },
  { label: 'Blog immobilier', href: '/blog' },
  { label: 'Notre méthode', href: '/#methode' },
  { label: 'Tarifs', href: '/#tarifs' },
  { label: 'Avis clients', href: '/#temoignages' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Contact', href: '/#contact' },
]

const FOOTER_LEGAL = [
  { label: 'Mentions légales', href: '/mentions-legales' },
  { label: 'Politique de confidentialité', href: '/mentions-legales#confidentialite' },
  { label: 'CGU', href: '/mentions-legales#cgu' },
]

/** Réouvre le bandeau cookie via un événement global */
function reopenCookieBanner() {
  window.dispatchEvent(new Event('reopen-cookie-banner'))
}

/**
 * Footer corporate du site vitrine AQUIZ
 */
export function Footer() {
  const pathname = usePathname()

  // Masquer la bande CTA sur les pages outils et pages avec leur propre CTA
  const isToolPage = pathname.startsWith('/simulateur') || pathname.startsWith('/carte') || pathname.startsWith('/aides') || pathname.startsWith('/resultats') || pathname.startsWith('/comparateur') || pathname.startsWith('/a-propos') || pathname.startsWith('/mentions-legales')

  return (
    <footer className="bg-[#111111] text-white">

      {/* ─── Bande CTA (masquée sur les pages outils) ─── */}
      {!isToolPage && (
        <div className="bg-aquiz-green">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white text-center sm:text-left">
              Un conseiller peut négocier pour vous.
              <span className="text-white/75 font-normal ml-1.5">Sans engagement.</span>
            </p>
            <div className="flex gap-2.5 w-full sm:w-auto">
              <Link
                href="/simulateur"
                className="flex-1 sm:flex-none text-center px-5 py-2.5 bg-white text-aquiz-black font-semibold rounded-lg hover:bg-aquiz-gray-lightest transition-colors text-xs"
              >
                Lancer une simulation
              </Link>
              <Link
                href="https://calendly.com/contact-aquiz/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none text-center px-5 py-2.5 bg-white/15 text-white font-semibold rounded-lg hover:bg-white/25 border border-white/25 transition-colors text-xs"
              >
                Prendre rendez-vous
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Contenu principal ─── */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-10 md:pt-16 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">

          {/* ── Col gauche : Logo + desc + contacts + socials ── */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-block relative h-14 w-[150px] mb-5">
              <Image
                src="/logo-aquiz-white.png"
                alt="AQUIZ — Conseil en acquisition immobilière à Paris"
                fill
                className="object-contain object-left"
                sizes="150px"
              />
            </Link>

            <p className="text-[13px] text-white/40 leading-relaxed mb-6 max-w-xs">
              Conseil en acquisition immobilière à Paris et en Île-de-France. Nous accompagnons primo-accédants et investisseurs.
            </p>

            {/* Contacts */}
            <div className="space-y-2.5 text-[13px] mb-6">
              <a href="tel:+33749520106" className="flex items-center gap-2.5 text-white/50 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5 text-aquiz-green shrink-0" />
                07 49 52 01 06
              </a>
              <a href="mailto:contact@aquiz.eu" className="flex items-center gap-2.5 text-white/50 hover:text-white transition-colors">
                <Mail className="w-3.5 h-3.5 text-aquiz-green shrink-0" />
                contact@aquiz.eu
              </a>
              <div className="flex items-start gap-2.5 text-white/50">
                <MapPin className="w-3.5 h-3.5 text-aquiz-green shrink-0 mt-0.5" />
                <span>58 rue de Monceau, 75008 Paris</span>
              </div>
            </div>

            {/* Réseaux sociaux */}
            <div className="flex gap-2">
              {[
                { name: 'Instagram', letter: 'Ig', url: 'https://www.instagram.com/aquiz.eu/' },
                { name: 'LinkedIn', letter: 'Li', url: 'https://www.linkedin.com/company/aquiz/' },
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-aquiz-green/15 flex items-center justify-center transition-all group"
                >
                  <span className="text-[10px] font-bold text-white/30 group-hover:text-aquiz-green transition-colors">{social.letter}</span>
                </a>
              ))}
            </div>
          </div>

          {/* ── 4 colonnes de liens ── */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-6">

            {/* Services */}
            <nav aria-label="Services">
              <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.12em] mb-4">
                Services
              </h4>
              <ul className="space-y-3">
                {FOOTER_SERVICES.map((link) => (
                  <li key={link.label}>
                    <FooterLink href={link.href} label={link.label} />
                  </li>
                ))}
              </ul>
            </nav>

            {/* Outils */}
            <nav aria-label="Outils gratuits">
              <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.12em] mb-4">
                Outils gratuits
              </h4>
              <ul className="space-y-3">
                {FOOTER_OUTILS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[13px] text-white/50 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Navigation */}
            <nav aria-label="Navigation du site">
              <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.12em] mb-4">
                Navigation
              </h4>
              <ul className="space-y-3">
                {FOOTER_LIENS.map((link) => (
                  <li key={link.label}>
                    <FooterLink href={link.href} label={link.label} />
                  </li>
                ))}
              </ul>
            </nav>

            {/* Légal */}
            <nav aria-label="Informations légales">
              <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.12em] mb-4">
                Légal
              </h4>
              <ul className="space-y-3">
                {FOOTER_LEGAL.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[13px] text-white/50 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={reopenCookieBanner}
                    className="text-[13px] text-white/50 hover:text-white transition-colors cursor-pointer"
                  >
                    Gérer les cookies
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* ─── Barre copyright ─── */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/20">
          <p>© {new Date().getFullYear()} AQUIZ — Tous droits réservés</p>
          <p>Conception : Yamine Moussaoui · Données data.gouv.fr</p>
        </div>
      </div>
    </footer>
  )
}
