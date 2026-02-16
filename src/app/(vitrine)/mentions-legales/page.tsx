import { FileText, Mail } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mentions légales — AQUIZ',
  description:
    'Mentions légales, politique de confidentialité et conditions générales d\'utilisation du site AQUIZ. Informations légales, hébergement et protection des données.',
  openGraph: {
    title: 'Mentions légales — AQUIZ',
    description:
      'Informations légales, politique de confidentialité et conditions générales d\'utilisation du site AQUIZ.',
    url: 'https://www.aquiz.eu/mentions-legales',
  },
  alternates: { canonical: 'https://www.aquiz.eu/mentions-legales' },
  robots: { index: false },
}

export default function MentionsLegalesPage() {
  return (
    <>
      {/* ─── Header dark (même style que homepage) ─── */}
      <section className="relative bg-aquiz-black pt-28 pb-12 md:pt-36 md:pb-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        <div className="absolute -bottom-20 -left-20 w-100 h-100 rounded-full bg-aquiz-green/6 blur-[80px]" />
        <div className="absolute -top-10 -right-20 w-80 h-80 rounded-full bg-aquiz-green/4 blur-[80px]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/8 text-aquiz-green text-xs font-medium mb-5">
            <FileText className="w-3.5 h-3.5" />
            Informations légales
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">Mentions légales</h1>
          <p className="mt-3 text-sm text-white/50 max-w-md">
            Transparence et conformité — toutes les informations légales relatives au site AQUIZ.
          </p>
        </div>
      </section>

      {/* ─── Contenu ─── */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 text-sm text-aquiz-gray leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-aquiz-black [&_h2]:mb-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-aquiz-black [&_h3]:mb-2 [&_h3]:mt-5 [&_a]:text-aquiz-green [&_a]:hover:underline">

          {/* 1 */}
          <div id="editeur" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 1</p>
            <h2>Éditeur du site</h2>
            <p>
              Le site <strong className="text-aquiz-black font-semibold">www.aquiz.eu</strong> est édité par <strong className="text-aquiz-black font-semibold">AQUIZ</strong> — 58 rue de Monceau, 75008 Paris.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <a href="mailto:contact@aquiz.eu" className="inline-flex items-center gap-1.5"><Mail className="w-3 h-3" />contact@aquiz.eu</a>
              <span className="text-aquiz-gray-light">Tél : 07 49 52 01 06</span>
            </div>
            <p className="mt-3 text-xs text-aquiz-gray-light">
              Directeur de la publication : AQUIZ · SIRET : en cours d&apos;immatriculation
            </p>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* 2 */}
          <div id="hebergeur" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 2</p>
            <h2>Hébergement</h2>
            <p>
              <strong className="text-aquiz-black font-semibold">Vercel Inc.</strong> — 440 N Barranca Ave #4133, Covia, CA 91723, États-Unis —{' '}
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
            </p>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* 3 */}
          <div id="propriete-intellectuelle" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 3</p>
            <h2>Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble des contenus présents sur le site www.aquiz.eu est protégé par les lois françaises et internationales relatives
              à la propriété intellectuelle. Toute reproduction, modification ou adaptation, totale ou partielle, est strictement interdite sans autorisation écrite préalable.
            </p>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* 4 */}
          <div id="confidentialite" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 4</p>
            <h2>Politique de confidentialité</h2>

            <h3>Données collectées</h3>
            <p>
              Les outils de simulation fonctionnent entièrement côté navigateur.{' '}
              <strong className="text-aquiz-black font-semibold">Aucune donnée personnelle n&apos;est transmise à nos serveurs</strong>.
              Les données sont stockées uniquement dans le navigateur (localStorage).
              Le formulaire de contact collecte nom, email, téléphone et message, utilisés uniquement pour répondre à votre demande.
            </p>

            <h3>Cookies</h3>
            <p>
              Le site utilise des cookies techniques nécessaires au fonctionnement et des cookies de mesure d&apos;audience anonymisés.
            </p>

            <h3>Vos droits (RGPD)</h3>
            <p>
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression et de portabilité
              de vos données. Contact : <a href="mailto:contact@aquiz.eu">contact@aquiz.eu</a>
            </p>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* 5 */}
          <div id="cgu" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 5</p>
            <h2>Conditions générales d&apos;utilisation</h2>

            <h3>Simulateur immobilier</h3>
            <p>
              Les simulations sont fournies <strong className="text-aquiz-black font-semibold">à titre indicatif uniquement</strong>.
              Elles ne constituent ni une offre de prêt, ni un engagement contractuel.
              Les résultats sont basés sur des hypothèses standards (taux d&apos;endettement HCSF 35%, taux d&apos;assurance moyen, etc.).
            </p>

            <h3>Données DVF</h3>
            <p>
              Les prix immobiliers proviennent des fichiers DVF publiés par la DGFiP sur{' '}
              <a href="https://data.gouv.fr" target="_blank" rel="noopener noreferrer">data.gouv.fr</a>{' '}
              sous <strong className="text-aquiz-black font-semibold">Licence Ouverte 2.0</strong>. Ces données reflètent les transactions passées.
            </p>

            <h3>Responsabilité</h3>
            <p>
              AQUIZ s&apos;efforce de fournir des informations exactes mais ne peut garantir l&apos;absence d&apos;erreurs.
              Vérifiez les informations auprès de professionnels qualifiés avant toute décision d&apos;achat.
            </p>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* 6 */}
          <div id="droit-applicable" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 6</p>
            <h2>Droit applicable</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français.
              En cas de litige, les tribunaux de Paris seront seuls compétents.
            </p>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-aquiz-gray-lighter/40">
            <p className="text-xs text-aquiz-gray-light">
              Dernière mise à jour : février 2026
            </p>
            <Link
              href="/#contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aquiz-black text-white text-xs font-semibold hover:bg-aquiz-black/90 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
