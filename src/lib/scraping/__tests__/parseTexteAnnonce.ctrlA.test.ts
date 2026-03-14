/**
 * Tests Ctrl+A / copier-coller pour chaque site immobilier supporté.
 *
 * Simule le texte exact qu'un utilisateur obtient en faisant Ctrl+A sur
 * une page d'annonce, incluant : navigation, header, contenu, DPE échelle,
 * annonces similaires, footer, conseiller, etc.
 *
 * Le parseur doit isoler le contenu principal et extraire les bonnes données
 * sans être pollué par les sections parasites.
 */
import { describe, expect, it } from 'vitest'
import { compterChampsExtraits, parseTexteAnnonce } from '../parseTexteAnnonce'

// ── Helper : vérifie les champs critiques ──
function expectMinFields(
  result: ReturnType<typeof parseTexteAnnonce>,
  expected: {
    prix?: number
    surface?: number
    pieces?: number
    type?: string
    ville?: string
    codePostal?: string
    dpe?: string
  },
  minFields = 5
) {
  const count = compterChampsExtraits(result)
  expect(count).toBeGreaterThanOrEqual(minFields)
  if (expected.prix) expect(result.prix).toBe(expected.prix)
  if (expected.surface) expect(result.surface).toBe(expected.surface)
  if (expected.pieces) expect(result.pieces).toBe(expected.pieces)
  if (expected.type) expect(result.type).toBe(expected.type)
  if (expected.ville) expect(result.ville).toBe(expected.ville)
  if (expected.codePostal) expect(result.codePostal).toBe(expected.codePostal)
  if (expected.dpe) expect(result.dpe).toBe(expected.dpe)
}

// ════════════════════════════════════════════
// TIER 1 : Sites N1 API (SeLoger, Bienici, Laforêt)
// ════════════════════════════════════════════
describe('Ctrl+A — SeLoger', () => {
  const texteSeLoger = `
Acheter Louer Estimer Déposer une annonce
Prix de l'immobilier Actualités Conseils

![Logo agence](https://img.seloger.com/agence.jpg)

## Appartement 3 pièces 65 m² Paris 11ème

450 000 €

6 923 €/m²

Surface habitable : 65 m²
Nombre de pièces : 3
Nombre de chambres : 2

Ce bel appartement lumineux situé dans le 11ème arrondissement de Paris offre
3 pièces dont 2 chambres, une cuisine équipée et un séjour de 25 m². Situé au
4ème étage avec ascenseur, il dispose d'un balcon plein sud et d'une cave.
Faibles charges de copropriété (150 €/mois). Taxe foncière : 950 €.
Année de construction : 1985. Proche métro Voltaire.

### Diagnostic de performance énergétique

Consommation énergétique
A ≤ 70
B 71 à 110
C 111 à 180
D 181 à 250
E 251 à 330
F 331 à 420
G > 420
Consommation d'énergie (DPE) : 165 kWh/m²/an C

Émissions de gaz à effet de serre
A ≤ 6
B 7 à 11
C 12 à 30
D 31 à 50
E 51 à 70
F 71 à 100
G > 100
Émissions de GES : 28 kg CO₂/m²/an C

Caractéristiques
Ascenseur : Oui
Balcon : Oui
Cave : Oui
Parking : Non
Type de chauffage : Individuel gaz
Étage : 4 / 6

Contacter l'agence

## Détails du prix
Prix au m² dans le quartier : 9 500 €

Annonces similaires
Appartement 2 pièces 45 m² Paris 11ème — 320 000 €
Appartement 4 pièces 85 m² Paris 11ème — 650 000 €
Studio 25 m² Paris 11ème — 220 000 €

Mentions légales | Plan du site | CGU
© SeLoger 2026

https://www.seloger.com/annonces/achat/appartement/paris-11eme-75/263335331.htm
`

  it('extrait prix, surface, pièces, DPE correct malgré échelle', () => {
    const r = parseTexteAnnonce(texteSeLoger)
    expectMinFields(r, {
      prix: 450000,
      surface: 65,
      pieces: 3,
      type: 'appartement',
      ville: 'Paris',
      dpe: 'C',
    }, 8)
    expect(r.chambres).toBe(2)
    expect(r.etage).toBe(4)
    expect(r.ascenseur).toBe(true)
    expect(r.balconTerrasse).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.chargesMensuelles).toBe(150)
    expect(r.taxeFonciere).toBe(950)
    expect(r.anneeConstruction).toBe(1985)
    expect(r.ges).toBe('C')
  })

  it('ne capture PAS le prix des annonces similaires', () => {
    const r = parseTexteAnnonce(texteSeLoger)
    expect(r.prix).toBe(450000)
    // Pas 320 000 € ou 650 000 € des annonces similaires
  })

  it('ne capture PAS le prix au m² estimé', () => {
    const r = parseTexteAnnonce(texteSeLoger)
    // Le prix/m² "9 500 €" ne doit pas être interprété comme un prix
    expect(r.prix).toBe(450000)
  })
})

