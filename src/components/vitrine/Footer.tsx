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

/**
 * Footer corporate du site vitrine AQUIZ
 */
export function Footer() {
  return (
    <footer className="bg-[#111111] text-white">

      {/* ─── Bande CTA verte ─── */}
      <div className="bg-aquiz-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">
            Un conseiller peut négocier pour vous.
            <span className="text-white/75 font-normal ml-1.5">Sans engagement.</span>
          </p>
          <div className="flex gap-2.5">
            <Link
              href="/simulateur"
              className="px-5 py-2.5 bg-white text-aquiz-black font-semibold rounded-lg hover:bg-aquiz-gray-lightest transition-colors text-xs"
            >
              Lancer une simulation
            </Link>
            <Link
              href="https://calendly.com/contact-aquiz/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-white/15 text-white font-semibold rounded-lg hover:bg-white/25 border border-white/25 transition-colors text-xs"
            >
              Prendre rendez-vous
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Contenu principal ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-8 lg:gap-6">

          {/* Col 1 — Marque + coordonnées (lg:4) */}
          <div className="col-span-2 md:col-span-3 lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8">
                <Image
                  src="/image AQUIZ.jpeg"
                  alt="AQUIZ"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain rounded-md"
                />
              </div>
              <span className="text-lg font-bold text-white">AQUIZ</span>
            </Link>
            <p className="text-[13px] text-white/40 leading-relaxed mb-5 max-w-xs">
              Conseil en acquisition immobilière à Paris et en Île-de-France. Nous accompagnons primo-accédants et investisseurs à chaque étape.
            </p>

            <div className="space-y-2.5 text-[13px]">
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
            <div className="flex gap-2 mt-5">
              {[
                { name: 'Instagram', letter: 'in', url: 'https://www.instagram.com/aquiz.eu/' },
                { name: 'Facebook', letter: 'fb', url: 'https://www.facebook.com/' },
                { name: 'LinkedIn', letter: 'Li', url: 'https://www.linkedin.com/' },
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-aquiz-green/20 hover:text-aquiz-green flex items-center justify-center transition-all"
                >
                  <span className="text-[10px] font-bold text-white/40 hover:text-aquiz-green">{social.letter}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Services (lg:2) */}
          <div className="col-span-1 lg:col-span-2">
            <h4 className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-4">
              Services
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_SERVICES.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Outils (lg:2) */}
          <div className="col-span-1 lg:col-span-2">
            <h4 className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-4">
              Outils gratuits
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_OUTILS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-white/50 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Liens utiles (lg:2) */}
          <div className="col-span-1 lg:col-span-2">
            <h4 className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-4">
              Navigation
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_LIENS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          {/* Col 5 — Légal (lg:2) */}
          <div className="col-span-1 lg:col-span-2">
            <h4 className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-4">
              Légal
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_LEGAL.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-white/50 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ─── Barre copyright ─── */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-white/25">
          <p>© {new Date().getFullYear()} AQUIZ — Tous droits réservés</p>
          <p>Simulation indicative, non contractuelle · Données DVF data.gouv.fr</p>
        </div>
      </div>
    </footer>
  )
}
