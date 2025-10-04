import { NextRequest, NextResponse } from 'next/server'
import { generateDirectAnswer, generateDirectAnswerWithImages, type InputImage } from '@/lib/gemini'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { question, sessionId, chatHistory = [], images = [] } = await request.json()

  if (!question || typeof question !== 'string') {
    return NextResponse.json(
      { error: 'Question is required' },
      { status: 400 }
    )
  }

  const hasImages = Array.isArray(images) && images.length > 0
  const answer = hasImages
    ? await generateDirectAnswerWithImages(
        question,
        images.filter(Boolean).map((img: InputImage) => ({ mimeType: img.mimeType, data: img.data })),
        chatHistory
      )
    : await generateDirectAnswer(question, chatHistory)

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