describe('Ctrl+A — Bienici', () => {
  const texteBienici = `
Bien'ici
Acheter Louer Neuf Estimer

Appartement 4 pièces à Paris 14ème

790 000 €

Surface : 78 m²
4 pièces dont 3 chambres
1 salle de bains

Description
Magnifique appartement familial de 78 m² entièrement rénové, situé au 2ème étage
d'un bel immeuble haussmannien avec ascenseur. Il comprend une entrée, un double séjour
lumineux, 3 chambres, une cuisine aménagée et une salle de bains. Cave en sous-sol.
Exposition est/ouest. Construction 1890. Parking en option à 30 000 €.

Charges mensuelles : 280 €/mois
Taxe foncière : 1 200 €/an

Performance énergétique
A B C D E F G
≤50 51-90 91-150 151-230 231-330 331-450 >450
Classe énergie : 195 kWh/m².an D

Émissions de gaz
A B C D E F G
≤5 6-10 11-20 21-35 36-55 56-80 >80
Classe climat : 35 kg CO₂/m².an D

75014 Paris

Biens similaires à Paris 14ème
T3 65 m² — 620 000 €
T2 42 m² — 380 000 €

À propos de Bien'ici | Mentions légales

https://www.bienici.com/annonce/vente/paris-14e/appartement/4pieces/ag753736-516389519
`

  it('extrait les données malgré le DPE avec échelle A-G', () => {
    const r = parseTexteAnnonce(texteBienici)
    expectMinFields(r, {
      prix: 790000,
      surface: 78,
      pieces: 4,
      type: 'appartement',
      ville: 'Paris',
      codePostal: '75014',
      dpe: 'D',
    }, 8)
    expect(r.chambres).toBe(3)
    expect(r.nbSallesBains).toBe(1)
    expect(r.etage).toBe(2)
    expect(r.ascenseur).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.chargesMensuelles).toBe(280)
    expect(r.taxeFonciere).toBe(1200)
    expect(r.anneeConstruction).toBe(1890)
    expect(r.ges).toBe('D')
    expect(r.orientation).toMatch(/est|ouest/i)
  })
})

describe('Ctrl+A — Laforêt', () => {
  const texteLaforet = `
LaForêt Immobilier
Acheter Louer Estimer Nos agences

Appartement T3 à Erstein (67150)

232 500 €

Surface habitable : 75 m²
3 pièces — 2 chambres
1 salle de bains

Situé au 1er étage d'une résidence calme, cet appartement T3 offre un séjour
lumineux de 28 m², 2 chambres spacieuses, une cuisine équipée, une salle de bains
et un WC séparé. Balcon avec vue dégagée. Cave et place de parking privative.
Charges : 120 €/mois. Chauffage collectif gaz.

DPE : D
GES : C
Année de construction : 2005

Caractéristiques
Ascenseur : Non
Balcon : Oui
Cave : Oui
Parking : Oui

Votre conseiller
Dominique Berger — LaForêt Erstein
03 88 XX XX XX
Adresse : 15 rue du Marché, 67150 Erstein

Estimez votre bien
Annonces similaires dans le secteur
T2 50 m² Erstein — 150 000 €
T4 90 m² Erstein — 280 000 €

Mentions légales | CGU
`

  it('extrait correctement et ne prend PAS l\'adresse du conseiller comme ville', () => {
    const r = parseTexteAnnonce(texteLaforet)
    expectMinFields(r, {
      prix: 232500,
      surface: 75,
      pieces: 3,
      type: 'appartement',
      dpe: 'D',
    }, 8)
    expect(r.chambres).toBe(2)
    expect(r.etage).toBe(1)
    expect(r.balconTerrasse).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.parking).toBe(true)
    expect(r.ascenseur).toBe(false)
    expect(r.chargesMensuelles).toBe(120)
    expect(r.anneeConstruction).toBe(2005)
    expect(r.ges).toBe('C')
  })

  it('pas pollué par les annonces similaires', () => {
    const r = parseTexteAnnonce(texteLaforet)
    expect(r.prix).toBe(232500)
    expect(r.surface).toBe(75)
  })
})

