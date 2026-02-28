'use client'

/**
 * SplashScreen — Animation d'intro style After Effects.
 *
 * Architecture :
 * - L'overlay (fond #0a0a0a) est TOUJOURS présent au premier rendu (SSR + client)
 *   → aucun flash blanc possible puisqu'il couvre tout dès le départ.
 * - Les children se chargent normalement DERRIÈRE l'overlay (z-index).
 * - useEffect vérifie sessionStorage :
 *   → Déjà vu  : démontage immédiat de l'overlay (1 frame dark max, invisible).
 *   → 1re visite : animation → fade-out → démontage.
 *
 * Aucun script bloquant dans layout.tsx, aucun hack de visibilité.
 */

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'aquiz-splash-seen'
const TOTAL_DURATION = 4600
const FADE_DURATION = 800

/* ─── Paths du logo-aquiz-dark.svg ─── */

const BUILDING_PATHS = [
  "M2445 2900 c-211 -34 -347 -50 -457 -55 -125 -6 -158 -10 -158 -21 0 -22 313 -18 673 8 l308 22 167 -22 c197 -26 192 -26 192 -8 0 20 -332 126 -386 125 -22 -1 -174 -23 -339 -49z",
  "M2477 3040 c-260 -72 -335 -89 -415 -94 -219 -14 -232 -16 -232 -37 0 -18 10 -19 163 -19 156 0 173 2 477 60 173 33 324 60 336 60 12 0 98 -27 193 -60 165 -58 171 -59 171 -37 0 18 -30 38 -177 117 -98 52 -182 96 -188 97 -5 1 -153 -38 -328 -87z",
  "M2485 3188 l-320 -130 -167 -11 c-166 -11 -168 -11 -168 -34 l0 -23 159 0 159 0 331 100 330 100 175 -95 c96 -52 177 -95 180 -95 14 0 4 46 -11 56 -10 6 -85 64 -168 128 -82 64 -157 121 -165 126 -11 6 -113 -31 -335 -122z",
  "M2475 3340 l-330 -168 -135 -7 c-163 -8 -180 -11 -180 -36 0 -18 10 -19 166 -19 l166 0 302 126 c165 70 311 130 323 135 19 7 49 -11 200 -126 172 -130 178 -133 181 -107 3 23 -15 45 -135 160 -76 73 -158 150 -183 171 l-45 39 -330 -168z",
  "M2770 3685 c-19 -13 -166 -104 -325 -204 l-291 -180 -162 -12 c-159 -12 -162 -12 -162 -35 l0 -23 160 0 160 0 68 34 c37 19 182 95 322 170 140 75 259 136 265 136 6 0 82 -69 169 -152 88 -84 167 -159 178 -166 16 -12 18 -10 18 15 -1 22 -38 71 -171 223 -94 107 -176 200 -182 206 -9 9 -21 6 -47 -11z",
  "M2670 3834 c-74 -59 -220 -174 -324 -257 l-190 -150 -135 -13 c-75 -7 -148 -13 -163 -14 -23 0 -28 -4 -28 -25 l0 -25 163 0 163 0 110 71 c60 40 197 128 304 197 107 69 205 131 217 139 21 14 28 6 198 -191 97 -113 179 -206 181 -206 2 0 4 15 4 33 0 24 -13 53 -46 98 -25 35 -102 145 -170 244 -69 99 -131 186 -138 192 -9 10 -40 -10 -146 -93z",
]

