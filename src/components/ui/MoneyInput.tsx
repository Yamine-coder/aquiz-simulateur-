'use client'

import { Input } from '@/components/ui/input'
import { useCallback, useRef } from 'react'

/** Formate un nombre avec des espaces pour les milliers (format français) */
function formatWithSpaces(n: number): string {
  if (n === 0) return ''
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
}

interface MoneyInputProps {
  /** Valeur numérique (entier) */
  value: number
  /** Callback quand la valeur change */
  onChange: (value: number) => void
  /** Placeholder affiché quand vide */
  placeholder?: string
  /** Classes CSS additionnelles pour l'input */
  className?: string
  /** ID de l'input */
  id?: string
}

/**
 * Input monétaire formaté pour les montants en euros.
 * Affiche le nombre avec des espaces (450 000) et stocke l'entier (450000).
 * Utilise inputMode="numeric" pour le clavier mobile.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder = '250 000',
  className = '',
  id,
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const cursorPos = e.target.selectionStart ?? 0
      const oldValue = e.target.value

      // Supprimer tout sauf les chiffres
      const raw = oldValue.replace(/\D/g, '')
      const num = raw ? parseInt(raw, 10) : 0

      // Limiter à 99 999 999 € (éviter overflow)
      if (num > 99_999_999) return

      onChange(num)

      // Restaurer la position du curseur intelligemment
      // Compter le nombre de chiffres avant la position du curseur dans l'ancienne valeur
      const digitsBefore = oldValue
        .slice(0, cursorPos)
        .replace(/\D/g, '').length

      requestAnimationFrame(() => {
        if (!inputRef.current) return
        const newFormatted = formatWithSpaces(num)
        // Trouver la position correspondante dans la nouvelle valeur formatée
        let count = 0
        let newPos = newFormatted.length
        for (let i = 0; i < newFormatted.length; i++) {
          if (/\d/.test(newFormatted[i])) {
            count++
            if (count === digitsBefore) {
              newPos = i + 1
              break
            }
          }
        }
        inputRef.current.setSelectionRange(newPos, newPos)
      })
    },
    [onChange]
  )

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        className={`pr-10 ${className}`}
        value={formatWithSpaces(value)}
        onChange={handleChange}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-aquiz-gray font-medium">
        €
      </span>
    </div>
  )
}