// ════════════════════════════════════════════
// TIER 2 : Sites Proxy/Jina (Orpi, PAP, LeBonCoin)
// ════════════════════════════════════════════
describe('Ctrl+A — Orpi', () => {
  const texteOrpi = `
ORPI | Immobilier

Vente appartement 4 pièces Dorlisheim (67120)

289 900 €

Surface : 83 m²
4 pièces — 3 chambres

Bel appartement T4 de 83 m² en rez-de-chaussée surélevé dans une petite
copropriété bien entretenue. Séjour double de 32 m², cuisine séparée aménagée,
3 chambres dont une avec placard, salle de bains avec baignoire, WC séparé.
Terrasse de 15 m² exposée sud-ouest. Garage et cave. Copropriété de 8 lots.
Pas de charges courantes. Construction 2010.

DPE : C   GES : B

Précisions
Charges annuelles : 480 €
Taxe foncière : 780 €

Caractéristiques
Cave : Oui
Terrasse : Oui
Garage : Oui
Ascenseur : Non

L'agence Orpi Dorlisheim
Ref. mandat : 123456
03 88 XX XX XX

Découvrir nos autres biens
Appartement T3 Molsheim — 215 000 €
Maison 5 pièces Rosheim — 395 000 €

Conditions générales d'utilisation
`

  it('extrait les données avec charges annuelles converties', () => {
    const r = parseTexteAnnonce(texteOrpi)
    expectMinFields(r, {
      prix: 289900,
      surface: 83,
      pieces: 4,
      type: 'appartement',
      dpe: 'C',
    }, 7)
    expect(r.chambres).toBe(3)
    expect(r.cave).toBe(true)
    expect(r.balconTerrasse).toBe(true) // terrasse
    expect(r.parking).toBe(true) // garage
    expect(r.ascenseur).toBe(false)
    expect(r.anneeConstruction).toBe(2010)
    expect(r.ges).toBe('B')
    expect(r.taxeFonciere).toBe(780)
    expect(r.orientation).toMatch(/sud|ouest/i)
  })
})

describe('Ctrl+A — PAP', () => {
  const textePAP = `
PAP.fr — Particulier à Particulier
Vendre Acheter Louer Vacances

Vente appartement 3 pièces Paris 11ème (75011)

385 000 €
5 500 €/m²

Appartement 70 m² — 3 pièces — 2 chambres
Étage : 3/5 avec ascenseur

Au coeur du 11ème, proche marché Popincourt, bel appartement traversant de 70 m².
Entrée avec placards, séjour de 22 m², cuisine ouverte et aménagée, 2 chambres
de 12 et 14 m², salle d'eau avec douche italienne, WC séparé.
Parquet ancien, double vitrage, digicode.
Charges de copro : 200 €/mois (eau froide et chauffage inclus).
Construction fin XIXème.

Diagnostic de performance énergétique
Consommation : 210 kWh/m²/an
Classification : E

GES : 42 kg/m²/an
Classification : D

Ce bien vous intéresse ?

Annonces proches
Studio Paris 11ème — 195 000 €
T4 Paris 11ème — 520 000 €

À propos de PAP | CGU | Mentions légales
`

  it('extrait prix, surface, DPE E et GES D', () => {
    const r = parseTexteAnnonce(textePAP)
    expectMinFields(r, {
      prix: 385000,
      surface: 70,
      pieces: 3,
      type: 'appartement',
      codePostal: '75011',
      dpe: 'E',
    }, 7)
    expect(r.chambres).toBe(2)
    expect(r.etage).toBe(3)
    expect(r.ascenseur).toBe(true)
    expect(r.chargesMensuelles).toBe(200)
    expect(r.nbSallesBains).toBe(1) // salle d'eau
    expect(r.ges).toBe('D')
  })
})

describe('Ctrl+A — LeBonCoin', () => {
  const texteLBC = `
leboncoin
Déposer une annonce
Rechercher

Ventes immobilières

Appartement T2 lumineux — Paris 15ème

230 000 €

Critères
Type de bien : Appartement
Pièces : 2
Surface : 38 m²
Meublé : Non
Classe énergie : D
GES : E

Description

Beau T2 de 38 m² au 5ème étage sans ascenseur d'un immeuble des années 60.
Séjour de 15 m², chambre de 12 m², cuisine séparée de 6 m², salle d'eau avec WC.
Cave incluse. Pas de parking.
Quartier calme proche commerces et métro Lourmel.
Taxe foncière : 600 €

Sécurisez votre achat

Caractéristiques détaillées
Classe énergie : D (250 kWh/m²/an)
GES : E (55 kg CO₂/m²/an)
Étage : 5
Charges : 90 €/mois

Localisation
75015 Paris 15ème

Contacter le vendeur

Signaler l'annonce

Annonces similaires
T3 Paris 15ème 315 000 €
Studio Paris 15ème 180 000 €

Mentions légales | Politique de confidentialité

https://www.leboncoin.fr/ad/ventes_immobilieres/2939285498
`

  it('extrait les données correctement (DPE D, pas la grille)', () => {
    const r = parseTexteAnnonce(texteLBC)
    expectMinFields(r, {
      prix: 230000,
      surface: 38,
      pieces: 2,
      type: 'appartement',
      ville: 'Paris',
      codePostal: '75015',
      dpe: 'D',
    }, 8)
    expect(r.chambres).toBe(1)
    expect(r.etage).toBe(5)
    expect(r.ascenseur).toBe(false)
    expect(r.cave).toBe(true)
    expect(r.chargesMensuelles).toBe(90)
    expect(r.taxeFonciere).toBe(600)
    expect(r.ges).toBe('E')
  })

  it('le URL LeBonCoin est extrait', () => {
    const r = parseTexteAnnonce(texteLBC)
    expect(r.url).toMatch(/leboncoin\.fr/)
  })
})

