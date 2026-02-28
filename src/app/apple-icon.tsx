import { ImageResponse } from 'next/og'

/**
 * Apple Touch Icon (180×180) généré dynamiquement
 * Affiché sur l'écran d'accueil iOS quand l'utilisateur ajoute le site
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 180,
          height: 180,
          background: '#1a1a1a',
          borderRadius: 40,
        }}
      >
        <span
          style={{
            fontSize: 72,
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
