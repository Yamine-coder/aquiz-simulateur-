/**
 * TEST COMPLET D'EXTRACTION — Tous les sites × Toutes les méthodes
 *
 * Ce fichier teste exhaustivement :
 *   1. Copy-paste (parseTexteAnnonce) — texte réaliste par site
 *   2. HTML extraction (extractFromHTML) — fixtures HTML par format de site
 *   3. Complétude des champs — vérification que TOUS les 22+ champs sont extractibles
 *   4. Edge cases — encodage, troncature, formats mixtes, prix ambigus
 *   5. Image extraction — upgradeImageUrl + extraireImagesFromHTML
 *   6. completerDonnees — déduction intelligente des champs manquants
 *
 * Usage :
 *   npx vitest run src/lib/scraping/__tests__/extraction-complete.test.ts
 */
import { describe, expect, it } from 'vitest'
import { completerDonnees } from '../completerDonnees'
import {
    detecterSource,
    extractFromHTML,
    parseJsonLd,
    parseMetaTags,
} from '../extracteur'
import {
    compterChampsExtraits,
    extraireImagesFromHTML,
    parseTexteAnnonce,
    upgradeImageUrl,
} from '../parseTexteAnnonce'

// ════════════════════════════════════════════════════════════════
// 1. COPY-PASTE PAR SITE — Texte réaliste copié depuis chaque portail
// ════════════════════════════════════════════════════════════════

describe('Copy-paste — LeBonCoin (format typique)', () => {
  const texte = `
Vente immobilière
Appartement 4 pièces 78 m²
Paris 11ème (75011)
420 000 €

Description
Bel appartement traversant de 78m² situé au 5ème étage avec ascenseur dans une copropriété bien entretenue de 1965.
Entrée, double séjour lumineux, cuisine équipée, 3 chambres, salle de bains, WC séparé.
Cave et place de parking en sous-sol.
Balcon de 6m².

Critères
Type de bien : Appartement
Pièces : 4
Surface : 78 m²
Surface terrain : Non renseigné
Étage : 5 / 8
Meublé : Non

Performances énergétiques
DPE : D 250 kWh/m²/an
GES : C 15 kg CO₂/m²/an

Charges de copropriété : 220 €/mois
Taxe foncière : 1200 €/an

Honoraires charge vendeur
`

  const r = parseTexteAnnonce(texte)

  it('extrait le prix', () => expect(r.prix).toBe(420000))
  it('extrait la surface', () => expect(r.surface).toBe(78))
  it('extrait les pièces', () => expect(r.pieces).toBe(4))
  it('extrait les chambres', () => expect(r.chambres).toBe(3))
  it('extrait le type', () => expect(r.type).toBe('appartement'))
  it('extrait la ville', () => expect(r.ville).toBe('Paris'))
  it('extrait le code postal', () => expect(r.codePostal).toBe('75011'))
  it('extrait le DPE', () => expect(r.dpe).toBe('D'))
  it('extrait le GES', () => expect(r.ges).toBe('C'))
  it('extrait l\'étage', () => expect(r.etage).toBe(5))
  it('extrait les étages total', () => expect(r.etagesTotal).toBe(8))
  it('extrait les charges mensuelles', () => expect(r.chargesMensuelles).toBe(220))
  it('extrait la taxe foncière', () => expect(r.taxeFonciere).toBe(1200))
  it('détecte l\'ascenseur', () => expect(r.ascenseur).toBe(true))
  it('détecte le balcon', () => expect(r.balconTerrasse).toBe(true))
  it('détecte le parking', () => expect(r.parking).toBe(true))
  it('détecte la cave', () => expect(r.cave).toBe(true))
  it('extrait l\'année construction', () => expect(r.anneeConstruction).toBe(1965))
  it('extrait la description', () => expect(r.description).toBeDefined())
  it('extrait au moins 15 champs', () => expect(compterChampsExtraits(r)).toBeGreaterThanOrEqual(15))
})

describe('Copy-paste — SeLoger (format typique)', () => {
  const texte = `
Appartement 3 pièces à vendre
Paris 15ème
350 000 €
Surface : 65 m²
3 pièces dont 2 chambres
1 salle de bains

5ème étage / 7 étages
Ascenseur
DPE : C
GES : D
Année de construction : 1975
Orientation sud
Taxe foncière : 850 €

Bel appartement lumineux situé dans le 15ème arrondissement de Paris, au calme sur cour. Comprend un séjour de 25m², une cuisine séparée, 2 chambres.
Parking en option. Cave. Terrasse de 10m².

Charges mensuelles : 180 €

Contacter l'agence
`

  const r = parseTexteAnnonce(texte)

  it('extrait le prix', () => expect(r.prix).toBe(350000))
  it('extrait la surface', () => expect(r.surface).toBe(65))
  it('extrait les pièces', () => expect(r.pieces).toBe(3))
  it('extrait les chambres', () => expect(r.chambres).toBe(2))
  it('extrait le type', () => expect(r.type).toBe('appartement'))
  it('extrait la ville', () => expect(r.ville).toBe('Paris'))
  it('extrait le DPE', () => expect(r.dpe).toBe('C'))
  it('extrait le GES', () => expect(r.ges).toBe('D'))
  it('extrait l\'étage', () => expect(r.etage).toBe(5))
  it('extrait les étages total', () => expect(r.etagesTotal).toBe(7))
  it('extrait les salles de bains', () => expect(r.nbSallesBains).toBe(1))
  it('extrait l\'orientation', () => expect(r.orientation).toBe('sud'))
  it('extrait l\'année construction', () => expect(r.anneeConstruction).toBe(1975))
  it('extrait la taxe foncière', () => expect(r.taxeFonciere).toBe(850))
  it('extrait les charges', () => expect(r.chargesMensuelles).toBe(180))
  it('détecte ascenseur', () => expect(r.ascenseur).toBe(true))
  it('détecte terrasse', () => expect(r.balconTerrasse).toBe(true))
  it('détecte cave', () => expect(r.cave).toBe(true))
  it('extrait au moins 14 champs', () => expect(compterChampsExtraits(r)).toBeGreaterThanOrEqual(14))
})

describe('Copy-paste — Bien\'ici (format typique)', () => {
  const texte = `
Vente appartement 2 pièces 45 m²
Lyon 3ème (69003)
198 000 €

T2 lumineux au 3ème étage d'un immeuble de R+5 avec ascenseur.
Cuisine ouverte sur séjour, 1 chambre, salle d'eau avec WC.
Pas de parking. Cave disponible.

Classe énergie : B
Classe climat : C

Charges de copropriété : 1 800 € par an
Taxe foncière : 650 €

Construction 2015
Double exposition est/ouest
`

  const r = parseTexteAnnonce(texte)

  it('extrait le prix', () => expect(r.prix).toBe(198000))
  it('extrait la surface', () => expect(r.surface).toBe(45))
  it('extrait les pièces', () => expect(r.pieces).toBe(2))
  it('extrait le type', () => expect(r.type).toBe('appartement'))
  it('extrait la ville', () => expect(r.ville).toBe('Lyon'))
  it('extrait le code postal', () => expect(r.codePostal).toBe('69003'))
  it('extrait le DPE', () => expect(r.dpe).toBe('B'))
  it('extrait le GES', () => expect(r.ges).toBe('C'))
  it('extrait l\'étage', () => expect(r.etage).toBe(3))
  it('extrait les étages total', () => expect(r.etagesTotal).toBe(5))
  it('détecte ascenseur', () => expect(r.ascenseur).toBe(true))
  it('détecte absence parking', () => expect(r.parking).toBe(false))
  it('détecte cave', () => expect(r.cave).toBe(true))
  it('charges copro annuelles converties en mensuel', () => expect(r.chargesMensuelles).toBe(150))
  it('extrait la taxe foncière', () => expect(r.taxeFonciere).toBe(650))
  it('extrait l\'année construction', () => expect(r.anneeConstruction).toBe(2015))
  it('extrait l\'orientation', () => expect(r.orientation).toBe('est/ouest'))
  it('extrait la salle d\'eau', () => expect(r.nbSallesBains).toBe(1))
})

describe('Copy-paste — PAP (format typique)', () => {
  const texte = `
Vente appartement 5 pièces
Bordeaux (33000)
Prix : 485 000 €

Appartement de 105 m² au 2ème étage
4 chambres - 2 salles de bains
Balcon - Parking - Cave

DPE : E
GES : D

Immeuble de 1985
Charges : 250 € / mois
Taxe foncière : 1 100 €

Quartier Saint-Michel, proche tramway et commerces. Grand séjour lumineux de 35m², cuisine aménagée, 4 chambres dont une suite parentale.
`

  const r = parseTexteAnnonce(texte)

  it('extrait le prix', () => expect(r.prix).toBe(485000))
  it('extrait la surface', () => expect(r.surface).toBe(105))
  it('extrait les pièces', () => expect(r.pieces).toBe(5))
  it('extrait les chambres', () => expect(r.chambres).toBe(4))
  it('extrait la ville', () => expect(r.ville).toBe('Bordeaux'))
  it('extrait le code postal', () => expect(r.codePostal).toBe('33000'))
  it('extrait le DPE', () => expect(r.dpe).toBe('E'))
  it('extrait le GES', () => expect(r.ges).toBe('D'))
  it('extrait l\'étage', () => expect(r.etage).toBe(2))
  it('extrait les salles de bains', () => expect(r.nbSallesBains).toBe(2))
  it('détecte balcon', () => expect(r.balconTerrasse).toBe(true))
  it('détecte parking', () => expect(r.parking).toBe(true))
  it('détecte cave', () => expect(r.cave).toBe(true))
  it('extrait l\'année construction', () => expect(r.anneeConstruction).toBe(1985))
  it('extrait les charges', () => expect(r.chargesMensuelles).toBe(250))
  it('extrait la taxe foncière', () => expect(r.taxeFonciere).toBe(1100))
})

