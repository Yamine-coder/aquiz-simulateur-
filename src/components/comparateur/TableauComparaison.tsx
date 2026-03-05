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
} from '@/lib/comparateur/scoreComparateur'
import { toEnrichiesScoring } from '@/lib/comparateur/toEnrichiesScoring'
import type { Annonce, NouvelleAnnonce, StatistiquesComparaison } from '@/types/annonces'
import { COULEURS_DPE } from '@/types/annonces'
import {
    Building2,
    Check,
    CreditCard,
    ExternalLink,
    FileDown,
    Footprints,
    Home,
    Info,
    Key,
    Loader2,
    MapPin,
    Minus,
    Sparkles,
    Trash2,
    TrendingUp,
    X,
    Zap
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useRef } from 'react'
import { EditableCell, type EditableFieldType } from './EditableCell'
import { MiniRadar } from './MiniRadar'
import { LineBadge, TypeBadge } from './TransportIcons'
import { VueMobileAccordeon } from './VueMobileAccordeon'

/** Couleur du score */
function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-600'
  if (score >= 60) return 'text-lime-600'
  if (score >= 45) return 'text-amber-500'
  return 'text-red-500'
}

function getScoreBg(score: number): string {
  if (score >= 75) return 'bg-green-100'
  if (score >= 60) return 'bg-lime-100'
  if (score >= 45) return 'bg-amber-100'
  return 'bg-red-100'
}


interface TableauComparaisonProps {
  annonces: Annonce[]
  statistiques: StatistiquesComparaison
  budgetMax?: number | null
  onRemove: (id: string) => void
  /** Callback quand les scores sont prêts (pour PDF) */
  onScoresReady?: (scores: Array<{
    annonceId: string
    scoreGlobal: number
    verdict: string
    recommandation: string
    conseilPerso: string
    confiance: number
    axes: Array<{ axe: string; label: string; score: number; disponible: boolean; detail: string; impact: 'positif' | 'neutre' | 'negatif' }>
    points: Array<{ texte: string; detail?: string; type: 'avantage' | 'attention' | 'conseil' }>
  }>) => void
  /** Paramètres de financement pour calculer la mensualité */
  tauxInteret?: number
  dureeAns?: number
  apport?: number
}

/** Configuration pour l'édition inline d'une ligne */
interface EditConfig {
  annonceIds: string[]
  rawValues: unknown[]
  field: keyof NouvelleAnnonce
  fieldType: EditableFieldType
  suffix?: string
  placeholder?: string
}

