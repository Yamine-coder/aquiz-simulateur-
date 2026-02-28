/**
 * Script Playwright pour capturer des screenshots pro de AQUIZ
 * Usage: npx playwright test scripts/screenshots.ts
 */
import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3001'
const OUT_DIR = path.resolve(__dirname, '../screenshots')

interface ScreenCapture {
  name: string
  url: string
  /** Attendre ce sélecteur avant de capturer */
  waitFor?: string
  /** Actions à effectuer avant la capture */
  actions?: (page: import('playwright').Page) => Promise<void>
  /** Viewport override */
  viewport?: { width: number; height: number }
  /** Capture pleine page */
  fullPage?: boolean
}

const DESKTOP = { width: 1920, height: 1080 }
const MOBILE = { width: 390, height: 844 }

const PAGES: ScreenCapture[] = [
  // ─── DESKTOP ───
  {
    name: '01-homepage-desktop',
    url: '/',
    viewport: DESKTOP,
    fullPage: false,
    waitFor: 'main',
  },
  {
    name: '02-homepage-full-desktop',
    url: '/',
    viewport: DESKTOP,
    fullPage: true,
    waitFor: 'main',
  },
  {
    name: '03-simulateur-choix-desktop',
    url: '/simulateur',
    viewport: DESKTOP,
    waitFor: 'main',
  },
  {
    name: '04-simulateur-modeA-desktop',
    url: '/simulateur/mode-a',
    viewport: DESKTOP,
    waitFor: 'form, main',
  },
  {
    name: '05-simulateur-modeB-desktop',
    url: '/simulateur/mode-b',
    viewport: DESKTOP,
    waitFor: 'form, main',
  },
  {
    name: '06-comparateur-desktop',
    url: '/comparateur',
    viewport: DESKTOP,
    waitFor: 'main',
  },
  {
    name: '07-carte-desktop',
    url: '/carte',
    viewport: DESKTOP,
    waitFor: 'main',
  },
  {
    name: '08-aides-desktop',
    url: '/aides',
    viewport: DESKTOP,
    waitFor: 'main',
  },
  {
    name: '09-a-propos-desktop',
    url: '/a-propos',
    viewport: DESKTOP,
    waitFor: 'main',
  },

  // ─── MOBILE ───
  {
    name: '10-homepage-mobile',
    url: '/',
    viewport: MOBILE,
    fullPage: false,
    waitFor: 'main',
  },
  {
    name: '11-simulateur-choix-mobile',
    url: '/simulateur',
    viewport: MOBILE,
    waitFor: 'main',
  },
  {
    name: '12-simulateur-modeA-mobile',
    url: '/simulateur/mode-a',
    viewport: MOBILE,
    waitFor: 'form, main',
  },
  {
    name: '13-comparateur-mobile',
    url: '/comparateur',
    viewport: MOBILE,
    waitFor: 'main',
  },
]

async function captureScreenshots() {
  // Créer le dossier de sortie
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  console.log('🎬 Lancement des captures AQUIZ...\n')

  const browser = await chromium.launch({ headless: true })

  for (const capture of PAGES) {
    const vp = capture.viewport || DESKTOP
    const context = await browser.newContext({
      viewport: vp,
      deviceScaleFactor: 2, // Retina 2x pour qualité pro
      locale: 'fr-FR',
      colorScheme: 'light',
    })

    const page = await context.newPage()

    try {
      console.log(`📸 ${capture.name} → ${capture.url}`)

      await page.goto(`${BASE_URL}${capture.url}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })

      // Attendre le sélecteur si spécifié
      if (capture.waitFor) {
        await page.waitForSelector(capture.waitFor, { timeout: 10000 }).catch(() => {
          console.log(`   ⚠️ Sélecteur "${capture.waitFor}" non trouvé, capture quand même`)
        })
      }

      // Pause pour que les animations se terminent
      await page.waitForTimeout(2000)

      // Exécuter les actions si définies
      if (capture.actions) {
        await capture.actions(page)
        await page.waitForTimeout(1000)
      }

      // Capture
      const filePath = path.join(OUT_DIR, `${capture.name}.png`)
      await page.screenshot({
        path: filePath,
        fullPage: capture.fullPage ?? false,
        type: 'png',
      })

      const stats = fs.statSync(filePath)
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
      console.log(`   ✅ ${sizeMB} MB → ${filePath}\n`)
    } catch (err) {
      console.error(`   ❌ Erreur: ${(err as Error).message}\n`)
    } finally {
      await context.close()
    }
  }

  await browser.close()
  console.log(`\n🎉 Captures terminées ! Dossier: ${OUT_DIR}`)
}

captureScreenshots().catch(console.error)
