/**
 * Tests complets pour parseTexteAnnonce (extraction côté client)
 * Couvre tous les extracteurs individuels + cas réels
 */
import { describe, expect, it } from 'vitest'
import { compterChampsExtraits, parseTexteAnnonce } from '../parseTexteAnnonce'

// ============================================
// EXTRACTION DU PRIX
// ============================================
describe('extraction du prix', () => {
  it('extrait prix avec espaces : "450 000 €"', () => {
    const r = parseTexteAnnonce('Appartement à vendre 450 000 €')
    expect(r.prix).toBe(450000)
  })

  it('extrait prix sans espaces : "450000€"', () => {
    const r = parseTexteAnnonce('Prix 450000€')
    expect(r.prix).toBe(450000)
  })

  it('extrait prix avec label : "Prix : 350 000 €"', () => {
    const r = parseTexteAnnonce('Prix : 350 000 €')
    expect(r.prix).toBe(350000)
  })

  it('extrait prix de vente : "Prix de vente : 200 000€"', () => {
    const r = parseTexteAnnonce('Prix de vente : 200 000€')
    expect(r.prix).toBe(200000)
  })

  it('extrait prix en euros : "280 000 euros"', () => {
    const r = parseTexteAnnonce('Prix 280 000 euros')
    expect(r.prix).toBe(280000)
  })

  it('extrait prix >= 1 000 000 €', () => {
    const r = parseTexteAnnonce('Maison à 1 400 000 €')
    expect(r.prix).toBe(1400000)
  })

  it('rejette prix < 10 000 €', () => {
    const r = parseTexteAnnonce('Prix 500 €')
    expect(r.prix).toBeUndefined()
  })

  it('rejette prix > 50 000 000 €', () => {
    const r = parseTexteAnnonce('Prix 60 000 000 €')
    expect(r.prix).toBeUndefined()
  })

  it('gère les espaces insécables (\\u00A0)', () => {
    const r = parseTexteAnnonce('Prix 350\u00A0000 €')
    expect(r.prix).toBe(350000)
  })
})

// ============================================
// EXTRACTION DE LA SURFACE
// ============================================
describe('extraction de la surface', () => {
  it('extrait "65 m²"', () => {
    const r = parseTexteAnnonce('Appartement de 65 m²')
    expect(r.surface).toBe(65)
  })

  it('extrait "65m2"', () => {
    const r = parseTexteAnnonce('Surface 65m2')
    expect(r.surface).toBe(65)
  })

  it('extrait "72,5 m²" (virgule)', () => {
    const r = parseTexteAnnonce('Pièce de 72,5 m²')
    expect(r.surface).toBe(72.5)
  })

  it('extrait "Surface habitable : 80"', () => {
    const r = parseTexteAnnonce('Surface habitable : 80 m²')
    expect(r.surface).toBe(80)
  })

  it('rejette surface < 9 m²', () => {
    const r = parseTexteAnnonce('Local de 5 m²')
    expect(r.surface).toBeUndefined()
  })

  it('rejette surface > 1000 m²', () => {
    const r = parseTexteAnnonce('Terrain de 2500 m²')
    expect(r.surface).toBeUndefined()
  })
})

// ============================================
// EXTRACTION DES PIÈCES / CHAMBRES
// ============================================
describe('extraction des pièces', () => {
  it('extrait "3 pièces"', () => {
    const r = parseTexteAnnonce('Appartement 3 pièces')
    expect(r.pieces).toBe(3)
  })

  it('extrait "T3"', () => {
    const r = parseTexteAnnonce('Studio T3 lumineux')
    expect(r.pieces).toBe(3)
  })

  it('extrait "F4"', () => {
    const r = parseTexteAnnonce('F4 avec balcon')
    expect(r.pieces).toBe(4)
  })

  it('déduit chambres depuis pièces', () => {
    const r = parseTexteAnnonce('Appartement 3 pièces 65 m²')
    expect(r.pieces).toBe(3)
    expect(r.chambres).toBe(2) // 3 - 1
  })

  it('extrait chambres explicitement', () => {
    const r = parseTexteAnnonce('4 pièces dont 2 chambres')
    expect(r.pieces).toBe(4)
    expect(r.chambres).toBe(2)
  })

  it('déduit pièces depuis chambres', () => {
    const r = parseTexteAnnonce('Maison avec 3 chambres')
    expect(r.chambres).toBe(3)
    expect(r.pieces).toBe(4) // 3 + 1
  })
})

