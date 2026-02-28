'use client'

import type { BlogCategory } from '@/types/blog';
import { useState } from 'react';

interface BlogFilterProps {
  categories: { key: BlogCategory | 'all'; label: string; count: number }[]
  onFilter: (category: BlogCategory | 'all') => void
}

export function BlogFilter({ categories, onFilter }: BlogFilterProps) {
  const [active, setActive] = useState<BlogCategory | 'all'>('all')

  const handleClick = (key: BlogCategory | 'all') => {
    setActive(key)
    onFilter(key)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <button
          key={cat.key}
          onClick={() => handleClick(cat.key)}
          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
            active === cat.key
              ? 'bg-gray-900 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
        >
          {cat.label}
          <span className={`ml-1.5 text-[11px] ${active === cat.key ? 'text-gray-400' : 'text-gray-400'}`}>
            {cat.count}
          </span>
        </button>
      ))}
    </div>
  )
}
