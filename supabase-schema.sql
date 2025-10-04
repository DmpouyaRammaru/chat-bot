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

-- サンプルFAQデータを挿入
INSERT INTO documents (title, content, source) VALUES
('勤務時間について', '通常勤務時間は平日9:00-18:00です。フレックスタイム制度もあり、コアタイムは10:00-15:00です。リモートワークも週3日まで可能です。', 'FAQ'),
('有給休暇の取得方法', '有給休暇は入社6ヶ月後から取得可能です。申請は勤怠システムから最低3日前までに行ってください。年末年始やGWなどの繁忙期は事前相談が必要です。', 'FAQ'),
('経費精算について', '経費精算は月末締めで翌月25日支払いです。領収書は必ず保管し、精算システムに画像をアップロードしてください。交通費は定期券区間外のみ申請可能です。', 'FAQ'),
('会議室の予約方法', '会議室の予約はOutlookまたは専用システムから行えます。30分単位での予約が可能で、最大2週間先まで予約できます。キャンセルは24時間前までにお願いします。', 'FAQ'),
('IT機器の貸出について', 'ノートPC、モニター、ヘッドセットなどの貸出を行っています。申請はIT部門まで。返却時は初期化を忘れずに行ってください。', 'FAQ'),
('新入社員研修について', '新入社員研修は入社後1ヶ月間実施されます。ビジネスマナー、システム操作、業務内容について学習します。メンター制度もあり、先輩社員がサポートします。', '人事資料'),
('セキュリティポリシー', 'パスワードは英数字記号を含む12文字以上で設定してください。社外からのアクセスにはVPN接続が必要です。USBメモリの使用は申請制です。', 'セキュリティガイドライン'),
('プロジェクト管理ツール', '当社ではJiraとConfluenceを使用してプロジェクト管理を行います。タスクの進捗は毎日更新し、週次でレポートを提出してください。', '業務手順書');

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
