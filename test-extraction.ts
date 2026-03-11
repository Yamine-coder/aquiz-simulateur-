/**
 * Test complet de l'extraction copy-paste sur tous les sites supportés.
 * Usage: npx tsx test-extraction.ts
 */
import { parseTexteAnnonce, type DonneesExtraites } from './src/lib/scraping/parseTexteAnnonce'

interface TestCase {
  name: string
  text: string
  expected: Partial<DonneesExtraites & { url?: string }>
}

const testCases: TestCase[] = [
  // ═══════════════════════════════════════════
  // LeBonCoin
  // ═══════════════════════════════════════════
  {
    name: 'LeBonCoin - appartement classique',
    text: `Appartement 3 pièces 65 m² à Colombes (92700)
Prix 350 000 €
Charges : 200 €/mois
Surface : 65 m²
Pièces : 3
Chambres : 2
Étage : 3/5
DPE D 343 kWh/m²/an
GES E 45 kg CO₂/m²/an
Taxe foncière : 850 €
Année de construction : 1975
Ascenseur
Balcon
Cave
Parking
https://www.leboncoin.fr/ventes_immobilieres/2345678901.htm`,
    expected: { prix: 350000, surface: 65, pieces: 3, chambres: 2, ville: 'Colombes', codePostal: '92700', dpe: 'D', ges: 'E', etage: 3, etagesTotal: 5, chargesMensuelles: 200, taxeFonciere: 850, anneeConstruction: 1975 }
  },

  // ═══════════════════════════════════════════
  // SeLoger
  // ═══════════════════════════════════════════
  {
    name: 'SeLoger - 4P Lyon',
    text: `Vente Appartement 4 pièces 89m² Lyon 3ème (69003)
449 000 €
Surface habitable : 89 m²
4 pièces - 3 chambres
2ème étage sur 7
Classe énergie : C
Classe GES : B
Charges de copropriété : 3600 € / an
Taxe foncière : 1200 €
Année de construction 1990
1 salle de bain
1 salle d'eau
Ascenseur
Terrasse
https://www.seloger.com/annonces/achat/appartement/lyon-3eme-69/123456789.htm`,
    expected: { prix: 449000, surface: 89, pieces: 4, chambres: 3, ville: 'Lyon', codePostal: '69003', dpe: 'C', ges: 'B', etage: 2, etagesTotal: 7, chargesMensuelles: 300, taxeFonciere: 1200, anneeConstruction: 1990, nbSallesBains: 2 }
  },

  // ═══════════════════════════════════════════
  // LaForêt
  // ═══════════════════════════════════════════
  {
    name: 'LaForêt - T3 Colombes',
    text: `Vente Appartement T3 Colombes
259 000 €
Colombes 92700
3 pièces
2 chambres
Surface : 55,5 m²
Étage : 2/4
Diagnostic de performance énergétique (DPE) : D
Émissions de gaz à effet de serre (GES) A 6 kg CO₂/m²/an
Charges mensuelles : 180 €
1 salle de bain
Cave
https://www.laforet.com/acheter/colombes/vente-appartement-3-pieces-123456`,
    expected: { prix: 259000, surface: 55.5, pieces: 3, chambres: 2, ville: 'Colombes', codePostal: '92700', dpe: 'D', ges: 'A', etage: 2, etagesTotal: 4, chargesMensuelles: 180 }
  },

  // ═══════════════════════════════════════════
  // LaForêt - agent section pollution
  // ═══════════════════════════════════════════
  {
    name: 'LaForêt - agent pollution (Dominique Frélaud)',
    text: `Vente Appartement 3 pièces Colombes
Colombes (92700)
320 000 €
Surface : 60 m²
3 pièces 2 chambres
DPE : D
GES : C

Votre conseiller
Dominique Frélaud
Laforêt Immobilier
33260 La Teste-de-Buch
Tél: 06 12 34 56 78`,
    expected: { ville: 'Colombes', codePostal: '92700', prix: 320000, surface: 60, dpe: 'D', ges: 'C' }
  },

  // ═══════════════════════════════════════════
  // Century21
  // ═══════════════════════════════════════════
  {
    name: 'Century21 - 2P Neuilly',
    text: `CENTURY 21
Appartement 2 pièces
Neuilly-sur-Seine (92200)
Prix de vente : 375 000 €
Surface : 42 m²
2 pièces dont 1 chambre
3ème étage avec ascenseur
DPE : C
GES : B
Charges mensuelles : 250 €
Taxe Foncière: 650 Euros
Parking
Construction 1965
https://www.century21.fr/trouver_logement/detail/123456789/`,
    expected: { prix: 375000, surface: 42, pieces: 2, chambres: 1, ville: 'Neuilly-sur-Seine', codePostal: '92200', dpe: 'C', ges: 'B', etage: 3, chargesMensuelles: 250, taxeFonciere: 650, anneeConstruction: 1965 }
  },

  // ═══════════════════════════════════════════
  // Orpi
  // ═══════════════════════════════════════════
  {
    name: 'Orpi - 5P Boulogne',
    text: `Vente Appartement 5 pièces 95m²
Boulogne-Billancourt (92100)
589 000 €
Surface 95 m²
5 pièces - 4 chambres
4ème étage
Immeuble de R+6
Étiquette énergie : B
Étiquette climat : A
Provisions sur charges : 300 € / mois
Taxe foncière : 980 €
Balcon
Ascenseur
Garage
Immeuble de 1982
https://www.orpi.com/annonce-vente-appartement-boulogne-billancourt-123456/`,
    expected: { prix: 589000, surface: 95, pieces: 5, chambres: 4, ville: 'Boulogne-Billancourt', codePostal: '92100', dpe: 'B', ges: 'A', etage: 4, etagesTotal: 6, chargesMensuelles: 300, taxeFonciere: 980, anneeConstruction: 1982 }
  },

  // ═══════════════════════════════════════════
  // PAP (Particulier à Particulier)
  // ═══════════════════════════════════════════
  {
    name: 'PAP - maison Bordeaux',
    text: `Vente maison 6 pièces 120 m² Bordeaux (33000)
420 000 €
6 pièces - 4 chambres
Surface : 120 m²
Terrain : 350 m²
Énergie : D
GES : C
2 salles de bain
Garage
Terrasse
Cave
https://www.pap.fr/annonces/maison-bordeaux-33000-g12345`,
    expected: { prix: 420000, surface: 120, pieces: 6, chambres: 4, ville: 'Bordeaux', codePostal: '33000', dpe: 'D', ges: 'C', type: 'maison', nbSallesBains: 2 }
  },

  // ═══════════════════════════════════════════
  // Bien'ici
  // ═══════════════════════════════════════════
  {
    name: "Bien'ici - 3P Paris 11",
    text: `Appartement 3 pièces • 68 m²
Paris 11ème (75011)
520 000 €
3 pièces 2 chambres
68 m²
5ème étage / 7 étages
Bilan énergétique : D
Bilan carbone : C
Ascenseur
https://www.bienici.com/annonce/vente/paris-11e/appartement/3pieces/abc123`,
    expected: { prix: 520000, surface: 68, pieces: 3, chambres: 2, ville: 'Paris', codePostal: '75011', dpe: 'D', ges: 'C', etage: 5, etagesTotal: 7 }
  },

  // ═══════════════════════════════════════════
  // Guy Hoquet
  // ═══════════════════════════════════════════
  {
    name: 'Guy Hoquet - T4 Nantes',
    text: `GUY HOQUET
Vente Appartement T4 Nantes (44000)
315 000 €
Surface : 78 m²
4 pièces 3 chambres
Étage : 2
Consommation d'énergie : C
GES : B
https://www.guy-hoquet.com/annonces/vente-appartement-nantes-123`,
    expected: { prix: 315000, surface: 78, pieces: 4, chambres: 3, ville: 'Nantes', codePostal: '44000', dpe: 'C', ges: 'B', etage: 2 }
  },

  // ═══════════════════════════════════════════
  // IAD France
  // ═══════════════════════════════════════════
  {
    name: 'IAD - maison Toulouse',
    text: `Vente maison 5 pièces Toulouse
Toulouse (31000)
285 000 €
Surface : 110 m²
5 pièces dont 3 chambres
DPE : D
GES : D
2 salles de bain
Garage
https://www.iadfrance.fr/annonce/vente-maison-toulouse-123456`,
    expected: { prix: 285000, surface: 110, pieces: 5, chambres: 3, ville: 'Toulouse', codePostal: '31000', dpe: 'D', ges: 'D', type: 'maison', nbSallesBains: 2 }
  },

  // ═══════════════════════════════════════════
  // Capifrance
  // ═══════════════════════════════════════════
  {
    name: 'Capifrance - villa Aix',
    text: `CAPIFRANCE
Villa 7 pièces à Aix-en-Provence 13100
695 000 €
Surface : 180 m²
7 pièces 5 chambres
Terrain 800 m²
DPE : C
GES : B
Construction : 2005
https://www.capifrance.fr/annonce/villa-aix-en-provence-7-pieces-123456`,
    expected: { prix: 695000, surface: 180, pieces: 7, chambres: 5, ville: 'Aix-en-Provence', codePostal: '13100', dpe: 'C', ges: 'B', type: 'maison', anneeConstruction: 2005 }
  },

  // ═══════════════════════════════════════════
  // Foncia
  // ═══════════════════════════════════════════
  {
    name: 'Foncia - 2P Issy',
    text: `Foncia
Vente appartement 2 pièces Issy-les-Moulineaux (92130)
329 000 €
40 m²
2 pièces 1 chambre
6ème étage
DPE : D
GES : C
Charges mensuelles : 195 euros
https://www.foncia.com/achat/issy-les-moulineaux-92/appartement/ref-123456`,
    expected: { prix: 329000, surface: 40, pieces: 2, chambres: 1, ville: 'Issy-les-Moulineaux', codePostal: '92130', dpe: 'D', ges: 'C', etage: 6, chargesMensuelles: 195 }
  },

  // ═══════════════════════════════════════════
  // Nexity
  // ═══════════════════════════════════════════
  {
    name: 'Nexity - neuf Rueil',
    text: `NEXITY
Appartement neuf 3 pièces
Rueil-Malmaison (92500)
410 000 €
Surface : 62 m²
3 pièces - 2 chambres
2ème étage
Livraison prévue T3 2025
DPE : A
GES : A
https://www.nexity.fr/immobilier-neuf/rueil-malmaison/appartement/ref-123`,
    expected: { prix: 410000, surface: 62, pieces: 3, chambres: 2, ville: 'Rueil-Malmaison', codePostal: '92500', dpe: 'A', ges: 'A', etage: 2, anneeConstruction: 2025 }
  },

  // ═══════════════════════════════════════════
  // ParuVendu
  // ═══════════════════════════════════════════
  {
    name: 'ParuVendu - 4P Versailles',
    text: `Vente appartement 4 pièces 85m²
Versailles 78000
399 000 €
4 pièces 3 chambres
Étage 4/6
Classe énergie : D
Classe GES : C
Charges : 280 €/mois
Résidence de 1970
https://www.paruvendu.fr/immobilier/vente/appartement/versailles-78/A123456`,
    expected: { prix: 399000, surface: 85, pieces: 4, chambres: 3, ville: 'Versailles', codePostal: '78000', dpe: 'D', ges: 'C', etage: 4, etagesTotal: 6, chargesMensuelles: 280, anneeConstruction: 1970 }
  },

  // ═══════════════════════════════════════════
  // SAFTI
  // ═══════════════════════════════════════════
  {
    name: 'SAFTI - maison Rennes',
    text: `SAFTI
Maison 4 pièces Rennes 35000
225 000 €
Surface : 90 m²
4 pièces 3 chambres
DPE : E
GES : D
Taxe foncière : 1100 €
Garage
https://www.safti.fr/annonce/maison-rennes-35-123456`,
    expected: { prix: 225000, surface: 90, pieces: 4, chambres: 3, ville: 'Rennes', codePostal: '35000', dpe: 'E', ges: 'D', taxeFonciere: 1100, type: 'maison' }
  },

  // ═══════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════
  {
    name: 'Edge: prix avec espaces insécables',
    text: `Appartement Marseille 13001\n1\u00A0250\u00A0000 € 89m² 4 pièces`,
    expected: { prix: 1250000, surface: 89, pieces: 4, ville: 'Marseille', codePostal: '13001' }
  },
  {
    name: 'Edge: surface décimale virgule',
    text: `Appartement 45,8 m² Paris 75001 320000€ 2 pièces DPE : C`,
    expected: { surface: 45.8, prix: 320000, ville: 'Paris', codePostal: '75001', dpe: 'C' }
  },
  {
    name: 'Edge: DPE scale A-G inline',
    text: `Appartement Paris 75001 250000€
A B C D E F G
Logement économe Logement énergivore
Consommation d'énergie : E
A B C D E F G
Faible émission Forte émission
GES : C`,
    expected: { dpe: 'E', ges: 'C' }
  },
  {
    name: 'Edge: RDC',
    text: `Appartement rez-de-chaussée 55m² 250000€ Paris 75015 2 pièces`,
    expected: { etage: 0 }
  },
  {
    name: 'Edge: DPE kWh scale (LeBonCoin)',
    text: `Appartement Paris 75001 300000€
A ≤ 50 kWh B 51 à 90 kWh C 91 à 150 kWh D 151 à 230 kWh E 231 à 330 kWh F 331 à 450 kWh G > 450 kWh
D 198 kWh/m²/an
A ≤ 5 kg CO₂ B 6 à 10 kg CO₂ C 11 à 20 kg CO₂ D 21 à 35 kg CO₂ E 36 à 55 kg CO₂ F 56 à 80 kg CO₂ G > 80 kg CO₂
C 18 kg CO₂/m²/an`,
    expected: { dpe: 'D', ges: 'C' }
  },
  {
    name: 'Edge: T3 / F4 type notation',
    text: `T3 Colombes 92700 280000€ 65m²`,
    expected: { pieces: 3, ville: 'Colombes', codePostal: '92700' }
  },
  {
    name: 'Edge: charges annuelles vs mensuelles',
    text: `Appartement Paris 75001 400000€ 60m²
Charges de copropriété : 4200 € / an
Taxe foncière : 890 €`,
    expected: { chargesMensuelles: 350, taxeFonciere: 890 }
  },
  {
    name: 'Edge: "dont X chambres"',
    text: `Appartement 4 pièces dont 2 chambres Lyon 69001 350000€ 75m²`,
    expected: { pieces: 4, chambres: 2 }
  },
  {
    name: 'Edge: Salle de bain + salle eau',
    text: `Appartement Paris 75001 500000€ 90m²
1 salle de bain
1 salle d'eau`,
    expected: { nbSallesBains: 2 }
  },
  {
    name: 'Edge: orientation double',
    text: `Appartement Paris 75016 600000€ 80m²
Double exposition est/ouest`,
    expected: { orientation: 'est/ouest' }
  },
  {
    name: 'Edge: Logic-Immo URL',
    text: `Appartement Lille 59000 200000€ 50m²
https://www.logic-immo.com/detail-vente-123456789.htm`,
    expected: { ville: 'Lille', codePostal: '59000' }
  },
  {
    name: 'Edge: charges inferred annual > 1200',
    text: `Appartement Lyon 69001 350000€ 75m²
Charges 2400 €`,
    expected: { chargesMensuelles: 200 }
  },
  {
    name: 'Edge: negative equipment detection',
    text: `Appartement sans ascenseur sans balcon pas de cave pas de parking Lyon 69001 200000€ 40m²`,
    expected: { ascenseur: false, balconTerrasse: false, cave: false, parking: false }
  },
  // ═══════════════════════════════════════════
  // LaForêt navigation pollution (CP from header)
  // ═══════════════════════════════════════════
  {
    name: 'LaForêt - nav with Paris 75001 before Colombes 92700',
    text: `LaForêt Immobilier
Accueil Acheter Louer Estimer
Rechercher un bien
75001 Paris Île-de-France
Nos agences
Vente Appartement T3 Colombes
259 000 €
Colombes
92700
3 pièces
2 chambres
Surface : 55,5 m²
Étage : 2/4
Diagnostic de performance énergétique (DPE) : D
Émissions de gaz à effet de serre (GES) A 6 kg CO₂/m²/an
Charges mensuelles : 180 €
1 salle de bain
Cave
https://www.laforet.com/acheter/colombes/vente-appartement-3-pieces-123456`,
    expected: { ville: 'Colombes', codePostal: '92700', prix: 259000, surface: 55.5, pieces: 3, chambres: 2, dpe: 'D' }
  },
  {
    name: 'LaForêt - header pollution multi-city',
    text: `LaForêt Colombes
Paris 75001 - Région Île-de-France
Notre sélection
Appartement T3 Colombes 92700
259 000 €`,
    expected: { ville: 'Colombes', codePostal: '92700', prix: 259000 }
  },
  {
    name: 'Edge: city name in agency header, real city in body',
    text: `Agence SeLoger
Marseille 13001 Lyon 69001
Votre recherche
Vente Appartement 3 pièces
Bordeaux (33000)
320 000 €
65 m²`,
    expected: { ville: 'Bordeaux', codePostal: '33000', prix: 320000, surface: 65 }
  },
]

