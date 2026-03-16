'use client'

/**
 * Vue mobile accordéon pour la comparaison des biens
 * Affiche chaque bien dans un accordéon dépliable
 * Parité données avec la vue desktop : DVF, transports, risques
 */

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import type { AnalyseComplete } from '@/lib/api/analyseIntelligente'
import { calculerCoutTotal, calculerMensualite, estimerFraisNotaire } from '@/lib/comparateur/financier'
import { COULEURS_DPE, type Annonce } from '@/types/annonces'
import {
  AlertTriangle,
  Building2,
  CreditCard,
  ExternalLink,
  Home,
  Key,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap
} from 'lucide-react'
import Image from 'next/image'
import { EditableCell } from './EditableCell'
import { LineBadge } from './TransportIcons'

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
  /** @deprecated - use scoresPro to determine best */
  meilleurRapportId?: string
  budgetMax?: number | null
  mensualiteParams?: { tauxInteret: number; dureeAns: number; apport: number }
  /** Enrichment data per annonce (DVF, risques, quartier) */
  getEnrichissement?: (annonceId: string) => AnalyseComplete | null
  onRemove: (id: string) => void
}

// calculerMensualite importé depuis @/lib/comparateur/financier

export function VueMobileAccordeon({
  annonces,
  scoresPro,
  meilleurRapportId,
  mensualiteParams,
  getEnrichissement,
  onRemove,
}: VueMobileAccordeonProps) {
  const getScorePro = (id: string) => scoresPro?.find(s => s.annonceId === id)

  // Recommandé = meilleur Score AQUIZ (pas le meilleur prix/m²)
  const bestScoreId = scoresPro
    ?.filter(s => s.scoreGlobal > 0)
    .sort((a, b) => b.scoreGlobal - a.scoreGlobal)[0]?.annonceId

  return (
    <div className="md:hidden space-y-4">
      <Accordion type="single" collapsible className="space-y-3">
        {annonces.map((annonce) => {
          const isMeilleur = annonce.id === bestScoreId
          const IconType = annonce.type === 'maison' ? Home : Building2
          const enrichi = getEnrichissement?.(annonce.id)
          
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
                      <span>·</span>
                      <span>{annonce.surface} m²</span>
                    </div>
                  </div>
                  
                  {/* Score indicator — always visible as hook */}
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
                      {/* Charges — éditable si manquant */}
                      <div>
                        <span className="text-aquiz-gray text-xs">Charges / mois</span>
                        <div className="font-medium">
                          <EditableCell
                            annonceId={annonce.id}
                            field="chargesMensuelles"
                            fieldType="number"
                            rawValue={annonce.chargesMensuelles}
                            suffix="€/mois"
                            placeholder="Ex: 150"
                          >
                            <span>{annonce.chargesMensuelles != null ? `${annonce.chargesMensuelles} €/mois` : '—'}</span>
                          </EditableCell>
                        </div>
                      </div>
                      {/* Taxe foncière — éditable si manquant */}
                      <div>
                        <span className="text-aquiz-gray text-xs">Taxe foncière / an</span>
                        <div className="font-medium">
                          <EditableCell
                            annonceId={annonce.id}
                            field="taxeFonciere"
                            fieldType="number"
                            rawValue={annonce.taxeFonciere}
                            suffix="€/an"
                            placeholder="Ex: 1200"
                          >
                            <span>{annonce.taxeFonciere != null ? `${annonce.taxeFonciere} €/an` : '—'}</span>
                          </EditableCell>
                        </div>
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
                  
                  {/* DVF — Prix vs Marché */}
                  {enrichi?.marche?.success && enrichi.marche.ecartPrixM2 !== undefined && (
                    <div className="bg-blue-50/80 rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase mb-2">
                        {enrichi.marche.ecartPrixM2 <= 0 ? (
                          <TrendingDown className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                        )}
                        Prix vs Marché (DVF)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-aquiz-gray text-xs">Écart marché</span>
                          <div className={`font-bold ${enrichi.marche.ecartPrixM2 <= 0 ? 'text-green-600' : enrichi.marche.ecartPrixM2 <= 10 ? 'text-amber-500' : 'text-red-500'}`}>
                            {enrichi.marche.ecartPrixM2 > 0 ? '+' : ''}{enrichi.marche.ecartPrixM2.toFixed(1)}%
                          </div>
                        </div>
                        {enrichi.marche.prixM2MedianMarche && (
                          <div>
                            <span className="text-aquiz-gray text-xs">Médiane secteur</span>
                            <div className="font-medium">{Math.round(enrichi.marche.prixM2MedianMarche).toLocaleString('fr-FR')} €/m²</div>
                          </div>
                        )}
                      </div>
                      {enrichi.marche.verdict && (
                        <Badge variant="outline" className={`mt-2 text-[10px] ${
                          enrichi.marche.verdict === 'excellent' || enrichi.marche.verdict === 'bon'
                            ? 'border-green-300 text-green-700'
                            : enrichi.marche.verdict === 'correct'
                            ? 'border-amber-300 text-amber-700'
                            : 'border-red-300 text-red-700'
                        }`}>
                          {enrichi.marche.verdict === 'excellent' ? 'Très bon prix' :
                           enrichi.marche.verdict === 'bon' ? 'Bon prix' :
                           enrichi.marche.verdict === 'correct' ? 'Prix correct' :
                           enrichi.marche.verdict === 'cher' ? 'Au-dessus du marché' : 'Très cher'}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Transports — style Bien'ici épuré */}
                  {enrichi?.quartier?.success && enrichi.quartier.transportSummary && enrichi.quartier.transportSummary.length > 0 && (
                    <div className="rounded-lg p-3">
                      <h4 className="text-sm font-bold text-gray-900 mb-2">
                        Et au niveau des transports ?
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        {enrichi.quartier.transportSummary
                          .filter(tg => ['metro', 'rer', 'train', 'tram', 'bus', 'velib', 'velo'].includes(tg.type))
                          .sort((a, b) => {
                            const order = ['metro', 'rer', 'train', 'tram', 'bus', 'velib', 'velo']
                            return order.indexOf(a.type) - order.indexOf(b.type)
                          })
                          .map(tg => {
                            const typeLabels: Record<string, string> = {
                              metro: 'Métro', rer: 'RER', train: 'Train', tram: 'Tramway',
                              bus: 'Bus', velib: 'Vélib\'', velo: 'Location de vélo',
                            }
                            const label = typeLabels[tg.type] ?? tg.type
                            const isRail = ['metro', 'rer', 'train', 'tram'].includes(tg.type)
                            const isBus = tg.type === 'bus'

                            if (isRail && tg.lignes.length > 0) {
                              return (
                                <div key={tg.type} className="flex items-center gap-1 text-sm">
                                  <span className="text-gray-500">{label}</span>
                                  <span className="text-gray-300">(</span>
                                  {tg.lignes.map((l, j) => (
                                    <LineBadge key={j} ligne={l} typeTransport={tg.type} />
                                  ))}
                                  <span className="text-gray-300">)</span>
                                </div>
                              )
                            }

                            if (isBus && tg.lignes.length > 0) {
                              return (
                                <div key={tg.type} className="flex items-center gap-1 text-sm">
                                  <span className="text-gray-500">Bus</span>
                                  <span className="text-gray-300">(</span>
                                  {tg.lignes.slice(0, 6).map((l, j) => (
                                    <span key={j} className="bg-gray-200 rounded px-1.5 py-0.5 text-xs font-bold text-gray-900">{l}</span>
                                  ))}
                                  {tg.lignes.length > 6 && (
                                    <span className="text-xs text-gray-400">+{tg.lignes.length - 6}</span>
                                  )}
                                  <span className="text-gray-300">)</span>
                                </div>
                              )
                            }

                            // Other types — plain text + count
                            return (
                              <div key={tg.type} className="text-sm">
                                <span className="text-gray-500">{label}</span>
                                <span className="font-bold text-gray-900"> ({tg.count})</span>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {/* Risques naturels */}
                  {enrichi?.risques?.success && (
                    <div className={`rounded-lg p-3 border ${
                      (enrichi.risques.scoreRisque ?? 100) >= 70
                        ? 'bg-green-50/50 border-green-100'
                        : (enrichi.risques.scoreRisque ?? 100) >= 40
                        ? 'bg-amber-50/50 border-amber-100'
                        : 'bg-red-50/50 border-red-100'
                    }`}>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase mb-2">
                        {(enrichi.risques.scoreRisque ?? 100) >= 60 ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        Risques ({enrichi.risques.scoreRisque ?? '?'}/100)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {enrichi.risques.zoneInondable && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-300 text-blue-700">
                            Inondation
                          </Badge>
                        )}
                        {enrichi.risques.niveauRadon !== undefined && enrichi.risques.niveauRadon >= 2 && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-700">
                            Radon {enrichi.risques.niveauRadon}/3
                          </Badge>
                        )}
                        {enrichi.risques.verdict && (
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                            enrichi.risques.verdict === 'sûr' ? 'border-green-300 text-green-700' :
                            enrichi.risques.verdict === 'vigilance' ? 'border-amber-300 text-amber-700' :
                            'border-red-300 text-red-700'
                          }`}>
                            {enrichi.risques.verdict === 'sûr' ? 'Zone sûre' :
                             enrichi.risques.verdict === 'vigilance' ? 'Vigilance' : 'Risqué'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

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
                      {/* Année — éditable */}
                      <div className="text-center">
                        <div className="font-medium">
                          <EditableCell
                            annonceId={annonce.id}
                            field="anneeConstruction"
                            fieldType="number"
                            rawValue={annonce.anneeConstruction}
                            placeholder="Ex: 1985"
                          >
                            <span>{annonce.anneeConstruction}</span>
                          </EditableCell>
                        </div>
                        <span className="text-[10px] text-aquiz-gray">Construction</span>
                      </div>
                      {/* Orientation — éditable */}
                      <div className="text-center">
                        <div className="font-medium">
                          <EditableCell
                            annonceId={annonce.id}
                            field="orientation"
                            fieldType="orientation"
                            rawValue={annonce.orientation}
                          >
                            <span>{annonce.orientation}</span>
                          </EditableCell>
                        </div>
                        <span className="text-[10px] text-aquiz-gray">Orientation</span>
                      </div>
                      {/* Étage — éditable */}
                      {annonce.type === 'appartement' && (
                        <div className="text-center">
                          <div className="font-medium">
                            <EditableCell
                              annonceId={annonce.id}
                              field="etage"
                              fieldType="number"
                              rawValue={annonce.etage}
                              placeholder="Ex: 3"
                            >
                              <span>{annonce.etage === 0 ? 'RDC' : `${annonce.etage}e`}</span>
                            </EditableCell>
                          </div>
                          <span className="text-[10px] text-aquiz-gray">Étage</span>
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
                      <div className="flex gap-1.5">
                        <EditableCell
                          annonceId={annonce.id}
                          field="dpe"
                          fieldType="dpe"
                          rawValue={annonce.dpe}
                        >
                          <Badge className={`${COULEURS_DPE[annonce.dpe]} text-white`}>
                            DPE {annonce.dpe}
                          </Badge>
                        </EditableCell>
                        <EditableCell
                          annonceId={annonce.id}
                          field="ges"
                          fieldType="dpe"
                          rawValue={annonce.ges}
                        >
                          <Badge variant="outline" className="text-xs">
                            GES {annonce.ges || '?'}
                          </Badge>
                        </EditableCell>
                      </div>
                    </div>
                    <div className="flex-1 bg-aquiz-gray-lightest/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase mb-2">
                        <Key className="w-3.5 h-3.5" />
                        Équipements
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <EditableCell
                          annonceId={annonce.id}
                          field="balconTerrasse"
                          fieldType="boolean"
                          rawValue={annonce.balconTerrasse}
                        >
                          <Badge variant={annonce.balconTerrasse ? 'default' : 'outline'} className={`text-[9px] px-1.5 py-0 ${annonce.balconTerrasse ? '' : 'opacity-50'}`}>
                            Balcon {annonce.balconTerrasse ? '✓' : '✗'}
                          </Badge>
                        </EditableCell>
                        <EditableCell
                          annonceId={annonce.id}
                          field="parking"
                          fieldType="boolean"
                          rawValue={annonce.parking}
                        >
                          <Badge variant={annonce.parking ? 'default' : 'outline'} className={`text-[9px] px-1.5 py-0 ${annonce.parking ? '' : 'opacity-50'}`}>
                            Parking {annonce.parking ? '✓' : '✗'}
                          </Badge>
                        </EditableCell>
                        <EditableCell
                          annonceId={annonce.id}
                          field="cave"
                          fieldType="boolean"
                          rawValue={annonce.cave}
                        >
                          <Badge variant={annonce.cave ? 'default' : 'outline'} className={`text-[9px] px-1.5 py-0 ${annonce.cave ? '' : 'opacity-50'}`}>
                            Cave {annonce.cave ? '✓' : '✗'}
                          </Badge>
                        </EditableCell>
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
