/**
 * Icônes et badges de transport Île-de-France
 * Design inspiré du système visuel officiel IDFM/RATP
 * Badges combinés type+ligne pour une lecture immédiate
 */

import React from 'react';

// ─── Couleurs officielles par ligne ──────────────────────────────────────────

/** Couleurs RER par lettre de ligne */
const RER_COLORS: Record<string, { bg: string; fg: string }> = {
  A: { bg: '#E3051C', fg: '#E3051C' },
  B: { bg: '#5291CE', fg: '#5291CE' },
  C: { bg: '#FFCD00', fg: '#9B870C' },
  D: { bg: '#00814F', fg: '#00814F' },
  E: { bg: '#CF76A7', fg: '#CF76A7' },
}

/** Couleurs Métro par numéro de ligne */
const METRO_COLORS: Record<string, { bg: string; fg: string }> = {
  '1':    { bg: '#FFCD00', fg: '#1a1a1a' },
  '2':    { bg: '#003CA6', fg: '#fff' },
  '3':    { bg: '#9B993A', fg: '#fff' },
  '3bis': { bg: '#98D4E2', fg: '#1a1a1a' },
  '4':    { bg: '#BB4B9C', fg: '#fff' },
  '5':    { bg: '#F28E42', fg: '#fff' },
  '6':    { bg: '#77C695', fg: '#1a1a1a' },
  '7':    { bg: '#F3A4BA', fg: '#1a1a1a' },
  '7bis': { bg: '#77C695', fg: '#1a1a1a' },
  '8':    { bg: '#C5A3CD', fg: '#1a1a1a' },
  '9':    { bg: '#B6BD00', fg: '#1a1a1a' },
  '10':   { bg: '#C69214', fg: '#fff' },
  '11':   { bg: '#8D5E2A', fg: '#fff' },
  '12':   { bg: '#00814F', fg: '#fff' },
  '13':   { bg: '#98D4E2', fg: '#1a1a1a' },
  '14':   { bg: '#67328E', fg: '#fff' },
  '15':   { bg: '#B90845', fg: '#fff' },
  '16':   { bg: '#F3A4BA', fg: '#1a1a1a' },
  '17':   { bg: '#D08C60', fg: '#fff' },
  '18':   { bg: '#00814F', fg: '#fff' },
}

/** Couleurs Transilien par lettre */
const TRANSILIEN_COLORS: Record<string, { bg: string; fg: string }> = {
  H: { bg: '#8D5E2A', fg: '#fff' },
  J: { bg: '#B6BD00', fg: '#1a1a1a' },
  K: { bg: '#C5A3CD', fg: '#1a1a1a' },
  L: { bg: '#77C695', fg: '#1a1a1a' },
  N: { bg: '#00814F', fg: '#fff' },
  P: { bg: '#F28E42', fg: '#fff' },
  R: { bg: '#F3A4BA', fg: '#1a1a1a' },
  U: { bg: '#B90845', fg: '#fff' },
}

/** Couleurs Tram par clé */
const TRAM_COLORS: Record<string, { bg: string; fg: string }> = {
  T1:  { bg: '#003CA6', fg: '#fff' },
  T2:  { bg: '#CF76A7', fg: '#fff' },
  T3a: { bg: '#F28E42', fg: '#fff' },
  T3b: { bg: '#00814F', fg: '#fff' },
  T4:  { bg: '#E3051C', fg: '#fff' },
  T5:  { bg: '#67328E', fg: '#fff' },
  T6:  { bg: '#E3051C', fg: '#fff' },
  T7:  { bg: '#8D5E2A', fg: '#fff' },
  T8:  { bg: '#9B993A', fg: '#fff' },
  T9:  { bg: '#003CA6', fg: '#fff' },
  T10: { bg: '#BB4B9C', fg: '#fff' },
  T11: { bg: '#F28E42', fg: '#fff' },
  T13: { bg: '#77C695', fg: '#1a1a1a' },
}

// ─── Defaults par type (quand pas de ligne connue) ──────────────────────────

interface TransportIconProps {
  size?: number
  className?: string
}

/** Pastille Métro — cercle bleu avec M blanc */
export function MetroIcon({ size = 20, className }: TransportIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="Métro">
      <circle cx="12" cy="12" r="11" fill="#003CA6" />
      <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">M</text>
    </svg>
  )
}

/** Pastille RER — carré noir arrondi avec RER blanc */
export function RerIcon({ size = 20, className }: TransportIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="RER">
      <rect x="1" y="4" width="22" height="16" rx="3" fill="#1a1a1a" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="bold" fontFamily="Arial, sans-serif">RER</text>
    </svg>
  )
}