// ═══════════════════════════════════════════
// Run tests
// ═══════════════════════════════════════════
let totalChecks = 0
let passed = 0
let failed = 0
const failures: string[] = []

for (const tc of testCases) {
  const result = parseTexteAnnonce(tc.text) as Record<string, unknown>
  
  for (const [field, expected] of Object.entries(tc.expected)) {
    totalChecks++
    const actual = result[field]
    
    // Special handling for boolean false checks (equipment negation)
    if (expected === false) {
      if (actual === false || actual === undefined || actual === null) {
        passed++
      } else {
        failed++
        failures.push(`  ✗ [${tc.name}] ${field}: expected=${expected}, got=${actual}`)
      }
      continue
    }
    
    if (actual === expected) {
      passed++
    } else if (typeof expected === 'number' && typeof actual === 'number' && Math.abs(actual - expected) < 1) {
      passed++ // allow small rounding diff
    } else {
      failed++
      failures.push(`  ✗ [${tc.name}] ${field}: expected=${JSON.stringify(expected)}, got=${JSON.stringify(actual)}`)
    }
  }
}

console.log(`\n${'═'.repeat(60)}`)
console.log(`  EXTRACTION TEST RESULTS`)
console.log(`${'═'.repeat(60)}`)
console.log(`  Total checks:  ${totalChecks}`)
console.log(`  ✓ Passed:      ${passed}`)
console.log(`  ✗ Failed:      ${failed}`)
console.log(`  Success rate:  ${((passed/totalChecks)*100).toFixed(1)}%`)
console.log(`${'═'.repeat(60)}\n`)

if (failures.length > 0) {
  console.log('FAILURES:\n')
  for (const f of failures) {
    console.log(f)
  }
  console.log('')
}
