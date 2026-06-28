import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { title, subject, csvContent, authorName, deviceId } = await request.json()

    if (!title || !csvContent) {
      return NextResponse.json({ error: 'Title and CSV content are required' }, { status: 400 })
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
