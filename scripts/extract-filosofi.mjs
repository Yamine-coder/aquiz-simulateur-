/**
 * Script d'extraction des revenus médians par commune
 * Source : INSEE Filosofi 2019 — FILO2019_DISP_COM.csv
 *
 * Extrait CODGEO → Q219 (médiane du revenu disponible par UC)
 * et génère un fichier JSON compact : { "92025": 23320, ... }
 *
 * Usage : node scripts/extract-filosofi.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CSV_PATH = resolve(__dirname, 'filosofi-temp/FILO2019_DISP_COM.csv')
const OUTPUT_PATH = resolve(__dirname, '../src/data/revenus-communes.json')

const raw = readFileSync(CSV_PATH, 'utf-8')
const lines = raw.split('\n')

// Header: CODGEO;NBMEN19;NBPERS19;NBUC19;Q119;Q219;Q319;...
const header = lines[0].split(';')
const idxCode = header.indexOf('CODGEO')
const idxQ2 = header.indexOf('Q219')

if (idxCode === -1 || idxQ2 === -1) {
  console.error('Colonnes CODGEO ou Q219 introuvables dans le CSV')
  process.exit(1)
}

console.log(`Colonnes: CODGEO=${idxCode}, Q219=${idxQ2}`)

const result = {}
let count = 0
let skipped = 0

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim()
  if (!line) continue

  const fields = line.split(';')
  const code = fields[idxCode]
  const q2Raw = fields[idxQ2]

  if (!code || !q2Raw || q2Raw === '') {
    skipped++
    continue
  }

  const q2 = Math.round(parseFloat(q2Raw))
  if (isNaN(q2) || q2 < 3000 || q2 > 100000) {
    skipped++
    continue
  }

  result[code] = q2
  count++
}

writeFileSync(OUTPUT_PATH, JSON.stringify(result), 'utf-8')

const sizeKB = Math.round(readFileSync(OUTPUT_PATH).length / 1024)
console.log(`✓ ${count} communes extraites (${skipped} ignorées)`)
console.log(`✓ Fichier : ${OUTPUT_PATH} (${sizeKB} KB)`)

// Vérification rapide
const check = ['92025', '75056', '69123', '13055', '31555']
for (const c of check) {
  if (result[c]) {
    console.log(`  ${c} → ${result[c]} €/an (${Math.round(result[c] / 12)} €/mois)`)
  }
}
