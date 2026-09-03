import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'
import { mergeDeckCsv } from '@/features/upload/csvParser'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to publish' }, { status: 401 })
    }

    const title = request.nextUrl.searchParams.get('title')?.trim()
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data: existingDeck } = await supabase
      .from('decks')
      .select('id')
      .eq('title', title)
      .maybeSingle()

    return NextResponse.json({ existing: Boolean(existingDeck?.id) })
  } catch (err) {
    console.error('publish check error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to check publish status' },
      { status: 500 }
    )
  }
}

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

    const { title, subject, csvContent, mode } = await request.json()
    const publishMode = mode === 'append' ? 'append' : 'overwrite'

    if (!title || !csvContent) {
      return NextResponse.json({ error: 'Title and CSV content are required' }, { status: 400 })
    }

    // Always use the server-side authenticated user name — never trust client input
    const authorName = user.user_metadata?.full_name
      || user.user_metadata?.display_name
      || user.email?.split('@')[0]
      || user.email
      || 'Unknown'

    const { data: existingDeck } = await supabase
      .from('decks')
      .select('id, csv_content')
      .eq('title', title.trim())
      .maybeSingle()

    if (existingDeck) {
      const nextCsv = publishMode === 'append' && existingDeck.csv_content
        ? mergeDeckCsv(existingDeck.csv_content, csvContent)
        : csvContent

      const { data, error } = await supabase
        .from('decks')
        .update({
          subject: subject || 'General',
          csv_content: nextCsv,
          author_name: authorName,
          device_id: user.id,
        })
        .eq('id', existingDeck.id)
        .select('id')
        .single()

      if (error) throw error

      return NextResponse.json({ id: data.id, updated: true, appended: publishMode === 'append' })
    }

    const { data, error } = await supabase
      .from('decks')
      .insert({
        title,
        subject: subject || 'General',
        csv_content: csvContent,
        author_name: authorName,
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