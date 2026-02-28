'use client'

/**
 * Carte d'annonce immobilière — Design AQUIZ v2
 * Card compacte, moderne, inspirée Figma/Notion
 */

import { Button } from '@/components/ui/button'
import type { AnalyseFaisabilite, Annonce } from '@/types/annonces'
import { LABELS_SOURCES } from '@/types/annonces'
import {
    BedDouble,
    Building2,
    Check,
    ChevronRight,
    Copy,
    ExternalLink,
    Heart,
    Home,
    MapPin,
    MoreHorizontal,
    Pencil,
    Ruler,
    Trash2
} from 'lucide-react'
import Image from 'next/image'
import { useMemo, useRef, useState } from 'react'
import { ImageCarousel } from './ImageCarousel'

interface AnnonceCardProps {
  annonce: Annonce
  isSelected?: boolean
  selectionDisabled?: boolean
  faisabilite?: AnalyseFaisabilite
  onSelect?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onToggleFavori?: () => void
  /** Mode gestion (multi-sélection pour suppression) */
  manageMode?: boolean
  /** Sélectionné pour suppression en mode gestion */
  isManageSelected?: boolean
  /** Toggle sélection en mode gestion */
  onManageToggle?: () => void
  compact?: boolean
}

export function AnnonceCard({
  annonce,
  isSelected = false,
  selectionDisabled = false,
  faisabilite,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavori,
  manageMode = false,
  isManageSelected = false,
  onManageToggle,
  compact = false
}: AnnonceCardProps) {
  const IconType = annonce.type === 'maison' ? Home : Building2
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Construire la liste d'images pour le carousel
  const allImages = useMemo(() => {
    const imgs: string[] = []
    if (annonce.imageUrl) imgs.push(annonce.imageUrl)
    if (annonce.images?.length) {
      for (const img of annonce.images) {
        if (!imgs.includes(img)) imgs.push(img)
      }
    }
    return imgs
  }, [annonce.imageUrl, annonce.images])

  // ─── VUE LISTE (compact) ───
  if (compact) {
    return (
      <div
        className={`
          group relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer
          ${manageMode && isManageSelected
            ? 'bg-rose-50 ring-1 ring-rose-300'
            : isSelected
              ? 'bg-aquiz-green/5 ring-1 ring-aquiz-green/30'
              : 'bg-white hover:bg-aquiz-gray-lightest/50 border border-aquiz-gray-lighter hover:border-aquiz-gray-light'
          }
        `}
        onClick={manageMode ? onManageToggle : onSelect}
      >
        {/* Thumbnail ou icône */}
        <div className="relative w-16 h-16 rounded-lg bg-aquiz-gray-lightest shrink-0 overflow-hidden">
          {annonce.imageUrl ? (
            <Image src={annonce.imageUrl} alt={annonce.titre || 'Bien immobilier'} className="w-full h-full object-cover" fill sizes="64px" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <IconType className="h-6 w-6 text-aquiz-gray-light" />
            </div>
          )}
          {manageMode ? (
            <div className={`absolute inset-0 flex items-center justify-center ${isManageSelected ? 'bg-rose-500/20' : 'bg-black/5'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                isManageSelected ? 'bg-rose-500' : 'bg-white/80 border-2 border-aquiz-gray-light'
              }`}>
                {isManageSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </div>
            </div>
          ) : isSelected ? (
            <div className="absolute inset-0 bg-aquiz-green/20 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-aquiz-green flex items-center justify-center">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-aquiz-black">
              {annonce.prix.toLocaleString('fr-FR')} €
            </span>
            <span className="text-[11px] text-aquiz-gray">
              {annonce.prixM2.toLocaleString('fr-FR')} €/m²
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-aquiz-gray">
            <span className="font-medium text-aquiz-black">{annonce.surface} m²</span>
            <span className="text-aquiz-gray-light">·</span>
            <span>{annonce.pieces}p</span>
            {annonce.chambres > 0 && (
              <>
                <span className="text-aquiz-gray-light">·</span>
                <span>{annonce.chambres} ch.</span>
              </>
            )}
            <span className="text-aquiz-gray-light">·</span>
            <span>{annonce.ville}</span>
          </div>
        </div>

        {/* Faisabilité badge */}
        {faisabilite && (
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
            faisabilite.niveau === 'confortable' ? 'bg-aquiz-green/10 text-aquiz-green' :
            faisabilite.niveau === 'limite' ? 'bg-amber-100 text-amber-600' :
            'bg-rose-100 text-rose-600'
          }`}>
            {faisabilite.niveau === 'confortable' && '✓ Budget'}
            {faisabilite.niveau === 'limite' && 'Limite'}
            {faisabilite.niveau === 'impossible' && 'Hors budget'}
          </span>
        )}

        <ChevronRight className="h-4 w-4 text-aquiz-gray-light shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )
  }

  // Carte réellement désactivée ? (max 4 sélections atteint et pas déjà sélectionnée)
  const isDisabled = selectionDisabled && !isSelected

  // ─── VUE GRILLE (card) ───
  return (
    <div
      className={`
        group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200
        ${isDisabled ? 'cursor-default opacity-60' : 'cursor-pointer'}
        ${manageMode && isManageSelected
          ? 'ring-2 ring-rose-400 shadow-md shadow-rose-400/10'
          : manageMode
            ? 'border border-aquiz-gray-lighter hover:border-rose-300 hover:shadow-lg hover:shadow-rose-400/10'
            : isSelected
              ? 'ring-2 ring-aquiz-green shadow-md shadow-aquiz-green/10'
              : isDisabled
                ? 'border border-aquiz-gray-lighter'
                : 'border border-aquiz-gray-lighter hover:border-aquiz-green/40 hover:shadow-lg hover:shadow-aquiz-green/5'
        }
      `}
      onClick={() => {
        if (isDisabled) return
        if (manageMode) {
          onManageToggle?.()
        } else {
          onSelect?.()
        }
      }}
    >
      {/* ── Image zone ── */}
      <div
        className="relative h-24 sm:h-40 shrink-0 bg-linear-to-br from-slate-50 to-slate-100 overflow-hidden"
      >
        {allImages.length > 1 ? (
          <ImageCarousel
            images={allImages}
            alt={annonce.titre || 'Bien immobilier'}
            className="h-full w-full"
          />
        ) : allImages.length === 1 ? (
          <Image
            src={allImages[0]}
            alt={annonce.titre || 'Bien immobilier'}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center mb-2 shadow-sm">
              <IconType className="h-7 w-7 text-aquiz-gray-light" />
            </div>
            <span className="text-[10px] text-aquiz-gray-light font-medium">Pas d&apos;image</span>
          </div>
        )}

        {/* Gradient overlay bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/30 to-transparent pointer-events-none" />

        {/* Hover overlay — manage mode (red) or comparison hint (green) — desktop only */}
        {manageMode && !isManageSelected ? (
          <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none hidden sm:flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
              <Trash2 className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold text-rose-500">Sélectionner pour supprimer</span>
            </div>
          </div>
        ) : !manageMode && !isSelected && !isDisabled ? (
          <div className="absolute inset-0 bg-aquiz-green/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none hidden sm:flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
              <Check className="h-4 w-4 text-aquiz-green" strokeWidth={2.5} />
              <span className="text-xs font-semibold text-aquiz-green">Cliquer pour comparer</span>
            </div>
          </div>
        ) : null}

        {/* Selection checkbox top-left — manage mode (rose) or normal (green) */}
        {manageMode ? (
          <button
            onClick={(e) => { e.stopPropagation(); onManageToggle?.() }}
            aria-label={isManageSelected ? 'Désélectionner' : 'Sélectionner pour suppression'}
            className={`
              absolute top-2.5 left-2.5 min-w-11 min-h-11 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 z-10
              ${isManageSelected
                ? 'bg-rose-500 shadow-sm'
                : 'bg-white/80 backdrop-blur-sm border border-white/50 hover:bg-white'
              }
            `}
          >
            {isManageSelected ? (
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            ) : (
              <span className="w-2 h-2 rounded-full border-2 border-rose-300" />
            )}
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); if (!isDisabled) onSelect?.() }}
            disabled={isDisabled}
            aria-label={isSelected ? 'Désélectionner ce bien' : 'Sélectionner ce bien'}
            className={`
              absolute top-2.5 left-2.5 min-w-11 min-h-11 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200
              ${isSelected
                ? 'bg-aquiz-green shadow-sm'
                : 'bg-white/80 backdrop-blur-sm border border-white/50 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-white'
              }
              ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {isSelected ? (
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            ) : (
              <span className="w-2 h-2 rounded-full border-2 border-aquiz-gray-light" />
            )}
          </button>
        )}

        {/* Favori top-right */}
        {onToggleFavori && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavori() }}
            aria-label={annonce.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={`
              absolute top-2.5 right-2.5 min-w-11 min-h-11 w-7 h-7 rounded-full flex items-center justify-center transition-all
              ${annonce.favori
                ? 'bg-rose-500 shadow-sm'
                : 'bg-white/80 backdrop-blur-sm border border-white/50 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-white'
              }
            `}
          >
            <Heart className={`h-3.5 w-3.5 ${annonce.favori ? 'fill-white text-white' : 'text-aquiz-gray'}`} />
          </button>
        )}

        {/* Source badge bottom-left */}
        <span className="absolute bottom-2 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/40 text-white backdrop-blur-sm">
          {LABELS_SOURCES[annonce.source]}
        </span>

        {/* Faisabilité badge bottom-right */}
        {faisabilite && (
          <span className={`absolute bottom-2 right-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm ${
            faisabilite.niveau === 'confortable' ? 'bg-aquiz-green/90 text-white' :
            faisabilite.niveau === 'limite' ? 'bg-amber-500/90 text-white' :
            'bg-rose-500/90 text-white'
          }`}>
            {faisabilite.niveau === 'confortable' && '✓ Dans budget'}
            {faisabilite.niveau === 'limite' && '⚠ Limite'}
            {faisabilite.niveau === 'impossible' && '✗ Hors budget'}
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 p-3 sm:p-4">
        {/* Prix */}
        <div className="flex items-baseline justify-between mb-1.5 sm:mb-2">
          <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span className="text-sm sm:text-xl font-extrabold text-aquiz-black tracking-tight">
              {annonce.prix.toLocaleString('fr-FR')}
            </span>
            <span className="text-[10px] sm:text-sm font-medium text-aquiz-gray">€</span>
          </div>
          <span className="hidden sm:inline text-[11px] font-semibold text-aquiz-gray bg-aquiz-gray-lightest px-2 py-0.5 rounded-md">
            {annonce.prixM2.toLocaleString('fr-FR')} €/m²
          </span>
        </div>

        {/* Métriques — ligne d'icônes */}
        <div className="flex items-center gap-1.5 sm:gap-3 mb-1.5 sm:mb-3">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Ruler className="h-3 w-3 text-aquiz-gray-light hidden sm:block" />
            <span className="text-[10px] sm:text-xs font-semibold text-aquiz-black">{annonce.surface}m²</span>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Building2 className="h-3 w-3 text-aquiz-gray-light hidden sm:block" />
            <span className="text-[10px] sm:text-xs text-aquiz-gray">{annonce.pieces}p</span>
          </div>
          {annonce.chambres > 0 && (
            <div className="flex items-center gap-0.5 sm:gap-1">
              <BedDouble className="h-3 w-3 text-aquiz-gray-light hidden sm:block" />
              <span className="text-[10px] sm:text-xs text-aquiz-gray">{annonce.chambres}ch</span>
            </div>
          )}
        </div>

        {/* Localisation — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1.5 mb-3">
          <MapPin className="h-3 w-3 text-aquiz-gray-light shrink-0" />
          <span className="text-[11px] sm:text-xs text-aquiz-gray truncate">
            {annonce.adresse || annonce.ville}
          </span>
          <span className="text-[10px] text-aquiz-gray-light shrink-0">({annonce.codePostal})</span>
        </div>

        {/* Ville on mobile only (compact) */}
        <p className="sm:hidden text-[10px] text-aquiz-gray truncate mb-1.5">
          {annonce.ville}
        </p>

        {/* Tags/Features — hidden on mobile */}
        <div className="hidden sm:flex flex-wrap gap-1.5 mb-3">
          {/* DPE */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
            annonce.dpe === 'A' || annonce.dpe === 'B' ? 'bg-emerald-50 text-emerald-600' :
            annonce.dpe === 'C' || annonce.dpe === 'D' ? 'bg-amber-50 text-amber-600' :
            annonce.dpe === 'NC' ? 'bg-slate-100 text-slate-500' :
            'bg-rose-50 text-rose-600'
          }`}>
            DPE {annonce.dpe}
          </span>

          {annonce.etage !== undefined && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {annonce.etage === 0 ? 'RDC' : `${annonce.etage}e ét.`}
            </span>
          )}
          {annonce.parking && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">Parking</span>
          )}
          {annonce.balconTerrasse && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">Extérieur</span>
          )}
          {annonce.ascenseur && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">Ascenseur</span>
          )}
          {annonce.cave && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">Cave</span>
          )}
        </div>

        {/* Faisabilité message — hidden on mobile */}
        {faisabilite && (
          <div className={`hidden sm:block text-[11px] px-3 py-2 rounded-lg mb-3 font-medium ${
            faisabilite.niveau === 'confortable' ? 'bg-emerald-50 text-emerald-700' :
            faisabilite.niveau === 'limite' ? 'bg-amber-50 text-amber-700' :
            'bg-rose-50 text-rose-700'
          }`}>
            {faisabilite.message}
          </div>
        )}

        {/* Charges — hidden on mobile */}
        {annonce.chargesMensuelles && (
          <p className="hidden sm:block text-[10px] text-aquiz-gray mb-3">
            Charges : {annonce.chargesMensuelles} €/mois
          </p>
        )}

        {/* ── Actions footer ── */}
        <div className="mt-auto pt-1.5 sm:pt-3 border-t border-aquiz-gray-lighter/70 flex items-center gap-1 sm:gap-1.5">
          <Button
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={(e) => { e.stopPropagation(); if (!isDisabled) onSelect?.() }}
            disabled={isDisabled}
            className={`text-[9px] sm:text-[11px] h-6 sm:h-8 rounded-lg flex-1 font-semibold transition-all ${
              isSelected
                ? 'bg-aquiz-green hover:bg-aquiz-green/90 text-white border-0'
                : 'border-aquiz-green/30 text-aquiz-green hover:bg-aquiz-green hover:text-white hover:border-aquiz-green'
            } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {isSelected ? (
              <>
                <Check className="h-3 w-3 sm:mr-1" strokeWidth={3} />
                <span className="hidden sm:inline">Sélectionné</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 sm:mr-1 opacity-50" />
                <span className="hidden sm:inline">Comparer</span>
              </>
            )}
          </Button>

          {annonce.url && (
            <a
              href={annonce.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hidden sm:flex h-7 w-7 rounded-lg items-center justify-center text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest transition-colors shrink-0"
              title="Voir l'annonce"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {/* Menu contextuel "..." — hidden on mobile */}
          <div className="relative hidden sm:block" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Menu actions"
              className="min-w-11 min-h-11 h-7 w-7 rounded-lg flex items-center justify-center text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest transition-colors"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 bottom-full mb-1 z-50 w-36 bg-white rounded-xl border border-aquiz-gray-lighter shadow-lg shadow-black/10 overflow-hidden">
                  {onEdit && (
                    <button
                      onClick={() => { onEdit(); setShowMenu(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      Modifier
                    </button>
                  )}
                  {onToggleFavori && (
                    <button
                      onClick={() => { onToggleFavori(); setShowMenu(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest transition-colors"
                    >
                      <Heart className={`h-3 w-3 ${annonce.favori ? 'fill-rose-500 text-rose-500' : ''}`} />
                      {annonce.favori ? 'Retirer favori' : 'Ajouter favori'}
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={() => { onDuplicate(); setShowMenu(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Dupliquer
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => { onDelete(); setShowMenu(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Supprimer
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
