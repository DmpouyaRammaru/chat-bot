import { NextRequest, NextResponse } from 'next/server'
import { generateDirectAnswer } from '@/lib/gemini'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { question, sessionId, chatHistory = [] } = await request.json()

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    // 通常のチャット回答を生成（RAGなし）
    const answer = await generateDirectAnswer(question, chatHistory)

    // チャット履歴を保存（通常モード）
    try {
      await supabaseAdmin
        .from('chat_history')
        .insert({
          session_id: sessionId,
          question,
          answer,
          relevant_documents: { mode: 'direct' } // 通常モードの識別子
        })
    } catch (dbError) {
      console.error('Failed to save chat history:', dbError)
      // データベースエラーでもレスポンスは正常に返す
    }

    return NextResponse.json({
      answer,
      mode: 'direct'
    })

  } catch (error) {
    console.error('Simple chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
