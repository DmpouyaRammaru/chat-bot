import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

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