/** Pastille Transilien/Train */
export function TrainIcon({ size = 20, className }: TransportIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="Train">
      <rect x="1" y="3" width="22" height="18" rx="3" fill="#E05206" />
      <text x="12" y="10.5" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold" fontFamily="Arial, sans-serif">TRANS</text>
      <text x="12" y="17" textAnchor="middle" fill="white" fontSize="5.5" fontWeight="bold" fontFamily="Arial, sans-serif">ILIEN</text>
    </svg>
  )
}

/** Pastille Tramway */
export function TramIcon({ size = 20, className }: TransportIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="Tramway">
      <circle cx="12" cy="12" r="11" fill="#00814F" />
      <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">T</text>
    </svg>
  )
}

/** Pastille Bus */
export function BusIcon({ size = 20, className }: TransportIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="Bus">
      <rect x="1" y="3" width="22" height="18" rx="9" fill="#91288D" />
      <text x="12" y="15.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">BUS</text>
    </svg>
  )
}

/** Pastille Vélo */
export function VeloIcon({ size = 20, className }: TransportIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="Vélo">
      <circle cx="12" cy="12" r="11" fill="#00A88F" />
      <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial, sans-serif">V</text>
    </svg>
  )
}

/** Map type → composant icône */
export const TRANSPORT_ICON_MAP: Record<string, React.ComponentType<TransportIconProps>> = {
  metro: MetroIcon,
  rer:   RerIcon,
  train: TrainIcon,
  tram:  TramIcon,
  bus:   BusIcon,
  velo:  VeloIcon,
}

/** Labels lisibles */
export const TRANSPORT_LABELS: Record<string, string> = {
  metro: 'Métro',
  rer:   'RER',
  train: 'Transilien',
  tram:  'Tramway',
  bus:   'Bus',
  velo:  'Vélo',
}

// ─── Badge combiné ligne IDFM ───────────────────────────────────────────────

export interface LineBadgeProps {
  /** Identifiant de la ligne : "A", "1", "114", "T3a"… */
  ligne: string
  /** Type de transport : metro, rer, train, tram, bus, velo */
  typeTransport: string
  /** Taille du badge */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Badge intégré ligne IDFM — combinaison type + ligne en un seul élément visuel
 * Dimensions fixes pour un alignement parfait dans les tableaux.
 *
 * - **RER** : cercle bicolore (bord couleur ligne, fond blanc, lettre couleur)
 * - **Métro** : cercle fond couleur ligne + anneau intérieur blanc + numéro
 * - **Tram** : pill fixe avec T+numéro en couleur officielle
 * - **Train** : cercle fond couleur avec lettre
 * - **Bus** : pill mauve fixe avec numéro
 * - **Vélo** : cercle vert teal avec V
 */
export function LineBadge({ ligne, typeTransport, size = 'sm' }: LineBadgeProps) {
  // Tailles fixes selon size — identiques pour tous les types circulaires
  const h = size === 'sm' ? 20 : size === 'md' ? 24 : 28

  // ── RER : cercle bord couleur, fond blanc, lettre couleur ──
  if (typeTransport === 'rer') {
    const c = RER_COLORS[ligne.toUpperCase()] ?? { bg: '#1a1a1a', fg: '#1a1a1a' }
    const r = h / 2, ri = r * 0.72
    const fy = r + (size === 'sm' ? 3.5 : 4.5)
    const fs = size === 'sm' ? 12 : 14
    return (
      <svg width={h} height={h} viewBox={`0 0 ${h} ${h}`} className="shrink-0 inline-block align-middle" aria-label={`RER ${ligne}`}>
        <circle cx={r} cy={r} r={r - 0.5} fill={c.bg} />
        <circle cx={r} cy={r} r={ri} fill="#fff" />
        <text x={r} y={fy} textAnchor="middle" fill={c.fg} fontSize={fs} fontWeight="bold" fontFamily="Arial, sans-serif">{ligne.toUpperCase()}</text>
      </svg>
    )
  }

  // ── Métro : cercle couleur, anneau blanc, numéro ──
  if (typeTransport === 'metro') {
    const c = METRO_COLORS[ligne] ?? { bg: '#003CA6', fg: '#fff' }
    const r = h / 2
    const fy = r + (size === 'sm' ? 3.5 : 4.5)
    const fs = ligne.length > 1 ? (size === 'sm' ? 9 : 11) : (size === 'sm' ? 11 : 13)
    return (
      <svg width={h} height={h} viewBox={`0 0 ${h} ${h}`} className="shrink-0 inline-block align-middle" aria-label={`Métro ${ligne}`}>
        <circle cx={r} cy={r} r={r - 0.5} fill={c.bg} />
        <circle cx={r} cy={r} r={r - 2} fill="none" stroke="#fff" strokeWidth="1.2" />
        <text x={r} y={fy} textAnchor="middle" fill={c.fg} fontSize={fs} fontWeight="bold" fontFamily="Arial, sans-serif">{ligne}</text>
      </svg>
    )
  }

  // ── Tram : pill fixe T+numéro ──
  if (typeTransport === 'tram') {
    const key = ligne.startsWith('T') ? ligne : `T${ligne}`
    const c = TRAM_COLORS[key] ?? { bg: '#00814F', fg: '#fff' }
    const w = size === 'sm' ? 30 : 36
    const fs = size === 'sm' ? 9 : 11
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 inline-block align-middle" aria-label={`Tram ${key}`}>
        <rect x="0.5" y="0.5" width={w - 1} height={h - 1} rx={h / 2} fill={c.bg} />
        <text x={w / 2} y={h / 2 + (size === 'sm' ? 3 : 4)} textAnchor="middle" fill={c.fg} fontSize={fs} fontWeight="bold" fontFamily="Arial, sans-serif">{key}</text>
      </svg>
    )
  }

