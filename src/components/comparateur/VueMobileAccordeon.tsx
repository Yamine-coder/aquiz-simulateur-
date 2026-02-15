'use client'

/**
 * Vue mobile accordéon pour la comparaison des biens
 * Affiche chaque bien dans un accordéon dépliable
 */

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { COULEURS_DPE, type Annonce } from '@/types/annonces'
import {
    AlertTriangle,
    Building2,
    CheckCircle,
    CreditCard,
    ExternalLink,
    Home,
    Key,
    Lightbulb,
    MapPin,
    Phone,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Star,
    TrendingDown,
    TrendingUp,
    X,
    Zap
} from 'lucide-react'

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
    risques?: { success: boolean; verdict?: string }
    quartier?: { success: boolean; scoreQuartier?: number }
  }>
  meilleurRapportId?: string
  budgetMax?: number | null
  mensualiteParams?: { tauxInteret: number; dureeAns: number; apport: number }
  conseilGeneral: string
  onRemove: (id: string) => void
  onRequestHelp?: () => void
}

function calculerMensualite(
  prixBien: number,
  apport: number,
  tauxAnnuel: number,
  dureeAns: number
): number {
  const capitalEmprunte = prixBien - apport
  if (capitalEmprunte <= 0) return 0
  const tauxMensuel = tauxAnnuel / 100 / 12
  const nombreMensualites = dureeAns * 12
  if (tauxMensuel === 0) return capitalEmprunte / nombreMensualites
  const mensualite = (capitalEmprunte * tauxMensuel) / 
    (1 - Math.pow(1 + tauxMensuel, -nombreMensualites))
  return Math.round(mensualite)
}

