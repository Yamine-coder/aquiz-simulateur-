/**
 * Tests pour les fonctions d'extraction (parseJsonLd, parseAnnonceHTML, parseMetaTags)
 */
import { describe, expect, it } from 'vitest'
import { parseAnnonceHTML, parseJsonLd, parseMetaTags } from '../extracteur'

// ============================================
// parseJsonLd
// ============================================
describe('parseJsonLd', () => {
  it('extrait les données d\'un RealEstateListing Schema.org', () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": "Appartement 3 pièces à Paris 15",
        "description": "Bel appartement lumineux avec balcon",
        "offers": {
          "@type": "Offer",
          "price": "450000",
          "priceCurrency": "EUR"
        },
        "floorSize": {
          "@type": "QuantitativeValue",
          "value": "65",
          "unitCode": "MTK"
        },
        "numberOfRooms": 3,
        "numberOfBedrooms": 2,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Paris",
          "postalCode": "75015",
          "streetAddress": "12 rue de Vaugirard"
        },
        "image": "https://example.com/photo.jpg"
      }
      </script>
      </head><body></body></html>
    `
    
    const result = parseJsonLd(html)
    
    expect(result.prix).toBe(450000)
    expect(result.surface).toBe(65)
    expect(result.pieces).toBe(3)
    expect(result.chambres).toBe(2)
    expect(result.ville).toBe('Paris')
    expect(result.codePostal).toBe('75015')
    expect(result.adresse).toBe('12 rue de Vaugirard')
    expect(result.imageUrl).toBe('https://example.com/photo.jpg')
    expect(result.titre).toBe('Appartement 3 pièces à Paris 15')
  })

  it('extrait les données depuis @graph (SeLoger format)', () => {
    const html = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Apartment",
            "name": "Studio à Lyon",
            "offers": { "price": 120000 },
            "floorSize": { "value": 25 },
            "numberOfRooms": 1,
            "address": {
              "addressLocality": "Lyon",
              "postalCode": "69003"
            }
          }
        ]
      }
      </script>
    `
    
    const result = parseJsonLd(html)
    
    expect(result.prix).toBe(120000)
    expect(result.surface).toBe(25)
    expect(result.pieces).toBe(1)
    expect(result.ville).toBe('Lyon')
    expect(result.codePostal).toBe('69003')
  })

  it('gère les prix sous forme de nombre', () => {
    const html = `
      <script type="application/ld+json">
      { "@type": "Product", "offers": { "price": 350000 } }
      </script>
    `
    
    const result = parseJsonLd(html)
    expect(result.prix).toBe(350000)
  })

  it('extrait le type maison depuis le @type House', () => {
    const html = `
      <script type="application/ld+json">
      { "@type": "House", "offers": { "price": 280000 }, "floorSize": { "value": 110 } }
      </script>
    `
    
    const result = parseJsonLd(html)
    expect(result.type).toBe('maison')
    expect(result.surface).toBe(110)
  })

  it('extrait le type appartement depuis le nom', () => {
    const html = `
      <script type="application/ld+json">
      { "@type": "Product", "name": "Appartement T3 Marseille", "offers": { "price": 200000 } }
      </script>
    `
    
    const result = parseJsonLd(html)
    expect(result.type).toBe('appartement')
    expect(result.titre).toContain('Marseille')
  })

  it('gère le format LeBonCoin (location avec city/zipcode)', () => {
    const html = `
      <script type="application/ld+json">
      {
        "@type": "Product",
        "offers": { "price": "175000" },
        "location": {
          "city": "Toulouse",
          "zipcode": "31000"
        }
      }
      </script>
    `
    
    const result = parseJsonLd(html)
    expect(result.ville).toBe('Toulouse')
    expect(result.codePostal).toBe('31000')
  })

  it('gère les JSON-LD invalides sans crash', () => {
    const html = `
      <script type="application/ld+json">{ invalid json }</script>
      <script type="application/ld+json">
      { "@type": "Product", "offers": { "price": 99000 }, "floorSize": { "value": 30 } }
      </script>
    `
    
    const result = parseJsonLd(html)
    // Doit quand même extraire du 2ème bloc valide
    expect(result.prix).toBe(99000)
  })

  it('retourne un objet vide si pas de JSON-LD', () => {
    const html = '<html><body>Pas de JSON-LD ici</body></html>'
    const result = parseJsonLd(html)
    expect(Object.keys(result).length).toBe(0)
  })

  it('extrait DPE et GES', () => {
    const html = `
      <script type="application/ld+json">
      {
        "@type": "Apartment",
        "offers": { "price": 300000 },
        "energyClass": "C",
        "emissionClass": "D"
      }
      </script>
    `
    
    const result = parseJsonLd(html)
    expect(result.dpe).toBe('C')
    expect(result.ges).toBe('D')
  })

  it('extrait l\'année de construction', () => {
    const html = `
      <script type="application/ld+json">
      {
        "@type": "Apartment",
        "offers": { "price": 250000 },
        "yearBuilt": 1985
      }
      </script>
    `
    
    const result = parseJsonLd(html)
    expect(result.anneeConstruction).toBe(1985)
  })

  it('filtre les prix aberrants', () => {
    const html = `
      <script type="application/ld+json">
      { "@type": "Product", "offers": { "price": 50 } }
      </script>
    `
    
    const result = parseJsonLd(html)
    expect(result.prix).toBeUndefined()
  })

  it('extrait l\'image depuis un objet avec url/contentUrl', () => {
    const html = `
      <script type="application/ld+json">
      {
        "@type": "Product",
        "offers": { "price": 200000 },
        "image": { "url": "https://cdn.example.com/img.jpg" }
      }
      </script>
    `
    
    const result = parseJsonLd(html)
    expect(result.imageUrl).toBe('https://cdn.example.com/img.jpg')
  })

  it('gère un tableau JSON-LD', () => {
    const html = `
      <script type="application/ld+json">
      [
        { "@type": "BreadcrumbList" },
        { "@type": "Apartment", "offers": { "price": 180000 }, "numberOfRooms": 2 }
      ]
      </script>
    `
    
    const result = parseJsonLd(html)
    expect(result.prix).toBe(180000)
    expect(result.pieces).toBe(2)
  })
})

