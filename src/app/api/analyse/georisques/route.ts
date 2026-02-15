/**
 * API Route - Proxy Géorisques
 * Appelle l'API georisques.gouv.fr côté serveur
 */

import { NextRequest, NextResponse } from 'next/server'

// Route dynamique (appelée côté client)

interface RisqueNaturel {
  type: string
  niveau: string
  description: string
}

interface RisqueTechnologique {
  type: string
  niveau: string
  description: string
}

interface GASPARRisque {
  libelle_risque_jo?: string
  num_risque?: string
}

function determinerNiveau(risque: GASPARRisque): 'faible' | 'moyen' | 'fort' {
  // Logique simplifiée basée sur le code risque
  const numRisque = risque.num_risque || ''
  if (numRisque.includes('3') || numRisque.includes('4')) return 'fort'
  if (numRisque.includes('2')) return 'moyen'
  return 'faible'
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const rayon = searchParams.get('rayon') || '1000'
  
  if (!lat || !lon) {
    return NextResponse.json(
      { success: false, error: 'Coordonnées manquantes' },
      { status: 400 }
    )
  }
  
  try {
    // Appel API Géorisques
    const response = await fetch(
      `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${lat},${lon}&rayon=${rayon}`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (!response.ok) {
      // Retourner un résultat minimal par défaut
      return NextResponse.json({
        success: true,
        data: {
          risquesNaturels: [],
          risquesTechnologiques: [],
          zoneInondable: false,
          niveauRadon: null,
          scoreGlobal: 85,
          synthese: 'Données non disponibles - consultez georisques.gouv.fr'
        },
        source: 'Géorisques (fallback)'
      })
    }
    
    const result = await response.json()
    
    // Parser les résultats
    const risquesNaturels: RisqueNaturel[] = []
    const risquesTechnologiques: RisqueTechnologique[] = []
    let zoneInondable = false
    
    // Analyser les risques GASPAR
    if (result.data && Array.isArray(result.data)) {
      for (const risque of result.data) {
        const libelle = (risque.libelle_risque_jo?.toLowerCase() || '') as string
        
        if (libelle.includes('inondation')) {
          zoneInondable = true
          risquesNaturels.push({
            type: 'inondation',
            niveau: determinerNiveau(risque),
            description: risque.libelle_risque_jo || 'Risque d\'inondation'
          })
        }
        
        if (libelle.includes('mouvement') || libelle.includes('terrain')) {
          risquesNaturels.push({
            type: 'mouvement_terrain',
            niveau: determinerNiveau(risque),
            description: 'Mouvement de terrain'
          })
        }
        
        if (libelle.includes('séisme') || libelle.includes('sismique')) {
          risquesNaturels.push({
            type: 'seisme',
            niveau: determinerNiveau(risque),
            description: 'Zone sismique'
          })
        }
        
        if (libelle.includes('industriel') || libelle.includes('seveso')) {
          risquesTechnologiques.push({
            type: 'seveso',
            niveau: determinerNiveau(risque),
            description: 'Installation industrielle'
          })
        }
      }
    }
    
    // Calculer le score global (100 = sûr, 0 = très risqué)
    let scoreGlobal = 100
    scoreGlobal -= risquesNaturels.length * 10
    scoreGlobal -= risquesTechnologiques.length * 15
    if (zoneInondable) scoreGlobal -= 20
    scoreGlobal = Math.max(0, Math.min(100, scoreGlobal))
    
    // Générer la synthèse
    const totalRisques = risquesNaturels.length + risquesTechnologiques.length
    let synthese = '✅ Aucun risque majeur identifié'
    if (totalRisques > 0) {
      const alertes: string[] = []
      if (zoneInondable) alertes.push('Zone inondable')
      if (risquesNaturels.length > 0) alertes.push(`${risquesNaturels.length} risque(s) naturel(s)`)
      if (risquesTechnologiques.length > 0) alertes.push(`${risquesTechnologiques.length} risque(s) techno(s)`)
      synthese = '⚠️ ' + alertes.join(' • ')
    }
    
    return NextResponse.json({
      success: true,
      data: {
        risquesNaturels,
        risquesTechnologiques,
        zoneInondable,
        niveauRadon: null, // Simplification
        scoreGlobal,
        synthese
      },
      source: 'Géorisques'
    })
    
  } catch (error) {
    console.error('Erreur Géorisques proxy:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur de connexion' },
      { status: 500 }
    )
  }
}