  // ── Train/Transilien : cercle fond couleur avec lettre ──
  if (typeTransport === 'train') {
    const c = TRANSILIEN_COLORS[ligne.toUpperCase()] ?? { bg: '#E05206', fg: '#fff' }
    const r = h / 2
    const fy = r + (size === 'sm' ? 3.5 : 4.5)
    const fs = size === 'sm' ? 12 : 14
    return (
      <svg width={h} height={h} viewBox={`0 0 ${h} ${h}`} className="shrink-0 inline-block align-middle" aria-label={`Transilien ${ligne}`}>
        <circle cx={r} cy={r} r={r - 0.5} fill={c.bg} />
        <text x={r} y={fy} textAnchor="middle" fill={c.fg} fontSize={fs} fontWeight="bold" fontFamily="Arial, sans-serif">{ligne.toUpperCase()}</text>
      </svg>
    )
  }

  // ── Bus : pill mauve fixe ──
  if (typeTransport === 'bus') {
    const charCount = ligne.length
    const w = size === 'sm'
      ? (charCount <= 2 ? 28 : charCount <= 3 ? 34 : 40)
      : (charCount <= 2 ? 34 : charCount <= 3 ? 40 : 48)
    const fs = size === 'sm' ? 9 : 11
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 inline-block align-middle" aria-label={`Bus ${ligne}`}>
        <rect x="0.5" y="0.5" width={w - 1} height={h - 1} rx={h / 2} fill="#91288D" />
        <text x={w / 2} y={h / 2 + (size === 'sm' ? 3 : 4)} textAnchor="middle" fill="#fff" fontSize={fs} fontWeight="bold" fontFamily="Arial, sans-serif">{ligne}</text>
      </svg>
    )
  }

  // ── Vélo : cercle teal avec V ──
  const r = h / 2
  const fy = r + (size === 'sm' ? 3.5 : 4.5)
  const fs = size === 'sm' ? 12 : 14
  return (
    <svg width={h} height={h} viewBox={`0 0 ${h} ${h}`} className="shrink-0 inline-block align-middle" aria-label={`Vélo ${ligne}`}>
      <circle cx={r} cy={r} r={r - 0.5} fill="#00A88F" />
      <text x={r} y={fy} textAnchor="middle" fill="#fff" fontSize={fs} fontWeight="bold" fontFamily="Arial, sans-serif">V</text>
    </svg>
  )
}

// ─── Compat legacy ───────────────────────────────────────────────────────────

export interface LignePillProps {
  ligne: string
  typeTransport: string
  size?: 'sm' | 'md'
}

/** @deprecated Utiliser LineBadge directement */
export function LignePill({ ligne, typeTransport, size = 'sm' }: LignePillProps) {
  return <LineBadge ligne={ligne} typeTransport={typeTransport} size={size} />
}

/**
 * Badge type-only (quand aucune ligne n'est connue)
 * Affiche juste l'icône générique du type (M, RER, T, Bus…)
 */
export function TypeBadge({ typeTransport, size = 'sm' }: { typeTransport: string; size?: 'sm' | 'md' | 'lg' }) {
  const IconComponent = TRANSPORT_ICON_MAP[typeTransport] ?? TRANSPORT_ICON_MAP.bus
  const s = size === 'sm' ? 18 : size === 'md' ? 22 : 26
  return <IconComponent size={s} />
}