// ============================================
// EXTRACTION DU TYPE DE BIEN
// ============================================
describe('extraction du type', () => {
  it('détecte maison', () => {
    const r = parseTexteAnnonce('Belle maison avec jardin')
    expect(r.type).toBe('maison')
  })

  it('détecte villa', () => {
    const r = parseTexteAnnonce('Villa provençale')
    expect(r.type).toBe('maison')
  })

  it('détecte pavillon', () => {
    const r = parseTexteAnnonce('Pavillon 4 pièces')
    expect(r.type).toBe('maison')
  })

  it('défaut = appartement', () => {
    const r = parseTexteAnnonce('Bien immobilier 350 000 €')
    expect(r.type).toBe('appartement')
  })
})

// ============================================
// EXTRACTION DE LA LOCALISATION
// ============================================
describe('extraction de la localisation', () => {
  it('extrait "Paris (75015)"', () => {
    const r = parseTexteAnnonce('Appartement Paris (75015) 3 pièces')
    expect(r.ville).toBe('Paris')
    expect(r.codePostal).toBe('75015')
  })

  it('extrait "75015 Paris"', () => {
    const r = parseTexteAnnonce('75015 Paris, appartement lumineux')
    expect(r.codePostal).toBe('75015')
  })

  it('extrait ville connue sans code postal', () => {
    const r = parseTexteAnnonce('Appartement à Lyon, 3 pièces')
    expect(r.ville).toBe('Lyon')
  })

  it('déduit Paris depuis code postal 750xx', () => {
    const r = parseTexteAnnonce('Bien situé au 75008')
    expect(r.codePostal).toBe('75008')
    expect(r.ville).toBe('Paris')
  })

  it('déduit Lyon depuis code postal 690xx', () => {
    const r = parseTexteAnnonce('Quartier calme 69003')
    expect(r.codePostal).toBe('69003')
    expect(r.ville).toBe('Lyon')
  })

  it('déduit Marseille depuis code postal 130xx', () => {
    const r = parseTexteAnnonce('Centre-ville 13001')
    expect(r.codePostal).toBe('13001')
    expect(r.ville).toBe('Marseille')
  })

  it('valide le code postal (dept 01-98)', () => {
    const r = parseTexteAnnonce('Code 99999 invalide')
    expect(r.codePostal).toBeUndefined()
  })

  it('extrait Boulogne-Billancourt (ville composée)', () => {
    const r = parseTexteAnnonce('Appartement Boulogne-Billancourt 92100')
    expect(r.ville).toBe('Boulogne-Billancourt')
  })
})

// ============================================
// EXTRACTION DU DPE / GES
// ============================================
describe('extraction DPE / GES', () => {
  it('extrait "DPE : C"', () => {
    const r = parseTexteAnnonce('DPE : C')
    expect(r.dpe).toBe('C')
  })

  it('extrait "Classe énergie : B"', () => {
    const r = parseTexteAnnonce('Classe énergie : B')
    expect(r.dpe).toBe('B')
  })

  it('extrait "GES : D"', () => {
    const r = parseTexteAnnonce('GES : D')
    expect(r.ges).toBe('D')
  })

  it('extrait "Classe climat : E"', () => {
    const r = parseTexteAnnonce('Classe climat : E')
    expect(r.ges).toBe('E')
  })

  it('extrait DPE minuscule "dpe: b"', () => {
    const r = parseTexteAnnonce('dpe: b')
    expect(r.dpe).toBe('B')
  })

  it('ne confond pas DPE et GES', () => {
    const r = parseTexteAnnonce('DPE : C, GES : E')
    expect(r.dpe).toBe('C')
    expect(r.ges).toBe('E')
  })
})

// ============================================
// EXTRACTION DE L'ÉTAGE
// ============================================
describe('extraction de l\'étage', () => {
  it('extrait "3ème étage"', () => {
    const r = parseTexteAnnonce('Situé au 3ème étage')
    expect(r.etage).toBe(3)
  })

  it('extrait "1er étage"', () => {
    const r = parseTexteAnnonce('Au 1er étage')
    expect(r.etage).toBe(1)
  })

  it('extrait "étage : 5"', () => {
    const r = parseTexteAnnonce('Étage : 5')
    expect(r.etage).toBe(5)
  })

  it('détecte rez-de-chaussée', () => {
    const r = parseTexteAnnonce('Situé en rez-de-chaussée')
    expect(r.etage).toBe(0)
  })

  it('détecte RDC', () => {
    const r = parseTexteAnnonce('Appartement RDC avec jardin')
    expect(r.etage).toBe(0)
  })
})

