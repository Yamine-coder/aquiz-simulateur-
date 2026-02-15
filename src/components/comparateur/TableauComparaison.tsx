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
import { useMemo } from 'react'
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

interface PointAnalyse {
  texte: string
  detail?: string
  type: 'avantage' | 'attention' | 'conseil'
}

interface AnalyseAnnonce {
  annonceId: string
  score: number
  scoreEnrichi?: number // Score incluant les données enrichies (DVF, Géorisques, OSM)
  verdict: string
  points: PointAnalyse[]
  conseilPerso: string
}

interface DonneesEnrichies {
  marche?: {
    success: boolean
    ecartPrixM2?: number
    verdict?: 'excellent' | 'bon' | 'correct' | 'cher' | 'tres_cher'
  }
  risques?: {
    success: boolean
    verdict?: 'sûr' | 'vigilance' | 'risqué'
    zoneInondable?: boolean
  }
  quartier?: {
    success: boolean
    scoreQuartier?: number
  }
}

/**
 * Calcule le bonus/malus à appliquer au score de base
 * en fonction des données enrichies (DVF, Géorisques, OSM)
 */
function calculerBonusEnrichi(donnees: DonneesEnrichies): { bonus: number; details: PointAnalyse[] } {
  let bonus = 0
  const details: PointAnalyse[] = []
  
  // === DVF : Prix vs Marché ===
  if (donnees.marche?.success && donnees.marche.ecartPrixM2 !== undefined) {
    const ecart = donnees.marche.ecartPrixM2
    if (ecart <= -15) {
      // Plus de 15% sous le marché
      bonus += 15
      details.push({
        type: 'avantage',
        texte: 'Excellent prix vs marché',
        detail: `${Math.abs(ecart).toFixed(0)}% sous la médiane du secteur`
      })
    } else if (ecart <= -5) {
      // 5-15% sous le marché
      bonus += 10
      details.push({
        type: 'avantage',
        texte: 'Bon prix vs marché',
        detail: `${Math.abs(ecart).toFixed(0)}% sous la médiane du secteur`
      })
    } else if (ecart <= 5) {
      // ±5% du marché
      bonus += 0
    } else if (ecart <= 15) {
      // 5-15% au-dessus du marché
      bonus -= 5
      details.push({
        type: 'conseil',
        texte: 'Prix légèrement au-dessus du marché',
        detail: `+${ecart.toFixed(0)}% vs médiane - marge de négociation possible`
      })
    } else {
      // Plus de 15% au-dessus
      bonus -= 10
      details.push({
        type: 'attention',
        texte: 'Prix élevé vs marché',
        detail: `+${ecart.toFixed(0)}% au-dessus de la médiane du secteur`
      })
    }
  }
  
  // === GÉORISQUES : Risques zone ===
  if (donnees.risques?.success) {
    if (donnees.risques.verdict === 'sûr') {
      bonus += 10
      details.push({
        type: 'avantage',
        texte: 'Zone sécurisée',
        detail: 'Aucun risque naturel ou technologique majeur identifié'
      })
    } else if (donnees.risques.verdict === 'vigilance') {
      bonus -= 5
      details.push({
        type: 'conseil',
        texte: 'Zone à vigilance',
        detail: 'Quelques risques identifiés - consultez Géorisques pour plus de détails'
      })
    } else if (donnees.risques.verdict === 'risqué') {
      bonus -= 15
      details.push({
        type: 'attention',
        texte: 'Zone à risques',
        detail: 'Risques significatifs identifiés - à prendre en compte dans votre décision'
      })
    }
    
    // Malus supplémentaire zone inondable
    if (donnees.risques.zoneInondable) {
      bonus -= 5
    }
  }
  
  // === OPENSTREETMAP : Score quartier ===
  if (donnees.quartier?.success && donnees.quartier.scoreQuartier !== undefined) {
    const scoreQ = donnees.quartier.scoreQuartier
    if (scoreQ >= 70) {
      bonus += 10
      details.push({
        type: 'avantage',
        texte: 'Quartier très bien équipé',
        detail: `Score ${scoreQ}/100 - transports, commerces et services à proximité`
      })
    } else if (scoreQ >= 50) {
      bonus += 5
      details.push({
        type: 'avantage',
        texte: 'Quartier bien desservi',
        detail: `Score ${scoreQ}/100 - bonnes commodités`
      })
    } else if (scoreQ >= 30) {
      bonus += 0
    } else {
      bonus -= 5
      details.push({
        type: 'conseil',
        texte: 'Quartier peu équipé',
        detail: `Score ${scoreQ}/100 - véhicule conseillé`
      })
    }
  }
  
  return { bonus, details }
}

