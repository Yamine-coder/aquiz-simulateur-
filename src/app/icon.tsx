import { ImageResponse } from 'next/og'

/**
 * PWA Icon 192×192 pour Android + manifest.json
 */
export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 192,
          height: 192,
          background: '#1a1a1a',
          borderRadius: 42,
        }}
      >
        <span
          style={{
            fontSize: 76,
            fontWeight: 800,
            color: '#22c55e',
            letterSpacing: -2,
          }}
        >
          AQ
        </span>
      </div>
    ),
    { ...size }
  )
}
