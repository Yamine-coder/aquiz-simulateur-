'use client'

import {
    Activity,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Heart,
    LayoutDashboard,
    LogOut,
    Mail,
    Menu,
    MessageSquare,
    Users,
    X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

// ── Navigation items ──────────────────────────────────────

interface NavLink { href: string; label: string; icon: React.ElementType }
interface NavDivider { divider: true }

const NAV_ITEMS: Array<NavLink | NavDivider> = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/contacts', label: 'Contacts & Rappels', icon: MessageSquare },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
  { divider: true },
  { href: '/admin/scraping', label: 'Scraping', icon: Activity },
  { href: '/admin/aides', label: 'Aides Monitor', icon: Heart },
]

function isDivider(item: NavLink | NavDivider): item is NavDivider {
  return 'divider' in item
}

// ── Component ─────────────────────────────────────────────

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Login page — no shell
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar desktop ── */}
      <aside
        className={`hidden lg:flex flex-col border-r border-zinc-800 bg-zinc-900/50 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-zinc-800 px-4">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">A</div>
              <span className="text-sm font-semibold">AQUIZ Admin</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/admin" className="mx-auto">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">A</div>
            </Link>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map((item, i) => {
            if (isDivider(item)) {
              return <hr key={i} className="my-2 border-zinc-800" />
            }
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-zinc-800 p-2 space-y-0.5">
          <Link
            href="/"
            target="_blank"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-white transition ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Voir le site' : undefined}
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Voir le site</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Déconnexion' : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 transition ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4 shrink-0" /><span>Réduire</span></>}
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside className="relative z-50 flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-4">
              <Link href="/admin" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">A</div>
                <span className="text-sm font-semibold">AQUIZ Admin</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-zinc-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
              {NAV_ITEMS.map((item, i) => {
                if (isDivider(item)) return <hr key={i} className="my-2 border-zinc-800" />
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      active ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="border-t border-zinc-800 p-2 space-y-0.5">
              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-white"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span>Voir le site</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Déconnexion</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto scrollbar-admin">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur-sm lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">A</div>
          <span className="text-sm font-semibold">AQUIZ Admin</span>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
