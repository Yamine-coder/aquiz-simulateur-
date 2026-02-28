'use client'

/**
 * Graphique Radar pour comparer les scores des biens
 * Affiche les dimensions : Prix, Quartier, Risques, Énergie, Équipements
 */

import { useMemo } from 'react'

interface RadarDataPoint {
  label: string
  value: number // 0-100
  color?: string
}

interface RadarChartProps {
  /** Données pour chaque bien (tableau de dimensions) */
  data: {
    id: string
    nom: string
    couleur: string
    valeurs: RadarDataPoint[]
  }[]
  /** Taille du graphique (largeur = hauteur) */
  size?: number
  /** Afficher les labels */
  showLabels?: boolean
  /** Afficher la légende */
  showLegend?: boolean
}

const DIMENSIONS = [
  { key: 'prix', label: 'Prix' },
  { key: 'quartier', label: 'Quartier' },
  { key: 'risques', label: 'Sécurité' },
  { key: 'energie', label: 'Énergie' },
  { key: 'confort', label: 'Confort' },
  { key: 'budget', label: 'Budget' }
]

/**
 * Calcule les coordonnées d'un point sur le radar
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  }
}

/**
 * Génère le path SVG pour un polygone radar
 */
function generateRadarPath(
  values: number[],
  centerX: number,
  centerY: number,
  maxRadius: number
): string {
  const numPoints = values.length
  const angleStep = 360 / numPoints

  const points = values.map((value, index) => {
    const radius = (value / 100) * maxRadius
    const angle = index * angleStep
    return polarToCartesian(centerX, centerY, radius, angle)
  })

  return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z'
}

export function RadarChart({
  data,
  size = 280,
  showLabels = true,
  showLegend = true
}: RadarChartProps) {
  const center = size / 2
  const maxRadius = (size / 2) - 40 // Marge pour les labels
  const numAxes = DIMENSIONS.length
  const angleStep = 360 / numAxes

  // Générer les cercles concentriques (grille)
  const gridCircles = useMemo(() => {
    return [20, 40, 60, 80, 100].map((percent) => ({
      radius: (percent / 100) * maxRadius,
      label: percent
    }))
  }, [maxRadius])

  // Générer les axes
  const axes = useMemo(() => {
    return DIMENSIONS.map((dim, index) => {
      const angle = index * angleStep
      const end = polarToCartesian(center, center, maxRadius, angle)
      const labelPos = polarToCartesian(center, center, maxRadius + 18, angle)
      return {
        ...dim,
        x1: center,
        y1: center,
        x2: end.x,
        y2: end.y,
        labelX: labelPos.x,
        labelY: labelPos.y
      }
    })
  }, [center, maxRadius, angleStep])

  // Générer les polygones pour chaque bien
  const polygons = useMemo(() => {
    return data.map((bien) => {
      const values = DIMENSIONS.map((dim) => {
        const point = bien.valeurs.find((v) => v.label === dim.key)
        return point?.value ?? 50
      })
      return {
        id: bien.id,
        nom: bien.nom,
        couleur: bien.couleur,
        path: generateRadarPath(values, center, center, maxRadius),
        values
      }
    })
  }, [data, center, maxRadius])

  if (data.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Grille concentrique */}
        {gridCircles.map((circle) => (
          <circle
            key={circle.label}
            cx={center}
            cy={center}
            r={circle.radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={1}
            strokeDasharray={circle.label === 100 ? undefined : '2 2'}
          />
        ))}

        {/* Axes */}
        {axes.map((axis) => (
          <line
            key={axis.key}
            x1={axis.x1}
            y1={axis.y1}
            x2={axis.x2}
            y2={axis.y2}
            stroke="#D1D5DB"
            strokeWidth={1}
          />
        ))}

        {/* Polygones des biens (du plus grand au plus petit pour superposition) */}
        {polygons
          .sort((a, b) => {
            const sumA = a.values.reduce((s, v) => s + v, 0)
            const sumB = b.values.reduce((s, v) => s + v, 0)
            return sumB - sumA
          })
          .map((poly, index) => (
            <g key={poly.id}>
              <path
                d={poly.path}
                fill={poly.couleur}
                fillOpacity={0.15 + index * 0.05}
                stroke={poly.couleur}
                strokeWidth={2}
              />
              {/* Points sur les sommets */}
              {DIMENSIONS.map((dim, i) => {
                const value = poly.values[i]
                const radius = (value / 100) * maxRadius
                const angle = i * angleStep
                const point = polarToCartesian(center, center, radius, angle)
                return (
                  <circle
                    key={`${poly.id}-${dim.key}`}
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill={poly.couleur}
                    stroke="white"
                    strokeWidth={2}
                  />
                )
              })}
            </g>
          ))}

        {/* Labels des axes */}
        {showLabels &&
          axes.map((axis) => (
            <text
              key={`label-${axis.key}`}
              x={axis.labelX}
              y={axis.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-medium fill-gray-600"
            >
              {axis.label}
            </text>
          ))}
      </svg>

      {/* Légende */}
      {showLegend && data.length > 1 && (
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {data.map((bien) => (
            <div key={bien.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: bien.couleur }}
              />
              <span className="text-xs text-aquiz-gray truncate max-w-25">
                {bien.nom}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Couleurs prédéfinies pour les biens
export const COULEURS_RADAR = [
  '#22C55E', // aquiz-green
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EF4444'  // red
]
