import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('decks')
      .select('id, title, subject, author_name, published_at, download_count')
      .order('published_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error('feed error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load feed' },
      { status: 500 }
    )
  }
}
