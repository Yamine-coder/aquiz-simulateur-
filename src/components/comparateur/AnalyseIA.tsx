'use client'

/**
 * Analyse IA pour le comparateur d'annonces
 * Fournit des conseils personnalisés et une recommandation claire
 */

import type { Annonce, StatistiquesComparaison } from '@/types/annonces'
import {
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Lightbulb,
    Phone,
    Sparkles,
    Star,
    ThumbsDown,
    ThumbsUp
} from 'lucide-react'
import { useMemo, useState } from 'react'

interface AnalyseIAProps {
  annonces: Annonce[]
  statistiques: StatistiquesComparaison
  budgetMax?: number | null
  onRequestHelp?: () => void
}

interface PointAnalyse {
  type: 'avantage' | 'attention' | 'conseil' | 'info'
  titre: string
  description: string
  importance: 'haute' | 'moyenne' | 'basse'
}

interface AnalyseAnnonce {
  annonce: Annonce
  score: number
  rang: number
  points: PointAnalyse[]
  verdict: string
  recommande: boolean
}

/**
 * Génère une analyse complète et personnalisée des annonces
 */
function genererAnalyse(
  annonces: Annonce[],
  stats: StatistiquesComparaison,
  budgetMax?: number | null
): { analyses: AnalyseAnnonce[]; syntheseGlobale: string; conseilsCles: string[] } {
  
  // Calcul des moyennes et extrêmes
  const prixMoyen = annonces.reduce((sum, a) => sum + a.prix, 0) / annonces.length
  const surfaceMoyenne = annonces.reduce((sum, a) => sum + a.surface, 0) / annonces.length
  
  const minPrix = Math.min(...annonces.map(a => a.prix))
  const maxPrix = Math.max(...annonces.map(a => a.prix))
  const minPrixM2 = Math.min(...annonces.map(a => a.prixM2))
  const maxPrixM2 = Math.max(...annonces.map(a => a.prixM2))
  const maxSurface = Math.max(...annonces.map(a => a.surface))
  const ecartPrix = maxPrix - minPrix
  
  // Score DPE (A=7, G=1)
  const scoreDPE: Record<string, number> = { 'A': 7, 'B': 6, 'C': 5, 'D': 4, 'E': 3, 'F': 2, 'G': 1, 'NC': 0 }
  
  const analyses: AnalyseAnnonce[] = annonces.map(annonce => {
    const points: PointAnalyse[] = []
    let score = 50 // Score de base
    
    // === ANALYSE PRIX ===
    if (annonce.prix === minPrix && annonces.length > 1) {
      points.push({
        type: 'avantage',
        titre: 'Prix le plus bas',
        description: `${(maxPrix - minPrix).toLocaleString('fr-FR')} € de moins que le plus cher`,
        importance: 'haute'
      })
      score += 15
    }
    
    if (annonce.prix > prixMoyen * 1.15) {
      points.push({
        type: 'attention',
        titre: 'Prix au-dessus de la moyenne',
        description: `${Math.round((annonce.prix / prixMoyen - 1) * 100)}% plus cher que la moyenne des biens comparés`,
        importance: 'moyenne'
      })
      score -= 10
    }
    
    // === ANALYSE PRIX/M² ===
    if (annonce.prixM2 === minPrixM2 && annonces.length > 1) {
      points.push({
        type: 'avantage',
        titre: 'Meilleur prix au m²',
        description: `${annonce.prixM2.toLocaleString('fr-FR')} €/m² - le plus avantageux de la sélection`,
        importance: 'haute'
      })
      score += 20
    } else if (annonce.prixM2 === maxPrixM2 && annonces.length > 1) {
      points.push({
        type: 'attention',
        titre: 'Prix au m² le plus élevé',
        description: `${Math.round((annonce.prixM2 / minPrixM2 - 1) * 100)}% plus cher au m² que le moins cher`,
        importance: 'moyenne'
      })
      score -= 15
    }
    
    // === ANALYSE SURFACE ===
    if (annonce.surface === maxSurface && annonces.length > 1) {
      points.push({
        type: 'avantage',
        titre: 'Plus grande surface',
        description: `${annonce.surface} m² - ${Math.round((annonce.surface / surfaceMoyenne - 1) * 100)}% de plus que la moyenne`,
        importance: 'moyenne'
      })
      score += 10
    }
    
    if (annonce.surface < surfaceMoyenne * 0.85) {
      points.push({
        type: 'info',
        titre: 'Surface plus compacte',
        description: `${Math.round((1 - annonce.surface / surfaceMoyenne) * 100)}% plus petit que la moyenne`,
        importance: 'basse'
      })
    }
    
    // === ANALYSE DPE ===
    const dpeScore = scoreDPE[annonce.dpe] || 0
    
    if (dpeScore >= 5) { // A, B ou C
      points.push({
        type: 'avantage',
        titre: `Bonne performance énergétique (${annonce.dpe})`,
        description: 'Factures d\'énergie maîtrisées, pas de travaux d\'isolation urgents',
        importance: dpeScore >= 6 ? 'haute' : 'moyenne'
      })
      score += dpeScore >= 6 ? 15 : 8
    } else if (dpeScore <= 2 && dpeScore > 0) { // F ou G
      points.push({
        type: 'attention',
        titre: `Passoire énergétique (${annonce.dpe})`,
        description: 'Travaux de rénovation énergétique à prévoir (10 000 - 30 000 €). Interdiction de location possible.',
        importance: 'haute'
      })
      score -= 20
    } else if (dpeScore === 3) { // E
      points.push({
        type: 'conseil',
        titre: `DPE moyen (${annonce.dpe})`,
        description: 'Prévoir un budget isolation/chauffage pour améliorer le confort',
        importance: 'moyenne'
      })
      score -= 5
    }
    
    // === ANALYSE ÉQUIPEMENTS ===
    const equipements = []
    if (annonce.balconTerrasse) equipements.push('extérieur')
    if (annonce.parking) equipements.push('stationnement')
    if (annonce.cave) equipements.push('cave')
    if (annonce.ascenseur) equipements.push('ascenseur')
    
    if (equipements.length >= 3) {
      points.push({
        type: 'avantage',
        titre: 'Bien équipé',
        description: `Inclut : ${equipements.join(', ')}`,
        importance: 'moyenne'
      })
      score += 10
    } else if (equipements.length === 0) {
      points.push({
        type: 'info',
        titre: 'Peu d\'équipements',
        description: 'Pas de balcon, parking ni cave inclus',
        importance: 'basse'
      })
    }
    
    // === ANALYSE BUDGET ===
    if (budgetMax) {
      const ecart = budgetMax - annonce.prix
      const pourcent = Math.round((annonce.prix / budgetMax) * 100)
      
      if (pourcent <= 85) {
        points.push({
          type: 'avantage',
          titre: 'Marge confortable sur votre budget',
          description: `${ecart.toLocaleString('fr-FR')} € de marge pour les travaux, meubles ou négociation`,
          importance: 'haute'
        })
        score += 15
      } else if (pourcent > 100) {
        points.push({
          type: 'attention',
          titre: 'Dépasse votre budget',
          description: `${Math.abs(ecart).toLocaleString('fr-FR')} € au-dessus - négociation nécessaire ou apport supplémentaire`,
          importance: 'haute'
        })
        score -= 25
      } else if (pourcent > 95) {
        points.push({
          type: 'conseil',
          titre: 'Budget serré',
          description: 'Peu de marge pour les imprévus. Prévoyez les frais de notaire en plus.',
          importance: 'moyenne'
        })
        score -= 5
      }
    }
    
    // === ANALYSE ÉTAGE (appartements) ===
    if (annonce.type === 'appartement' && annonce.etage !== undefined) {
      if (annonce.etage === 0) {
        points.push({
          type: 'info',
          titre: 'Rez-de-chaussée',
          description: 'Accessible mais potentiellement moins lumineux et plus bruyant',
          importance: 'basse'
        })
      } else if (annonce.etage >= 4 && !annonce.ascenseur) {
        points.push({
          type: 'attention',
          titre: 'Étage élevé sans ascenseur',
          description: `${annonce.etage}e étage à pied - à considérer pour le quotidien et la revente`,
          importance: 'moyenne'
        })
        score -= 10
      } else if (annonce.etage >= 3 && annonce.ascenseur) {
        points.push({
          type: 'avantage',
          titre: 'Étage élevé avec ascenseur',
          description: 'Plus de luminosité et calme, confort optimal',
          importance: 'basse'
        })
        score += 5
      }
    }
    
    // Clamp score
    score = Math.max(0, Math.min(100, score))
    
    // Verdict
    let verdict: string
    let recommande = false
    
    if (score >= 75) {
      verdict = 'Excellent choix'
      recommande = true
    } else if (score >= 60) {
      verdict = 'Bon potentiel'
      recommande = true
    } else if (score >= 45) {
      verdict = 'À considérer'
    } else if (score >= 30) {
      verdict = 'Des réserves'
    } else {
      verdict = 'Peu recommandé'
    }
    
    return {
      annonce,
      score,
      rang: 0, // Sera calculé après
      points,
      verdict,
      recommande
    }
  })
  
  // Calcul des rangs
  const sorted = [...analyses].sort((a, b) => b.score - a.score)
  sorted.forEach((a, i) => {
    const original = analyses.find(x => x.annonce.id === a.annonce.id)
    if (original) original.rang = i + 1
  })
  
  // Synthèse globale
  const meilleur = sorted[0]
  let syntheseGlobale = ''
  
  if (annonces.length === 1) {
    syntheseGlobale = `Ce bien obtient un score de ${meilleur.score}/100. ${meilleur.verdict.toLowerCase()} pour votre projet.`
  } else if (sorted[0].score - sorted[1].score >= 15) {
    syntheseGlobale = `Le bien "${meilleur.annonce.titre || meilleur.annonce.ville}" se démarque nettement avec un score de ${meilleur.score}/100. C'est notre recommandation principale.`
  } else {
    syntheseGlobale = `Les biens sont assez proches. "${meilleur.annonce.titre || meilleur.annonce.ville}" arrive en tête (${meilleur.score}/100) mais "${sorted[1].annonce.titre || sorted[1].annonce.ville}" reste une alternative solide (${sorted[1].score}/100).`
  }
  
  // Conseils clés
  const conseilsCles: string[] = []
  
  if (ecartPrix > prixMoyen * 0.3) {
    conseilsCles.push('Grande disparité de prix entre les biens - affinez vos critères de recherche')
  }
  
  if (analyses.some(a => a.points.some(p => p.titre.includes('Passoire')))) {
    conseilsCles.push('Attention aux biens avec un mauvais DPE : prévoir 15-30k€ de travaux de rénovation énergétique')
  }
  
  if (budgetMax && analyses.every(a => a.annonce.prix > budgetMax * 0.9)) {
    conseilsCles.push('Tous les biens sont proches de votre budget max - négociez ou élargissez votre zone de recherche')
  }
  
  const avecParking = analyses.filter(a => a.annonce.parking).length
  if (avecParking > 0 && avecParking < analyses.length) {
    conseilsCles.push(`${annonces.length - avecParking} bien(s) sans parking - vérifiez les solutions de stationnement du quartier`)
  }
  
  if (conseilsCles.length === 0) {
    conseilsCles.push('Visitez les biens pour vous faire une idée du quartier et de l\'ambiance')
    conseilsCles.push('N\'hésitez pas à négocier : 3-5% de marge est courant sur le marché actuel')
  }
  
  return { analyses, syntheseGlobale, conseilsCles }
}

