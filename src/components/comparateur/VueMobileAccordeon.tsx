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
    AlertTriangle,
    Building2,
    Bus,
    Check,
    CheckCircle,
    ChevronDown,
    CreditCard,
    ExternalLink,
    Home,
    Key,
    Lock,
    Mail,
    MapPin,
    ShieldCheck,
    ShoppingBag,
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
  analysesEnrichies: Array<{
    annonceId: string
    score: number
    scoreEnrichi?: number
    verdict: string
    points: Array<{
      texte: string
      detail?: string
      type: 'avantage' | 'attention' | 'conseil'
    }>
    conseilPerso: string
  }>
  enrichissements?: Map<string, {
    marche?: { success: boolean; ecartPrixM2?: number; verdict?: string }
    risques?: { success: boolean; verdict?: string; scoreRisque?: number; zoneInondable?: boolean; niveauRadon?: number }
    quartier?: { success: boolean; scoreQuartier?: number; transports?: number; commerces?: number; ecoles?: number; sante?: number; espaceVerts?: number }
  }>
  scoresPro?: ScoreProResult[]
  meilleurRapportId?: string
  budgetMax?: number | null
  mensualiteParams?: { tauxInteret: number; dureeAns: number; apport: number }
  onRemove: (id: string) => void
  onOpenModal?: () => void
  unlocked?: boolean
  emailSent?: boolean
}

// calculerMensualite importé depuis @/lib/comparateur/financier

