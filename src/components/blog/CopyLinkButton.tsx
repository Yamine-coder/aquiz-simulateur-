'use client'

import { Check, Link2 } from 'lucide-react'
import { useState } from 'react'

/**
 * Button to copy the current page URL to clipboard.
 * Shows a checkmark for 2 seconds after copying.
 */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = window.location.href
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
        copied
          ? 'bg-aquiz-green text-white'
          : 'bg-gray-100 text-gray-500 hover:bg-aquiz-green hover:text-white'
      }`}
      aria-label={copied ? 'Lien copie !' : 'Copier le lien'}
      title={copied ? 'Lien copie !' : 'Copier le lien'}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
    </button>
  )
}
