'use client'

/**
 * Composant d'affichage des conseils AQUIZ avancés
 * Design sobre respectant la charte AQUIZ (noir, gris, vert)
 */

import type { ResultatConseilsAvances, ScenarioAlternatif } from '@/lib/conseils/genererConseilsAvances'
import {
    AlertCircle,
    ArrowRight,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    Lightbulb,
    Target,
    TrendingUp
} from 'lucide-react'
import { useState } from 'react'

interface ConseilsAvancesProps {
  resultats: ResultatConseilsAvances
  onContactConseiller?: () => void
}

export function ConseilsAvances({ resultats, onContactConseiller }: ConseilsAvancesProps) {
  const [scenarioExpand, setScenarioExpand] = useState<string | null>(null)
  const [showAllConseils, setShowAllConseils] = useState(false)

  const { diagnostic, conseils, scenarios, resumeExecutif } = resultats

  // Icône selon le type - palette sobre AQUIZ
  const getConseilStyle = (type: string) => {
    switch (type) {
      case 'succes': return { icon: CheckCircle, bg: 'bg-aquiz-green' }
      case 'amelioration': return { icon: TrendingUp, bg: 'bg-aquiz-black' }
      case 'optimisation': return { icon: Lightbulb, bg: 'bg-aquiz-gray' }
      case 'alerte': return { icon: AlertCircle, bg: 'bg-aquiz-black' }
      case 'info': return { icon: Lightbulb, bg: 'bg-aquiz-gray' }
      default: return { icon: Lightbulb, bg: 'bg-aquiz-gray' }
    }
  }

  const conseilsAffiches = showAllConseils ? conseils : conseils.slice(0, 3)

  return (
    <div className="space-y-4">
      
      {/* DIAGNOSTIC BANCAIRE */}
      <div className="bg-white rounded-2xl shadow-sm border border-aquiz-gray-lighter overflow-hidden">
        <div className="px-5 py-4 bg-aquiz-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Diagnostic bancaire</h2>
                <p className="text-xs text-white/60">Analyse de votre dossier</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{diagnostic.scoreGlobal}<span className="text-sm font-normal text-white/60">/100</span></div>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white">
                {diagnostic.probabiliteAcceptation}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* Résumé */}
          <p className="text-sm text-aquiz-gray leading-relaxed mb-4">{resumeExecutif}</p>

          {/* Points forts & vigilance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {diagnostic.pointsForts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-aquiz-green uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Points forts
                </p>
                <ul className="space-y-1.5">
                  {diagnostic.pointsForts.map((point, idx) => (
                    <li key={idx} className="text-xs text-aquiz-gray flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-aquiz-green mt-1.5 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {diagnostic.pointsVigilance.length > 0 && (
              <div>
                <p className="text-xs font-medium text-aquiz-gray uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Points d&apos;attention
                </p>
                <ul className="space-y-1.5">
                  {diagnostic.pointsVigilance.map((point, idx) => (
                    <li key={idx} className="text-xs text-aquiz-gray flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-aquiz-gray mt-1.5 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Infos banques */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-aquiz-gray-lighter">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-aquiz-gray" />
              <span className="text-xs text-aquiz-gray">Délai estimé : <strong className="text-aquiz-black">{diagnostic.delaiEstime}</strong></span>
            </div>
            {diagnostic.banquesRecommandees.length > 0 && (
              <div className="text-xs text-aquiz-gray">
                Banques ciblées : <strong className="text-aquiz-black">{diagnostic.banquesRecommandees.join(', ')}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA CONSEILLER - Position haute pour visibilité */}
      {onContactConseiller && (
        <CTAConseiller 
          score={diagnostic.scoreGlobal}
          probabilite={diagnostic.probabiliteAcceptation}
          onClick={onContactConseiller}
        />
      )}

      {/* CONSEILS PERSONNALISÉS */}
      <div className="bg-white rounded-2xl shadow-sm border border-aquiz-gray-lighter overflow-hidden">
        <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-aquiz-black" />
          <h2 className="text-sm font-semibold text-aquiz-black">Recommandations</h2>
        </div>
        
        <div className="divide-y divide-aquiz-gray-lighter">
          {conseilsAffiches.map((conseil) => {
            const style = getConseilStyle(conseil.type)
            const IconComponent = style.icon
            
            return (
              <div key={conseil.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center shrink-0`}>
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-aquiz-black">{conseil.titre}</p>
                      {conseil.priorite === 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-aquiz-black text-white shrink-0">
                          PRIORITAIRE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-aquiz-gray mt-1 leading-relaxed">{conseil.conseil}</p>
                    
                    {conseil.impact && (
                      <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-aquiz-green/10 border border-aquiz-green/20">
                        <p className="text-[11px] font-medium text-aquiz-green">
                          ↳ {conseil.impact}
                        </p>
                      </div>
                    )}
                    
                    {conseil.action && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-aquiz-gray-lightest text-[10px] font-medium text-aquiz-black">
                          <ArrowRight className="w-3 h-3" />
                          {conseil.action.label}
                        </span>
                        {conseil.action.timeline && (
                          <span className="text-[10px] text-aquiz-gray">{conseil.action.timeline}</span>
                        )}
                        {conseil.action.gain && (
                          <span className="text-[10px] text-aquiz-green font-medium">{conseil.action.gain}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {conseils.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllConseils(!showAllConseils)}
            className="w-full px-5 py-3 flex items-center justify-center gap-2 text-xs font-medium text-aquiz-gray hover:text-aquiz-black hover:bg-aquiz-gray-lightest transition-colors border-t border-aquiz-gray-lighter"
          >
            {showAllConseils ? (
              <>Voir moins <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Voir {conseils.length - 3} conseil{conseils.length - 3 > 1 ? 's' : ''} de plus <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}
      </div>

      {/* SCÉNARIOS ALTERNATIFS */}
      {scenarios.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-aquiz-gray-lighter overflow-hidden">
          <div className="px-5 py-3.5 border-b border-aquiz-gray-lighter flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-aquiz-black" />
            <h2 className="text-sm font-semibold text-aquiz-black">Scénarios alternatifs</h2>
          </div>
          
          <div className="divide-y divide-aquiz-gray-lighter">
            {scenarios.map((scenario) => (
              <ScenarioCard 
                key={scenario.id} 
                scenario={scenario}
                isExpanded={scenarioExpand === scenario.id}
                onToggle={() => setScenarioExpand(scenarioExpand === scenario.id ? null : scenario.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// CTA intelligent basé sur le profil
function CTAConseiller({ 
  score, 
  probabilite, 
  onClick 
}: { 
  score: number
  probabilite: string
  onClick: () => void 
}) {
  // Message contextuel selon le score
  const getContextualMessage = () => {
    if (score >= 80) {
      return {
        headline: "Excellent profil !",
        subtext: "Un conseiller peut négocier votre taux et vous faire économiser jusqu'à 15 000 € sur votre crédit.",
        cta: "Être rappelé gratuitement",
        urgency: "Créneaux disponibles aujourd'hui"
      }
    } else if (score >= 60) {
      return {
        headline: "Bon potentiel d'emprunt",
        subtext: "Nos conseillers peuvent optimiser votre dossier et améliorer vos conditions de financement.",
        cta: "Parler à un expert",
        urgency: "Réponse sous 24h"
      }
    } else if (score >= 40) {
      return {
        headline: "Votre projet est réalisable",
        subtext: "Un conseiller peut vous aider à renforcer votre dossier et trouver les meilleures solutions.",
        cta: "Obtenir des conseils personnalisés",
        urgency: "Accompagnement gratuit"
      }
    } else {
      return {
        headline: "Ne renoncez pas à votre projet",
        subtext: "Nos experts connaissent des solutions pour les profils atypiques. Discutons de vos options.",
        cta: "Explorer les alternatives",
        urgency: "Premier échange sans engagement"
      }
    }
  }

  const message = getContextualMessage()

  return (
    <div className="bg-aquiz-black rounded-xl p-6">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-base font-semibold text-white mb-1">
            {message.headline}
          </h3>
          <p className="text-sm text-slate-400">
            {message.subtext}
          </p>
        </div>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-aquiz-green hover:bg-aquiz-green/90 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          {message.cta}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Composant Scénario - palette sobre AQUIZ
function ScenarioCard({ 
  scenario, 
  isExpanded, 
  onToggle 
}: { 
  scenario: ScenarioAlternatif
  isExpanded: boolean
  onToggle: () => void 
}) {
  const formatMontant = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(Math.abs(n)))
  const isPositif = scenario.resultats.economieOuCout > 0

  return (
    <div className="px-5 py-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scenario.recommande ? 'bg-aquiz-green/10' : 'bg-aquiz-gray-lightest'}`}>
            <TrendingUp className={`w-5 h-5 ${scenario.recommande ? 'text-aquiz-green' : 'text-aquiz-gray'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-aquiz-black">{scenario.titre}</p>
              {scenario.recommande && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-aquiz-green/10 text-aquiz-green">
                  RECOMMANDÉ
                </span>
              )}
            </div>
            <p className="text-xs text-aquiz-gray">{scenario.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-sm font-bold ${isPositif ? 'text-aquiz-green' : 'text-aquiz-black'}`}>
              {isPositif ? '+' : '-'}{formatMontant(scenario.resultats.economieOuCout)} €
            </p>
            <p className="text-[10px] text-aquiz-gray">sur le budget</p>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-aquiz-gray" /> : <ChevronDown className="w-4 h-4 text-aquiz-gray" />}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-aquiz-gray-lighter">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-[10px] text-aquiz-gray uppercase mb-1.5">Avantages</p>
              <ul className="space-y-1">
                {scenario.avantages.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-aquiz-black">
                    <CheckCircle className="w-3 h-3 mt-0.5 shrink-0 text-aquiz-green" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] text-aquiz-gray uppercase mb-1.5">Inconvénients</p>
              <ul className="space-y-1">
                {scenario.inconvenients.map((inc, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-aquiz-gray">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    {inc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 p-3 bg-aquiz-gray-lightest rounded-lg text-center">
            <div>
              <p className="text-lg font-bold text-aquiz-black">{formatMontant(scenario.resultats.nouveauBudget)} €</p>
              <p className="text-[10px] text-aquiz-gray">Nouveau budget</p>
            </div>
            <div>
              <p className="text-lg font-bold text-aquiz-black">{scenario.resultats.nouveauTaux.toFixed(2)}%</p>
              <p className="text-[10px] text-aquiz-gray">Taux estimé</p>
            </div>
            <div>
              <p className="text-lg font-bold text-aquiz-black">{formatMontant(scenario.resultats.nouvellesMensualites)} €</p>
              <p className="text-[10px] text-aquiz-gray">Mensualité</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
