import { expect, test } from '@playwright/test'

/**
 * Tests E2E - Page d'accueil AQUIZ
 */
test.describe('Page d\'accueil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('affiche le header avec le logo AQUIZ', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /simulateur/i })).toBeVisible()
  })

  test('affiche les 4 modules principaux', async ({ page }) => {
    // Mode A - Capacité d'achat
    await expect(page.getByText(/que puis-je acheter/i)).toBeVisible()
    
    // Mode B - Faisabilité
    await expect(page.getByText(/puis-je acheter/i)).toBeVisible()
    
    // Carte interactive
    await expect(page.getByText(/carte/i)).toBeVisible()
    
    // Comparateur
    await expect(page.getByText(/compar/i)).toBeVisible()
  })

  test('navigation vers Mode A', async ({ page }) => {
    await page.getByRole('link', { name: /capacité/i }).first().click()
    await expect(page).toHaveURL(/simulateur\/mode-a/)
  })

  test('navigation vers Mode B', async ({ page }) => {
    await page.getByRole('link', { name: /faisabilité/i }).first().click()
    await expect(page).toHaveURL(/simulateur\/mode-b/)
  })

  test('navigation vers la carte', async ({ page }) => {
    await page.getByRole('link', { name: /carte/i }).first().click()
    await expect(page).toHaveURL(/carte/)
  })
})
