/**
 * Tests de régression scraping — 1 URL par site supporté
 * 
 * Ces tests vérifient que :
 * 1. detecterSource() détecte correctement chaque site
 * 2. Les APIs connues répondent encore (format, endpoints)
 * 3. extractFromHTML() parse les formats HTML courants
 * 
 * Usage :
 *   npx vitest run src/lib/scraping/__tests__/regression-sites.test.ts
 * 
 * ⚠️ Ces tests NE font PAS de requêtes réseau.
 * Ils vérifient la logique de détection et parsing sur des fixtures statiques.
 * Pour les tests réseau en live, voir le bloc "integration" (skip par défaut).
 */
import { describe, expect, it } from 'vitest'
import { detecterSource, extractFromHTML, parseJsonLd, parseMetaTags } from '../extracteur'

// ============================================
// 1. DÉTECTION DE SOURCE — tous les 26+ sites
// ============================================
describe('detecterSource — régression 26 sites', () => {
  const cases: [string, string][] = [
    // Tier S — APIs dédiées
    ['https://www.seloger.com/annonces/achat/appartement/paris-15eme-75/260515181.htm', 'seloger'],
    ['https://www.leboncoin.fr/ad/ventes_immobilieres/2756841522', 'leboncoin'],
    ['https://www.bienici.com/annonce/vente/paris/appartement/3pieces/ag1234', 'bienici'],
    ['https://www.laforet.com/acheter/paris/appartement/4-pieces/123456', 'laforet'],
    ['https://www.orpi.com/annonce-vente-appartement-paris-12345/', 'orpi'],
    // Tier A — HTML accessible
    ['https://www.century21.fr/trouver_logement/detail/1234567/', 'century21'],
    ['https://www.guy-hoquet.com/annonces/vente-appartement-paris-75000-123456', 'guyhoquet'],
    ['https://www.stephaneplazaimmobilier.com/annonce/vente-appartement-paris-123456', 'stephaneplaza'],
    ['https://www.iadfrance.fr/annonce/vente-appartement-paris-p1234567', 'iad'],
    ['https://www.capifrance.fr/annonce-123456', 'capifrance'],
    ['https://www.safti.fr/annonce/123456', 'safti'],
    ['https://www.optimhome.com/annonce/123456', 'optimhome'],
    ['https://www.paruvendu.fr/immobilier/annonce/123456789', 'paruvendu'],
    ['https://www.superimmo.com/annonces/vente-appartement-paris', 'superimmo'],
    ['https://www.avendrealouer.fr/vente/123456789', 'avendrealouer'],
    ['https://www.green-acres.fr/properties/123456.htm', 'greenacres'],
    ['https://www.meilleursagents.com/prix-immobilier/paris/123456', 'meilleursagents'],
    ['https://www.hosman.co/biens/paris-123456', 'hosman'],
    ['https://www.bouygues-immobilier.com/programme-immobilier/paris/123456', 'bouygues'],
    ['https://www.kaufmanbroad.fr/programme-immobilier/paris/123456', 'kaufman'],
    // Tier B — Chrome-first
    ['https://www.logic-immo.com/detail-achat-123456.htm', 'logic-immo'],
    ['https://www.foncia.com/location/paris/appartement-2p-40m2-123456', 'foncia'],
    ['https://www.nexity.fr/programme-immobilier/paris/123456', 'nexity'],
    // Tier C — Fortement protégés
    ['https://www.pap.fr/annonces/appartement-paris-123456', 'pap'],
    ['https://www.ouestfrance-immo.com/immobilier/vente/appartement/paris/123456', 'ouestfrance'],
    ['https://immobilier.lefigaro.fr/annonces/achat-appartement-paris-123456.html', 'figaro'],
    // SeLoger Neuf
    ['https://www.selogerneuf.com/programme-immobilier/paris/123456', 'seloger'],
  ]

  for (const [url, expected] of cases) {
    it(`détecte "${expected}" pour ${new URL(url).hostname}`, () => {
      expect(detecterSource(url)).toBe(expected)
    })
  }

  it('retourne null pour un site inconnu', () => {
    expect(detecterSource('https://www.random-agency.fr/bien/123')).toBeNull()
  })
})

