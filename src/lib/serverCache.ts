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

// ─── Cache disque persistant ────────────────────────────────────────────────
// Survit aux hot-reloads et redémarrages serveur (données stockées dans tmpdir).
// Utilisé en tandem avec ServerCache : mémoire (rapide) → disque (persistant).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const DISK_CACHE_BASE = join(tmpdir(), 'aquiz-cache')

/**
 * Cache JSON sur disque avec TTL.
 * Les fichiers sont stockés dans `os.tmpdir()/aquiz-cache/<namespace>/`.
 * Toutes les erreurs I/O sont silencieuses : le cache disque n'est jamais bloquant.
 */
export class DiskCache<T> {
  private readonly dir: string
  private readonly ttlMs: number
  private ready = false

  constructor(namespace: string, options: { ttlMs: number }) {
    this.dir = join(DISK_CACHE_BASE, namespace)
    this.ttlMs = options.ttlMs
    try {
      if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true })
      this.ready = true
    } catch {
      // Disque indisponible — le cache reste inactif, aucune erreur remontée
    }
  }

  private filePath(key: string): string {
    // Clé → nom de fichier safe (max 200 chars)
    const safe = key.replace(/[^a-z0-9._-]/gi, '_').slice(0, 200)
    return join(this.dir, `${safe}.json`)
  }

  get(key: string): T | undefined {
    if (!this.ready) return undefined
    try {
      const file = this.filePath(key)
      if (!existsSync(file)) return undefined
      const entry = JSON.parse(readFileSync(file, 'utf-8')) as { ts: number; data: T }
      if (Date.now() - entry.ts > this.ttlMs) return undefined
      return entry.data
    } catch {
      return undefined
    }
  }

  set(key: string, data: T): void {
    if (!this.ready) return
    try {
      writeFileSync(this.filePath(key), JSON.stringify({ ts: Date.now(), data }), 'utf-8')
    } catch {
      // Quota disque, permissions — ignoré
    }
  }
}
