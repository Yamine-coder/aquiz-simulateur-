'use client'

/**
 * Tableau de comparaison côte à côte avec analyse intégrée
 * Affiche jusqu'à 4 annonces avec scores et recommandations
 * 
 * Enrichi avec les données APIs gratuites :
 * - DVF : Prix du marché (data.gouv.fr)
 * - Géorisques : Risques naturels/technos
 * - OpenStreetMap : Score quartier
 */

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAnalyseEnrichie } from '@/hooks/useAnalyseEnrichie'
import { calculerCoutTotal, calculerMensualite, estimerFraisNotaire } from '@/lib/comparateur/financier'
import {
    calculerScorePro,
    genererSyntheseComparaison,
    RADAR_AXES,
    scoreToRadarData,
    type DonneesEnrichiesScoring
} from '@/lib/comparateur/scoreComparateur'
import type { Annonce, StatistiquesComparaison } from '@/types/annonces'
import { COULEURS_DPE } from '@/types/annonces'
import {
    AlertTriangle,
    Building2,
    Car,
    Check,
    CheckCircle,
    CircleCheck,
    CreditCard,
    Droplets,
    ExternalLink,
    Home,
    Info,
    Key,
    Lightbulb,
    Loader2,
    MapPin,
    MessageCircle,
    Minus,
    Phone,
    ShieldAlert,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Star,
    ThumbsUp,
    Train,
    Trash2,
    TreePine,
    Trees,
    TrendingDown,
    TrendingUp,
    X,
    Zap
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { COULEURS_RADAR, RadarChart } from './RadarChart'
import { VueMobileAccordeon } from './VueMobileAccordeon'

interface TableauComparaisonProps {
  annonces: Annonce[]
  statistiques: StatistiquesComparaison
  budgetMax?: number | null
  onRemove: (id: string) => void
  onRequestHelp?: () => void
  /** Paramètres de financement pour calculer la mensualité */
  tauxInteret?: number
  dureeAns?: number
  apport?: number
}

/** Adaptateur : convertit AnalyseComplete (du hook) en DonneesEnrichiesScoring (pour le moteur) */
function toEnrichiesScoring(analyse: {
  marche: { success: boolean; ecartPrixM2?: number; verdict?: string; evolution12Mois?: number; prixM2MedianMarche?: number }
  risques: { success: boolean; scoreRisque?: number; verdict?: string; zoneInondable?: boolean; niveauRadon?: number }
  quartier: { success: boolean; scoreQuartier?: number; transports?: number; commerces?: number; ecoles?: number; sante?: number; espaceVerts?: number }
} | null): DonneesEnrichiesScoring | undefined {
  if (!analyse) return undefined
  return {
    marche: analyse.marche.success ? {
      ...analyse.marche,
      verdict: analyse.marche.verdict as DonneesEnrichiesScoring['marche'] extends { verdict?: infer V } ? V : never
    } : undefined,
    risques: analyse.risques.success ? {
      ...analyse.risques,
      verdict: analyse.risques.verdict as DonneesEnrichiesScoring['risques'] extends { verdict?: infer V } ? V : never
    } : undefined,
    quartier: analyse.quartier.success ? analyse.quartier : undefined,
  }
}

/** Ligne de comparaison - Design épuré */
function LigneComparaison({
  label,
  values,
  format = 'text',
  highlight = 'none',
  muted = false
}: {
  label: string
  values: (string | number | boolean | React.ReactNode | undefined)[]
  format?: 'text' | 'prix' | 'dpe' | 'boolean'
  highlight?: 'min' | 'max' | 'none'
  muted?: boolean
}) {
  // Trouver la meilleure valeur
  const numericValues = values.map((v) => typeof v === 'number' ? v : null)
  let bestIndex = -1
  
  if (highlight !== 'none') {
    const validValues = numericValues.filter((v): v is number => v !== null)
    if (validValues.length > 0) {
      const target = highlight === 'min' 
        ? Math.min(...validValues) 
        : Math.max(...validValues)
      bestIndex = numericValues.findIndex((v) => v === target)
    }
  }
  
  const formatValue = (value: string | number | boolean | React.ReactNode | undefined, index: number) => {
    if (value === undefined || value === null) {
      return <Minus className="w-4 h-4 text-aquiz-gray-lighter mx-auto" />
    }
    
    const isBest = index === bestIndex
    
    switch (format) {
      case 'prix':
        return (
          <span className={`font-medium ${isBest ? 'text-aquiz-green' : 'text-aquiz-black'}`}>
            {typeof value === 'number' ? value.toLocaleString('fr-FR') : value} €
          </span>
        )
      case 'dpe':
        return value
      case 'boolean':
        return value ? (
          <div className="flex justify-center">
            <div className="w-6 h-6 rounded-full bg-aquiz-green/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-aquiz-green" />
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-6 h-6 rounded-full bg-aquiz-gray-lightest flex items-center justify-center">
              <X className="w-3 h-3 text-aquiz-gray-light" />
            </div>
          </div>
        )
      default:
        return <span className={isBest ? 'font-semibold text-aquiz-green' : ''}>{String(value)}</span>
    }
  }
  
  return (
    <tr className={`border-b border-aquiz-gray-lightest ${muted ? 'opacity-50' : ''}`}>
      <td className="py-3 px-4 text-sm text-aquiz-gray">
        {label}
      </td>
      {values.map((value, index) => (
        <td key={index} className="py-3 px-4 text-center text-sm">
          {formatValue(value, index)}
        </td>
      ))}
    </tr>
  )
}

// calculerMensualite importé depuis @/lib/comparateur/financier

export function TableauComparaison({
  annonces,
  statistiques,
  budgetMax,
  onRemove,
  onRequestHelp,
  tauxInteret,
  dureeAns,
  apport
}: TableauComparaisonProps) {
  const [showRadar, setShowRadar] = useState(false)
  
  // Hook pour l'analyse enrichie avec les APIs (DVF, Géorisques, OSM)
  const { 
    getAnalyse: getAnalyseEnrichie, 
    isLoading: isLoadingEnrichie,
    loadingIds
  } = useAnalyseEnrichie(annonces)
  
  // === MOTEUR DE SCORING PRO UNIFIÉ ===
  const scoresPro = useMemo(() => {
    return annonces.map(annonce => {
      const enrichie = getAnalyseEnrichie(annonce.id)
      const enrichiScoring = toEnrichiesScoring(enrichie ?? null)
      return calculerScorePro(annonce, annonces, enrichiScoring, budgetMax)
    })
  }, [annonces, budgetMax, getAnalyseEnrichie])
  
  const { syntheseGlobale, conseilGeneral } = useMemo(
    () => genererSyntheseComparaison(scoresPro),
    [scoresPro]
  )
  
  const getScorePro = (id: string) => scoresPro.find(s => s.annonceId === id)
  const getAnalyse = getScorePro // Alias pour les sections points forts/attention/conseils
  const meilleurScore = Math.max(...scoresPro.map(s => s.scoreGlobal), 0)
  
  // Adaptateur pour compatibilité VueMobileAccordeon (anciens types)
  const analysesEnrichies = useMemo(() => {
    return scoresPro.map(sp => ({
      annonceId: sp.annonceId,
      score: sp.scoreGlobal,
      scoreEnrichi: sp.scoreGlobal,
      verdict: sp.verdict,
      points: sp.points.map(p => ({
        texte: p.texte,
        detail: p.detail,
        type: p.type
      })),
      conseilPerso: sp.conseilPerso
    }))
  }, [scoresPro])
  
  // Préparer les enrichissements pour la vue mobile
  const enrichissementsMap = useMemo(() => {
    const map = new Map<string, {
      marche?: { success: boolean; ecartPrixM2?: number; verdict?: string }
      risques?: { success: boolean; verdict?: string }
      quartier?: { success: boolean; scoreQuartier?: number }
    }>()
    annonces.forEach(a => {
      const enrichie = getAnalyseEnrichie(a.id)
      if (enrichie) {
        map.set(a.id, enrichie)
      }
    })
    return map
  }, [annonces, getAnalyseEnrichie])
  
  if (annonces.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-aquiz-gray-lightest flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-aquiz-gray-light" />
        </div>
        <p className="text-aquiz-gray">Sélectionnez des annonces pour les comparer</p>
      </div>
    )
  }
  
  return (
    <>
      {/* Vue Mobile - Accordéon */}
      <VueMobileAccordeon
        annonces={annonces}
        analysesEnrichies={analysesEnrichies}
        enrichissements={enrichissementsMap}
        meilleurRapportId={statistiques.meilleurRapportId}
        budgetMax={budgetMax}
        mensualiteParams={tauxInteret !== undefined && dureeAns ? { tauxInteret, dureeAns, apport: apport || 0 } : undefined}
        conseilGeneral={conseilGeneral}
        onRemove={onRemove}
        onRequestHelp={onRequestHelp}
      />
      
      {/* Vue Desktop - Tableau */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            {/* Header avec cartes des biens */}
            <thead>
              <tr className="border-b border-aquiz-gray-lighter">
                <th className="py-4 px-4 text-left w-44">
                  <span className="text-xs text-aquiz-gray uppercase tracking-wider">Comparaison</span>
                </th>
                {annonces.map((annonce) => {
                  const IconType = annonce.type === 'maison' ? Home : Building2
                  const isMeilleurRapport = annonce.id === statistiques.meilleurRapportId
                  
                  return (
                    <th key={annonce.id} className="py-4 px-3 min-w-[180px]">
                      <div className="relative">
                        {/* Badge recommandé */}
                        {isMeilleurRapport && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                            <Badge className="bg-aquiz-green text-white text-[10px] shadow-sm whitespace-nowrap">
                              <Sparkles className="w-3 h-3 mr-1" />
                          Recommandé
                        </Badge>
                      </div>
                    )}
                    
                    {/* Carte du bien */}
                    <div className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                      isMeilleurRapport ? 'border-aquiz-green shadow-lg shadow-aquiz-green/10' : 'border-aquiz-gray-lighter'
                    }`}>
                      {/* Image */}
                      <div className="relative h-20 bg-gradient-to-br from-aquiz-gray-lightest to-aquiz-gray-lighter">
                        {annonce.imageUrl ? (
                          <img src={annonce.imageUrl} alt={annonce.titre || 'Bien immobilier'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <IconType className="w-7 h-7 text-aquiz-gray-light" />
                          </div>
                        )}
                        
                        {/* Bouton supprimer */}
                        <button
                          onClick={() => onRemove(annonce.id)}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
                        >
                          <Trash2 className="w-2.5 h-2.5 text-aquiz-gray hover:text-red-500" />
                        </button>
                        
                        {/* DPE */}
                        <Badge className={`absolute bottom-1.5 right-1.5 text-[9px] px-1.5 py-0.5 ${COULEURS_DPE[annonce.dpe]} text-white`}>
                          {annonce.dpe}
                        </Badge>
                      </div>
                      
                      {/* Infos */}
                      <div className="p-2.5 bg-white">
                        <div className={`text-base font-bold ${isMeilleurRapport ? 'text-aquiz-green' : 'text-aquiz-black'}`}>
                          {annonce.prix.toLocaleString('fr-FR')} €
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-aquiz-gray mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          <span className="truncate">{annonce.ville}</span>
                        </div>
                        {annonce.url && (
                          <a 
                            href={annonce.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-aquiz-green hover:underline mt-1"
                          >
                            Voir l&apos;annonce <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        
        <tbody>
          {/* Section Prix & Financement */}
          <tr className="bg-aquiz-gray-lightest/50">
            <td colSpan={annonces.length + 1} className="py-2 px-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase tracking-wider">
                <CreditCard className="w-3.5 h-3.5" />
                Prix & Financement
              </div>
            </td>
          </tr>
          
          <LigneComparaison
            label="Prix d'achat"
            values={annonces.map((a) => a.prix)}
            format="prix"
            highlight="min"
          />
          
          <LigneComparaison
            label="Prix au m²"
            values={annonces.map((a) => a.prixM2)}
            format="prix"
            highlight="min"
          />
          
          {/* Mensualité estimée si les paramètres de financement sont fournis */}
          {tauxInteret !== undefined && dureeAns && (
            <tr className="border-b border-aquiz-gray-lightest">
              <td className="py-3 px-4 text-sm text-aquiz-gray flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-aquiz-green" />
                <span>Mensualité estimée</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-aquiz-gray-light cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    <p>Calculée sur {dureeAns} ans à {tauxInteret.toFixed(2)}%</p>
                    {apport ? <p>Apport déduit : {apport.toLocaleString('fr-FR')} €</p> : null}
                  </TooltipContent>
                </Tooltip>
              </td>
              {annonces.map((a) => {
                const mensualite = calculerMensualite(a.prix, apport || 0, tauxInteret, dureeAns)
                return (
                  <td key={a.id} className="py-3 px-4 text-center text-sm">
                    <span className="font-medium text-aquiz-black">
                      {mensualite.toLocaleString('fr-FR')} €/mois
                    </span>
                  </td>
                )
              })}
            </tr>
          )}
          
          {annonces.some((a) => a.chargesMensuelles) && (
            <LigneComparaison
              label="Charges / mois"
              values={annonces.map((a) => a.chargesMensuelles ? `${a.chargesMensuelles} €` : undefined)}
            />
          )}
          
          {annonces.some((a) => a.taxeFonciere) && (
            <LigneComparaison
              label="Taxe foncière / an"
              values={annonces.map((a) => a.taxeFonciere ? `${a.taxeFonciere} €` : undefined)}
            />
          )}

          {/* Frais de notaire estimés */}
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-3 px-4 text-sm text-aquiz-gray flex items-center gap-2">
              <span>Frais de notaire estimés</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-aquiz-gray-light cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  <p>Neuf (&lt;5 ans) : ~2,5% • Ancien : ~7,5%</p>
                </TooltipContent>
              </Tooltip>
            </td>
            {annonces.map((a) => {
              const { montant, isNeuf } = estimerFraisNotaire(a.prix, a.anneeConstruction)
              return (
                <td key={a.id} className="py-3 px-4 text-center text-sm">
                  <span className="font-medium text-aquiz-black">{montant.toLocaleString('fr-FR')} €</span>
                  <div className="text-[10px] text-aquiz-gray">{isNeuf ? 'Neuf' : 'Ancien'}</div>
                </td>
              )
            })}
          </tr>

          {/* Coût total d'acquisition */}
          <tr className="border-b border-aquiz-gray-lightest bg-aquiz-green/5">
            <td className="py-3 px-4 text-sm font-medium text-aquiz-black flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-aquiz-green" />
              <span>Coût total d&apos;acquisition</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-aquiz-gray-light cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  <p>Prix + frais de notaire + travaux estimés</p>
                </TooltipContent>
              </Tooltip>
            </td>
            {annonces.map((a) => {
              const sp = getScorePro(a.id)
              const { montant: notaire } = estimerFraisNotaire(a.prix, a.anneeConstruction)
              const travaux = sp?.estimations.budgetTravauxEstime || 0
              const total = calculerCoutTotal(a.prix, notaire, travaux)
              return (
                <td key={a.id} className="py-3 px-4 text-center text-sm">
                  <span className="font-bold text-aquiz-black text-base">{total.toLocaleString('fr-FR')} €</span>
                  {travaux > 0 && (
                    <div className="text-[10px] text-orange-600">dont ~{travaux.toLocaleString('fr-FR')} € travaux</div>
                  )}
                </td>
              )
            })}
          </tr>
          
          {/* Section Caractéristiques */}
          <tr className="bg-aquiz-gray-lightest/50">
            <td colSpan={annonces.length + 1} className="py-2 px-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase tracking-wider">
                <Home className="w-3.5 h-3.5" />
                Caractéristiques
              </div>
            </td>
          </tr>
          
          <LigneComparaison
            label="Type de bien"
            values={annonces.map((a) => a.type === 'appartement' ? 'Appartement' : 'Maison')}
          />
          
          <LigneComparaison
            label="Surface"
            values={annonces.map((a) => `${a.surface} m²`)}
            highlight="max"
          />
          
          <LigneComparaison
            label="Pièces"
            values={annonces.map((a) => a.pieces)}
            highlight="max"
          />
          
          <LigneComparaison
            label="Chambres"
            values={annonces.map((a) => a.chambres)}
            highlight="max"
          />
          
          <LigneComparaison
            label="Étage"
            values={annonces.map((a) => 
              a.type === 'appartement' 
                ? a.etage === 0 ? 'RDC' : a.etage ? `${a.etage}e` : undefined
                : undefined
            )}
            muted={!annonces.some(a => a.type === 'appartement')}
          />

          {annonces.some((a) => a.anneeConstruction) && (
            <LigneComparaison
              label="Année de construction"
              values={annonces.map((a) => a.anneeConstruction ? String(a.anneeConstruction) : undefined)}
            />
          )}

          {annonces.some((a) => a.orientation) && (
            <LigneComparaison
              label="Orientation"
              values={annonces.map((a) => a.orientation || undefined)}
            />
          )}

          {annonces.some((a) => a.nbSallesBains) && (
            <LigneComparaison
              label="Salles de bains"
              values={annonces.map((a) => a.nbSallesBains || undefined)}
            />
          )}
          
          {/* Section Performance */}
          <tr className="bg-aquiz-gray-lightest/50">
            <td colSpan={annonces.length + 1} className="py-2 px-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                Performance énergétique
              </div>
            </td>
          </tr>
          
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-3 px-4 text-sm text-aquiz-gray">Diagnostic DPE</td>
            {annonces.map((a) => (
              <td key={a.id} className="py-3 px-4 text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Badge className={`${COULEURS_DPE[a.dpe]} text-white text-xs cursor-help`}>
                        Classe {a.dpe}
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {a.ges ? (
                      <p>Émissions GES : classe {a.ges}</p>
                    ) : (
                      <p>GES non renseigné</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </td>
            ))}
          </tr>
          
          {/* Section Équipements */}
          <tr className="bg-aquiz-gray-lightest/50">
            <td colSpan={annonces.length + 1} className="py-2 px-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase tracking-wider">
                <Key className="w-3.5 h-3.5" />
                Équipements
              </div>
            </td>
          </tr>
          
          <LigneComparaison
            label="Balcon / Terrasse"
            values={annonces.map((a) => a.balconTerrasse)}
            format="boolean"
          />
          
          <LigneComparaison
            label="Parking / Garage"
            values={annonces.map((a) => a.parking)}
            format="boolean"
          />
          
          {annonces.some((a) => a.type === 'appartement') && (
            <LigneComparaison
              label="Ascenseur"
              values={annonces.map((a) => a.type === 'appartement' ? a.ascenseur : undefined)}
              format="boolean"
            />
          )}
          
          <LigneComparaison
            label="Cave"
            values={annonces.map((a) => a.cave)}
            format="boolean"
          />
          
          {/* Comparaison budget si disponible */}
          {budgetMax && (
            <>
              <tr className="bg-aquiz-green/5">
                <td colSpan={annonces.length + 1} className="py-2 px-4 text-xs font-semibold text-aquiz-green uppercase tracking-wider">
                  Par rapport à votre budget ({budgetMax.toLocaleString('fr-FR')} €)
                </td>
              </tr>
              
              <tr className="border-b border-aquiz-gray-lightest">
                <td className="py-3 px-4 text-sm text-aquiz-gray">
                  Écart
                </td>
                {annonces.map((annonce) => {
                  const ecart = budgetMax - annonce.prix
                  const pourcent = Math.round((annonce.prix / budgetMax) * 100)
                  const isOver = ecart < 0
                  
                  return (
                    <td key={annonce.id} className="py-3 px-4 text-center">
                      <div className={`text-base font-bold ${isOver ? 'text-red-500' : 'text-aquiz-green'}`}>
                        {isOver ? '' : '+'}{ecart.toLocaleString('fr-FR')} €
                      </div>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          pourcent <= 85 ? 'bg-aquiz-green/10 text-aquiz-green' :
                          pourcent <= 100 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {pourcent <= 85 ? 'Confortable' :
                           pourcent <= 100 ? 'Serré' :
                           'Dépassé'}
                        </span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            </>
          )}
          
          {/* === SECTION LOCALISATION & MARCHÉ === */}
          <tr className="bg-aquiz-gray-lightest/50">
            <td colSpan={annonces.length + 1} className="py-2 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5" />
                  Localisation & Marché
                </div>
                {isLoadingEnrichie && (
                  <div className="flex items-center gap-1.5 text-aquiz-gray">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-[10px]">Chargement données...</span>
                  </div>
                )}
              </div>
            </td>
          </tr>
          
          {/* Comparaison au prix du marché (DVF) */}
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-4 px-4 text-sm text-aquiz-black align-top">
              <span className="flex items-center gap-1.5 font-medium">
                <Building2 className="w-4 h-4 text-blue-600" />
                Prix vs Marché
              </span>
              <span className="text-[9px] text-aquiz-gray block mt-0.5">Basé sur les ventes récentes du secteur</span>
            </td>
            {annonces.map((annonce) => {
              const analyseE = getAnalyseEnrichie(annonce.id)
              const isLoadingThis = loadingIds.has(annonce.id)
              
              if (isLoadingThis) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-top text-center">
                    <Loader2 className="w-4 h-4 animate-spin text-aquiz-gray mx-auto" />
                  </td>
                )
              }
              
              if (!analyseE || !analyseE.marche.success) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-top text-center">
                    <span className="text-[10px] text-aquiz-gray">Non disponible</span>
                  </td>
                )
              }
              
              const { marche } = analyseE
              
              return (
                <td key={annonce.id} className="py-4 px-3 align-top">
                  <div className="space-y-2">
                    {/* Écart prix */}
                    <div className={`flex items-center justify-center gap-1.5 p-2 rounded-lg ${
                      marche.verdict === 'excellent' || marche.verdict === 'bon'
                        ? 'bg-aquiz-green/10 border border-aquiz-green/20'
                        : marche.verdict === 'correct'
                          ? 'bg-orange-50 border border-orange-200'
                          : 'bg-red-50 border border-red-200'
                    }`}>
                      {marche.ecartPrixM2 && marche.ecartPrixM2 <= 0 ? (
                        <TrendingDown className={`w-4 h-4 ${
                          marche.verdict === 'excellent' || marche.verdict === 'bon' ? 'text-aquiz-green' : 'text-orange-600'
                        }`} />
                      ) : (
                        <TrendingUp className={`w-4 h-4 ${
                          marche.verdict === 'correct' ? 'text-orange-600' : 'text-red-500'
                        }`} />
                      )}
                      <span className={`text-sm font-bold ${
                        marche.verdict === 'excellent' || marche.verdict === 'bon'
                          ? 'text-aquiz-green'
                          : marche.verdict === 'correct'
                            ? 'text-orange-700'
                            : 'text-red-600'
                      }`}>
                        {marche.ecartPrixM2 !== undefined && (
                          marche.ecartPrixM2 <= 0 
                            ? `${Math.abs(marche.ecartPrixM2).toFixed(0)}% sous marché`
                            : `+${marche.ecartPrixM2.toFixed(0)}% vs marché`
                        )}
                      </span>
                    </div>
                    
                    {/* Prix médian */}
                    <div className="text-center">
                      <div className="text-[10px] text-aquiz-gray">Médiane secteur</div>
                      <div className="text-xs font-medium">{marche.prixM2MedianMarche?.toLocaleString('fr-FR')} €/m²</div>
                    </div>
                    
                    {/* Transactions */}
                    {marche.nbTransactions && (
                      <div className="text-[9px] text-aquiz-gray text-center">
                        Basé sur {marche.nbTransactions} ventes
                      </div>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>
          
          {/* Risques environnementaux (Géorisques) */}
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-4 px-4 text-sm text-aquiz-black align-top">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                Risques zone
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-aquiz-gray-light cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px] text-xs">
                    <p>Analyse des risques dans un rayon de 1km : inondation, séisme, radon, sites SEVESO</p>
                  </TooltipContent>
                </Tooltip>
              </span>
              <span className="text-[9px] text-aquiz-gray block mt-0.5">Données gouvernementales (georisques.gouv.fr)</span>
            </td>
            {annonces.map((annonce) => {
              const analyseE = getAnalyseEnrichie(annonce.id)
              const isLoadingThis = loadingIds.has(annonce.id)
              
              if (isLoadingThis) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-top text-center">
                    <Loader2 className="w-4 h-4 animate-spin text-aquiz-gray mx-auto" />
                  </td>
                )
              }
              
              if (!analyseE || !analyseE.risques.success) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-top text-center">
                    <span className="text-[10px] text-aquiz-gray">Non disponible</span>
                  </td>
                )
              }
              
              const { risques } = analyseE
              const totalRisques = (risques.risquesNaturels?.length || 0) + (risques.risquesTechnos?.length || 0)
              
              return (
                <td key={annonce.id} className="py-4 px-3 align-top">
                  <div className="space-y-2">
                    {/* Score sécurité */}
                    <div className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
                      risques.verdict === 'sûr'
                        ? 'bg-aquiz-green/10 border border-aquiz-green/20'
                        : risques.verdict === 'vigilance'
                          ? 'bg-orange-50 border border-orange-200'
                          : 'bg-red-50 border border-red-200'
                    }`}>
                      {risques.verdict === 'sûr' ? (
                        <ShieldCheck className="w-4 h-4 text-aquiz-green" />
                      ) : (
                        <ShieldAlert className={`w-4 h-4 ${
                          risques.verdict === 'vigilance' ? 'text-orange-600' : 'text-red-500'
                        }`} />
                      )}
                      <span className={`text-sm font-bold ${
                        risques.verdict === 'sûr' ? 'text-aquiz-green' :
                        risques.verdict === 'vigilance' ? 'text-orange-700' : 'text-red-600'
                      }`}>
                        {risques.verdict === 'sûr' ? 'Zone sûre' :
                         risques.verdict === 'vigilance' ? 'Vigilance' : 'À risques'}
                      </span>
                    </div>
                    
                    {/* Détails risques */}
                    {totalRisques > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {risques.risquesNaturels?.slice(0, 2).map((r, i) => (
                          <Badge key={i} variant="outline" className="text-[8px] px-1 py-0 bg-orange-50 text-orange-700 border-orange-200">
                            {r}
                          </Badge>
                        ))}
                        {risques.risquesTechnos?.slice(0, 1).map((r, i) => (
                          <Badge key={i} variant="outline" className="text-[8px] px-1 py-0 bg-red-50 text-red-600 border-red-200">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Zone inondable */}
                    {risques.zoneInondable && (
                      <div className="flex items-center gap-1 text-[9px] text-blue-600 font-medium">
                        <Droplets className="w-3 h-3" />
                        Zone inondable
                      </div>
                    )}
                    
                    {/* Aucun risque */}
                    {totalRisques === 0 && !risques.zoneInondable && (
                      <div className="flex items-center justify-center gap-1 text-[9px] text-aquiz-green font-medium">
                        <Check className="w-3 h-3" />
                        Aucun risque majeur
                      </div>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>
          
          {/* Score quartier (OpenStreetMap) */}
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-4 px-4 text-sm text-aquiz-black align-top">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-4 h-4 text-purple-600" />
                Score quartier
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-aquiz-gray-light cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[220px] text-xs">
                    <p>Analyse des commodités dans un rayon de 800m :</p>
                    <ul className="mt-1 space-y-0.5 text-[10px]">
                      <li>• Transports : 25%</li>
                      <li>• Commerces : 20%</li>
                      <li>• Éducation : 20%</li>
                      <li>• Santé : 15%</li>
                      <li>• Loisirs & verts : 20%</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </span>
              <span className="text-[9px] text-aquiz-gray block mt-0.5">Commodités dans un rayon de 800m</span>
            </td>
            {annonces.map((annonce) => {
              const analyseE = getAnalyseEnrichie(annonce.id)
              const isLoadingThis = loadingIds.has(annonce.id)
              
              if (isLoadingThis) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-top text-center">
                    <Loader2 className="w-4 h-4 animate-spin text-aquiz-gray mx-auto" />
                  </td>
                )
              }
              
              if (!analyseE || !analyseE.quartier.success) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-top text-center">
                    <span className="text-[10px] text-aquiz-gray">Non disponible</span>
                  </td>
                )
              }
              
              const { quartier } = analyseE
              
              return (
                <td key={annonce.id} className="py-4 px-3 align-top">
                  <div className="space-y-2">
                    {/* Score global quartier */}
                    <div className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
                      quartier.scoreQuartier && quartier.scoreQuartier >= 60
                        ? 'bg-aquiz-green/10 border border-aquiz-green/20'
                        : quartier.scoreQuartier && quartier.scoreQuartier >= 40
                          ? 'bg-orange-50 border border-orange-200'
                          : 'bg-gray-100 border border-gray-200'
                    }`}>
                      <MapPin className={`w-4 h-4 ${
                        quartier.scoreQuartier && quartier.scoreQuartier >= 60 ? 'text-aquiz-green' :
                        quartier.scoreQuartier && quartier.scoreQuartier >= 40 ? 'text-orange-600' : 'text-gray-500'
                      }`} />
                      <span className={`text-lg font-bold ${
                        quartier.scoreQuartier && quartier.scoreQuartier >= 60 ? 'text-aquiz-green' :
                        quartier.scoreQuartier && quartier.scoreQuartier >= 40 ? 'text-orange-700' : 'text-gray-600'
                      }`}>
                        {quartier.scoreQuartier}/100
                      </span>
                    </div>
                    
                    {/* Détails par catégorie */}
                    <div className="grid grid-cols-3 gap-1">
                      {quartier.transports !== undefined && (
                        <div className="text-center p-1 rounded bg-gray-50">
                          <Train className={`w-3 h-3 mx-auto mb-0.5 ${
                            quartier.transports >= 50 ? 'text-aquiz-green' : 'text-gray-400'
                          }`} />
                          <div className="text-[8px] text-aquiz-gray">Transport</div>
                          <div className="text-[10px] font-medium">{quartier.transports}</div>
                        </div>
                      )}
                      {quartier.commerces !== undefined && (
                        <div className="text-center p-1 rounded bg-gray-50">
                          <ShoppingBag className={`w-3 h-3 mx-auto mb-0.5 ${
                            quartier.commerces >= 50 ? 'text-aquiz-green' : 'text-gray-400'
                          }`} />
                          <div className="text-[8px] text-aquiz-gray">Commerces</div>
                          <div className="text-[10px] font-medium">{quartier.commerces}</div>
                        </div>
                      )}
                      {quartier.espaceVerts !== undefined && (
                        <div className="text-center p-1 rounded bg-gray-50">
                          <Trees className={`w-3 h-3 mx-auto mb-0.5 ${
                            quartier.espaceVerts >= 50 ? 'text-aquiz-green' : 'text-gray-400'
                          }`} />
                          <div className="text-[8px] text-aquiz-gray">Verts</div>
                          <div className="text-[10px] font-medium">{quartier.espaceVerts}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Verdict */}
                    {quartier.verdict && (
                      <div className="flex items-center justify-center gap-1 text-[9px] text-aquiz-gray">
                        {quartier.verdict === 'excellent' ? (
                          <><Star className="w-3 h-3 text-yellow-500" /> Très bien équipé</>
                        ) : quartier.verdict === 'bon' ? (
                          <><ThumbsUp className="w-3 h-3 text-aquiz-green" /> Bien desservi</>
                        ) : quartier.verdict === 'moyen' ? (
                          <><Car className="w-3 h-3 text-orange-500" /> Véhicule conseillé</>
                        ) : (
                          <><TreePine className="w-3 h-3 text-green-600" /> Zone calme</>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>
          
          {/* === SECTION ANALYSE AQUIZ === */}
          <tr className="bg-gradient-to-r from-aquiz-green/5 to-aquiz-green/10">
            <td colSpan={annonces.length + 1} className="py-2 px-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-aquiz-green" />
                Analyse AQUIZ
              </div>
              <div className="text-[11px] text-aquiz-gray mt-0.5">{syntheseGlobale}</div>
            </td>
          </tr>
          
          {/* Score global pro */}
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-4 px-4 text-sm font-medium text-aquiz-black">
              <div className="flex items-center gap-1.5">
                Score global
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-aquiz-gray-light cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[220px] text-xs">
                    <p>Score basé sur le prix du marché, l’énergie, l’emplacement, les risques, l’état du bien et les équipements.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </td>
            {annonces.map((annonce) => {
              const sp = getScorePro(annonce.id)
              const isLoadingThis = loadingIds.has(annonce.id)
              if (!sp) return <td key={annonce.id} className="py-4 px-4 text-center">-</td>
              
              const isBest = sp.scoreGlobal === meilleurScore && annonces.length > 1
              
              return (
                <td key={annonce.id} className="py-4 px-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    {isLoadingThis ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-aquiz-gray" />
                        <span className="text-xs text-aquiz-gray">Analyse...</span>
                      </div>
                    ) : (
                      <>
                        <div className={`text-3xl font-bold ${
                          sp.scoreGlobal >= 70 ? 'text-aquiz-green' :
                          sp.scoreGlobal >= 50 ? 'text-orange-500' :
                          'text-red-500'
                        }`}>
                          {sp.scoreGlobal}
                          <span className="text-xs text-aquiz-gray font-normal ml-0.5">/100</span>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          sp.scoreGlobal >= 70 ? 'bg-aquiz-green/10 text-aquiz-green' :
                          sp.scoreGlobal >= 50 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {sp.verdict}
                        </span>
                        {isBest && (
                          <span className="text-[10px] font-semibold text-white bg-aquiz-green px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Meilleur choix
                          </span>
                        )}
                        {/* Analyse partielle si peu de données */}
                        {sp.confiance < 60 && (
                          <span className="text-[9px] text-aquiz-gray italic">Analyse partielle</span>
                        )}
                      </>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>
          
          {/* Coût énergie estimé */}
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-3 px-4 text-sm text-aquiz-gray">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-500" />
                Coût énergie estimé
              </div>
            </td>
            {annonces.map((annonce) => {
              const sp = getScorePro(annonce.id)
              if (!sp?.estimations.coutEnergieAnnuel) return <td key={annonce.id} className="py-3 px-4 text-center">-</td>
              return (
                <td key={annonce.id} className="py-3 px-4 text-center">
                  <span className="text-sm font-medium text-aquiz-black">
                    {sp.estimations.coutEnergieAnnuel.toLocaleString('fr-FR')} €/an
                  </span>
                  <div className="text-[10px] text-aquiz-gray">
                    ~{Math.round(sp.estimations.coutEnergieAnnuel / 12)} €/mois
                  </div>
                </td>
              )
            })}
          </tr>
          
          {scoresPro.some(sp => sp.estimations.budgetTravauxEstime) && (
            <tr className="border-b border-aquiz-gray-lightest">
              <td className="py-3 px-4 text-sm text-aquiz-gray">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                  Budget travaux estimé
                </div>
              </td>
              {annonces.map((annonce) => {
                const sp = getScorePro(annonce.id)
                const travaux = sp?.estimations.budgetTravauxEstime
                return (
                  <td key={annonce.id} className="py-3 px-4 text-center">
                    {travaux ? (
                      <span className={`text-sm font-bold ${travaux > 20000 ? 'text-red-500' : travaux > 5000 ? 'text-orange-500' : 'text-aquiz-gray'}`}>
                        ~{travaux.toLocaleString('fr-FR')} €
                      </span>
                    ) : (
                      <span className="text-[11px] text-aquiz-green font-medium flex items-center gap-1 justify-center">
                        <CircleCheck className="w-3 h-3" /> Aucun
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          )}

          {/* Radar Chart */}
          {annonces.length >= 2 && (
            <tr className="border-b border-aquiz-gray-lightest">
              <td colSpan={annonces.length + 1} className="py-4 px-4">
                <button 
                  onClick={() => setShowRadar(!showRadar)}
                  className="flex items-center gap-2 text-xs font-medium text-aquiz-green hover:text-aquiz-green-dark transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {showRadar ? 'Masquer' : 'Voir'} le radar comparatif
                </button>
                {showRadar && (
                  <div className="mt-4 flex justify-center">
                    <RadarChart
                      data={annonces.map((a, i) => {
                        const sp = getScorePro(a.id)
                        return {
                          id: a.id,
                          nom: a.titre || a.ville,
                          couleur: COULEURS_RADAR[i % COULEURS_RADAR.length],
                          valeurs: sp ? scoreToRadarData(sp) : RADAR_AXES.map(ax => ({ label: ax.key, value: 50 }))
                        }
                      })}
                      size={300}
                    />
                  </div>
                )}
              </td>
            </tr>
          )}
          
          {/* Détail axes scoring (condensé) */}
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-3 px-4 text-sm text-aquiz-gray">
              <span className="text-[10px] uppercase tracking-wider font-semibold">Détail par axe</span>
            </td>
            {annonces.map((annonce) => {
              const sp = getScorePro(annonce.id)
              if (!sp) return <td key={annonce.id} className="py-3 px-3">-</td>
              
              const axesDispo = sp.axes.filter(a => a.disponible)
              return (
                <td key={annonce.id} className="py-3 px-3 align-top">
                  <div className="space-y-1.5">
                    {axesDispo.map(axe => (
                      <div key={axe.axe} className="flex items-center gap-2">
                        <div className="w-16 text-[9px] text-aquiz-gray truncate">{axe.label}</div>
                        <div className="flex-1 h-1.5 bg-aquiz-gray-lightest rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              axe.score >= 70 ? 'bg-aquiz-green' : axe.score >= 45 ? 'bg-orange-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${axe.score}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-medium w-6 text-right ${
                          axe.score >= 70 ? 'text-aquiz-green' : axe.score >= 45 ? 'text-orange-600' : 'text-red-500'
                        }`}>
                          {axe.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
              )
            })}
          </tr>
          
          {/* Points forts détaillés */}
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-4 px-4 text-sm text-aquiz-black align-top">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-4 h-4 text-aquiz-green" />
                Points forts
              </span>
            </td>
            {annonces.map((annonce) => {
              const analyse = getAnalyse(annonce.id)
              const avantages = analyse?.points.filter(p => p.type === 'avantage') || []
              return (
                <td key={annonce.id} className="py-4 px-3 align-top">
                  {avantages.length > 0 ? (
                    <div className="space-y-2">
                      {avantages.map((point, i) => (
                        <div key={i} className="bg-aquiz-green/5 border border-aquiz-green/20 rounded-lg p-2">
                          <div className="text-xs font-medium text-aquiz-green flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {point.texte}
                          </div>
                          {point.detail && (
                            <p className="text-[10px] text-aquiz-gray mt-1 leading-relaxed">
                              {point.detail}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-aquiz-gray italic">Aucun point fort identifié</span>
                  )}
                </td>
              )
            })}
          </tr>
          
          {/* Points d'attention détaillés */}
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-4 px-4 text-sm text-aquiz-black align-top">
              <span className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Points d&apos;attention
              </span>
            </td>
            {annonces.map((annonce) => {
              const analyse = getAnalyse(annonce.id)
              const attentions = analyse?.points.filter(p => p.type === 'attention') || []
              return (
                <td key={annonce.id} className="py-4 px-3 align-top">
                  {attentions.length > 0 ? (
                    <div className="space-y-2">
                      {attentions.map((point, i) => (
                        <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                          <div className="text-xs font-medium text-orange-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {point.texte}
                          </div>
                          {point.detail && (
                            <p className="text-[10px] text-orange-600 mt-1 leading-relaxed">
                              {point.detail}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-aquiz-green font-medium flex items-center gap-1">
                      <CircleCheck className="w-3.5 h-3.5" />
                      Aucun point de vigilance
                    </span>
                  )}
                </td>
              )
            })}
          </tr>
          
          {/* Conseils personnalisés */}
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-4 px-4 text-sm text-aquiz-black align-top">
              <span className="flex items-center gap-1.5 font-medium">
                <Info className="w-4 h-4 text-aquiz-gray" />
                Conseils à considérer
              </span>
            </td>
            {annonces.map((annonce) => {
              const analyse = getAnalyse(annonce.id)
              const conseils = analyse?.points.filter(p => p.type === 'conseil') || []
              return (
                <td key={annonce.id} className="py-4 px-3 align-top">
                  {conseils.length > 0 ? (
                    <div className="space-y-2">
                      {conseils.map((point, i) => (
                        <div key={i} className="bg-aquiz-gray-lightest border border-aquiz-gray-lighter rounded-lg p-2">
                          <div className="text-xs font-medium text-aquiz-gray-dark flex items-center gap-1">
                            <Info className="w-3 h-3 text-aquiz-gray" />
                            {point.texte}
                          </div>
                          {point.detail && (
                            <p className="text-[10px] text-aquiz-gray mt-1 leading-relaxed">
                              {point.detail}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-aquiz-gray italic">-</span>
                  )}
                </td>
              )
            })}
          </tr>
          
          {/* Notre avis personnalisé */}
          <tr>
            <td className="py-4 px-4 text-sm font-medium text-aquiz-black align-top">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-aquiz-gray" />
                Notre avis
              </span>
            </td>
            {annonces.map((annonce) => {
              const analyse = getAnalyse(annonce.id)
              return (
                <td key={annonce.id} className="py-4 px-3 align-top">
                  <div className="bg-aquiz-gray-lightest rounded-lg p-3">
                    <p className="text-xs text-aquiz-gray-dark leading-relaxed italic">
                      &ldquo;{analyse?.conseilPerso || 'Visitez le bien pour vous faire votre propre avis.'}&rdquo;
                    </p>
                  </div>
                </td>
              )
            })}
          </tr>
        </tbody>
        
        {/* Footer avec conseil général et CTA */}
        <tfoot>
          <tr className="bg-gradient-to-r from-aquiz-green/5 to-aquiz-green/10 border-t border-aquiz-green/20">
            <td colSpan={annonces.length + 1} className="py-5 px-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                    className="flex items-center justify-center gap-2 bg-aquiz-green hover:bg-aquiz-green-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-aquiz-green/20 whitespace-nowrap shrink-0"
                  >
                    <Phone className="w-4 h-4" />
                    Parler à un expert
                  </button>
                )}
              </div>
            </td>
          </tr>
        </tfoot>
          </table>
        </div>
      </div>
    </>
  )
}
