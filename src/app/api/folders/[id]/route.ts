import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase()
    const { id } = await params

    const { error } = await supabase
      .from('feed_folders')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('delete folder error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete folder' },
      { status: 500 }
    )
  }
}