// ════════════════════════════════════════════
// TIER 3 : Portails & Agrégateurs
// ════════════════════════════════════════════
describe('Ctrl+A — SuperImmo', () => {
  const texteSuperImmo = `
SuperImmo.com — Annonces immobilières

Vente appartement 2 pièces Paris 10ème (75010)

295 000 €

Appartement 2 pièces 35 m²
1 chambre

Dans une rue calme du 10ème arrondissement, charmant 2 pièces de 35 m² au
3ème étage d'un immeuble ancien. Séjour avec parquet, chambre sur cour,
cuisine aménagée, salle d'eau. DPE : E. GES : D.
Charges : 100 €/mois.
Construction 1920.

Contacter l'annonceur

Biens similaires
T3 Paris 10ème — 420 000 €
Studio Paris 10ème — 195 000 €

Conditions générales | Mentions légales
https://www.superimmo.com/annonces/vente-appartement-2-pieces-paris-10e-75010-80043403
`

  it('extrait les données d\'un T2 parisien', () => {
    const r = parseTexteAnnonce(texteSuperImmo)
    expectMinFields(r, {
      prix: 295000,
      surface: 35,
      pieces: 2,
      type: 'appartement',
      codePostal: '75010',
      dpe: 'E',
    }, 6)
    expect(r.chambres).toBe(1)
    expect(r.etage).toBe(3)
    expect(r.chargesMensuelles).toBe(100)
    expect(r.anneeConstruction).toBe(1920)
    expect(r.ges).toBe('D')
  })
})

describe('Ctrl+A — FigaroImmo', () => {
  const texteFigaro = `
Le Figaro Immobilier
Acheter Louer Neuf Annuaire agences

Appartement 3 pièces à Paris 17ème (75017)

549 000 €

Surface : 62 m²
3 pièces — 2 chambres
Étage 5/7

Superbe appartement haussmannien de 62 m² situé au 5ème étage avec ascenseur.
Double séjour traversant, 2 chambres, cuisine fermée, salle de bains, WC.
Parquet chevron, moulures, cheminée décorative. Cave. Exposition sud.
Charges : 250 €/mois. Taxe foncière : 850 €.
Construction 1900.

DPE : D (220 kWh/m²/an)
GES : D (38 kg CO₂/m²/an)

Caractéristiques
Ascenseur : Oui
Cave : Oui
Parking : Non
Balcon : Non

Annoncé par Agence Batignolles Immobilier
Téléphone : 01 42 XX XX XX

Estimer ce bien — Prix au m² Paris 17ème

Annonces similaires
T2 Paris 17ème — 395 000 €

Mentions légales
https://immobilier.lefigaro.fr/annonces/immobilier-vente-appartement-paris+17eme+arrondissement-75.html_100049669
`

  it('extrait prix et données structurées', () => {
    const r = parseTexteAnnonce(texteFigaro)
    expectMinFields(r, {
      prix: 549000,
      surface: 62,
      pieces: 3,
      type: 'appartement',
      codePostal: '75017',
      dpe: 'D',
    }, 8)
    expect(r.chambres).toBe(2)
    expect(r.etage).toBe(5)
    expect(r.ascenseur).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.parking).toBe(false)
    expect(r.chargesMensuelles).toBe(250)
    expect(r.taxeFonciere).toBe(850)
    expect(r.anneeConstruction).toBe(1900)
    expect(r.ges).toBe('D')
    expect(r.orientation).toMatch(/sud/i)
  })
})

describe('Ctrl+A — OuestFrance Immo', () => {
  const texteOF = `
Ouestfrance-immo.com
Acheter Louer Neuf Terrain

Appartement 3 pièces Rennes (35000)

245 000 €

Surface : 68 m²
3 pièces — 2 chambres
1 salle de bains
2ème étage

Agréable T3 de 68 m² au 2ème étage d'une résidence de 2012 avec ascenseur.
Séjour avec balcon, cuisine ouverte, 2 chambres, SDB, WC séparé.
Cave et parking souterrain inclus. Exposition ouest.

DPE : C (145 kWh/m²/an)
GES : B (18 kg CO₂/m²/an)

Charges : 160 €/mois. Taxe foncière : 720 €.

35000 Rennes

D'autres biens similaires
T2 Rennes — 180 000 €
T4 Rennes — 310 000 €

Mentions légales | Plan du site
`

  it('extrait le T3 rennais complet', () => {
    const r = parseTexteAnnonce(texteOF)
    expectMinFields(r, {
      prix: 245000,
      surface: 68,
      pieces: 3,
      type: 'appartement',
      ville: 'Rennes',
      codePostal: '35000',
      dpe: 'C',
    }, 8)
    expect(r.chambres).toBe(2)
    expect(r.etage).toBe(2)
    expect(r.ascenseur).toBe(true)
    expect(r.balconTerrasse).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.parking).toBe(true)
    expect(r.chargesMensuelles).toBe(160)
    expect(r.taxeFonciere).toBe(720)
    expect(r.anneeConstruction).toBe(2012)
    expect(r.ges).toBe('B')
    expect(r.orientation).toMatch(/ouest/i)
  })
})

