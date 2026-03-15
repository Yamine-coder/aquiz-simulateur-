# AQUIZ — Simulateur Immobilier

Simulateur immobilier complet pour primo-accédants à Paris & Île-de-France.  
Calcul de capacité d'achat, vérification de faisabilité, carte DVF, aides (PTZ, PAS), comparateur d'annonces.

## Stack

- **Framework** : Next.js 16 (App Router, React Compiler)
- **Langage** : TypeScript (strict)
- **Style** : Tailwind CSS + shadcn/ui
- **Base de données** : Prisma + LibSQL (Turso)
- **Emails** : Resend
- **Monitoring** : Sentry (client + server + edge)
- **Déploiement** : Vercel

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Copier les variables d'environnement
cp .env.example .env.local
# → Remplir les valeurs (voir .env.example pour la doc)

# 3. Initialiser la base de données
npx prisma migrate dev

# 4. Lancer le serveur de développement
npm run dev
```

Le site tourne sur [http://localhost:3001](http://localhost:3001).

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement (port 3001) |
| `npm run build` | Build production (Prisma generate + Next.js build) |
| `npm run lint` | ESLint |
| `npm run type-check` | Vérification TypeScript (`tsc --noEmit`) |
| `npm run test` | Tests unitaires (Vitest, watch mode) |
| `npm run test:run` | Tests unitaires (single run) |
| `npm run test:coverage` | Tests + couverture de code |
| `npm run test:e2e` | Tests E2E (Playwright) |
| `npm run db:migrate` | Migration Prisma |
| `npm run db:studio` | Interface Prisma Studio |

## Architecture

```
src/
├── app/              # Routes Next.js (App Router)
│   ├── (app)/        # Pages applicatives (simulateur, carte, aides, comparateur)
│   ├── (vitrine)/    # Pages vitrine (accueil, blog, à propos)
│   ├── admin/        # Back-office admin
│   └── api/          # Routes API
├── components/       # Composants React
│   ├── ui/           # shadcn/ui
│   ├── simulateur/   # Formulaires & résultats simulateur
│   ├── map/          # Carte interactive
│   └── vitrine/      # Navbar, Footer, sections landing
├── lib/
│   ├── calculs/      # Fonctions de calcul pures (endettement, mensualité, etc.)
│   ├── conseils/     # Génération de conseils personnalisés
│   ├── scraping/     # Extraction d'annonces immobilières
│   └── pdf/          # Génération de rapports PDF
├── stores/           # State management (Zustand)
├── types/            # Types TypeScript partagés
└── config/           # Configuration (taux, plafonds, zones PTZ)
```

Voir [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) pour le détail complet.

## Variables d'environnement

Voir [.env.example](.env.example) — toutes les variables sont documentées avec des commentaires.

## Déploiement

Le projet est déployé sur **Vercel**. Chaque push sur `main` déclenche un déploiement automatique.

Le pipeline CI (GitHub Actions) vérifie automatiquement :
1. **Lint** (ESLint)
2. **Types** (TypeScript)
3. **Tests unitaires** (Vitest)
4. **Build** (Next.js)
