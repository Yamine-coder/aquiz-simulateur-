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
    Lightbulb,
    TrendingUp
} from 'lucide-react'
import { useState } from 'react'

interface ConseilsAvancesProps {
  resultats: ResultatConseilsAvances
  onContactConseiller?: () => void
}

export function ConseilsAvances({ resultats }: ConseilsAvancesProps) {
  const [scenarioExpand, setScenarioExpand] = useState<string | null>(null)
  const [showAllConseils, setShowAllConseils] = useState(false)

  const { conseils, scenarios } = resultats

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
