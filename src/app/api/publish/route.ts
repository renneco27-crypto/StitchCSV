import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to publish' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('can_publish')
      .eq('id', user.id)
      .single()

    if (profile && !profile.can_publish) {
      return NextResponse.json({ error: 'Your account does not have publishing permission' }, { status: 403 })
    }

    const { title, subject, csvContent, authorName } = await request.json()

    if (!title || !csvContent) {
      return NextResponse.json({ error: 'Title and CSV content are required' }, { status: 400 })
    }

    const { data: existingDeck } = await supabase
      .from('decks')
      .select('id')
      .eq('title', title.trim())
      .single()

    if (existingDeck) {
      const { data, error } = await supabase
        .from('decks')
        .update({
          subject: subject || 'General',
          csv_content: csvContent,
          author_name: authorName || user.user_metadata?.display_name || user.email || 'Anonymous',
          device_id: user.id,
        })
        .eq('id', existingDeck.id)
        .select('id')
        .single()

      if (error) throw error

      return NextResponse.json({ id: data.id, updated: true })
    }

    const { data, error } = await supabase
      .from('decks')
      .insert({
        title,
        subject: subject || 'General',
        csv_content: csvContent,
        author_name: authorName || user.user_metadata?.display_name || user.email || 'Anonymous',
        device_id: user.id,
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