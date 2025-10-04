import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { title, content, source } = await request.json()

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // コンテンツをベクトル化
    const embedding = await generateEmbedding(content)

    // ドキュメントをデータベースに保存
    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        title,
        content,
        source: source || 'manual',
        embedding
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Document added successfully',
      document: data
    })

  } catch (error) {
    console.error('Document API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('id, title, content, source, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    return NextResponse.json({ documents })

  } catch (error) {
    console.error('Document fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 既存のドキュメントのembeddingを再生成するためのユーティリティ
export async function PUT(request: NextRequest) {
  try {
    const { regenerateAll } = await request.json()

    if (!regenerateAll) {
      return NextResponse.json(
        { error: 'regenerateAll flag is required' },
        { status: 400 }
      )
    }

    // embedding が null のドキュメントを取得
    const { data: documents, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('id, content')
      .is('embedding', null)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        message: 'No documents need embedding generation',
        updated: 0
      })
    }

    let updatedCount = 0

    // 各ドキュメントのembeddingを生成
    for (const doc of documents) {
      try {
        const embedding = await generateEmbedding(doc.content)
        
        const { error: updateError } = await supabaseAdmin
          .from('documents')
          .update({ embedding })
          .eq('id', doc.id)

        if (updateError) {
          console.error(`Failed to update document ${doc.id}:`, updateError)
        } else {
          updatedCount++
        }

        // APIレート制限を避けるため少し待機
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (embeddingError) {
        console.error(`Failed to generate embedding for document ${doc.id}:`, embeddingError)
      }
    }

    return NextResponse.json({
      message: `Successfully updated ${updatedCount} documents`,
      updated: updatedCount,
      total: documents.length
    })

  } catch (error) {
    console.error('Embedding regeneration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
