'use client'

/**
 * CompleteDonneesDrawer — Formulaire latéral pour compléter rapidement
 * toutes les données manquantes d'une annonce.
 *
 * Affiche uniquement les champs vides. Chaque champ est sauvegardé
 * individuellement au fur et à mesure de la saisie (à la validation).
 */

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { useComparateurStore } from '@/stores/useComparateurStore'
import type { Annonce, ClasseDPE, NouvelleAnnonce } from '@/types/annonces'
import { Check, Pencil } from 'lucide-react'
import { useCallback, useState } from 'react'
import { getMissingFields } from './EditableCell'

const DPE_OPTIONS: ClasseDPE[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

interface CompleteDonneesDrawerProps {
  annonce: Annonce | null
  open: boolean
  onClose: () => void
}

export function CompleteDonneesDrawer({ annonce, open, onClose }: CompleteDonneesDrawerProps) {
  const modifierAnnonce = useComparateurStore((s) => s.modifierAnnonce)
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set())

  const missingFields = annonce ? getMissingFields(annonce) : []

  const saveField = useCallback(
    (field: keyof NouvelleAnnonce, value: unknown) => {
      if (!annonce) return
      modifierAnnonce(annonce.id, { [field]: value } as Partial<NouvelleAnnonce>)
      setSavedFields((prev) => new Set(prev).add(field))
    },
    [annonce, modifierAnnonce],
  )

  const handleClose = () => {
    setSavedFields(new Set())
    onClose()
  }

  if (!annonce) return null

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-aquiz-gray-lighter mb-6">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Pencil className="w-5 h-5 text-aquiz-green" />
            Compléter les données
          </SheetTitle>
          <SheetDescription>
            <span className="font-medium text-aquiz-black">{annonce.ville}</span>
            {' — '}
            {annonce.prix.toLocaleString('fr-FR')} € · {annonce.surface} m²
          </SheetDescription>
        </SheetHeader>

        {missingFields.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-aquiz-green/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-aquiz-green" />
            </div>
            <p className="text-sm font-medium text-aquiz-black">Toutes les données sont renseignées !</p>
            <p className="text-xs text-aquiz-gray mt-1">Le score de cette annonce est optimisé.</p>
            <button
              onClick={handleClose}
              className="mt-6 px-6 py-2 bg-aquiz-green text-white text-sm font-medium rounded-xl hover:bg-aquiz-green/90 transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-aquiz-gray">
              {missingFields.length} champ{missingFields.length > 1 ? 's' : ''} manquant{missingFields.length > 1 ? 's' : ''}.
              Renseignez-les pour améliorer la précision du score.
            </p>

            {missingFields.map((fieldConfig) => (
              <DrawerField
                key={fieldConfig.field}
                {...fieldConfig}
                isSaved={savedFields.has(fieldConfig.field)}
                onSave={(value) => saveField(fieldConfig.field, value)}
              />
            ))}

            <div className="pt-4 border-t border-aquiz-gray-lighter">
              <button
                onClick={handleClose}
                className="w-full px-6 py-3 bg-aquiz-green text-white text-sm font-semibold rounded-xl hover:bg-aquiz-green/90 transition-colors"
              >
                {savedFields.size > 0 ? `Terminé (${savedFields.size} sauvé${savedFields.size > 1 ? 's' : ''})` : 'Fermer'}
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Field row ───────────────────────────────────────────────

interface DrawerFieldProps {
  field: keyof NouvelleAnnonce
  label: string
  fieldType: 'number' | 'text' | 'boolean' | 'dpe'
  suffix?: string
  placeholder?: string
  isSaved: boolean
  onSave: (value: unknown) => void
}

function DrawerField({ label, fieldType, suffix, placeholder, isSaved, onSave }: DrawerFieldProps) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return

    if (fieldType === 'number') {
      const num = Number(trimmed.replace(/\s/g, '').replace(',', '.'))
      if (isNaN(num) || num < 0) return
      onSave(num)
    } else if (fieldType === 'dpe') {
      onSave(trimmed.toUpperCase())
    } else {
      onSave(trimmed)
    }
  }

  // ─── Boolean ───
  if (fieldType === 'boolean') {
    return (
      <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
        isSaved ? 'bg-aquiz-green/5 border-aquiz-green/30' : 'bg-white border-aquiz-gray-lighter'
      }`}>
        <span className="text-sm text-aquiz-black font-medium">{label}</span>
        {isSaved ? (
          <div className="flex items-center gap-1.5 text-aquiz-green text-xs font-medium">
            <Check className="w-4 h-4" />
            Sauvé
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onSave(true)}
              className="px-4 py-1.5 text-xs font-medium rounded-lg border border-aquiz-green/30 text-aquiz-green hover:bg-aquiz-green hover:text-white transition-all"
            >
              Oui
            </button>
            <button
              onClick={() => onSave(false)}
              className="px-4 py-1.5 text-xs font-medium rounded-lg border border-aquiz-gray-lighter text-aquiz-gray hover:bg-aquiz-gray-lightest transition-all"
            >
              Non
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─── DPE ───
  if (fieldType === 'dpe') {
    return (
      <div className={`p-3 rounded-xl border transition-all ${
        isSaved ? 'bg-aquiz-green/5 border-aquiz-green/30' : 'bg-white border-aquiz-gray-lighter'
      }`}>
        <span className="text-sm text-aquiz-black font-medium mb-2 block">{label}</span>
        {isSaved ? (
          <div className="flex items-center gap-1.5 text-aquiz-green text-xs font-medium">
            <Check className="w-4 h-4" />
            Sauvé
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {DPE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => onSave(opt)}
                className="w-9 h-9 rounded-lg border border-aquiz-gray-lighter text-sm font-bold text-aquiz-gray hover:border-aquiz-green hover:text-aquiz-green hover:bg-aquiz-green/5 transition-all"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Number / Text ───
  return (
    <div className={`p-3 rounded-xl border transition-all ${
      isSaved ? 'bg-aquiz-green/5 border-aquiz-green/30' : 'bg-white border-aquiz-gray-lighter'
    }`}>
      <label className="text-sm text-aquiz-black font-medium mb-2 block">{label}</label>
      {isSaved ? (
        <div className="flex items-center gap-1.5 text-aquiz-green text-xs font-medium">
          <Check className="w-4 h-4" />
          Sauvé
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type={fieldType === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            placeholder={placeholder}
            className="flex-1 text-sm border border-aquiz-gray-lighter rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-aquiz-green/20 focus:border-aquiz-green/30 transition-shadow"
            min={fieldType === 'number' ? 0 : undefined}
          />
          {suffix && <span className="text-xs text-aquiz-gray shrink-0">{suffix}</span>}
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="px-3 py-2 bg-aquiz-green text-white text-xs font-medium rounded-lg hover:bg-aquiz-green/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
