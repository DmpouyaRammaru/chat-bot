import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// フロントエンド用のSupabaseクライアント
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// サーバーサイド用のSupabaseクライアント（Service Role Key使用）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// データベースの型定義
export interface Document {
  id: string
  title: string
  content: string
  embedding?: number[]
  source?: string
  created_at: string
  updated_at: string
}

export interface ChatHistory {
  id: string
  session_id: string
  question: string
  answer: string
  relevant_documents?: any
  created_at: string
}

export interface DocumentMatch {
  id: string
  title: string
  content: string
  source: string
  similarity: number
}
