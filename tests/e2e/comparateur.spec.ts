import { expect, test } from '@playwright/test'

/**
 * Tests E2E - Comparateur d'annonces
 */

// ─── Helper : injecter des annonces dans le localStorage ───
function injectAnnonces(count: number) {
  return (context: { addInitScript: (fn: () => void) => Promise<void> }) =>
    context.addInitScript(() => {
      const annonces = Array.from({ length: count }, (_, i) => ({
        id: `test_${i + 1}`,
        titre: `Appartement T${i + 2}`,
        prix: 200000 + i * 50000,
        surface: 40 + i * 15,
        prixM2: Math.round((200000 + i * 50000) / (40 + i * 15)),
        type: 'appartement',
        ville: 'Paris',
        codePostal: '75001',
        departement: '75',
        dpe: (['A', 'C', 'E', 'G'] as const)[i] ?? 'NC',
        pieces: 2 + i,
        source: 'manuel',
        dateAjout: new Date().toISOString(),
        favori: false,
      }))
      const state = {
        state: {
          annonces,
          annonceSelectionnees: [],
          budgetMax: null,
          unlocked: false,
          leadEmail: null,
          unlockedAt: null,
          unlockedForSelection: null,
          qualificationDone: false,
          isHotLead: false,
        },
        version: 1,
      }
      window.localStorage.setItem('aquiz-comparateur', JSON.stringify(state))
    })
}

// ═══════════════════════════════════════════
// INTERFACE DE BASE
// ═══════════════════════════════════════════

test.describe('Comparateur - Interface', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.clear())
    await page.goto('/comparateur')
    await page.waitForLoadState('networkidle')
  })

  test('affiche la page comparateur', async ({ page }) => {
    await expect(page.getByText(/compar/i).first()).toBeVisible()
  })

  test('bouton ajouter une annonce visible', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ajouter|nouvelle/i }).first()
    await expect(addButton).toBeVisible()
  })

  test('ouvre le formulaire d\'ajout', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ajouter|nouvelle/i }).first()
    await addButton.click()
    
    await page.waitForTimeout(500)
    
    // Le formulaire devrait être visible
    const hasForm = await page.locator('form, [role="dialog"]').first().isVisible()
    expect(hasForm).toBeTruthy()
  })
})

// ═══════════════════════════════════════════
// IMPORT URL
// ═══════════════════════════════════════════

test.describe('Comparateur - Import URL', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.clear())
    await page.goto('/comparateur')
    await page.waitForLoadState('networkidle')
  })

  test('affiche l\'option import URL', async ({ page }) => {
    // Ouvrir le formulaire
    const addButton = page.getByRole('button', { name: /ajouter|nouvelle/i }).first()
    await addButton.click()
    await page.waitForTimeout(300)

    // Vérifier la présence de l'onglet URL
    const urlTab = page.getByText(/url|import/i).first()
    await expect(urlTab).toBeVisible()
  })

  test('champ URL présent dans le formulaire', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ajouter|nouvelle/i }).first()
    await addButton.click()
    await page.waitForTimeout(300)

    // Chercher un input URL (peut être dans le formulaire principal ou un onglet)
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"], input[placeholder*="seloger"], input[placeholder*="URL"]').first()
    await expect(urlInput).toBeVisible({ timeout: 3000 })
  })
})

// ═══════════════════════════════════════════
// FORMULAIRE MANUEL
// ═══════════════════════════════════════════

test.describe('Comparateur - Formulaire manuel', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.clear())
    await page.goto('/comparateur')
    await page.waitForLoadState('networkidle')
  })

  test('peut saisir une annonce manuellement', async ({ page }) => {
    // Ouvrir le formulaire
    const addButton = page.getByRole('button', { name: /ajouter|nouvelle/i }).first()
    await addButton.click()
    await page.waitForTimeout(500)

    // Basculer sur saisie manuelle si nécessaire
    const manuelTab = page.getByText(/manuel|saisie/i).first()
    if (await manuelTab.isVisible().catch(() => false)) {
      await manuelTab.click()
      await page.waitForTimeout(300)
    }

    // Chercher les champs principaux et vérifier qu'ils acceptent les valeurs
    const prixInput = page.locator('input[name="prix"], input[placeholder*="prix"]').first()
    await expect(prixInput).toBeVisible({ timeout: 3000 })
    await prixInput.fill('250000')
    await expect(prixInput).toHaveValue('250000')

    const surfaceInput = page.locator('input[name="surface"], input[placeholder*="surface"]').first()
    await expect(surfaceInput).toBeVisible()
    await surfaceInput.fill('65')
    await expect(surfaceInput).toHaveValue('65')
  })

  test('validation des champs requis', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ajouter|nouvelle/i }).first()
    await addButton.click()
    await page.waitForTimeout(500)

    // Aller sur saisie manuelle
    const manuelTab = page.getByText(/manuel/i).first()
    if (await manuelTab.isVisible().catch(() => false)) {
      await manuelTab.click()
      await page.waitForTimeout(300)
    }

    // Essayer de soumettre sans données
    const submitButton = page.getByRole('button', { name: /ajouter|valider|enregistrer/i }).last()
    await expect(submitButton).toBeVisible()
    await submitButton.click()
    await page.waitForTimeout(300)

    // Le formulaire doit rester ouvert (pas fermé = validation a bloqué)
    const formStillVisible = page.locator('form, [role="dialog"]').first()
    await expect(formStillVisible).toBeVisible()
  })
})

