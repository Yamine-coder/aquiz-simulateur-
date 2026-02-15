'use client'

import { Calculator, ChevronDown, Gift, Map, Menu, Phone, Scale, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ───
interface NavLink {
  label: string
  href: string
  sectionId?: string
}

interface ToolLink {
  label: string
  href: string
  description: string
  icon: React.ElementType
  badge?: string
}

// ─── Navigation data ───
/** Anchor links for the single-page landing */
const NAV_LINKS: NavLink[] = [
  { label: 'Accueil', href: '/', sectionId: 'hero' },
  { label: 'Services', href: '/#services', sectionId: 'services' },
  { label: 'Méthode', href: '/#methode', sectionId: 'methode' },
  { label: 'Tarifs', href: '/#tarifs', sectionId: 'tarifs' },
  { label: 'Avis', href: '/#temoignages', sectionId: 'temoignages' },
  { label: 'Contact', href: '/#contact', sectionId: 'contact' },
]

/** IDs in scroll order for scroll-spy */
const SECTION_IDS = ['hero', 'services', 'outils', 'methode', 'tarifs', 'temoignages', 'faq', 'contact']

const TOOL_LINKS: ToolLink[] = [
  {
    label: 'Simulateur',
    href: '/simulateur',
    description: 'Calculez votre capacité d\'emprunt',
    icon: Calculator,
  },
  {
    label: 'Carte des prix',
    href: '/carte',
    description: 'Prix au m² en Île-de-France',
    icon: Map,
  },
  {
    label: 'Comparateur',
    href: '/comparateur',
    description: 'Comparez jusqu\'à 4 biens',
    icon: Scale,
  },
  {
    label: 'Aides & PTZ',
    href: '/aides',
    description: 'Découvrez vos aides au logement',
    icon: Gift,
    badge: 'Bientôt',
  },
]

/**
 * Navbar principale AQUIZ — Single-page navigation
 * - Anchor links with scroll-spy on homepage
 * - Fallback to /#section when on other pages
 * - Mega dropdown for tools (app pages)
 * - Glassmorphism on scroll / gradient hero on top
 */
export function Navbar() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const toolsRef = useRef<HTMLDivElement>(null)
  const toolsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isHomepage = pathname === '/'
  const showSolid = !isHomepage || isScrolled

  // Is current page a tool page?
  const isToolActive = TOOL_LINKS.some(
    (t) => pathname === t.href || pathname.startsWith(t.href + '/')
  )

  // ─── Scroll & scroll-spy ───
  useEffect(() => {
    if (!isHomepage) return

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)

      // Scroll-spy: determine active section
      const navOffset = window.innerWidth >= 768 ? 96 : 80
      const scrollY = window.scrollY + navOffset
      let current = 'hero'

      for (const id of SECTION_IDS) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= scrollY) {
          current = id
        }
      }
      setActiveSection(current)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // init
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHomepage])

  // Non-homepage: just track scroll for navbar appearance
  useEffect(() => {
    if (isHomepage) return
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHomepage])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
    setIsMobileToolsOpen(false)
  }, [])

  // Close menus on route change
  useEffect(() => {
    closeMenu()
    setIsToolsOpen(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Hover handlers with delay to prevent flicker
  const handleToolsEnter = () => {
    if (toolsTimeoutRef.current) clearTimeout(toolsTimeoutRef.current)
    setIsToolsOpen(true)
  }
  const handleToolsLeave = () => {
    toolsTimeoutRef.current = setTimeout(() => setIsToolsOpen(false), 150)
  }

  /** Smooth-scroll to any section by ID */
  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const el = document.getElementById(sectionId)
      if (el) {
        const navHeight = window.innerWidth >= 768 ? 88 : 72
        // Sections avec grand padding (py-24/py-32) : on saute une partie du padding
        // Sections compactes (contact) : pas de skip
        const compactSections = ['contact']
        const skipPadding = compactSections.includes(sectionId) ? 0 : (window.innerWidth >= 768 ? 64 : 48)
        const y = el.getBoundingClientRect().top + window.scrollY - navHeight + skipPadding
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
      }
    }
  }

  /** Smooth scroll to section on homepage, or navigate to /#section from other pages */
  const handleNavClick = (e: React.MouseEvent, link: NavLink) => {
    if (isHomepage && link.sectionId) {
      e.preventDefault()
      scrollToSection(link.sectionId)
      closeMenu()
    } else {
      closeMenu()
    }
  }

  /** Handle "Nos outils" click — scroll to #outils on homepage */
  const handleToolsClick = () => {
    if (isHomepage) {
      scrollToSection('outils')
      setIsToolsOpen(false)
      closeMenu()
    } else {
      setIsToolsOpen(!isToolsOpen)
    }
  }

  /** Check if a nav link is active */
  const isNavActive = (link: NavLink): boolean => {
    if (isHomepage && link.sectionId) {
      return activeSection === link.sectionId
    }
    return false
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: showSolid
          ? 'rgba(255, 255, 255, 0.98)'
          : 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
        backdropFilter: showSolid ? 'blur(16px) saturate(180%)' : 'none',
        WebkitBackdropFilter: showSolid ? 'blur(16px) saturate(180%)' : 'none',
        boxShadow: showSolid
          ? '0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.03)'
          : 'none',
        transition: 'background 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1), backdrop-filter 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 md:h-22">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={showSolid ? '/logo-aquiz-dark.png' : '/logo-aquiz-white.png'}
              alt="AQUIZ"
              className="h-16 md:h-20 lg:h-25 w-auto object-contain select-none"
              style={{ transition: 'opacity 0.3s ease, transform 0.3s ease' }}
              draggable={false}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-0.5">
            {/* Nav links with Outils dropdown after Services */}
            {NAV_LINKS.map((link) => {
              const isActive = isNavActive(link)

              return (
                <React.Fragment key={link.href}>
                  <Link
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link)}
                    className={`group relative px-4 py-2 text-[15px] font-medium transition-colors duration-200 ${
                      isActive
                        ? showSolid ? 'text-gray-900' : 'text-white'
                        : showSolid ? 'text-gray-400 hover:text-gray-900' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {link.label}
                    <span
                      className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full transition-transform duration-300 ease-out origin-left ${
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      } ${showSolid ? 'bg-aquiz-green' : 'bg-white'}`}
                    />
                  </Link>

                  {/* Insert Outils dropdown right after Services */}
                  {link.sectionId === 'services' && (
            <div
              ref={toolsRef}
              className="relative"
              onMouseEnter={handleToolsEnter}
              onMouseLeave={handleToolsLeave}
            >
              <button
                onClick={handleToolsClick}
                className={`group relative flex items-center gap-1 px-4 py-2 text-[15px] font-medium transition-colors duration-200 ${
                  isToolActive
                    ? showSolid ? 'text-gray-900' : 'text-white'
                    : showSolid ? 'text-gray-400 hover:text-gray-900' : 'text-white/60 hover:text-white'
                }`}
              >
                Nos outils
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isToolsOpen ? 'rotate-180' : ''}`} />
                <span
                  className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full transition-transform duration-300 ease-out origin-left ${
                    isToolActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  } ${showSolid ? 'bg-aquiz-green' : 'bg-white'}`}
                />
              </button>

              {/* Mega dropdown */}
              <div
                className={`absolute top-full right-0 mt-2 w-105 transition-all duration-200 ${
                  isToolsOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}
              >
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  {/* Header */}
                  <div className="px-5 py-3 border-b border-gray-50">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-aquiz-gray-light">
                      Outils gratuits
                    </p>
                  </div>

                  {/* Tools grid */}
                  <div className="p-2">
                    {TOOL_LINKS.map((tool) => {
                      const Icon = tool.icon
                      const isActive =
                        pathname === tool.href || pathname.startsWith(tool.href + '/')

                      return (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          className={`flex items-start gap-3.5 px-3 py-3 rounded-xl transition-all duration-150 group/tool ${
                            isActive
                              ? 'bg-aquiz-green/5'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? 'bg-aquiz-green/15 text-aquiz-green'
                              : 'bg-gray-100 text-gray-400 group-hover/tool:bg-aquiz-green/10 group-hover/tool:text-aquiz-green'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${
                                isActive ? 'text-aquiz-green' : 'text-gray-900'
                              }`}>
                                {tool.label}
                              </span>
                              {tool.badge && (
                                <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-aquiz-green/10 text-aquiz-green">
                                  {tool.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                              {tool.description}
                            </p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>

                  {/* Footer CTA */}
                  <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
                    <Link
                      href="/simulateur"
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-white bg-aquiz-green rounded-xl hover:brightness-110 transition-all shadow-sm"
                    >
                      <Calculator className="w-4 h-4" />
                      Lancer une simulation
                    </Link>
                  </div>
                </div>
              </div>
            </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* CTA + Téléphone */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="tel:+33749520106"
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                showSolid
                  ? 'text-gray-400 hover:text-gray-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span className="hidden xl:inline">07 49 52 01 06</span>
            </a>
            <Link
              href="https://calendly.com/contact-aquiz/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 text-sm font-semibold bg-aquiz-green text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-lg hover:brightness-110 hover:-translate-y-px active:translate-y-0"
            >
              Prendre rendez-vous
            </Link>
          </div>

          {/* Burger mobile */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors duration-200 ${
              showSolid
                ? 'text-gray-900 hover:bg-gray-50'
                : 'text-white hover:bg-white/10'
            }`}
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${
          isMenuOpen ? 'max-h-150 opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(16px)',
          boxShadow: isMenuOpen ? '0 8px 24px rgba(0, 0, 0, 0.08)' : 'none',
        }}
      >
        <div className="px-4 py-4 space-y-1">
          {/* Anchor links with Outils after Services */}
          {NAV_LINKS.map((link) => {
            const isActive = isNavActive(link)
            return (
              <React.Fragment key={link.href}>
                <Link
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`block px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-aquiz-green bg-aquiz-green/8'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/80'
                  }`}
                >
                  {link.label}
                </Link>

                {/* Outils accordion after Services */}
                {link.sectionId === 'services' && (
          <div>
            <button
              onClick={() => setIsMobileToolsOpen(!isMobileToolsOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                isToolActive
                  ? 'text-aquiz-green bg-aquiz-green/8'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/80'
              }`}
            >
              Nos outils
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileToolsOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-200 ${
              isMobileToolsOpen ? 'max-h-75 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="pl-4 py-1 space-y-0.5">
                {TOOL_LINKS.map((tool) => {
                  const Icon = tool.icon
                  const isActive = pathname === tool.href || pathname.startsWith(tool.href + '/')
                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      onClick={closeMenu}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'text-aquiz-green bg-aquiz-green/5 font-medium'
                          : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-aquiz-green' : 'text-gray-300'}`} />
                      <span>{tool.label}</span>
                      {tool.badge && (
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-aquiz-green/10 text-aquiz-green">
                          {tool.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
                )}
              </React.Fragment>
            )
          })}

          {/* Phone + CTA */}
          <div className="pt-3 border-t border-gray-100/60 space-y-2">
            <a
              href="tel:+33749520106"
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:text-gray-900 transition-colors duration-200"
            >
              <Phone className="w-4 h-4" />
              07 49 52 01 06
            </a>
            <Link
              href="https://calendly.com/contact-aquiz/30min"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="block px-4 py-3 text-sm font-semibold text-center bg-aquiz-green text-white rounded-xl shadow-sm"
            >
              Prendre rendez-vous
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
