'use client'

/**
 * EmailComparisonModal — Modale d'envoi du rapport de comparaison par email
 * 
 * Affiche un aperçu des biens comparés avec leurs scores,
 * collecte l'email, et envoie le rapport complet via l'API.
 * 
 * Design cohérent avec ContactModal (focus trap, Escape, body lock).
 */

import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { Annonce } from '@/types/annonces'
import {
    AlertCircle,
    ArrowRight,
    Calculator,
    Check,
    Home,
    Loader2,
    Mail,
    MessageCircle,
    Send,
    ShieldCheck,
    Sparkles,
    Star,
    X
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Données de scoring par annonce, passées depuis TableauComparaison */
export interface AnnonceScoreData {
  annonceId: string
  scoreGlobal: number
  verdict: string
  recommandation: string
  conseilPerso: string
  confiance: number
  axes: Array<{
    axe: string
    label: string
    score: number
    disponible: boolean
    detail: string
    impact: 'positif' | 'neutre' | 'negatif'
  }>
  points: Array<{
    texte: string
    detail?: string
    type: 'avantage' | 'attention' | 'conseil'
  }>
  estimations?: {
    loyerMensuelEstime?: number
    rendementBrut?: number
    coutEnergieAnnuel?: number
    budgetTravauxEstime?: number
  }
  enrichissement?: {
    marche?: { success: boolean; ecartPrixM2?: number; verdict?: string; prixM2MedianMarche?: number }
    risques?: { success: boolean; scoreRisque?: number; verdict?: string }
    quartier?: { success: boolean; scoreQuartier?: number; transports?: number; commerces?: number; ecoles?: number }
  }
}

interface EmailComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (email: string) => void
  /** Annonces à inclure dans l'email */
  annonces: Annonce[]
  /** Données de scoring enrichies */
  scoresData: AnnonceScoreData[]
  /** Email pré-rempli depuis le formulaire inline */
  initialEmail?: string
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-600'
  if (score >= 60) return 'text-lime-600'
  if (score >= 45) return 'text-amber-500'
  return 'text-red-500'
}

