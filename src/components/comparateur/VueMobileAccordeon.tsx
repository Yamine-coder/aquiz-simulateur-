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
    ExternalLink,
    GraduationCap,
    HeartPulse,
    Home,
    MapPin,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Train,
    TreePine,
    TrendingDown,
    TrendingUp,
    X
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
  if (score >= 75) return 'bg-green-50 border-green-200'
  if (score >= 60) return 'bg-lime-50 border-lime-200'
  if (score >= 45) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

function getMobileScoreRing(score: number): string {
  if (score >= 75) return 'ring-green-400'
  if (score >= 60) return 'ring-lime-400'
  if (score >= 45) return 'ring-amber-400'
  return 'ring-red-400'
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

export function VueMobileAccordeon({
  annonces,
  scoresPro,
  mensualiteParams,
  getEnrichissement,
  onRemove,
}: VueMobileAccordeonProps) {
  const getScorePro = (id: string) => scoresPro?.find(s => s.annonceId === id)

  // Recommandé = meilleur Score AQUIZ
  const bestScoreId = scoresPro
    ?.filter(s => s.scoreGlobal > 0)
    .sort((a, b) => b.scoreGlobal - a.scoreGlobal)[0]?.annonceId

  return (
    <div className="md:hidden">
      <Accordion type="single" collapsible className="space-y-3">
        {annonces.map((annonce) => {
          const isMeilleur = annonce.id === bestScoreId
          const IconType = annonce.type === 'maison' ? Home : Building2
          const enrichi = getEnrichissement?.(annonce.id)
          const scorePro = getScorePro(annonce.id)
          
          return (
            <AccordionItem
              key={annonce.id}
              value={annonce.id}
              className={`rounded-2xl bg-white transition-shadow ${
                isMeilleur 
                  ? 'border-2 border-aquiz-green shadow-lg shadow-aquiz-green/8' 
                  : 'border border-aquiz-gray-lighter shadow-sm'
              }`}
            >
              {/* ═══ TRIGGER — Carte résumé ═══ */}
              <AccordionTrigger className="px-3 py-3 hover:no-underline data-[state=open]:bg-aquiz-gray-lightest/30">
                {/* Grid 3-col : photo(56px) | infos(1fr) | score(40px) — chevron géré par shadcn à droite */}
                <div className="grid grid-cols-[56px_1fr_40px] items-center gap-2 flex-1 min-w-0">
                  {/* Photo */}
                  <div className="relative w-14 h-14 rounded-xl bg-aquiz-gray-lightest flex items-center justify-center overflow-hidden">
                    {(annonce.images?.[0] || annonce.imageUrl) ? (
                      <Image 
                        src={(annonce.images?.[0] || annonce.imageUrl!).replace(/([?&]rule=ad-)(?:image|thumb|small)/, '$1large')} 
                        alt={`Photo ${annonce.titre || 'bien immobilier'}`} 
                        className="w-full h-full object-cover" 
                        fill 
                        sizes="64px" 
                        unoptimized 
                      />
                    ) : (
                      <IconType className="w-6 h-6 text-aquiz-gray-light" />
                    )}
                    {isMeilleur && (
                      <div className="absolute top-0 left-0 right-0 bg-aquiz-green/90 text-white text-[8px] font-bold text-center py-0.5 flex items-center justify-center gap-0.5">
                        <Sparkles className="w-2 h-2" />
                        TOP
                      </div>
                    )}
                  </div>
                  
                  {/* Infos */}
                  <div className="min-w-0 text-left">
                    <span className={`text-[15px] font-bold tracking-tight ${isMeilleur ? 'text-aquiz-green' : 'text-aquiz-black'}`}>
                      {annonce.prix.toLocaleString('fr-FR')} €
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-aquiz-gray mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0 text-aquiz-gray-light" />
                      <span className="truncate">{annonce.ville}</span>
                      <span className="text-aquiz-gray-light">·</span>
                      <span className="font-medium text-aquiz-black shrink-0">{annonce.surface} m²</span>
                    </div>
                    {/* Mini tags — DPE + pièces */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        annonce.dpe === 'A' || annonce.dpe === 'B' ? 'bg-emerald-100 text-emerald-700' :
                        annonce.dpe === 'C' || annonce.dpe === 'D' ? 'bg-amber-100 text-amber-700' :
                        annonce.dpe === 'NC' ? 'bg-gray-100 text-gray-500' :
                        'bg-rose-100 text-rose-700'
                      }`}>DPE {annonce.dpe}</span>
                      <span className="text-[10px] text-aquiz-gray">{annonce.pieces}p · {annonce.chambres}ch</span>
                    </div>
                  </div>
                  
                  {/* Score — colonne 40px fixe, jamais coupée */}
                  {scorePro ? (
                    <div className={`flex flex-col items-center justify-center w-full py-2 rounded-xl border ${getMobileScoreBg(scorePro.scoreGlobal)} ring-1 ${getMobileScoreRing(scorePro.scoreGlobal)}`}>
                      <span className={`text-[15px] font-extrabold leading-none ${getMobileScoreColor(scorePro.scoreGlobal)}`}>
                        {scorePro.scoreGlobal}
                      </span>
                      <span className="text-[7px] text-aquiz-gray mt-0.5">/100</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 w-full py-2 rounded-xl bg-gray-50">
                      <div className="w-6 h-1.5 rounded-full bg-gray-200 overflow-hidden animate-pulse">
                        <div className="h-full rounded-full bg-gray-300" style={{ width: '60%' }} />
                      </div>
                      <span className="text-[7px] text-aquiz-gray">Score</span>
                    </div>
                  )}
                </div>
              </AccordionTrigger>
              
              {/* ═══ CONTENU DÉPLIÉ ═══ */}
              <AccordionContent className="px-3.5 pb-4">
                <div className="space-y-3 pt-1">

                  {/* ── Verdict Score AQUIZ ── */}
                  {scorePro && (
                    <div className={`rounded-xl p-3 border ${getMobileScoreBg(scorePro.scoreGlobal)}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          scorePro.scoreGlobal >= 60 ? 'bg-green-500' : scorePro.scoreGlobal >= 45 ? 'bg-amber-500' : 'bg-red-500'
                        }`}>
                          <span className="text-white text-sm font-bold">{scorePro.scoreGlobal}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-aquiz-black">{scorePro.verdict}</div>
                          <div className="text-[10px] text-aquiz-gray leading-snug truncate">{scorePro.recommandation}</div>
                        </div>
                      </div>
                      {/* Points clés — 2 max */}
                      {scorePro.points.length > 0 && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-current/10">
                          {scorePro.points.slice(0, 3).map((p, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className={`shrink-0 mt-0.5 text-[10px] ${
                                p.type === 'avantage' ? 'text-green-500' : p.type === 'attention' ? 'text-amber-500' : 'text-blue-500'
                              }`}>
                                {p.type === 'avantage' ? '✓' : p.type === 'attention' ? '!' : '→'}
                              </span>
                              <span className="text-[11px] text-aquiz-black leading-snug">{p.texte}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* ── Prix & Financement ── */}
                  <div className="rounded-xl bg-white border border-aquiz-gray-lighter p-3">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-aquiz-gray font-medium">Prix</span>
                        <div className="text-sm font-bold text-aquiz-black mt-0.5">{annonce.prix.toLocaleString('fr-FR')} €</div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-aquiz-gray font-medium">Prix/m²</span>
                        <div className="text-sm font-bold text-aquiz-black mt-0.5">{annonce.prixM2.toLocaleString('fr-FR')} €</div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-aquiz-gray font-medium">Charges / mois</span>
                        <div className="mt-0.5">
                          <EditableCell annonceId={annonce.id} field="chargesMensuelles" fieldType="number" rawValue={annonce.chargesMensuelles} suffix="€/mois" placeholder="Ex: 150">
                            <span className="text-sm font-medium">{annonce.chargesMensuelles != null ? `${annonce.chargesMensuelles} €/mois` : <span className="text-aquiz-gray-light text-xs">+ Ajouter</span>}</span>
                          </EditableCell>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-aquiz-gray font-medium">Taxe foncière</span>
                        <div className="mt-0.5">
                          <EditableCell annonceId={annonce.id} field="taxeFonciere" fieldType="number" rawValue={annonce.taxeFonciere} suffix="€/an" placeholder="Ex: 1200">
                            <span className="text-sm font-medium">{annonce.taxeFonciere != null ? `${annonce.taxeFonciere} €/an` : <span className="text-aquiz-gray-light text-xs">+ Ajouter</span>}</span>
                          </EditableCell>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mensualité + Coût total */}
                    <div className="mt-3 pt-3 border-t border-aquiz-gray-lighter grid grid-cols-2 gap-x-4">
                      {mensualiteParams && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wide text-aquiz-gray font-medium">Mensualité</span>
                          <div className="text-sm font-bold text-aquiz-green">
                            {calculerMensualite(annonce.prix, mensualiteParams.apport, mensualiteParams.tauxInteret, mensualiteParams.dureeAns).toLocaleString('fr-FR')} €/mois
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-aquiz-gray font-medium">Coût total</span>
                        <div className="text-sm font-bold text-aquiz-black">
                          {(() => {
                            const { montant: notaire } = estimerFraisNotaire(annonce.prix, annonce.anneeConstruction)
                            return calculerCoutTotal(annonce.prix, notaire, 0).toLocaleString('fr-FR')
                          })()} €
                        </div>
                        <span className="text-[9px] text-aquiz-gray">
                          dont {(() => {
                            const { montant, isNeuf } = estimerFraisNotaire(annonce.prix, annonce.anneeConstruction)
                            return `${montant.toLocaleString('fr-FR')} € notaire (${isNeuf ? 'neuf' : 'ancien'})`
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* ── DVF — Prix vs Marché ── */}
                  {enrichi?.marche?.success && enrichi.marche.ecartPrixM2 !== undefined && (
                    <div className={`rounded-xl p-3 border ${
                      enrichi.marche.ecartPrixM2 <= 0 ? 'bg-green-50/60 border-green-200' :
                      enrichi.marche.ecartPrixM2 <= 10 ? 'bg-amber-50/60 border-amber-200' :
                      'bg-red-50/60 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          enrichi.marche.ecartPrixM2 <= 0 ? 'bg-green-500' : enrichi.marche.ecartPrixM2 <= 10 ? 'bg-amber-500' : 'bg-red-500'
                        }`}>
                          {enrichi.marche.ecartPrixM2 <= 0 ? <TrendingDown className="w-3.5 h-3.5 text-white" /> : <TrendingUp className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-aquiz-black">Prix vs Marché</div>
                          <div className="text-[10px] text-aquiz-gray">Données DVF</div>
                        </div>
                        <div className="ml-auto text-right">
                          <div className={`text-base font-extrabold ${
                            enrichi.marche.ecartPrixM2 <= 0 ? 'text-green-600' : enrichi.marche.ecartPrixM2 <= 10 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {enrichi.marche.ecartPrixM2 > 0 ? '+' : ''}{enrichi.marche.ecartPrixM2.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        {enrichi.marche.prixM2MedianMarche && (
                          <span className="text-aquiz-gray">Médiane : <span className="font-semibold text-aquiz-black">{Math.round(enrichi.marche.prixM2MedianMarche).toLocaleString('fr-FR')} €/m²</span></span>
                        )}
                        {enrichi.marche.verdict && (
                          <Badge variant="outline" className={`text-[9px] ml-auto ${
                            enrichi.marche.verdict === 'excellent' || enrichi.marche.verdict === 'bon'
                              ? 'border-green-300 text-green-700 bg-green-50'
                              : enrichi.marche.verdict === 'correct'
                              ? 'border-amber-300 text-amber-700 bg-amber-50'
                              : 'border-red-300 text-red-700 bg-red-50'
                          }`}>
                            {enrichi.marche.verdict === 'excellent' ? 'Très bon prix' :
                             enrichi.marche.verdict === 'bon' ? 'Bon prix' :
                             enrichi.marche.verdict === 'correct' ? 'Prix correct' :
                             enrichi.marche.verdict === 'cher' ? 'Au-dessus' : 'Très cher'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Transports ── */}
                  {enrichi?.quartier?.success && enrichi.quartier.transportSummary && enrichi.quartier.transportSummary.length > 0 && (
                    <div className="rounded-xl bg-white border border-aquiz-gray-lighter p-3">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Train className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span className="text-xs font-bold text-aquiz-black">Transports à proximité</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        {enrichi.quartier.transportSummary
                          .filter(tg => ['metro', 'rer', 'train', 'tram', 'bus', 'velib', 'velo'].includes(tg.type))
                          .sort((a, b) => {
                            const order = ['metro', 'rer', 'train', 'tram', 'bus', 'velib', 'velo']
                            return order.indexOf(a.type) - order.indexOf(b.type)
                          })
                          .map(tg => {
                            const typeLabels: Record<string, string> = {
                              metro: 'Métro', rer: 'RER', train: 'Train', tram: 'Tramway',
                              bus: 'Bus', velib: 'Vélib\'', velo: 'Vélo',
                            }
                            const label = typeLabels[tg.type] ?? tg.type
                            const isRail = ['metro', 'rer', 'train', 'tram'].includes(tg.type)
                            const isBus = tg.type === 'bus'

                            if (isRail && tg.lignes.length > 0) {
                              return (
                                <div key={tg.type} className="flex items-center gap-1 text-[11px]">
                                  <span className="text-aquiz-gray font-medium">{label}</span>
                                  {tg.lignes.map((l, j) => (
                                    <LineBadge key={j} ligne={l} typeTransport={tg.type} />
                                  ))}
                                </div>
                              )
                            }

                            if (isBus && tg.lignes.length > 0) {
                              return (
                                <div key={tg.type} className="flex items-center gap-1 text-[11px]">
                                  <span className="text-aquiz-gray font-medium">Bus</span>
                                  {tg.lignes.slice(0, 5).map((l, j) => (
                                    <span key={j} className="bg-gray-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-800">{l}</span>
                                  ))}
                                  {tg.lignes.length > 5 && (
                                    <span className="text-[10px] text-aquiz-gray">+{tg.lignes.length - 5}</span>
                                  )}
                                </div>
                              )
                            }

                            return (
                              <div key={tg.type} className="text-[11px]">
                                <span className="text-aquiz-gray font-medium">{label}</span>
                                <span className="font-bold text-aquiz-black ml-0.5">({tg.count})</span>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {/* ── Quartier & Services ── */}
                  {enrichi?.quartier?.success && (enrichi.quartier.commerces !== undefined || enrichi.quartier.sante !== undefined) && (
                    <div className="rounded-xl bg-white border border-aquiz-gray-lighter p-3">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-aquiz-green/10 flex items-center justify-center">
                            <MapPin className="w-3.5 h-3.5 text-aquiz-green" />
                          </div>
                          <span className="text-xs font-bold text-aquiz-black">Quartier</span>
                        </div>
                        {enrichi.quartier.scoreQuartier !== undefined && (
                          <span className={`text-sm font-extrabold ${
                            enrichi.quartier.scoreQuartier >= 75 ? 'text-aquiz-green' :
                            enrichi.quartier.scoreQuartier >= 55 ? 'text-aquiz-green/70' :
                            enrichi.quartier.scoreQuartier >= 35 ? 'text-amber-500' : 'text-red-500'
                          }`}>
                            {enrichi.quartier.scoreQuartier}<span className="text-[10px] text-aquiz-gray font-normal">/100</span>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {enrichi.quartier.commerces !== undefined && (
                          <div className="flex items-center gap-1.5 bg-aquiz-gray-lightest/50 rounded-lg px-2 py-1.5">
                            <ShoppingBag className="w-3 h-3 text-aquiz-gray shrink-0" />
                            <div>
                              <div className="text-[10px] text-aquiz-gray">Commerces</div>
                              <div className={`text-xs font-bold ${enrichi.quartier.commerces >= 60 ? 'text-aquiz-green' : enrichi.quartier.commerces >= 35 ? 'text-amber-500' : 'text-red-500'}`}>{enrichi.quartier.commerces}/100</div>
                            </div>
                          </div>
                        )}
                        {enrichi.quartier.ecoles !== undefined && (
                          <div className="flex items-center gap-1.5 bg-aquiz-gray-lightest/50 rounded-lg px-2 py-1.5">
                            <GraduationCap className="w-3 h-3 text-aquiz-gray shrink-0" />
                            <div>
                              <div className="text-[10px] text-aquiz-gray">Écoles</div>
                              <div className={`text-xs font-bold ${enrichi.quartier.ecoles >= 60 ? 'text-aquiz-green' : enrichi.quartier.ecoles >= 35 ? 'text-amber-500' : 'text-red-500'}`}>{enrichi.quartier.ecoles}/100</div>
                            </div>
                          </div>
                        )}
                        {enrichi.quartier.sante !== undefined && (
                          <div className="flex items-center gap-1.5 bg-aquiz-gray-lightest/50 rounded-lg px-2 py-1.5">
                            <HeartPulse className="w-3 h-3 text-aquiz-gray shrink-0" />
                            <div>
                              <div className="text-[10px] text-aquiz-gray">Santé</div>
                              <div className={`text-xs font-bold ${enrichi.quartier.sante >= 60 ? 'text-aquiz-green' : enrichi.quartier.sante >= 35 ? 'text-amber-500' : 'text-red-500'}`}>{enrichi.quartier.sante}/100</div>
                            </div>
                          </div>
                        )}
                        {enrichi.quartier.espaceVerts !== undefined && (
                          <div className="flex items-center gap-1.5 bg-aquiz-gray-lightest/50 rounded-lg px-2 py-1.5">
                            <TreePine className="w-3 h-3 text-aquiz-green shrink-0" />
                            <div>
                              <div className="text-[10px] text-aquiz-gray">Espaces verts</div>
                              <div className={`text-xs font-bold ${enrichi.quartier.espaceVerts >= 60 ? 'text-aquiz-green' : enrichi.quartier.espaceVerts >= 35 ? 'text-amber-500' : 'text-red-500'}`}>{enrichi.quartier.espaceVerts}/100</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Risques naturels ── */}
                  {enrichi?.risques?.success && (
                    <div className={`rounded-xl p-3 border ${
                      (enrichi.risques.scoreRisque ?? 100) >= 70
                        ? 'bg-green-50/40 border-green-200'
                        : (enrichi.risques.scoreRisque ?? 100) >= 40
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-red-50/40 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          (enrichi.risques.scoreRisque ?? 100) >= 60 ? 'bg-green-500' : (enrichi.risques.scoreRisque ?? 100) >= 40 ? 'bg-amber-500' : 'bg-red-500'
                        }`}>
                          {(enrichi.risques.scoreRisque ?? 100) >= 60 ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-bold text-aquiz-black">Risques naturels</span>
                        </div>
                        <span className={`text-sm font-bold ${
                          (enrichi.risques.scoreRisque ?? 100) >= 70 ? 'text-green-600' :
                          (enrichi.risques.scoreRisque ?? 100) >= 40 ? 'text-amber-600' : 'text-red-600'
                        }`}>{enrichi.risques.scoreRisque}/100</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {enrichi.risques.zoneInondable && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 border-blue-300 text-blue-700 bg-blue-50">Inondation</Badge>
                        )}
                        {enrichi.risques.niveauRadon !== undefined && enrichi.risques.niveauRadon >= 2 && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 border-amber-300 text-amber-700 bg-amber-50">Radon {enrichi.risques.niveauRadon}/3</Badge>
                        )}
                        {enrichi.risques.verdict && (
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0.5 ${
                            enrichi.risques.verdict === 'sûr' ? 'border-green-300 text-green-700 bg-green-50' :
                            enrichi.risques.verdict === 'vigilance' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                            'border-red-300 text-red-700 bg-red-50'
                          }`}>
                            {enrichi.risques.verdict === 'sûr' ? 'Zone sûre' :
                             enrichi.risques.verdict === 'vigilance' ? 'Vigilance' : 'Risqué'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Caractéristiques + DPE + Équipements (compact grid) ── */}
                  <div className="rounded-xl bg-white border border-aquiz-gray-lighter p-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-aquiz-gray-lightest/60 rounded-lg py-3 px-1">
                        <div className="text-sm font-bold text-aquiz-black">{annonce.surface} m²</div>
                        <span className="text-[9px] text-aquiz-gray mt-0.5 block">Surface</span>
                      </div>
                      <div className="bg-aquiz-gray-lightest/60 rounded-lg py-3 px-1">
                        <div className="text-sm font-bold text-aquiz-black">{annonce.pieces}p / {annonce.chambres}ch</div>
                        <span className="text-[9px] text-aquiz-gray mt-0.5 block">Pièces / Chambres</span>
                      </div>
                      <div className="bg-aquiz-gray-lightest/60 rounded-lg py-2 px-1 flex flex-col items-center justify-center gap-0.5 min-h-13">
                        <EditableCell annonceId={annonce.id} field="etage" fieldType="number" rawValue={annonce.etage} placeholder="Ex: 3">
                          <div className="text-sm font-bold text-aquiz-black">
                            {annonce.etage !== undefined ? (annonce.etage === 0 ? 'RDC' : `${annonce.etage}e`) : '—'}
                          </div>
                        </EditableCell>
                        <span className="text-[9px] text-aquiz-gray block">Étage</span>
                      </div>
                      <div className="bg-aquiz-gray-lightest/60 rounded-lg py-2 px-1 flex flex-col items-center justify-center gap-0.5 min-h-13">
                        <EditableCell annonceId={annonce.id} field="anneeConstruction" fieldType="number" rawValue={annonce.anneeConstruction} placeholder="Ex: 1985">
                          <div className="text-sm font-bold text-aquiz-black">
                            {annonce.anneeConstruction ?? '—'}
                          </div>
                        </EditableCell>
                        <span className="text-[9px] text-aquiz-gray block">Année</span>
                      </div>
                      <div className="bg-aquiz-gray-lightest/60 rounded-lg py-2 px-1 flex flex-col items-center justify-center gap-0.5 min-h-13">
                        <EditableCell annonceId={annonce.id} field="orientation" fieldType="orientation" rawValue={annonce.orientation}>
                          <div className="text-sm font-bold text-aquiz-black">
                            {annonce.orientation ?? '—'}
                          </div>
                        </EditableCell>
                        <span className="text-[9px] text-aquiz-gray block">Orientation</span>
                      </div>
                      <div className="bg-aquiz-gray-lightest/60 rounded-lg py-2 px-1 flex flex-col items-center justify-center gap-0.5 min-h-13">
                        <EditableCell annonceId={annonce.id} field="nbSallesBains" fieldType="number" rawValue={annonce.nbSallesBains} placeholder="Ex: 1">
                          <div className="text-sm font-bold text-aquiz-black">
                            {annonce.nbSallesBains ?? '—'}
                          </div>
                        </EditableCell>
                        <span className="text-[9px] text-aquiz-gray block">Sdb</span>
                      </div>
                    </div>
                    
                    {/* DPE + Équipements — row */}
                    <div className="mt-2.5 pt-2.5 border-t border-aquiz-gray-lighter flex items-center gap-2 flex-wrap">
                      <EditableCell annonceId={annonce.id} field="dpe" fieldType="dpe" rawValue={annonce.dpe}>
                        <Badge className={`${COULEURS_DPE[annonce.dpe]} text-white text-[10px]`}>DPE {annonce.dpe}</Badge>
                      </EditableCell>
                      <EditableCell annonceId={annonce.id} field="ges" fieldType="dpe" rawValue={annonce.ges}>
                        <Badge variant="outline" className="text-[10px]">GES {annonce.ges || '?'}</Badge>
                      </EditableCell>
                      <div className="w-px h-4 bg-aquiz-gray-lighter" />
                      <EditableCell annonceId={annonce.id} field="balconTerrasse" fieldType="boolean" rawValue={annonce.balconTerrasse}>
                        <span className={`text-[10px] font-medium ${annonce.balconTerrasse ? 'text-aquiz-black' : 'text-aquiz-gray-light'}`}>
                          {annonce.balconTerrasse ? '✓ Balcon' : '✗ Balcon'}
                        </span>
                      </EditableCell>
                      <EditableCell annonceId={annonce.id} field="parking" fieldType="boolean" rawValue={annonce.parking}>
                        <span className={`text-[10px] font-medium ${annonce.parking ? 'text-aquiz-black' : 'text-aquiz-gray-light'}`}>
                          {annonce.parking ? '✓ Parking' : '✗ Parking'}
                        </span>
                      </EditableCell>
                      <EditableCell annonceId={annonce.id} field="cave" fieldType="boolean" rawValue={annonce.cave}>
                        <span className={`text-[10px] font-medium ${annonce.cave ? 'text-aquiz-black' : 'text-aquiz-gray-light'}`}>
                          {annonce.cave ? '✓ Cave' : '✗ Cave'}
                        </span>
                      </EditableCell>
                      <EditableCell annonceId={annonce.id} field="ascenseur" fieldType="boolean" rawValue={annonce.ascenseur}>
                        <span className={`text-[10px] font-medium ${annonce.ascenseur ? 'text-aquiz-black' : 'text-aquiz-gray-light'}`}>
                          {annonce.ascenseur ? '✓ Ascenseur' : '✗ Ascenseur'}
                        </span>
                      </EditableCell>
                    </div>
                  </div>

                  {/* ── Actions ── */}
                  <div className="flex gap-2 pt-1">
                    {annonce.url && (
                      <a
                        href={annonce.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 h-11 bg-aquiz-black text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-transform"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Voir l&apos;annonce
                      </a>
                    )}
                    <button
                      onClick={() => onRemove(annonce.id)}
                      className="h-11 w-11 flex items-center justify-center bg-red-50 text-red-500 rounded-xl active:scale-[0.98] transition-transform shrink-0"
                      aria-label="Retirer de la comparaison"
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
