import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'AQUIZ — Conseil en acquisition immobilière à Paris & Île-de-France'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Image Twitter Card
 * Réutilise le même design que OpenGraph
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
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-2px',
            marginBottom: 16,
          }}
        >
          AQUIZ
        </div>
        <div
          style={{
            width: 60,
            height: 3,
            background: '#22c55e',
            borderRadius: 2,
            marginBottom: 24,
          }}
        />
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: 500,
          }}
        >
          Conseil en acquisition immobilière
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
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