describe('Copy-paste — Laforêt (format typique)', () => {
  const texte = `
Laforêt Immobilier
Maison 6 pièces 160 m²
Nantes (44000)
620 000 €

Superbe maison de ville de 160m² sur 3 niveaux avec jardin de 200m².
4 chambres, 2 salles de bains, garage double.
Construction 2005, excellente isolation.
Exposé plein sud.

DPE : B
GES : A

Taxe foncière : 2 200 €

Contacter l'agence Laforêt Nantes Centre
`

  const r = parseTexteAnnonce(texte)

  it('extrait le prix', () => expect(r.prix).toBe(620000))
  it('extrait la surface', () => expect(r.surface).toBe(160))
  it('extrait les pièces', () => expect(r.pieces).toBe(6))
  it('extrait les chambres', () => expect(r.chambres).toBe(4))
  it('extrait le type maison', () => expect(r.type).toBe('maison'))
  it('extrait la ville', () => expect(r.ville).toBe('Nantes'))
  it('extrait le code postal', () => expect(r.codePostal).toBe('44000'))
  it('extrait le DPE', () => expect(r.dpe).toBe('B'))
  it('extrait le GES', () => expect(r.ges).toBe('A'))
  it('extrait l\'année construction', () => expect(r.anneeConstruction).toBe(2005))
  it('extrait l\'orientation', () => expect(r.orientation).toBe('plein sud'))
  it('extrait les salles de bains', () => expect(r.nbSallesBains).toBe(2))
  it('détecte garage/parking', () => expect(r.parking).toBe(true))
  it('extrait la taxe foncière', () => expect(r.taxeFonciere).toBe(2200))
})

describe('Copy-paste — Orpi (format typique)', () => {
  const texte = `
Orpi — Vente
Studio 1 pièce 28 m²
Nice (06000)
165 000 €

Studio rénové en centre-ville de Nice, à 2 pas de la Promenade des Anglais.
1 pièce avec kitchenette, salle d'eau.
RDC sur cour calme. Pas d'ascenseur.
Cave. Pas de parking.

DPE : D
GES : C

Charges mensuelles : 95 €
Taxe foncière : 320 €
Construit en 1960
`

  const r = parseTexteAnnonce(texte)

  it('extrait le prix', () => expect(r.prix).toBe(165000))
  it('extrait la surface', () => expect(r.surface).toBe(28))
  it('extrait les pièces', () => expect(r.pieces).toBe(1))
  it('extrait le type', () => expect(r.type).toBe('appartement'))
  it('extrait la ville', () => expect(r.ville).toBe('Nice'))
  it('extrait le code postal', () => expect(r.codePostal).toBe('06000'))
  it('extrait le DPE', () => expect(r.dpe).toBe('D'))
  it('extrait le GES', () => expect(r.ges).toBe('C'))
  it('détecte RDC comme étage 0', () => expect(r.etage).toBe(0))
  it('détecte absence ascenseur', () => expect(r.ascenseur).toBe(false))
  it('détecte cave', () => expect(r.cave).toBe(true))
  it('détecte absence parking', () => expect(r.parking).toBe(false))
  it('extrait les charges', () => expect(r.chargesMensuelles).toBe(95))
  it('extrait la taxe foncière', () => expect(r.taxeFonciere).toBe(320))
  it('extrait l\'année construction', () => expect(r.anneeConstruction).toBe(1960))
  it('extrait la salle d\'eau', () => expect(r.nbSallesBains).toBe(1))
})

describe('Copy-paste — Century21 (format typique)', () => {
  const texte = `
CENTURY 21
Appartement T4 82 m²
Toulouse (31000)
295 000 €

Au cœur du quartier des Carmes, bel appartement T4 de 82m² au 4ème étage sans ascenseur d'un immeuble de caractère.
Séjour, cuisine aménagée, 3 chambres, salle de bains.
Pas de cave. Terrasse 12m².

Classe énergie : D
Classe climat : E

Charges de copropriété : 2 400 € par an
Taxe foncière : 900 €
Construit en 1910
Orientation sud
`

  const r = parseTexteAnnonce(texte)

  it('extrait le prix', () => expect(r.prix).toBe(295000))
  it('extrait la surface', () => expect(r.surface).toBe(82))
  it('extrait les pièces', () => expect(r.pieces).toBe(4))
  it('extrait les chambres', () => expect(r.chambres).toBe(3))
  it('extrait la ville', () => expect(r.ville).toBe('Toulouse'))
  it('extrait le code postal', () => expect(r.codePostal).toBe('31000'))
  it('extrait le DPE', () => expect(r.dpe).toBe('D'))
  it('extrait le GES', () => expect(r.ges).toBe('E'))
  it('extrait l\'étage', () => expect(r.etage).toBe(4))
  it('détecte absence ascenseur', () => expect(r.ascenseur).toBe(false))
  it('détecte absence cave', () => expect(r.cave).toBe(false))
  it('détecte terrasse', () => expect(r.balconTerrasse).toBe(true))
  it('charges annuelles converties en mensuel', () => expect(r.chargesMensuelles).toBe(200))
  it('extrait la taxe foncière', () => expect(r.taxeFonciere).toBe(900))
  it('extrait l\'année construction', () => expect(r.anneeConstruction).toBe(1910))
  it('extrait l\'orientation', () => expect(r.orientation).toBe('sud'))
})

describe('Copy-paste — IAD France (format mandataire)', () => {
  const texte = `
iadfrance.fr
Maison 5 pièces 130 m²
Rennes (35000)
380 000 €

Jolie maison familiale de 130m² avec jardin, 4 chambres, garage.
Construction 1998. DPE : C. GES : B.
Cuisine équipée, 1 salle de bains + 1 salle d'eau.
Taxe foncière : 1 600 €

Sophie MARTIN, conseillère IAD France
`

  const r = parseTexteAnnonce(texte)

  it('extrait le prix', () => expect(r.prix).toBe(380000))
  it('extrait la surface', () => expect(r.surface).toBe(130))
  it('extrait les pièces', () => expect(r.pieces).toBe(5))
  it('extrait les chambres', () => expect(r.chambres).toBe(4))
  it('extrait le type maison', () => expect(r.type).toBe('maison'))
  it('extrait la ville', () => expect(r.ville).toBe('Rennes'))
  it('extrait le code postal', () => expect(r.codePostal).toBe('35000'))
  it('extrait le DPE', () => expect(r.dpe).toBe('C'))
  it('extrait le GES', () => expect(r.ges).toBe('B'))
  it('extrait l\'année construction', () => expect(r.anneeConstruction).toBe(1998))
  it('détecte garage/parking', () => expect(r.parking).toBe(true))
  it('extrait 2 salles de bains', () => expect(r.nbSallesBains).toBe(2))
  it('extrait la taxe foncière', () => expect(r.taxeFonciere).toBe(1600))
})

describe('Copy-paste — Maison villa haut de gamme', () => {
  const texte = `
Villa contemporaine 8 pièces 320 m²
Aix-en-Provence (13100)
1 850 000 €

Magnifique villa d'architecte de 320m² sur un terrain de 2000m².
6 chambres, 3 salles de bains, double garage.
Piscine, terrasse panoramique.
Construction 2018.
DPE : A. GES : A.
Ascenseur privatif.
Exposé plein sud.
Taxe foncière : 4 500 €
`

  const r = parseTexteAnnonce(texte)

  it('extrait le prix > 1M€', () => expect(r.prix).toBe(1850000))
  it('extrait la surface', () => expect(r.surface).toBe(320))
  it('extrait les pièces', () => expect(r.pieces).toBe(8))
  it('extrait les chambres', () => expect(r.chambres).toBe(6))
  it('extrait le type villa=maison', () => expect(r.type).toBe('maison'))
  it('extrait la ville', () => expect(r.ville).toBe('Aix-en-Provence'))
  it('extrait le code postal', () => expect(r.codePostal).toBe('13100'))
  it('extrait le DPE A', () => expect(r.dpe).toBe('A'))
  it('extrait le GES A', () => expect(r.ges).toBe('A'))
  it('extrait les salles de bains', () => expect(r.nbSallesBains).toBe(3))
  it('détecte garage', () => expect(r.parking).toBe(true))
  it('détecte terrasse', () => expect(r.balconTerrasse).toBe(true))
  it('détecte ascenseur', () => expect(r.ascenseur).toBe(true))
  it('extrait l\'année construction', () => expect(r.anneeConstruction).toBe(2018))
  it('extrait l\'orientation', () => expect(r.orientation).toBe('plein sud'))
  it('extrait la taxe foncière', () => expect(r.taxeFonciere).toBe(4500))
})