// ============================================
// parseAnnonceHTML - tests complémentaires
// ============================================
describe('parseAnnonceHTML', () => {
  it('extrait le prix depuis un pattern JSON', () => {
    const html = '<html><body>"price": "350000"</body></html>'
    const result = parseAnnonceHTML(html, 'https://example.com')
    expect(result.prix).toBe(350000)
  })

  it('extrait la surface en m²', () => {
    const html = '<html><body>"surface": "72.5" quelque chose 72.5 m²</body></html>'
    const result = parseAnnonceHTML(html, 'https://example.com')
    expect(result.surface).toBe(72.5)
  })

  it('détecte le type maison', () => {
    const html = '<html><body>Belle maison avec jardin</body></html>'
    const result = parseAnnonceHTML(html, 'https://example.com')
    expect(result.type).toBe('maison')
  })

  it('détecte le type appartement par défaut', () => {
    const html = '<html><body>Bien immobilier en centre-ville</body></html>'
    const result = parseAnnonceHTML(html, 'https://example.com')
    expect(result.type).toBe('appartement')
  })

  it('extrait les équipements', () => {
    const html = '<html><body>"ascenseur": true "balcony": true parking disponible cave</body></html>'
    const result = parseAnnonceHTML(html, 'https://example.com')
    expect(result.ascenseur).toBe(true)
    expect(result.balconTerrasse).toBe(true)
    expect(result.parking).toBe(true)
    expect(result.cave).toBe(true)
  })

  it('extrait le DPE', () => {
    const html = '<html><body>"dpe": "D"</body></html>'
    const result = parseAnnonceHTML(html, 'https://example.com')
    expect(result.dpe).toBe('D')
  })
})

// ============================================
// parseMetaTags
// ============================================
describe('parseMetaTags', () => {
  it('extrait titre et image depuis og:tags', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Appartement T3 Paris 15ème" />
        <meta property="og:image" content="https://cdn.example.com/photo.jpg" />
      </head></html>
    `
    
    const result = parseMetaTags(html)
    expect(result.titre).toBe('Appartement T3 Paris 15ème')
    expect(result.imageUrl).toBe('https://cdn.example.com/photo.jpg')
  })

  it('extrait prix et surface depuis og:description', () => {
    const html = `
      <html><head>
        <meta property="og:description" content="Appartement 3 pièces de 65 m² à 350 000 € dans le 15ème arrondissement" />
      </head></html>
    `
    
    const result = parseMetaTags(html)
    expect(result.prix).toBe(350000)
    expect(result.surface).toBe(65)
  })
})
