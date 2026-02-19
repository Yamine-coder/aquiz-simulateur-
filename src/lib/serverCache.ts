/**
 * Cache serveur générique avec TTL et taille maximale (éviction LRU).
 * Remplace les Map brutes dans les routes API pour éviter les fuites mémoire.
 */
export class ServerCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>()
  private readonly maxSize: number
  private readonly ttlMs: number

  constructor(options: { maxSize?: number; ttlMs: number }) {
    this.maxSize = options.maxSize ?? 200
    this.ttlMs = options.ttlMs
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key)
      return undefined
    }
    // LRU : déplacer en fin de Map (plus récent)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.data
  }

  set(key: string, data: T): void {
    // Éviction si taille max atteinte (supprime le plus ancien = premier élément)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) this.cache.delete(firstKey)
    }
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  get size(): number {
    return this.cache.size
  }

  clear(): void {
    this.cache.clear()
  }
}
