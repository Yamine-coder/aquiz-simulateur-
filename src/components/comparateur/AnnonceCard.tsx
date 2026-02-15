'use client'

/**
 * Carte d'annonce immobilière
 * Affiche les infos essentielles d'un bien avec actions
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { AnalyseFaisabilite, Annonce } from '@/types/annonces'
import { LABELS_SOURCES } from '@/types/annonces'
import {
    Building2,
    Check,
    ExternalLink,
    Heart,
    Home,
    MapPin,
    Pencil,
    Trash2
} from 'lucide-react'

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
  
  // Couleur de bordure selon faisabilité
  const borderColor = faisabilite
    ? faisabilite.niveau === 'confortable'
      ? 'border-green-400'
      : faisabilite.niveau === 'limite'
        ? 'border-amber-400'
        : 'border-red-400'
    : isSelected
      ? 'border-aquiz-green'
      : 'border-aquiz-gray-100'
  
  return (
    <Card className={`
      relative overflow-hidden transition-all duration-200 bg-white
      ${isSelected ? 'ring-2 ring-aquiz-green shadow-lg' : 'border border-aquiz-gray-lighter hover:shadow-md hover:border-aquiz-gray-light'}
    `}>
      {/* Badge de sélection - Design AQUIZ */}
      {isSelected && (
        <div className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-aquiz-green flex items-center justify-center shadow-sm">
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        </div>
      )}
      
      {/* Badge favori */}
      {annonce.favori && (
        <div className="absolute top-3 right-3 z-10">
          <Heart className="h-5 w-5 fill-rose-500 text-rose-500 drop-shadow-sm" />
        </div>
      )}
      
      {/* Image ou placeholder - Design AQUIZ */}
      <div 
        className="relative h-44 bg-gradient-to-br from-aquiz-gray-lightest to-white flex items-center justify-center cursor-pointer group"
        onClick={onSelect}
      >
        {annonce.imageUrl ? (
          <img 
            src={annonce.imageUrl} 
            alt={annonce.titre || 'Bien immobilier'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <IconType className="h-12 w-12 text-aquiz-gray-light" />
            <span className="text-xs text-aquiz-gray">Pas d&apos;image</span>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Badge source - Plus discret */}
        <span className="absolute bottom-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/90 text-aquiz-black backdrop-blur-sm">
          {LABELS_SOURCES[annonce.source]}
        </span>
        
        {/* Badge faisabilité - Design AQUIZ */}
        {faisabilite && (
          <span 
            className={`absolute bottom-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm ${
              faisabilite.niveau === 'confortable'
                ? 'bg-aquiz-green/90 text-white'
                : faisabilite.niveau === 'limite'
                  ? 'bg-amber-500/90 text-white'
                  : 'bg-rose-500/90 text-white'
            }`}
          >
            {faisabilite.niveau === 'confortable' && 'Dans budget'}
            {faisabilite.niveau === 'limite' && 'Limite'}
            {faisabilite.niveau === 'impossible' && 'Hors budget'}
          </span>
        )}
      </div>
      
      <CardContent className="p-4">
        {/* Prix - Design AQUIZ */}
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xl font-semibold text-aquiz-black">
            {annonce.prix.toLocaleString('fr-FR')} <span className="text-base font-normal">€</span>
          </span>
          <span className="text-xs text-aquiz-gray font-medium">
            {annonce.prixM2.toLocaleString('fr-FR')} €/m²
          </span>
        </div>
        
        {/* Infos principales - Plus compact */}
        <div className="flex items-center gap-3 text-sm text-aquiz-gray mb-3">
          <span className="font-medium text-aquiz-black">{annonce.surface} m²</span>
          <span className="text-aquiz-gray-light">•</span>
          <span>{annonce.pieces}p</span>
          {annonce.chambres > 0 && (
            <>
              <span className="text-aquiz-gray-light">•</span>
              <span>{annonce.chambres} ch.</span>
            </>
          )}
        </div>
        
        {/* Localisation */}
        <div className="flex items-center gap-1.5 text-sm text-aquiz-gray mb-3">
          <MapPin className="h-3.5 w-3.5" />
          <span>{annonce.ville}</span>
          <span className="text-aquiz-gray-light">({annonce.codePostal})</span>
        </div>
        
        {/* Tags - Design AQUIZ */}
        {!compact && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {/* DPE - Design sobre */}
            <span 
              className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${
                annonce.dpe === 'A' || annonce.dpe === 'B' ? 'bg-aquiz-green/10 text-aquiz-green' :
                annonce.dpe === 'C' || annonce.dpe === 'D' ? 'bg-amber-100 text-amber-700' :
                annonce.dpe === 'NC' ? 'bg-aquiz-gray-lightest text-aquiz-gray' :
                'bg-rose-100 text-rose-700'
              }`}
            >
              DPE {annonce.dpe}
            </span>
            
            {annonce.etage !== undefined && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-aquiz-gray-lightest text-aquiz-gray">
                {annonce.etage === 0 ? 'RDC' : `${annonce.etage}e ét.`}
              </span>
            )}
            
            {annonce.parking && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-aquiz-gray-lightest text-aquiz-gray">
                Parking
              </span>
            )}
            
            {annonce.balconTerrasse && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-aquiz-gray-lightest text-aquiz-gray">
                Extérieur
              </span>
            )}
            
            {annonce.ascenseur && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-aquiz-gray-lightest text-aquiz-gray">
                Ascenseur
              </span>
            )}
          </div>
        )}
        
        {/* Charges si présentes */}
        {annonce.chargesMensuelles && !compact && (
          <div className="text-xs text-aquiz-gray mb-3">
            Charges : {annonce.chargesMensuelles} €/mois
          </div>
        )}
        
        {/* Message faisabilité - Design AQUIZ */}
        {faisabilite && !compact && (
          <div className={`text-xs px-2.5 py-1.5 rounded-lg mb-3 ${
            faisabilite.niveau === 'confortable'
              ? 'bg-aquiz-green/10 text-aquiz-green'
              : faisabilite.niveau === 'limite'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-rose-50 text-rose-600'
          }`}>
            {faisabilite.message}
          </div>
        )}
        
        {/* Actions - Design AQUIZ */}
        <div className="flex items-center gap-1 pt-3 border-t border-aquiz-gray-lighter">
          {onSelect && (
            <Button
              variant={isSelected ? 'default' : 'ghost'}
              size="sm"
              onClick={onSelect}
              disabled={selectionDisabled && !isSelected}
              className={`text-xs h-8 ${isSelected ? 'bg-aquiz-green hover:bg-aquiz-green/90' : 'text-aquiz-gray hover:text-aquiz-black'}`}
            >
              {isSelected ? 'Sélectionné' : 'Comparer'}
            </Button>
          )}
          
          <div className="flex-1" />
          
          {annonce.url && (
            <a 
              href={annonce.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-aquiz-gray-lightest text-aquiz-gray hover:text-aquiz-black transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          
          {onToggleFavori && (
            <button
              onClick={onToggleFavori}
              className={`p-1.5 rounded-lg transition-colors ${annonce.favori ? 'text-rose-500' : 'text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest'}`}
            >
              <Heart className={`h-3.5 w-3.5 ${annonce.favori ? 'fill-current' : ''}`} />
            </button>
          )}
          
          {onEdit && (
            <button 
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-aquiz-gray-lightest text-aquiz-gray hover:text-aquiz-black transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          
          {onDelete && (
            <button 
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-rose-50 text-aquiz-gray hover:text-rose-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
