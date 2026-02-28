import { FileText, Mail } from 'lucide-react'
import type { Metadata } from 'next'

import { ContactButton } from '@/components/vitrine/ContactButton'

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

          {/* ──────────────────────────────────────── */}
          {/* 1 — ÉDITEUR DU SITE                     */}
          {/* ──────────────────────────────────────── */}
          <div id="editeur" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 1</p>
            <h2>Éditeur du site</h2>
            <p>
              Le site <strong className="text-aquiz-black font-semibold">www.aquiz.eu</strong> est édité par :
            </p>
            <div className="mt-3 bg-aquiz-gray-lightest/40 rounded-xl p-4 text-xs space-y-1.5 border border-aquiz-gray-lighter/50">
              <p><strong className="text-aquiz-black">Yacine Houanti</strong> — Entrepreneur individuel</p>
              <p>Enseigne commerciale : <strong className="text-aquiz-black">AQUIZ</strong></p>
              <p>Siège : 58 rue de Monceau, 75008 Paris</p>
              <p>SIRET : 923 741 557 00030 · SIREN : 923 741 557</p>
              <p>RCS Paris : 923 741 557 (inscrit le 08/07/2025)</p>
              <p>N° TVA intracommunautaire : FR61923741557</p>
              <p>Code NAF : 68.31Z — Agences immobilières</p>
              <p>
                Carte professionnelle Transaction n° CPI75012025000000380,
                délivrée par la CCI Paris Île-de-France
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <a href="mailto:contact@aquiz.eu" className="inline-flex items-center gap-1.5"><Mail className="w-3 h-3" />contact@aquiz.eu</a>
              <span className="text-aquiz-gray-light">Tél : 07 49 52 01 06</span>
            </div>
            <p className="mt-3 text-xs text-aquiz-gray-light">
              Directeur de la publication : Yacine Houanti
            </p>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* ──────────────────────────────────────── */}
          {/* 2 — HÉBERGEMENT                         */}
          {/* ──────────────────────────────────────── */}
          <div id="hebergeur" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 2</p>
            <h2>Hébergement</h2>
            <p>
              <strong className="text-aquiz-black font-semibold">Vercel Inc.</strong> — 440 N Barranca Ave #4133, Covia, CA 91723, États-Unis —{' '}
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
            </p>
            <p className="mt-2 text-xs text-aquiz-gray-light">
              Les données sont hébergées aux États-Unis. Le transfert est encadré par les clauses contractuelles types (SCCs) de la Commission européenne conformément au RGPD.
            </p>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* ──────────────────────────────────────── */}
          {/* 3 — PROPRIÉTÉ INTELLECTUELLE            */}
          {/* ──────────────────────────────────────── */}
          <div id="propriete-intellectuelle" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 3</p>
            <h2>Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble des contenus présents sur le site www.aquiz.eu (textes, graphismes, logos, images, logiciels, base de données)
              est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
              Toute reproduction, modification ou adaptation, totale ou partielle, est strictement interdite sans autorisation écrite préalable de Yacine Houanti.
            </p>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* ──────────────────────────────────────── */}
          {/* 4 — POLITIQUE DE CONFIDENTIALITÉ (RGPD) */}
          {/* ──────────────────────────────────────── */}
          <div id="confidentialite" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 4</p>
            <h2>Politique de confidentialité</h2>

            <h3>Responsable de traitement</h3>
            <p>
              Le responsable du traitement des données personnelles est <strong className="text-aquiz-black font-semibold">Yacine Houanti</strong>,
              Entrepreneur individuel, 58 rue de Monceau, 75008 Paris.
              Contact : <a href="mailto:contact@aquiz.eu">contact@aquiz.eu</a>
            </p>

            <h3>Données collectées et finalités</h3>
            <p>
              Les outils de simulation (Mode A, Mode B, Carte, Aides, Comparateur) fonctionnent entièrement côté navigateur.{' '}
              <strong className="text-aquiz-black font-semibold">Aucune donnée de simulation n&apos;est transmise à nos serveurs</strong>.
              Les données sont stockées uniquement dans votre navigateur (localStorage).
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs border border-aquiz-gray-lighter rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-aquiz-gray-lightest/60">
                    <th className="text-left px-3 py-2 font-semibold text-aquiz-black border-b border-aquiz-gray-lighter">Traitement</th>
                    <th className="text-left px-3 py-2 font-semibold text-aquiz-black border-b border-aquiz-gray-lighter">Données</th>
                    <th className="text-left px-3 py-2 font-semibold text-aquiz-black border-b border-aquiz-gray-lighter">Base légale</th>
                    <th className="text-left px-3 py-2 font-semibold text-aquiz-black border-b border-aquiz-gray-lighter">Durée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-aquiz-gray-lighter/50">
                  <tr>
                    <td className="px-3 py-2 font-medium text-aquiz-black">Formulaire de contact</td>
                    <td className="px-3 py-2">Nom, email, téléphone, message, adresse IP</td>
                    <td className="px-3 py-2">Consentement</td>
                    <td className="px-3 py-2">3 ans</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-aquiz-black">Demande de rappel</td>
                    <td className="px-3 py-2">Prénom, téléphone, créneau, budget, situation, taux d&apos;endettement, adresse IP</td>
                    <td className="px-3 py-2">Consentement</td>
                    <td className="px-3 py-2">3 ans</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-aquiz-black">Déblocage de contenu (email gate)</td>
                    <td className="px-3 py-2">Email, prénom, source, contexte (budget, score…), adresse IP</td>
                    <td className="px-3 py-2">Consentement</td>
                    <td className="px-3 py-2">3 ans</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-aquiz-black">Newsletter / veille marché</td>
                    <td className="px-3 py-2">Email, adresse IP</td>
                    <td className="px-3 py-2">Consentement</td>
                    <td className="px-3 py-2">3 ans après dernier contact</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-aquiz-black">Envoi rapport comparatif</td>
                    <td className="px-3 py-2">Email, prénom, données des biens comparés, adresse IP</td>
                    <td className="px-3 py-2">Consentement</td>
                    <td className="px-3 py-2">3 ans</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-aquiz-black">Mesure d&apos;audience</td>
                    <td className="px-3 py-2">Données anonymisées (pages vues, appareil, pays)</td>
                    <td className="px-3 py-2">Consentement (cookie)</td>
                    <td className="px-3 py-2">13 mois</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-aquiz-black">Simulations (localStorage)</td>
                    <td className="px-3 py-2">Paramètres et résultats de simulation</td>
                    <td className="px-3 py-2">Intérêt légitime</td>
                    <td className="px-3 py-2">Stockage local uniquement — supprimable par l&apos;utilisateur à tout moment</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Destinataires</h3>
            <p>
              Vos données personnelles sont accessibles uniquement à Yacine Houanti (responsable de traitement).
              Les sous-traitants techniques suivants peuvent y accéder dans le cadre de leurs prestations :
            </p>
            <ul className="mt-2 space-y-1 text-xs list-disc list-inside">
              <li><strong className="text-aquiz-black">Vercel Inc.</strong> (hébergement, analytics) — États-Unis, encadré par SCCs</li>
              <li><strong className="text-aquiz-black">Resend</strong> (envoi d&apos;emails transactionnels) — États-Unis, encadré par SCCs</li>
            </ul>
            <p className="mt-2">
              Aucune donnée n&apos;est vendue, louée ou cédée à des tiers à des fins commerciales.
            </p>

            <h3>Transferts hors Union européenne</h3>
            <p>
              Certains sous-traitants (Vercel, Resend) sont basés aux États-Unis.
              Ces transferts sont encadrés par les clauses contractuelles types (SCCs) adoptées par la Commission européenne,
              conformément à l&apos;article 46 du RGPD.
            </p>

            <h3>Vos droits (RGPD)</h3>
            <p>
              Conformément au Règlement Général sur la Protection des Données (UE 2016/679) et à la loi Informatique et Libertés,
              vous disposez des droits suivants sur vos données personnelles :
            </p>
            <ul className="mt-2 space-y-1 text-xs list-disc list-inside">
              <li><strong className="text-aquiz-black">Accès</strong> — obtenir une copie de vos données</li>
              <li><strong className="text-aquiz-black">Rectification</strong> — corriger des données inexactes</li>
              <li><strong className="text-aquiz-black">Suppression</strong> — demander l&apos;effacement de vos données</li>
              <li><strong className="text-aquiz-black">Portabilité</strong> — recevoir vos données dans un format structuré</li>
              <li><strong className="text-aquiz-black">Opposition</strong> — vous opposer au traitement de vos données</li>
              <li><strong className="text-aquiz-black">Limitation</strong> — demander la limitation du traitement</li>
              <li><strong className="text-aquiz-black">Retrait du consentement</strong> — retirer votre consentement à tout moment</li>
            </ul>
            <p className="mt-3">
              Pour exercer vos droits, envoyez un email à{' '}
              <a href="mailto:contact@aquiz.eu">contact@aquiz.eu</a>{' '}
              en précisant votre demande et en justifiant votre identité.
              Nous nous engageons à répondre dans un délai d&apos;un mois.
            </p>
            <p className="mt-2">
              En cas de désaccord, vous pouvez introduire une réclamation auprès de la{' '}
              <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">
                Commission Nationale de l&apos;Informatique et des Libertés (CNIL)
              </a>{' '}
              — 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.
            </p>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* ──────────────────────────────────────── */}
          {/* 5 — COOKIES                             */}
          {/* ──────────────────────────────────────── */}
          <div id="cookies" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 5</p>
            <h2>Politique de cookies</h2>
            <p>
              Conformément à la directive ePrivacy et aux recommandations de la CNIL, AQUIZ vous informe de l&apos;utilisation de cookies
              sur le site www.aquiz.eu.
            </p>

            <h3>Cookies strictement nécessaires (exemptés de consentement)</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs border border-aquiz-gray-lighter rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-aquiz-gray-lightest/60">
                    <th className="text-left px-3 py-2 font-semibold text-aquiz-black border-b border-aquiz-gray-lighter">Nom</th>
                    <th className="text-left px-3 py-2 font-semibold text-aquiz-black border-b border-aquiz-gray-lighter">Finalité</th>
                    <th className="text-left px-3 py-2 font-semibold text-aquiz-black border-b border-aquiz-gray-lighter">Durée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-aquiz-gray-lighter/50">
                  <tr>
                    <td className="px-3 py-2 font-mono text-aquiz-black">aquiz-cookie-consent</td>
                    <td className="px-3 py-2">Stockage de votre choix de consentement cookies</td>
                    <td className="px-3 py-2">Persistant (localStorage)</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-aquiz-black">aquiz-simulateur</td>
                    <td className="px-3 py-2">Sauvegarde locale de vos simulations (Mode A/B)</td>
                    <td className="px-3 py-2">Persistant (localStorage)</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-aquiz-black">aquiz-comparateur</td>
                    <td className="px-3 py-2">Sauvegarde locale de vos annonces comparées</td>
                    <td className="px-3 py-2">Persistant (localStorage)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Cookies soumis à consentement</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs border border-aquiz-gray-lighter rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-aquiz-gray-lightest/60">
                    <th className="text-left px-3 py-2 font-semibold text-aquiz-black border-b border-aquiz-gray-lighter">Nom</th>
                    <th className="text-left px-3 py-2 font-semibold text-aquiz-black border-b border-aquiz-gray-lighter">Fournisseur</th>
                    <th className="text-left px-3 py-2 font-semibold text-aquiz-black border-b border-aquiz-gray-lighter">Finalité</th>
                    <th className="text-left px-3 py-2 font-semibold text-aquiz-black border-b border-aquiz-gray-lighter">Durée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-aquiz-gray-lighter/50">
                  <tr>
                    <td className="px-3 py-2 font-mono text-aquiz-black">va (Vercel Analytics)</td>
                    <td className="px-3 py-2">Vercel Inc.</td>
                    <td className="px-3 py-2">Mesure d&apos;audience anonymisée (pages vues, appareil, pays)</td>
                    <td className="px-3 py-2">Session / 13 mois</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Gestion de vos préférences</h3>
            <p>
              Lors de votre première visite, un bandeau vous permet d&apos;accepter ou de refuser les cookies non essentiels.
              Vous pouvez modifier votre choix à tout moment via le lien{' '}
              <strong className="text-aquiz-black">« Gérer les cookies »</strong> présent en bas de chaque page (footer).
              Vous pouvez également supprimer les cookies via les paramètres de votre navigateur.
            </p>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* ──────────────────────────────────────── */}
          {/* 6 — CGU                                 */}
          {/* ──────────────────────────────────────── */}
          <div id="cgu" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 6</p>
            <h2>Conditions générales d&apos;utilisation</h2>

            <h3>Acceptation</h3>
            <p>
              L&apos;utilisation du site www.aquiz.eu implique l&apos;acceptation pleine et entière des présentes conditions générales
              d&apos;utilisation. L&apos;utilisateur déclare avoir la capacité juridique nécessaire pour s&apos;engager au respect de ces conditions.
            </p>

            <h3>Simulateur immobilier</h3>
            <p>
              Les simulations sont fournies <strong className="text-aquiz-black font-semibold">à titre indicatif uniquement</strong>.
              Elles ne constituent ni une offre de prêt, ni un engagement contractuel, ni un conseil en investissement.
              Les résultats sont basés sur des hypothèses standards (taux d&apos;endettement HCSF 35%, taux d&apos;assurance moyen, etc.)
              et ne remplacent pas l&apos;avis d&apos;un professionnel.
            </p>

            <h3>Collecte d&apos;email (déblocage de contenu)</h3>
            <p>
              Certaines fonctionnalités avancées (rapport comparatif, analyse détaillée) requièrent la saisie d&apos;une adresse email.
              Cet email est utilisé uniquement pour vous envoyer le contenu demandé et, avec votre consentement,
              des informations liées à votre projet immobilier. Vous pouvez vous désinscrire à tout moment.
            </p>

            <h3>Données DVF</h3>
            <p>
              Les prix immobiliers proviennent des fichiers DVF publiés par la DGFiP sur{' '}
              <a href="https://data.gouv.fr" target="_blank" rel="noopener noreferrer">data.gouv.fr</a>{' '}
              sous <strong className="text-aquiz-black font-semibold">Licence Ouverte 2.0</strong>.
              Ces données reflètent les transactions passées et ne préjugent pas des prix futurs.
            </p>

            <h3>Propriété des données utilisateur</h3>
            <p>
              Les données de simulation stockées dans votre navigateur (localStorage) vous appartiennent entièrement.
              Elles ne sont jamais transmises à nos serveurs. Vous pouvez les supprimer à tout moment via les paramètres de votre navigateur.
            </p>

            <h3>Responsabilité</h3>
            <p>
              AQUIZ s&apos;efforce de fournir des informations exactes et à jour, mais ne peut garantir l&apos;absence d&apos;erreurs
              ou d&apos;interruptions de service. L&apos;utilisateur est seul responsable de l&apos;utilisation qu&apos;il fait des
              résultats de simulation. Vérifiez les informations auprès de professionnels qualifiés avant toute décision d&apos;achat.
            </p>

            <h3>Activité réglementée</h3>
            <p>
              AQUIZ exerce une activité d&apos;agent immobilier (transactions sur immeubles et chasse immobilière)
              sous la carte professionnelle Transaction n° CPI75012025000000380 délivrée par la CCI Paris Île-de-France.
              AQUIZ ne fournit pas de conseil en financement et n&apos;est pas intermédiaire en opérations de banque (IOBSP).
            </p>
          </div>

          <hr className="border-aquiz-gray-lighter/50" />

          {/* ──────────────────────────────────────── */}
          {/* 7 — DROIT APPLICABLE                    */}
          {/* ──────────────────────────────────────── */}
          <div id="droit-applicable" className="scroll-mt-28">
            <p className="text-[10px] font-semibold text-aquiz-green uppercase tracking-widest mb-1">Article 7</p>
            <h2>Droit applicable et litiges</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français.
              Conformément aux articles L.611-1 et suivants du Code de la consommation, en cas de litige,
              le consommateur peut recourir gratuitement à un médiateur de la consommation.
              En cas d&apos;échec de la médiation, les tribunaux de Paris seront seuls compétents.
            </p>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-aquiz-gray-lighter/40">
            <div className="space-y-1">
              <p className="text-xs text-aquiz-gray-light">
                Dernière mise à jour : février 2026
              </p>
              <p className="text-[10px] text-aquiz-gray-light/60">
                Conception &amp; développement : Yamine Moussaoui
              </p>
            </div>
            <ContactButton />
          </div>
        </div>
      </section>
    </>
  )
}
