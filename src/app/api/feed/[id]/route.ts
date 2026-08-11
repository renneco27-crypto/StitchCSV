import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase()
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase()
    const { id } = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: deck } = await supabase
      .from('decks')
      .select('device_id')
      .eq('id', id)
      .single()

    if (!deck) return NextResponse.json({ error: 'Deck not found' }, { status: 404 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isOwner = deck.device_id === user.id
    const isAdmin = profile?.role === 'admin'
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await supabase.from('decks').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('feed/[id] delete error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete deck' },
      { status: 500 }
    )
  }
}