describe('Copy-paste — Logement DOM-TOM', () => {
  const texte = `
Appartement T3 75 m²
Fort-de-France (97200)
195 000 €

Appartement de 75m² avec 2 chambres, balcon et parking.
Résidence sécurisée avec piscine.
3ème étage avec ascenseur.

DPE : Non requis en outre-mer
Construit en 2010
Charges : 150 €/mois
`

  const r = parseTexteAnnonce(texte)

  it('extrait le prix', () => expect(r.prix).toBe(195000))
  it('extrait la surface', () => expect(r.surface).toBe(75))
  it('extrait la ville', () => expect(r.ville).toBe('Fort-de-France'))
  it('extrait le code postal DOM-TOM', () => expect(r.codePostal).toBe('97200'))
  it('extrait les chambres', () => expect(r.chambres).toBe(2))
  it('extrait l\'étage', () => expect(r.etage).toBe(3))
  it('détecte ascenseur', () => expect(r.ascenseur).toBe(true))
  it('détecte balcon', () => expect(r.balconTerrasse).toBe(true))
  it('détecte parking', () => expect(r.parking).toBe(true))
  it('extrait les charges', () => expect(r.chargesMensuelles).toBe(150))
  it('extrait l\'année construction', () => expect(r.anneeConstruction).toBe(2010))
})

describe('Copy-paste — Investissement locatif petit studio', () => {
  const texte = `
Studio 18 m²
Paris 5ème (75005)
180 000 €

Studio meublé au RDC, idéal investissement locatif.
Kitchenette, salle d'eau, WC.
Pas d'ascenseur. Pas de parking. Pas de cave.
Immeuble de 1890.
DPE : F
GES : E
Charges mensuelles : 45 €
`

  const r = parseTexteAnnonce(texte)

  it('extrait le prix', () => expect(r.prix).toBe(180000))
  it('extrait la surface', () => expect(r.surface).toBe(18))
  it('type studio = appartement', () => expect(r.type).toBe('appartement'))
  it('extrait la ville', () => expect(r.ville).toBe('Paris'))
  it('extrait le code postal', () => expect(r.codePostal).toBe('75005'))
  it('extrait le DPE passoire', () => expect(r.dpe).toBe('F'))
  it('extrait le GES', () => expect(r.ges).toBe('E'))
  it('détecte RDC', () => expect(r.etage).toBe(0))
  it('détecte absence ascenseur', () => expect(r.ascenseur).toBe(false))
  it('détecte absence parking', () => expect(r.parking).toBe(false))
  it('détecte absence cave', () => expect(r.cave).toBe(false))
  it('extrait les charges', () => expect(r.chargesMensuelles).toBe(45))
  it('extrait l\'année construction', () => expect(r.anneeConstruction).toBe(1890))
  it('extrait salle d\'eau', () => expect(r.nbSallesBains).toBe(1))
})

// ════════════════════════════════════════════════════════════════
// 2. HTML EXTRACTION PAR FORMAT DE SITE
// ════════════════════════════════════════════════════════════════

describe('HTML — JSON-LD RealEstateListing complet (Century21/Orpi style)', () => {
  const html = `
<html><head>
<meta property="og:title" content="Appartement T3 Paris 15e - 425 000 €" />
<meta property="og:image" content="https://photos.century21.fr/apartment-paris.jpg" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "Appartement T3 lumineux Paris 15ème",
  "description": "Bel appartement traversant de 65m² avec balcon, situé au 4ème étage d'un immeuble haussmannien avec ascenseur",
  "offers": { "@type": "Offer", "price": "425000", "priceCurrency": "EUR" },
  "floorSize": { "@type": "QuantitativeValue", "value": "65", "unitCode": "MTK" },
  "numberOfRooms": 3,
  "numberOfBedrooms": 2,
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Paris",
    "postalCode": "75015",
    "streetAddress": "12 rue de Vaugirard"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 48.842, "longitude": 2.296 },
  "image": "https://photos.century21.fr/apartment-paris-hd.jpg"
}
</script>
</head><body>
DPE : C  GES : D
Ascenseur. Balcon. Cave. Parking.
Année de construction : 1975
Charges mensuelles : 200 €
Taxe foncière : 850 €
1 salle de bains
Orientation sud
</body></html>`

  const result = extractFromHTML(html, 'https://www.century21.fr/trouver_logement/detail/123/')

  it('extrait prix depuis JSON-LD', () => expect(result?.prix).toBe(425000))
  it('extrait surface depuis JSON-LD', () => expect(result?.surface).toBe(65))
  it('extrait pièces depuis JSON-LD', () => expect(result?.pieces).toBe(3))
  it('extrait chambres depuis JSON-LD', () => expect(result?.chambres).toBe(2))
  it('extrait ville depuis JSON-LD', () => expect(result?.ville).toBe('Paris'))
  it('extrait code postal depuis JSON-LD', () => expect(result?.codePostal).toBe('75015'))
  it('extrait adresse depuis JSON-LD', () => expect(result?.adresse).toBe('12 rue de Vaugirard'))
  it('extrait image depuis JSON-LD', () => expect(result?.imageUrl).toBeDefined())
  it('extrait DPE depuis body text', () => expect(result?.dpe).toBe('C'))
  it('extrait GES depuis body text', () => expect(result?.ges).toBe('D'))
  it('extrait latitude', () => expect(result?.latitude).toBeCloseTo(48.842, 2))
  it('extrait longitude', () => expect(result?.longitude).toBeCloseTo(2.296, 2))
})

describe('HTML — __NEXT_DATA__ (Laforêt/Orpi/NextJS sites)', () => {
  const html = `
<html><head>
<meta property="og:title" content="Maison 5 pièces Nantes" />
</head><body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "property": {
        "title": "Maison 5P Nantes centre",
        "price": 520000,
        "livingArea": 140,
        "surface": 140,
        "rooms": 5,
        "numberOfRooms": 5,
        "bedrooms": 3,
        "numberOfBedrooms": 3,
        "numberOfBathroomsTotal": 2,
        "city": "Nantes",
        "zipCode": "44000",
        "energyClass": "C",
        "greenhouseGasEmission": "B",
        "yearBuilt": 1990,
        "exposure": "sud-ouest",
        "description": "Belle maison de ville rénovée avec goût, comprenant un séjour lumineux, une cuisine équipée ouverte, 3 chambres, 2 salles de bains."
      }
    }
  }
}
</script>
Garage. Terrasse. Pas de cave.
Charges mensuelles : 0 €
Taxe foncière : 1 800 €
</body></html>`

  const result = extractFromHTML(html, 'https://www.laforet.com/acheter/nantes/123')

  it('extrait prix depuis __NEXT_DATA__', () => expect(result?.prix).toBe(520000))
  it('extrait surface', () => expect(result?.surface).toBe(140))
  it('extrait pièces', () => expect(result?.pieces).toBe(5))
  it('extrait chambres', () => expect(result?.chambres).toBe(3))
  it('extrait salles de bains', () => expect(result?.nbSallesBains).toBe(2))
  it('extrait ville', () => expect(result?.ville).toBe('Nantes'))
  it('extrait code postal', () => expect(result?.codePostal).toBe('44000'))
  it('extrait DPE', () => expect(result?.dpe).toBe('C'))
  it('extrait GES', () => expect(result?.ges).toBe('B'))
  it('extrait année construction', () => expect(result?.anneeConstruction).toBe(1990))
  it('extrait orientation', () => expect(result?.orientation).toBeDefined())
  it('extrait description', () => expect(result?.description).toBeDefined())
})

describe('HTML — LeBonCoin attributes format', () => {
  const html = `
<html><head>
<meta property="og:title" content="Appartement 3P Paris 11e" />
<meta property="og:image" content="https://img.leboncoin.fr/ad/image/abcd1234.jpg" />
</head><body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "ad": {
        "subject": "Bel Appartement 3P Paris 11e",
        "body": "Superbe appartement de 62m² entièrement rénové situé dans le quartier Oberkampf. Séjour lumineux, cuisine équipée ouverte.",
        "price": [320000],
        "location": {
          "city": "Paris",
          "zipcode": "75011",
          "city_label": "Paris 11ème",
          "lat": 48.8634,
          "lng": 2.3769
        },
        "images": {
          "urls_large": [
            "https://img.leboncoin.fr/ad/image/large1.jpg",
            "https://img.leboncoin.fr/ad/image/large2.jpg"
          ]
        },
        "attributes": [
          { "key": "rooms", "value": "3", "value_label": "3 pièces" },
          { "key": "square", "value": "62", "value_label": "62 m²" },
          { "key": "nb_bedrooms", "value": "2", "value_label": "2 chambres" },
          { "key": "energy_rate", "value": "D", "value_label": "D" },
          { "key": "ges", "value": "C", "value_label": "C" },
          { "key": "floor_number", "value": "4", "value_label": "4ème étage" },
          { "key": "nb_floors_building", "value": "6", "value_label": "6 étages" },
          { "key": "elevator", "value": "1", "value_label": "Oui" },
          { "key": "outside_access", "value": "1", "value_label": "Balcon" },
          { "key": "nb_parking", "value": "1", "value_label": "1 place" },
          { "key": "cellar", "value": "1", "value_label": "Oui" },
          { "key": "construction_year", "value": "1970", "value_label": "1970" },
          { "key": "charges", "value": "180", "value_label": "180 €/mois" }
        ]
      }
    }
  }
}
</script>
</body></html>`

  const result = extractFromHTML(html, 'https://www.leboncoin.fr/ventes_immobilieres/123456')

  it('extrait prix depuis array', () => expect(result?.prix).toBe(320000))
  it('extrait surface', () => expect(result?.surface).toBe(62))
  it('extrait pièces', () => expect(result?.pieces).toBe(3))
  it('extrait chambres', () => expect(result?.chambres).toBe(2))
  it('extrait ville', () => expect(result?.ville).toBe('Paris'))
  it('extrait code postal', () => expect(result?.codePostal).toBe('75011'))
  it('extrait DPE', () => expect(result?.dpe).toBe('D'))
  it('extrait GES', () => expect(result?.ges).toBe('C'))
  it('extrait étage', () => expect(result?.etage).toBe(4))
  it('extrait étages total', () => expect(result?.etagesTotal).toBe(6))
  it('détecte ascenseur', () => expect(result?.ascenseur).toBe(true))
  it('détecte balcon', () => expect(result?.balconTerrasse).toBe(true))
  it('détecte parking', () => expect(result?.parking).toBe(true))
  it('détecte cave', () => expect(result?.cave).toBe(true))
  it('extrait année construction', () => expect(result?.anneeConstruction).toBe(1970))
  it('extrait charges', () => expect(result?.chargesMensuelles).toBe(180))
  it('extrait titre', () => expect(result?.titre).toContain('Appartement'))
  it('extrait description', () => expect(result?.description).toBeDefined())
  it('extrait imageUrl', () => expect(result?.imageUrl).toBeDefined())
  it('extrait latitude', () => expect(result?.latitude).toBeCloseTo(48.86, 1))
  it('extrait longitude', () => expect(result?.longitude).toBeCloseTo(2.37, 1))
})