export function VueMobileAccordeon({
  annonces,
  analysesEnrichies,
  enrichissements,
  meilleurRapportId,
  mensualiteParams,
  conseilGeneral,
  onRemove,
  onRequestHelp
}: VueMobileAccordeonProps) {
  const getAnalyse = (id: string) => analysesEnrichies.find(a => a.annonceId === id)
  const meilleurScore = Math.max(...analysesEnrichies.map(a => a.scoreEnrichi ?? a.score), 0)

  return (
    <div className="md:hidden space-y-4">
      <Accordion type="single" collapsible className="space-y-3">
        {annonces.map((annonce) => {
          const analyse = getAnalyse(annonce.id)
          const scoreFinal = analyse?.scoreEnrichi ?? analyse?.score ?? 0
          const isMeilleur = annonce.id === meilleurRapportId
          const isBestScore = scoreFinal === meilleurScore && annonces.length > 1
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
                  <div className="w-14 h-14 rounded-lg bg-aquiz-gray-lightest flex items-center justify-center shrink-0 overflow-hidden">
                    {annonce.imageUrl ? (
                      <img src={annonce.imageUrl} alt="" className="w-full h-full object-cover" />
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
                  
                  {/* Score */}
                  <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg ${
                    scoreFinal >= 70 ? 'bg-aquiz-green/10' :
                    scoreFinal >= 50 ? 'bg-orange-100' :
                    'bg-red-100'
                  }`}>
                    <span className={`text-xl font-bold ${
                      scoreFinal >= 70 ? 'text-aquiz-green' :
                      scoreFinal >= 50 ? 'text-orange-600' :
                      'text-red-500'
                    }`}>
                      {scoreFinal}
                    </span>
                    <span className="text-[9px] text-aquiz-gray">/100</span>
                  </div>
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
                    
                    {/* Écart marché */}
                    {enrichi?.marche?.success && enrichi.marche.ecartPrixM2 !== undefined && (
                      <div className={`mt-2 flex items-center gap-1.5 p-2 rounded-lg ${
                        enrichi.marche.ecartPrixM2 <= 0
                          ? 'bg-aquiz-green/10 border border-aquiz-green/20'
                          : enrichi.marche.ecartPrixM2 <= 10
                            ? 'bg-orange-50 border border-orange-200'
                            : 'bg-red-50 border border-red-200'
                      }`}>
                        {enrichi.marche.ecartPrixM2 <= 0 ? (
                          <TrendingDown className="w-4 h-4 text-aquiz-green" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-xs font-medium ${
                          enrichi.marche.ecartPrixM2 <= 0 ? 'text-aquiz-green' :
                          enrichi.marche.ecartPrixM2 <= 10 ? 'text-orange-700' : 'text-red-600'
                        }`}>
                          {enrichi.marche.ecartPrixM2 <= 0
                            ? `${Math.abs(enrichi.marche.ecartPrixM2).toFixed(0)}% sous marché`
                            : `+${enrichi.marche.ecartPrixM2.toFixed(0)}% vs marché`}
                        </span>
                      </div>
                    )}
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
                  
                  {/* Risques & Quartier */}
                  <div className="flex gap-3">
                    {enrichi?.risques?.success && (
                      <div className={`flex-1 rounded-lg p-3 ${
                        enrichi.risques.verdict === 'sûr'
                          ? 'bg-aquiz-green/5 border border-aquiz-green/20'
                          : enrichi.risques.verdict === 'vigilance'
                            ? 'bg-orange-50 border border-orange-200'
                            : 'bg-red-50 border border-red-200'
                      }`}>
                        {enrichi.risques.verdict === 'sûr' ? (
                          <ShieldCheck className="w-5 h-5 text-aquiz-green mb-1" />
                        ) : (
                          <ShieldAlert className={`w-5 h-5 mb-1 ${
                            enrichi.risques.verdict === 'vigilance' ? 'text-orange-600' : 'text-red-500'
                          }`} />
                        )}
                        <div className={`text-xs font-medium ${
                          enrichi.risques.verdict === 'sûr' ? 'text-aquiz-green' :
                          enrichi.risques.verdict === 'vigilance' ? 'text-orange-700' : 'text-red-600'
                        }`}>
                          {enrichi.risques.verdict === 'sûr' ? 'Zone sûre' :
                           enrichi.risques.verdict === 'vigilance' ? 'Vigilance' : 'À risques'}
                        </div>
                      </div>
                    )}
                    {enrichi?.quartier?.success && enrichi.quartier.scoreQuartier !== undefined && (
                      <div className={`flex-1 rounded-lg p-3 ${
                        enrichi.quartier.scoreQuartier >= 60
                          ? 'bg-purple-50 border border-purple-200'
                          : 'bg-gray-100 border border-gray-200'
                      }`}>
                        <MapPin className={`w-5 h-5 mb-1 ${
                          enrichi.quartier.scoreQuartier >= 60 ? 'text-purple-600' : 'text-gray-500'
                        }`} />
                        <div className={`text-xs font-medium ${
                          enrichi.quartier.scoreQuartier >= 60 ? 'text-purple-700' : 'text-gray-600'
                        }`}>
                          Quartier {enrichi.quartier.scoreQuartier}/100
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Points forts/faibles */}
                  {analyse && (
                    <div className="space-y-2">
                      {analyse.points.filter(p => p.type === 'avantage').length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 text-xs font-medium text-aquiz-green mb-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Points forts
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {analyse.points.filter(p => p.type === 'avantage').map((p, i) => (
                              <Badge key={i} className="bg-aquiz-green/10 text-aquiz-green text-[10px] px-2 py-0.5">
                                {p.texte}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {analyse.points.filter(p => p.type === 'attention').length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 text-xs font-medium text-orange-600 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Points d&apos;attention
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {analyse.points.filter(p => p.type === 'attention').map((p, i) => (
                              <Badge key={i} className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5">
                                {p.texte}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Verdict */}
                  <div className="bg-aquiz-gray-lightest rounded-lg p-3 text-center">
                    <div className={`text-2xl font-bold ${
                      scoreFinal >= 70 ? 'text-aquiz-green' :
                      scoreFinal >= 50 ? 'text-orange-500' :
                      'text-red-500'
                    }`}>
                      {scoreFinal}/100
                    </div>
                    <div className={`text-xs font-medium mt-1 ${
                      scoreFinal >= 70 ? 'text-aquiz-green' :
                      scoreFinal >= 50 ? 'text-orange-600' :
                      'text-red-500'
                    }`}>
                      {analyse?.verdict}
                    </div>
                    {isBestScore && (
                      <div className="mt-2">
                        <Badge className="bg-aquiz-green text-white text-[10px]">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Meilleur choix
                        </Badge>
                      </div>
                    )}
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
      
      {/* Conseil expert en bas */}
      <div className="bg-gradient-to-r from-aquiz-green/5 to-aquiz-green/10 rounded-xl p-4 border border-aquiz-green/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <div className="text-xs font-semibold text-aquiz-gray uppercase tracking-wider mb-1">
              Conseil d&apos;expert
            </div>
            <p className="text-sm text-aquiz-gray-dark">{conseilGeneral}</p>
          </div>
        </div>
        {onRequestHelp && (
          <button
            onClick={onRequestHelp}
            className="w-full mt-3 flex items-center justify-center gap-2 bg-aquiz-green hover:bg-aquiz-green-dark text-white text-sm font-semibold py-2.5 rounded-xl transition-all"
          >
            <Phone className="w-4 h-4" />
            Parler à un expert
          </button>
        )}
      </div>
    </div>
  )
}
