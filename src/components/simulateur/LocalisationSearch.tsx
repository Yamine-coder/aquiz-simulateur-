'use client'

import { MapPin, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Interface pour une commune retournée par l'API geo.api.gouv.fr
 */
interface CommuneResult {
  nom: string
  code: string // Code INSEE
  codeDepartement: string
  codeRegion: string
  codesPostaux: string[]
  population?: number
}

/**
 * Interface pour une suggestion avec un seul code postal
 * (pour Paris et autres villes avec plusieurs codes postaux)
 */
interface SuggestionItem {
  nom: string
  code: string
  codeDepartement: string
  codePostal: string
  population?: number
  displayName: string // ex: "Paris 12ème" ou "Lyon"
}

/**
 * Props du composant LocalisationSearch
 */
interface LocalisationSearchProps {
  /** Valeur actuelle (code postal) */
  value: string
  /** Callback quand une commune est sélectionnée */
  onChange: (codePostal: string, nomCommune: string) => void
  /** Placeholder du champ */
  placeholder?: string
  /** Classes CSS additionnelles */
  className?: string
  /** Désactivé */
  disabled?: boolean
}

/**
 * Composant de recherche de localisation avec autocomplete
 * Utilise l'API geo.api.gouv.fr pour les suggestions
 */
export function LocalisationSearch({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  value: _value, // Gardé pour compatibilité mais non utilisé
  onChange,
  placeholder = 'Ville ou code postal (ex: Paris, 75001)',
  className,
  disabled = false
}: LocalisationSearchProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCommune, setSelectedCommune] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isSelectingRef = useRef(false) // Pour éviter la fermeture pendant un clic

  // Mettre à jour la position du dropdown
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }, [isOpen, suggestions])

  // Fermer les suggestions quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ne pas fermer si on est en train de sélectionner
      if (isSelectingRef.current) return
      
      const target = event.target as Node
      const isInContainer = containerRef.current?.contains(target)
      const isInDropdown = listRef.current?.contains(target)
      
      if (!isInContainer && !isInDropdown) {
        setIsOpen(false)
      }
    }

    // Utiliser click au lieu de mousedown pour permettre onClick de s'exécuter d'abord
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Recherche de communes via l'API
  const searchCommunes = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    setIsLoading(true)

    try {
      // Déterminer si c'est une recherche par code postal ou par nom
      const isCodePostal = /^\d+$/.test(query)
      
      let url: string
      if (isCodePostal) {
        // Recherche par code postal
        url = `https://geo.api.gouv.fr/communes?codePostal=${query}&fields=nom,code,codeDepartement,codeRegion,codesPostaux,population&limit=10`
      } else {
        // Recherche par nom
        url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,code,codeDepartement,codeRegion,codesPostaux,population&limit=10&boost=population`
      }

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Erreur API')
      }

      const data: CommuneResult[] = await response.json()
      
      // Éclater les communes avec plusieurs codes postaux en suggestions individuelles
      const expandedSuggestions: SuggestionItem[] = []
      
      for (const commune of data) {
        // Pour Paris, Marseille, Lyon : créer une entrée par arrondissement
        if (commune.codesPostaux.length > 3) {
          // Filtrer les codes postaux qui correspondent à la recherche
          const matchingCodes = isCodePostal
            ? commune.codesPostaux.filter(cp => cp.startsWith(query))
            : commune.codesPostaux
          
          // Limiter à 10 codes postaux max pour éviter trop de résultats
          const codesToShow = matchingCodes.slice(0, 10)
          
          for (const codePostal of codesToShow) {
            // Déterminer le nom d'affichage (ex: "Paris 12ème" pour 75012)
            let displayName = commune.nom
            if (commune.nom === 'Paris' && codePostal.startsWith('750')) {
              const arrondissement = parseInt(codePostal.slice(-2))
              displayName = `Paris ${arrondissement}${arrondissement === 1 ? 'er' : 'ème'}`
            } else if (commune.nom === 'Marseille' && codePostal.startsWith('130')) {
              const arrondissement = parseInt(codePostal.slice(-2))
              displayName = `Marseille ${arrondissement}${arrondissement === 1 ? 'er' : 'ème'}`
            } else if (commune.nom === 'Lyon' && codePostal.startsWith('6900')) {
              const arrondissement = parseInt(codePostal.slice(-1))
              displayName = `Lyon ${arrondissement}${arrondissement === 1 ? 'er' : 'ème'}`
            }
            
            expandedSuggestions.push({
              nom: commune.nom,
              code: commune.code,
              codeDepartement: commune.codeDepartement,
              codePostal,
              population: commune.population,
              displayName
            })
          }
        } else {
          // Commune normale : une seule entrée avec le premier code postal
          expandedSuggestions.push({
            nom: commune.nom,
            code: commune.code,
            codeDepartement: commune.codeDepartement,
            codePostal: commune.codesPostaux[0] || '',
            population: commune.population,
            displayName: commune.nom
          })
        }
      }
      
      // Trier par population puis par code postal
      const sorted = expandedSuggestions.sort((a, b) => {
        // D'abord par population
        const popDiff = (b.population || 0) - (a.population || 0)
        if (popDiff !== 0) return popDiff
        // Puis par code postal
        return a.codePostal.localeCompare(b.codePostal)
      })
      
      // Limiter à 15 résultats max
      setSuggestions(sorted.slice(0, 15))
      setIsOpen(sorted.length > 0)
      setHighlightedIndex(-1)
    } catch (error) {
      console.error('Erreur recherche communes:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce de la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue && !selectedCommune) {
        searchCommunes(inputValue)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, searchCommunes, selectedCommune])

  // Sélectionner une commune
  const selectCommune = (suggestion: SuggestionItem) => {
    isSelectingRef.current = true
    const displayValue = `${suggestion.displayName} (${suggestion.codePostal})`
    
    setInputValue(displayValue)
    setSelectedCommune(displayValue)
    setSuggestions([])
    setIsOpen(false)
    onChange(suggestion.codePostal, suggestion.displayName)
    
    // Réinitialiser après un court délai
    setTimeout(() => {
      isSelectingRef.current = false
    }, 100)
  }

  // Effacer la sélection
  const clearSelection = () => {
    setInputValue('')
    setSelectedCommune(null)
    setSuggestions([])
    setIsOpen(false)
    setHighlightedIndex(-1)
    onChange('', '')
    // Petit délai pour éviter la réouverture des suggestions
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  // Gérer les touches clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          selectCommune(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  // Formater la population
  const formatPopulation = (pop?: number) => {
    if (!pop) return ''
    if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M hab.`
    if (pop >= 1000) return `${Math.round(pop / 1000)}k hab.`
    return `${pop} hab.`
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className={cn(
            'h-11 pl-10 pr-10 bg-white border border-aquiz-gray-lighter rounded-lg font-medium placeholder:text-aquiz-gray-light',
            selectedCommune && 'bg-aquiz-gray-lightest'
          )}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setSelectedCommune(null)
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        {/* Icône de chargement ou bouton effacer */}
        {isLoading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-aquiz-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : inputValue && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-aquiz-gray-lighter rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-aquiz-gray" />
          </button>
        )}
      </div>

      {/* Liste des suggestions */}
      {isOpen && suggestions.length > 0 && typeof document !== 'undefined' && createPortal(
          <ul
            ref={listRef}
            className="bg-white border border-aquiz-gray-lighter rounded-lg shadow-lg overflow-hidden"
            role="listbox"
            style={{
              position: 'absolute',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              zIndex: 9999,
              maxHeight: '280px',
            }}
          >
            <div className="max-h-[280px] overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.code}-${suggestion.codePostal}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={cn(
                    'px-3 py-2.5 cursor-pointer flex items-center gap-2.5 transition-colors border-b border-aquiz-gray-lightest last:border-0',
                    index === highlightedIndex 
                      ? 'bg-aquiz-green/10' 
                      : 'hover:bg-aquiz-gray-lightest/70'
                  )}
                  onMouseDown={(e) => {
                    // Empêcher la perte de focus qui fermerait le dropdown
                    e.preventDefault()
                  }}
                  onClick={() => selectCommune(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <MapPin className={cn(
                    'w-4 h-4 shrink-0',
                    index === highlightedIndex ? 'text-aquiz-green' : 'text-aquiz-gray-light'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'font-medium truncate',
                        index === highlightedIndex ? 'text-aquiz-green' : 'text-aquiz-black'
                      )}>
                        {suggestion.displayName}
                      </span>
                      <span className="text-[10px] text-aquiz-gray">
                        ({suggestion.codeDepartement})
                      </span>
                    </div>
                    <div className="text-[11px] text-aquiz-gray mt-0.5">
                      {suggestion.codePostal}
                      {suggestion.population && (
                        <>
                          <span className="text-aquiz-gray-light"> • </span>
                          <span>{formatPopulation(suggestion.population)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </div>
          </ul>,
        document.body
      )}

      {/* Message si pas de résultats */}
      {isOpen && inputValue.length >= 2 && suggestions.length === 0 && !isLoading && typeof document !== 'undefined' && createPortal(
        <div 
          className="bg-white border border-aquiz-gray-lighter rounded-lg shadow-lg p-4 text-center"
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999,
          }}
        >
          <p className="text-sm text-aquiz-gray">Aucune commune trouvée</p>
        </div>,
        document.body
      )}
    </div>
  )
}