/** Calcule une analyse détaillée et personnalisée pour chaque annonce */
function calculerAnalyse(annonces: Annonce[], budgetMax?: number | null): { 
  analyses: AnalyseAnnonce[]
  syntheseGlobale: string
  conseilGeneral: string 
} {
  if (annonces.length === 0) return { analyses: [], syntheseGlobale: '', conseilGeneral: '' }
  
  // Calculs statistiques
  const prixMoyen = annonces.reduce((sum, a) => sum + a.prix, 0) / annonces.length
  const surfaceMoyenne = annonces.reduce((sum, a) => sum + a.surface, 0) / annonces.length
  const minPrix = Math.min(...annonces.map(a => a.prix))
  const maxPrix = Math.max(...annonces.map(a => a.prix))
  const minPrixM2 = Math.min(...annonces.map(a => a.prixM2))
  const maxPrixM2 = Math.max(...annonces.map(a => a.prixM2))
  const maxSurface = Math.max(...annonces.map(a => a.surface))
  const maxPieces = Math.max(...annonces.map(a => a.pieces))
  const scoreDPE: Record<string, number> = { 'A': 7, 'B': 6, 'C': 5, 'D': 4, 'E': 3, 'F': 2, 'G': 1, 'NC': 0 }
  
  const analyses: AnalyseAnnonce[] = annonces.map(annonce => {
    const points: PointAnalyse[] = []
    let score = 50
    
    // ========== ANALYSE PRIX ==========
    if (annonce.prix === minPrix && annonces.length > 1) {
      const economie = maxPrix - minPrix
      points.push({
        type: 'avantage',
        texte: 'Prix le plus attractif',
        detail: `${economie.toLocaleString('fr-FR')} € de moins que le bien le plus cher`
      })
      score += 15
    } else if (annonce.prix === maxPrix && annonces.length > 1) {
      const surcoût = Math.round((annonce.prix / prixMoyen - 1) * 100)
      points.push({
        type: 'attention',
        texte: 'Prix le plus élevé',
        detail: `${surcoût}% au-dessus de la moyenne de votre sélection`
      })
      score -= 10
    }
    
    // ========== ANALYSE PRIX AU M² ==========
    if (annonce.prixM2 === minPrixM2 && annonces.length > 1) {
      points.push({
        type: 'avantage',
        texte: 'Meilleur rapport prix/surface',
        detail: `${annonce.prixM2.toLocaleString('fr-FR')} €/m² - le plus avantageux`
      })
      score += 20
    } else if (annonce.prixM2 === maxPrixM2 && annonces.length > 1) {
      const ecartPourcent = Math.round((annonce.prixM2 / minPrixM2 - 1) * 100)
      points.push({
        type: 'attention',
        texte: 'Prix au m² élevé',
        detail: `${ecartPourcent}% plus cher au m² que le meilleur de la sélection`
      })
      score -= 15
    }
    
    // ========== ANALYSE SURFACE ==========
    if (annonce.surface === maxSurface && annonces.length > 1) {
      const plusGrand = Math.round((annonce.surface / surfaceMoyenne - 1) * 100)
      points.push({
        type: 'avantage',
        texte: 'Espace de vie le plus généreux',
        detail: `${plusGrand}% plus grand que la moyenne de votre sélection`
      })
      score += 10
    } else if (annonce.surface < surfaceMoyenne * 0.85) {
      points.push({
        type: 'conseil',
        texte: 'Surface plus compacte',
        detail: 'Vérifiez que l\'agencement correspond à vos besoins au quotidien'
      })
    }
    
    // ========== ANALYSE DPE (très important) ==========
    const dpeScore = scoreDPE[annonce.dpe] || 0
    if (dpeScore >= 6) { // A ou B
      points.push({
        type: 'avantage',
        texte: `Excellente performance énergétique (${annonce.dpe})`,
        detail: 'Factures maîtrisées, bon pour la revente, pas de travaux urgents'
      })
      score += 15
    } else if (dpeScore === 5) { // C
      points.push({
        type: 'avantage',
        texte: `Bonne performance énergétique (${annonce.dpe})`,
        detail: 'Consommation raisonnable, quelques améliorations possibles'
      })
      score += 8
    } else if (dpeScore === 4) { // D
      points.push({
        type: 'conseil',
        texte: `DPE moyen (${annonce.dpe})`,
        detail: 'Prévoir un budget isolation pour améliorer le confort'
      })
    } else if (dpeScore === 3) { // E
      points.push({
        type: 'attention',
        texte: `DPE à améliorer (${annonce.dpe})`,
        detail: 'Travaux énergétiques recommandés (5 000 - 15 000 €)'
      })
      score -= 8
    } else if (dpeScore <= 2 && dpeScore > 0) { // F ou G
      points.push({
        type: 'attention',
        texte: `Passoire thermique (${annonce.dpe})`,
        detail: 'Travaux obligatoires à prévoir : 15 000 - 30 000 €. Location interdite à terme.'
      })
      score -= 20
    }
    
    // ========== ANALYSE ÉQUIPEMENTS ==========
    const equipements: string[] = []
    if (annonce.balconTerrasse) equipements.push('extérieur')
    if (annonce.parking) equipements.push('stationnement')
    if (annonce.cave) equipements.push('cave')
    if (annonce.ascenseur) equipements.push('ascenseur')
    
    if (equipements.length >= 3) {
      points.push({
        type: 'avantage',
        texte: 'Bien équipé et fonctionnel',
        detail: `Inclut ${equipements.join(', ')} - confort au quotidien`
      })
      score += 10
    } else if (equipements.length === 0) {
      points.push({
        type: 'conseil',
        texte: 'Équipements limités',
        detail: 'Pas de balcon, parking ni cave. Vérifiez les solutions alternatives du quartier.'
      })
      score -= 5
    }
    
    // ========== ANALYSE ÉTAGE (appartements) ==========
    if (annonce.type === 'appartement' && annonce.etage !== undefined) {
      if (annonce.etage === 0) {
        points.push({
          type: 'conseil',
          texte: 'Rez-de-chaussée',
          detail: 'Accessible mais potentiellement moins lumineux. Vérifiez la sécurité et le vis-à-vis.'
        })
      } else if (annonce.etage >= 4 && !annonce.ascenseur) {
        points.push({
          type: 'attention',
          texte: `${annonce.etage}e étage sans ascenseur`,
          detail: 'Impact sur le quotidien et la revente. À bien considérer.'
        })
        score -= 10
      } else if (annonce.etage >= 3 && annonce.ascenseur) {
        points.push({
          type: 'avantage',
          texte: 'Étage élevé avec ascenseur',
          detail: 'Luminosité, calme et vue dégagée probables'
        })
        score += 5
      }
    }
    
    // ========== ANALYSE BUDGET ==========
    if (budgetMax) {
      const ecart = budgetMax - annonce.prix
      const pourcent = Math.round((annonce.prix / budgetMax) * 100)
      
      if (pourcent <= 80) {
        points.push({
          type: 'avantage',
          texte: 'Marge de manœuvre importante',
          detail: `${ecart.toLocaleString('fr-FR')} € disponibles pour travaux, meubles ou négociation`
        })
        score += 15
      } else if (pourcent <= 90) {
        points.push({
          type: 'avantage',
          texte: 'Dans votre budget',
          detail: `Marge de ${ecart.toLocaleString('fr-FR')} € pour les frais annexes`
        })
        score += 10
      } else if (pourcent <= 100) {
        points.push({
          type: 'conseil',
          texte: 'Budget serré',
          detail: 'Prévoyez les frais de notaire (7-8%) en plus du prix affiché'
        })
      } else {
        const depassement = annonce.prix - budgetMax
        points.push({
          type: 'attention',
          texte: 'Dépasse votre budget',
          detail: `${depassement.toLocaleString('fr-FR')} € au-dessus. Négociation ou apport supplémentaire nécessaire.`
        })
        score -= 25
      }
    }
    
    // ========== ANALYSE PIÈCES ==========
    if (annonce.pieces === maxPieces && annonces.length > 1 && maxPieces >= 4) {
      points.push({
        type: 'avantage',
        texte: 'Le plus de pièces',
        detail: 'Plus de flexibilité pour l\'aménagement et l\'évolution de la famille'
      })
      score += 5
    }
    
    // Score final
    score = Math.max(0, Math.min(100, score))
    
    // Verdict
    let verdict: string
    if (score >= 75) verdict = 'Excellent choix'
    else if (score >= 60) verdict = 'Bon potentiel'
    else if (score >= 45) verdict = 'À étudier'
    else if (score >= 30) verdict = 'Avec réserves'
    else verdict = 'Peu recommandé'
    
    // Conseil personnalisé selon le profil du bien
    let conseilPerso = ''
    const avantages = points.filter(p => p.type === 'avantage')
    const attentions = points.filter(p => p.type === 'attention')
    
    if (avantages.length >= 3 && attentions.length === 0) {
      conseilPerso = 'Ce bien coche beaucoup de cases. Planifiez une visite rapidement !'
    } else if (attentions.some(a => a.texte.includes('Passoire'))) {
      conseilPerso = 'Demandez des devis rénovation avant de vous engager.'
    } else if (attentions.some(a => a.texte.includes('budget'))) {
      conseilPerso = 'Préparez vos arguments pour négocier le prix.'
    } else if (avantages.length > attentions.length) {
      conseilPerso = 'Plus de points forts que de faiblesses. Bonne option à considérer.'
    } else if (attentions.length > avantages.length) {
      conseilPerso = 'Plusieurs points de vigilance. Comparez bien avec les autres options.'
    } else {
      conseilPerso = 'Visitez le bien pour vous faire votre propre avis.'
    }
    
    return { annonceId: annonce.id, score, verdict, points, conseilPerso }
  })
  
  // Synthèse globale
  const sorted = [...analyses].sort((a, b) => b.score - a.score)
  const meilleur = sorted[0]
  let syntheseGlobale = ''
  
  if (annonces.length === 1) {
    syntheseGlobale = `Score de ${meilleur.score}/100 - ${meilleur.verdict.toLowerCase()}.`
  } else if (sorted[0].score - sorted[1].score >= 15) {
    const bien = annonces.find(a => a.id === meilleur.annonceId)
    syntheseGlobale = `"${bien?.titre || bien?.ville}" se démarque clairement avec ${meilleur.score}/100.`
  } else {
    syntheseGlobale = `Les biens sont proches. Le meilleur score est ${meilleur.score}/100.`
  }
  
  // Conseil général
  let conseilGeneral = 'N\'hésitez pas à négocier : une marge de 3-5% est courante sur le marché actuel.'
  
  if (analyses.some(a => a.points.some(p => p.texte.includes('Passoire')))) {
    conseilGeneral = 'Attention : certains biens ont un DPE F/G. Prévoyez 15-30k€ de travaux énergétiques obligatoires.'
  } else if (budgetMax && analyses.every(a => a.points.some(p => p.texte.includes('Dépasse')))) {
    conseilGeneral = 'Tous les biens dépassent votre budget. Envisagez de négocier ou d\'élargir votre zone de recherche.'
  } else if (analyses.every(a => a.score >= 60)) {
    conseilGeneral = 'Bonne sélection ! Tous les biens présentent un profil intéressant. La visite fera la différence.'
  }
  
  return { analyses, syntheseGlobale, conseilGeneral }
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

/**
 * Calcule la mensualité de crédit pour un bien immobilier
 * Formule : M = (C × t) / (1 - (1 + t)^(-n))
 * où C = capital emprunté, t = taux mensuel, n = nombre de mensualités
 */
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
  
  // Cas limite : taux à 0%
  if (tauxMensuel === 0) {
    return capitalEmprunte / nombreMensualites
  }
  
  const mensualite = (capitalEmprunte * tauxMensuel) / 
    (1 - Math.pow(1 + tauxMensuel, -nombreMensualites))
  
  return Math.round(mensualite)
}

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
  // Calcul des analyses pour chaque annonce
  const { analyses: analysesBase, syntheseGlobale, conseilGeneral } = useMemo(
    () => calculerAnalyse(annonces, budgetMax),
    [annonces, budgetMax]
  )
  
  // Hook pour l'analyse enrichie avec les APIs (DVF, Géorisques, OSM)
  const { 
    getAnalyse: getAnalyseEnrichie, 
    isLoading: isLoadingEnrichie,
    loadingIds
  } = useAnalyseEnrichie(annonces)
  
  // Calcul des scores enrichis (score de base + bonus des données enrichies)
  const analysesEnrichies = useMemo(() => {
    return analysesBase.map(analyseBase => {
      const enrichie = getAnalyseEnrichie(analyseBase.annonceId)
      
      if (!enrichie) {
        return { ...analyseBase, scoreEnrichi: undefined }
      }
      
      const { bonus, details } = calculerBonusEnrichi({
        marche: enrichie.marche,
        risques: enrichie.risques,
        quartier: enrichie.quartier
      })
      
      // Score enrichi = score de base + bonus (clampé entre 0 et 100)
      const scoreEnrichi = Math.max(0, Math.min(100, analyseBase.score + bonus))
      
      // Ajouter les points d'analyse enrichis
      const pointsEnrichis = [...analyseBase.points, ...details]
      
      // Recalculer le verdict avec le score enrichi
      let verdictEnrichi: string
      if (scoreEnrichi >= 75) verdictEnrichi = 'Excellent choix'
      else if (scoreEnrichi >= 60) verdictEnrichi = 'Bon potentiel'
      else if (scoreEnrichi >= 45) verdictEnrichi = 'À étudier'
      else if (scoreEnrichi >= 30) verdictEnrichi = 'Avec réserves'
      else verdictEnrichi = 'Peu recommandé'
      
      return {
        ...analyseBase,
        scoreEnrichi,
        points: pointsEnrichis,
        verdict: verdictEnrichi
      }
    })
  }, [analysesBase, getAnalyseEnrichie])
  
  // Utiliser le score enrichi si disponible, sinon le score de base
  const getAnalyse = (id: string) => analysesEnrichies.find(a => a.annonceId === id)
  const meilleurScore = Math.max(...analysesEnrichies.map(a => a.scoreEnrichi ?? a.score), 0)
  
  // Préparer les données pour le graphique radar
  const radarData = useMemo(() => {
    if (annonces.length === 0) return []
    return annonces.map((annonce, index) => {
      const enrichie = getAnalyseEnrichie(annonce.id)
      
      // Calculer les scores par dimension
      const scorePrix = enrichie?.marche?.success 
        ? (enrichie.marche.ecartPrixM2 !== undefined 
            ? Math.max(0, Math.min(100, 70 - enrichie.marche.ecartPrixM2 * 2))
            : 50)
        : 50
      
      const scoreQuartier = enrichie?.quartier?.success && enrichie.quartier.scoreQuartier !== undefined
        ? enrichie.quartier.scoreQuartier
        : 50
        
      const scoreRisques = enrichie?.risques?.success
        ? (enrichie.risques.verdict === 'sûr' ? 90 :
           enrichie.risques.verdict === 'vigilance' ? 60 : 30)
        : 50
        
      const scoreEnergie = annonce.dpe === 'A' ? 100 :
                          annonce.dpe === 'B' ? 85 :
                          annonce.dpe === 'C' ? 70 :
                          annonce.dpe === 'D' ? 55 :
                          annonce.dpe === 'E' ? 40 :
                          annonce.dpe === 'F' ? 25 : 10
                          
      const scoreEquipements = [
        annonce.balconTerrasse,
        annonce.parking,
        annonce.cave,
        annonce.type === 'appartement' && annonce.ascenseur
      ].filter(Boolean).length * 25
      
      return {
        id: annonce.id,
        nom: annonce.ville.split(' ')[0].substring(0, 12),
        couleur: COULEURS_RADAR[index % COULEURS_RADAR.length],
        valeurs: [
          { label: 'prix', value: scorePrix },
          { label: 'quartier', value: scoreQuartier },
          { label: 'risques', value: scoreRisques },
          { label: 'energie', value: scoreEnergie },
          { label: 'equipements', value: scoreEquipements }
        ]
      }
    })
  }, [annonces, getAnalyseEnrichie])
  
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
                          <img src={annonce.imageUrl} alt="" className="w-full h-full object-cover" />
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
          
          {/* Section Performance */}
          <tr className="bg-aquiz-gray-lightest/50">
            <td colSpan={annonces.length + 1} className="py-2 px-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                Performance énergétique
              </div>
            </td>
          </tr>
          
          <LigneComparaison
            label="Diagnostic DPE"
            values={annonces.map((a) => (
              <Badge key={a.id} className={`${COULEURS_DPE[a.dpe]} text-white text-xs`}>
                Classe {a.dpe}
              </Badge>
            ))}
            format="dpe"
          />
          
          {annonces.some((a) => a.ges) && (
            <LigneComparaison
              label="Émissions GES"
              values={annonces.map((a) => a.ges ? (
                <Badge key={a.id} className={`${COULEURS_DPE[a.ges]} text-white text-xs`}>
                  {a.ges}
                </Badge>
              ) : undefined)}
              format="dpe"
            />
          )}
          
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
              <span className="text-[9px] text-aquiz-gray block mt-0.5">Source: DVF (data.gouv.fr)</span>
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
              <span className="text-[9px] text-aquiz-gray block mt-0.5">Source: Géorisques (gouv.fr)</span>
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
              <span className="text-[9px] text-aquiz-gray block mt-0.5">Source: OpenStreetMap</span>
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
          
          {/* === SECTION VERDICT === */}
          <tr className="bg-gradient-to-r from-aquiz-green/5 to-aquiz-green/10">
            <td colSpan={annonces.length + 1} className="py-2 px-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-aquiz-gray uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-aquiz-green" />
                Verdict & Analyse
              </div>
              <div className="text-[11px] text-aquiz-gray mt-0.5">{syntheseGlobale}</div>
            </td>
          </tr>
          
          {/* Graphique Radar - Comparaison visuelle */}
          {annonces.length > 1 && (
            <tr className="border-b border-aquiz-gray-lightest">
              <td colSpan={annonces.length + 1} className="py-6 px-4">
                <div className="flex flex-col items-center">
                  <h4 className="text-xs font-medium text-aquiz-gray mb-4">Comparaison des profils</h4>
                  <RadarChart data={radarData} size={280} showLabels showLegend />
                </div>
              </td>
            </tr>
          )}
          
          {/* Score global */}
          <tr className="border-b border-aquiz-gray-lightest">
            <td className="py-4 px-4 text-sm font-medium text-aquiz-black">
              <div className="flex items-center gap-1.5">
                Score global
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-aquiz-gray-light cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[220px] text-xs">
                    <p className="font-medium mb-1">Score intégrant :</p>
                    <ul className="space-y-0.5 text-[10px]">
                      <li>• Caractéristiques du bien</li>
                      <li>• Prix vs marché (DVF)</li>
                      <li>• Risques zone (Géorisques)</li>
                      <li>• Score quartier (OSM)</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
            </td>
            {annonces.map((annonce) => {
              const analyse = getAnalyse(annonce.id)
              const isLoadingThis = loadingIds.has(annonce.id)
              if (!analyse) return <td key={annonce.id} className="py-4 px-4 text-center">-</td>
              
              const scoreFinal = analyse.scoreEnrichi ?? analyse.score
              const isBest = scoreFinal === meilleurScore && annonces.length > 1
              
              return (
                <td key={annonce.id} className="py-4 px-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    {isLoadingThis ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-aquiz-gray" />
                        <span className="text-xs text-aquiz-gray">Enrichissement...</span>
                      </div>
                    ) : (
                      <>
                        <div className={`text-3xl font-bold ${
                          scoreFinal >= 70 ? 'text-aquiz-green' :
                          scoreFinal >= 50 ? 'text-orange-500' :
                          'text-red-500'
                        }`}>
                          {scoreFinal}
                          <span className="text-xs text-aquiz-gray font-normal ml-0.5">/100</span>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          scoreFinal >= 70 ? 'bg-aquiz-green/10 text-aquiz-green' :
                          scoreFinal >= 50 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {analyse.verdict}
                        </span>
                        {isBest && (
                          <span className="text-[10px] font-semibold text-white bg-aquiz-green px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Meilleur choix
                          </span>
                        )}
                      </>
                    )}
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
