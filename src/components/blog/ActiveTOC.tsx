'use client'

import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TOCItem {
  heading: string
  id: string
  children?: { heading: string; id: string }[]
}

interface ActiveTOCProps {
  sections: TOCItem[]
  readingTime?: number
}

/**
 * Sticky sidebar table of contents with active section highlighting.
 * Supports H2 sections with optional H3 subsections.
 * Uses IntersectionObserver to detect which heading is in view.
 * Optionally shows remaining reading time.
 */
export function ActiveTOC({ sections, readingTime }: ActiveTOCProps) {
  const [activeId, setActiveId] = useState<string>('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Collect all heading IDs (H2 + H3)
    const allIds: string[] = []
    sections.forEach((s) => {
      allIds.push(s.id)
      s.children?.forEach((c) => allIds.push(c.id))
    })

    const headingElements = allIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    if (headingElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting)
        if (visibleEntries.length > 0) {
          setActiveId(visibleEntries[0].target.id)
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      },
    )

    headingElements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  // Track scroll progress for remaining time
  useEffect(() => {
    if (!readingTime) return
    function handleScroll() {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight > 0) setProgress(Math.min(100, (scrollTop / docHeight) * 100))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [readingTime])

  const remaining = readingTime ? Math.max(1, Math.ceil(readingTime * (1 - progress / 100))) : null

  let globalIndex = 0

  return (
    <div>
      <ol className="space-y-0.5 border-l border-aquiz-green/20 pl-0">
        {sections.map((section) => {
          globalIndex++
          const sectionNum = globalIndex
          const isActive = activeId === section.id
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`flex items-start gap-2 py-1.5 pl-3.5 -ml-px border-l-2 text-[12.5px] transition-all leading-snug ${
                  isActive
                    ? 'border-aquiz-green text-aquiz-green font-medium'
                    : 'border-transparent text-gray-400 hover:text-aquiz-green hover:border-aquiz-green'
                }`}
              >
                <span className={`text-[10px] font-medium mt-0.5 shrink-0 ${isActive ? 'text-aquiz-green' : 'text-gray-300'}`}>
                  {String(sectionNum).padStart(2, '0')}
                </span>
                <span className="line-clamp-2">{section.heading}</span>
              </a>

              {/* H3 subsections */}
              {section.children && section.children.length > 0 && (
                <ol className="ml-5 space-y-0">
                  {section.children.map((child) => {
                    const isChildActive = activeId === child.id
                    return (
                      <li key={child.id}>
                        <a
                          href={`#${child.id}`}
                          className={`block py-1 pl-3.5 -ml-px border-l-2 text-[11px] transition-all leading-snug ${
                            isChildActive
                              ? 'border-aquiz-green/60 text-aquiz-green font-medium'
                              : 'border-transparent text-gray-350 hover:text-aquiz-green hover:border-aquiz-green/40'
                          }`}
                        >
                          <span className="line-clamp-1">{child.heading}</span>
                        </a>
                      </li>
                    )
                  })}
                </ol>
              )}
            </li>
          )
        })}
      </ol>

      {/* Remaining reading time */}
      {remaining !== null && progress > 3 && progress < 97 && (
        <p className="text-[10px] text-gray-400 mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          ~{remaining} min restantes
        </p>
      )}
    </div>
  )
}
