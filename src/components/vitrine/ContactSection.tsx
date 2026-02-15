'use client'

import {
    ArrowRight,
    Calendar,
    Clock,
    ExternalLink,
    Mail,
    MapPin,
    Phone,
    Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { ContactForm } from './ContactForm'
import { ContactMapLoader } from './ContactMapLoader'
import { FadeIn } from './Motion'

const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place/58+Rue+de+Monceau,+75008+Paris'

/**
 * Section contact premium — split-screen dark/light.
 * Gauche : fond sombre, headline, coordonnées, Calendly CTA.
 * Droite : formulaire sur fond clair.
 * Pas de carte intégrée — lien Google Maps dans l'adresse.
 */
export function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-20 md:scroll-mt-24">
      <div className="grid lg:grid-cols-2">
        {/* ─── Colonne gauche — Dark ─── */}
        <div className="relative bg-aquiz-black text-white overflow-hidden">
          {/* Glow subtil */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-aquiz-green/10 rounded-full blur-[100px]" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-aquiz-green/5 rounded-full blur-[80px]" />

          <div className="relative h-full flex flex-col justify-center px-8 sm:px-12 lg:px-14 py-10 lg:py-12">
            <FadeIn>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-aquiz-green mb-3">
                <Sparkles className="w-3 h-3" />
                Conseil gratuit
              </div>

              {/* Headline */}
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
                Parlons de votre{' '}
                <span className="text-aquiz-green">projet</span>
              </h2>
              <p className="text-white/50 text-sm max-w-md mb-5 leading-relaxed">
                Une question, un conseil ou un rendez-vous — notre équipe vous
                répond sous 24h.
              </p>

              {/* Coordonnées */}
              <div className="space-y-2.5 mb-5">
                <a
                  href="tel:+33749520106"
                  className="group flex items-center gap-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-aquiz-green group-hover:border-aquiz-green transition-all duration-300">
                    <Phone className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-aquiz-green transition-colors">
                      07 49 52 01 06
                    </p>
                    <p className="text-[11px] text-white/35">
                      Lun – Ven · 9h – 19h
                    </p>
                  </div>
                </a>

                <a
                  href="mailto:contact@aquiz.eu"
                  className="group flex items-center gap-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-aquiz-green group-hover:border-aquiz-green transition-all duration-300">
                    <Mail className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-aquiz-green transition-colors">
                      contact@aquiz.eu
                    </p>
                    <p className="text-[11px] text-white/35">
                      Réponse sous 24h
                    </p>
                  </div>
                </a>

                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-aquiz-green group-hover:border-aquiz-green transition-all duration-300">
                    <MapPin className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-aquiz-green transition-colors">
                      58 rue de Monceau, 75008 Paris
                    </p>
                    <p className="text-[11px] text-white/35 flex items-center gap-1">
                      Voir sur Google Maps
                      <ExternalLink className="w-2.5 h-2.5" />
                    </p>
                  </div>
                </a>
              </div>

              {/* Calendly CTA */}
              <Link
                href="https://calendly.com/contact-aquiz/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-aquiz-green hover:border-aquiz-green transition-all duration-300"
              >
                <Calendar className="w-4.5 h-4.5 text-aquiz-green group-hover:text-white transition-colors" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Prendre rendez-vous
                  </p>
                  <p className="text-[11px] text-white/40 group-hover:text-white/70 transition-colors">
                    30 min · gratuit · sans engagement
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all ml-2" />
              </Link>

              {/* Horaires discrets */}
              <div className="flex items-center gap-2 mt-3 text-[11px] text-white/25">
                <Clock className="w-3 h-3" />
                Bureaux ouverts du lundi au vendredi, 9h – 19h
              </div>
            </FadeIn>
          </div>
        </div>

        {/* ─── Colonne droite — Form ─── */}
        <div className="bg-aquiz-gray-lightest flex items-center">
            <div className="w-full max-w-lg mx-auto px-6 sm:px-10 lg:px-12 py-8 lg:py-10">
            <FadeIn delay={0.15}>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-aquiz-black mb-1">
                  Envoyez-nous un message
                </h3>
                <p className="text-sm text-aquiz-gray">
                  Décrivez votre projet, nous vous répondons rapidement.
                </p>
              </div>

              <ContactForm />
            </FadeIn>
          </div>
        </div>
      </div>

      {/* ─── Carte pleine largeur — strip épuré ─── */}
      <ContactMapLoader />
    </section>
  )
}