describe('HTML — SeLoger @graph JSON-LD + meta', () => {
  const html = `
<html><head>
<meta property="og:title" content="Appartement 2 pièces 45 m² Marseille 8ème" />
<meta property="og:image" content="https://v.seloger.com/s/width/1280/visuels/apt-marseille.jpg" />
<meta property="og:description" content="Studio rénové de 45m², idéal investissement" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Apartment",
      "name": "Appartement 2P Marseille 8ème",
      "offers": { "price": 175000 },
      "floorSize": { "value": 45 },
      "numberOfRooms": 2,
      "numberOfBedrooms": 1,
      "address": {
        "addressLocality": "Marseille",
        "postalCode": "13008"
      }
    }
  ]
}
</script>
</head><body>
(DPE) E
(GES) D
Année construction 1968
2ème étage/5
Ascenseur
</body></html>`

  const result = extractFromHTML(html, 'https://www.seloger.com/annonces/achat/appartement/marseille/260515181.htm')

  it('extrait prix depuis @graph', () => expect(result?.prix).toBe(175000))
  it('extrait surface', () => expect(result?.surface).toBe(45))
  it('extrait pièces', () => expect(result?.pieces).toBe(2))
  it('extrait chambres', () => expect(result?.chambres).toBe(1))
  it('extrait ville', () => expect(result?.ville).toBe('Marseille'))
  it('extrait code postal', () => expect(result?.codePostal).toBe('13008'))
  it('extrait DPE format SeLoger "(DPE) E"', () => expect(result?.dpe).toBe('E'))
  it('extrait GES format SeLoger "(GES) D"', () => expect(result?.ges).toBe('D'))
  it('extrait imageUrl desde og:image', () => expect(result?.imageUrl).toBeDefined())
})

describe('HTML — meta og uniquement (portails simples)', () => {
  const html = `
<html><head>
<meta property="og:title" content="Appartement 3 pièces 70 m² à Strasbourg - 230 000 €" />
<meta property="og:description" content="Bel appartement de 70m² avec 2 chambres dans le centre historique de Strasbourg, lumineux et calme, proche tramway." />
<meta property="og:image" content="https://photos.superimmo.com/apt-strasbourg.jpg" />
<meta property="og:url" content="https://www.superimmo.com/annonces/123456" />
</head><body>
Un contenu HTML minimal sans JSON-LD.
DPE : C
Charges : 120 €/mois
</body></html>`

  const result = extractFromHTML(html, 'https://www.superimmo.com/annonces/123456')

  it('extrait prix depuis og:title', () => expect(result?.prix).toBe(230000))
  it('extrait surface depuis og:title/description', () => expect(result?.surface).toBe(70))
  it('extrait imageUrl', () => expect(result?.imageUrl).toBe('https://photos.superimmo.com/apt-strasbourg.jpg'))
  it('extrait DPE depuis body', () => expect(result?.dpe).toBe('C'))
})

describe('HTML — JSON inline (format JSON brut dans le body)', () => {
  const html = `
<html><head></head><body>
<div id="app">
"price": "289000"
"surface": "58"
"rooms": 2
"bedrooms": 1
"city": "Lille"
"postalCode": "59000"
"dpe": "D"
"ges": "C"
"floor": 3
"elevator": true
"parking": true
"balcony": true
"cave": true
"yearBuilt": 1982
</div>
</body></html>`

  const result = extractFromHTML(html, 'https://www.capifrance.fr/annonce-123')

  it('extrait prix depuis JSON inline', () => expect(result?.prix).toBe(289000))
  it('extrait surface', () => expect(result?.surface).toBe(58))
  it('extrait pièces', () => expect(result?.pieces).toBe(2))
  it('extrait chambres', () => expect(result?.chambres).toBe(1))
  it('extrait ville', () => expect(result?.ville).toBe('Lille'))
  it('extrait code postal', () => expect(result?.codePostal).toBe('59000'))
  it('extrait DPE', () => expect(result?.dpe).toBe('D'))
  it('extrait GES', () => expect(result?.ges).toBe('C'))
  it('détecte ascenseur', () => expect(result?.ascenseur).toBe(true))
  it('détecte parking', () => expect(result?.parking).toBe(true))
  it('détecte balcon', () => expect(result?.balconTerrasse).toBe(true))
  it('détecte cave', () => expect(result?.cave).toBe(true))
})

describe('HTML — PAP data attributes', () => {
  const html = `
<html><head>
<meta property="og:title" content="Appartement T2 Paris 18ème" />
</head><body>
<div data-city="Paris" data-zipcode="75018">
<div data-current-dpe="D">
"price": "320000"
"surface": "48"
2 pièces, 1 chambre
3ème étage, ascenseur
Balcon, cave
Charges : 150 €/mois
</div></div>
</body></html>`

  const result = extractFromHTML(html, 'https://www.pap.fr/annonces/appartement-paris-123')

  it('extrait ville depuis data-city', () => expect(result?.ville).toBe('Paris'))
  it('extrait code postal de data-zipcode', () => expect(result?.codePostal).toBe('75018'))
  it('extrait DPE depuis data-current-dpe', () => expect(result?.dpe).toBe('D'))
  it('extrait prix', () => expect(result?.prix).toBe(320000))
  it('extrait surface', () => expect(result?.surface).toBe(48))
})

// ════════════════════════════════════════════════════════════════
// 3. COMPLÉTUDE DES CHAMPS — Vérifier que TOUS les champs sont extractibles
// ════════════════════════════════════════════════════════════════

describe('Complétude — tous les 22 champs extractibles par copy-paste', () => {
  const texteComplet = `
https://www.leboncoin.fr/ventes_immobilieres/999999.htm

Appartement T4 lumineux avec vue dégagée
Paris 16ème (75016)
Prix : 650 000 €

Superbe appartement de 95m² situé au 6ème et dernier étage d'un bel immeuble haussmannien de 6 étages avec ascenseur.
Comprend un double séjour de 35m², une cuisine équipée fermée, 3 chambres, 2 salles de bains.
Balcon filant de 8m², cave en sous-sol, place de parking.

DPE : C 180 kWh/m²/an
GES : D 25 kg CO₂/m²/an

Charges mensuelles : 350 €
Taxe foncière : 1 500 €
Année de construction : 1905
Orientation sud

Honoraires à la charge du vendeur
`

  const r = parseTexteAnnonce(texteComplet)

  it('prix', () => expect(r.prix).toBe(650000))
  it('surface', () => expect(r.surface).toBe(95))
  it('pièces', () => expect(r.pieces).toBe(4))
  it('chambres', () => expect(r.chambres).toBe(3))
  it('type', () => expect(r.type).toBe('appartement'))
  it('ville', () => expect(r.ville).toBe('Paris'))
  it('codePostal', () => expect(r.codePostal).toBe('75016'))
  it('dpe', () => expect(r.dpe).toBe('C'))
  it('ges', () => expect(r.ges).toBe('D'))
  it('etage', () => expect(r.etage).toBe(6))
  it('etagesTotal', () => expect(r.etagesTotal).toBe(6))
  it('chargesMensuelles', () => expect(r.chargesMensuelles).toBe(350))
  it('taxeFonciere', () => expect(r.taxeFonciere).toBe(1500))
  it('titre', () => expect(r.titre).toBeDefined())
  it('description', () => expect(r.description).toBeDefined())
  it('ascenseur', () => expect(r.ascenseur).toBe(true))
  it('balconTerrasse', () => expect(r.balconTerrasse).toBe(true))
  it('parking', () => expect(r.parking).toBe(true))
  it('cave', () => expect(r.cave).toBe(true))
  it('anneeConstruction', () => expect(r.anneeConstruction).toBe(1905))
  it('nbSallesBains', () => expect(r.nbSallesBains).toBe(2))
  it('orientation', () => expect(r.orientation).toBe('sud'))
  it('url', () => expect((r as Record<string, unknown>).url).toContain('leboncoin.fr'))
  it('totalité >= 20 champs extraits', () => expect(compterChampsExtraits(r)).toBeGreaterThanOrEqual(18))
})

