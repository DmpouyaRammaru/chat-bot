import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data: documents, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id, title, source, created_at, embedding')
    .order('created_at', { ascending: false })

  const { data: chatHistory, error: chatError } = await supabaseAdmin
    .from('chat_history')
    .select('id, session_id, question, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  let functionsAvailable = false
  try {
    await supabaseAdmin.rpc('match_documents', {
      query_embedding: new Array(768).fill(0),
      match_threshold: 0.1,
      match_count: 1
    })
    functionsAvailable = true
  } catch {
    functionsAvailable = false
  }

  return NextResponse.json({
    database_status: 'connected',
    documents: {
      count: documents?.length || 0,
      has_embeddings: documents?.filter(d => d.embedding !== null).length || 0,
      sample: documents?.slice(0, 3).map(d => ({
        id: d.id,
        title: d.title,
        source: d.source,
        has_embedding: d.embedding !== null
      }))
    },
    chat_history: {
      count: chatHistory?.length || 0
    },
    functions: {
      match_documents_available: functionsAvailable
    },
    errors: {
      documents: docError ? docError.message : null,
      chat_history: chatError ? chatError.message : null
    }
  })
}
