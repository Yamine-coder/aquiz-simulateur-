'use client'

import {
    AnimatePresence,
    motion,
    useScroll,
    useTransform,
} from 'framer-motion'
import { ArrowRight, Calculator, Phone } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// ─── Morphing words (no blur filter — use opacity+y only for perf) ───
const ROTATING_WORDS = ['notre mission', 'notre expertise', 'notre engagement']

function RotatingWord() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_WORDS.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="inline-block relative">
      <AnimatePresence mode="wait">
        <motion.span
          key={ROTATING_WORDS[index]}
          className="inline-block text-aquiz-green"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {ROTATING_WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

// ─── CSS-only floating particles (no Framer Motion overhead) ───
const PARTICLES = [
  { left: 10, top: 15, dur: 6, delay: 0 },
  { left: 30, top: 70, dur: 8, delay: 1.5 },
  { left: 55, top: 25, dur: 7, delay: 3 },
  { left: 75, top: 60, dur: 5.5, delay: 0.8 },
  { left: 88, top: 35, dur: 9, delay: 2.5 },
  { left: 45, top: 85, dur: 6.5, delay: 4 },
]

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          50% { transform: translateY(-40px) translateX(10px); opacity: 0.5; }
        }
      `}</style>
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-aquiz-green/30"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            animation: `float-particle ${p.dur}s ease-in-out ${p.delay}s infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  )
}

export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15])
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.6, 0.85])
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 80])

  return (
    <section
      ref={ref}
      id="hero"
      className="relative h-[90vh] min-h-[600px] max-h-[900px] flex items-center justify-center overflow-hidden"
    >
      {/* Background photo with parallax + grayscale */}
      <motion.div className="absolute inset-0 z-0" style={{ scale: imgScale, willChange: 'transform' }}>
        <Image
          src="/images/hero-appartement.jpg"
          alt="Appartement parisien avec charme de l'ancien et style moderne"
          fill
          className="object-cover grayscale"
          priority
          quality={90}
          sizes="100vw"
        />
      </motion.div>

      {/* Dark overlay */}
      <motion.div
        className="absolute inset-0 z-[1] bg-aquiz-black"
        style={{ opacity: overlayOpacity }}
      />

      {/* Animated grid pattern */}
      <div
        className="absolute inset-0 z-[2] opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Gradient accents — static, smaller blur for performance */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-linear-to-b from-aquiz-green/[0.08] to-transparent z-[2]" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-aquiz-green/[0.06] blur-[80px] z-[2]" />
      <div className="absolute -top-20 -right-20 w-[350px] h-[350px] rounded-full bg-aquiz-green/[0.04] blur-[80px] z-[2]" />

      <FloatingParticles />

      {/* Content */}
      <motion.div
        className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto"
        style={{ y: contentY, willChange: 'transform' }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.08] text-white/70 text-xs font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-aquiz-green animate-pulse" />
            Paris &amp; Île-de-France
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          className="mt-7 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight"
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          Votre acquisition immobilière,
          <br />
          <RotatingWord />
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-6 text-base md:text-lg text-white/45 max-w-xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
        >
          Accompagnement personnalisé, chasse immobilière
          <br className="hidden sm:block" />
          et solutions de financement sur mesure.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
        >
          <Link
            href="/simulateur"
            className="group relative inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-aquiz-green text-white text-sm font-semibold rounded-xl overflow-hidden shadow-lg shadow-aquiz-green/25 hover:shadow-xl hover:shadow-aquiz-green/35 transition-all hover:-translate-y-0.5"
          >
            {/* Shine effect — CSS animation for performance */}
            <div
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -skew-x-12"
              style={{
                animation: 'shine-sweep 7s ease-in-out 2s infinite',
                willChange: 'transform',
              }}
            />
            <Calculator className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Simuler mon budget</span>
            <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="#contact"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/[0.08] text-white/80 text-sm font-semibold rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/[0.14] hover:text-white transition-all hover:-translate-y-0.5"
          >
            <Phone className="w-4 h-4" />
            Nous contacter
          </Link>
        </motion.div>

        <style>{`
          @keyframes shine-sweep {
            0%, 100% { transform: translateX(-200%) skewX(-12deg); }
            50% { transform: translateX(200%) skewX(-12deg); }
          }
        `}</style>

        {/* Trust markers */}
        <motion.div
          className="mt-12 flex items-center justify-center gap-5 sm:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          {[
            { value: '100%', label: 'Gratuit' },
            { value: '2 min', label: 'Simulation' },
            { value: 'IDF', label: 'Paris & banlieue' },
          ].map((item, i) => (
            <div key={item.label} className="flex items-center gap-3">
              {i > 0 && <div className="w-px h-6 bg-white/10 -ml-1" />}
              <div className="text-center">
                <p className="text-sm font-bold text-aquiz-green">{item.value}</p>
                <p className="text-[10px] text-white/30 tracking-wide">{item.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator — CSS animation only */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      >
        <div className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-1.5">
          <div
            className="w-1 h-1.5 rounded-full bg-aquiz-green"
            style={{ animation: 'scroll-dot 1.5s ease-in-out infinite' }}
          />
        </div>
      </motion.div>
      <style>{`
        @keyframes scroll-dot {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(10px); opacity: 0.3; }
        }
      `}</style>

      {/* Bottom curve */}
      <div className="absolute -bottom-px left-0 right-0 z-10 pointer-events-none">
        <svg
          viewBox="0 0 1440 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto block"
          preserveAspectRatio="none"
        >
          <path d="M0 40V30Q360 0 720 0Q1080 0 1440 30V40H0Z" fill="white" />
        </svg>
      </div>
    </section>
  )
}