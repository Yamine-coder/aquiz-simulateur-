'use client'

import { trackEvent } from '@/lib/analytics'
import Link from 'next/link'

interface TrackedCalendlyLinkProps {
  position: string
  className?: string
  children: React.ReactNode
}

export function TrackedCalendlyLink({ position, className, children }: TrackedCalendlyLinkProps) {
  return (
    <Link
      href="https://calendly.com/contact-aquiz/30min"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('cta-click', { type: 'calendly', position, page: window.location.pathname })}
      className={className}
    >
      {children}
    </Link>
  )
}
