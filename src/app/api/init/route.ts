import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/gemini'

export async function POST() {
  const { error: testError } = await supabaseAdmin
    .from('documents')
    .select('id')
    .limit(1)

  if (testError) {
    return NextResponse.json({
      error: 'データベーステーブルが見つかりません',
      message: 'Supabaseで以下のSQLスキーマを実行してください:',
      sql_schema_needed: 'supabase-schema.sql',
      details: testError.message
    }, { status: 400 })
  }
  
  const sampleDocuments = [
    {
      title: '勤務時間について',
      content: '通常勤務時間は平日9:00-18:00です。フレックスタイム制度もあり、コアタイムは10:00-15:00です。リモートワークも週3日まで可能です。',
      source: 'FAQ'
    },
    {
      title: '有給休暇の取得方法',
      content: '有給休暇は入社6ヶ月後から取得可能です。申請は勤怠システムから最低3日前までに行ってください。年末年始やGWなどの繁忙期は事前相談が必要です。',
      source: 'FAQ'
    },
    {
      title: '経費精算について',
      content: '経費精算は月末締めで翌月25日支払いです。領収書は必ず保管し、精算システムに画像をアップロードしてください。交通費は定期券区間外のみ申請可能です。',
      source: 'FAQ'
    }
  ]

  let successCount = 0
  const errors: string[] = []

  for (const doc of sampleDocuments) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('documents')
        .select('id')
        .eq('title', doc.title)
        .single()

      if (existing) {
        continue
      }

      const embedding = await generateEmbedding(doc.content)

      const { error } = await supabaseAdmin
        .from('documents')
        .insert({
          title: doc.title,
          content: doc.content,
          source: doc.source,
          embedding
        })

      if (!error) {
        successCount++
      }

      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      const errorMsg = `Failed to add "${doc.title}": ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
    }
  }

  return NextResponse.json({
    message: `Initialization completed. ${successCount} documents added.`,
    successCount,
    errors: errors.length > 0 ? errors : undefined
  })
}
