import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  const { title, content, source } = await request.json()

  if (!title || !content) {
    return NextResponse.json(
      { error: 'Title and content are required' },
      { status: 400 }
    )
  }

  const embedding = await generateEmbedding(content)

  const { data } = await supabaseAdmin
    .from('documents')
    .insert({
      title,
      content,
      source: source || 'manual',
      embedding
    })
    .select()
    .single()

  return NextResponse.json({
    message: 'Document added successfully',
    document: data
  })
}

export async function GET() {
  const { data: documents } = await supabaseAdmin
    .from('documents')
    .select('id, title, content, source, created_at')
    .order('created_at', { ascending: false })

  return NextResponse.json({ documents })
}

export async function PUT(request: NextRequest) {
  const { regenerateAll } = await request.json()

  if (!regenerateAll) {
    return NextResponse.json(
      { error: 'regenerateAll flag is required' },
      { status: 400 }
    )
  }

  const { data: documents } = await supabaseAdmin
    .from('documents')
    .select('id, content')
    .is('embedding', null)

  if (!documents || documents.length === 0) {
    return NextResponse.json({
      message: 'No documents need embedding generation',
      updated: 0
    })
  }

  let updatedCount = 0

  for (const doc of documents) {
    try {
      const embedding = await generateEmbedding(doc.content)
      
      const { error: updateError } = await supabaseAdmin
        .from('documents')
        .update({ embedding })
        .eq('id', doc.id)

      if (!updateError) {
        updatedCount++
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    } catch {
      // Continue with next document on error
    }
  }

  return NextResponse.json({
    message: `Successfully updated ${updatedCount} documents`,
    updated: updatedCount,
    total: documents.length
  })
}
