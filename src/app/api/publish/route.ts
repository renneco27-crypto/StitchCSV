import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { title, subject, csvContent, authorName, deviceId, accessCode } = await request.json()

    if (!title || !csvContent) {
      return NextResponse.json({ error: 'Title and CSV content are required' }, { status: 400 })
    }

    if (accessCode) {
      const { data: codeData } = await supabase
        .from('access_codes')
        .select('active, can_publish, expires_at')
        .eq('code', accessCode.toUpperCase().trim())
        .single()

      if (!codeData || !codeData.active) {
        return NextResponse.json({ error: 'Access code is inactive or invalid' }, { status: 403 })
      }

      if (!codeData.can_publish) {
        return NextResponse.json({ error: 'This access code does not have publishing permission' }, { status: 403 })
      }

      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Access code has expired' }, { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('decks')
      .insert({
        title,
        subject: subject || 'General',
        csv_content: csvContent,
        author_name: authorName || 'Anonymous',
        device_id: deviceId || 'unknown',
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('publish error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to publish' },
      { status: 500 }
    )
  }
}
