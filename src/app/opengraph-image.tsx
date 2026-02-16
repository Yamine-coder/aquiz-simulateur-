import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'AQUIZ — Conseil en acquisition immobilière à Paris & Île-de-France'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Image OpenGraph dynamique pour les réseaux sociaux
 * Générée via Next.js OG Image Generation (Satori)
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1a1a1a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Accent bar top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#22c55e',
          }}
        />

        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 120,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.06)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            right: 140,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.04)',
          }}
        />

        {/* Brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-2px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>AQUIZ</span>
        </div>

        {/* Separator */}
        <div
          style={{
            width: 60,
            height: 3,
            background: '#22c55e',
            borderRadius: 2,
            marginBottom: 24,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: 500,
            letterSpacing: '-0.3px',
            marginBottom: 40,
          }}
        >
          Conseil en acquisition immobilière
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 32,
            alignItems: 'center',
          }}
        >
          {['Simulateur gratuit', 'Carte des prix IDF', 'Aides & PTZ'].map(
            (text, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 18,
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontWeight: 500,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#22c55e',
                  }}
                />
                {text}
              </div>
            ),
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 16,
            color: 'rgba(255, 255, 255, 0.25)',
          }}
        >
          www.aquiz.eu · Paris & Île-de-France
        </div>
      </div>
    ),
    { ...size },
  )
}
