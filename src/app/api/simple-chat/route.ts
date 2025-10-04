import { NextRequest, NextResponse } from 'next/server'
import { generateDirectAnswer } from '@/lib/gemini'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { question, sessionId, chatHistory = [] } = await request.json()

  if (!question || typeof question !== 'string') {
    return NextResponse.json(
      { error: 'Question is required' },
      { status: 400 }
    )
  }

  const answer = await generateDirectAnswer(question, chatHistory)

  await supabaseAdmin
    .from('chat_history')
    .insert({
      session_id: sessionId,
      question,
      answer,
      relevant_documents: { mode: 'direct' }
    })

  return NextResponse.json({
    answer,
    mode: 'direct'
  })
}
