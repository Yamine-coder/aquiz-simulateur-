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
import type { Annonce, StatistiquesComparaison } from '@/types/annonces'
import { COULEURS_DPE } from '@/types/annonces'
import {
    AlertTriangle,
    Building2,
    Bus,
    Check,
    CheckCircle,
    CreditCard,
    ExternalLink,
    GraduationCap,
    Heart,
    Home,
    Info,
    Key,
    Loader2,
    Lock,
    Mail,
    MapPin,
    Minus,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Trash2,
    TreePine,
    X,
    Zap
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo } from 'react'
import { LockedSection } from './LockedSection'
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
  /** Callback pour ouvrir la modale email (funnel unique) */
  onOpenModal?: () => void
  /** Callback quand les scores sont prêts (pour email modal) */
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
  /** Sections déverrouillées après email */
  unlocked?: boolean
  /** Email envoyé — sections restent verrouillées mais CTAs changent */
  emailSent?: boolean
  /** Paramètres de financement pour calculer la mensualité */
  tauxInteret?: number
  dureeAns?: number
  apport?: number
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
  onOpenModal,
  onScoresReady,
  unlocked = false,
  emailSent = false,
  tauxInteret,
  dureeAns,
  apport
}: TableauComparaisonProps) {
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
  
  const getScorePro = (id: string) => scoresPro.find(s => s.annonceId === id)

  // Notifier le parent quand les scores sont prêts
  useEffect(() => {
    if (onScoresReady && scoresPro.length > 0) {
      onScoresReady(scoresPro)
    }
  }, [scoresPro, onScoresReady])
  
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
      risques?: { success: boolean; verdict?: string; scoreRisque?: number; zoneInondable?: boolean; niveauRadon?: number }
      quartier?: { success: boolean; scoreQuartier?: number; transports?: number; commerces?: number; ecoles?: number; sante?: number; espaceVerts?: number }
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
        scoresPro={scoresPro}
        meilleurRapportId={statistiques.meilleurRapportId}
        budgetMax={budgetMax}
        mensualiteParams={tauxInteret !== undefined && dureeAns ? { tauxInteret, dureeAns, apport: apport || 0 } : undefined}
        onRemove={onRemove}
        onOpenModal={onOpenModal}
        unlocked={unlocked}
        emailSent={emailSent}
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
                        {annonce.imageUrl ? (
                          <Image src={annonce.imageUrl} alt={annonce.titre || 'Bien immobilier'} className="w-full h-full object-cover" fill sizes="200px" />
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
              <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80 flex items-center gap-2">
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
                  <td key={a.id} className="py-3.5 px-4 text-center text-sm">
                    <span className="font-semibold text-aquiz-black">
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
          <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80 flex items-center gap-2">
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
                <td key={a.id} className="py-3.5 px-4 text-center text-sm">
                  <span className="font-medium text-aquiz-black">{montant.toLocaleString('fr-FR')} €</span>
                  <div className="text-[10px] text-aquiz-gray mt-0.5">{isNeuf ? 'Neuf' : 'Ancien'}</div>
                </td>
              )
            })}
          </tr>

          {/* Coût total d'acquisition */}
          <tr className="border-b-2 border-aquiz-green/30 bg-linear-to-r from-aquiz-green/8 to-aquiz-green/3">
            <td className="py-4 px-5 text-sm font-semibold text-aquiz-black flex items-center gap-2">
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
              <div className="flex items-center gap-2 text-xs font-bold text-aquiz-gray-dark uppercase tracking-wider">
                <Home className="w-4 h-4 text-aquiz-gray" />
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
          <tr className="bg-aquiz-gray-lightest/60">
            <td colSpan={annonces.length + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-gray-light">
              <div className="flex items-center gap-2 text-xs font-bold text-aquiz-gray-dark uppercase tracking-wider">
                <Zap className="w-4 h-4 text-aquiz-gray" />
                Performance énergétique
              </div>
            </td>
          </tr>
          
          <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 px-5 text-sm text-aquiz-gray-dark/80">Diagnostic DPE</td>
            {annonces.map((a) => (
              <td key={a.id} className="py-3.5 px-4 text-center">
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
          
          {/* === COMPACT LOCKED SECTION — mid-scroll nudge (desktop only, hidden when unlocked) === */}
          {!unlocked && !emailSent && (
            <tr className="hidden md:table-row">
              <td colSpan={annonces.length + 1} className="py-3 px-4">
                <LockedSection
                  onOpenModal={onOpenModal}
                  nbInsightsBlocked={scoresPro.reduce((acc, sp) => acc + sp.points.length, 0)}
                  unlocked={unlocked}
                  emailSent={emailSent}
                />
              </td>
            </tr>
          )}
        </tbody>
          </table>
        </div>

        {/* ═══ SECTIONS VERROUILLÉES — toujours floutées (CTA pré-email ou overlay post-email) ═══ */}
        <div className="relative">
          <div className={`overflow-x-auto rounded-b-2xl border border-t-0 border-aquiz-gray-lighter/60 bg-white transition-all duration-500 ${
            !unlocked ? 'blur-sm pointer-events-none select-none' : ''
          }`}>
            <table className="w-full min-w-150">
              <tbody>
          
          {/* === SECTION LOCALISATION & MARCHÉ === */}
          <tr className="bg-aquiz-green/5">
            <td colSpan={annonces.length + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-green">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-aquiz-gray-dark uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-aquiz-green" />
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
          
          {/* Prix vs Marché — Teaser or Revealed */}
          <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
            <td className="py-4 px-5 text-sm text-aquiz-black align-middle">
              <span className="flex items-center gap-1.5 font-medium">
                <Building2 className="w-4 h-4 text-aquiz-green" />
                Prix vs Marché
              </span>
              <span className="text-[9px] text-aquiz-gray block mt-0.5">Basé sur les ventes récentes du secteur</span>
            </td>
            {annonces.map((annonce) => {
              const analyseE = getAnalyseEnrichie(annonce.id)
              const isLoadingThis = loadingIds.has(annonce.id)

              if (isLoadingThis) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-middle">
                    <div className="space-y-2 animate-pulse">
                      <div className="h-5 w-16 mx-auto rounded bg-aquiz-green/20" />
                      <div className="h-3 w-24 mx-auto rounded bg-aquiz-gray-lighter/60" />
                      <div className="h-2 w-20 mx-auto rounded bg-aquiz-gray-lighter/40" />
                    </div>
                  </td>
                )
              }

              if (!analyseE || !analyseE.marche.success) {
                return (
                  <td key={annonce.id} className="py-4 px-3 text-center align-middle">
                    <span className="text-[10px] text-aquiz-gray">Non disponible</span>
                  </td>
                )
              }

              // UNLOCKED: Show real data
              if (unlocked) {
                const ecart = analyseE.marche.ecartPrixM2 ?? 0
                const isBelow = ecart < 0
                const prixMedian = analyseE.marche.prixM2MedianMarche
                return (
                  <td key={annonce.id} className="py-4 px-3 align-middle">
                    <div className="text-center space-y-1">
                      <div className={`text-lg font-bold ${isBelow ? 'text-green-600' : ecart === 0 ? 'text-aquiz-gray' : 'text-red-500'}`}>
                        {isBelow ? '' : '+'}{ecart.toFixed(0)} %
                      </div>
                      <div className="text-[10px] text-aquiz-gray">
                        {analyseE.marche.verdict || (isBelow ? 'Sous le prix du marché' : 'Au-dessus du marché')}
                      </div>
                      {prixMedian && (
                        <div className="text-[9px] text-aquiz-gray-light">
                          Médiane : {prixMedian.toLocaleString('fr-FR')} €/m²
                        </div>
                      )}
                    </div>
                  </td>
                )
              }

              {/* LOCKED: data-driven teaser */}
              const nbTransactions = analyseE.marche.prixM2MedianMarche ? 1 : 0
              const villeLabel = annonce.ville || 'ce secteur'

              // EMAIL SENT: confirmation state
              if (emailSent) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-middle">
                    <div className="w-full py-4 px-4 rounded-xl border border-aquiz-green/20 bg-aquiz-green/5 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <CheckCircle className="w-4 h-4 text-aquiz-green" />
                        <span className="text-xs font-semibold text-aquiz-green">Envoyé par email</span>
                      </div>
                      <p className="text-[9px] text-aquiz-gray">Consultez votre boîte mail</p>
                    </div>
                  </td>
                )
              }

              return (
                <td key={annonce.id} className="py-4 px-3 align-middle">
                  <button
                    onClick={onOpenModal}
                    className="w-full py-4 px-4 rounded-xl border border-dashed border-aquiz-gray-lighter hover:border-aquiz-green hover:bg-aquiz-green/5 transition-all group cursor-pointer text-center"
                  >
                    <p className="text-[11px] text-aquiz-gray mb-2">Ventes récentes analysées à <span className="font-medium text-aquiz-black">{villeLabel}</span></p>
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <div className="flex gap-1 items-center">
                        <div className="h-2 w-10 rounded-full bg-aquiz-gray-lighter/60 animate-pulse" />
                        <span className="text-[9px] text-aquiz-gray">% écart</span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-aquiz-gray-light" />
                    </div>
                    {nbTransactions > 0 && (
                      <p className="text-[9px] text-aquiz-gray-light mb-2">Médiane calculée sur transactions récentes</p>
                    )}
                    <span className="text-xs text-aquiz-green font-semibold group-hover:underline">
                      Débloquer l&apos;analyse &rarr;
                    </span>
                  </button>
                </td>
              )
            })}
          </tr>
          
          {/* Risques zone — Teaser or Revealed */}
          <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
            <td className="py-4 px-5 text-sm text-aquiz-black align-middle">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                Risques zone
              </span>
              <span className="text-[9px] text-aquiz-gray block mt-0.5">Risques naturels & technologiques</span>
            </td>
            {annonces.map((annonce) => {
              const analyseE = getAnalyseEnrichie(annonce.id)
              const isLoadingThis = loadingIds.has(annonce.id)

              if (isLoadingThis) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-middle">
                    <div className="flex flex-col items-center gap-2 animate-pulse">
                      <div className="h-6 w-14 rounded-full bg-orange-100/60" />
                      <div className="h-3 w-20 rounded bg-aquiz-gray-lighter/60" />
                    </div>
                  </td>
                )
              }

              if (!analyseE || !analyseE.risques.success) {
                return (
                  <td key={annonce.id} className="py-4 px-3 text-center align-middle">
                    <span className="text-[10px] text-aquiz-gray">Non disponible</span>
                  </td>
                )
              }

              // UNLOCKED: Show real data
              if (unlocked) {
                const scoreRisque = analyseE.risques.scoreRisque ?? 50
                const isLow = scoreRisque >= 70
                return (
                  <td key={annonce.id} className="py-4 px-3 align-middle">
                    <div className="text-center space-y-1.5">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isLow ? 'bg-green-100 text-green-700' : scoreRisque >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {scoreRisque}/100
                      </div>
                      <div className="text-[10px] text-aquiz-gray">
                        {analyseE.risques.verdict || (isLow ? 'Risque faible' : 'Vigilance requise')}
                      </div>
                      {analyseE.risques.zoneInondable && (
                        <div className="text-[9px] text-orange-600 font-medium flex items-center gap-0.5"><AlertTriangle className="w-3 h-3 inline" /> Zone inondable</div>
                      )}
                    </div>
                  </td>
                )
              }

              {/* LOCKED: data-driven risk teaser */}
              const riskFactors: string[] = []
              if (analyseE.risques.zoneInondable) riskFactors.push('inondation')
              if (analyseE.risques.niveauRadon && analyseE.risques.niveauRadon > 1) riskFactors.push('radon')
              const nbFactors = riskFactors.length

              // EMAIL SENT: confirmation state
              if (emailSent) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-middle">
                    <div className="w-full py-4 px-4 rounded-xl border border-aquiz-green/20 bg-aquiz-green/5 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <CheckCircle className="w-4 h-4 text-aquiz-green" />
                        <span className="text-xs font-semibold text-aquiz-green">Envoyé par email</span>
                      </div>
                      <p className="text-[9px] text-aquiz-gray">Consultez votre boîte mail</p>
                    </div>
                  </td>
                )
              }

              return (
                <td key={annonce.id} className="py-4 px-3 align-middle">
                  <button
                    onClick={onOpenModal}
                    className="w-full py-4 px-4 rounded-xl border border-dashed border-aquiz-gray-lighter hover:border-aquiz-green hover:bg-aquiz-green/5 transition-all group cursor-pointer text-center"
                  >
                    <p className="text-[11px] text-aquiz-gray mb-2">Diagnostic <span className="font-medium text-aquiz-black">risques naturels & technologiques</span></p>
                    {nbFactors > 0 ? (
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-medium">
                          <AlertTriangle className="w-3 h-3" /> {nbFactors} facteur{nbFactors > 1 ? 's' : ''} identifié{nbFactors > 1 ? 's' : ''}
                        </span>
                        <Lock className="w-3.5 h-3.5 text-aquiz-gray-light" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <div className="h-2 w-16 rounded-full bg-aquiz-gray-lighter/60 animate-pulse" />
                        <span className="text-[9px] text-aquiz-gray">score /100</span>
                        <Lock className="w-3.5 h-3.5 text-aquiz-gray-light" />
                      </div>
                    )}
                    <span className="text-xs text-aquiz-green font-semibold group-hover:underline">
                      Débloquer le diagnostic &rarr;
                    </span>
                  </button>
                </td>
              )
            })}
          </tr>
          
          {/* Score quartier — Teaser or Revealed */}
          <tr className="border-b border-aquiz-gray-lightest/70 hover:bg-slate-50/60 transition-colors">
            <td className="py-4 px-5 text-sm text-aquiz-black align-middle">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-4 h-4 text-aquiz-green" />
                Score quartier
              </span>
              <span className="text-[9px] text-aquiz-gray block mt-0.5">Commodités dans un rayon de 800m</span>
            </td>
            {annonces.map((annonce) => {
              const analyseE = getAnalyseEnrichie(annonce.id)
              const isLoadingThis = loadingIds.has(annonce.id)

              if (isLoadingThis) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-middle">
                    <div className="flex flex-col items-center gap-2 animate-pulse">
                      <div className="h-6 w-14 rounded-full bg-aquiz-green/15" />
                      <div className="flex gap-1 justify-center">
                        {[0,1,2].map(i => (<div key={i} className="h-3 w-10 rounded bg-aquiz-gray-lighter/50" />))}
                      </div>
                    </div>
                  </td>
                )
              }

              if (!analyseE || !analyseE.quartier.success) {
                return (
                  <td key={annonce.id} className="py-4 px-3 text-center align-middle">
                    <span className="text-[10px] text-aquiz-gray">Non disponible</span>
                  </td>
                )
              }

              // UNLOCKED: Show real data
              if (unlocked) {
                const q = analyseE.quartier
                const score = q.scoreQuartier ?? 0
                const items = [
                  { label: 'Transports', value: q.transports },
                  { label: 'Commerces', value: q.commerces },
                  { label: 'Écoles', value: q.ecoles },
                  { label: 'Santé', value: q.sante },
                  { label: 'Espaces verts', value: q.espaceVerts },
                ].filter(i => i.value !== undefined)

                return (
                  <td key={annonce.id} className="py-4 px-3 align-middle">
                    <div className="text-center space-y-2">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        score >= 70 ? 'bg-aquiz-green/15 text-green-700' : score >= 40 ? 'bg-aquiz-orange/15 text-orange-700' : 'bg-red-100 text-red-700'
                      }`}>
                        <MapPin className="w-3.5 h-3.5" />
                        {score}/100
                      </div>
                      <div className="flex flex-wrap justify-center gap-1">
                        {items.slice(0, 3).map(i => (
                          <span key={i.label} className="text-[9px] px-1.5 py-0.5 rounded bg-aquiz-gray-lightest text-aquiz-gray">
                            {i.label}: {i.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                )
              }

              {/* LOCKED: data-driven quartier teaser */}
              const q = analyseE.quartier
              const amenityCount = [q.transports, q.commerces, q.ecoles, q.sante, q.espaceVerts].filter(v => v !== undefined && v > 0).length
              const totalPoi = (q.transports ?? 0) + (q.commerces ?? 0) + (q.ecoles ?? 0) + (q.sante ?? 0) + (q.espaceVerts ?? 0)
              const categoryItems = [
                { icon: Bus, label: 'Transports' },
                { icon: ShoppingBag, label: 'Commerces' },
                { icon: GraduationCap, label: 'Écoles' },
                { icon: Heart, label: 'Santé' },
                { icon: TreePine, label: 'Espaces verts' },
              ]

              // EMAIL SENT: confirmation state
              if (emailSent) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-middle">
                    <div className="w-full py-4 px-4 rounded-xl border border-aquiz-green/20 bg-aquiz-green/5 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <CheckCircle className="w-4 h-4 text-aquiz-green" />
                        <span className="text-xs font-semibold text-aquiz-green">Envoyé par email</span>
                      </div>
                      <p className="text-[9px] text-aquiz-gray">Consultez votre boîte mail</p>
                    </div>
                  </td>
                )
              }

              return (
                <td key={annonce.id} className="py-4 px-3 align-middle">
                  <button
                    onClick={onOpenModal}
                    className="w-full py-4 px-4 rounded-xl border border-dashed border-aquiz-gray-lighter hover:border-aquiz-green hover:bg-aquiz-green/5 transition-all group cursor-pointer text-center"
                  >
                    <p className="text-[11px] text-aquiz-gray mb-2">
                      <span className="font-medium text-aquiz-black">{totalPoi} commodité{totalPoi > 1 ? 's' : ''}</span> repérée{totalPoi > 1 ? 's' : ''} dans 800m
                    </p>
                    <div className="flex gap-1 justify-center flex-wrap mb-2">
                      {categoryItems.slice(0, amenityCount).map(({ icon: Icon, label }, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-aquiz-gray-lightest text-aquiz-gray">
                          <Icon className="w-3 h-3 text-aquiz-green" />{label}
                        </span>
                      ))}
                      {amenityCount === 0 && (
                        <>
                          {[0,1,2].map((i) => (
                            <div key={i} className="w-12 h-4 rounded bg-aquiz-gray-lighter/60 animate-pulse" />
                          ))}
                        </>
                      )}
                      <Lock className="w-3.5 h-3.5 text-aquiz-gray-light ml-1" />
                    </div>
                    <span className="text-xs text-aquiz-green font-semibold group-hover:underline">
                      Débloquer le détail &rarr;
                    </span>
                  </button>
                </td>
              )
            })}
          </tr>
          
          {/* === SECTION ANALYSE AQUIZ === */}
          <tr className="bg-linear-to-r from-aquiz-green/8 to-aquiz-green/3">
            <td colSpan={annonces.length + 1} className="py-2.5 px-5 border-l-[3px] border-aquiz-green">
              <div className="flex items-center gap-2 text-xs font-bold text-aquiz-gray-dark uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-aquiz-green" />
                Analyse AQUIZ
              </div>
            </td>
          </tr>
          {/* Score global + Points clés — Carte unifiée */}
          <tr className="border-b border-aquiz-gray-lightest/70">
            <td className="py-4 px-5 align-middle">
              <div className="text-sm font-medium text-aquiz-black">Score & Points clés</div>
              <div className="text-[9px] text-aquiz-gray mt-0.5">Analyse croisée sur 10 axes</div>
            </td>
            {annonces.map((annonce) => {
              const sp = getScorePro(annonce.id)
              const isLoadingThis = loadingIds.has(annonce.id)
              if (!sp) return <td key={annonce.id} className="py-4 px-3 text-center align-middle">-</td>

              const avantages = sp.points.filter(p => p.type === 'avantage')
              const alertes = sp.points.filter(p => p.type === 'attention')
              const conseils = sp.points.filter(p => p.type === 'conseil')
              const totalPoints = avantages.length + alertes.length + conseils.length

              // UNLOCKED: Show real scores and points
              if (unlocked) {
                return (
                  <td key={annonce.id} className="py-4 px-3 align-top">
                    <div className="rounded-xl border border-aquiz-gray-lighter overflow-hidden animate-in fade-in duration-500">
                      {/* Score réel */}
                      <div className={`p-3 ${getScoreBg(sp.scoreGlobal)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${getScoreColor(sp.scoreGlobal)}`}>
                              {sp.scoreGlobal}
                            </span>
                            <span className="text-[10px] text-aquiz-gray">/100</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium ${
                            sp.recommandation === 'recommande' ? 'bg-green-200 text-green-800' :
                            sp.recommandation === 'a_etudier' ? 'bg-amber-200 text-amber-800' :
                            'bg-red-200 text-red-800'
                          }`}>
                            <Sparkles className="w-3 h-3" />
                            {sp.recommandation === 'recommande' ? 'Recommandé' :
                             sp.recommandation === 'a_etudier' ? 'À étudier' :
                             'Déconseillé'}
                          </span>
                        </div>
                        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              sp.scoreGlobal >= 75 ? 'bg-green-500' :
                              sp.scoreGlobal >= 60 ? 'bg-lime-500' :
                              sp.scoreGlobal >= 45 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${sp.scoreGlobal}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-aquiz-gray mt-1.5">{sp.verdict}</p>
                      </div>

                      <div className="border-t border-aquiz-gray-lighter" />

                      {/* Points clés réels */}
                      <div className="p-3 space-y-1.5">
                        {avantages.slice(0, 2).map((p, i) => (
                          <div key={i} className="bg-green-50 border border-green-100 rounded-lg p-2">
                            <div className="flex items-start gap-1.5">
                              <CheckCircle className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                              <span className="text-[10px] text-green-800">{p.texte}</span>
                            </div>
                          </div>
                        ))}
                        {alertes.slice(0, 2).map((p, i) => (
                          <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-2">
                            <div className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                              <span className="text-[10px] text-amber-800">{p.texte}</span>
                            </div>
                          </div>
                        ))}
                        {totalPoints > 4 && (
                          <div className="text-[9px] text-aquiz-gray text-center">
                            + {totalPoints - 4} autre{totalPoints > 5 ? 's' : ''} dans le rapport email
                          </div>
                        )}
                      </div>

                      {/* Bandeau valeur email */}
                      <div className="border-t border-aquiz-green/20 bg-aquiz-green/5 px-3 py-2">
                        <div className="flex items-start gap-1.5">
                          <Mail className="w-3 h-3 text-aquiz-green shrink-0 mt-0.5" />
                          <p className="text-[9px] text-aquiz-gray">
                            <span className="font-semibold text-aquiz-green">Rapport détaillé envoyé par email</span>
                            {' '}— recommandations personnalisées, analyse de négociation et conseils d&apos;expert
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>
                )
              }

              return (
                <td key={annonce.id} className="py-4 px-3 align-top">
                  <div className="rounded-xl border border-aquiz-gray-lighter overflow-hidden">
{/* Score visible — hook pré-email */}
                    <div className={`p-3 ${getScoreBg(sp.scoreGlobal)}`}>
                      <div className="flex items-center justify-between mb-2">
                        {isLoadingThis ? (
                          <div className="flex items-center gap-2 animate-pulse">
                            <div className="w-8 h-6 rounded bg-aquiz-gray-lighter/60" />
                            <span className="text-[10px] text-aquiz-gray">Calcul en cours…</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className={`text-2xl font-bold ${getScoreColor(sp.scoreGlobal)}`}>
                                {sp.scoreGlobal}
                              </span>
                              <span className="text-[10px] text-aquiz-gray">/100</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium ${
                              sp.recommandation === 'recommande' ? 'bg-green-200 text-green-800' :
                              sp.recommandation === 'a_etudier' ? 'bg-amber-200 text-amber-800' :
                              'bg-red-200 text-red-800'
                            }`}>
                              <Sparkles className="w-3 h-3" />
                              {sp.recommandation === 'recommande' ? 'Recommandé' :
                               sp.recommandation === 'a_etudier' ? 'À étudier' :
                               'Déconseillé'}
                            </span>
                          </>
                        )}
                      </div>
                      {/* Barre de progression — colorée réelle */}
                      <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            sp.scoreGlobal >= 75 ? 'bg-green-500' :
                            sp.scoreGlobal >= 60 ? 'bg-lime-500' :
                            sp.scoreGlobal >= 45 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${sp.scoreGlobal}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-aquiz-gray mt-1.5">{sp.verdict}</p>
                    </div>

                    {/* Séparateur */}
                    <div className="border-t border-aquiz-gray-lighter" />

                    {/* Points clés — data-driven count */}
                    <div className="p-3 space-y-2">
                      {avantages.length > 0 && (
                        <div className="bg-green-50/50 border border-green-100/40 rounded-lg p-2">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />
                            <span className="text-[10px] text-green-700/70">{avantages.length} avantage{avantages.length > 1 ? 's' : ''} identifié{avantages.length > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      )}
                      {alertes.length > 0 && (
                        <div className="bg-amber-50/50 border border-amber-100/40 rounded-lg p-2">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-[10px] text-amber-700/70">{alertes.length} point{alertes.length > 1 ? 's' : ''} de vigilance</span>
                          </div>
                        </div>
                      )}
                      {conseils.length > 0 && (
                        <div className="text-[9px] text-aquiz-gray text-center">
                          + {conseils.length} conseil{conseils.length > 1 ? 's' : ''} personnalisé{conseils.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    {/* CTA détail complet */}
                    {emailSent ? (
                      <div className="w-full border-t border-aquiz-green/20 bg-aquiz-green/5 py-2.5 text-center flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-aquiz-green" />
                        <span className="text-[10px] text-aquiz-green font-medium">Détails envoyés par email</span>
                      </div>
                    ) : (
                      <button
                        onClick={onOpenModal}
                        className="w-full border-t border-aquiz-gray-lighter py-2.5 text-center text-[10px] text-aquiz-green font-medium hover:bg-aquiz-green/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3 h-3" />
                        Voir le détail + recommandations &rarr;
                      </button>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>
        </tbody>
          </table>
          </div>

          {/* Overlay flottant — CTA pré-email ou confirmation post-email */}
          {!unlocked && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 rounded-b-2xl">
              {emailSent ? (
                <div className="relative bg-white rounded-2xl shadow-xl border border-aquiz-gray-lighter p-6 sm:p-8 max-w-md w-[calc(100%-2rem)] animate-in fade-in zoom-in-95 duration-500">
                  {/* Badge */}
                  <div className="flex justify-center mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      Analyse envoyée
                    </span>
                  </div>

                  {/* Icône */}
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-aquiz-green/10 flex items-center justify-center">
                      <Mail className="w-7 h-7 text-aquiz-green" />
                    </div>
                  </div>

                  {/* Texte */}
                  <h3 className="text-lg font-bold text-aquiz-black text-center mb-2">
                    Consultez votre boîte mail
                  </h3>
                  <p className="text-sm text-aquiz-gray text-center mb-4">
                    Votre analyse complète a été envoyée — scores détaillés, risques, recommandations personnalisées et conseils d&apos;expert.
                  </p>

                  {/* Score highlights — aperçu des résultats envoyés */}
                  {scoresPro.length > 0 && (
                    <div className="bg-aquiz-gray-lightest/50 rounded-xl p-3 mb-4 space-y-2">
                      <p className="text-[10px] font-semibold text-aquiz-gray uppercase tracking-wider text-center">Aperçu des scores</p>
                      {scoresPro
                        .sort((a, b) => b.scoreGlobal - a.scoreGlobal)
                        .map((sp) => {
                          const annonce = annonces.find(a => a.id === sp.annonceId)
                          return (
                            <div key={sp.annonceId} className="flex items-center gap-2">
                              <span className={`text-sm font-bold w-8 text-right ${getScoreColor(sp.scoreGlobal)}`}>{sp.scoreGlobal}</span>
                              <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    sp.scoreGlobal >= 75 ? 'bg-green-500' :
                                    sp.scoreGlobal >= 60 ? 'bg-lime-500' :
                                    sp.scoreGlobal >= 45 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${sp.scoreGlobal}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-aquiz-gray truncate max-w-25">
                                {annonce?.titre || annonce?.ville || 'Bien'}
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  )}

                  {/* Éléments inclus */}
                  <div className="flex flex-wrap justify-center gap-2 mb-5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-aquiz-gray-lightest text-aquiz-gray text-[11px] font-medium">
                      <Sparkles className="w-3 h-3 text-aquiz-green" /> Scores & verdicts
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-aquiz-gray-lightest text-aquiz-gray text-[11px] font-medium">
                      <ShieldCheck className="w-3 h-3 text-aquiz-green" /> Risques & marché
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-aquiz-gray-lightest text-aquiz-gray text-[11px] font-medium">
                      <MapPin className="w-3 h-3 text-aquiz-green" /> Analyse quartier
                    </span>
                  </div>

                  {/* Trust */}
                  <div className="flex items-center justify-center gap-3 text-[10px] text-aquiz-gray">
                    <span className="flex items-center gap-1"><Check className="w-3 h-3 text-aquiz-green" /> Gratuit</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3 text-aquiz-green" /> 1 seul email</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3 text-aquiz-green" /> Pas de spam</span>
                  </div>
                </div>
              ) : (
                <div className="relative bg-white rounded-2xl shadow-xl border border-aquiz-gray-lighter p-6 sm:p-8 max-w-md w-[calc(100%-2rem)] animate-in fade-in zoom-in-95 duration-500">
                  {/* Badge */}
                  <div className="flex justify-center mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-aquiz-green/10 text-aquiz-green text-xs font-semibold">
                      <Lock className="w-4 h-4" />
                      Analyse réservée
                    </span>
                  </div>

                  {/* Icône */}
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-aquiz-green/10 flex items-center justify-center">
                      <Mail className="w-7 h-7 text-aquiz-green" />
                    </div>
                  </div>

                  {/* Texte */}
                  <h3 className="text-lg font-bold text-aquiz-black text-center mb-2">
                    Recevez votre analyse complète
                  </h3>
                  <p className="text-sm text-aquiz-gray text-center mb-5">
                    Scores détaillés, risques, données marché et recommandations personnalisées — gratuitement par email.
                  </p>

                  {/* Éléments inclus */}
                  <div className="flex flex-wrap justify-center gap-2 mb-5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-aquiz-gray-lightest text-aquiz-gray text-[11px] font-medium">
                      <Sparkles className="w-3 h-3 text-aquiz-green" /> Scores & verdicts
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-aquiz-gray-lightest text-aquiz-gray text-[11px] font-medium">
                      <ShieldCheck className="w-3 h-3 text-aquiz-green" /> Risques & marché
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-aquiz-gray-lightest text-aquiz-gray text-[11px] font-medium">
                      <MapPin className="w-3 h-3 text-aquiz-green" /> Analyse quartier
                    </span>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={onOpenModal}
                    className="w-full py-3 px-4 rounded-xl bg-aquiz-green text-white font-semibold text-sm hover:bg-aquiz-green/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    Recevoir mon rapport gratuit
                  </button>

                  {/* Trust */}
                  <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-aquiz-gray">
                    <span className="flex items-center gap-1"><Check className="w-3 h-3 text-aquiz-green" /> Gratuit</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3 text-aquiz-green" /> 1 seul email</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3 text-aquiz-green" /> Pas de spam</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