// ============================================
// EXTRACTION DES CHARGES / TAXE FONCIÈRE
// ============================================
describe('extraction charges / taxe foncière', () => {
  it('extrait charges mensuelles : "150 €/mois"', () => {
    const r = parseTexteAnnonce('Charges : 150 €/mois')
    expect(r.chargesMensuelles).toBe(150)
  })

  it('extrait charges copropriété (annuel → mensuel)', () => {
    const r = parseTexteAnnonce('Charges de copropriété : 2400 € par an')
    expect(r.chargesMensuelles).toBe(200) // 2400/12
  })

  it('extrait taxe foncière', () => {
    const r = parseTexteAnnonce('Taxe foncière : 1200 €')
    expect(r.taxeFonciere).toBe(1200)
  })
})

// ============================================
// EXTRACTION DES ÉQUIPEMENTS
// ============================================
describe('extraction des équipements', () => {
  it('détecte ascenseur', () => {
    const r = parseTexteAnnonce('Immeuble avec ascenseur')
    expect(r.ascenseur).toBe(true)
  })

  it('ne détecte pas "sans ascenseur"', () => {
    const r = parseTexteAnnonce('Immeuble sans ascenseur')
    expect(r.ascenseur).toBe(false)
  })

  it('détecte balcon', () => {
    const r = parseTexteAnnonce('Appartement avec balcon')
    expect(r.balconTerrasse).toBe(true)
  })

  it('détecte terrasse', () => {
    const r = parseTexteAnnonce('Grande terrasse plein sud')
    expect(r.balconTerrasse).toBe(true)
  })

  it('détecte loggia', () => {
    const r = parseTexteAnnonce('Loggia fermée de 8m²')
    expect(r.balconTerrasse).toBe(true)
  })

  it('détecte parking', () => {
    const r = parseTexteAnnonce('Place de parking en sous-sol')
    expect(r.parking).toBe(true)
  })

  it('détecte garage', () => {
    const r = parseTexteAnnonce('Garage fermé')
    expect(r.parking).toBe(true)
  })

  it('détecte cave', () => {
    const r = parseTexteAnnonce('Cave de 5m² au sous-sol')
    expect(r.cave).toBe(true)
  })
})

// ============================================
// EXTRACTION ANNÉE CONSTRUCTION
// ============================================
describe('extraction année de construction', () => {
  it('extrait "Année de construction : 1975"', () => {
    const r = parseTexteAnnonce('Année de construction : 1975')
    expect(r.anneeConstruction).toBe(1975)
  })

  it('extrait "Construit en 1985"', () => {
    const r = parseTexteAnnonce('Construit en 1985')
    expect(r.anneeConstruction).toBe(1985)
  })

  it('extrait "Immeuble de 1972"', () => {
    const r = parseTexteAnnonce('Immeuble de 1972 bien entretenu')
    expect(r.anneeConstruction).toBe(1972)
  })

  it('extrait "Livraison 2025"', () => {
    const r = parseTexteAnnonce('Livraison prévue T3 2025')
    expect(r.anneeConstruction).toBe(2025)
  })

  it('extrait "années 70" → 1970', () => {
    const r = parseTexteAnnonce('Résidence datant des années 70')
    expect(r.anneeConstruction).toBe(1970)
  })

  it('extrait depuis tableau markdown', () => {
    const r = parseTexteAnnonce('| Année de construction | 1985 |')
    expect(r.anneeConstruction).toBe(1985)
  })
})

// ============================================
// EXTRACTION SALLES DE BAINS
// ============================================
describe('extraction salles de bains', () => {
  it('extrait "2 salles de bains"', () => {
    const r = parseTexteAnnonce('2 salles de bains')
    expect(r.nbSallesBains).toBe(2)
  })

  it('extrait "1 salle de bain"', () => {
    const r = parseTexteAnnonce('1 salle de bain')
    expect(r.nbSallesBains).toBe(1)
  })

  it('extrait "1 SDB"', () => {
    const r = parseTexteAnnonce('1 SDB et 1 WC séparé')
    expect(r.nbSallesBains).toBe(1)
  })

  it('extrait "1 salle d\'eau"', () => {
    const r = parseTexteAnnonce("1 salle d'eau avec douche")
    expect(r.nbSallesBains).toBe(1)
  })

  it('extrait "2 salles d\'eau"', () => {
    const r = parseTexteAnnonce("2 salles d'eau")
    expect(r.nbSallesBains).toBe(2)
  })
})

// ============================================
// EXTRACTION ORIENTATION
// ============================================
describe('extraction orientation', () => {
  it('extrait "Orientation sud"', () => {
    const r = parseTexteAnnonce('Orientation sud')
    expect(r.orientation).toBe('sud')
  })

  it('extrait "Exposé plein sud"', () => {
    const r = parseTexteAnnonce('Exposé plein sud')
    expect(r.orientation).toBe('plein sud')
  })

  it('extrait "Double exposition est/ouest"', () => {
    const r = parseTexteAnnonce('Double exposition est/ouest')
    expect(r.orientation).toBe('est/ouest')
  })
})

