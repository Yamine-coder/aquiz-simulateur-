/**
 * API Route - Géocodage adresse
 * Convertit une adresse en coordonnées lat/lon
 */

import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

// Route dynamique (appelée côté client)

export async function GET(request: NextRequest) {
  // ── Rate Limiting ─────────────────────────────────────
  const ip = getClientIP(request.headers)
  const rateCheck = checkRateLimit(`analyse:${ip}`, RATE_LIMITS.analyse)
  if (!rateCheck.success) {
    return NextResponse.json(
      { success: false, error: 'Trop de requêtes. Veuillez patienter.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
    )
  }
  const searchParams = request.nextUrl.searchParams
  const adresse = searchParams.get('adresse')
  const codePostal = searchParams.get('code_postal')
  
  if (!adresse && !codePostal) {
    return NextResponse.json(
      { success: false, error: 'Adresse ou code postal requis' },
      { status: 400 }
    )
  }
  
  try {
    const query = encodeURIComponent(`${adresse || ''} ${codePostal || ''}`.trim())
    
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${query}&limit=1`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'API Adresse non disponible' },
        { status: 502 }
      )
    }
    
    const result = await response.json()
    
    if (result.features && result.features.length > 0) {
      const [lon, lat] = result.features[0].geometry.coordinates
      const properties = result.features[0].properties
      
      return NextResponse.json({
        success: true,
        data: {
          lat,
          lon,
          label: properties.label,
          city: properties.city,
          postcode: properties.postcode
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Adresse non trouvée'
    })
    
  } catch (error) {
    console.error('Erreur géocodage:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur de connexion' },
      { status: 500 }
    )
  }
}
