/**
 * API Route: /api/dvf/codepostal/[cp]
 * 
 * Récupère les prix DVF réels pour un code postal
 * Cherche dans le département correspondant
 */

import { fetchDVFDepartement, type DVFDepartementStats } from '@/lib/api/dvf-real';
import { ServerCache } from '@/lib/serverCache';
import { NextRequest, NextResponse } from 'next/server';

// Cache département borné (TTL 24h, max 100)
const deptCache = new ServerCache<DVFDepartementStats>({ ttlMs: 24 * 60 * 60 * 1000, maxSize: 100 })

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cp: string }> }
) {
  try {
    const { cp } = await params
    
    // Valider le code postal (5 chiffres)
    if (!cp || !/^\d{5}$/.test(cp)) {
      return NextResponse.json(
        { error: 'Code postal invalide (format: 5 chiffres)' },
        { status: 400 }
      )
    }

    // Extraire le code département du code postal
    // Cas spéciaux : Corse (20XXX -> 2A ou 2B), DOM-TOM
    let codeDept = cp.substring(0, 2)
    
    // Paris et petite couronne utilisent le CP directement
    if (cp.startsWith('75')) codeDept = '75'
    else if (cp.startsWith('92')) codeDept = '92'
    else if (cp.startsWith('93')) codeDept = '93'
    else if (cp.startsWith('94')) codeDept = '94'
    else if (cp.startsWith('97')) codeDept = cp.substring(0, 3) // DOM-TOM
    else if (cp.startsWith('20')) codeDept = parseInt(cp) < 20200 ? '2A' : '2B' // Corse

    // Vérifier le cache département
    const cacheKey = `dvf_dept_${codeDept}`
    let deptData = deptCache.get(cacheKey)
    
    if (!deptData) {
      console.info(`[DVF CP] Fetch dept ${codeDept} for CP ${cp}`)
      deptData = await fetchDVFDepartement(codeDept)
      deptCache.set(cacheKey, deptData)
    }

    // Chercher la/les commune(s) avec ce code postal
    const communes = deptData.communes.filter(c => c.codePostal === cp)
    
    if (communes.length === 0) {
      return NextResponse.json(
        { 
          error: 'Aucune donnée DVF pour ce code postal',
          codePostal: cp,
          codeDepartement: codeDept 
        },
        { status: 404 }
      )
    }

    // Si plusieurs communes pour un CP, calculer les stats agrégées
    const prixAppartements = communes
      .filter(c => c.prixM2MedianAppart > 0)
      .map(c => ({ prix: c.prixM2MedianAppart, nb: c.nbVentesAppart }))
    
    const prixMaisons = communes
      .filter(c => c.prixM2MedianMaison > 0)
      .map(c => ({ prix: c.prixM2MedianMaison, nb: c.nbVentesMaison }))

    // Prix médian pondéré par le nombre de ventes
    const calcPrixPondere = (data: { prix: number; nb: number }[]) => {
      if (data.length === 0) return 0
      const totalVentes = data.reduce((sum, d) => sum + d.nb, 0)
      if (totalVentes === 0) return data[0].prix
      return Math.round(data.reduce((sum, d) => sum + d.prix * d.nb, 0) / totalVentes)
    }

    const prixM2Appartement = calcPrixPondere(prixAppartements)
    const prixM2Maison = calcPrixPondere(prixMaisons)
    const nbVentesAppart = communes.reduce((sum, c) => sum + c.nbVentesAppart, 0)
    const nbVentesMaison = communes.reduce((sum, c) => sum + c.nbVentesMaison, 0)

    // Nom : si une seule commune, son nom, sinon liste
    const nomCommune = communes.length === 1 
      ? communes[0].nomCommune 
      : communes.map(c => c.nomCommune).join(', ')

    return NextResponse.json({
      codePostal: cp,
      codeDepartement: codeDept,
      nomDepartement: deptData.nomDepartement,
      nomCommune,
      nbCommunes: communes.length,
      prixM2Appartement,
      prixM2Maison,
      nbVentesAppart,
      nbVentesMaison,
      communes: communes.map(c => ({
        nom: c.nomCommune,
        codeInsee: c.codeCommune,
        prixM2Appart: c.prixM2MedianAppart,
        prixM2Maison: c.prixM2MedianMaison,
        nbVentes: c.nbVentesAppart + c.nbVentesMaison
      })),
      annee: communes[0]?.annee || 2024,
      source: 'DVF data.gouv.fr'
    })
    
  } catch (error) {
    console.error('[API DVF CodePostal] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données DVF' },
      { status: 500 }
    )
  }
}
