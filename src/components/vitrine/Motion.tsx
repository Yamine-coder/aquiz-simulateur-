'use client'

import { motion, useInView, type Variants } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

// ─── Fade-in on scroll ───────────────────────────────────────
interface FadeInProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  duration?: number
  once?: boolean
}

export function FadeIn({
  children,
  className,
  delay = 0,
  direction = 'up',
  duration = 0.6,
  once = true,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: '-60px 0px' })

  const directionMap = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
    none: { x: 0, y: 0 },
  }

  const offset = directionMap[direction]

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...offset }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...offset }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}

// ─── Stagger children ────────────────────────────────────────
interface StaggerContainerProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
  delayStart?: number
}

const containerVariants: Variants = {
  hidden: {},
  visible: (custom: { staggerDelay: number; delayStart: number }) => ({
    transition: {
      staggerChildren: custom.staggerDelay,
      delayChildren: custom.delayStart,
    },
  }),
}

const childVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
  delayStart = 0,
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px 0px' })

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      custom={{ staggerDelay, delayStart }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={childVariants}>
      {children}
    </motion.div>
  )
}

// ─── Counter animation ──────────────────────────────────────
interface CountUpProps {
  end: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}

export function CountUp({
  end,
  suffix = '',
  prefix = '',
  duration = 2,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
    >
      {isInView ? (
        <motion.span>
          {prefix}
          <MotionNumber end={end} duration={duration} />
          {suffix}
        </motion.span>
      ) : (
        `${prefix}0${suffix}`
      )}
    </motion.span>
  )
}

function MotionNumber({ end, duration }: { end: number; duration: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  return (
    <motion.span
      ref={ref}
      initial={{ '--num': 0 } as Record<string, number>}
      animate={{ '--num': end } as Record<string, number>}
      transition={{ duration, ease: 'easeOut' }}
      onUpdate={(latest) => {
        if (ref.current) {
          const v = latest as Record<string, number>
          ref.current.textContent = Math.round(v['--num']).toString()
        }
      }}
    />
  )
}

// ─── Parallax wrapper ────────────────────────────────────────
interface ParallaxProps {
  children: ReactNode
  className?: string
  speed?: number
}

export function Parallax({ children, className, speed = 0.3 }: ParallaxProps) {
  return (
    <motion.div
      className={className}
      initial={{ y: 0 }}
      whileInView={{ y: 0 }}
      viewport={{ once: false }}
      style={{ willChange: 'transform' }}
      transition={{ type: 'tween' }}
      whileHover={{ scale: 1 + speed * 0.05 }}
    >
      {children}
    </motion.div>
  )
}

// ─── Magnetic hover (for buttons) ────────────────────────────
export function MagneticHover({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  )
}

// ─── Reveal text line by line ────────────────────────────────
interface RevealTextProps {
  text: string
  className?: string
  delay?: number
}

export function RevealText({ text, className, delay = 0 }: RevealTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  const words = text.split(' ')

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span
            className="inline-block"
            initial={{ y: '100%' }}
            animate={isInView ? { y: 0 } : { y: '100%' }}
            transition={{
              duration: 0.5,
              delay: delay + i * 0.04,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  )
}