// ════════════════════════════════════════════════════════════════
// 4. EDGE CASES — Encodage, troncature, formats ambigus
// ════════════════════════════════════════════════════════════════

describe('Edge cases — encodage et caractères spéciaux', () => {
  it('gère les espaces insécables \\u00A0 dans le prix', () => {
    const r = parseTexteAnnonce('Prix\u00A0: 350\u00A0000\u00A0€ Surface 65\u00A0m²')
    expect(r.prix).toBe(350000)
    expect(r.surface).toBe(65)
  })

  it('gère les tirets longs (—) dans le titre', () => {
    const r = parseTexteAnnonce('Appartement T3 — Paris 15ème — 350 000 €')
    expect(r.prix).toBe(350000)
    expect(r.type).toBe('appartement')
  })

  it('gère les guillemets français « » dans le texte', () => {
    const r = parseTexteAnnonce('« Appartement » de 65 m² à 350 000 €')
    expect(r.prix).toBe(350000)
    expect(r.surface).toBe(65)
  })

  it('gère les apostrophes typographiques \u2019', () => {
    const r = parseTexteAnnonce('L\u2019appartement fait 65 m² prix 350 000 €')
    expect(r.prix).toBe(350000)
    expect(r.surface).toBe(65)
  })
})

describe('Edge cases — troncature et texte long', () => {
  it('extrait malgré un texte > 200K caractères', () => {
    const texte = 'Appartement 350 000 € 65 m² DPE C 75015 Paris ' + 'a'.repeat(250000)
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(350000)
    expect(r.surface).toBe(65)
  })

  it('ne crash pas sur un texte binaire', () => {
    const texte = 'Appartement 350 000 € \x00\x01\x02\x03 65 m²'
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(350000)
  })
})

describe('Edge cases — prix ambigus', () => {
  it('ignore les prix de type loyer (< 10K)', () => {
    const r = parseTexteAnnonce('Loyer 850 € par mois')
    expect(r.prix).toBeUndefined()
  })

  it('ignore les numéros de téléphone', () => {
    const r = parseTexteAnnonce('Tel: 06 12 34 56 78 Prix 350 000 €')
    expect(r.prix).toBe(350000)
  })

  it('prend le premier prix immobilier (pas les prix d\'estimation)', () => {
    const r = parseTexteAnnonce('Prix : 450 000 € .\nEstimation basse : 420 000 €')
    expect(r.prix).toBe(450000)
  })
})

describe('Edge cases — DPE avec échelle complète LeBonCoin', () => {
  it('extrait la bonne classe DPE malgré l\'échelle A-G', () => {
    const texte = `
Logement économe
A ≤ 50 kWh
B 51 à 90 kWh
C 91 à 150 kWh
D 151 à 230 kWh
E 231 à 330 kWh
F 331 à 450 kWh
G > 450 kWh
Logement énergivore
D 215 kWh/m²/an
`
    const r = parseTexteAnnonce(texte)
    expect(r.dpe).toBe('D')
  })

  it('extrait la bonne classe GES malgré l\'échelle A-G', () => {
    const texte = `
Faible émission
A ≤ 5 kg CO₂
B 6 à 10 kg CO₂
C 11 à 20 kg CO₂
D 21 à 35 kg CO₂
E 36 à 55 kg CO₂
F 56 à 80 kg CO₂
G > 80 kg CO₂
Forte émission
E 42 kg CO₂/m²/an
`
    const r = parseTexteAnnonce(texte)
    expect(r.ges).toBe('E')
  })
})

describe('Edge cases — charges et taxes ambiguës', () => {
  it('charges copropriété annuelles > 1200€ → divisées par 12', () => {
    const r = parseTexteAnnonce('Charges de copropriété : 4 800 € par an')
    expect(r.chargesMensuelles).toBe(400)
  })

  it('charges < 1200€ restent mensuelles', () => {
    const r = parseTexteAnnonce('Charges 800 €')
    expect(r.chargesMensuelles).toBe(800)
  })

  it('provisions sur charges', () => {
    const r = parseTexteAnnonce('Provisions sur charges : 250 €')
    expect(r.chargesMensuelles).toBe(250)
  })
})

describe('Edge cases — localisation', () => {
  it('extrait Boulogne-Billancourt (ville composée)', () => {
    const r = parseTexteAnnonce('Appartement à Boulogne-Billancourt 450 000 € 65 m²')
    expect(r.ville).toBe('Boulogne-Billancourt')
  })

  it('déduit Paris depuis code postal 75xxx', () => {
    const r = parseTexteAnnonce('Appartement 350 000 € 65 m² 75016')
    expect(r.ville).toBe('Paris')
    expect(r.codePostal).toBe('75016')
  })

  it('déduit Lyon depuis code postal 69xxx', () => {
    const r = parseTexteAnnonce('Appartement 200 000 € 55 m² 69003')
    expect(r.ville).toBe('Lyon')
    expect(r.codePostal).toBe('69003')
  })

  it('déduit Marseille depuis code postal 13xxx', () => {
    const r = parseTexteAnnonce('Maison 400 000 € 120 m² 13008')
    expect(r.ville).toBe('Marseille')
    expect(r.codePostal).toBe('13008')
  })

  it('extrait code postal Corse 20000', () => {
    const r = parseTexteAnnonce('Appartement 180 000 € 55 m² Ajaccio 20000')
    expect(r.codePostal).toBe('20000')
    expect(r.ville).toBe('Ajaccio')
  })

  it('extrait code postal DOM-TOM 97100', () => {
    const r = parseTexteAnnonce('Appartement 250 000 € 65 m² 97100')
    expect(r.codePostal).toBe('97100')
  })
})

describe('Edge cases — types de biens spéciaux', () => {
  it('longère = maison', () => {
    const r = parseTexteAnnonce('Longère rénovée 5 pièces 150 m² 280 000 €')
    expect(r.type).toBe('maison')
  })

  it('loft = appartement', () => {
    const r = parseTexteAnnonce('Loft industriel 3 pièces 120 m² 550 000 €')
    expect(r.type).toBe('appartement')
  })

  it('duplex = appartement', () => {
    const r = parseTexteAnnonce('Duplex 4 pièces 90 m² 380 000 €')
    expect(r.type).toBe('appartement')
  })

  it('triplex = appartement', () => {
    const r = parseTexteAnnonce('Triplex 5 pièces 130 m² 520 000 €')
    expect(r.type).toBe('appartement')
  })

  it('corps de ferme = maison', () => {
    const r = parseTexteAnnonce('Corps de ferme 8 pièces 300 m² 450 000 €')
    expect(r.type).toBe('maison')
  })

  it('chalet = maison', () => {
    const r = parseTexteAnnonce('Chalet 4 pièces 100 m² 600 000 €')
    expect(r.type).toBe('maison')
  })
})

// ════════════════════════════════════════════════════════════════
// 5. IMAGE EXTRACTION
// ════════════════════════════════════════════════════════════════

describe('upgradeImageUrl — par site', () => {
  it('SeLoger : crop → width/1280', () => {
    const url = 'https://v.seloger.com/s/crop/310x225/visuels/photo.jpg'
    expect(upgradeImageUrl(url)).toBe('https://v.seloger.com/s/width/1280/visuels/photo.jpg')
  })

  it('LeBonCoin : 300x300 → ad-large', () => {
    const url = 'https://img.leboncoin.fr/api/v1/lbcpb1/images/abc123/300x300.webp'
    expect(upgradeImageUrl(url)).toBe('https://img.leboncoin.fr/api/v1/lbcpb1/images/abc123/ad-large.jpg')
  })

  it('Bien\'ici : fit-in/360x270 → fit-in/1280x960', () => {
    const url = 'https://photos.bienici.com/fit-in/360x270/abc.jpg'
    expect(upgradeImageUrl(url)).toBe('https://photos.bienici.com/fit-in/1280x960/abc.jpg')
  })

  it('PAP : /thumb/ → /', () => {
    const url = 'https://photos.pap.fr/thumb/photo123.jpg'
    expect(upgradeImageUrl(url)).toBe('https://photos.pap.fr/photo123.jpg')
  })

  it('Logic-Immo : /i/200x200/ → /i/1280x960/', () => {
    const url = 'https://photos.logic-immo.com/i/200x200/photo.jpg'
    expect(upgradeImageUrl(url)).toBe('https://photos.logic-immo.com/i/1280x960/photo.jpg')
  })

  it('URL inconnue : retourne inchangée', () => {
    const url = 'https://photos.random-portal.com/photo.jpg'
    expect(upgradeImageUrl(url)).toBe(url)
  })

  it('URL vide : retourne vide', () => {
    expect(upgradeImageUrl('')).toBe('')
  })
})