export function VueMobileAccordeon({
  annonces,
  analysesEnrichies,
  enrichissements,
  scoresPro,
  meilleurRapportId,
  mensualiteParams,
  onRemove,
  onOpenModal,
  unlocked = false,
  emailSent = false
}: VueMobileAccordeonProps) {
  const getAnalyse = (id: string) => analysesEnrichies.find(a => a.annonceId === id)
  const getScorePro = (id: string) => scoresPro?.find(s => s.annonceId === id)

  return (
    <div className="md:hidden space-y-4">
      <Accordion type="single" collapsible className="space-y-3">
        {annonces.map((annonce) => {
          const analyse = getAnalyse(annonce.id)
          const isMeilleur = annonce.id === meilleurRapportId
          const IconType = annonce.type === 'maison' ? Home : Building2
          const enrichi = enrichissements?.get(annonce.id)
          
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
                    {annonce.imageUrl ? (
                      <Image src={annonce.imageUrl} alt={`Photo du bien ${annonce.titre || 'immobilier'}`} className="w-full h-full object-cover" fill sizes="56px" />
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
                      <span>•</span>
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
                    
                    {/* Écart marché — revealed or teaser */}
                    {enrichi?.marche?.success && enrichi.marche.ecartPrixM2 !== undefined && (
                      unlocked ? (
                        <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-aquiz-gray">Prix vs marché</span>
                            <span className={`text-sm font-bold ${enrichi.marche.ecartPrixM2 < 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {enrichi.marche.ecartPrixM2 < 0 ? '' : '+'}{enrichi.marche.ecartPrixM2.toFixed(0)}%
                            </span>
                          </div>
                          {enrichi.marche.verdict && (
                            <p className="text-[9px] text-aquiz-gray mt-0.5">{enrichi.marche.verdict}</p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenModal?.()}
                          className="mt-2 w-full group"
                        >
                          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-50 border border-dashed border-gray-200 group-active:border-aquiz-green group-active:bg-aquiz-green/5">
                            <div className="flex items-center gap-1.5">
                              <Lock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs font-medium text-gray-500">Marché — {annonce.ville || 'ce secteur'}</span>
                            </div>
                            <span className="text-[9px] text-aquiz-green font-semibold flex items-center gap-0.5">
                              Voir l&apos;écart marché <ChevronDown className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </button>
                      )
                    )}
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
                            const travaux = analyse?.points.find(p => p.texte.includes('travaux'))?.detail ? 0 : 0
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
                  
                  {/* ═══ SECTIONS VERROUILLÉES — toujours floutées (CTA pré-email ou overlay post-email) ═══ */}
                  <div className="relative">
                    <div className={`space-y-4 transition-all duration-500 ${
                      !unlocked ? 'blur-sm pointer-events-none select-none' : ''
                    }`}>

                  {/* Risques & Quartier — revealed or teasers */}
                  <div className="flex gap-3">
                    {enrichi?.risques?.success && (
                      unlocked ? (
                        <div className={`flex-1 rounded-xl p-3 border ${
                          (enrichi.risques.scoreRisque ?? 50) >= 70 ? 'bg-green-50 border-green-200' : 
                          (enrichi.risques.scoreRisque ?? 50) >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                            <span className="text-[10px] font-semibold text-aquiz-gray">Risques</span>
                          </div>
                          <div className={`text-lg font-bold ${
                            (enrichi.risques.scoreRisque ?? 50) >= 70 ? 'text-green-600' : 
                            (enrichi.risques.scoreRisque ?? 50) >= 40 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {enrichi.risques.scoreRisque ?? '—'}/100
                          </div>
                          {enrichi.risques.verdict && (
                            <p className="text-[9px] text-aquiz-gray mt-0.5">{enrichi.risques.verdict}</p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenModal?.()}
                          className="flex-1 group"
                        >
                          <div className="flex flex-col items-center gap-1.5 rounded-xl p-3 border border-dashed border-gray-200 group-active:border-aquiz-green group-active:bg-aquiz-green/5">
                            <p className="text-[10px] text-aquiz-gray flex items-center gap-1"><Lock className="w-3 h-3 text-gray-400" /> Risques</p>
                            {enrichi?.risques?.zoneInondable ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium inline-flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> Zone inondable</span>
                            ) : (
                              <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                                <div className="h-full rounded-full bg-gray-300 animate-pulse" style={{ width: '60%' }} />
                              </div>
                            )}
                            <span className="text-[10px] text-aquiz-green font-semibold flex items-center gap-0.5">
                              Voir le diagnostic <ChevronDown className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </button>
                      )
                    )}
                    {enrichi?.quartier?.success && enrichi.quartier.scoreQuartier !== undefined && (
                      unlocked ? (
                        <div className={`flex-1 rounded-xl p-3 border ${
                          enrichi.quartier.scoreQuartier >= 70 ? 'bg-purple-50 border-purple-200' : 
                          enrichi.quartier.scoreQuartier >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-purple-600" />
                            <span className="text-[10px] font-semibold text-aquiz-gray">Quartier</span>
                          </div>
                          <div className={`text-lg font-bold ${
                            enrichi.quartier.scoreQuartier >= 70 ? 'text-purple-600' : 
                            enrichi.quartier.scoreQuartier >= 40 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {enrichi.quartier.scoreQuartier}/100
                          </div>
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {enrichi.quartier.transports !== undefined && (
                              <span className="inline-flex items-center gap-0.5 text-[8px] px-1 py-0.5 rounded bg-white text-aquiz-gray"><Bus className="w-2.5 h-2.5 text-purple-400" /> {enrichi.quartier.transports}</span>
                            )}
                            {enrichi.quartier.commerces !== undefined && (
                              <span className="inline-flex items-center gap-0.5 text-[8px] px-1 py-0.5 rounded bg-white text-aquiz-gray"><ShoppingBag className="w-2.5 h-2.5 text-purple-400" /> {enrichi.quartier.commerces}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenModal?.()}
                          className="flex-1 group"
                        >
                          <div className="flex flex-col items-center gap-1.5 rounded-xl p-3 border border-dashed border-gray-200 group-active:border-aquiz-green group-active:bg-aquiz-green/5">
                            <p className="text-[10px] text-aquiz-gray flex items-center gap-1"><Lock className="w-3 h-3 text-gray-400" /> Quartier</p>
                            {(() => {
                              const totalPoi = (enrichi?.quartier?.transports ?? 0) + (enrichi?.quartier?.commerces ?? 0) + (enrichi?.quartier?.ecoles ?? 0) + (enrichi?.quartier?.sante ?? 0) + (enrichi?.quartier?.espaceVerts ?? 0)
                              return totalPoi > 0 ? (
                                <span className="text-[9px] text-aquiz-gray">{totalPoi} commodité{totalPoi > 1 ? 's' : ''} à 800m</span>
                              ) : (
                                <div className="flex items-center gap-0.5">
                                  {[1,2,3,4,5].map((_, i) => (
                                    <div key={i} className="w-4 h-1.5 rounded-full bg-gray-200 animate-pulse" />
                                  ))}
                                </div>
                              )
                            })()}
                            <span className="text-[10px] text-aquiz-green font-semibold flex items-center gap-0.5">
                              Voir le détail <ChevronDown className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                  
                  {/* Points clés — revealed or masked */}
                  {analyse && (
                    unlocked ? (
                      <div className="space-y-2">
                        {analyse.points.filter(p => p.type === 'avantage').slice(0, 2).map((p, i) => (
                          <div key={i} className="bg-green-50 border border-green-100 rounded-lg p-2.5">
                            <div className="flex items-start gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                              <span className="text-[10px] text-green-800">{p.texte}</span>
                            </div>
                          </div>
                        ))}
                        {analyse.points.filter(p => p.type === 'attention').slice(0, 2).map((p, i) => (
                          <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                            <div className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span className="text-[10px] text-amber-800">{p.texte}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => onOpenModal?.()}
                        className="w-full space-y-2"
                      >
                        {(() => {
                          const nbAvantages = analyse.points.filter(p => p.type === 'avantage').length
                          const nbAlerts = analyse.points.filter(p => p.type === 'attention').length
                          return (
                            <>
                              <div className="rounded-lg bg-green-50/50 border border-dashed border-green-100/50 p-2.5">
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-green-300 shrink-0" />
                                  <span className="text-[10px] text-green-700/60">{nbAvantages} avantage{nbAvantages > 1 ? 's' : ''} identifié{nbAvantages > 1 ? 's' : ''}</span>
                                </div>
                              </div>
                              <div className="rounded-lg bg-amber-50/50 border border-dashed border-amber-100/50 p-2.5">
                                <div className="flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                  <span className="text-[10px] text-amber-700/60">{nbAlerts} point{nbAlerts > 1 ? 's' : ''} de vigilance</span>
                                </div>
                              </div>
                            </>
                          )
                        })()}
                      </button>
                    )
                  )}
                  
                  {/* Score & verdict — always visible, detail locked */}
                  {getScorePro(annonce.id) ? (
                    <div className={`rounded-lg overflow-hidden border ${getMobileScoreBg(getScorePro(annonce.id)!.scoreGlobal)}`}>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-aquiz-gray uppercase">Score AQUIZ</span>
                          <span className={`text-xl font-bold ${getMobileScoreColor(getScorePro(annonce.id)!.scoreGlobal)}`}>
                            {getScorePro(annonce.id)!.scoreGlobal}/100
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/50 rounded-full overflow-hidden mb-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              getScorePro(annonce.id)!.scoreGlobal >= 75 ? 'bg-green-500' :
                              getScorePro(annonce.id)!.scoreGlobal >= 60 ? 'bg-lime-500' :
                              getScorePro(annonce.id)!.scoreGlobal >= 45 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${getScorePro(annonce.id)!.scoreGlobal}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-aquiz-gray">{getScorePro(annonce.id)!.verdict}</p>
                      </div>
                      {unlocked ? (
                        <div className="border-t border-aquiz-green/20 bg-aquiz-green/5 px-3 py-2">
                          <div className="flex items-start gap-1.5">
                            <Mail className="w-3 h-3 text-aquiz-green shrink-0 mt-0.5" />
                            <p className="text-[9px] text-aquiz-gray">
                              <span className="font-semibold text-aquiz-green">Rapport détaillé envoyé par email</span>
                              {' '}— recommandations et conseils
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenModal?.()}
                          className="w-full border-t border-aquiz-gray-lighter py-2 text-center text-[10px] text-aquiz-green font-medium hover:bg-aquiz-green/5 transition-colors flex items-center justify-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          Voir le détail + recommandations &rarr;
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100">
                      <div className="w-8 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-gray-300" style={{ width: '60%' }} />
                      </div>
                      <span className="text-[8px] text-aquiz-gray">Score</span>
                    </div>
                  )}

                    </div>{/* fin blur wrapper */}

                    {/* Overlay flottant mobile — CTA pré-email ou confirmation post-email */}
                    {!unlocked && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 rounded-xl">
                        {emailSent ? (
                          <div className="bg-white rounded-xl shadow-lg border border-aquiz-gray-lighter p-4 max-w-[calc(100%-1.5rem)] w-full animate-in fade-in zoom-in-95 duration-500 text-center">
                            <div className="flex justify-center mb-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-aquiz-green/10 text-aquiz-green text-[10px] font-semibold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Analyse envoyée
                              </span>
                            </div>
                            <div className="flex justify-center mb-2">
                              <div className="w-10 h-10 rounded-xl bg-aquiz-green/10 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-aquiz-green" />
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-aquiz-black mb-1">Consultez votre boîte mail</p>
                            <p className="text-[10px] text-aquiz-gray">Scores, risques et recommandations</p>
                          </div>
                        ) : (
                          <div className="bg-white rounded-xl shadow-lg border border-aquiz-gray-lighter p-4 max-w-[calc(100%-1.5rem)] w-full animate-in fade-in zoom-in-95 duration-500 text-center">
                            <div className="flex justify-center mb-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-aquiz-green/10 text-aquiz-green text-[10px] font-semibold">
                                <Lock className="w-3.5 h-3.5" />
                                Analyse réservée
                              </span>
                            </div>
                            <div className="flex justify-center mb-2">
                              <div className="w-10 h-10 rounded-xl bg-aquiz-green/10 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-aquiz-green" />
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-aquiz-black mb-1">Recevez votre analyse complète</p>
                            <p className="text-[10px] text-aquiz-gray mb-3">Scores, risques et recommandations — gratuit</p>
                            <button
                              onClick={() => onOpenModal?.()}
                              className="w-full py-2.5 px-4 rounded-lg bg-aquiz-green text-white font-semibold text-xs hover:bg-aquiz-green/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Recevoir mon rapport gratuit
                            </button>
                            <div className="flex items-center justify-center gap-2 mt-2 text-[9px] text-aquiz-gray">
                              <span className="flex items-center gap-0.5"><Check className="w-2.5 h-2.5 text-aquiz-green" /> Gratuit</span>
                              <span className="flex items-center gap-0.5"><Check className="w-2.5 h-2.5 text-aquiz-green" /> 1 seul email</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>{/* fin relative wrapper */}
                  
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
