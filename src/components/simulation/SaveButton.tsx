/**
 * Bouton Sauvegarder - UI propre et sobre
 */

'use client'

import { Button } from '@/components/ui/button'
import { Check, Save } from 'lucide-react'
import { useState } from 'react'

interface SaveButtonProps {
  onSave: () => void
  disabled?: boolean
  className?: string
}

export function SaveButton({ onSave, disabled = false, className = '' }: SaveButtonProps) {
  const [saved, setSaved] = useState(false)

  const handleClick = () => {
    onSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || saved}
      className={`
        transition-all duration-200 gap-2
        ${saved 
          ? 'bg-aquiz-green/10 border-aquiz-green text-aquiz-green' 
          : 'border-aquiz-gray-lighter text-aquiz-gray hover:border-aquiz-black hover:text-aquiz-black'
        }
        ${className}
      `}
    >
      {saved ? (
        <>
          <Check className="w-4 h-4" />
          <span>Sauvegardé</span>
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          <span>Sauvegarder</span>
        </>
      )}
    </Button>
  )
}
