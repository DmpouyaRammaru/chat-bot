# データベースセットアップ手順

## 1. Supabaseでの必須SQL実行

Supabaseプロジェクトの「SQL Editor」で以下のSQLを実行してください：

```sql
-- pgvector拡張を有効にする
CREATE EXTENSION IF NOT EXISTS vector;

-- documents テーブル: ナレッジベース文書を格納
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- Gemini Embedding API の次元数に合わせて調整
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- chat_history テーブル: チャット履歴を格納
CREATE TABLE chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  relevant_documents JSONB, -- 関連ドキュメントの情報を格納
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- embedding列にインデックスを作成（類似検索を高速化）
CREATE INDEX documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops);

-- セッションIDでの検索を高速化
CREATE INDEX chat_history_session_id_idx ON chat_history (session_id);
CREATE INDEX chat_history_created_at_idx ON chat_history (created_at DESC);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security (RLS) を有効にする
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- 認証されたユーザーがすべての操作を実行できるポリシー
CREATE POLICY "Enable all operations for authenticated users" ON documents
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON chat_history
FOR ALL USING (auth.role() = 'authenticated');

-- サービスロールキーでの操作を許可
CREATE POLICY "Enable all operations for service role" ON documents
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all operations for service role" ON chat_history
FOR ALL USING (auth.role() = 'service_role');
```

## 2. 検索用関数の作成（オプション）

ベクトル検索の最適化のため、以下の関数も作成してください：

```sql
-- 検索用のSQL関数を作成
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN query
  SELECT
    documents.id,
    documents.title,
    documents.content,
    documents.source,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE documents.embedding IS NOT NULL
  AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## 3. 現在の問題と解決手順

### 問題
- `documents`と`chat_history`テーブルが存在しない
- `match_documents`関数が定義されていない

### 解決手順
1. 上記のSQLをSupabaseで実行
2. http://localhost:3000/api/init にPOSTリクエストでサンプルデータを初期化
3. アプリケーションをテスト

### テスト方法
```bash
# 1. データベース状態確認
curl http://localhost:3000/api/status

# 2. サンプルデータ初期化（テーブル作成後）
curl -X POST http://localhost:3000/api/init

# 3. チャットテスト
# ブラウザで http://localhost:3000 にアクセスして質問
```
