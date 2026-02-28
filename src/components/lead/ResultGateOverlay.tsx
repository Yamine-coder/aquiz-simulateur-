'use client'

/**
 * ResultGateOverlay — Bloque l'affichage des résultats derrière un email gate
 * 
 * Tout le contenu est flouté avec des badges cadenas.
 * La modale fixe centrée demande l'email pour débloquer.
 * Charte AQUIZ : noir (#1a1a1a), gris (#6b7280), vert (#22c55e).
 * L'état débloqué est stocké en localStorage (clé par source).
 */

import { validateEmailClient } from '@/lib/validators/email'
import { Calculator, Calendar, CheckCircle, ChevronRight, ClipboardCheck, Euro, FileBarChart, Loader2, Lock, LockOpen, Mail, RefreshCw, ShieldCheck, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

type GateSource = 'simulateur-a' | 'simulateur-b' | 'comparateur' | 'carte' | 'aides'

interface ResultGateOverlayProps {
  /** Source du lead */
  source: GateSource
  /** Contexte JSON pour le lead */
  contexte?: Record<string, unknown>
  /** Contenu teaser visible (non flouté) */
  teaser: React.ReactNode
  /** Contenu protégé (flouté avant déverrouillage) */
  children: React.ReactNode
  /** Callback après capture réussie */
  onUnlock?: (data: { email: string; prenom?: string }) => void
}

const STORAGE_KEY_PREFIX = 'aquiz-result-gate-'
const DRAFT_KEY_PREFIX = 'aquiz-gate-draft-'

/** Items de valeur affichés dans la modale */
const VALUE_ITEMS = [
  { icon: Calculator, label: 'Financement détaillé' },
  { icon: Euro, label: 'Mensualités optimisées' },
  { icon: ClipboardCheck, label: 'Apport & frais' },
  { icon: FileBarChart, label: 'Rapport PDF complet' },
] as const

export function ResultGateOverlay({
  source,
  contexte,
  teaser,
  children,
  onUnlock,
}: ResultGateOverlayProps) {
  const [unlocked, setUnlocked] = useState(false)
  const [email, setEmail] = useState('')
  const [prenom, setPrenom] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [justUnlocked, setJustUnlocked] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [mounted, setMounted] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  // Check localStorage on mount + trigger entrance animation
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${source}`)
      if (stored) {
        const data = JSON.parse(stored)
        if (data.unlocked && data.email) {
          setUnlocked(true)
          setEmail(data.email)
          if (data.prenom) setPrenom(data.prenom)
        }
      }
      // Restaurer le brouillon email/prénom si pas encore débloqué
      if (!unlocked) {
        const draft = localStorage.getItem(`${DRAFT_KEY_PREFIX}${source}`)
        if (draft) {
          const d = JSON.parse(draft)
          if (d.email && !email) setEmail(d.email)
          if (d.prenom && !prenom) setPrenom(d.prenom)
        }
      }
    } catch {
      // Ignore parse errors
    }
    requestAnimationFrame(() => setMounted(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  // Sauvegarder le brouillon email/prénom à chaque changement
  useEffect(() => {
    if (unlocked) return
    try {
      localStorage.setItem(`${DRAFT_KEY_PREFIX}${source}`, JSON.stringify({ email, prenom }))
    } catch { /* ignore */ }
  }, [email, prenom, source, unlocked])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    // Validation côté client (regex + domaines jetables)
    const validation = validateEmailClient(email)
    if (!validation.valid) {
      setEmailError(validation.error || 'Email invalide')
      return
    }
    setEmailError(null)
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          prenom: prenom || undefined,
          source,
          contexte: {
            ...contexte,
            gate: 'result-unlock',
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      localStorage.setItem(`${STORAGE_KEY_PREFIX}${source}`, JSON.stringify({
        unlocked: true,
        email,
        prenom: prenom || undefined,
        unlockedAt: Date.now(),
      }))

      // Nettoyer le brouillon
      localStorage.removeItem(`${DRAFT_KEY_PREFIX}${source}`)

      setJustUnlocked(true)
      // Phase 1 (0-1200ms): success checkmark visible in modal
      setTimeout(() => {
        // Phase 2 (1200-2400ms): modal slides up + fades, content unblurs, banner slides in
        setRevealing(true)
        setShowBanner(true)
      }, 1200)
      setTimeout(() => {
        // Phase 3 (2400ms): mark unlocked (banner + content already visible, no DOM swap yet)
        setUnlocked(true)
        onUnlock?.({ email, prenom: prenom || undefined })
      }, 2400)
      setTimeout(() => {
        // Phase 4 (3400ms): clean switch to final render path (invisible, everything already in place)
        setJustUnlocked(false)
      }, 3400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }, [email, prenom, loading, source, contexte, onUnlock])

  // Bandeau réutilisable
  const bannerEl = (
    <div className="flex items-center gap-2.5 px-4 py-2.5 mb-4 rounded-xl bg-aquiz-green/5 border border-aquiz-green/15">
      <LockOpen className="w-4 h-4 text-aquiz-green shrink-0" />
      <p className="text-xs text-aquiz-gray flex-1">
        {prenom ? <span className="font-semibold text-aquiz-black">{prenom}</span> : null}
        {prenom ? ', votre ' : 'Votre '}
        étude est débloquée — modifiez vos paramètres librement, les résultats se mettent à jour instantanément.
      </p>
      <RefreshCw className="w-3.5 h-3.5 text-aquiz-green/50 shrink-0" />
    </div>
  )

  // Unlocked (page reload, not fresh unlock) → direct render
  if (unlocked && !justUnlocked) {
    return (
      <div>
        {bannerEl}
        {teaser}
        {children}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Bandeau qui glisse pendant la phase reveal */}
      {showBanner && (
        <div
          style={{
            animation: 'bannerSlideDown 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {bannerEl}
          <style>{`
            @keyframes bannerSlideDown {
              from { opacity: 0; transform: translateY(-12px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* Teaser (peut être null) */}
      {teaser}

      {/* Contenu flouté + modale centrée */}
      <div
        className="relative mt-4 rounded-xl"
        style={!revealing ? { maxHeight: '80vh', overflow: 'hidden' } : undefined}
      >
        {/* Contenu flouté */}
        <div
          className={revealing ? '' : 'pointer-events-none select-none'}
          style={{
            filter: revealing ? 'blur(0px)' : 'blur(8px)',
            transition: 'filter 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          aria-hidden={!revealing}
        >
          {children}
        </div>

        {/* Dégradé de fondu en bas du contenu tronqué */}
        {!revealing && (
          <div
            className="absolute bottom-0 left-0 right-0 z-5 h-32 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, white)' }}
          />
        )}

        {/* Overlay + modale centrée — conteneur borné (80vh) donc absolute centering fonctionne */}
        {!revealing && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 rounded-xl"
            style={{
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.5s ease-out',
            }}
          >
            <div
              ref={formRef}
              className="relative w-full max-w-96 mx-4 bg-white rounded-xl overflow-hidden pointer-events-auto"
              style={{
                transform: mounted
                  ? 'scale(1) translateY(0)'
                  : 'scale(0.95) translateY(12px)',
                opacity: mounted ? 1 : 0,
                transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease-out',
                boxShadow: '0 8px 50px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
              }}
            >
              {/* Barre d'accent aquiz-green */}
              <div className="h-1 bg-aquiz-green" />

              {/* Animation de succès */}
              {justUnlocked && (
                <div 
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white rounded-xl"
                  style={{
                    animation: 'fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  }}
                >
                  <div 
                    className="w-14 h-14 rounded-full bg-aquiz-green flex items-center justify-center mb-3"
                    style={{
                      animation: 'successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both',
                    }}
                  >
                    <CheckCircle className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                  <p className="text-base font-bold text-aquiz-black" style={{ animation: 'fadeUp 0.4s ease-out 0.3s both' }}>
                    C&apos;est débloqué !
                  </p>
                  <p className="text-xs text-aquiz-gray mt-1" style={{ animation: 'fadeUp 0.4s ease-out 0.45s both' }}>
                    Préparation de vos résultats…
                  </p>
                  <style>{`
                    @keyframes fadeInScale {
                      from { opacity: 0; transform: scale(0.95); }
                      to { opacity: 1; transform: scale(1); }
                    }
                    @keyframes successPop {
                      from { opacity: 0; transform: scale(0); }
                      60% { transform: scale(1.12); }
                      to { opacity: 1; transform: scale(1); }
                    }
                    @keyframes fadeUp {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                  `}</style>
                </div>
              )}

              <div className="px-5 pt-5 pb-5">
                {/* En-tête */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-aquiz-green/10 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-aquiz-green" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-aquiz-black leading-tight">
                      Votre étude est prête
                    </h3>
                    <p className="text-xs text-aquiz-gray mt-0.5">
                      Accédez à l&apos;analyse complète gratuitement
                    </p>
                  </div>
                </div>

                {/* Contenu inclus — grille 2×2 */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {VALUE_ITEMS.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-aquiz-gray-lightest">
                      <Icon className="w-3.5 h-3.5 text-aquiz-green shrink-0" />
                      <span className="text-xs text-aquiz-black font-medium leading-tight">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="space-y-2.5">
                  <div className="flex gap-2">
                    <div className="relative w-2/5">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aquiz-gray-light" />
                      <input
                        type="text"
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        placeholder="Prénom"
                        className="w-full pl-9 pr-2 py-2.5 text-sm border border-aquiz-gray-lighter rounded-lg focus:outline-none focus:ring-2 focus:ring-aquiz-green/30 focus:border-aquiz-green bg-white placeholder:text-aquiz-gray-light transition-shadow"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${emailError ? 'text-aquiz-red' : 'text-aquiz-gray-light'}`} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null) }}
                        placeholder="Votre email"
                        required
                        autoFocus
                        className={`w-full pl-9 pr-2 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white placeholder:text-aquiz-gray-light transition-shadow ${
                          emailError
                            ? 'border-aquiz-red focus:ring-aquiz-red/30 focus:border-aquiz-red'
                            : 'border-aquiz-gray-lighter focus:ring-aquiz-green/30 focus:border-aquiz-green'
                        }`}
                      />
                    </div>
                  </div>

                  {emailError && (
                    <p className="text-xs text-aquiz-red flex items-center gap-1 -mt-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-aquiz-red shrink-0" />
                      {emailError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-aquiz-green hover:bg-aquiz-green/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all text-sm"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    {loading ? 'Envoi…' : 'Accéder à mon étude'}
                  </button>

                  {error && (
                    <p className="text-xs text-aquiz-red text-center">{error}</p>
                  )}
                </form>

                {/* Trust */}
                <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-aquiz-gray-light">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Sécurisé
                  </span>
                  <span>•</span>
                  <span>Gratuit</span>
                  <span>•</span>
                  <span>Sans inscription</span>
                </div>
                <div className="mt-2 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-aquiz-green/8 text-[10px] font-medium text-aquiz-green">
                    <LockOpen className="w-3 h-3" />
                    Email demandé une seule fois — accès illimité ensuite
                  </span>
                </div>

                {/* Lien conseiller */}
                <div className="mt-3 text-center">
                  <a
                    href="https://calendly.com/contact-aquiz/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-aquiz-gray hover:text-aquiz-green transition-colors"
                  >
                    <Calendar className="w-3 h-3" />
                    Préférez parler à un conseiller ?
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