describe('Ctrl+A — ParuVendu', () => {
  const texteParuVendu = `
ParuVendu.fr | Immobilier

Appartement 4 pièces Paris 12ème (75012)

489 000 €

Surface : 80 m²
4 pièces — 3 chambres

Grand T4 familial de 80 m² au 6ème et dernier étage. Lumineux et traversant.
Séjour de 25 m², cuisine séparée, 3 chambres, salle de bains, WC.
Terrasse de 8 m². Cave. Pas de parking ni d'ascenseur.
Charges : 180 €/mois. Chauffage collectif.
Construction 1970.

DPE : E (270 kWh/m²/an)
GES : D (42 kg CO₂/m²/an)

75012 Paris 12ème

Nos suggestions
T3 Paris 12ème — 370 000 €

Conditions générales d'utilisation | Politique de confidentialité
`

  it('extrait le T4 du 12ème', () => {
    const r = parseTexteAnnonce(texteParuVendu)
    expectMinFields(r, {
      prix: 489000,
      surface: 80,
      pieces: 4,
      type: 'appartement',
      codePostal: '75012',
      dpe: 'E',
    }, 7)
    expect(r.chambres).toBe(3)
    expect(r.etage).toBe(6)
    expect(r.balconTerrasse).toBe(true) // terrasse
    expect(r.cave).toBe(true)
    expect(r.ascenseur).toBe(false)
    expect(r.chargesMensuelles).toBe(180)
    expect(r.anneeConstruction).toBe(1970)
    expect(r.ges).toBe('D')
  })
})

describe('Ctrl+A — Century21', () => {
  const texteCentury21 = `
CENTURY 21
Acheter Louer Estimer Agences

Appartement F3 — Strasbourg (67000)

195 000 €

Surface : 55 m²
3 pièces — 2 chambres
Étage : 2 / 4

Appartement F3 de 55 m² situé au 2ème étage sur 4 dans un immeuble des années 80
avec ascenseur. Comprenant : entrée avec placard, séjour, 2 chambres, cuisine
aménagée, salle de bains avec WC. Cave. Pas de balcon ni de place de parking.
DPE : D. GES : D. Taxe foncière : 520 €.
Charges prévisionnelles annuelles : 960 €.

Caractéristiques
Construction : 1982
Chauffage : Collectif gaz

L'agence Century 21 Strasbourg Centre
Ref agence : STR-67-1234
03 88 XX XX XX

Voir d'autres biens
T2 Strasbourg — 140 000 €

Politique de confidentialité
`

  it('extrait F3 Strasbourg avec charges annuelles converties', () => {
    const r = parseTexteAnnonce(texteCentury21)
    expectMinFields(r, {
      prix: 195000,
      surface: 55,
      pieces: 3,
      type: 'appartement',
      ville: 'Strasbourg',
      codePostal: '67000',
      dpe: 'D',
    }, 8)
    expect(r.chambres).toBe(2)
    expect(r.etage).toBe(2)
    expect(r.ascenseur).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.taxeFonciere).toBe(520)
    expect(r.anneeConstruction).toBe(1982)
    expect(r.ges).toBe('D')
  })
})

// ════════════════════════════════════════════
// TIER 4 : Réseaux d'agences
// ════════════════════════════════════════════
describe('Ctrl+A — IAD France', () => {
  const texteIAD = `
iad France — Réseau immobilier

Maison 5 pièces Saint-Étienne-du-Rouvray (76800)

285 000 €

Surface : 110 m²
5 pièces — 4 chambres
Terrain : 350 m²

Belle maison individuelle de 110 m² sur terrain de 350 m². RDC : entrée, séjour
de 30 m², cuisine aménagée, WC. Étage : 4 chambres, salle de bains, salle d'eau.
Garage. Terrasse et jardin. DPE : D (215 kWh/m²/an). GES : C.
Construction 1975. Exposition sud-ouest.

76800 Saint-Étienne-du-Rouvray

Votre consultant iad
Marie Dupont — 06 XX XX XX XX

Biens similaires
Maison 4 pièces — 250 000 €
`

  it('extrait maison individuelle avec terrain', () => {
    const r = parseTexteAnnonce(texteIAD)
    expectMinFields(r, {
      prix: 285000,
      surface: 110,
      pieces: 5,
      type: 'maison',
      dpe: 'D',
    }, 7)
    expect(r.chambres).toBe(4)
    expect(r.parking).toBe(true) // garage
    expect(r.balconTerrasse).toBe(true) // terrasse
    expect(r.nbSallesBains).toBe(2) // salle de bains + salle d'eau
    expect(r.anneeConstruction).toBe(1975)
    expect(r.ges).toBe('C')
    expect(r.orientation).toMatch(/sud|ouest/i)
  })
})

