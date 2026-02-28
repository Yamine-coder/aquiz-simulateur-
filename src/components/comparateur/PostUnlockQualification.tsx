'use client'

/**
 * PostUnlockQualification — Questionnaire rapide post-déblocage
 *
 * Apparaît juste après que l'utilisateur a donné son email
 * pour qualifier le lead (chaud / tiède / froid).
 *
 * 2 questions :
 *  1. Type de projet (résidence principale, investissement, curieux)
 *  2. Délai (< 3 mois, 3-6 mois, > 6 mois, je ne sais pas)
 *
 * Si lead chaud → affiche le CTA expert callback
 */

import { ArrowRight, Bell, Check, ChevronRight, Home, Phone, Search, Sparkles, Target, Timer, TrendingUp } from 'lucide-react'
import { useCallback, useState } from 'react'

// ─── Types ────────────────────────────────────────────────

type TypeProjet = 'residence_principale' | 'investissement' | 'curieux'
type DelaiProjet = 'moins_3_mois' | '3_6_mois' | 'plus_6_mois' | 'ne_sait_pas'

export interface QualificationData {
  typeProjet: TypeProjet
  delai: DelaiProjet
  isHot: boolean
}

interface PostUnlockQualificationProps {
  /** Email du lead (pour l'API) */
  email: string
  /** Callback quand la qualification est terminée */
  onQualified: (data: QualificationData) => void
}

// ─── Config options ───────────────────────────────────────

const TYPES_PROJET = [
  { value: 'residence_principale' as const, label: 'Résidence principale', icon: Home },
  { value: 'investissement' as const, label: 'Investissement locatif', icon: TrendingUp },
  { value: 'curieux' as const, label: 'Je me renseigne', icon: Search },
]

const DELAIS = [
  { value: 'moins_3_mois' as const, label: 'Moins de 3 mois', hot: true },
  { value: '3_6_mois' as const, label: '3 à 6 mois', hot: true },
  { value: 'plus_6_mois' as const, label: 'Plus de 6 mois', hot: false },
  { value: 'ne_sait_pas' as const, label: 'Je ne sais pas encore', hot: false },
]

// ─── Helpers ──────────────────────────────────────────────

function isLeadHot(type: TypeProjet, delai: DelaiProjet): boolean {
  // Lead chaud = achat sérieux + court terme
  if (type === 'curieux') return false
  if (type === 'residence_principale' && (delai === 'moins_3_mois' || delai === '3_6_mois')) return true
  if (type === 'investissement' && delai === 'moins_3_mois') return true
  return false
}

// ─── Composant ────────────────────────────────────────────