function getScoreBg(score: number): string {
  if (score >= 75) return 'bg-green-50 border-green-200'
  if (score >= 60) return 'bg-lime-50 border-lime-200'
  if (score >= 45) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

export function EmailComparisonModal({
  isOpen,
  onClose,
  onSuccess,
  annonces,
  scoresData,
  initialEmail = '',
}: EmailComparisonModalProps) {
  const focusTrapRef = useFocusTrap(isOpen)

  const [email, setEmail] = useState(initialEmail)
  const [prenom, setPrenom] = useState('')

  // Sync si initialEmail change (ouverture modale avec email pré-rempli)
  useEffect(() => {
    if (initialEmail) setEmail(initialEmail)
  }, [initialEmail])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fermer avec Escape + body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Reset à la fermeture — préserve initialEmail pour le re-engagement
  const wasOpen = useRef(isOpen)
  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      const timer = setTimeout(() => {
        setEmail(initialEmail || '')
        setPrenom('')
        setIsSubmitted(false)
        setError(null)
      }, 200)
      return () => clearTimeout(timer)
    }
    wasOpen.current = isOpen
  }, [isOpen, initialEmail])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@') || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Assembler le payload complet (annonce + scores + enrichissements)
      const payload = annonces.map(a => {
        const score = scoresData.find(s => s.annonceId === a.id)
        return {
          titre: a.titre,
          prix: a.prix,
          surface: a.surface,
          prixM2: a.prixM2,
          ville: a.ville,
          codePostal: a.codePostal,
          type: a.type,
          pieces: a.pieces,
          chambres: a.chambres,
          dpe: a.dpe,
          etage: a.etage,
          parking: a.parking,
          balconTerrasse: a.balconTerrasse,
          cave: a.cave,
          // Scoring
          scoreGlobal: score?.scoreGlobal ?? 50,
          verdict: score?.verdict ?? 'Analyse en cours',
          recommandation: score?.recommandation ?? 'a_etudier',
          conseilPerso: score?.conseilPerso ?? '',
          confiance: score?.confiance ?? 0,
          axes: score?.axes ?? [],
          points: score?.points ?? [],
          estimations: score?.estimations,
          enrichissement: score?.enrichissement,
        }
      })

      const response = await fetch('/api/send-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          prenom: prenom.trim() || undefined,
          annonces: payload,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }

      setIsSubmitted(true)
      onSuccess?.(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setIsSubmitting(false)
    }
  }, [email, prenom, annonces, scoresData, isSubmitting, onSuccess])

  if (!isOpen) return null

  // Identifier le meilleur score
  const bestScore = scoresData.length > 0
    ? Math.max(...scoresData.map(s => s.scoreGlobal))
    : 0

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={focusTrapRef}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-aquiz-gray-lighter px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-aquiz-green/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-aquiz-green" />
            </div>
            <div>
              <h3 className="text-base font-bold text-aquiz-black">
                Recevoir le rapport complet
              </h3>
              <p className="text-xs text-aquiz-gray">
                {annonces.length} bien{annonces.length > 1 ? 's' : ''} · Scores, analyses & verdicts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-aquiz-gray-lightest flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-aquiz-gray" />
          </button>
        </div>

        {/* Contenu */}
        <div className="px-6 py-5">

          {!isSubmitted ? (
            <>
              {/* Aperçu des biens avec score */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-aquiz-gray uppercase tracking-wide mb-3">
                  Rapport inclus dans l&apos;email
                </p>
                <div className="space-y-2">
                  {annonces.map((a) => {
                    const score = scoresData.find(s => s.annonceId === a.id)
                    const isBest = score?.scoreGlobal === bestScore && annonces.length > 1
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          isBest
                            ? 'bg-aquiz-green/5 border-aquiz-green/30'
                            : 'bg-aquiz-gray-lightest/50 border-aquiz-gray-lighter/50'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-white border border-aquiz-gray-lighter flex items-center justify-center shrink-0">
                          {isBest ? (
                            <Star className="w-4 h-4 text-aquiz-green fill-aquiz-green" />
                          ) : (
                            <Home className="w-4 h-4 text-aquiz-gray-light" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-aquiz-black truncate">
                            {a.titre || `${a.type === 'maison' ? 'Maison' : 'Appt'} ${a.pieces}p — ${a.ville}`}
                          </p>
                          <p className="text-xs text-aquiz-gray">
                            {a.prix.toLocaleString('fr-FR')} € · {a.surface} m²
                          </p>
                        </div>
                        {score && (
                          <div className={`shrink-0 px-2.5 py-1 rounded-lg border text-center ${getScoreBg(score.scoreGlobal)}`}>
                            <span className={`text-sm font-bold ${getScoreColor(score.scoreGlobal)}`}>
                              {score.scoreGlobal}
                            </span>
                            <span className="text-[9px] text-aquiz-gray-light">/100</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Ce que contient le rapport */}
              <div className="mb-5 p-3 rounded-xl bg-aquiz-green/5 border border-aquiz-green/10">
                <p className="text-xs font-semibold text-aquiz-green mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Contenu du rapport
                </p>
                <ul className="space-y-1">
                  {[
                    'Score global & verdict pour chaque bien',
                    'Notation détaillée par critère (10 axes)',
                    'Prix vs marché · Risques zone · Score quartier',
                    'Points forts & vigilance identifiés',
                    'Estimation loyer & rendement',
                    'Conseil personnalisé par bien',
                    'Recommandation du meilleur choix',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-aquiz-gray">
                      <Check className="w-3 h-3 text-aquiz-green mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="email-comparison" className="block text-xs font-medium text-aquiz-gray mb-1.5">
                    Adresse email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light" />
                    <input
                      id="email-comparison"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full pl-10 pr-4 py-3 text-sm border border-aquiz-gray-lighter rounded-xl focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green bg-white"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="prenom-comparison" className="block text-xs font-medium text-aquiz-gray mb-1.5">
                    Prénom <span className="text-aquiz-gray-light">(optionnel)</span>
                  </label>
                  <input
                    id="prenom-comparison"
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Votre prénom"
                    className="w-full px-4 py-3 text-sm border border-aquiz-gray-lighter rounded-xl focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green bg-white"
                    maxLength={100}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !email.includes('@')}
                  className="w-full flex items-center justify-center gap-2 bg-aquiz-green hover:bg-aquiz-green/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-aquiz-green/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Recevoir mon rapport gratuit
                    </>
                  )}
                </button>
              </form>

              {/* Trust signals */}
              <div className="mt-4 flex items-center justify-center gap-4">
                {['100% gratuit', 'Sans spam', 'Données sécurisées'].map((label) => (
                  <span key={label} className="flex items-center gap-1 text-[10px] text-aquiz-gray">
                    <ShieldCheck className="w-2.5 h-2.5 text-aquiz-gray-light" />
                    {label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            /* ═══ CONFIRMATION + NEXT STEPS ═══ */
            <div className="py-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-aquiz-green/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-aquiz-green" />
              </div>
              <h4 className="text-lg font-bold text-aquiz-black mb-2">
                Rapport envoyé !
              </h4>
              <p className="text-sm text-aquiz-gray mb-5 max-w-xs mx-auto">
                Vérifiez votre boîte mail à <strong className="text-aquiz-black">{email}</strong>.
                Vous y trouverez les scores, analyses et verdicts pour chaque bien.
              </p>

              {/* Next steps — engagement post-conversion */}
              <div className="space-y-2 mb-5 max-w-sm mx-auto">
                <p className="text-[10px] text-aquiz-gray uppercase tracking-wider font-semibold mb-2">Continuez votre projet</p>
                <a
                  href="/simulateur/mode-a"
                  className="flex items-center gap-3 p-3 rounded-xl border border-aquiz-gray-lighter hover:border-aquiz-green hover:bg-aquiz-green/5 transition-all group text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Calculator className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-aquiz-black group-hover:text-aquiz-green transition-colors">Simuler ma capacité d&apos;achat</p>
                    <p className="text-[10px] text-aquiz-gray">Savoir si ces biens sont dans votre budget</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-aquiz-gray-light group-hover:text-aquiz-green transition-colors shrink-0" />
                </a>
                <a
                  href="/aides"
                  className="flex items-center gap-3 p-3 rounded-xl border border-aquiz-gray-lighter hover:border-aquiz-green hover:bg-aquiz-green/5 transition-all group text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-aquiz-black group-hover:text-aquiz-green transition-colors">Vérifier mes aides (PTZ, PAS…)</p>
                    <p className="text-[10px] text-aquiz-gray">Jusqu&apos;à 40% du prix financé à taux zéro</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-aquiz-gray-light group-hover:text-aquiz-green transition-colors shrink-0" />
                </a>
              </div>

              <button
                onClick={onClose}
                className="text-xs text-aquiz-gray hover:text-aquiz-black transition-colors underline underline-offset-2"
              >
                Voir mes analyses débloquées
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