describe('Ctrl+A — Guy Hoquet', () => {
  const texteGuyHoquet = `
Guy Hoquet l'Immobilier
Acheter Louer Investir Estimer

Vente Appartement T3 — Paris 10ème (75010)

435 000 €

Surface habitable : 58 m²
3 pièces — 2 chambres

Au cœur du 10ème arrondissement, joli T3 de 58 m² au 4ème étage avec ascenseur.
Séjour lumineux, 2 chambres, cuisine équipée, salle de bains. Balcon filant.
DPE : D. GES : D.
Charges : 190 €/mois. Taxe foncière : 700 €.
Immeuble haussmannien XIXème siècle. Cave en sous-sol.

Votre agent Guy Hoquet
Jean Martin — 01 42 XX XX XX

Demander un rendez-vous

Autres biens dans le quartier
T2 Paris 10ème — 310 000 €

Plan du site | Mentions légales
`

  it('extrait le T3 du 10ème sans pollution agent', () => {
    const r = parseTexteAnnonce(texteGuyHoquet)
    expectMinFields(r, {
      prix: 435000,
      surface: 58,
      pieces: 3,
      type: 'appartement',
      codePostal: '75010',
      dpe: 'D',
    }, 7)
    expect(r.chambres).toBe(2)
    expect(r.etage).toBe(4)
    expect(r.ascenseur).toBe(true)
    expect(r.balconTerrasse).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.chargesMensuelles).toBe(190)
    expect(r.taxeFonciere).toBe(700)
    expect(r.ges).toBe('D')
  })
})

describe('Ctrl+A — Nexity', () => {
  const texteNexity = `
Nexity — Immobilier neuf et ancien

Appartement 3 pièces Paris 11ème

375 000 €

Surface : 55 m²
3 pièces — 2 chambres
Étage : 3

Appartement neuf de 55 m² au 3ème étage d'une résidence livrée en 2024.
Séjour avec cuisine ouverte, 2 chambres, salle de bains, WC. Balcon de 6 m².
Place de parking en sous-sol et cave. PTZ éligible. Ascenseur.
Charges prévisionnelles : 130 €/mois.

DPE : B (95 kWh/m²/an)
GES : A (5 kg CO₂/m²/an)

75011 Paris 11ème

Contacter Nexity

Nos autres programmes
T4 Paris 11ème — 550 000 €

Mentions légales | CGU
`

  it('extrait appartement neuf avec DPE B', () => {
    const r = parseTexteAnnonce(texteNexity)
    expectMinFields(r, {
      prix: 375000,
      surface: 55,
      pieces: 3,
      type: 'appartement',
      codePostal: '75011',
      dpe: 'B',
    }, 8)
    expect(r.chambres).toBe(2)
    expect(r.etage).toBe(3)
    expect(r.ascenseur).toBe(true)
    expect(r.balconTerrasse).toBe(true)
    expect(r.parking).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.chargesMensuelles).toBe(130)
    expect(r.ges).toBe('A')
    expect(r.anneeConstruction).toBe(2024)
  })
})

describe('Ctrl+A — Capifrance', () => {
  const texteCapifrance = `
Capifrance — Réseau immobilier

Vente appartement 3 pièces — Paris 11ème

420 000 €

Surface : 60 m²
3 pièces — 2 chambres
1 salle de bains
Étage : 2 / 5

Bel appartement de 60 m² dans immeuble de caractère. Séjour de 20 m²,
cuisine aménagée, 2 chambres, salle de bains, WC.
Cave en sous-sol. Pas de parking. Ascenseur.
Charges : 170 €/mois. Construction 1965.

DPE : D (195 kWh/m²/an)
GES : D (35 kg CO₂/m²/an)

75011 Paris

Votre agent Capifrance
Pierre Lemaire — 06 XX XX XX XX

Estimez votre bien immobilier

Annonces proches
T4 Paris 11ème — 580 000 €

Politique de confidentialité
`

  it('extrait le T3 avec DPE D', () => {
    const r = parseTexteAnnonce(texteCapifrance)
    expectMinFields(r, {
      prix: 420000,
      surface: 60,
      pieces: 3,
      type: 'appartement',
      codePostal: '75011',
      dpe: 'D',
    }, 7)
    expect(r.chambres).toBe(2)
    expect(r.etage).toBe(2)
    expect(r.cave).toBe(true)
    expect(r.ascenseur).toBe(true)
    expect(r.chargesMensuelles).toBe(170)
    expect(r.anneeConstruction).toBe(1965)
    expect(r.ges).toBe('D')
  })
})

