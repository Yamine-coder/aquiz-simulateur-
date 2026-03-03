'use client'

/**
 * Vue mobile accordéon pour la comparaison des biens
 * Affiche chaque bien dans un accordéon dépliable
 */

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { calculerCoutTotal, calculerMensualite, estimerFraisNotaire } from '@/lib/comparateur/financier'
import { COULEURS_DPE, type Annonce } from '@/types/annonces'
import {
    Building2,
    CreditCard,
    ExternalLink,
    Home,
    Key,
    MapPin,
    Sparkles,
    X,
    Zap
} from 'lucide-react'
import Image from 'next/image'

/** Score Pro result type (subset needed for mobile) */
interface ScoreProResult {
  annonceId: string
  scoreGlobal: number
  verdict: string
  recommandation: string
  conseilPerso: string
  confiance: number
  points: Array<{ texte: string; detail?: string; type: 'avantage' | 'attention' | 'conseil' }>
}

/** Couleur du score */
function getMobileScoreColor(score: number): string {
  if (score >= 75) return 'text-green-600'
  if (score >= 60) return 'text-lime-600'
  if (score >= 45) return 'text-amber-500'
  return 'text-red-500'
}

function getMobileScoreBg(score: number): string {
  if (score >= 75) return 'bg-green-100 border-green-200'
  if (score >= 60) return 'bg-lime-100 border-lime-200'
  if (score >= 45) return 'bg-amber-100 border-amber-200'
  return 'bg-red-100 border-red-200'
}

interface VueMobileAccordeonProps {
  annonces: Annonce[]
  scoresPro?: ScoreProResult[]
  meilleurRapportId?: string
  budgetMax?: number | null
  mensualiteParams?: { tauxInteret: number; dureeAns: number; apport: number }
  onRemove: (id: string) => void
}

// calculerMensualite importé depuis @/lib/comparateur/financier