/** Ligne de comparaison - Design épuré + édition inline */
function LigneComparaison({
  label,
  values,
  format = 'text',
  highlight = 'none',
  muted = false,
  editConfig,
}: {
  label: string
  values: (string | number | boolean | React.ReactNode | undefined)[]
  format?: 'text' | 'prix' | 'dpe' | 'boolean'
  highlight?: 'min' | 'max' | 'none'
  muted?: boolean
  /** Si fourni, les cellules vides affichent un bouton "Ajouter" cliquable */
  editConfig?: EditConfig
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
    // ─── Valeur manquante ───
    if (value === undefined || value === null) {
      // Si editConfig → bouton "Ajouter" cliquable
      if (editConfig) {
        return (
          <EditableCell
            annonceId={editConfig.annonceIds[index]}
            field={editConfig.field}
            fieldType={editConfig.fieldType}
            rawValue={editConfig.rawValues[index]}
            suffix={editConfig.suffix}
            placeholder={editConfig.placeholder}
          />
        )
      }
      return <Minus className="w-4 h-4 text-aquiz-gray-lighter mx-auto" />
    }
    
    const isBest = index === bestIndex
    
    // ─── Contenu formaté normal ───
    let displayNode: React.ReactNode
    switch (format) {
      case 'prix':
        displayNode = (
          <span className={`font-medium ${isBest ? 'text-aquiz-green' : 'text-aquiz-black'}`}>
            {typeof value === 'number' ? value.toLocaleString('fr-FR') : value} €
          </span>
        )
        break
      case 'dpe':
        displayNode = value
        break
      case 'boolean':
        displayNode = value ? (
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
        break
      default:
        displayNode = <span className={isBest ? 'font-semibold text-aquiz-green' : ''}>{String(value)}</span>
    }

    // ─── Si editConfig → wrapping avec edit au hover ───
    if (editConfig) {
      return (
        <EditableCell
          annonceId={editConfig.annonceIds[index]}
          field={editConfig.field}
          fieldType={editConfig.fieldType}
          rawValue={editConfig.rawValues[index]}
          suffix={editConfig.suffix}
          placeholder={editConfig.placeholder}
        >
          {displayNode}
        </EditableCell>
      )
    }

    return displayNode
  }
  
  return (
    <tr className={`border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors ${muted ? 'opacity-50' : ''}`}>
      <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80">
        {label}
      </td>
      {values.map((value, index) => (
        <td key={index} className="py-3.5 px-4 text-center text-sm">
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
  onScoresReady,
  tauxInteret,
  dureeAns,
  apport
}: TableauComparaisonProps) {
  // Hook pour l'analyse enrichie avec les APIs (DVF, Géorisques, OSM)
  const { 
    getAnalyse: getAnalyseEnrichie, 
    isLoading: isLoadingEnrichie,
    loadingIds,
  } = useAnalyseEnrichie(annonces)
  
  // === MOTEUR DE SCORING PRO UNIFIÉ ===
  const scoresPro = useMemo(() => {
    return annonces.map(annonce => {
      const enrichie = getAnalyseEnrichie(annonce.id)
      const enrichiScoring = toEnrichiesScoring(enrichie ?? null)
      return calculerScorePro(annonce, annonces, enrichiScoring, budgetMax)
    })
  }, [annonces, budgetMax, getAnalyseEnrichie])
  
  const getScorePro = (id: string) => scoresPro.find(s => s.annonceId === id)

  // Refs to break the render loop: onScoresReady and getAnalyseEnrichie change identity each render
  const onScoresReadyRef = useRef(onScoresReady)
  onScoresReadyRef.current = onScoresReady
  const getAnalyseEnrichieRef = useRef(getAnalyseEnrichie)
  getAnalyseEnrichieRef.current = getAnalyseEnrichie
  const lastFingerprintRef = useRef('')

  // Notifier le parent quand les scores sont prêts (enrichis avec données marché/risques/quartier)
  // Uses a fingerprint to avoid re-firing when data hasn't actually changed
  useEffect(() => {
    if (!onScoresReadyRef.current || scoresPro.length === 0) return

    // Build a fingerprint from scores + loading state to detect real changes
    const fingerprint = scoresPro.map(sp => {
      const enrichie = getAnalyseEnrichieRef.current(sp.annonceId)
      const marcheKey = enrichie?.marche?.success ? `m${enrichie.marche.ecartPrixM2 ?? ''}` : 'mx'
      const risqKey = enrichie?.risques?.success ? `r${enrichie.risques.scoreRisque ?? ''}` : 'rx'
      const quartKey = enrichie?.quartier?.success ? `q${enrichie.quartier.scoreQuartier ?? ''}` : 'qx'
      return `${sp.annonceId}:${sp.scoreGlobal}:${marcheKey}:${risqKey}:${quartKey}`
    }).join('|')

    if (fingerprint === lastFingerprintRef.current) return
    lastFingerprintRef.current = fingerprint

    const enrichedScores = scoresPro.map(sp => {
      const enrichie = getAnalyseEnrichieRef.current(sp.annonceId)
      return {
        ...sp,
        enrichissement: enrichie ? {
          marche: enrichie.marche?.success ? {
            success: true as const,
            ecartPrixM2: enrichie.marche.ecartPrixM2,
            verdict: enrichie.marche.verdict,
            prixM2MedianMarche: enrichie.marche.prixM2MedianMarche,
            evolution12Mois: enrichie.marche.evolution12Mois,
            nbTransactions: enrichie.marche.nbTransactions,
          } : undefined,
          risques: enrichie.risques?.success ? {
            success: true as const,
            scoreRisque: enrichie.risques.scoreRisque,
            verdict: enrichie.risques.verdict,
            zoneInondable: enrichie.risques.zoneInondable,
            niveauRadon: enrichie.risques.niveauRadon,
          } : undefined,
          quartier: enrichie.quartier?.success ? {
            success: true as const,
            scoreQuartier: enrichie.quartier.scoreQuartier,
            transports: enrichie.quartier.transports,
            commerces: enrichie.quartier.commerces,
            ecoles: enrichie.quartier.ecoles,
            sante: enrichie.quartier.sante,
            espaceVerts: enrichie.quartier.espaceVerts,
            transportsProches: enrichie.quartier.transportsProches,
          } : undefined,
        } : undefined,
      }
    })
    onScoresReadyRef.current(enrichedScores)
  // Re-run when scoresPro changes OR when enrichie loading finishes
  }, [scoresPro, isLoadingEnrichie])
  
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
        scoresPro={scoresPro}
        meilleurRapportId={statistiques.meilleurRapportId}
        budgetMax={budgetMax}
        mensualiteParams={tauxInteret !== undefined && dureeAns ? { tauxInteret, dureeAns, apport: apport || 0 } : undefined}
        onRemove={onRemove}
      />
      
      {/* Vue Desktop - Tableau */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-2xl border border-aquiz-gray-lighter/60 shadow-sm bg-white">
          <table className="w-full min-w-150">
            {/* Header avec cartes des biens */}
            <thead>
              <tr className="border-b-2 border-aquiz-gray-lighter/80 bg-aquiz-gray-lightest/30">
                <th className="py-5 px-5 text-left w-48">
                  <span className="text-[11px] font-bold text-aquiz-gray-dark uppercase tracking-widest">Comparaison</span>
                </th>
                {annonces.map((annonce) => {
                  const IconType = annonce.type === 'maison' ? Home : Building2
                  const isMeilleurRapport = annonce.id === statistiques.meilleurRapportId
                  
                  return (
                    <th key={annonce.id} className="py-5 px-3 min-w-48 align-top">
                      <div className="relative pt-2">
                        {/* Badge recommandé */}
                        {isMeilleurRapport && (
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
                            <Badge className="bg-aquiz-green text-white text-[10px] shadow-md whitespace-nowrap px-2.5 py-1">
                              <Sparkles className="w-3 h-3 mr-1" />
                          Recommandé
                        </Badge>
                      </div>
                    )}
                    
                    {/* Carte du bien */}
                    <div className={`relative rounded-xl overflow-hidden border-2 transition-all shadow-sm ${
                      isMeilleurRapport ? 'border-aquiz-green shadow-lg shadow-aquiz-green/15' : 'border-aquiz-gray-lighter hover:border-aquiz-gray-light hover:shadow-md'
                    }`}>
                      {/* Image */}
                      <div className="relative h-24 bg-linear-to-br from-aquiz-gray-lightest to-aquiz-gray-lighter">
                        {(annonce.images?.[0] || annonce.imageUrl) ? (
                          <Image src={(annonce.images?.[0] || annonce.imageUrl!).replace(/([?&]rule=ad-)(?:image|thumb|small)/, '$1large')} alt={annonce.titre || 'Bien immobilier'} className="w-full h-full object-cover" fill sizes="200px" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <IconType className="w-8 h-8 text-aquiz-gray-light" />
                          </div>
                        )}
                        
                        {/* Bouton supprimer */}
                        <button
                          onClick={() => onRemove(annonce.id)}
                          aria-label="Supprimer ce bien"
                          className="absolute top-1.5 right-1.5 min-w-11 min-h-11 w-6 h-6 rounded-full bg-white/90 hover:bg-red-50 flex items-center justify-center transition-colors shadow-sm"
                        >
                          <Trash2 className="w-3 h-3 text-aquiz-gray hover:text-red-500" />
                        </button>
                        
                        {/* DPE */}
                        <Badge className={`absolute bottom-1.5 right-1.5 text-[9px] px-1.5 py-0.5 ${COULEURS_DPE[annonce.dpe]} text-white shadow-sm`}>
                          {annonce.dpe}
                        </Badge>
                      </div>
                      
                      {/* Infos */}
                      <div className="p-3 bg-white">
                        <div className={`text-lg font-bold ${isMeilleurRapport ? 'text-aquiz-green' : 'text-aquiz-black'}`}>
                          {annonce.prix.toLocaleString('fr-FR')} €
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-aquiz-gray mt-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{annonce.ville}</span>
                        </div>
                        {/* Score AQUIZ + Mini Radar */}
                        {(() => {
                          const sp = getScorePro(annonce.id)
                          if (!sp) return null
                          const radarColor = sp.scoreGlobal >= 75 ? '#22c55e' : sp.scoreGlobal >= 60 ? '#84cc16' : sp.scoreGlobal >= 45 ? '#f59e0b' : '#ef4444'
                          return (
                            <div className="flex items-center gap-2 mt-2">
                              <MiniRadar
                                axes={sp.axes.map(a => ({ score: a.score }))}
                                size={48}
                                color={radarColor}
                              />
                              <div>
                                <div className={`text-sm font-bold ${getScoreColor(sp.scoreGlobal)}`}>
                                  {sp.scoreGlobal}<span className="text-[9px] font-normal text-aquiz-gray">/100</span>
                                </div>
                                <span className="text-[9px] text-aquiz-gray leading-none">Score AQUIZ</span>
                              </div>
                            </div>
                          )
                        })()}
                        {annonce.url && (
                          <a 
                            href={annonce.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-aquiz-green hover:underline mt-1.5 font-medium"
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
          <tr className="bg-aquiz-green/5">
            <td colSpan={annonces.length + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-green">
              <div className="flex items-center gap-2 text-xs font-bold text-aquiz-gray-dark uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-aquiz-green" />
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
            <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
              <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80">
                <div className="flex items-center gap-2">
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
                </div>
              </td>
              {annonces.map((a) => {
                const mensualite = calculerMensualite(a.prix, apport || 0, tauxInteret, dureeAns)
                return (
                  <td key={a.id} className="py-3.5 px-4 text-center text-sm">
                    <span className="font-semibold text-aquiz-black">
                      {mensualite.toLocaleString('fr-FR')} €/mois
                    </span>
                  </td>
                )
              })}
            </tr>
          )}
          
          <LigneComparaison
            label="Charges / mois"
            values={annonces.map((a) => a.chargesMensuelles ? `${a.chargesMensuelles} €` : undefined)}
            editConfig={{
              annonceIds: annonces.map((a) => a.id),
              rawValues: annonces.map((a) => a.chargesMensuelles),
              field: 'chargesMensuelles',
              fieldType: 'number',
              suffix: '€/mois',
              placeholder: 'Ex: 150',
            }}
          />
          
          <LigneComparaison
            label="Taxe foncière / an"
            values={annonces.map((a) => a.taxeFonciere ? `${a.taxeFonciere} €` : undefined)}
            editConfig={{
              annonceIds: annonces.map((a) => a.id),
              rawValues: annonces.map((a) => a.taxeFonciere),
              field: 'taxeFonciere',
              fieldType: 'number',
              suffix: '€/an',
              placeholder: 'Ex: 1200',
            }}
          />

          {/* Prix vs Marché (DVF) */}
          <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-aquiz-green" />
                <span>Prix vs marché</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-aquiz-gray-light cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    <p>Écart par rapport au prix médian/m² du secteur (données DVF)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </td>
            {annonces.map((a) => {
              const enrichie = getAnalyseEnrichie(a.id)
              const ecart = enrichie?.marche?.success ? enrichie.marche.ecartPrixM2 : undefined
              const medianMarche = enrichie?.marche?.success ? enrichie.marche.prixM2MedianMarche : undefined
              const avertissement = enrichie?.marche?.avertissement
              const loading = loadingIds.has(a.id)
              return (
                <td key={a.id} className="py-3.5 px-4 text-center text-sm">
                  {ecart !== undefined ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-0.5 cursor-help">
                          <span className={`font-semibold ${
                            ecart <= -5 ? 'text-green-600' : ecart <= 5 ? 'text-aquiz-gray-dark' : ecart <= 15 ? 'text-amber-500' : 'text-red-500'
                          }`}>
                            {ecart > 0 ? '+' : ''}{Math.round(ecart)}%
                          </span>
                          {medianMarche && (
                            <span className="text-[9px] text-aquiz-gray-light">
                              méd. {Math.round(medianMarche).toLocaleString('fr-FR')} €/m²
                            </span>
                          )}
                          {avertissement && (
                            <span className="text-[8px] text-amber-400">≈</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        <p>Écart de {ecart > 0 ? '+' : ''}{Math.round(ecart)}% vs médiane DVF{medianMarche ? ` (${Math.round(medianMarche).toLocaleString('fr-FR')} €/m²)` : ''}</p>
                        {avertissement && <p className="text-amber-500 mt-1">⚠ {avertissement}</p>}
                      </TooltipContent>
                    </Tooltip>
                  ) : loading ? (
                    <div className="flex flex-col items-center gap-1">
                      <Loader2 className="w-4 h-4 text-aquiz-gray-light animate-spin" />
                      <span className="text-[9px] text-aquiz-gray-light">Chargement…</span>
                    </div>
                  ) : (
                    <span className="text-aquiz-gray text-xs">—</span>
                  )}
                </td>
              )
            })}
          </tr>

          {/* Frais de notaire estimés */}
          <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80">
              <div className="flex items-center gap-2">
                <span>Frais de notaire estimés</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-aquiz-gray-light cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    <p>Neuf (&lt;5 ans) : ~2,5% · Ancien : ~7,5%</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </td>
            {annonces.map((a) => {
              const { montant, isNeuf } = estimerFraisNotaire(a.prix, a.anneeConstruction)
              return (
                <td key={a.id} className="py-3.5 px-4 text-center text-sm">
                  <span className="font-medium text-aquiz-black">{montant.toLocaleString('fr-FR')} €</span>
                  <div className="text-[10px] text-aquiz-gray mt-0.5">{isNeuf ? 'Neuf' : 'Ancien'}</div>
                </td>
              )
            })}
          </tr>

          {/* Coût total d'acquisition */}
          <tr className="border-b-2 border-aquiz-green/30 bg-linear-to-r from-aquiz-green/8 to-aquiz-green/3">
            <td className="py-4 px-5 text-sm font-semibold text-aquiz-black">
              <div className="flex items-center gap-2">
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
              </div>
            </td>
            {annonces.map((a) => {
              const sp = getScorePro(a.id)
              const { montant: notaire } = estimerFraisNotaire(a.prix, a.anneeConstruction)
              const travaux = sp?.estimations.budgetTravauxEstime || 0
              const total = calculerCoutTotal(a.prix, notaire, travaux)
              return (
                <td key={a.id} className="py-4 px-4 text-center text-sm">
                  <span className="font-bold text-aquiz-black text-lg">{total.toLocaleString('fr-FR')} €</span>
                  {travaux > 0 && (
                    <div className="text-[10px] text-orange-600 mt-0.5">dont ~{travaux.toLocaleString('fr-FR')} € travaux</div>
                  )}
                </td>
              )
            })}
          </tr>

          
          {/* Section Caractéristiques */}
          <tr className="bg-aquiz-gray-lightest/60">
            <td colSpan={annonces.length + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-gray-light">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-aquiz-gray-dark uppercase tracking-wider">
                  <Home className="w-4 h-4 text-aquiz-gray" />
                  Caractéristiques
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('pdf-gate')
                    if (!el) return
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    el.classList.add('animate-pulse-highlight')
                    setTimeout(() => el.classList.remove('animate-pulse-highlight'), 1800)
                  }}
                  className="flex items-center gap-1 text-[10px] text-aquiz-gray/60 hover:text-aquiz-green transition-colors"
                >
                  <FileDown className="w-3 h-3" />
                  <span>+ conseil négo dans le PDF</span>
                </button>
              </div>
            </td>
          </tr>
          
          <LigneComparaison
            label="Type de bien"
            values={annonces.map((a) => a.type === 'appartement' ? 'Appartement' : 'Maison')}
          />
          
          <LigneComparaison
            label="Localisation"
            values={annonces.map((a) => `${a.ville} (${a.codePostal})`)}
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
            values={annonces.map((a) => {
              if (a.type !== 'appartement') return '—'
              if (a.etage === 0) return 'RDC'
              if (a.etage) return a.etagesTotal ? `${a.etage}/${a.etagesTotal}` : `${a.etage}e`
              return undefined
            })}
            editConfig={{
              annonceIds: annonces.map((a) => a.id),
              rawValues: annonces.map((a) => a.etage),
              field: 'etage',
              fieldType: 'number',
              placeholder: 'Ex: 3',
            }}
          />

          <LigneComparaison
            label="Année de construction"
            values={annonces.map((a) => a.anneeConstruction ? String(a.anneeConstruction) : undefined)}
            editConfig={{
              annonceIds: annonces.map((a) => a.id),
              rawValues: annonces.map((a) => a.anneeConstruction),
              field: 'anneeConstruction',
              fieldType: 'number',
              placeholder: 'Ex: 1985',
            }}
          />

          <LigneComparaison
            label="Orientation"
            values={annonces.map((a) => a.orientation || undefined)}
            editConfig={{
              annonceIds: annonces.map((a) => a.id),
              rawValues: annonces.map((a) => a.orientation),
              field: 'orientation',
              fieldType: 'orientation',
            }}
          />

          <LigneComparaison
            label="Salles de bains"
            values={annonces.map((a) => a.nbSallesBains || undefined)}
            editConfig={{
              annonceIds: annonces.map((a) => a.id),
              rawValues: annonces.map((a) => a.nbSallesBains),
              field: 'nbSallesBains',
              fieldType: 'number',
              placeholder: 'Ex: 1',
            }}
          />
          
          {/* Section Localisation & Risques */}
          <tr className="bg-aquiz-green/5">
            <td colSpan={annonces.length + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-green">
              <div className="flex items-center gap-2 text-xs font-bold text-aquiz-gray-dark uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-aquiz-green" />
                Localisation & Risques
              </div>
            </td>
          </tr>

          {/* Score Quartier (OSM) */}
          <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80">
              <div className="flex items-center gap-2">
                <span>Score quartier</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-aquiz-gray-light cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    <p>Commerces, écoles, santé, espaces verts à proximité (OpenStreetMap)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </td>
            {annonces.map((a) => {
              const enrichie = getAnalyseEnrichie(a.id)
              const score = enrichie?.quartier?.success ? enrichie.quartier.scoreQuartier : undefined
              const barColor = score !== undefined ? (score >= 75 ? 'bg-green-500' : score >= 60 ? 'bg-lime-500' : score >= 45 ? 'bg-amber-400' : 'bg-red-400') : ''
              const loading = loadingIds.has(a.id)
              return (
                <td key={a.id} className="py-3.5 px-4 text-center text-sm">
                  {score !== undefined ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-semibold text-xs ${getScoreColor(score)}`}>{score}/100</span>
                      <div className="w-full max-w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  ) : loading ? (
                    <div className="flex flex-col items-center gap-1">
                      <Loader2 className="w-4 h-4 text-aquiz-gray-light animate-spin" />
                      <span className="text-[9px] text-aquiz-gray-light">Chargement…</span>
                    </div>
                  ) : (
                    <span className="text-aquiz-gray text-xs">—</span>
                  )}
                </td>
              )
            })}
          </tr>

          {/* Transports */}
          <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80">
              <div className="flex items-center gap-2">
                <span>Transports</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-aquiz-gray-light cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    <p>Desserte en transports en commun (OpenStreetMap)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </td>
            {annonces.map((a) => {
              const enrichie = getAnalyseEnrichie(a.id)
              const score = enrichie?.quartier?.success ? enrichie.quartier.transports : undefined
              const barColor = score !== undefined ? (score >= 75 ? 'bg-green-500' : score >= 60 ? 'bg-lime-500' : score >= 45 ? 'bg-amber-400' : 'bg-red-400') : ''
              const proches = enrichie?.quartier?.success ? enrichie.quartier.transportsProches : undefined
              const loading = loadingIds.has(a.id)

              return (
                <td key={a.id} className="py-3 px-4 text-sm align-top">
                  {score !== undefined ? (
                    <div className="flex flex-col items-center gap-2">
                      {/* Score */}
                      <span className={`font-semibold text-xs ${getScoreColor(score)}`}>{score}/100</span>
                      <div className="w-full max-w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
                      </div>

                      {/* Stations — badges IDFM intégrés */}
                      {proches && proches.length > 0 && (
                        <div className="w-full mt-2 space-y-2">
                          {proches.map((tp, i) => (
                            <div key={i} className="flex items-center gap-2 min-h-5.5">
                              {/* Badges lignes (largeur fixe pour alignement) */}
                              <div className="flex items-center gap-1 shrink-0 min-w-5.5">
                                {tp.lignes && tp.lignes.length > 0 ? (
                                  tp.lignes.slice(0, 3).map((l, j) => (
                                    <LineBadge key={j} ligne={l} typeTransport={tp.typeTransport} size="sm" />
                                  ))
                                ) : (
                                  <TypeBadge typeTransport={tp.typeTransport} size="sm" />
                                )}
                              </div>
                              {/* Nom station */}
                              <span className="text-gray-700 text-xs truncate flex-1 text-left leading-tight" title={tp.nom}>
                                {tp.nom}
                              </span>
                              {/* Temps de marche — icône Lucide */}
                              <span className="inline-flex items-center gap-0.5 text-gray-400 shrink-0 tabular-nums text-[10px] whitespace-nowrap">
                                <Footprints className="w-3 h-3" />
                                {tp.walkMin ?? Math.max(1, Math.round(tp.distance / 75))} min
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : loading ? (
                    <div className="flex flex-col items-center gap-1 py-2">
                      <Loader2 className="w-5 h-5 text-aquiz-gray-light animate-spin" />
                      <span className="text-[9px] text-aquiz-gray-light">Chargement…</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-aquiz-gray text-xs">—</span>
                    </div>
                  )}
                </td>
              )
            })}
          </tr>

          {/* Section Performance */}
          <tr className="bg-aquiz-gray-lightest/60">
            <td colSpan={annonces.length + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-gray-light">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-aquiz-gray-dark uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-aquiz-gray" />
                  Performance énergétique
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('pdf-gate')
                    if (!el) return
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    el.classList.add('animate-pulse-highlight')
                    setTimeout(() => el.classList.remove('animate-pulse-highlight'), 1800)
                  }}
                  className="flex items-center gap-1 text-[10px] text-aquiz-gray/60 hover:text-aquiz-green transition-colors"
                >
                  <FileDown className="w-3 h-3" />
                  <span>+ détail quartier dans le PDF</span>
                </button>
              </div>
            </td>
          </tr>
          
          <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80">Diagnostic DPE</td>
            {annonces.map((a) => (
              <td key={a.id} className="py-3.5 px-4 text-center">
                <EditableCell
                  annonceId={a.id}
                  field="dpe"
                  fieldType="dpe"
                  rawValue={a.dpe && a.dpe !== 'NC' ? a.dpe : undefined}
                >
                  {a.dpe && a.dpe !== 'NC' ? (
                    <Badge className={`${COULEURS_DPE[a.dpe]} text-white text-xs`}>
                      Classe {a.dpe}
                    </Badge>
                  ) : null}
                </EditableCell>
              </td>
            ))}
          </tr>

          <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80">Émissions GES</td>
            {annonces.map((a) => (
              <td key={a.id} className="py-3.5 px-4 text-center">
                <EditableCell
                  annonceId={a.id}
                  field="ges"
                  fieldType="dpe"
                  rawValue={a.ges && a.ges !== 'NC' ? a.ges : undefined}
                >
                  {a.ges && a.ges !== 'NC' ? (
                    <Badge className={`${COULEURS_DPE[a.ges]} text-white text-xs`}>
                      Classe {a.ges}
                    </Badge>
                  ) : null}
                </EditableCell>
              </td>
            ))}
          </tr>
          
          {/* Section Équipements */}
          <tr className="bg-aquiz-gray-lightest/60">
            <td colSpan={annonces.length + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-gray-light">
              <div className="flex items-center gap-2 text-xs font-bold text-aquiz-gray-dark uppercase tracking-wider">
                <Key className="w-4 h-4 text-aquiz-gray" />
                Équipements
              </div>
            </td>
          </tr>
          
          <LigneComparaison
            label="Balcon / Terrasse"
            values={annonces.map((a) => a.balconTerrasse)}
            format="boolean"
            editConfig={{
              annonceIds: annonces.map((a) => a.id),
              rawValues: annonces.map((a) => a.balconTerrasse),
              field: 'balconTerrasse',
              fieldType: 'boolean',
            }}
          />
          
          <LigneComparaison
            label="Parking / Garage"
            values={annonces.map((a) => a.parking)}
            format="boolean"
            editConfig={{
              annonceIds: annonces.map((a) => a.id),
              rawValues: annonces.map((a) => a.parking),
              field: 'parking',
              fieldType: 'boolean',
            }}
          />
          
          <LigneComparaison
            label="Ascenseur"
            values={annonces.map((a) => a.type === 'appartement' ? a.ascenseur : undefined)}
            format="boolean"
            editConfig={{
              annonceIds: annonces.map((a) => a.id),
              rawValues: annonces.map((a) => a.ascenseur),
              field: 'ascenseur',
              fieldType: 'boolean',
            }}
          />
          
          <LigneComparaison
            label="Cave"
            values={annonces.map((a) => a.cave)}
            format="boolean"
            editConfig={{
              annonceIds: annonces.map((a) => a.id),
              rawValues: annonces.map((a) => a.cave),
              field: 'cave',
              fieldType: 'boolean',
            }}
          />
          
          {/* Comparaison budget si disponible */}
          {budgetMax && (
            <>
              <tr className="bg-aquiz-green/5">
                <td colSpan={annonces.length + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-green text-xs font-bold text-aquiz-green uppercase tracking-wider">
                  Par rapport à votre budget ({budgetMax.toLocaleString('fr-FR')} €)
                </td>
              </tr>
              
              <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80">
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

          
        </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