describe('Ctrl+A — Safti', () => {
  const texteSafti = `
SAFTI Immobilier

Maison 5 pièces Saint-Martin-de-Fontenay (14320)

249 000 €

Surface : 95 m²
5 pièces — 3 chambres
Terrain : 450 m²

Maison de ville de 95 m² sur 450 m² de terrain. RDC : salon-séjour de 35 m²,
cuisine aménagée, WC. Étage : 3 chambres, salle de bains, bureau. Garage double.
Jardin arboré avec terrasse. Pas d'ascenseur (maison). DPE : E. GES : D.
Taxe foncière : 900 €. Construction 1968.

Votre conseillère Safti
Isabelle Bernard — 06 XX XX XX XX

Biens similaires dans le secteur
Maison 4p — 210 000 €

Mentions légales
`

  it('extrait maison Safti avec terrain', () => {
    const r = parseTexteAnnonce(texteSafti)
    expectMinFields(r, {
      prix: 249000,
      surface: 95,
      pieces: 5,
      type: 'maison',
      dpe: 'E',
    }, 7)
    expect(r.chambres).toBe(3)
    expect(r.parking).toBe(true) // garage
    expect(r.balconTerrasse).toBe(true) // terrasse
    expect(r.taxeFonciere).toBe(900)
    expect(r.anneeConstruction).toBe(1968)
    expect(r.ges).toBe('D')
  })
})

describe('Ctrl+A — Stéphane Plaza', () => {
  const textePlaza = `
Stéphane Plaza Immobilier

Appartement 2 pièces Paris 9ème (75009)

320 000 €

Surface habitable : 42 m²
2 pièces — 1 chambre
Étage 4/6 avec ascenseur

Coquet T2 de 42 m² au 4ème étage. Séjour lumineux, chambre séparée, cuisine
ouverte aménagée, salle d'eau. Pas de cave ni de parking.
DPE : D (230 kWh/m²/an). GES : D.
Charges : 120 €/mois. Construction début XXème.

Votre agent Stéphane Plaza Paris 9
Sophie Leroy — 01 48 XX XX XX

Prendre rendez-vous

D'autres biens dans ce quartier
Studio Paris 9ème — 220 000 €

Plan du site | Mentions légales
`

  it('extrait le T2 du 9ème', () => {
    const r = parseTexteAnnonce(textePlaza)
    expectMinFields(r, {
      prix: 320000,
      surface: 42,
      pieces: 2,
      type: 'appartement',
      codePostal: '75009',
      dpe: 'D',
    }, 6)
    expect(r.chambres).toBe(1)
    expect(r.etage).toBe(4)
    expect(r.ascenseur).toBe(true)
    expect(r.chargesMensuelles).toBe(120)
    expect(r.ges).toBe('D')
  })
})

// ════════════════════════════════════════════
// TIER 5 : Autres sites
// ════════════════════════════════════════════
describe('Ctrl+A — LogicImmo', () => {
  const texteLogicImmo = `
Logic-Immo
Acheter Louer Neuf Estimation

Appartement 3 pièces Lyon 6ème (69006)

355 000 €

Surface : 72 m²
3 pièces — 2 chambres
1 salle de bains
3ème étage

Bel appartement T3 de 72 m² dans le quartier des Brotteaux. Séjour de 26 m²
avec parquet, 2 chambres, cuisine équipée, SDB. Balcon et cave.
Ascenseur. Charges : 200 €/mois. Construction 1930.

DPE : D — GES : C

69006 Lyon 6ème

Voir d'autres annonces
T2 Lyon 6ème — 260 000 €

Mentions légales
`

  it('extrait le T3 lyonnais', () => {
    const r = parseTexteAnnonce(texteLogicImmo)
    expectMinFields(r, {
      prix: 355000,
      surface: 72,
      pieces: 3,
      type: 'appartement',
      ville: 'Lyon',
      codePostal: '69006',
      dpe: 'D',
    }, 8)
    expect(r.chambres).toBe(2)
    expect(r.etage).toBe(3)
    expect(r.ascenseur).toBe(true)
    expect(r.balconTerrasse).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.chargesMensuelles).toBe(200)
    expect(r.anneeConstruction).toBe(1930)
    expect(r.ges).toBe('C')
  })
})