const LETTER_PATHS = [
  "M1441 2448 c-5 -13 -59 -146 -120 -297 -61 -151 -111 -278 -111 -282 0 -5 34 -9 74 -9 l75 0 22 60 22 60 112 0 112 0 22 -60 22 -60 75 0 c40 0 74 4 74 8 0 5 -54 141 -119 303 l-119 294 -66 3 c-61 3 -67 1 -75 -20z m132 -337 c-4 -6 -106 -1 -112 4 -2 3 9 38 25 79 l28 75 32 -77 c17 -42 29 -79 27 -81z",
  "M2023 2462 c-69 -25 -132 -78 -168 -143 -28 -50 -30 -61 -30 -159 0 -89 3 -111 22 -146 36 -66 70 -101 132 -132 l58 -29 -29 -19 c-43 -28 -52 -49 -32 -79 15 -23 17 -24 44 -10 42 22 99 18 174 -10 106 -40 192 -28 232 32 15 24 15 28 -7 74 -21 46 -24 48 -40 33 -21 -19 -87 -29 -125 -20 l-28 7 34 17 c54 26 117 99 141 161 28 75 24 205 -9 268 -72 139 -229 205 -369 155z m186 -157 c87 -74 76 -249 -19 -297 -44 -23 -96 -23 -140 0 -91 46 -106 208 -25 289 30 30 38 33 93 33 50 0 66 -4 91 -25z",
  "M2472 2233 c3 -225 4 -240 26 -280 36 -68 87 -96 185 -101 108 -6 162 10 208 58 52 54 59 96 59 344 l0 216 -70 0 -70 0 -1 -172 c0 -207 -8 -265 -39 -290 -29 -24 -91 -23 -121 1 -24 19 -24 23 -29 238 l-5 218 -73 3 -73 3 3 -238z",
  "M3027 2463 c-4 -3 -7 -141 -7 -305 l0 -298 75 0 75 0 0 305 0 305 -68 0 c-38 0 -72 -3 -75 -7z",
  "M3260 2405 l0 -65 125 0 c69 0 125 -2 125 -4 0 -2 -55 -93 -123 -203 -68 -109 -133 -215 -146 -235 l-23 -38 267 0 266 0 -3 61 -3 61 -137 -1 c-76 -1 -138 0 -138 3 0 2 63 105 140 229 77 124 143 232 146 241 6 14 -19 16 -245 16 l-251 0 0 -65z",
]

/* ─── Timing AE-style (ms) ─── */
const FLOOR_STAGGER = 240
const FLOOR_DURATION = 900
const BUILD_END = BUILDING_PATHS.length * FLOOR_STAGGER + FLOOR_DURATION
const SWEEP_START = BUILD_END - 200
const SWEEP_DURATION = 700
const LETTER_START = BUILD_END + 100
const LETTER_STAGGER = 80
const LETTER_DURATION = 500
const LETTER_END = LETTER_START + LETTER_PATHS.length * LETTER_STAGGER + LETTER_DURATION
const BREATHE_START = LETTER_END - 200
const LOADER_START = 300
const LOADER_DURATION = TOTAL_DURATION - LOADER_START - 500

/* ─── Keyframes CSS (injectés en inline pour être disponibles sans Tailwind) ─── */
const KEYFRAMES = `
  @keyframes floorAE {
    0%   { opacity: 0; transform: translate3d(0, 18px, 0); }
    40%  { opacity: 1; }
    100% { opacity: 1; transform: translate3d(0, 0, 0); }
  }
  @keyframes letterAE {
    0%   { opacity: 0; transform: translate3d(0, -10px, 0) scale(0.9); }
    40%  { opacity: 1; }
    100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes lightSweep {
    0%   { opacity: 1; transform: translate3d(-300px, 0, 0); }
    100% { opacity: 1; transform: translate3d(300px, 0, 0); }
  }
  @keyframes logoBreathe {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.012); }
  }
  @keyframes loaderFill {
    0%   { transform: scaleX(0); }
    100% { transform: scaleX(1); }
  }
  @keyframes shimmer {
    0%   { transform: translate3d(-80px, 0, 0); }
    100% { transform: translate3d(80px, 0, 0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`

/**
 * Phase de vie du splash :
 * - `pending`   : rendu initial (SSR + 1er paint) — overlay noir, pas d'animation.
 * - `animating` : 1re visite — animation en cours.
 * - `fading`    : animation terminée — fade-out cinématique.
 * - `done`      : overlay démonté, children visibles.
 */
