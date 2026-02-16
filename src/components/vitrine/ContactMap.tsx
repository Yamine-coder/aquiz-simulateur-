'use client'

import { ExternalLink, MapPin, Navigation } from 'lucide-react'

const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/dir//58+Rue+de+Monceau,+75008+Paris'

/** Google Maps Embed — 58 rue de Monceau, 75008 Paris */
const EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2623.5!2d2.3074!3d48.8789!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e66fc4f8f3049b%3A0x5783e82b4c41f034!2s58%20Rue%20de%20Monceau%2C%2075008%20Paris!5e0!3m2!1sfr!2sfr!4v1700000000000!5m2!1sfr!2sfr'

export function ContactMap() {
  return (
    <div className="relative group/map">
      {/* Gradient fondu haut — liaison visuelle avec la section au-dessus */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-linear-to-b from-aquiz-gray-lightest to-transparent z-10 pointer-events-none" />

      {/* Google Maps — désaturé dans la charte, couleurs au hover */}
      <div className="relative overflow-hidden">
        <iframe
          src={EMBED_SRC}
          width="100%"
          height="350"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="AQUIZ — 58 rue de Monceau, 75008 Paris"
          className="block grayscale brightness-110 contrast-95 group-hover/map:grayscale-0 group-hover/map:brightness-100 group-hover/map:contrast-100 transition-all duration-700 ease-out"
        />

        {/* Tint vert subtil sur la carte désaturée */}
        <div className="absolute inset-0 bg-aquiz-green/[0.03] mix-blend-multiply pointer-events-none group-hover/map:opacity-0 transition-opacity duration-700" />
      </div>

      {/* Barre info bas — sobre, dans la charte */}
      <div className="relative z-10 bg-aquiz-black/90 backdrop-blur-sm border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white">
            <MapPin className="w-4 h-4 text-aquiz-green" />
            <span className="text-sm font-medium">
              58 rue de Monceau, 75008 Paris
            </span>
            <span className="hidden sm:inline text-white/30 text-xs">
              · Métro Monceau / Villiers
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-aquiz-green text-white text-xs font-semibold rounded-lg hover:bg-aquiz-green/90 transition-colors"
            >
              <Navigation className="w-3 h-3" />
              Itinéraire
            </a>
            <a
              href="https://www.google.com/maps/place/58+Rue+de+Monceau,+75008+Paris"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 text-white text-xs font-medium rounded-lg hover:bg-white/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
