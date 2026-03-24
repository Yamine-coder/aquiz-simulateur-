import { ImageResponse } from 'next/og'

/**
 * Favicon 48×48 — Logo "AQ" vert sur fond sombre
 * Remplace le favicon Vercel par défaut
 */
export const size = { width: 48, height: 48 }
export const contentType = 'image/x-icon'

export default function Favicon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          background: '#1a1a1a',
          borderRadius: 10,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#22c55e',
            letterSpacing: -1,
          }}
        >
          AQ
        </span>
      </div>
    ),
    { ...size }
  )
}
