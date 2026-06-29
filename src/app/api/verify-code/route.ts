import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ valid: false, reason: 'Missing code' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .single()

    if (error || !data) {
      return NextResponse.json({ valid: false, reason: 'Invalid or expired code. Please contact the administrator.' })
    }

    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error('verify-code error:', err)
    return NextResponse.json({ valid: false, reason: 'Server error' }, { status: 500 })
  }
}
