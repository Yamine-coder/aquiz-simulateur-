/**
 * Types pour le système de blog AQUIZ
 */

/** Catégorie d'article */
export type BlogCategory =
  | 'financement'
  | 'achat'
  | 'simulation'
  | 'marche'
  | 'guides'
  | 'investissement'

/** Métadonnées d'un article */
export interface BlogArticle {
  /** Slug URL-friendly (unique) */
  slug: string
  /** Titre de l'article (H1) */
  title: string
  /** Description courte pour les cartes et meta description */
  excerpt: string
  /** Catégorie principale */
  category: BlogCategory
  /** Tags secondaires */
  tags: string[]
  /** Date de publication ISO */
  publishedAt: string
  /** Date de dernière mise à jour ISO (optionnel) */
  updatedAt?: string
  /** Auteur */
  author: BlogAuthor
  /** Durée de lecture estimée (minutes) */
  readingTime: number
  /** Image de couverture (chemin relatif /images/blog/) */
  coverImage: string
  /** Alt text de l'image de couverture */
  coverAlt: string
  /** Contenu structuré de l'article */
  sections: BlogSection[]
  /** Liens internes vers les outils AQUIZ */
  relatedTools?: RelatedTool[]
}

/** Auteur d'un article */
export interface BlogAuthor {
  name: string
  role: string
}

/** Section de contenu structurée */
export interface BlogSection {
  /** Titre de la section (H2) */
  heading: string
  /** Contenu HTML de la section */
  content: string
  /** Sous-sections optionnelles (H3) */
  subsections?: BlogSubsection[]
}

/** Sous-section (H3) */
export interface BlogSubsection {
  heading: string
  content: string
}

/** Lien vers un outil AQUIZ en fin d'article */
export interface RelatedTool {
  label: string
  href: string
  description: string
}

/** Labels des catégories en français */
export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  financement: 'Financement',
  achat: 'Achat immobilier',
  simulation: 'Simulation',
  marche: 'Marche immobilier',
  guides: 'Guides pratiques',
  investissement: 'Investissement',
}

/** Couleurs des badges categories */
export const CATEGORY_COLORS: Record<BlogCategory, string> = {
  financement: 'bg-blue-50 text-blue-600',
  achat: 'bg-emerald-50 text-emerald-600',
  simulation: 'bg-purple-50 text-purple-600',
  marche: 'bg-amber-50 text-amber-600',
  guides: 'bg-rose-50 text-rose-600',
  investissement: 'bg-teal-50 text-teal-600',
}