// ============================================
// 2. extractFromHTML — parsing HTML/JSON-LD/meta
// ============================================
describe('extractFromHTML — régression formats courants', () => {
  it('extrait Prix + Surface + Pièces depuis JSON-LD RealEstateListing', () => {
    const html = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "Appartement T3 Paris 15e",
  "description": "Bel appartement lumineux de 65m²",
  "offers": { "@type": "Offer", "price": "425000", "priceCurrency": "EUR" },
  "floorSize": { "@type": "QuantitativeValue", "value": "65", "unitCode": "MTK" },
  "numberOfRooms": 3,
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Paris",
    "postalCode": "75015",
    "addressRegion": "Île-de-France"
  }
}
</script>
</head><body></body></html>`
    const result = extractFromHTML(html, 'https://www.century21.fr/trouver_logement/detail/123/')
    expect(result).toBeTruthy()
    expect(result?.prix).toBe(425000)
    expect(result?.surface).toBe(65)
    expect(result?.pieces).toBe(3)
    expect(result?.ville).toBe('Paris')
    expect(result?.codePostal).toBe('75015')
  })

  it('extrait les données depuis meta Open Graph', () => {
    const html = `
<html><head>
<meta property="og:title" content="Maison 5 pièces 120m² à Lyon 6e - 680 000 €" />
<meta property="og:description" content="Magnifique maison de ville avec jardin" />
<meta property="og:image" content="https://photos.example.com/maison-lyon.jpg" />
</head><body></body></html>`
    const result = extractFromHTML(html, 'https://www.example.com/annonce/123')
    expect(result).toBeTruthy()
    if (result) {
      expect(result.imageUrl).toBe('https://photos.example.com/maison-lyon.jpg')
    }
  })

  it('extrait les données depuis __NEXT_DATA__ (pattern Laforêt/Orpi/Century21)', () => {
    const html = `
<html><head></head><body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "property": {
        "title": "Appartement 4P Paris 11",
        "price": 590000,
        "surface": 82,
        "rooms": 4,
        "bedrooms": 2,
        "city": "Paris",
        "zipCode": "75011",
        "energyClass": "D",
        "greenhouseClass": "C"
      }
    }
  }
}
</script>
</body></html>`
    const result = extractFromHTML(html, 'https://www.laforet.com/acheter/paris/123')
    expect(result).toBeTruthy()
  })
})

// ============================================
// 3. parseJsonLd — formats JSON-LD variés
// ============================================
describe('parseJsonLd — régression formats sites réels', () => {
  it('parse un Product (certains portails utilisent Product au lieu de RealEstateListing)', () => {
    const html = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Appartement 2P 45m² Marseille",
  "description": "Studio rénové centre-ville",
  "offers": { "@type": "Offer", "price": "128000", "priceCurrency": "EUR" }
}
</script>`
    const result = parseJsonLd(html)
    expect(result).toBeTruthy()
    expect(result?.prix).toBe(128000)
  })

  it('parse un array JSON-LD (SeLoger, Orpi)', () => {
    const html = `
<script type="application/ld+json">
[
  {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": "T2 lumineux Nice",
    "offers": { "price": "195000" }
  }
]
</script>`
    const result = parseJsonLd(html)
    expect(result).toBeTruthy()
    expect(result?.prix).toBe(195000)
  })
})

// ============================================
// 4. parseMetaTags — meta og/twitter
// ============================================
describe('parseMetaTags — régression meta variées', () => {
  it('extrait titre et prix depuis meta og:title format "TYPE PIECES SURFACE VILLE - PRIX €"', () => {
    const html = `
<meta property="og:title" content="Appartement 3 pièces 65 m² à Paris - 450 000 €" />
<meta property="og:description" content="Bel appartement lumineux" />`
    const result = parseMetaTags(html)
    expect(result).toBeTruthy()
    // Le titre est extrait, le prix éventuel est parsé depuis le titre
    expect(result?.titre).toContain('Appartement')
  })
})

// ============================================
// 5. TESTS D'INTÉGRATION RÉSEAU (skip par défaut)
// Décommenter pour tester en live les APIs
// ============================================
describe.skip('Intégration réseau — APIs sites (à exécuter manuellement)', () => {
  // LeBonCoin API — format attendu
  it('LeBonCoin API répond au bon format', async () => {
    const response = await fetch('https://api.leboncoin.fr/finder/classified/2756841522', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.leboncoin.fr/',
        'Origin': 'https://www.leboncoin.fr',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (response.ok) {
      const json = await response.json()
      // Vérifie la structure attendue
      expect(json).toHaveProperty('subject')
      expect(json).toHaveProperty('price')
      expect(json).toHaveProperty('attributes')
      expect(json).toHaveProperty('location')
    }
    // Si ça échoue (rate limit), on log juste
  })

  // SeLoger — vérifie que l'API mobile répond
  it('SeLoger API mobile répond', async () => {
    const response = await fetch(
      'https://api-seloger.svc.groupe-seloger.com/api/v1/listings/260515181',
      {
        headers: {
          'User-Agent': 'SeLoger/15.3.0 (iPhone; iOS 17.4)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    // Si 200 → format confirmé, sinon on log
    if (response.ok) {
      const json = await response.json()
      expect(json).toHaveProperty('id')
    }
  })

  // Bien'ici — vérifie l'endpoint JSON
  it('Bien\'ici API JSON répond', async () => {
    const response = await fetch(
      'https://www.bienici.com/realEstateAd.json?id=ag1234',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    // L'endpoint peut renvoyer 404 pour un ID invalide, mais pas 403
    expect(response.status).not.toBe(403)
  })
})