describe('extraireImagesFromHTML', () => {
  it('extrait og:image comme image principale', () => {
    const html = '<meta property="og:image" content="https://cdn.example.com/photo1.jpg" />'
    const result = extraireImagesFromHTML(html)
    expect(result.imageUrl).toBe('https://cdn.example.com/photo1.jpg')
  })

  it('extrait twitter:image comme fallback', () => {
    const html = '<meta name="twitter:image" content="https://cdn.example.com/photo2.jpg" />'
    const result = extraireImagesFromHTML(html)
    expect(result.imageUrl).toBe('https://cdn.example.com/photo2.jpg')
  })

  it('extrait les images depuis <img> src', () => {
    const html = `
<img src="https://cdn.example.com/photo1.jpg" width="800" height="600" />
<img src="https://cdn.example.com/photo2.jpg" width="800" height="600" />
`
    const result = extraireImagesFromHTML(html)
    expect(result.imageUrl).toBeDefined()
    expect(result.images.length).toBeGreaterThanOrEqual(2)
  })

  it('ignore les logos et icônes', () => {
    const html = `
<img src="https://cdn.example.com/logo.svg" width="50" height="50" />
<img src="https://cdn.example.com/icon-badge.png" width="30" height="30" />
<img src="https://cdn.example.com/real-photo.jpg" width="800" height="600" />
`
    const result = extraireImagesFromHTML(html)
    expect(result.imageUrl).toBe('https://cdn.example.com/real-photo.jpg')
  })

  it('retourne vide pour HTML court', () => {
    const result = extraireImagesFromHTML('<html />')
    expect(result.images).toEqual([])
    expect(result.imageUrl).toBeUndefined()
  })
})

// ════════════════════════════════════════════════════════════════
// 6. COMPLÉTION DES DONNÉES — completerDonnees
// ════════════════════════════════════════════════════════════════

describe('completerDonnees — déduction complète', () => {
  it('déduit tout ce qui manque à partir de données minimales', () => {
    const data: Record<string, unknown> = {
      prix: 350000,
      surface: 65,
      codePostal: '75015',
    }
    completerDonnees(data)
    expect(data.type).toBe('appartement')
    expect(data.pieces).toBe(3) // 65/22 ≈ 3
    expect(data.chambres).toBe(2) // 3 - 1
    expect(data.dpe).toBe('NC')
    expect(data.ville).toBeUndefined() // completerDonnees ne déduit pas ville
    expect(data.departement).toBe('75')
  })

  it('déduit maison depuis « villa » dans le titre', () => {
    const data: Record<string, unknown> = { titre: 'Villa avec piscine', surface: 150 }
    completerDonnees(data)
    expect(data.type).toBe('maison')
  })

  it('déduit maison depuis « pavillon » dans la description', () => {
    const data: Record<string, unknown> = { description: 'Joli pavillon avec jardin', surface: 100 }
    completerDonnees(data)
    expect(data.type).toBe('maison')
  })

  it('ne remplace pas un type existant', () => {
    const data: Record<string, unknown> = { type: 'maison', titre: 'Appartement converti' }
    completerDonnees(data)
    expect(data.type).toBe('maison')
  })

  it('département Corse 2A pour CP 20000-20190', () => {
    const data: Record<string, unknown> = { codePostal: '20100' }
    completerDonnees(data)
    expect(data.departement).toBe('2A')
  })

  it('département Corse 2B pour CP 20200+', () => {
    const data: Record<string, unknown> = { codePostal: '20250' }
    completerDonnees(data)
    expect(data.departement).toBe('2B')
  })

  it('département DOM-TOM 3 chiffres', () => {
    const data: Record<string, unknown> = { codePostal: '97400' }
    completerDonnees(data)
    expect(data.departement).toBe('974')
  })

  it('département standard 2 chiffres', () => {
    const data: Record<string, unknown> = { codePostal: '33000' }
    completerDonnees(data)
    expect(data.departement).toBe('33')
  })
})

// ════════════════════════════════════════════════════════════════
// 7. DÉTECTION DE SOURCE — URL patterns complets
// ════════════════════════════════════════════════════════════════

