import { NextRequest, NextResponse } from 'next/server'
import { generateDirectAnswer, generateDirectAnswerWithImages, type InputImage } from '@/lib/gemini'
import { supabaseAdmin } from '@/lib/supabase'
import { ollamaChat, type ModelType } from '@/lib/ollama'

export async function POST(request: NextRequest) {
  const { question, sessionId, chatHistory = [], images = [], modelType = 'gemini' } = await request.json()

  if (!question || typeof question !== 'string') {
    return NextResponse.json(
      { error: 'Question is required' },
      { status: 400 }
    )
  }
  const hasImages = Array.isArray(images) && images.length > 0

  let answer: string

  if ((modelType as ModelType) === 'ollama') {
    // Ollama側は現状テキストのみ対応（画像は無視）
    const historyMessages = Array.isArray(chatHistory)
      ? chatHistory.map((h: { question?: string; answer?: string }) => [
          h.question && { role: 'user' as const, content: h.question },
          h.answer && { role: 'assistant' as const, content: h.answer },
        ])
      : []

    const flatMessages = historyMessages.flat().filter(Boolean) as {
      role: 'user' | 'assistant'
      content: string
    }[]

    const messagesForOllama = [
      {
        role: 'system' as const,
        content:
          'あなたは日本語で丁寧に回答するアシスタントです。必要に応じて箇条書きやコードブロックも使って、分かりやすく説明してください。',
      },
      ...flatMessages,
      { role: 'user' as const, content: question },
    ]

    answer = await ollamaChat(messagesForOllama)
  } else {
    answer = hasImages
      ? await generateDirectAnswerWithImages(
          question,
          images.filter(Boolean).map((img: InputImage) => ({ mimeType: img.mimeType, data: img.data })),
          chatHistory
        )
      : await generateDirectAnswer(question, chatHistory)
  }

  await supabaseAdmin
    .from('chat_history')
    .insert({
      session_id: sessionId,
      question,
      answer,
  relevant_documents: { mode: 'direct', images: hasImages ? (images as InputImage[]).map((i) => ({ mimeType: i.mimeType })) : [] }
    })

  return NextResponse.json({
    answer,
    mode: 'direct'
  })
}
