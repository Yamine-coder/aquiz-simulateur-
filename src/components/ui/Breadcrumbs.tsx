import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

/**
 * Fil d'Ariane visible — renforce les BreadcrumbList JSON-LD
 * et améliore la navigation utilisateur + SEO.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Fil d'Ariane" className="w-full bg-gray-50/80 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ol
          className="flex items-center gap-1 py-2.5 text-xs text-gray-500 overflow-x-auto"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          {/* Accueil */}
          <li
            className="flex items-center gap-1 shrink-0"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <Link
              href="/"
              className="flex items-center gap-1 hover:text-aquiz-green transition-colors"
              itemProp="item"
            >
              <Home className="w-3.5 h-3.5" />
              <span itemProp="name">Accueil</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>

          {items.map((item, index) => (
            <li
              key={item.label}
              className="flex items-center gap-1 shrink-0"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <ChevronRight className="w-3 h-3 text-gray-300" aria-hidden="true" />
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-aquiz-green transition-colors"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span className="text-gray-700 font-medium" itemProp="name" aria-current="page">
                  {item.label}
                </span>
              )}
              <meta itemProp="position" content={String(index + 2)} />
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
