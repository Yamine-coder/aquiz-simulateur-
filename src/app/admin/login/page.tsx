'use client'

import { Lock, LogIn, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Page de connexion admin.
 * 
 * Envoie le mot de passe au POST /api/admin/login.
 * Si valide → le serveur set un cookie HttpOnly → redirect vers /admin.
 */
export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        // Le cookie HttpOnly est automatiquement set par le serveur
        router.push('/admin')
      } else {
        const data = await res.json()
        setError(data.error ?? 'Mot de passe incorrect')
      }
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20">
              <Lock className="text-green-400" size={28} />
            </div>
            <h1 className="text-xl font-bold text-white">
              <span className="text-green-400">AQUIZ</span> Admin
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Connectez-vous pour accéder au panneau</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-zinc-400 mb-1.5">
                Mot de passe
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Mot de passe administrateur"
                className={`w-full rounded-lg border bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 ${
                  error
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-zinc-700 focus:border-green-500 focus:ring-green-500'
                }`}
                autoFocus
                autoComplete="current-password"
              />
              {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={!password || loading}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <LogIn size={14} />}
              {loading ? 'Vérification…' : 'Se connecter'}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-600">
            Session sécurisée (cookie HttpOnly, expire après 8h)
          </p>
        </div>
      </form>
    </div>
  )
}
