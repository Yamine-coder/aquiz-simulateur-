import { expect, test } from '@playwright/test'

/**
 * Tests E2E Mode A - Simulateur AQUIZ
 * Parcours complet : formulaire → résultats
 */

test.describe('Mode A - Que puis-je acheter ?', () => {
  
  test.beforeEach(async ({ page, context }) => {
    // Nettoyer le localStorage pour éviter les modals de reprise
    await context.addInitScript(() => {
      window.localStorage.clear()
    })
    
    await page.goto('/simulateur/mode-a')
    // Attendre que la page soit chargée
    await page.waitForLoadState('networkidle')
    
    // Fermer le modal de reprise s'il apparaît (cliquer sur "Recommencer à zéro")
    const modalClose = page.getByRole('button', { name: 'Recommencer à zéro' })
    if (await modalClose.isVisible({ timeout: 1000 }).catch(() => false)) {
      await modalClose.click()
      await page.waitForTimeout(500)
    }
  })

  test('affiche la page Mode A avec le formulaire', async ({ page }) => {
    // Vérifier le header
    await expect(page.getByText('Ce que je peux acheter')).toBeVisible()
    
    // Vérifier que le stepper est présent (utiliser .first() car il y a 2 éléments)
    await expect(page.getByRole('button', { name: 'Profil' })).toBeVisible()
    
    // Vérifier que le formulaire est présent
    await expect(page.locator('form')).toBeVisible()
  })

  test('parcours complet simulation - profil célibataire', async ({ page }) => {
    // === ÉTAPE 1 : PROFIL ===
    
    // Sélectionner statut professionnel (dropdown)
    await page.locator('button:has-text("Sélectionnez votre statut")').click()
    await page.getByRole('option', { name: 'CDI' }).click()
    
    // Le slider d'âge est déjà à une valeur par défaut, pas besoin de le modifier
    
    // Sélectionner situation foyer - célibataire (déjà sélectionné par défaut)
    // Si besoin: await page.getByLabel('Seul(e)').click()
    
    // Remplir salaire
    await page.locator('input[name="salaire1"]').fill('3000')
    
    // Attendre que le bouton soit activé
    await page.waitForTimeout(300)
    
    // Passer à l'étape suivante
    const btnContinuer = page.getByRole('button', { name: /Continuer/i })
    await expect(btnContinuer).toBeEnabled({ timeout: 5000 })
    await btnContinuer.click()
    
    // === ÉTAPE 2 : SIMULATION ===
    
    // Attendre que l'étape simulation soit visible
    await expect(page.locator('input[name="mensualiteMax"]')).toBeVisible({ timeout: 10000 })
    
    // Remplir mensualité souhaitée
    await page.locator('input[name="mensualiteMax"]').fill('900')
    
    // Remplir apport
    await page.locator('input[name="apport"]').fill('30000')
    
    // Attendre et cliquer sur continuer
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /Continuer/i }).click()
    
    // === ÉTAPE 3 : AIDES ===
    await page.waitForTimeout(500)
    const btnAides = page.getByRole('button', { name: /Continuer/i })
    if (await btnAides.isVisible()) {
      await btnAides.click()
    }
    
    // === ÉTAPE 4 : SCORE ===
    await page.waitForTimeout(500)
    const btnScore = page.getByRole('button', { name: /Continuer/i })
    if (await btnScore.isVisible()) {
      await btnScore.click()
    }
    
    // === ÉTAPE 5 : RÉSUMÉ ===
    await page.waitForTimeout(500)
    
    // Vérifier le bouton de soumission
    const submitButton = page.getByRole('button', { name: /Voir mon résumé complet/i })
    
    // Si le projet est finançable, on peut soumettre
    if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitButton.click()
      
      // Vérifier qu'on reste sur mode-a à l'étape résultats (pas de redirection)
      await expect(page).toHaveURL('/simulateur/mode-a', { timeout: 10000 })
    }
  })

  test('validation des champs obligatoires', async ({ page }) => {
    // Vérifier que le bouton Continuer est désactivé sans revenus
    const continuerBtn = page.getByRole('button', { name: /Continuer/i })
    
    // Le bouton devrait être désactivé car revenusMensuelsTotal === 0
    await expect(continuerBtn).toBeDisabled()
    
    // Remplir le salaire
    await page.locator('input[name="salaire1"]').fill('2500')
    
    // Le bouton devrait être activé maintenant
    await expect(continuerBtn).toBeEnabled()
  })

  test('calcul temps réel - affichage résumé situation', async ({ page }) => {
    // Sélectionner statut
    await page.locator('button:has-text("Sélectionnez votre statut")').click()
    await page.getByRole('option', { name: 'CDI' }).click()
    
    // Remplir salaire
    await page.locator('input[name="salaire1"]').fill('3000')
    
    // Attendre le rendu
    await page.waitForTimeout(500)
    
    // Vérifier que le résumé situation apparaît
    await expect(page.getByText('Votre situation actuelle')).toBeVisible({ timeout: 5000 })
    // Utiliser .first() car il y a plusieurs éléments avec ce texte
    await expect(page.getByText('Revenus mensuels').first()).toBeVisible()
  })

  test('navigation entre étapes avec bouton retour', async ({ page }) => {
    // Remplir étape 1
    await page.locator('button:has-text("Sélectionnez votre statut")').click()
    await page.getByRole('option', { name: 'CDI' }).click()
    await page.locator('input[name="salaire1"]').fill('3000')
    
    await page.getByRole('button', { name: /Continuer/i }).click()
    
    // Vérifier qu'on est à l'étape 2
    await expect(page.locator('input[name="mensualiteMax"]')).toBeVisible()
    
    // Retourner à l'étape 1
    await page.getByRole('button', { name: /Modifier mon profil|Retour/i }).click()
    
    // Vérifier qu'on est revenu
    await expect(page.locator('input[name="salaire1"]')).toBeVisible()
  })
})

test.describe('Mode A - Tests Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })
  
  test('formulaire responsive sur mobile', async ({ page }) => {
    await page.goto('/simulateur/mode-a')
    await page.waitForLoadState('networkidle')
    
    // Vérifier que le formulaire est visible
    await expect(page.locator('form')).toBeVisible()
    
    // Vérifier que les cards sont visibles
    await expect(page.getByText('Votre profil')).toBeVisible()
  })

  test('boutons de taille tactile suffisante', async ({ page }) => {
    await page.goto('/simulateur/mode-a')
    await page.waitForLoadState('networkidle')
    
    // Remplir pour activer le bouton
    await page.locator('input[name="salaire1"]').fill('3000')
    
    // Vérifier que le bouton Continuer a une taille suffisante
    const continuerBtn = page.getByRole('button', { name: /Continuer/i })
    await expect(continuerBtn).toBeVisible()
    
    const box = await continuerBtn.boundingBox()
    if (box) {
      // Le bouton doit faire au moins 44px de hauteur (taille tactile min)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })
})
