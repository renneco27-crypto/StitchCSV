import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { code, deviceId } = await request.json()

    if (!code || !deviceId) {
      return NextResponse.json({ valid: false, reason: 'Missing code or device ID' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('access_codes')
      .select('id, code, active, used_by')
      .eq('code', code.toUpperCase().trim())
      .single()

    if (error || !data) {
      return NextResponse.json({ valid: false, reason: 'Invalid code' })
    }

    if (!data.active) {
      return NextResponse.json({ valid: false, reason: 'This code has been deactivated' })
    }

    if (!data.used_by) {
      await supabase
        .from('access_codes')
        .update({ used_by: deviceId, used_at: new Date().toISOString() })
        .eq('id', data.id)
    } else if (data.used_by !== deviceId) {
      return NextResponse.json({ valid: false, reason: 'This code is already in use on another device' })
    }

    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error('verify-code error:', err)
    return NextResponse.json({ valid: false, reason: 'Server error' }, { status: 500 })
  }
}
