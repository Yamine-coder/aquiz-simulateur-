'use client'

/**
 * Composant Analyse Enrichie
 * 
 * Affiche les données provenant des APIs gratuites :
 * - DVF : Comparaison au prix du marché
 * - Géorisques : Risques naturels et technologiques
 * - OpenStreetMap : Score quartier
 */

import { Badge } from '@/components/ui/badge'
import type { AnalyseComplete } from '@/lib/api/analyseIntelligente'
import {
    AlertTriangle,
    Building2,
    Car,
    CheckCircle,
    Droplets,
    Globe,
    Loader2,
    MapPin,
    School,
    ShieldAlert,
    ShieldCheck,
    ShoppingBag,
    Star,
    Stethoscope,
    ThumbsUp,
    Train,
    TreePine,
    Trees,
    TrendingDown,
    TrendingUp
} from 'lucide-react'

interface AnalyseEnrichieProps {
  analyse: AnalyseComplete | null
  isLoading?: boolean
  compact?: boolean
}

export function AnalyseEnrichie({ analyse, isLoading, compact = false }: AnalyseEnrichieProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 gap-2 text-aquiz-gray">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Analyse en cours...</span>
      </div>
    )
  }
  
  if (!analyse) {
    return (
      <div className="text-center py-4 text-xs text-aquiz-gray">
        Données d&apos;analyse non disponibles
      </div>
    )
  }
  
  const { marche, risques, quartier } = analyse
  
  if (compact) {
    return (
      <div className="space-y-2">
        {/* Prix marché compact */}
        {marche.success && marche.verdict && (
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
            marche.verdict === 'excellent' || marche.verdict === 'bon' 
              ? 'bg-aquiz-green/10 text-aquiz-green'
              : marche.verdict === 'correct' 
                ? 'bg-orange-50 text-orange-700'
                : 'bg-red-50 text-red-600'
          }`}>
            {marche.ecartPrixM2 && marche.ecartPrixM2 <= 0 ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5" />
            )}
            <span className="font-medium">
              {marche.ecartPrixM2 !== undefined && (
                marche.ecartPrixM2 <= 0 
                  ? `${Math.abs(marche.ecartPrixM2).toFixed(0)}% sous marché`
                  : `+${marche.ecartPrixM2.toFixed(0)}% vs marché`
              )}
            </span>
          </div>
        )}
        
        {/* Risques compact */}
        {risques.success && risques.verdict && (
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
            risques.verdict === 'sûr' 
              ? 'bg-aquiz-green/10 text-aquiz-green'
              : risques.verdict === 'vigilance'
                ? 'bg-orange-50 text-orange-700'
                : 'bg-red-50 text-red-600'
          }`}>
            {risques.verdict === 'sûr' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            <span className="font-medium">
              {risques.verdict === 'sûr' 
                ? 'Zone sûre'
                : risques.verdict === 'vigilance'
                  ? `${(risques.risquesNaturels?.length || 0) + (risques.risquesTechnos?.length || 0)} risque(s)`
                  : 'Zone à risques'
              }
            </span>
          </div>
        )}
        
        {/* Quartier compact */}
        {quartier.success && quartier.scoreQuartier !== undefined && (
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
            quartier.scoreQuartier >= 60 
              ? 'bg-aquiz-green/10 text-aquiz-green'
              : quartier.scoreQuartier >= 40
                ? 'bg-orange-50 text-orange-700'
                : 'bg-gray-100 text-gray-600'
          }`}>
            <MapPin className="w-3.5 h-3.5" />
            <span className="font-medium">
              Quartier {quartier.scoreQuartier}/100
            </span>
          </div>
        )}
      </div>
    )
  }
  
  // Version détaillée
  return (
    <div className="space-y-4">
      {/* === INDICATEUR DE PRÉCISION === */}
      {analyse.precision && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
          analyse.precision.adresseComplete 
            ? 'bg-aquiz-green/10 text-aquiz-green'
            : 'bg-amber-50 text-amber-700'
        }`}>
          <MapPin className="w-3.5 h-3.5" />
          <span>
            {analyse.precision.adresseComplete 
              ? 'Analyse précise (adresse complète)'
              : 'Analyse approximative (code postal uniquement)'}
          </span>
        </div>
      )}
      
      {/* === SECTION MARCHÉ === */}
      {marche.success && (
        <div className="bg-white border border-aquiz-gray-lighter rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-aquiz-black">Prix du marché</h4>
              <p className="text-[10px] text-aquiz-gray">
                Source : {marche.sourceData || 'DVF (data.gouv.fr)'}
              </p>
            </div>
          </div>
          
          {/* Avertissement si données potentiellement incohérentes */}
          {marche.avertissement && (
            <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs text-amber-700">{marche.avertissement}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-aquiz-gray-lightest rounded-lg p-2.5 text-center">
              <div className="text-xs text-aquiz-gray">Prix médian secteur</div>
              <div className="text-base font-bold text-aquiz-black">
                {marche.prixMedianMarche?.toLocaleString('fr-FR')} €
              </div>
            </div>
            <div className="bg-aquiz-gray-lightest rounded-lg p-2.5 text-center">
              <div className="text-xs text-aquiz-gray">Prix/m² médian</div>
              <div className="text-base font-bold text-aquiz-black">
                {marche.prixM2MedianMarche?.toLocaleString('fr-FR')} €/m²
              </div>
            </div>
          </div>
          
          {/* Badge verdict */}
          <div className={`flex items-center justify-between p-2.5 rounded-lg ${
            marche.verdict === 'excellent' || marche.verdict === 'bon'
              ? 'bg-aquiz-green/10 border border-aquiz-green/20'
              : marche.verdict === 'correct'
                ? 'bg-orange-50 border border-orange-200'
                : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {marche.ecartPrixM2 && marche.ecartPrixM2 <= 0 ? (
                <TrendingDown className={`w-5 h-5 ${
                  marche.verdict === 'excellent' || marche.verdict === 'bon' ? 'text-aquiz-green' : 'text-orange-600'
                }`} />
              ) : (
                <TrendingUp className={`w-5 h-5 ${
                  marche.verdict === 'correct' ? 'text-orange-600' : 'text-red-600'
                }`} />
              )}
              <span className={`text-sm font-medium ${
                marche.verdict === 'excellent' || marche.verdict === 'bon'
                  ? 'text-aquiz-green'
                  : marche.verdict === 'correct'
                    ? 'text-orange-700'
                    : 'text-red-600'
              }`}>
                {marche.message}
              </span>
            </div>
            {marche.nbTransactions && (
              <span className="text-[10px] text-aquiz-gray">
                {marche.nbTransactions} ventes récentes
              </span>
            )}
          </div>
          
          {/* Évolution marché */}
          {marche.evolution12Mois !== undefined && (
            <div className="mt-2 text-xs text-aquiz-gray flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Évolution 12 mois : 
              <span className={marche.evolution12Mois >= 0 ? 'text-aquiz-green font-medium' : 'text-red-500 font-medium'}>
                {marche.evolution12Mois >= 0 ? '+' : ''}{marche.evolution12Mois.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* === SECTION RISQUES === */}
      {risques.success && (
        <div className="bg-white border border-aquiz-gray-lighter rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              risques.verdict === 'sûr' ? 'bg-green-100' :
              risques.verdict === 'vigilance' ? 'bg-orange-100' : 'bg-red-100'
            }`}>
              {risques.verdict === 'sûr' ? (
                <ShieldCheck className="w-4 h-4 text-green-600" />
              ) : (
                <ShieldAlert className={`w-4 h-4 ${
                  risques.verdict === 'vigilance' ? 'text-orange-600' : 'text-red-600'
                }`} />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-aquiz-black">Risques environnementaux</h4>
              <p className="text-[10px] text-aquiz-gray">Source : Géorisques (gouv.fr)</p>
            </div>
          </div>
          
          {/* Score risque */}
          <div className="flex items-center gap-3 mb-3">
            <div className={`text-2xl font-bold ${
              risques.scoreRisque && risques.scoreRisque >= 70 ? 'text-aquiz-green' :
              risques.scoreRisque && risques.scoreRisque >= 40 ? 'text-orange-500' : 'text-red-500'
            }`}>
              {risques.scoreRisque}/100
            </div>
            <span className="text-xs text-aquiz-gray">(100 = très sûr)</span>
          </div>
          
          {/* Liste des risques */}
          {(risques.risquesNaturels && risques.risquesNaturels.length > 0) && (
            <div className="mb-2">
              <div className="text-xs font-medium text-aquiz-gray mb-1">Risques naturels :</div>
              <div className="flex flex-wrap gap-1">
                {risques.risquesNaturels.map((risque, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                    <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                    {risque}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {(risques.risquesTechnos && risques.risquesTechnos.length > 0) && (
            <div className="mb-2">
              <div className="text-xs font-medium text-aquiz-gray mb-1">Risques technologiques :</div>
              <div className="flex flex-wrap gap-1">
                {risques.risquesTechnos.map((risque, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                    <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                    {risque}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Zone inondable */}
          {risques.zoneInondable && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
              <span className="text-xs text-blue-700 font-medium flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" />
                Zone inondable identifiée
              </span>
            </div>
          )}
          
          {/* Si aucun risque */}
          {(!risques.risquesNaturels || risques.risquesNaturels.length === 0) &&
           (!risques.risquesTechnos || risques.risquesTechnos.length === 0) &&
           !risques.zoneInondable && (
            <div className="bg-aquiz-green/10 border border-aquiz-green/20 rounded-lg p-2.5">
              <span className="text-xs text-aquiz-green font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Aucun risque majeur identifié dans cette zone
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* === SECTION QUARTIER === */}
      {quartier.success && quartier.scoreQuartier !== undefined && (
        <div className="bg-white border border-aquiz-gray-lighter rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-aquiz-black">Score quartier</h4>
              <p className="text-[10px] text-aquiz-gray">Source : OpenStreetMap</p>
            </div>
          </div>
          
          {/* Score global */}
          <div className="flex items-center gap-3 mb-3">
            <div className={`text-2xl font-bold ${
              quartier.scoreQuartier >= 70 ? 'text-aquiz-green' :
              quartier.scoreQuartier >= 40 ? 'text-orange-500' : 'text-gray-500'
            }`}>
              {quartier.scoreQuartier}/100
            </div>
                      <Badge className={`text-[10px] ${
              quartier.verdict === 'excellent' ? 'bg-aquiz-green text-white' :
              quartier.verdict === 'bon' ? 'bg-aquiz-green/20 text-aquiz-green' :
              quartier.verdict === 'moyen' ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {quartier.verdict === 'excellent' ? (
                <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Excellent</span>
              ) : quartier.verdict === 'bon' ? (
                <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> Bon</span>
              ) : quartier.verdict === 'moyen' ? (
                <span className="flex items-center gap-1"><Car className="w-3 h-3" /> Moyen</span>
              ) : (
                <span className="flex items-center gap-1"><TreePine className="w-3 h-3" /> Calme</span>
              )}
            </Badge>
          </div>
          
          {/* Détails par catégorie */}
          <div className="grid grid-cols-3 gap-2">
            {quartier.transports !== undefined && (
              <div className="bg-aquiz-gray-lightest rounded-lg p-2 text-center">
                <Train className={`w-4 h-4 mx-auto mb-1 ${
                  quartier.transports >= 60 ? 'text-aquiz-green' :
                  quartier.transports >= 30 ? 'text-orange-500' : 'text-gray-400'
                }`} />
                <div className="text-[10px] text-aquiz-gray">Transports</div>
                <div className="text-xs font-bold">{quartier.transports}</div>
              </div>
            )}
            {quartier.commerces !== undefined && (
              <div className="bg-aquiz-gray-lightest rounded-lg p-2 text-center">
                <ShoppingBag className={`w-4 h-4 mx-auto mb-1 ${
                  quartier.commerces >= 60 ? 'text-aquiz-green' :
                  quartier.commerces >= 30 ? 'text-orange-500' : 'text-gray-400'
                }`} />
                <div className="text-[10px] text-aquiz-gray">Commerces</div>
                <div className="text-xs font-bold">{quartier.commerces}</div>
              </div>
            )}
            {quartier.ecoles !== undefined && (
              <div className="bg-aquiz-gray-lightest rounded-lg p-2 text-center">
                <School className={`w-4 h-4 mx-auto mb-1 ${
                  quartier.ecoles >= 60 ? 'text-aquiz-green' :
                  quartier.ecoles >= 30 ? 'text-orange-500' : 'text-gray-400'
                }`} />
                <div className="text-[10px] text-aquiz-gray">Écoles</div>
                <div className="text-xs font-bold">{quartier.ecoles}</div>
              </div>
            )}
            {quartier.sante !== undefined && (
              <div className="bg-aquiz-gray-lightest rounded-lg p-2 text-center">
                <Stethoscope className={`w-4 h-4 mx-auto mb-1 ${
                  quartier.sante >= 60 ? 'text-aquiz-green' :
                  quartier.sante >= 30 ? 'text-orange-500' : 'text-gray-400'
                }`} />
                <div className="text-[10px] text-aquiz-gray">Santé</div>
                <div className="text-xs font-bold">{quartier.sante}</div>
              </div>
            )}
            {quartier.espaceVerts !== undefined && (
              <div className="bg-aquiz-gray-lightest rounded-lg p-2 text-center">
                <Trees className={`w-4 h-4 mx-auto mb-1 ${
                  quartier.espaceVerts >= 60 ? 'text-aquiz-green' :
                  quartier.espaceVerts >= 30 ? 'text-orange-500' : 'text-gray-400'
                }`} />
                <div className="text-[10px] text-aquiz-gray">Espaces verts</div>
                <div className="text-xs font-bold">{quartier.espaceVerts}</div>
              </div>
            )}
          </div>
          
          {/* Message */}
          {quartier.message && (
            <p className="text-xs text-aquiz-gray mt-3 italic">
              {quartier.message}
            </p>
          )}
        </div>
      )}
      
      {/* Message si aucune donnée enrichie */}
      {!marche.success && !risques.success && !quartier.success && (
        <div className="text-center py-4 text-xs text-aquiz-gray">
          <p>Données enrichies non disponibles pour ce bien.</p>
          <p className="mt-1">Vérifiez que l&apos;adresse est complète.</p>
        </div>
      )}
    </div>
  )
}

/**
 * Version en ligne pour le tableau
 */
export function AnalyseEnrichieLigne({ analyse, isLoading }: { analyse: AnalyseComplete | null; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-aquiz-gray">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-[10px]">Chargement...</span>
      </div>
    )
  }
  
  if (!analyse) return null
  
  const { marche, risques, quartier } = analyse
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {/* Badge marché */}
      {marche.success && marche.verdict && (
        <Badge className={`text-[9px] px-1.5 py-0.5 ${
          marche.verdict === 'excellent' || marche.verdict === 'bon'
            ? 'bg-aquiz-green/10 text-aquiz-green border-aquiz-green/20'
            : marche.verdict === 'correct'
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : 'bg-red-50 text-red-600 border-red-200'
        }`} variant="outline">
          {marche.ecartPrixM2 !== undefined && (
            marche.ecartPrixM2 <= 0 
              ? `↓${Math.abs(marche.ecartPrixM2).toFixed(0)}%`
              : `↑${marche.ecartPrixM2.toFixed(0)}%`
          )} marché
        </Badge>
      )}
      
      {/* Badge risques */}
      {risques.success && risques.verdict && (
        <Badge className={`text-[9px] px-1.5 py-0.5 ${
          risques.verdict === 'sûr'
            ? 'bg-aquiz-green/10 text-aquiz-green border-aquiz-green/20'
            : risques.verdict === 'vigilance'
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : 'bg-red-50 text-red-600 border-red-200'
        }`} variant="outline">
          {risques.verdict === 'sûr' ? 'Sûr' :
           risques.verdict === 'vigilance' ? 'Vigilance' : 'Risques'}
        </Badge>
      )}
      
      {/* Badge quartier */}
      {quartier.success && quartier.scoreQuartier !== undefined && (
        <Badge className={`text-[9px] px-1.5 py-0.5 ${
          quartier.scoreQuartier >= 60
            ? 'bg-purple-50 text-purple-700 border-purple-200'
            : quartier.scoreQuartier >= 30
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : 'bg-gray-100 text-gray-600 border-gray-200'
        }`} variant="outline">
          <MapPin className="w-2.5 h-2.5 mr-0.5 inline" />
          {quartier.scoreQuartier}/100
        </Badge>
      )}
    </div>
  )
}