export function AnalyseIA({ annonces, statistiques, budgetMax, onRequestHelp }: AnalyseIAProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  const { analyses, syntheseGlobale, conseilsCles } = useMemo(
    () => genererAnalyse(annonces, statistiques, budgetMax),
    [annonces, statistiques, budgetMax]
  )
  
  if (annonces.length === 0) return null
  
  const meilleur = analyses.find(a => a.rang === 1)
  
  return (
    <div className="bg-white rounded-2xl border border-aquiz-gray-lighter shadow-sm overflow-hidden">
      {/* Header - Style tableau */}
      <div className="px-4 py-3 border-b border-aquiz-gray-lighter bg-aquiz-gray-lightest/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-aquiz-green/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-aquiz-green" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-aquiz-black">Analyse intelligente</h3>
              <p className="text-xs text-aquiz-gray">Évaluation de {annonces.length} bien{annonces.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          {meilleur && (
            <div className="flex items-center gap-2 bg-aquiz-green/10 px-3 py-1.5 rounded-lg">
              <Star className="w-4 h-4 text-aquiz-green" />
              <span className="text-sm font-medium text-aquiz-green">
                Score max : {meilleur.score}/100
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Synthèse */}
      <div className="px-4 py-3 bg-aquiz-black/[0.02] border-b border-aquiz-gray-lighter">
        <p className="text-sm text-aquiz-gray-dark leading-relaxed">
          {syntheseGlobale}
        </p>
      </div>
      
      {/* Classement des biens */}
      <div className="divide-y divide-aquiz-gray-lightest">
        {analyses.map((analyse) => {
          const isExpanded = expandedId === analyse.annonce.id
          const avantages = analyse.points.filter(p => p.type === 'avantage')
          const attentions = analyse.points.filter(p => p.type === 'attention' || p.type === 'conseil')
          const isBest = analyse.rang === 1
          
          return (
            <div key={analyse.annonce.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : analyse.annonce.id)}
                className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-aquiz-gray-lightest/50 transition-colors ${
                  isBest ? 'bg-aquiz-green/[0.03]' : ''
                }`}
              >
                {/* Rang */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  isBest ? 'bg-aquiz-green text-white' : 'bg-aquiz-gray-lightest text-aquiz-gray'
                }`}>
                  {analyse.rang}
                </div>
                
                {/* Info bien */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${isBest ? 'text-aquiz-green' : 'text-aquiz-black'}`}>
                      {analyse.annonce.titre || `${analyse.annonce.type === 'maison' ? 'Maison' : 'Appt'} ${analyse.annonce.pieces}p - ${analyse.annonce.ville}`}
                    </p>
                    {isBest && (
                      <span className="px-1.5 py-0.5 bg-aquiz-green/10 text-aquiz-green text-[10px] font-medium rounded">
                        Recommandé
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-aquiz-gray mt-0.5">
                    <span>{analyse.annonce.prix.toLocaleString('fr-FR')} €</span>
                    <span>•</span>
                    <span>{analyse.annonce.surface} m²</span>
                  </div>
                </div>
                
                {/* Score + indicateurs */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="flex items-center gap-0.5 text-aquiz-green">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {avantages.length}
                    </span>
                    <span className="flex items-center gap-0.5 text-amber-500">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {attentions.length}
                    </span>
                  </div>
                  
                  {/* Score */}
                  <div className="w-12 text-right">
                    <span className={`text-lg font-bold ${
                      analyse.score >= 70 ? 'text-aquiz-green' :
                      analyse.score >= 50 ? 'text-amber-500' :
                      'text-red-500'
                    }`}>
                      {analyse.score}
                    </span>
                    <span className="text-[10px] text-aquiz-gray">/100</span>
                  </div>
                  
                  {/* Chevron */}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-aquiz-gray" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-aquiz-gray" />
                  )}
                </div>
              </button>
              
              {/* Détails */}
              {isExpanded && (
                <div className="px-4 pb-4 bg-aquiz-gray-lightest/30">
                  <div className="grid md:grid-cols-2 gap-3 pt-3">
                    {/* Points forts */}
                    <div className="bg-white rounded-lg border border-aquiz-green/20 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ThumbsUp className="w-3.5 h-3.5 text-aquiz-green" />
                        <span className="text-xs font-semibold text-aquiz-green">Points forts</span>
                      </div>
                      {avantages.length > 0 ? (
                        <ul className="space-y-1.5">
                          {avantages.map((point, i) => (
                            <li key={i} className="text-xs text-aquiz-gray-dark flex items-start gap-1.5">
                              <CheckCircle className="w-3 h-3 text-aquiz-green mt-0.5 shrink-0" />
                              <span>{point.titre}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-aquiz-gray italic">Pas de point fort notable</p>
                      )}
                    </div>
                    
                    {/* Points d'attention */}
                    <div className="bg-white rounded-lg border border-amber-200 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ThumbsDown className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600">Points d&apos;attention</span>
                      </div>
                      {attentions.length > 0 ? (
                        <ul className="space-y-1.5">
                          {attentions.map((point, i) => (
                            <li key={i} className="text-xs text-aquiz-gray-dark flex items-start gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                              <span>{point.titre}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-aquiz-gray italic">Aucun point bloquant</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Conseils + CTA */}
      <div className="px-4 py-3 border-t border-aquiz-gray-lighter bg-aquiz-gray-lightest/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Conseils */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-aquiz-gray">Conseil</span>
            </div>
            <p className="text-xs text-aquiz-gray leading-relaxed">
              {conseilsCles[0] || 'Visitez les biens pour vous faire une idée du quartier.'}
            </p>
          </div>
          
          {/* CTA */}
          {onRequestHelp && (
            <button
              onClick={onRequestHelp}
              className="flex items-center justify-center gap-2 bg-aquiz-green hover:bg-aquiz-green-dark text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              Être rappelé
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