describe('Ctrl+A — Foncia', () => {
  const texteFoncia = `
Foncia — Transaction immobilière

Appartement 3 pièces Marseille 8ème (13008)

310 000 €

Surface : 65 m²
3 pièces — 2 chambres
Étage 4/5

Appartement traversant de 65 m² avec vue mer. Grand séjour de 24 m²,
2 chambres, cuisine séparée, salle de bains. Terrasse de 10 m².
Garage en sous-sol. Cave. Ascenseur.
Charges : 220 €/mois. Taxe foncière : 650 €.

DPE : C (155 kWh/m²/an)
GES : B (15 kg CO₂/m²/an)

Construction : 2008. Exposition sud.

13008 Marseille

Agence Foncia Marseille Castellane
Téléphone : 04 91 XX XX XX

Autres biens Foncia
T2 Marseille — 195 000 €

Mentions légales
`

  it('extrait le T3 marseillais vue mer', () => {
    const r = parseTexteAnnonce(texteFoncia)
    expectMinFields(r, {
      prix: 310000,
      surface: 65,
      pieces: 3,
      type: 'appartement',
      ville: 'Marseille',
      codePostal: '13008',
      dpe: 'C',
    }, 8)
    expect(r.chambres).toBe(2)
    expect(r.etage).toBe(4)
    expect(r.ascenseur).toBe(true)
    expect(r.balconTerrasse).toBe(true) // terrasse
    expect(r.parking).toBe(true) // garage
    expect(r.cave).toBe(true)
    expect(r.chargesMensuelles).toBe(220)
    expect(r.taxeFonciere).toBe(650)
    expect(r.anneeConstruction).toBe(2008)
    expect(r.ges).toBe('B')
    expect(r.orientation).toMatch(/sud/i)
  })
})

// ════════════════════════════════════════════
// CAS LIMITES — Pollution / bruit
// ════════════════════════════════════════════
describe('Ctrl+A — Résistance au bruit', () => {
  it('ne prend PAS le prix des annonces similaires (haut de page = principal)', () => {
    const texte = `
Appartement 2 pièces Paris 18ème
Prix : 280 000 €
Surface : 40 m²

Description longue du bien avec plein de détails sur la localisation,
les transports en commun à proximité, les commerces du quartier, etc.
Le bien est un T2 lumineux refait à neuf.

Annonces similaires
T3 Paris 18ème — 420 000 €
T1 Paris 18ème — 180 000 €
Maison Aulnay — 350 000 €
`
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(280000)
    expect(r.surface).toBe(40)
  })

  it('gère une page avec DPE échelle complète A-G sans erreur', () => {
    const texte = `
Appartement T3 Bordeaux — 350 000 €
65 m² — 3 pièces

Diagnostic de performance énergétique
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
Consommation d'énergie : 175 kWh/m²/an
Classe énergie : D

Émissions de gaz à effet de serre
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
Émissions CO₂ : 28 kg/m²/an
Classe GES : C

33000 Bordeaux
`
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(350000)
    expect(r.surface).toBe(65)
    expect(r.dpe).toBe('D')
    expect(r.ges).toBe('C')
    expect(r.ville).toBe('Bordeaux')
    expect(r.codePostal).toBe('33000')
  })

  it('gère un texte avec beaucoup de navigation en entête', () => {
    const texte = `
Accueil | Acheter | Louer | Estimer | Vendre | Nos agences | Blog
Se connecter | Mon compte | Mes favoris | Alertes email
Paris | Lyon | Marseille | Bordeaux | Toulouse | Nantes | Strasbourg
Appartement | Maison | Terrain | Local commercial | Parking

Vous êtes ici : Accueil > Acheter > Paris > 75011 > Appartement

Appartement 2 pièces Paris 11ème
265 000 €
Surface : 35 m²
2 pièces — 1 chambre
4ème étage

DPE : E
75011 Paris
`
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(265000)
    expect(r.surface).toBe(35)
    expect(r.pieces).toBe(2)
    expect(r.dpe).toBe('E')
  })

  it('gère un texte avec prix au m² sans le confondre avec le prix', () => {
    const texte = `
Appartement T2 Nantes
190 000 €
40 m²
4 750 €/m²

DPE : C
44000 Nantes
`
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(190000)
    expect(r.surface).toBe(40)
  })

  it('compte correctement les champs de toutes les annonces', () => {
    // Annonce riche : devrait avoir 12+ champs
    const texte = `
Appartement 3 pièces — Lyon 3ème
Prix : 320 000 €
Surface : 65 m²
3 pièces — 2 chambres
5ème étage avec ascenseur
DPE : C — GES : B
Balcon, cave, parking
Charges : 180 €/mois
Taxe foncière : 600 €
Construction 1990
Orientation sud
1 salle de bains
69003 Lyon
`
    const r = parseTexteAnnonce(texte)
    const count = compterChampsExtraits(r)
    expect(count).toBeGreaterThanOrEqual(12)
  })
})
