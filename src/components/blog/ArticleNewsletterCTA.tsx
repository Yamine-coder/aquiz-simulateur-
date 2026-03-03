'use client'

import NewsletterForm from '@/components/blog/NewsletterForm'
import { Mail } from 'lucide-react'

/**
 * CTA Newsletter pour les articles de blog (Server Component friendly)
 * Encapsule le formulaire client dans un wrapper utilisable par les Server Components
 */
export default function ArticleNewsletterCTA() {
  return (
    <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
      <div className="w-11 h-11 rounded-xl bg-aquiz-green/10 flex items-center justify-center shrink-0">
        <Mail className="w-5 h-5 text-aquiz-green" />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <p className="text-[14px] font-bold text-gray-900">Vous avez aimé cet article ?</p>
        <p className="text-[12px] text-gray-400 mt-0.5">Recevez nos prochains guides et analyses chaque semaine.</p>
      </div>
      <NewsletterForm source="article" variant="compact" className="w-full sm:w-auto" />
    </div>
  )
}
