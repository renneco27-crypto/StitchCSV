import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')
    const sort = searchParams.get('sort') || 'newest'

    let query = supabase
      .from('decks')
      .select('id, title, subject, author_name, published_at, download_count', { count: 'exact' })
      .is('folder_id', null)

    if (subject && subject !== 'all') {
      query = query.eq('subject', subject)
    }

    if (sort === 'popular') {
      query = query.order('download_count', { ascending: false })
    }
    query = query.order('published_at', { ascending: false })

    query = query.limit(100)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({ decks: data, total: count })
  } catch (err) {
    console.error('feed error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load feed' },
      { status: 500 }
    )
  }
}
