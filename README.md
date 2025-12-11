# Chat Bot (Next.js + Supabase + Gemini)

エンタープライズ向けのRAGチャットボットです。Next.js(App Router) と Supabase(pgvector) を用いたドキュメント検索、Google Gemini API を用いた回答生成に対応します。通常チャットとRAGの切替、テキスト文書アップロード・一覧、Markdownレンダリング、画像添付によるマルチモーダル入力を備えています。

## 主な機能
- RAGモード: 社内文書を検索して回答を生成（pgvector/類似検索）
- 通常チャット: 一般的な生成AIとして回答
- モデル切替: Gemini（gemini-2.5-flash） / Gemma3（gemma3:4b, Ollama ローカル）
  - Gemini: テキスト + 画像入力に対応
  - Gemma3: テキストのみ対応（画像の添付および画像に関する質問はできません）
- モード切替: rag / direct / upload / docs
- 文書管理: テキスト文書のアップロード、一覧閲覧（モーダル表示）
- マルチモーダル: 画像の添付と質問（Gemini 2.5 Flash, direct モード時のみ）

## 技術スタック
- Web: Next.js 15 (App Router) / React 19 / TypeScript / Tailwind CSS 4
- DB: Supabase (PostgreSQL + pgvector)
- LLM:
  - Google Gemini API
    - 生成: `gemini-2.5-flash`
    - 埋め込み: `text-embedding-004`
  - Ollama（ローカル）
    - 生成: `gemma3:4b`（OpenAI 互換エンドポイント経由）

## セットアップ
### 前提
- Node.js 18+
- Supabase プロジェクト（pgvector 有効）
- Google AI Studio  Gemini API Key

### 1) 依存関係のインストール
```powershell
npm install
```

### 2) 環境変数の設定
プロジェクト直下に `.env.local` を作成し、以下を設定してください。
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

## 実行方法
開発サーバー:
```powershell
npm run dev
```
ビルド/本番起動:
```powershell
npm run build
npm start
```

## 使い方
- 画面右上の「モード」で以下を切替
  - RAG（文書検索）: 社内文書に基づいた回答
  - 通常チャット: 一般的な生成AI
  - 文書管理: テキスト文書を追加
  - 一覧を見る: 登録済み文書の一覧/内容表示
- 入力欄
  - Enter: 送信 / Shift+Enter: 改行
  - 画像ボタン: 画像を複数添付して質問可能（テキスト無しでも送信可）
  - 送信後はプレビューがクリアされます
- プレースホルダーメッセージ
  - 未入力時のみ、RAG:「社内文書を検索できます」/ 通常:「通常の生成AIです」を表示
  - 入力開始または送信すると非表示
- モード切替
  - 既存のチャットメッセージは表示しない（履歴をクリア）

## API 概要
- POST `/api/chat`（RAG）
  - Request: `{ question, sessionId, chatHistory?, images? }`
  - Response: `{ answer, relevantDocuments }`
- POST `/api/simple-chat`（通常）
  - Request: `{ question, sessionId, chatHistory?, images? }`
  - Response: `{ answer, mode: 'direct' }`
- GET/POST `/api/documents`
  - POST: `{ title, content, source? }`（サーバーで埋め込み生成）
  - GET: 文書一覧
  - PUT: 既存の埋め込み再生成（全件）
- POST `/api/init` サンプル文書投入
- GET `/api/status` DBや関数の疎通確認
- GET `/api/models` モデル情報の簡易表示
