'use client'

/**
 * SearchAdresse — Barre de recherche d'adresse française
 *
 * Utilise l'API adresse.data.gouv.fr (100% gratuit, aucune clé API)
 * Autocomplétion en temps réel avec debounce
 */

import { cn } from '@/lib/utils'
import { Loader2, MapPin, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Suggestion {
  label: string
  city: string
  postcode: string
  lat: number
  lng: number
  type: string
}

interface SearchAdresseProps {
  onSelect: (coords: { lat: number; lng: number; zoom?: number; label: string }) => void
  placeholder?: string
  className?: string
}

/** Debounce hook */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export default function SearchAdresse({
  onSelect,
  placeholder = 'Rechercher une ville, adresse...',
  className,
}: SearchAdresseProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const justSelectedRef = useRef(false)

  const debouncedQuery = useDebounce(query, 300)

  // Fetch suggestions from API adresse.data.gouv.fr
  useEffect(() => {
    // Skip fetch right after user selected a suggestion
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }

    if (debouncedQuery.trim().length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(debouncedQuery)}&limit=6&autocomplete=1`,
      { signal: controller.signal },
    )
      .then((res) => res.json())
      .then((data) => {
        const results: Suggestion[] = (data.features || []).map(
          (f: {
            geometry: { coordinates: [number, number] }
            properties: {
              label: string
              city: string
              postcode: string
              type: string
            }
          }) => ({
            label: f.properties.label,
            city: f.properties.city,
            postcode: f.properties.postcode,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            type: f.properties.type,
          }),
        )
        setSuggestions(results)
        setIsOpen(results.length > 0)
        setActiveIndex(-1)
      })
      .catch(() => {
        setSuggestions([])
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [debouncedQuery])

  // Fermer au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      justSelectedRef.current = true
      setQuery(suggestion.label)
      setIsOpen(false)
      setSuggestions([])

      // Zoom adapté au type de résultat
      const zoom =
        suggestion.type === 'municipality' ? 12.5 :
        suggestion.type === 'locality' ? 13 :
        suggestion.type === 'street' ? 15 : 16

      onSelect({
        lat: suggestion.lat,
        lng: suggestion.lng,
        zoom,
        label: suggestion.label,
      })
    },
    [onSelect],
  )

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0,
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1,
      )
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const clear = () => {
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-full border transition-all',
          'bg-white border-slate-200 focus-within:border-slate-400 focus-within:shadow-sm',
          isOpen && 'rounded-b-none rounded-t-xl',
        )}
      >
        <Search
          className="w-3.5 h-3.5 ml-3 shrink-0 text-slate-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 text-[12px] font-medium bg-transparent border-none outline-none py-[7px] pr-1 placeholder:text-slate-400 text-slate-800"
          autoComplete="off"
          spellCheck={false}
        />
        {isLoading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 text-slate-400" />
        )}
        {query && !isLoading && (
          <button
            onClick={clear}
            className="p-1 mr-1 rounded-full transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 border border-t-0 rounded-b-xl shadow-lg overflow-hidden bg-white border-slate-200"
        >
          {suggestions.map((s, i) => (
            <button
              key={`${s.lat}-${s.lng}-${i}`}
              onClick={() => handleSelect(s)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50',
                i === activeIndex && 'bg-slate-50',
              )}
            >
              <MapPin
                className={cn(
                  'w-3.5 h-3.5 shrink-0',
                  s.type === 'municipality' ? 'text-emerald-500' : 'text-slate-400',
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate text-slate-800">
                  {s.label}
                </p>
                <p className="text-[10px] truncate text-slate-400">
                  {s.postcode} · {s.type === 'municipality' ? 'Commune' : s.type === 'street' ? 'Rue' : 'Adresse'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