export function PostUnlockQualification({ email, onQualified }: PostUnlockQualificationProps) {
  const [step, setStep] = useState<1 | 2 | 'done'>(1)
  const [typeProjet, setTypeProjet] = useState<TypeProjet | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSelectType = useCallback((type: TypeProjet) => {
    setTypeProjet(type)
    setStep(2)
  }, [])

  const handleSelectDelai = useCallback(async (d: DelaiProjet) => {
    if (!typeProjet) return
    setSaving(true)

    const hot = isLeadHot(typeProjet, d)
    const data: QualificationData = { typeProjet, delai: d, isHot: hot }

    // Envoyer à l'API
    try {
      await fetch('/api/leads/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, typeProjet, delai: d }),
      })
    } catch {
      // Silently fail — pas bloquant pour l'UX
    }

    setSaving(false)
    setStep('done')
    onQualified(data)
  }, [typeProjet, email, onQualified])

  // ─── Étape terminée ──────────────────────────────────
  if (step === 'done') return null

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-6">
      <div className="rounded-2xl border border-aquiz-green/20 bg-linear-to-br from-aquiz-green/5 to-white p-5 shadow-sm">
        {/* En-tête */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-aquiz-green/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-aquiz-green" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-aquiz-black">
              {step === 1 ? 'Aidez-nous à personnaliser votre rapport' : 'Encore une question rapide'}
            </h3>
            <p className="text-[11px] text-aquiz-gray">
              {step === 1 ? '2 questions rapides — 10 secondes' : 'Dernière étape !'}
            </p>
          </div>
          {/* Progress dots */}
          <div className="ml-auto flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full transition-colors ${step >= 1 ? 'bg-aquiz-green' : 'bg-aquiz-gray-lighter'}`} />
            <div className={`w-2 h-2 rounded-full transition-colors ${step >= 2 ? 'bg-aquiz-green' : 'bg-aquiz-gray-lighter'}`} />
          </div>
        </div>

        {/* Étape 1 : Type de projet */}
        {step === 1 && (
          <div className="space-y-2">
            <p className="text-xs text-aquiz-gray mb-3 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-aquiz-green" />
              Quel est votre projet ?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TYPES_PROJET.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelectType(option.value)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-aquiz-gray-lighter bg-white hover:border-aquiz-green hover:bg-aquiz-green/5 transition-all group cursor-pointer text-left"
                >
                  <option.icon className="w-4.5 h-4.5 text-aquiz-gray group-hover:text-aquiz-green transition-colors shrink-0" />
                  <span className="text-sm text-aquiz-black group-hover:text-aquiz-green font-medium transition-colors">
                    {option.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-aquiz-gray-light group-hover:text-aquiz-green ml-auto transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Étape 2 : Délai */}
        {step === 2 && (
          <div className="space-y-2">
            <p className="text-xs text-aquiz-gray mb-3 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-aquiz-green" />
              Dans quel délai souhaitez-vous acheter ?
            </p>
            {/* Choix du type résumé */}
            <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-aquiz-green/8 rounded-lg w-fit">
              <Check className="w-3 h-3 text-aquiz-green" />
              <span className="text-[11px] text-aquiz-green font-medium">
                {TYPES_PROJET.find(t => t.value === typeProjet)?.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DELAIS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelectDelai(option.value)}
                  disabled={saving}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-aquiz-gray-lighter bg-white hover:border-aquiz-green hover:bg-aquiz-green/5 transition-all group cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm text-aquiz-black group-hover:text-aquiz-green font-medium transition-colors">
                    {option.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-aquiz-gray-light group-hover:text-aquiz-green ml-auto transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Expert Callback CTA ──────────────────────────────────
// Affiché uniquement pour les leads chauds après qualification

interface ExpertCallbackCtaProps {
  onRequestCallback: () => void
}

export function ExpertCallbackCta({ onRequestCallback }: ExpertCallbackCtaProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 mt-4">
      <div className="rounded-2xl border-2 border-aquiz-green/30 bg-linear-to-r from-aquiz-green/10 to-aquiz-green/5 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Icône */}
          <div className="w-12 h-12 rounded-2xl bg-aquiz-green/15 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-aquiz-green" />
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-aquiz-black mb-1">
              Votre projet semble concret !
            </h3>
            <p className="text-xs text-aquiz-gray mb-3 leading-relaxed">
              Un expert AQUIZ peut vous rappeler gratuitement sous 2h pour analyser vos biens ensemble et vous aider à négocier.
            </p>
            <button
              onClick={onRequestCallback}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-aquiz-green hover:bg-aquiz-green/90 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-aquiz-green/20 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              Être rappelé gratuitement
            </button>
          </div>

          {/* Badge timing */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-aquiz-green/10 rounded-full shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-aquiz-green animate-pulse" />
            <span className="text-[10px] font-medium text-aquiz-green whitespace-nowrap">Sous 2h</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Warm Lead CTA ────────────────────────────────────────
// Affiché pour les leads tièdes/froids après qualification (non-hot)
// Propose de continuer l'exploration sans pression commerciale

export function WarmLeadCta() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-4">
      <div className="rounded-2xl border border-aquiz-gray-lighter bg-aquiz-gray-lightest/40 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-aquiz-black mb-1">
              Prenez votre temps
            </h3>
            <p className="text-xs text-aquiz-gray mb-3 leading-relaxed">
              Votre rapport est dans votre boîte mail. En attendant, vous pouvez vérifier votre capacité d&apos;achat ou explorer les aides disponibles.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href="/simulateur/mode-a"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-aquiz-gray-lighter hover:border-aquiz-green text-sm font-medium text-aquiz-black hover:text-aquiz-green rounded-xl transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Simuler mon budget
                <ArrowRight className="w-3 h-3" />
              </a>
              <a
                href="/aides"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-aquiz-gray-lighter hover:border-aquiz-green text-sm font-medium text-aquiz-black hover:text-aquiz-green rounded-xl transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Vérifier mes aides
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
