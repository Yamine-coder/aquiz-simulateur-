/**
 * Charte graphique AQUIZ
 * Couleurs et styles du simulateur
 */

export const AQUIZ_COLORS = {
  // Couleurs principales
  primary: {
    navy: '#0f1c3f', // Header background
    navyLight: '#1a2d5a', // Variante plus claire
    blue: '#3b5998', // Accents bleus
  },

  // Couleurs des icônes/modes
  modes: {
    modeA: '#6b8cce', // Bleu - "Ce que je peux acheter"
    modeB: '#4ade80', // Vert - "Ce qu'il faut pour acheter"
  },

  // Couleurs d'état
  status: {
    success: '#22c55e', // Vert validation
    warning: '#f59e0b', // Orange attention
    danger: '#ef4444', // Rouge erreur
    info: '#3b82f6', // Bleu info
  },

  // Couleurs neutres
  neutral: {
    white: '#ffffff',
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#64748b',
    textLight: '#94a3b8',
  },
} as const

export type AquizColors = typeof AQUIZ_COLORS
