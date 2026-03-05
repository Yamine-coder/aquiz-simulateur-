'use client'

/**
 * EditableCell — Édition inline des données dans le tableau comparateur.
 *
 * Quand une valeur est absente (undefined/null), affiche un bouton "Ajouter"
 * cliquable qui ouvre un input inline. Quand la valeur existe, affiche le
 * contenu formaté avec boutons modifier et supprimer au hover.
 *
 * Features :
 * - 4 types de champs : number, text, boolean, dpe
 * - Boutons ✓ / ✗ explicites en mode édition
 * - Suppression rapide (remettre à vide) au hover
 * - Toggle boolean sans passer par un formulaire
 * - Flash vert de confirmation après sauvegarde
 * - Touch-friendly (cibles larges)
 */

import { useComparateurStore } from '@/stores/useComparateurStore'
import type { Annonce, ClasseDPE, NouvelleAnnonce } from '@/types/annonces'
import { COULEURS_DPE } from '@/types/annonces'
import { ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight, Check, ChevronDown, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export type EditableFieldType = 'number' | 'text' | 'boolean' | 'dpe' | 'orientation'

/** Champs éditables avec leur config */
export const EDITABLE_FIELDS: {
  field: keyof NouvelleAnnonce
  label: string
  fieldType: EditableFieldType
  suffix?: string
  placeholder?: string
}[] = [
  { field: 'chargesMensuelles', label: 'Charges / mois', fieldType: 'number', suffix: '€/mois', placeholder: 'Ex: 150' },
  { field: 'taxeFonciere', label: 'Taxe foncière / an', fieldType: 'number', suffix: '€/an', placeholder: 'Ex: 1200' },
  { field: 'etage', label: 'Étage', fieldType: 'number', placeholder: 'Ex: 3' },
  { field: 'anneeConstruction', label: 'Année de construction', fieldType: 'number', placeholder: 'Ex: 1985' },
  { field: 'orientation', label: 'Orientation', fieldType: 'orientation' },
  { field: 'nbSallesBains', label: 'Salles de bains', fieldType: 'number', placeholder: 'Ex: 1' },
  { field: 'dpe', label: 'DPE', fieldType: 'dpe' },
  { field: 'ges', label: 'GES', fieldType: 'dpe' },
  { field: 'balconTerrasse', label: 'Balcon / Terrasse', fieldType: 'boolean' },
  { field: 'parking', label: 'Parking / Garage', fieldType: 'boolean' },
  { field: 'ascenseur', label: 'Ascenseur', fieldType: 'boolean' },
  { field: 'cave', label: 'Cave', fieldType: 'boolean' },
]

/** Compte les données manquantes pour une annonce */
export function countMissingFields(annonce: Annonce): number {
  return EDITABLE_FIELDS.filter((f) => {
    const val = annonce[f.field as keyof Annonce]
    if (f.field === 'dpe' || f.field === 'ges') return !val || val === 'NC'
    return val === undefined || val === null
  }).length
}

/** Retourne les champs manquants pour une annonce */
export function getMissingFields(annonce: Annonce): typeof EDITABLE_FIELDS {
  return EDITABLE_FIELDS.filter((f) => {
    const val = annonce[f.field as keyof Annonce]
    if (f.field === 'dpe' || f.field === 'ges') return !val || val === 'NC'
    return val === undefined || val === null
  })
}

interface EditableCellProps {
  /** ID de l'annonce à modifier */
  annonceId: string
  /** Champ de l'annonce à modifier */
  field: keyof NouvelleAnnonce
  /** Type de saisie */
  fieldType: EditableFieldType
  /** Valeur brute actuelle (undefined = manquante) */
  rawValue: unknown
  /** Suffixe affiché à côté de l'input ("€", "€/mois", …) */
  suffix?: string
  /** Placeholder dans l'input */
  placeholder?: string
  /** Contenu formaté quand la valeur existe (rendu par le parent) */
  children?: React.ReactNode
}

const DPE_OPTIONS: ClasseDPE[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

/** Options d'orientation cardinales avec icônes Lucide */
const ORIENTATION_OPTIONS = [
  { value: 'Nord', short: 'N', Icon: ArrowUp },
  { value: 'Nord-Est', short: 'NE', Icon: ArrowUpRight },
  { value: 'Est', short: 'E', Icon: ArrowRight },
  { value: 'Sud-Est', short: 'SE', Icon: ArrowDownRight },
  { value: 'Sud', short: 'S', Icon: ArrowDown },
  { value: 'Sud-Ouest', short: 'SO', Icon: ArrowDownLeft },
  { value: 'Ouest', short: 'O', Icon: ArrowLeft },
  { value: 'Nord-Ouest', short: 'NO', Icon: ArrowUpLeft },
] as const

export function EditableCell({
  annonceId,
  field,
  fieldType,
  rawValue,
  suffix,
  placeholder,
  children,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [justSaved, setJustSaved] = useState<'saved' | 'cleared' | false>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const modifierAnnonce = useComparateurStore((s) => s.modifierAnnonce)

  const isEmpty = rawValue === undefined || rawValue === null

  // ─── Feedback flash ───────────────────────────────────────
  const flash = useCallback((type: 'saved' | 'cleared') => {
    setJustSaved(type)
    const timer = setTimeout(() => setJustSaved(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  // Focus input on edit
  useEffect(() => {
    if (!isEditing || fieldType === 'dpe' || fieldType === 'orientation') return
    const timeout = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => clearTimeout(timeout)
  }, [isEditing, fieldType])

  /** Démarre l'édition */
  const startEditing = useCallback(
    (initialValue?: string) => {
      setInputValue(
        initialValue ??
          (!isEmpty && fieldType !== 'boolean' && fieldType !== 'dpe' && fieldType !== 'orientation' ? String(rawValue) : ''),
      )
      setIsEditing(true)
    },
    [isEmpty, rawValue, fieldType],
  )

  /** Supprime la valeur (remet à undefined / null) */
  const clearValue = useCallback(() => {
    if (fieldType === 'dpe') {
      modifierAnnonce(annonceId, { [field]: 'NC' } as Partial<NouvelleAnnonce>)
    } else if (fieldType === 'boolean') {
      modifierAnnonce(annonceId, { [field]: undefined } as Partial<NouvelleAnnonce>)
    } else {
      modifierAnnonce(annonceId, { [field]: undefined } as Partial<NouvelleAnnonce>)
    }
    setIsEditing(false)
    flash('cleared')
  }, [annonceId, field, fieldType, modifierAnnonce, flash])

  /** Sauvegarde et ferme l'éditeur */
  const save = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) {
        setIsEditing(false)
        return
      }

      let parsed: unknown
      switch (fieldType) {
        case 'number': {
          const num = Number(trimmed.replace(/\s/g, '').replace(',', '.'))
          if (isNaN(num) || num < 0) {
            setIsEditing(false)
            return
          }
          parsed = num
          break
        }
        case 'dpe': {
          const upper = trimmed.toUpperCase() as ClasseDPE
          if (!DPE_OPTIONS.includes(upper)) {
            setIsEditing(false)
            return
          }
          parsed = upper
          break
        }
        default:
          parsed = trimmed
      }

      modifierAnnonce(annonceId, { [field]: parsed } as Partial<NouvelleAnnonce>)
      setIsEditing(false)
      flash('saved')
    },
    [fieldType, annonceId, field, modifierAnnonce, flash],
  )

  const cancel = useCallback(() => setIsEditing(false), [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        save(inputValue)
      }
      if (e.key === 'Escape') cancel()
    },
    [save, inputValue, cancel],
  )

  /** Style du flash feedback */
  const flashClass =
    justSaved === 'saved'
      ? 'ring-2 ring-aquiz-green/40 bg-aquiz-green/10'
      : justSaved === 'cleared'
        ? 'ring-2 ring-amber-400/40 bg-amber-50'
        : ''

  // ─── Boolean : boutons Oui / Non ──────────────────────────
  if (fieldType === 'boolean') {
    if (isEmpty) {
      return (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => {
              modifierAnnonce(annonceId, { [field]: true } as Partial<NouvelleAnnonce>)
              flash('saved')
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold rounded-xl border-2 border-dashed border-aquiz-green/25 text-aquiz-green/70 bg-aquiz-green/5 hover:border-aquiz-green hover:text-aquiz-green hover:bg-aquiz-green/10 hover:shadow-sm active:scale-95 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            Oui
          </button>
          <button
            onClick={() => {
              modifierAnnonce(annonceId, { [field]: false } as Partial<NouvelleAnnonce>)
              flash('saved')
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold rounded-xl border-2 border-dashed border-aquiz-gray-lighter/80 text-aquiz-gray-light bg-gray-50/50 hover:border-aquiz-gray-light hover:text-aquiz-gray hover:bg-gray-100 hover:shadow-sm active:scale-95 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Non
          </button>
        </div>
      )
    }
    // Valeur existante → toggle + clear
    return (
      <div className={`group/edit relative flex items-center justify-center gap-1 transition-all duration-300 rounded-xl py-0.5 ${flashClass}`}>
        {children}
        {/* Toggle (invert) */}
        <button
          onClick={() => {
            modifierAnnonce(annonceId, { [field]: !rawValue } as Partial<NouvelleAnnonce>)
            flash('saved')
          }}
          className="ml-1 w-5 h-5 rounded-lg bg-white shadow-sm border border-aquiz-gray-lighter/80 flex items-center justify-center opacity-0 group-hover/edit:opacity-100 hover:bg-aquiz-green/10 hover:border-aquiz-green/40 active:scale-90 transition-all"
          title="Inverser"
        >
          <RotateCcw className="w-2.5 h-2.5 text-aquiz-gray" />
        </button>
        {/* Supprimer */}
        <button
          onClick={clearValue}
          className="w-5 h-5 rounded-lg bg-white shadow-sm border border-aquiz-gray-lighter/80 flex items-center justify-center opacity-0 group-hover/edit:opacity-100 hover:bg-red-50 hover:border-red-300 active:scale-90 transition-all"
          title="Supprimer"
        >
          <Trash2 className="w-2.5 h-2.5 text-aquiz-gray group-hover/edit:text-red-400" />
        </button>
      </div>
    )
  }

  // ─── DPE / GES : sélecteur custom en grille de lettres ─────
  if (fieldType === 'dpe') {
    if (isEmpty || isEditing) {
      return (
        <div className="relative" ref={containerRef}>
          <div className="bg-white rounded-xl border border-aquiz-gray-lighter/80 shadow-lg p-2 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center gap-1">
              {DPE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => save(opt)}
                  className={`
                    w-8 h-8 rounded-lg text-xs font-bold text-white
                    flex items-center justify-center
                    ${COULEURS_DPE[opt]}
                    ${!isEmpty && String(rawValue) === opt ? 'ring-2 ring-offset-1 ring-aquiz-black scale-110' : 'opacity-75 hover:opacity-100 hover:scale-105'}
                    active:scale-95 transition-all duration-150 cursor-pointer
                  `}
                  title={`Classe ${opt}`}
                >
                  {opt}
                </button>
              ))}
              {/* Annuler */}
              <button
                onClick={cancel}
                className="ml-1 w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all"
                title="Annuler"
              >
                <X className="w-3.5 h-3.5 text-aquiz-gray" />
              </button>
            </div>
          </div>
        </div>
      )
    }
    // Valeur existante → clic pour modifier + supprimer au hover
    return (
      <div
        className={`group/edit relative inline-flex items-center gap-1 cursor-pointer transition-all duration-300 rounded-lg ${flashClass}`}
        ref={containerRef}
      >
        <div
          onClick={() => startEditing()}
          title="Cliquer pour modifier"
          className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          {children}
          <ChevronDown className="w-3 h-3 text-aquiz-gray-light opacity-0 group-hover/edit:opacity-100 transition-opacity" />
        </div>
        {/* Supprimer */}
        <button
          onClick={clearValue}
          className="w-5 h-5 rounded-full bg-white shadow-sm border border-aquiz-gray-lighter flex items-center justify-center opacity-0 group-hover/edit:opacity-100 hover:bg-red-50 hover:border-red-300 active:scale-90 transition-all"
          title="Supprimer"
        >
          <Trash2 className="w-2.5 h-2.5 text-aquiz-gray group-hover/edit:text-red-400" />
        </button>
      </div>
    )
  }

  // ─── Orientation : sélecteur inline en ligne ───────────────
  if (fieldType === 'orientation') {
    if (isEmpty || isEditing) {
      return (
        <div className="relative" ref={containerRef}>
          <div className="bg-white rounded-xl border border-aquiz-gray-lighter/80 shadow-lg p-1.5 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center gap-0.5">
              {ORIENTATION_OPTIONS.map((opt) => {
                const isSelected = !isEmpty && String(rawValue) === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      modifierAnnonce(annonceId, { [field]: opt.value } as Partial<NouvelleAnnonce>)
                      setIsEditing(false)
                      flash('saved')
                    }}
                    className={`
                      flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg min-w-7.5
                      ${isSelected
                        ? 'bg-aquiz-green text-white shadow-sm'
                        : 'text-aquiz-gray hover:bg-aquiz-green/10 hover:text-aquiz-green'
                      }
                      active:scale-90 transition-all duration-150 cursor-pointer
                    `}
                    title={opt.value}
                  >
                    <opt.Icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold leading-none">{opt.short}</span>
                  </button>
                )
              })}
              {/* Annuler */}
              <button
                onClick={cancel}
                className="ml-0.5 w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all shrink-0"
                title="Annuler"
              >
                <X className="w-3.5 h-3.5 text-aquiz-gray" />
              </button>
            </div>
          </div>
        </div>
      )
    }
    // Valeur existante → clic pour modifier + supprimer
    return (
      <div
        className={`group/edit relative inline-flex items-center gap-1 cursor-pointer transition-all duration-300 rounded-lg ${flashClass}`}
        ref={containerRef}
      >
        <div
          onClick={() => startEditing()}
          title="Cliquer pour modifier"
          className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          {children}
          <ChevronDown className="w-3 h-3 text-aquiz-gray-light opacity-0 group-hover/edit:opacity-100 transition-opacity" />
        </div>
        {/* Supprimer */}
        <button
          onClick={clearValue}
          className="w-5 h-5 rounded-lg bg-white shadow-sm border border-aquiz-gray-lighter/80 flex items-center justify-center opacity-0 group-hover/edit:opacity-100 hover:bg-red-50 hover:border-red-300 active:scale-90 transition-all"
          title="Supprimer"
        >
          <Trash2 className="w-2.5 h-2.5 text-aquiz-gray group-hover/edit:text-red-400" />
        </button>
      </div>
    )
  }

  // ─── Number / Text : input inline avec boutons ✓ ✗ ────────
  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1.5 bg-white rounded-xl border border-aquiz-gray-lighter/80 shadow-lg px-2.5 py-1.5 animate-in fade-in-0 zoom-in-95 duration-150" ref={containerRef}>
        <input
          ref={inputRef}
          type={fieldType === 'number' ? 'number' : 'text'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Valeur'}
          className="w-20 text-center text-sm font-medium bg-transparent border-0 outline-none text-aquiz-black placeholder:text-aquiz-gray-light/60"
          min={fieldType === 'number' ? 0 : undefined}
          step={fieldType === 'number' ? 'any' : undefined}
        />
        {suffix && (
          <span className="text-[10px] text-aquiz-gray/60 font-medium shrink-0">{suffix}</span>
        )}
        {/* Séparateur */}
        <div className="w-px h-5 bg-aquiz-gray-lighter/60 shrink-0" />
        {/* Confirmer */}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => save(inputValue)}
          className="w-7 h-7 rounded-lg bg-aquiz-green/10 flex items-center justify-center hover:bg-aquiz-green/20 active:scale-90 transition-all shrink-0"
          title="Confirmer (Entrée)"
        >
          <Check className="w-3.5 h-3.5 text-aquiz-green" />
        </button>
        {/* Annuler */}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={cancel}
          className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all shrink-0"
          title="Annuler (Échap)"
        >
          <X className="w-3.5 h-3.5 text-aquiz-gray" />
        </button>
      </div>
    )
  }

  // ─── État vide : bouton "Ajouter" ─────────────────────────
  if (isEmpty) {
    return (
      <button
        onClick={() => startEditing('')}
        className="group/add inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-aquiz-gray-lighter/80 bg-aquiz-gray-lightest/30 hover:border-aquiz-green/50 hover:bg-aquiz-green/5 hover:shadow-sm active:scale-95 transition-all"
        title="Ajouter manuellement"
      >
        <Plus className="w-3.5 h-3.5 text-aquiz-gray-light group-hover/add:text-aquiz-green transition-colors" />
        <span className="text-[11px] text-aquiz-gray-light group-hover/add:text-aquiz-green font-medium transition-colors">
          Ajouter
        </span>
      </button>
    )
  }

  // ─── Valeur existante : affichage + modifier / supprimer ──
  return (
    <div
      className={`group/edit relative inline-flex items-center gap-1 cursor-pointer transition-all duration-300 rounded-xl px-1.5 py-0.5 ${flashClass}`}
      ref={containerRef}
    >
      <div
        onClick={() => startEditing(String(rawValue))}
        title="Cliquer pour modifier"
        className="hover:opacity-80 transition-opacity"
      >
        {children}
      </div>
      {/* Modifier */}
      <button
        onClick={() => startEditing(String(rawValue))}
        className="w-5 h-5 rounded-lg bg-white shadow-sm border border-aquiz-gray-lighter/80 flex items-center justify-center opacity-0 group-hover/edit:opacity-100 hover:bg-aquiz-green/10 hover:border-aquiz-green/40 active:scale-90 transition-all"
        title="Modifier"
      >
        <Pencil className="w-2.5 h-2.5 text-aquiz-gray" />
      </button>
      {/* Supprimer */}
      <button
        onClick={clearValue}
        className="w-5 h-5 rounded-lg bg-white shadow-sm border border-aquiz-gray-lighter/80 flex items-center justify-center opacity-0 group-hover/edit:opacity-100 hover:bg-red-50 hover:border-red-300 active:scale-90 transition-all"
        title="Supprimer la valeur"
      >
        <Trash2 className="w-2.5 h-2.5 text-aquiz-gray group-hover/edit:text-red-400" />
      </button>
    </div>
  )
}
