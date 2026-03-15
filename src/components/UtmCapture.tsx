'use client'

import { captureUtm } from '@/lib/utm'
import { useEffect } from 'react'

/** Capture silencieusement les paramètres UTM au premier chargement. */
export function UtmCapture() {
  useEffect(() => { captureUtm() }, [])
  return null
}
