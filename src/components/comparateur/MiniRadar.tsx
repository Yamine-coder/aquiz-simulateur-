'use client'

/**
 * Mini radar SVG pour aperçu visuel des scores par axe.
 * Version compacte sans labels — juste la silhouette colorée.
 * Les labels détaillés sont réservés au PDF.
 */

interface MiniRadarProps {
  /** Scores par axe (0-100), dans l'ordre */
  axes: Array<{ score: number }>
  /** Taille du SVG en px */
  size?: number
  /** Couleur de remplissage */
  color?: string
  /** Classe CSS additionnelle */
  className?: string
}

export function MiniRadar({ axes, size = 64, color = '#22c55e', className = '' }: MiniRadarProps) {
  if (axes.length < 3) return null

  const cx = size / 2
  const cy = size / 2
  const maxR = (size / 2) - 4 // marge pour anti-aliasing

  const n = axes.length
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2 // commence en haut

  // Points du polygone de données
  const points = axes.map((a, i) => {
    const angle = startAngle + i * angleStep
    const r = (a.score / 100) * maxR
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')

  // Grille (cercles concentriques à 50% et 100%)
  const gridCircles = [0.5, 1].map((pct) => (
    <circle
      key={pct}
      cx={cx}
      cy={cy}
      r={maxR * pct}
      fill="none"
      stroke="#e5e7eb"
      strokeWidth={0.5}
    />
  ))

  // Lignes des axes
  const axisLines = axes.map((_, i) => {
    const angle = startAngle + i * angleStep
    const x2 = cx + maxR * Math.cos(angle)
    const y2 = cy + maxR * Math.sin(angle)
    return (
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke="#e5e7eb"
        strokeWidth={0.5}
      />
    )
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      {gridCircles}
      {axisLines}
      <polygon
        points={points}
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}
