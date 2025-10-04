import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, type DocumentMatch } from '@/lib/supabase'
import { generateEmbedding, generateContextualAnswer } from '@/lib/gemini'

// コサイン類似度を計算する関数
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
  try {
    const { question, sessionId, chatHistory = [] } = await request.json()

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    // 1. ユーザーの質問をベクトル化
    const questionEmbedding = await generateEmbedding(question)

    // 2. 類似文書を検索
    let documents: DocumentMatch[] = []
    let searchError: any = null

    // まず関数を使った検索を試行
    try {
      const { data, error } = await supabaseAdmin
        .rpc('match_documents', {
          query_embedding: questionEmbedding,
          match_threshold: 0.1,
          match_count: 5
        })
      
      if (error) {
        throw error
      }
      documents = data as DocumentMatch[]
    } catch (error) {
      console.error('RPC function not available, falling back to manual search:', error)
      
      // 関数が利用できない場合は、直接SQLクエリを使用
      try {
        const { data, error: fallbackError } = await supabaseAdmin
          .from('documents')
          .select('id, title, content, source, embedding')
          .not('embedding', 'is', null)
        
        if (fallbackError) {
          throw fallbackError
        }

        // フォールバック検索が失敗した場合、基本的な検索を試行
        const { data: basicData, error: basicError } = await supabaseAdmin
          .from('documents')
          .select('*')
          .limit(5)
        
        if (basicError) {
          console.error('Basic search also failed:', basicError)
          // テーブルが存在しない場合、ダミーレスポンスを返す
          return NextResponse.json({
            answer: 'データベースの設定が完了していません。管理者にお問い合わせください。\n\n手順:\n1. Supabaseプロジェクトで提供されたsupabase-schema.sqlを実行してください\n2. /api/init エンドポイントでサンプルデータを初期化してください',
            relevantDocuments: []
          })
        }
        
        // embedding が無い場合の簡易検索
        documents = (basicData || [])
          .filter(doc => doc.content && doc.content.toLowerCase().includes(question.toLowerCase()))
          .map(doc => ({
            id: doc.id,
            title: doc.title || 'Untitled',
            content: doc.content || '',
            source: doc.source || 'unknown',
            similarity: 0.5 // 固定値
          }))
          .slice(0, 3)
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError)
        searchError = fallbackError
      }
    }

    if (searchError && documents.length === 0) {
      console.error('Document search error:', searchError)
      return NextResponse.json(
        { error: 'Failed to search documents' },
        { status: 500 }
      )
    }

    const relevantDocuments = documents

    // 関連文書が見つからない場合
    if (!relevantDocuments || relevantDocuments.length === 0) {
      const answer = '申し訳ございませんが、ご質問に関連する情報が見つかりませんでした。別の言葉で質問し直していただくか、より具体的な内容でお尋ねください。'
      
      // チャット履歴を保存
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

    // 3. Gemini APIで回答を生成
    const answer = await generateContextualAnswer(
      question,
      relevantDocuments.map(doc => ({
        title: doc.title,
        content: doc.content,
        source: doc.source || 'unknown'
      })),
      chatHistory
    )

    // 4. チャット履歴を保存
    const { error: insertError } = await supabaseAdmin
      .from('chat_history')
      .insert({
        session_id: sessionId,
        question,
        answer,
        relevant_documents: relevantDocuments.map(doc => ({
          id: doc.id,
          title: doc.title,
          source: doc.source,
          similarity: doc.similarity
        }))
      })

    if (insertError) {
      console.error('Failed to save chat history:', insertError)
      // エラーログは出すが、レスポンスは正常に返す
    }

    return NextResponse.json({
      answer,
      relevantDocuments: relevantDocuments.map(doc => ({
        title: doc.title,
        source: doc.source || 'unknown',
        similarity: doc.similarity
      }))
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
