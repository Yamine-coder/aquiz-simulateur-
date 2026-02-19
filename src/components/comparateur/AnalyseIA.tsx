'use client'

/**
 * Analyse IA pour le comparateur d'annonces
 * Utilise le moteur de scoring professionnel unifié
 */

import {
    calculerScorePro,
    genererSyntheseComparaison,
    type ScoreComparateurResult,
} from '@/lib/comparateur/scoreComparateur'
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

/** Résultat enrichi avec rang calculé localement */
interface ScoreAvecRang {
  annonceId: string
  result: ScoreComparateurResult
  rang: number
}

export function AnalyseIA({ annonces, statistiques, budgetMax, onRequestHelp }: AnalyseIAProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Utilise le moteur de scoring professionnel unifié
  const { sortedScores, syntheseTexte, conseilsCles } = useMemo(() => {
    // Calcul du score pro pour chaque annonce (sans données enrichies DVF/Géo/OSM)
    const scores: ScoreAvecRang[] = annonces.map(annonce => ({
      annonceId: annonce.id,
      result: calculerScorePro(annonce, annonces, undefined, budgetMax),
      rang: 0,
    }))
    
    // Synthèse via le moteur unifié
    const synthese = genererSyntheseComparaison(scores.map(s => s.result))
    
    // Appliquer les rangs du classement
    synthese.classement.forEach(c => {
      const entry = scores.find(s => s.annonceId === c.annonceId)
      if (entry) entry.rang = c.rang
    })
    
    // Tri par rang
    const sorted = [...scores].sort((a, b) => a.rang - b.rang)
    
    // Conseils clés
    const conseils: string[] = []
    if (synthese.conseilGeneral) {
      conseils.push(synthese.conseilGeneral)
    }
    const passoireCount = annonces.filter(a => a.dpe === 'F' || a.dpe === 'G').length
    if (passoireCount > 0) {
      conseils.push(`${passoireCount} bien(s) classé(s) passoire énergétique — prévoir 15-30k€ de travaux de rénovation`)
    }
    if (budgetMax && annonces.every(a => a.prix > budgetMax * 0.9)) {
      conseils.push('Tous les biens sont proches de votre budget max — négociez ou élargissez votre recherche')
    }
    if (conseils.length === 0) {
      conseils.push('Visitez les biens pour vous faire une idée du quartier et de l\'ambiance')
    }
    
    return { sortedScores: sorted, syntheseTexte: synthese.syntheseGlobale, conseilsCles: conseils }
  }, [annonces, budgetMax])
  
  if (annonces.length === 0) return null
  
  const getAnnonce = (id: string) => annonces.find(a => a.id === id)
  const meilleur = sortedScores[0]
  
  return (
    <div className="bg-white rounded-2xl border border-aquiz-gray-lighter shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-aquiz-gray-lighter bg-aquiz-gray-lightest/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-aquiz-green/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-aquiz-green" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-aquiz-black">Analyse professionnelle</h3>
              <p className="text-xs text-aquiz-gray">Scoring 10 axes — {annonces.length} bien{annonces.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          {meilleur && (
            <div className="flex items-center gap-2 bg-aquiz-green/10 px-3 py-1.5 rounded-lg">
              <Star className="w-4 h-4 text-aquiz-green" />
              <span className="text-sm font-medium text-aquiz-green">
                Score max : {meilleur.result.scoreGlobal}/100
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Synthèse */}
      <div className="px-4 py-3 bg-aquiz-black/[0.02] border-b border-aquiz-gray-lighter">
        <p className="text-sm text-aquiz-gray-dark leading-relaxed">
          {syntheseTexte}
        </p>
      </div>
      
      {/* Classement des biens */}
      <div className="divide-y divide-aquiz-gray-lightest">
        {sortedScores.map(({ annonceId, result, rang }) => {
          const annonce = getAnnonce(annonceId)
          if (!annonce) return null
          
          const isExpanded = expandedId === annonceId
          const avantages = result.points.filter(p => p.type === 'avantage')
          const attentions = result.points.filter(p => p.type === 'attention' || p.type === 'conseil')
          const isBest = rang === 1
          
          return (
            <div key={annonceId}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : annonceId)}
                className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-aquiz-gray-lightest/50 transition-colors ${
                  isBest ? 'bg-aquiz-green/[0.03]' : ''
                }`}
              >
                {/* Rang */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  isBest ? 'bg-aquiz-green text-white' : 'bg-aquiz-gray-lightest text-aquiz-gray'
                }`}>
                  {rang}
                </div>
                
                {/* Info bien */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${isBest ? 'text-aquiz-green' : 'text-aquiz-black'}`}>
                      {annonce.titre || `${annonce.type === 'maison' ? 'Maison' : 'Appt'} ${annonce.pieces}p - ${annonce.ville}`}
                    </p>
                    {isBest && (
                      <span className="px-1.5 py-0.5 bg-aquiz-green/10 text-aquiz-green text-[10px] font-medium rounded">
                        {result.verdict}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-aquiz-gray mt-0.5">
                    <span>{annonce.prix.toLocaleString('fr-FR')} €</span>
                    <span>•</span>
                    <span>{annonce.surface} m²</span>
                    <span>•</span>
                    <span className="text-aquiz-gray-dark">Confiance {result.confiance}%</span>
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
                      result.scoreGlobal >= 70 ? 'text-aquiz-green' :
                      result.scoreGlobal >= 50 ? 'text-amber-500' :
                      'text-red-500'
                    }`}>
                      {result.scoreGlobal}
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
                  {/* Axes détaillés */}
                  <div className="pt-3 pb-2">
                    <p className="text-[10px] font-semibold text-aquiz-gray uppercase tracking-wider mb-2">Détail par axe</p>
                    <div className="space-y-1.5">
                      {result.axes.map(axe => (
                        <div key={axe.axe} className="flex items-center gap-2">
                          <span className="text-[10px] text-aquiz-gray w-24 truncate">{axe.label} ({axe.poids}%)</span>
                          <div className="flex-1 h-2 bg-aquiz-gray-lightest rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                axe.score >= 70 ? 'bg-aquiz-green' :
                                axe.score >= 45 ? 'bg-amber-400' :
                                axe.score > 0 ? 'bg-red-400' : 'bg-aquiz-gray-lighter'
                              }`}
                              style={{ width: `${axe.score}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-aquiz-gray w-8 text-right">
                            {axe.score > 0 ? axe.score : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-3 pt-2">
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
                              <div>
                                <span className="font-medium">{point.texte}</span>
                                {point.detail && (
                                  <p className="text-[10px] text-aquiz-gray mt-0.5">{point.detail}</p>
                                )}
                              </div>
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
                              <div>
                                <span className="font-medium">{point.texte}</span>
                                {point.detail && (
                                  <p className="text-[10px] text-aquiz-gray mt-0.5">{point.detail}</p>
                                )}
                              </div>
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
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-aquiz-gray">Conseil</span>
            </div>
            <p className="text-xs text-aquiz-gray leading-relaxed">
              {conseilsCles[0] || 'Visitez les biens pour vous faire une idée du quartier.'}
            </p>
          </div>
          
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