type SplashPhase = 'pending' | 'animating' | 'fading' | 'done'

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<SplashPhase>('pending')

  useEffect(() => {
    // Vérification sessionStorage côté client uniquement
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) {
        setPhase('done')
        return
      }
    } catch { /* mode privé / SSR fallback */ }

    // Première visite : marquer comme vu et lancer l'animation
    try { sessionStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setPhase('animating')
    document.body.style.overflow = 'hidden'

    const fadeTimer = setTimeout(() => setPhase('fading'), TOTAL_DURATION)
    const doneTimer = setTimeout(() => {
      setPhase('done')
      document.body.style.overflow = ''
    }, TOTAL_DURATION + FADE_DURATION)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
      document.body.style.overflow = ''
    }
  }, [])

  const showOverlay = phase !== 'done'
  const showAnimation = phase === 'animating' || phase === 'fading'

  return (
    <>
      {/* ═══ Overlay splash — toujours présent au 1er rendu, démonté quand done ═══ */}
      {showOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: '#0a0a0a',
            height: '100dvh',
            // Fade-out cinématique
            opacity: phase === 'fading' ? 0 : 1,
            transform: phase === 'fading' ? 'scale(0.98)' : 'scale(1)',
            transition: phase === 'fading'
              ? `opacity ${FADE_DURATION}ms cubic-bezier(0.4,0,0.2,1), transform ${FADE_DURATION}ms cubic-bezier(0.4,0,0.2,1)`
              : 'none',
            pointerEvents: phase === 'fading' ? 'none' : 'auto',
          }}
          aria-hidden="true"
        >
          {/* Animation content — monté uniquement quand on anime */}
          {showAnimation && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                paddingBottom: '3vh',
                animation: `logoBreathe 2400ms cubic-bezier(0.4,0,0.2,1) ${BREATHE_START}ms infinite`,
              }}
            >
              {/* ═══ Logo SVG animé ═══ */}
              <div style={{ position: 'relative' }}>
                <svg
                  version="1.0"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 500 500"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ width: 'clamp(9rem, 12vw, 14rem)', position: 'relative', zIndex: 10, aspectRatio: 'auto' }}
                  shapeRendering="geometricPrecision"
                >
                  <defs>
                    <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="white" stopOpacity="0" />
                      <stop offset="40%" stopColor="white" stopOpacity="0" />
                      <stop offset="50%" stopColor="white" stopOpacity="0.15" />
                      <stop offset="60%" stopColor="white" stopOpacity="0" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                    <clipPath id="logoClip">
                      <g transform="translate(0,500) scale(0.1,-0.1)">
                        {BUILDING_PATHS.map((d, i) => <path key={`bc-${i}`} d={d} />)}
                        {LETTER_PATHS.map((d, i) => <path key={`lc-${i}`} d={d} />)}
                      </g>
                    </clipPath>
                  </defs>

                  <g transform="translate(0,500) scale(0.1,-0.1)" fill="white" stroke="none">
                    {BUILDING_PATHS.map((d, i) => (
                      <path
                        key={`floor-${i}`}
                        d={d}
                        style={{
                          opacity: 0,
                          animation: `floorAE ${FLOOR_DURATION}ms cubic-bezier(0.34,1.56,0.64,1) ${i * FLOOR_STAGGER}ms forwards`,
                        }}
                      />
                    ))}
                    {LETTER_PATHS.map((d, i) => (
                      <path
                        key={`letter-${i}`}
                        d={d}
                        style={{
                          opacity: 0,
                          animation: `letterAE ${LETTER_DURATION}ms cubic-bezier(0.34,1.56,0.64,1) ${LETTER_START + i * LETTER_STAGGER}ms forwards`,
                        }}
                      />
                    ))}
                  </g>

                  <rect
                    x="-200"
                    y="0"
                    width="900"
                    height="500"
                    fill="url(#sweepGrad)"
                    clipPath="url(#logoClip)"
                    style={{
                      opacity: 0,
                      animation: `lightSweep ${SWEEP_DURATION}ms ease-in-out ${SWEEP_START}ms forwards`,
                    }}
                  />
                </svg>
              </div>

              {/* ═══ Loader avec shimmer ═══ */}
              <div
                style={{
                  marginTop: '1.5rem',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '9999px',
                  width: '80px',
                  height: '2px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  opacity: 0,
                  animation: `fadeIn 600ms ease ${LOADER_START}ms forwards`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '9999px',
                    background: 'linear-gradient(90deg, rgba(34,197,94,0.5), rgba(255,255,255,0.8))',
                    transformOrigin: 'left center',
                    transform: 'scaleX(0)',
                    animation: `loaderFill ${LOADER_DURATION}ms cubic-bezier(0.25,0.46,0.45,0.94) ${LOADER_START}ms forwards`,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '9999px',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                    animation: `shimmer 1500ms ease-in-out ${LOADER_START + 400}ms infinite`,
                  }}
                />
              </div>
            </div>
          )}

          <style>{KEYFRAMES}</style>
        </div>
      )}

      {/* ═══ Children — toujours rendus, simplement derrière l'overlay ═══ */}
      {children}
    </>
  )
}
