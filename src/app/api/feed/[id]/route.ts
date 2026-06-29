import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data, error } = await supabase
      .from('decks')
      .select('id, title, subject, csv_content, author_name, published_at, download_count')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    await supabase
      .from('decks')
      .update({ download_count: (data.download_count ?? 0) + 1 })
      .eq('id', id)

    return NextResponse.json(data)
  } catch (err) {
    console.error('feed/[id] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load deck' },
      { status: 500 }
    )
  }
}
