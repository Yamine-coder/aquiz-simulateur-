'use client'

/**
 * PdfEmailGate — Gate le téléchargement PDF derrière un email
 * 
 * Remplace le bouton "Télécharger mon rapport PDF" par un formulaire
 * email inline. Une fois l'email fourni, le PDF se génère et se télécharge
 * automatiquement. L'email est sauvegardé comme lead.
 * 
 * Inspiré de MeilleursAgents / Empruntis :
 * - Montre la valeur ("Votre rapport est prêt")
 * - Demande un engagement minimal (email + prénom optionnel)
 * - Déclenche le téléchargement immédiat après soumission
 */

import { Check, Download, Loader2, Lock, Mail, User } from 'lucide-react'
import { useCallback, useState } from 'react'

interface PdfEmailGateProps {
  /** Titre affiché au-dessus du gate */
  titre?: string
  /** Description sous le titre */
  description?: string
  /** Source du lead (pour tracking) */
  source: 'simulateur-a' | 'simulateur-b'
  /** Contexte JSON libre à sauvegarder avec le lead */
  contexte?: Record<string, unknown>
  /** Callback pour générer le PDF — appelé après capture email */
  onGeneratePDF: () => Promise<void> | void
}

export function PdfEmailGate({
  titre = 'Votre rapport est prêt',
  description = 'Entrez votre email pour télécharger votre étude complète au format PDF.',
  source,
  contexte,
  onGeneratePDF,
}: PdfEmailGateProps) {
  const [email, setEmail] = useState('')
  const [prenom, setPrenom] = useState('')
  const [loading, setLoading] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    if (!email.includes('@') || loading) return
    setError(null)
    setLoading(true)

    try {
      // 1. Sauvegarder le lead
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, prenom: prenom || undefined, source, contexte }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      // 2. Générer et télécharger le PDF
      await onGeneratePDF()

      // 3. Marquer comme débloqué
      setUnlocked(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }, [email, prenom, loading, source, contexte, onGeneratePDF])

  // === État débloqué : bouton de re-téléchargement ===
  if (unlocked) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-aquiz-green/30 bg-linear-to-br from-aquiz-green/5 via-white to-aquiz-green/10">
        <div className="relative p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-aquiz-green/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-aquiz-green" />
          </div>
          <h3 className="text-lg font-bold text-aquiz-black mb-1">Rapport téléchargé !</h3>
          <p className="text-sm text-aquiz-gray mb-4">
            Votre étude PDF a été générée. Vous pouvez la re-télécharger ci-dessous.
          </p>
          <button
            type="button"
            onClick={() => onGeneratePDF()}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-aquiz-green hover:bg-aquiz-green/90 text-white font-semibold rounded-xl shadow-md shadow-aquiz-green/20 transition-all hover:shadow-lg hover:shadow-aquiz-green/30 hover:-translate-y-0.5"
          >
            <Download className="w-5 h-5" />
            Re-télécharger le PDF
          </button>
        </div>
      </div>
    )
  }

  // === État verrouillé : formulaire email ===
  return (
    <div className="relative overflow-hidden rounded-2xl border border-aquiz-green/20 bg-linear-to-br from-aquiz-green/5 via-white to-aquiz-green/10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-aquiz-green/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-aquiz-green/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="relative p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-aquiz-green/10 flex items-center justify-center mx-auto mb-4 ring-4 ring-aquiz-green/5">
          <Lock className="w-7 h-7 text-aquiz-green" />
        </div>
        <h3 className="text-lg font-bold text-aquiz-black mb-1">{titre}</h3>
        <p className="text-sm text-aquiz-gray mb-5 max-w-md mx-auto">{description}</p>

        {/* Ce que le PDF contient */}
        <div className="w-full max-w-sm mx-auto mb-5 grid grid-cols-2 gap-1.5 text-left">
          {[
            'Budget détaillé',
            'Capacité d\'emprunt',
            'Conseils personnalisés',
            'Opportunités géographiques',
          ].map((item) => (
            <div key={item} className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-aquiz-gray-lightest/50">
              <Check className="w-3.5 h-3.5 text-aquiz-green shrink-0" />
              <span className="text-[11px] text-aquiz-gray-dark">{item}</span>
            </div>
          ))}
        </div>

        {/* Formulaire (div pour éviter form imbriqué) */}
        <div className="w-full max-w-sm mx-auto space-y-2">
          <div className="flex gap-2">
            <div className="relative w-2/5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light" />
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Prénom"
                className="w-full pl-10 pr-3 py-3 text-sm border border-aquiz-gray-lighter rounded-xl focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green bg-white"
              />
            </div>
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
                placeholder="Votre email"
                className="w-full pl-10 pr-4 py-3 text-sm border border-aquiz-gray-lighter rounded-xl focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green bg-white"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !email.includes('@')}
            className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-aquiz-green hover:bg-aquiz-green/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-md shadow-aquiz-green/20 transition-all hover:shadow-lg hover:shadow-aquiz-green/30"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {loading ? 'Génération…' : 'Télécharger mon rapport PDF'}
          </button>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
        </div>

        {/* Trust signals */}
        <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-aquiz-gray">
          <span>Gratuit</span>
          <span className="text-aquiz-gray-lighter">·</span>
          <span>Pas de spam</span>
          <span className="text-aquiz-gray-lighter">·</span>
          <span>PDF instantané</span>
        </div>
      </div>
    </div>
  )
}