// ═══════════════════════════════════════════
// TABLEAU (ÉTAT VIDE)
// ═══════════════════════════════════════════

test.describe('Comparateur - Tableau', () => {
  test('affiche message si aucune annonce', async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.clear())
    await page.goto('/comparateur')
    await page.waitForLoadState('networkidle')

    // La page doit afficher un état vide (empty state) ou un call-to-action
    const emptyState = page.getByText(/aucune|commencez|ajoutez|ajouter.*bien|premier/i).first()
    await expect(emptyState).toBeVisible({ timeout: 5000 })
  })
})

// ═══════════════════════════════════════════
// ONGLETS ET NAVIGATION
// ═══════════════════════════════════════════

test.describe('Comparateur - Onglets', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectAnnonces(3)(context)
    await page.goto('/comparateur')
    await page.waitForLoadState('networkidle')
  })

  test('affiche les 3 onglets avec rôles ARIA', async ({ page }) => {
    const tablist = page.getByRole('tablist', { name: /navigation comparateur/i }).first()
    await expect(tablist).toBeVisible()

    const tabs = tablist.getByRole('tab')
    await expect(tabs).toHaveCount(3)
  })

  test('onglet Annonces actif par défaut', async ({ page }) => {
    const tablist = page.getByRole('tablist').first()
    const annonceTab = tablist.getByRole('tab').first()
    await expect(annonceTab).toHaveAttribute('aria-selected', 'true')
  })

  test('bascule vers onglet Carte', async ({ page }) => {
    const tablist = page.getByRole('tablist').first()
    const carteTab = tablist.getByRole('tab', { name: /carte/i })
    await carteTab.click()
    await page.waitForTimeout(300)

    await expect(carteTab).toHaveAttribute('aria-selected', 'true')
    const tabpanel = page.locator('#tabpanel-carte')
    await expect(tabpanel).toBeVisible()
  })

  test('bascule vers onglet Comparaison (état vide)', async ({ page }) => {
    const tablist = page.getByRole('tablist').first()
    const compTab = tablist.getByRole('tab', { name: /compar/i })
    await compTab.click()
    await page.waitForTimeout(300)

    await expect(compTab).toHaveAttribute('aria-selected', 'true')
    // Aucune annonce sélectionnée → CTA visible
    await expect(page.getByText(/sélectionnez/i).first()).toBeVisible({ timeout: 3000 })
  })
})

// ═══════════════════════════════════════════
// SÉLECTION ET COMPARAISON
// ═══════════════════════════════════════════

test.describe('Comparateur - Sélection & comparaison', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectAnnonces(3)(context)
    await page.goto('/comparateur')
    await page.waitForLoadState('networkidle')
  })

  test('affiche les annonces injectées', async ({ page }) => {
    // Vérifier qu'au moins 3 cards sont visibles
    const cards = page.getByText(/Appartement T/i)
    await expect(cards.first()).toBeVisible({ timeout: 5000 })
  })

  test('sélection d\'une annonce affiche la barre flottante', async ({ page }) => {
    // Cliquer sur le bouton "Comparer" d'une card
    const selectBtn = page.getByRole('button', { name: /comparer|sélectionner/i }).first()
    await selectBtn.click()
    await page.waitForTimeout(300)

    // La barre flottante doit apparaître
    const floatingBar = page.getByText(/1 sélectionné/i)
    await expect(floatingBar).toBeVisible({ timeout: 3000 })
  })
})

// ═══════════════════════════════════════════
// TRI
// ═══════════════════════════════════════════

test.describe('Comparateur - Tri', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectAnnonces(4)(context)
    await page.goto('/comparateur')
    await page.waitForLoadState('networkidle')
  })

  test('le sélecteur de tri est présent', async ({ page }) => {
    // Le composant Select a un trigger qui contient ArrowDownUp ou les options
    const triTrigger = page.locator('[role="combobox"]').first()
    await expect(triTrigger).toBeVisible({ timeout: 5000 })
  })
})

// ═══════════════════════════════════════════
// ACCESSIBILITÉ
// ═══════════════════════════════════════════

test.describe('Comparateur - Accessibilité', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectAnnonces(2)(context)
    await page.goto('/comparateur')
    await page.waitForLoadState('networkidle')
  })

  test('h1 sr-only présent', async ({ page }) => {
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
    await expect(h1).toHaveClass(/sr-only/)
    await expect(h1).toContainText(/comparateur/i)
  })

  test('tabpanels ont un rôle tabpanel', async ({ page }) => {
    const tabpanel = page.locator('#tabpanel-liste[role="tabpanel"]')
    await expect(tabpanel).toBeVisible({ timeout: 3000 })
  })
})
