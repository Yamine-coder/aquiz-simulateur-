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
    ExternalLink,
    Heart,
    Home,
    MapPin,
    MoreHorizontal,
    Pencil,
    Ruler,
    Trash2
} from 'lucide-react'
import { useRef, useState } from 'react'

interface AnnonceCardProps {
  annonce: Annonce
  isSelected?: boolean
  selectionDisabled?: boolean
  faisabilite?: AnalyseFaisabilite
  onSelect?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onToggleFavori?: () => void
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
  onToggleFavori,
  compact = false
}: AnnonceCardProps) {
  const IconType = annonce.type === 'maison' ? Home : Building2
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // ─── VUE LISTE (compact) ───
  if (compact) {
    return (
      <div
        className={`
          group relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer
          ${isSelected
            ? 'bg-aquiz-green/5 ring-1 ring-aquiz-green/30'
            : 'bg-white hover:bg-aquiz-gray-lightest/50 border border-aquiz-gray-lighter hover:border-aquiz-gray-light'
          }
        `}
        onClick={onSelect}
      >
        {/* Thumbnail ou icône */}
        <div className="relative w-16 h-16 rounded-lg bg-aquiz-gray-lightest shrink-0 overflow-hidden">
          {annonce.imageUrl ? (
            <img src={annonce.imageUrl} alt={annonce.titre || 'Bien immobilier'} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <IconType className="h-6 w-6 text-aquiz-gray-light" />
            </div>
          )}
          {isSelected && (
            <div className="absolute inset-0 bg-aquiz-green/20 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-aquiz-green flex items-center justify-center">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
            </div>
          )}
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

  // ─── VUE GRILLE (card) ───
  return (
    <div
      className={`
        group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200
        ${isSelected
          ? 'ring-2 ring-aquiz-green shadow-md shadow-aquiz-green/10'
          : 'border border-aquiz-gray-lighter hover:border-aquiz-gray-light hover:shadow-lg hover:shadow-black/5'
        }
      `}
    >
      {/* ── Image zone ── */}
      <div
        className="relative h-40 bg-gradient-to-br from-slate-50 to-slate-100 cursor-pointer overflow-hidden"
        onClick={onSelect}
      >
        {annonce.imageUrl ? (
          <img
            src={annonce.imageUrl}
            alt={annonce.titre || 'Bien immobilier'}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
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
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {/* Selection checkbox top-left */}
        <button
          onClick={(e) => { e.stopPropagation(); onSelect?.() }}
          disabled={selectionDisabled && !isSelected}
          className={`
            absolute top-2.5 left-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200
            ${isSelected
              ? 'bg-aquiz-green shadow-sm'
              : 'bg-white/80 backdrop-blur-sm border border-white/50 opacity-0 group-hover:opacity-100 hover:bg-white'
            }
            ${selectionDisabled && !isSelected ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {isSelected ? (
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          ) : (
            <span className="w-2 h-2 rounded-full border-2 border-aquiz-gray-light" />
          )}
        </button>

        {/* Favori top-right */}
        {onToggleFavori && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavori() }}
            className={`
              absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all
              ${annonce.favori
                ? 'bg-rose-500 shadow-sm'
                : 'bg-white/80 backdrop-blur-sm border border-white/50 opacity-0 group-hover:opacity-100 hover:bg-white'
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
      <div className="flex flex-col flex-1 p-4">
        {/* Prix */}
        <div className="flex items-baseline justify-between mb-2.5">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-aquiz-black tracking-tight">
              {annonce.prix.toLocaleString('fr-FR')}
            </span>
            <span className="text-sm font-medium text-aquiz-gray">€</span>
          </div>
          <span className="text-[11px] font-semibold text-aquiz-gray bg-aquiz-gray-lightest px-2 py-0.5 rounded-md">
            {annonce.prixM2.toLocaleString('fr-FR')} €/m²
          </span>
        </div>

        {/* Métriques — ligne d'icônes */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            <Ruler className="h-3 w-3 text-aquiz-gray-light" />
            <span className="text-xs font-semibold text-aquiz-black">{annonce.surface} m²</span>
          </div>
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3 text-aquiz-gray-light" />
            <span className="text-xs text-aquiz-gray">{annonce.pieces} pièces</span>
          </div>
          {annonce.chambres > 0 && (
            <div className="flex items-center gap-1">
              <BedDouble className="h-3 w-3 text-aquiz-gray-light" />
              <span className="text-xs text-aquiz-gray">{annonce.chambres} ch.</span>
            </div>
          )}
        </div>

        {/* Localisation */}
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin className="h-3 w-3 text-aquiz-gray-light shrink-0" />
          <span className="text-xs text-aquiz-gray truncate">
            {annonce.adresse || annonce.ville}
          </span>
          <span className="text-[10px] text-aquiz-gray-light shrink-0">({annonce.codePostal})</span>
        </div>

        {/* Tags/Features — pills compacts */}
        <div className="flex flex-wrap gap-1.5 mb-3">
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

        {/* Faisabilité message */}
        {faisabilite && (
          <div className={`text-[11px] px-3 py-2 rounded-lg mb-3 font-medium ${
            faisabilite.niveau === 'confortable' ? 'bg-emerald-50 text-emerald-700' :
            faisabilite.niveau === 'limite' ? 'bg-amber-50 text-amber-700' :
            'bg-rose-50 text-rose-700'
          }`}>
            {faisabilite.message}
          </div>
        )}

        {/* Charges */}
        {annonce.chargesMensuelles && (
          <p className="text-[10px] text-aquiz-gray mb-3">
            Charges : {annonce.chargesMensuelles} €/mois
          </p>
        )}

        {/* ── Actions footer ── */}
        <div className="mt-auto pt-3 border-t border-aquiz-gray-lighter/70 flex items-center gap-1.5">
          <Button
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={onSelect}
            disabled={selectionDisabled && !isSelected}
            className={`text-[11px] h-7 rounded-lg flex-1 font-semibold transition-all ${
              isSelected
                ? 'bg-aquiz-green hover:bg-aquiz-green/90 text-white border-0'
                : 'border-aquiz-gray-lighter text-aquiz-gray hover:text-aquiz-black hover:border-aquiz-gray-light'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="h-3 w-3 mr-1" strokeWidth={3} />
                Sélectionné
              </>
            ) : 'Comparer'}
          </Button>

          {annonce.url && (
            <a
              href={annonce.url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 w-7 rounded-lg flex items-center justify-center text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest transition-colors shrink-0"
              title="Voir l'annonce"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {/* Menu contextuel "..." */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest transition-colors"
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