export function VueMobileAccordeon({
  annonces,
  scoresPro,
  meilleurRapportId,
  mensualiteParams,
  onRemove,
}: VueMobileAccordeonProps) {
  const getScorePro = (id: string) => scoresPro?.find(s => s.annonceId === id)

  return (
    <div className="md:hidden space-y-4">
      <Accordion type="single" collapsible className="space-y-3">
        {annonces.map((annonce) => {
          const isMeilleur = annonce.id === meilleurRapportId
          const IconType = annonce.type === 'maison' ? Home : Building2
          
          return (
            <AccordionItem
              key={annonce.id}
              value={annonce.id}
              className={`rounded-xl overflow-hidden border-2 ${
                isMeilleur 
                  ? 'border-aquiz-green shadow-lg shadow-aquiz-green/10' 
                  : 'border-aquiz-gray-lighter'
              }`}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3 w-full">
                  {/* Image/Icon */}
                  <div className="relative w-14 h-14 rounded-lg bg-aquiz-gray-lightest flex items-center justify-center shrink-0 overflow-hidden">
                    {(annonce.images?.[0] || annonce.imageUrl) ? (
                      <Image src={(annonce.images?.[0] || annonce.imageUrl!).replace(/([?&]rule=ad-)(?:image|thumb|small)/, '$1large')} alt={`Photo du bien ${annonce.titre || 'immobilier'}`} className="w-full h-full object-cover" fill sizes="56px" unoptimized />
                    ) : (
                      <IconType className="w-6 h-6 text-aquiz-gray-light" />
                    )}
                  </div>
                  
                  {/* Infos principales */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${isMeilleur ? 'text-aquiz-green' : 'text-aquiz-black'}`}>
                        {annonce.prix.toLocaleString('fr-FR')} €
                      </span>
                      {isMeilleur && (
                        <Badge className="bg-aquiz-green text-white text-[9px] px-1.5 py-0">
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                          Top
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-aquiz-gray truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{annonce.ville}</span>
                      <span>'¢</span>
                      <span>{annonce.surface} m²</span>
                    </div>
                  </div>
                  
                  {/* Score indicator '” always visible as hook */}
                  {getScorePro(annonce.id) ? (
                    <div className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg border ${getMobileScoreBg(getScorePro(annonce.id)!.scoreGlobal)}`}>
                      <span className={`text-base font-bold ${getMobileScoreColor(getScorePro(annonce.id)!.scoreGlobal)}`}>
                        {getScorePro(annonce.id)!.scoreGlobal}
                      </span>
                      <span className="text-[8px] text-aquiz-gray">/100</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100">
                      <div className="w-8 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-gray-300" style={{ width: '60%' }} />
                      </div>
                      <span className="text-[8px] text-aquiz-gray">Score</span>
                    </div>
                  )}
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  
                  {/* Section Prix & Financement */}
                  <div className="bg-aquiz-gray-lightest/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase mb-2">
                      <CreditCard className="w-3.5 h-3.5" />
                      Prix & Financement
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-aquiz-gray text-xs">Prix</span>
                        <div className="font-medium">{annonce.prix.toLocaleString('fr-FR')} €</div>
                      </div>
                      <div>
                        <span className="text-aquiz-gray text-xs">Prix/m²</span>
                        <div className="font-medium">{annonce.prixM2.toLocaleString('fr-FR')} €</div>
                      </div>
                      {mensualiteParams && (
                        <div className="col-span-2">
                          <span className="text-aquiz-gray text-xs">Mensualité estimée</span>
                          <div className="font-medium text-aquiz-green">
                            {calculerMensualite(
                              annonce.prix,
                              mensualiteParams.apport,
                              mensualiteParams.tauxInteret,
                              mensualiteParams.dureeAns
                            ).toLocaleString('fr-FR')} €/mois
                          </div>
                        </div>
                      )}
                    </div>
                    
                  </div>

                  {/* Frais de notaire + Coût total */}
                  <div className="bg-aquiz-green/5 rounded-lg p-3 border border-aquiz-green/20">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase mb-2">
                      <CreditCard className="w-3.5 h-3.5" />
                      Coût total
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-aquiz-gray text-xs">Frais notaire</span>
                        <div className="font-medium">
                          {(() => {
                            const { montant, isNeuf } = estimerFraisNotaire(annonce.prix, annonce.anneeConstruction)
                            return <>{montant.toLocaleString('fr-FR')} € <span className="text-[10px] text-aquiz-gray">({isNeuf ? 'neuf' : 'ancien'})</span></>
                          })()}
                        </div>
                      </div>
                      <div>
                        <span className="text-aquiz-gray text-xs">Coût total</span>
                        <div className="font-bold text-aquiz-green">
                          {(() => {
                            const { montant: notaire } = estimerFraisNotaire(annonce.prix, annonce.anneeConstruction)
                            const travaux = 0
                            return calculerCoutTotal(annonce.prix, notaire, travaux).toLocaleString('fr-FR')
                          })()} €
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Caractéristiques */}
                  <div className="bg-aquiz-gray-lightest/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase mb-2">
                      <Home className="w-3.5 h-3.5" />
                      Caractéristiques
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <div className="font-medium">{annonce.surface} m²</div>
                        <span className="text-[10px] text-aquiz-gray">Surface</span>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{annonce.pieces}p</div>
                        <span className="text-[10px] text-aquiz-gray">Pièces</span>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{annonce.chambres}ch</div>
                        <span className="text-[10px] text-aquiz-gray">Chambres</span>
                      </div>
                      {annonce.anneeConstruction && (
                        <div className="text-center">
                          <div className="font-medium">{annonce.anneeConstruction}</div>
                          <span className="text-[10px] text-aquiz-gray">Construction</span>
                        </div>
                      )}
                      {annonce.orientation && (
                        <div className="text-center">
                          <div className="font-medium">{annonce.orientation}</div>
                          <span className="text-[10px] text-aquiz-gray">Orientation</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* DPE + Équipements */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-aquiz-gray-lightest/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase mb-2">
                        <Zap className="w-3.5 h-3.5" />
                        Énergie
                      </div>
                      <Badge className={`${COULEURS_DPE[annonce.dpe]} text-white`}>
                        DPE {annonce.dpe}
                      </Badge>
                    </div>
                    <div className="flex-1 bg-aquiz-gray-lightest/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase mb-2">
                        <Key className="w-3.5 h-3.5" />
                        Équipements
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {annonce.balconTerrasse && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">Balcon</Badge>
                        )}
                        {annonce.parking && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">Parking</Badge>
                        )}
                        {annonce.cave && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">Cave</Badge>
                        )}
                        {!annonce.balconTerrasse && !annonce.parking && !annonce.cave && (
                          <span className="text-[10px] text-aquiz-gray">Aucun</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    {annonce.url && (
                      <a
                        href={annonce.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-aquiz-black text-white text-sm font-medium rounded-lg"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Voir l&apos;annonce
                      </a>
                    )}
                    <button
                      onClick={() => onRemove(annonce.id)}
                      className="py-2 px-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