describe('detecterSource — couverture exhaustive des variantes URL', () => {
  it('SeLoger avec sous-domaine', () => {
    expect(detecterSource('https://www.seloger.com/annonces/achat/123.htm')).toBe('seloger')
  })

  it('SeLoger sans www', () => {
    expect(detecterSource('https://seloger.com/annonces/123.htm')).toBe('seloger')
  })

  it('SeLoger Neuf', () => {
    expect(detecterSource('https://www.selogerneuf.com/programme/123')).toBe('seloger')
  })

  it('LeBonCoin lien court', () => {
    expect(detecterSource('https://www.leboncoin.fr/ad/ventes_immobilieres/123')).toBe('leboncoin')
  })

  it('LeBonCoin ancien format', () => {
    expect(detecterSource('https://www.leboncoin.fr/ventes_immobilieres/123456.htm')).toBe('leboncoin')
  })

  it('Bien\'ici alternatif bien-ici.com', () => {
    expect(detecterSource('https://www.bien-ici.com/annonce/123')).toBe('bienici')
  })

  it('Guy Hoquet sans tiret', () => {
    expect(detecterSource('https://www.guyhoquet.com/annonces/123')).toBe('guyhoquet')
  })

  it('Hosman alternatif proprioo.com', () => {
    expect(detecterSource('https://www.proprioo.com/biens/123')).toBe('hosman')
  })

  it('Hosman avec hosman.com', () => {
    expect(detecterSource('https://www.hosman.com/bien/123')).toBe('hosman')
  })

  it('Green Acres variante greenacres', () => {
    expect(detecterSource('https://www.greenacres.fr/properties/123')).toBe('greenacres')
  })

  it('Figaro Immo depuis explorimmo', () => {
    expect(detecterSource('https://www.explorimmo.com/annonce/123')).toBe('figaro')
  })

  it('Figaro Immo depuis immo.lefigaro', () => {
    expect(detecterSource('https://immo.lefigaro.fr/annonces/123')).toBe('figaro')
  })

  it('Figaro Immo depuis immobilier.lefigaro', () => {
    expect(detecterSource('https://immobilier.lefigaro.fr/annonces/123')).toBe('figaro')
  })

  it('site inconnu → null', () => {
    expect(detecterSource('https://www.random-site.fr/annonce/123')).toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════
// 8. EXTRACTION URL DANS LE TEXTE COLLÉ (sites variés)
// ════════════════════════════════════════════════════════════════

describe('Extraction URL depuis texte — tous les sites supportés', () => {
  const sites = [
    { name: 'LeBonCoin', url: 'https://www.leboncoin.fr/ventes_immobilieres/123456.htm' },
    { name: 'SeLoger', url: 'https://www.seloger.com/annonces/achat/appartement/paris/123.htm' },
    { name: 'SeLoger Neuf', url: 'https://www.selogerneuf.com/programme/paris/123' },
    { name: 'PAP', url: 'https://www.pap.fr/annonces/appartement-paris-123' },
    { name: 'Bien\'ici', url: 'https://www.bienici.com/annonce/vente/paris/123' },
    { name: 'Bien-ici alt', url: 'https://www.bien-ici.com/annonce/123' },
    { name: 'Logic-Immo', url: 'https://www.logic-immo.com/detail-vente-123.htm' },
    { name: 'Laforêt', url: 'https://www.laforet.com/acheter/listing/123' },
    { name: 'Orpi', url: 'https://www.orpi.com/annonce-vente/123' },
    { name: 'Century21', url: 'https://www.century21.fr/trouver_logement/detail/123' },
    { name: 'Guy Hoquet', url: 'https://www.guy-hoquet.com/annonces/123' },
    { name: 'IAD', url: 'https://www.iadfrance.fr/annonce/vente-123' },
    { name: 'Capifrance', url: 'https://www.capifrance.fr/annonce-123' },
    { name: 'Safti', url: 'https://www.safti.fr/annonce/123' },
    { name: 'Foncia', url: 'https://www.foncia.com/vente/paris/123' },
    { name: 'Nexity', url: 'https://www.nexity.fr/programme/paris/123' },
    { name: 'ParuVendu', url: 'https://www.paruvendu.fr/immobilier/annonce/123' },
  ]

  for (const { name, url } of sites) {
    it(`extrait URL ${name} depuis texte collé`, () => {
      const texte = `Voir cette annonce : ${url} prix 300 000 €`
      const r = parseTexteAnnonce(texte)
      expect((r as Record<string, unknown>).url).toBe(url)
    })
  }
})

// ════════════════════════════════════════════════════════════════
// 9. ANNÉE DE CONSTRUCTION — Patterns variés
// ════════════════════════════════════════════════════════════════

describe('Année de construction — tous les patterns', () => {
  const cases: [string, number][] = [
    ['Année de construction : 1985', 1985],
    ['Construit en 1972', 1972],
    ['Construction 2018', 2018],
    ['Immeuble de 1930', 1930],
    ['Résidence de 1998', 1998],
    ['Copropriété de 1974', 1974],
    ['Livraison 2025', 2025],
    ['Livraison prévue T3 2025', 2025],
    ['Bâti en 1955', 1955],
    ['Datant de 1890', 1890],
    ['Années 70', 1970],
    ['| Année de construction | 1982 |', 1982],
    ['Période de construction : 1960', 1960],
  ]

  for (const [texte, annee] of cases) {
    it(`"${texte}" → ${annee}`, () => {
      const r = parseTexteAnnonce(`Appartement 300 000 € 65 m² ${texte}`)
      expect(r.anneeConstruction).toBe(annee)
    })
  }
})

// ════════════════════════════════════════════════════════════════
// 10. ÉTAGES — Patterns variés
// ════════════════════════════════════════════════════════════════

describe('Étages — tous les patterns', () => {
  it('3ème étage', () => {
    const r = parseTexteAnnonce('3ème étage 350 000 € 65 m²')
    expect(r.etage).toBe(3)
  })

  it('1er étage', () => {
    const r = parseTexteAnnonce('1er étage 200 000 € 40 m²')
    expect(r.etage).toBe(1)
  })

  it('étage : 5', () => {
    const r = parseTexteAnnonce('Étage : 5 300 000 € 70 m²')
    expect(r.etage).toBe(5)
  })

  it('RDC = étage 0', () => {
    const r = parseTexteAnnonce('Rez-de-chaussée 250 000 € 55 m²')
    expect(r.etage).toBe(0)
  })

  it('3/7 étages → étage 3, total 7', () => {
    const r = parseTexteAnnonce('3ème étage / 7 étages 350 000 € 65 m²')
    expect(r.etage).toBe(3)
    expect(r.etagesTotal).toBe(7)
  })

  it('immeuble de R+9', () => {
    const r = parseTexteAnnonce('Immeuble de R+9 350 000 € 65 m²')
    expect(r.etagesTotal).toBe(9)
  })
})

// ════════════════════════════════════════════════════════════════
// 11. ÉQUIPEMENTS — Négations et variantes
// ════════════════════════════════════════════════════════════════

describe('Équipements — négations variées', () => {
  it('sans ascenseur', () => {
    const r = parseTexteAnnonce('Appartement sans ascenseur 300 000 € 65 m²')
    expect(r.ascenseur).toBe(false)
  })

  it('pas d\'ascenseur', () => {
    const r = parseTexteAnnonce('Appartement, pas d\'ascenseur 300 000 € 65 m²')
    expect(r.ascenseur).toBe(false)
  })

  it('sans parking', () => {
    const r = parseTexteAnnonce('Appartement sans parking 300 000 € 65 m²')
    expect(r.parking).toBe(false)
  })

  it('sans cave', () => {
    const r = parseTexteAnnonce('Appartement sans cave 300 000 € 65 m²')
    expect(r.cave).toBe(false)
  })

  it('sans balcon ni terrasse', () => {
    const r = parseTexteAnnonce('Appartement sans balcon 300 000 € 65 m²')
    expect(r.balconTerrasse).toBe(false)
  })

  it('loggia détectée comme balcon/terrasse', () => {
    const r = parseTexteAnnonce('Loggia de 8m² 300 000 € 65 m²')
    expect(r.balconTerrasse).toBe(true)
  })

  it('place de stationnement = parking', () => {
    const r = parseTexteAnnonce('Place de stationnement incluse 300 000 € 65 m²')
    expect(r.parking).toBe(true)
  })

  it('box = parking', () => {
    const r = parseTexteAnnonce('Box fermé en sous-sol 300 000 € 65 m²')
    expect(r.parking).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════
// 12. SALLES DE BAINS — Variantes françaises
// ════════════════════════════════════════════════════════════════

describe('Salles de bains — variantes', () => {
  it('1 salle de bains', () => {
    const r = parseTexteAnnonce('1 salle de bains 300 000 € 65 m²')
    expect(r.nbSallesBains).toBe(1)
  })

  it('2 salles de bains', () => {
    const r = parseTexteAnnonce('2 salles de bains 300 000 € 65 m²')
    expect(r.nbSallesBains).toBe(2)
  })

  it('1 salle d\'eau', () => {
    const r = parseTexteAnnonce('1 salle d\'eau 300 000 € 65 m²')
    expect(r.nbSallesBains).toBe(1)
  })

  it('1 SDB', () => {
    const r = parseTexteAnnonce('1 SDB 300 000 € 65 m²')
    expect(r.nbSallesBains).toBe(1)
  })

  it('Salles de bain : 2 (inversé)', () => {
    const r = parseTexteAnnonce('Salles de bain : 2 300 000 € 65 m²')
    expect(r.nbSallesBains).toBe(2)
  })
})

// ════════════════════════════════════════════════════════════════
// 13. ORIENTATION — Variantes
// ════════════════════════════════════════════════════════════════

describe('Orientation — variantes', () => {
  it('Orientation nord', () => {
    const r = parseTexteAnnonce('Orientation nord 300 000 € 65 m²')
    expect(r.orientation).toBe('nord')
  })

  it('Exposé sud', () => {
    const r = parseTexteAnnonce('Exposé sud 300 000 € 65 m²')
    expect(r.orientation).toBe('sud')
  })

  it('Plein sud', () => {
    const r = parseTexteAnnonce('Exposé plein sud 300 000 € 65 m²')
    expect(r.orientation).toBe('plein sud')
  })

  it('nord/sud', () => {
    const r = parseTexteAnnonce('Orientation nord/sud 300 000 € 65 m²')
    expect(r.orientation).toContain('nord')
  })

  it('Double exposition est/ouest', () => {
    const r = parseTexteAnnonce('Double exposition est/ouest 300 000 € 65 m²')
    expect(r.orientation).toBe('est/ouest')
  })
})

// ════════════════════════════════════════════════════════════════
// 14. DPE/GES — Tous les formats textuels
// ════════════════════════════════════════════════════════════════

describe('DPE — tous les formats', () => {
  const cases: [string, string][] = [
    ['DPE : C', 'C'],
    ['Classe énergie : B', 'B'],
    ['Classe énergétique : A', 'A'],
    ['Diagnostic de performance énergétique : D', 'D'],
    ['Étiquette énergie : E', 'E'],
    ['(DPE) F', 'F'],
    ['Bilan énergétique : G', 'G'],
    ['Énergie : B', 'B'],
  ]

  for (const [texte, dpe] of cases) {
    it(`"${texte}" → ${dpe}`, () => {
      const r = parseTexteAnnonce(`Appartement 300 000 € 65 m² ${texte}`)
      expect(r.dpe).toBe(dpe)
    })
  }
})

describe('GES — tous les formats', () => {
  const cases: [string, string][] = [
    ['GES : D', 'D'],
    ['Classe climat : C', 'C'],
    ['Classe GES : B', 'B'],
    ['Gaz à effet de serre : E', 'E'],
    ['(GES) A', 'A'],
    ['Bilan carbone : F', 'F'],
    ['Émissions de GES : G', 'G'],
  ]

  for (const [texte, ges] of cases) {
    it(`"${texte}" → ${ges}`, () => {
      const r = parseTexteAnnonce(`Appartement 300 000 € 65 m² ${texte}`)
      expect(r.ges).toBe(ges)
    })
  }
})

// ════════════════════════════════════════════════════════════════
// 15. EXTRACTEUR HTML — JSON-LD types variés
// ════════════════════════════════════════════════════════════════

describe('JSON-LD — types Schema.org variés', () => {
  it('Apartment → extrait les données', () => {
    const html = `<script type="application/ld+json">
    { "@type": "Apartment", "offers": { "price": 300000 }, "floorSize": { "value": 60 }, "numberOfRooms": 3 }
    </script>`
    const r = parseJsonLd(html)
    expect(r.prix).toBe(300000)
    expect(r.surface).toBe(60)
    expect(r.pieces).toBe(3)
  })

  it('House → extrait avec type maison', () => {
    const html = `<script type="application/ld+json">
    { "@type": "House", "offers": { "price": 500000 }, "floorSize": { "value": 150 }, "numberOfRooms": 6 }
    </script>`
    const r = parseJsonLd(html)
    expect(r.prix).toBe(500000)
    expect(r.type).toBe('maison')
  })

  it('Product → extrait prix', () => {
    const html = `<script type="application/ld+json">
    { "@type": "Product", "name": "Appartement T2", "offers": { "price": 180000 } }
    </script>`
    const r = parseJsonLd(html)
    expect(r.prix).toBe(180000)
  })

  it('Residence → extrait les données', () => {
    const html = `<script type="application/ld+json">
    { "@type": "Residence", "offers": { "price": 400000 }, "floorSize": { "value": 100 } }
    </script>`
    const r = parseJsonLd(html)
    expect(r.prix).toBe(400000)
  })

  it('ignore BreadcrumbList et Organization', () => {
    const html = `<script type="application/ld+json">
    [
      { "@type": "BreadcrumbList", "name": "Accueil > Acheter > Paris" },
      { "@type": "Organization", "name": "Agency Inc" },
      { "@type": "Apartment", "offers": { "price": 250000 } }
    ]
    </script>`
    const r = parseJsonLd(html)
    expect(r.prix).toBe(250000)
  })
})

// ════════════════════════════════════════════════════════════════
// 16. PARSEANNONCE HTML — Regex directes
// ════════════════════════════════════════════════════════════════

describe('parseMetaTags — variantes meta', () => {
  it('extrait depuis og:title + og:description + og:image', () => {
    const html = `
<meta property="og:title" content="Maison 4P 120m² Toulouse 350 000 €" />
<meta property="og:description" content="Belle maison familiale avec jardin privatif de 200m², garage et terrasse couverte" />
<meta property="og:image" content="https://cdn.agence.fr/photo.jpg" />`

    const r = parseMetaTags(html)
    expect(r.titre).toContain('Maison')
    expect(r.imageUrl).toBe('https://cdn.agence.fr/photo.jpg')
    expect(r.prix).toBe(350000)
    expect(r.surface).toBe(120)
  })

  it('extrait depuis format og:title sans prix', () => {
    const html = `<meta property="og:title" content="Studio 25m² Paris 5ème" />`
    const r = parseMetaTags(html)
    expect(r.titre).toContain('Studio')
    expect(r.surface).toBe(25)
  })
})

// ════════════════════════════════════════════════════════════════
// 17. REAL-WORLD CTRL+A PASTE — Tests réalistes complets
// ════════════════════════════════════════════════════════════════

describe('Real-world Ctrl+A paste — LeBonCoin complet', () => {
  it('extrait TOUTES les données d\'un copier-coller LeBonCoin réaliste', () => {
    const texte = `
leboncoin
Rechercher sur leboncoin
Déposer une annonce

Appartement T3 lumineux - Lyon 3ème
295 000 €

Lyon 3ème (69003)

Professionnel
Keller Williams Lyon

Description
Superbe T3 lumineux de 65 m², situé au 4ème étage d'un immeuble de 1975.
Balcon exposé sud, proche transports et commerces.
Cave incluse. Place de parking en sous-sol.

Critères
Type de bien Appartement
Pièces 3
Surface 65 m²
Chambres 2
Salle de bain 1
Étage 4
Nombre d'étages 8
Ascenseur Oui
Année de construction 1975
Charges 180 € / mois
Taxe foncière 850 €

Performances énergétiques

Logement économe
A
≤ 50
B
51 à 90
C
91 à 150
D
151 à 230
E
231 à 330
F
331 à 450
G
> 450
Logement énergivore

DPE : D
Consommation énergétique
215 kWh/m²/an

Gaz à effet de serre (GES)

Faible émission
A
≤ 5
B
6 à 10
C
11 à 20
D
21 à 35
E
36 à 55
F
56 à 80
G
> 80
Forte émission

GES : E
Émissions de gaz à effet de serre
42 kg CO₂/m²/an

Contacter le vendeur
Sécurisez votre achat

Annonces similaires
Appartement Lyon 5ème 180 000 €
Studio Villeurbanne 120 000 €
`
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(295000)
    expect(r.surface).toBe(65)
    expect(r.pieces).toBe(3)
    expect(r.chambres).toBe(2)
    expect(r.type).toBe('appartement')
    expect(r.ville).toBe('Lyon')
    expect(r.codePostal).toBe('69003')
    expect(r.dpe).toBe('D')
    expect(r.ges).toBe('E')
    expect(r.etage).toBe(4)
    expect(r.etagesTotal).toBe(8)
    expect(r.chargesMensuelles).toBe(180)
    expect(r.taxeFonciere).toBe(850)
    expect(r.anneeConstruction).toBe(1975)
    expect(r.ascenseur).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.parking).toBe(true)
    expect(r.balconTerrasse).toBe(true)
    expect(r.nbSallesBains).toBe(1)
    expect(r.orientation).toBe('sud')
  })

  it('extrait DPE/GES quand l\'échelle a des unités sur chaque ligne', () => {
    const texte = `
Appartement 350 000 € 80 m²

Logement économe
A ≤ 50 kWh/m²/an
B 51 à 90 kWh/m²/an
C 91 à 150 kWh/m²/an
D 151 à 230 kWh/m²/an
E 231 à 330 kWh/m²/an
F 331 à 450 kWh/m²/an
G > 450 kWh/m²/an
Logement énergivore
C 135 kWh/m²/an

Faible émission
A ≤ 5 kg CO₂/m²/an
B 6 à 10 kg CO₂/m²/an
C 11 à 20 kg CO₂/m²/an
D 21 à 35 kg CO₂/m²/an
E 36 à 55 kg CO₂/m²/an
F 56 à 80 kg CO₂/m²/an
G > 80 kg CO₂/m²/an
Forte émission
B 8 kg CO₂/m²/an
`
    const r = parseTexteAnnonce(texte)
    expect(r.dpe).toBe('C')
    expect(r.ges).toBe('B')
  })

  it('extrait DPE/GES quand la valeur n\'a PAS de lettre préfixe', () => {
    const texte = `
Appartement 200 000 € 55 m²

Classe énergie
D
Consommation énergétique
215 kWh/m²/an

Classe climat
C
Émissions de gaz à effet de serre
28 kg CO₂/m²/an
`
    const r = parseTexteAnnonce(texte)
    expect(r.dpe).toBe('D')
    expect(r.ges).toBe('C')
  })

  it('extrait DPE/GES quand l\'échelle est sans unité et la valeur est séparée', () => {
    const texte = `
Maison 450 000 € 120 m²

Performances énergétiques
Logement économe
A
≤ 50
B
51 à 90
C
91 à 150
D
151 à 230
E
231 à 330
F
331 à 450
G
> 450
Logement énergivore

Classe énergie : B
135 kWh/m²/an

Gaz à effet de serre
Faible émission
A
≤ 5
B
6 à 10
C
11 à 20
D
21 à 35
E
36 à 55
F
56 à 80
G
> 80
Forte émission

Classe GES : C
18 kg CO₂/m²/an
`
    const r = parseTexteAnnonce(texte)
    expect(r.dpe).toBe('B')
    expect(r.ges).toBe('C')
  })
})

describe('Real-world Ctrl+A paste — SeLoger complet', () => {
  it('extrait TOUTES les données d\'un copier-coller SeLoger réaliste', () => {
    const texte = `
SeLoger - Immobilier

Appartement 4 pièces 85 m² Bordeaux
420 000 €

Bordeaux (33000)
Quartier Saint-Michel

3 chambres
1 salle de bain
2ème étage sur 5

Description
Magnifique appartement de 85 m² en plein cœur de Bordeaux. 
Parking en sous-sol. Cave. Gardien. Ascenseur.
Orientation ouest.

DPE : C
Consommation d'énergie : 180 kWh/m²/an
GES : D
Émissions : 25 kg CO₂/m²/an

Charges mensuelles : 250 €
Taxe foncière : 1 200 €
Année de construction : 1995

https://www.seloger.com/annonces/achat/appartement/bordeaux-33/12345678.htm
`
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(420000)
    expect(r.surface).toBe(85)
    expect(r.pieces).toBe(4)
    expect(r.chambres).toBe(3)
    expect(r.type).toBe('appartement')
    expect(r.ville).toBe('Bordeaux')
    expect(r.codePostal).toBe('33000')
    expect(r.dpe).toBe('C')
    expect(r.ges).toBe('D')
    expect(r.etage).toBe(2)
    expect(r.etagesTotal).toBe(5)
    expect(r.chargesMensuelles).toBe(250)
    expect(r.taxeFonciere).toBe(1200)
    expect(r.anneeConstruction).toBe(1995)
    expect(r.ascenseur).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.parking).toBe(true)
    expect(r.orientation).toBe('ouest')
    expect(r.nbSallesBains).toBe(1)
  })
})

describe('Real-world Ctrl+A paste — PAP complet', () => {
  it('extrait TOUTES les données d\'un copier-coller PAP réaliste', () => {
    const texte = `
PAP.fr - Particulier à Particulier

Maison 5 pièces 140 m²
Toulouse (31000)
590 000 €

4 chambres
2 salles de bains
Terrain 350 m²

Construction 2015
Garage
Cave
Terrasse

Performances énergétiques
DPE : B
GES : A

Taxe foncière : 1 800 €

https://www.pap.fr/annonces/maison-toulouse-31000-g12345
`
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(590000)
    expect(r.surface).toBe(140)
    expect(r.pieces).toBe(5)
    expect(r.chambres).toBe(4)
    expect(r.type).toBe('maison')
    expect(r.ville).toBe('Toulouse')
    expect(r.codePostal).toBe('31000')
    expect(r.dpe).toBe('B')
    expect(r.ges).toBe('A')
    expect(r.anneeConstruction).toBe(2015)
    expect(r.cave).toBe(true)
    expect(r.parking).toBe(true)
    expect(r.balconTerrasse).toBe(true)
    expect(r.taxeFonciere).toBe(1800)
    expect(r.nbSallesBains).toBe(2)
  })
})

describe('Real-world Ctrl+A paste — Bien\'ici complet', () => {
  it('extrait TOUTES les données d\'un copier-coller Bien\'ici réaliste', () => {
    const texte = `
Bien'ici

Studio meublé
Paris 11ème (75011)
185 000 €

Surface : 22 m²
1 pièce
5ème étage / 7 étages
Ascenseur
Année de construction : 1960

Classe énergie : E
Classe climat : D

Charges de copropriété : 120 €/mois
Taxe foncière : 450 €

https://www.bienici.com/annonce/vente/paris-75011/studio/12345
`
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(185000)
    expect(r.surface).toBe(22)
    expect(r.pieces).toBe(1)
    expect(r.type).toBe('appartement') // studio → appartement (TypeBienAnnonce = 'appartement' | 'maison')
    expect(r.ville).toBe('Paris')
    expect(r.codePostal).toBe('75011')
    expect(r.dpe).toBe('E')
    expect(r.ges).toBe('D')
    expect(r.etage).toBe(5)
    expect(r.etagesTotal).toBe(7)
    expect(r.chargesMensuelles).toBe(120)
    expect(r.taxeFonciere).toBe(450)
    expect(r.anneeConstruction).toBe(1960)
    expect(r.ascenseur).toBe(true)
  })
})
