import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, type DocumentMatch } from '@/lib/supabase'
import { generateEmbedding, generateContextualAnswer, generateContextualAnswerWithImages, type InputImage } from '@/lib/gemini'

function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  if (normA === 0 || normB === 0) return 0
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function POST(request: NextRequest) {
  const { question, sessionId, chatHistory = [], images = [] } = await request.json()

  if (!question || typeof question !== 'string') {
    return NextResponse.json(
      { error: 'Question is required' },
      { status: 400 }
    )
  }

  const questionEmbedding = await generateEmbedding(question)

  let documents: DocumentMatch[] = []

  try {
    const { data } = await supabaseAdmin
      .rpc('match_documents', {
        query_embedding: questionEmbedding,
        match_threshold: 0.1,
        match_count: 5
      })
    documents = data as DocumentMatch[]
  } catch {
    const { data: basicData } = await supabaseAdmin
      .from('documents')
      .select('*')
      .limit(5)
    
    documents = (basicData || [])
      .filter(doc => doc.content && doc.content.toLowerCase().includes(question.toLowerCase()))
      .map(doc => ({
        id: doc.id,
        title: doc.title || 'Untitled',
        content: doc.content || '',
        source: doc.source || 'unknown',
        similarity: calculateCosineSimilarity(questionEmbedding, doc.embedding || [])
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
  }

  if (!documents || documents.length === 0) {
    const answer = '申し訳ございませんが、ご質問に関連する情報が見つかりませんでした。別の言葉で質問し直していただくか、より具体的な内容でお尋ねください。'
    
    await supabaseAdmin
      .from('chat_history')
      .insert({
        session_id: sessionId,
        question,
        answer,
        relevant_documents: []
      })

    return NextResponse.json({
      answer,
      relevantDocuments: []
    })
  }

  const hasImages = Array.isArray(images) && images.length > 0
  const answer = hasImages
    ? await generateContextualAnswerWithImages(
        question,
        documents.map(doc => ({
          title: doc.title,
          content: doc.content,
          source: doc.source || 'unknown'
        })),
        images.filter(Boolean).map((img: InputImage) => ({ mimeType: img.mimeType, data: img.data })),
        chatHistory
      )
    : await generateContextualAnswer(
        question,
        documents.map(doc => ({
          title: doc.title,
          content: doc.content,
          source: doc.source || 'unknown'
        })),
        chatHistory
      )

  await supabaseAdmin
    .from('chat_history')
    .insert({
      session_id: sessionId,
      question,
      answer,
  relevant_documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        source: doc.source,
        similarity: doc.similarity
  })),
  images: hasImages ? (images as InputImage[]).map((i) => ({ mimeType: i.mimeType })) : []
    })

  return NextResponse.json({
    answer,
    relevantDocuments: documents.map(doc => ({
      title: doc.title,
      source: doc.source || 'unknown',
      similarity: doc.similarity
    }))
  })
}