// ============================================
// EXTRACTION TITRE / DESCRIPTION
// ============================================
describe('extraction titre / description', () => {
  it('extrait un titre immobilier', () => {
    const r = parseTexteAnnonce('Appartement T3 lumineux centre-ville\nBeaucoup de texte ici...')
    expect(r.titre).toContain('Appartement T3')
  })

  it('extrait une description longue', () => {
    const text = 'Titre\n' +
      'Bel appartement lumineux situé au 3ème étage, comprenant séjour, cuisine équipée, 2 chambres, salle de bains.\n'
    const r = parseTexteAnnonce(text)
    expect(r.description).toBeDefined()
    expect(r.description!.length).toBeGreaterThan(50)
  })
})

// ============================================
// CAS RÉELS COMPLETS (annonces simulées)
// ============================================
describe('cas réels complets', () => {
  it('annonce LeBonCoin typique', () => {
    const texte = `
      Appartement T3 lumineux - Paris 15ème
      350 000 €
      65 m² - 3 pièces - 2 chambres
      3ème étage avec ascenseur
      DPE : C  GES : D
      Charges de copropriété : 180 €/mois
      Taxe foncière : 800 €
      Balcon, cave, parking
      75015 Paris
    `
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(350000)
    expect(r.surface).toBe(65)
    expect(r.pieces).toBe(3)
    expect(r.chambres).toBe(2)
    expect(r.type).toBe('appartement')
    expect(r.codePostal).toBe('75015')
    expect(r.ville).toBe('Paris')
    expect(r.dpe).toBe('C')
    expect(r.ges).toBe('D')
    expect(r.etage).toBe(3)
    expect(r.ascenseur).toBe(true)
    expect(r.balconTerrasse).toBe(true)
    expect(r.parking).toBe(true)
    expect(r.cave).toBe(true)
    expect(r.chargesMensuelles).toBe(180)
    expect(r.taxeFonciere).toBe(800)
  })

  it('annonce SeLoger maison', () => {
    const texte = `
      Maison 5 pièces à Bordeaux
      Prix : 580 000 €
      Surface : 145 m²
      4 chambres, 2 salles de bains
      DPE : D
      Terrain de 500 m²
      Garage double, terrasse
      Construction 1990
      Orientation sud
      33000 Bordeaux
    `
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(580000)
    expect(r.surface).toBe(145)
    expect(r.pieces).toBe(5)
    expect(r.chambres).toBe(4)
    expect(r.type).toBe('maison')
    expect(r.ville).toBe('Bordeaux')
    expect(r.codePostal).toBe('33000')
    expect(r.dpe).toBe('D')
    expect(r.nbSallesBains).toBe(2)
    expect(r.parking).toBe(true)
    expect(r.balconTerrasse).toBe(true)
    expect(r.anneeConstruction).toBe(1990)
    expect(r.orientation).toBe('sud')
  })

  it('annonce minimale (prix + surface seulement)', () => {
    const texte = '250 000 € pour 55 m²'
    const r = parseTexteAnnonce(texte)
    expect(r.prix).toBe(250000)
    expect(r.surface).toBe(55)
    expect(r.type).toBe('appartement') // défaut
  })

  it('texte vide retourne objet vide', () => {
    const r = parseTexteAnnonce('')
    expect(Object.keys(r).length).toBe(0)
  })

  it('texte sans données immobilières', () => {
    const r = parseTexteAnnonce('Bonjour, je cherche un bien.')
    expect(r.prix).toBeUndefined()
    expect(r.surface).toBeUndefined()
  })

  it('texte très long est tronqué sans crash', () => {
    const texte = 'Appartement 350 000 € 65 m² DPE C ' + 'x'.repeat(300000)
    const r = parseTexteAnnonce(texte)
    // Doit extraire malgré la troncature
    expect(r.prix).toBe(350000)
    expect(r.surface).toBe(65)
  })
})

// ============================================
// COMPTER LES CHAMPS EXTRAITS
// ============================================
describe('compterChampsExtraits', () => {
  it('compte correctement les champs remplis', () => {
    const data = parseTexteAnnonce('Appartement 350 000 € 65 m² 3 pièces 2 chambres DPE C 75015 Paris')
    const count = compterChampsExtraits(data)
    expect(count).toBeGreaterThanOrEqual(6)
  })

  it('retourne 0 pour données vides', () => {
    const count = compterChampsExtraits({})
    expect(count).toBe(0)
  })

  it('ne compte pas DPE = NC', () => {
    const count = compterChampsExtraits({ dpe: 'NC' })
    expect(count).toBe(0)
  })
})
