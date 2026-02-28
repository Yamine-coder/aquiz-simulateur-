import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'AQUIZ Comparateur — Comparez vos annonces immobilières'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#22c55e' }} />
        <div style={{ position: 'absolute', top: 80, left: 120, width: 200, height: 200, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.06)' }} />

        <div style={{ fontSize: 64, marginBottom: 20, display: 'flex' }}>⚖️</div>

        <div style={{ fontSize: 56, fontWeight: 900, color: 'white', letterSpacing: '-2px', marginBottom: 8, display: 'flex' }}>
          AQUIZ
        </div>

        <div style={{ width: 60, height: 3, background: '#22c55e', borderRadius: 2, marginBottom: 20 }} />

        <div style={{ fontSize: 32, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600, letterSpacing: '-0.3px', marginBottom: 12, display: 'flex' }}>
          Comparateur d&apos;annonces
        </div>

        <div style={{ fontSize: 22, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 400, marginBottom: 40, display: 'flex' }}>
          Comparez jusqu&apos;à 4 biens côte à côte
        </div>

        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {['Prix au m²', 'Analyse IA', 'Rapport PDF'].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 500 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
              {text}
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 40, display: 'flex', fontSize: 16, color: 'rgba(255, 255, 255, 0.25)' }}>
          www.aquiz.eu/comparateur · 100% gratuit
        </div>
      </div>
    ),
    { ...size },
  )
}
