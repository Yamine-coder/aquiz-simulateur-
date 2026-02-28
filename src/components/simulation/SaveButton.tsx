/**
 * Auto-Save system — best practices UX
 * 
 * 1. AutoSaveIndicator : indicateur discret "Sauvegardé" dans le stepper
 *    - Apparaît après chaque sauvegarde auto (changement d'étape)
 *    - Feedback subtil sans interrompre le flow
 * 
 * 2. useAutoSave hook : gère Ctrl+S global + auto-save programmatique
 * 
 * 3. SaveButton (legacy) : conservé pour compatibilité
 */

'use client'

import { Check, Save } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// ─── Auto-Save Indicator (dans le stepper) ───────────────────────────

interface AutoSaveIndicatorProps {
  /** Timestamp de dernière sauvegarde (null = jamais sauvegardé) */
  lastSavedAt: Date | null
  className?: string
}

export function AutoSaveIndicator({ lastSavedAt, className = '' }: AutoSaveIndicatorProps) {
  // Track which save timestamp's animation has finished
  const [animationDoneFor, setAnimationDoneFor] = useState<number>(0)
  const [showToast, setShowToast] = useState(false)

  // When lastSavedAt changes, show the prominent toast then fade to subtle
  useEffect(() => {
    const timestamp = lastSavedAt?.getTime() ?? 0
    if (timestamp <= 0) return
    // Show prominent toast
    setShowToast(true)
    // After 3s, fade animation badge
    const timerBadge = setTimeout(() => setAnimationDoneFor(timestamp), 3000)
    // After 4s, hide toast
    const timerToast = setTimeout(() => setShowToast(false), 4000)
    return () => { clearTimeout(timerBadge); clearTimeout(timerToast) }
  }, [lastSavedAt])

  if (!lastSavedAt) return null

  // Animation is active when we have a save that hasn't been marked as "done"
  const showCheck = lastSavedAt.getTime() !== animationDoneFor

  const formatTime = (date: Date) => 
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* Badge inline dans le stepper */}
      <div className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-all duration-500 ${
        showCheck 
          ? 'bg-aquiz-green/10 text-aquiz-green' 
          : 'bg-aquiz-gray-lightest text-aquiz-gray'
      } ${className}`}>
        {showCheck ? (
          <Check className="w-3.5 h-3.5 animate-in zoom-in-75 duration-200" strokeWidth={3} />
        ) : (
          <Save className="w-3.5 h-3.5 opacity-60" />
        )}
        <span className="font-medium whitespace-nowrap">
          {showCheck ? 'Sauvegardé' : `Sauvegardé à ${formatTime(lastSavedAt)}`}
        </span>
      </div>

      {/* Toast flottant — au-dessus du bouton fixe mobile */}
      {showToast && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 w-auto max-w-[calc(100vw-2rem)]" role="status" aria-live="polite">
          <div className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-aquiz-black text-white shadow-xl shadow-black/20">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-aquiz-green flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" strokeWidth={3} />
            </div>
            <div className="text-xs sm:text-sm whitespace-nowrap">
              <span className="font-semibold">Sauvegardé</span>
              <span className="text-white/60 ml-1 sm:ml-1.5">· {formatTime(lastSavedAt)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Hook useAutoSave ─────────────────────────────────────────────────

interface UseAutoSaveReturn {
  /** Timestamp de dernière sauvegarde */
  lastSavedAt: Date | null
  /** Déclencher manuellement une sauvegarde */
  triggerSave: () => void
  /** Sauvegarder et exécuter une action (ex: changer d'étape) */
  saveAndDo: (action: () => void) => void
}

export function useAutoSave(onSave: () => void, disabled = false): UseAutoSaveReturn {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const triggerSave = useCallback(() => {
    if (disabled) return
    onSave()
    setLastSavedAt(new Date())
  }, [onSave, disabled])

  const saveAndDo = useCallback((action: () => void) => {
    if (!disabled) {
      onSave()
      setLastSavedAt(new Date())
    }
    action()
  }, [onSave, disabled])

  // Raccourci Ctrl+S / Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        triggerSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [triggerSave])

  return { lastSavedAt, triggerSave, saveAndDo }
}

// ─── SaveButton (legacy, ne rend rien) ───────────────────────────────

interface SaveButtonProps {
  onSave: () => void
  disabled?: boolean
  size?: 'default' | 'lg'
  className?: string
}

/** @deprecated Utiliser useAutoSave + AutoSaveIndicator */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SaveButton(_props: SaveButtonProps) {
  return null
}

export interface SaveButtonRef {
  triggerSave: () => void
}
