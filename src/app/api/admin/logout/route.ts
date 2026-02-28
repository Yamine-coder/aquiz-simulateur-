import { COOKIE_NAME } from '@/lib/adminJwt'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/logout
 * 
 * Supprime le cookie admin_token.
 */
export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0, // Expiration immédiate
  })
  return response
}
