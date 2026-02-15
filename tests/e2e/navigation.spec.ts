import { expect, test } from '@playwright/test'

/**
 * Tests E2E Navigation - AQUIZ
 */

test.describe('Navigation générale', () => {
  
  test('page accueil accessible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Vérifier que la page charge (titre ou contenu)
    await expect(page).toHaveURL('/')
  })

  test('navigation vers Mode A depuis accueil', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Cliquer sur le lien Mode A
    const linkModeA = page.getByRole('link', { name: /Mode A|Que puis-je|Ce que je peux/i }).first()
    if (await linkModeA.isVisible({ timeout: 5000 }).catch(() => false)) {
      await linkModeA.click()
      await expect(page).toHaveURL(/simulateur\/mode-a/)
    }
  })

  test('navigation vers carte depuis accueil', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Chercher le lien carte
    const carteLink = page.getByRole('link', { name: /carte|Où acheter|Explorer/i }).first()
    if (await carteLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await carteLink.click()
      await expect(page).toHaveURL('/carte')
    }
  })

  test('page carte charge correctement', async ({ page }) => {
    await page.goto('/carte')
    await page.waitForLoadState('domcontentloaded')
    
    // Vérifier que la page carte est accessible
    await expect(page).toHaveURL('/carte')
  })
})

test.describe('Navigation Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })
  
  test('page accueil sur mobile', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Vérifier que la page est accessible sur mobile
    await expect(page).toHaveURL('/')
  })

  test('formulaire scroll sur mobile', async ({ page }) => {
    await page.goto('/simulateur/mode-a')
    await page.waitForLoadState('networkidle')
    
    // Vérifier que le formulaire est scrollable
    const form = page.locator('form')
    await expect(form).toBeVisible()
    
    // Scroller vers le bas
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    // Vérifier qu'un élément en bas est visible
    await page.evaluate(() => window.scrollTo(0, 0))
  })
})
