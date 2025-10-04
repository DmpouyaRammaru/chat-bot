# 社内ナレッジベース型チャットボット

Gemini API と Supabase (PostgreSQL + pgvector) を組み合わせた社内ナレッジベース型チャットボットです。
ユーザーが自然言語で質問すると、Supabase 上に保存されたドキュメント（FAQ、議事録、仕様書）から関連情報を検索し、Gemini API を使って自然言語でわかりやすい回答を生成します。

## 機能

- 🤖 自然言語でのチャット形式での質問・回答
- 🔍 pgvectorを使用したベクトル類似検索
- 📚 関連文書の表示と類似度の可視化
- 💬 チャット履歴の保存
- 📝 ドキュメントの動的追加・管理
- 🎯 文脈を考慮した対話型回答生成

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript, TailwindCSS
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL + pgvector)
- **AI**: Google Gemini API (text-embedding-004, gemini-1.5-flash)
- **パッケージ管理**: npm

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルに以下の環境変数を設定してください：

```env
NODE_ENV="development"
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Supabaseデータベースの設定

1. Supabaseプロジェクトを作成
2. SQL Editorで `supabase-schema.sql` の内容を実行
3. pgvector拡張が有効になっていることを確認

### 4. アプリケーションの起動

```bash
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## データベーススキーマ

### documents テーブル
```sql
- id: UUID (主キー)
- title: TEXT (文書タイトル)
- content: TEXT (文書内容)
- embedding: vector(768) (ベクトル表現)
- source: TEXT (文書ソース)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### chat_history テーブル
```sql
- id: UUID (主キー)
- session_id: TEXT (セッションID)
- question: TEXT (質問)
- answer: TEXT (回答)
- relevant_documents: JSONB (関連文書情報)
- created_at: TIMESTAMP
```

## API エンドポイント

### チャット API
```
POST /api/chat
```

リクエストボディ:
```json
{
  "question": "質問内容",
  "sessionId": "セッションID",
  "chatHistory": [...]
}
```

### ドキュメント管理 API

#### ドキュメント追加
```
POST /api/documents
```

リクエストボディ:
```json
{
  "title": "文書タイトル",
  "content": "文書内容",
  "source": "文書ソース"
}
```

#### ドキュメント一覧取得
```
GET /api/documents
```

#### Embedding再生成
```
PUT /api/documents
```

リクエストボディ:
```json
{
  "regenerateAll": true
}
```

## 使用方法

### 1. 基本的なチャット
1. アプリケーションにアクセス
2. 質問入力フィールドに自然言語で質問を入力
3. 送信ボタンをクリック
4. AIが関連文書を検索し、回答を生成

### 2. ドキュメントの追加
Supabaseの管理画面から `documents` テーブルに直接データを追加するか、API経由で追加可能です。

```bash
# curlを使用した例
curl -X POST http://localhost:3000/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新しいFAQ",
    "content": "質問と回答の内容",
    "source": "FAQ"
  }'
```

### 3. Embeddingの再生成
新しく追加したドキュメントのembeddingを生成：

```bash
curl -X PUT http://localhost:3000/api/documents \
  -H "Content-Type: application/json" \
  -d '{"regenerateAll": true}'
```

## トラブルシューティング

### 1. Embeddingエラー
- Gemini APIキーが正しく設定されているか確認
- APIクォータ制限に達していないか確認

### 2. データベース接続エラー
- Supabase URL、キーが正しく設定されているか確認
- pgvector拡張が有効になっているか確認

### 3. 検索結果が表示されない
- ドキュメントのembeddingが生成されているか確認
- 類似度閾値が適切に設定されているか確認
