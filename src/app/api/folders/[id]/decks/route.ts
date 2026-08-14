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
      .select('id, title, subject, author_name, published_at, download_count')
      .eq('folder_id', id)
      .order('published_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('get folder decks error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load folder decks' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase()
    const { id } = await params
    const { deckId } = await request.json()

    if (!deckId) {
      return NextResponse.json({ error: 'deckId is required' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to categorize' }, { status: 401 })
    }

    const { error, count } = await supabase
      .from('decks')
      .update({ folder_id: id }, { count: 'exact' })
      .eq('id', deckId)

    if (error) throw error
    if (count === 0) {
      return NextResponse.json({ error: 'Not authorized or deck not found' }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('add deck to folder error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add deck to folder' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase()
    const { id } = await params
    const { deckId } = await request.json()

    if (!deckId) {
      return NextResponse.json({ error: 'deckId is required' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to un-categorize' }, { status: 401 })
    }

    const { error, count } = await supabase
      .from('decks')
      .update({ folder_id: null }, { count: 'exact' })
      .eq('id', deckId)
      .eq('folder_id', id)

    if (error) throw error
    if (count === 0) {
      return NextResponse.json({ error: 'Not authorized or deck not found' }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('remove deck from folder error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to remove deck from folder' },
      { status: 500 }
    )
  }
}