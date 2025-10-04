# Chat Bot (Next.js + Supabase + Gemini)

エンタープライズ向けのRAGチャットボットです。Next.js(App Router) と Supabase(pgvector) を用いたドキュメント検索、Google Gemini API を用いた回答生成に対応します。通常チャットとRAGの切替、テキスト文書アップロード・一覧、Markdownレンダリング、画像添付によるマルチモーダル入力を備えています。

## 主な機能
- RAGモード: 社内文書を検索して回答を生成（pgvector/類似検索）
- 通常チャット: 一般的な生成AIとして回答
- モード切替: rag / direct / upload / docs
- 文書管理: テキスト文書のアップロード、一覧閲覧（モーダル表示）
- マルチモーダル: 画像の添付と質問（Gemini 2.5 Flash）
- Markdown対応: 箇条書き・表・コードブロックなどを表示
- 使いやすいUI: 上部にモード切替、下部に固定入力欄、Shift+Enterで改行/Enterで送信
- 履歴クリア: モード切替時はメッセージを非表示に（受信待ちレスポンスもガード）

## 技術スタック
- Web: Next.js 15 (App Router) / React 19 / TypeScript / Tailwind CSS 4
- DB: Supabase (PostgreSQL + pgvector)
- LLM: Google Gemini API
  - 生成: `gemini-2.5-flash`
  - 埋め込み: `text-embedding-004`

## セットアップ
### 前提
- Node.js 18+（推奨 LTS）
- Supabase プロジェクト（pgvector 有効）
- Google AI Studio で Gemini API Key

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

- SERVICE_ROLE_KEY はサーバーサイド(API Routes)のみで使用されます。クライアントに露出しないようにしてください。

### 3) データベース（最小スキーマ）
pgvector拡張とテーブル作成例です。既に作成済みならスキップ可。RPCが未定義でも本アプリはフォールバック検索で動作します。

```sql
-- pgvector
create extension if not exists vector;

-- 文書テーブル
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  source text,
  embedding vector(768),
  created_at timestamp with time zone default now()
);

-- チャット履歴
create table if not exists chat_history (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  question text not null,
  answer text not null,
  relevant_documents jsonb,
  created_at timestamp with time zone default now()
);

-- （任意）最近傍検索RPC
-- クエリ埋め込み(query_embedding)に対し、類似文書を返す関数
-- 例: match_documents(query_embedding vector(768), match_threshold float, match_count int)
```

サンプルデータ投入は以下で可能です:
```powershell
curl -X POST http://localhost:3000/api/init
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

## 設計ノート
- RAG 検索
  - `match_documents` RPC があれば利用、無ければ全文走査＋簡易スコアでフォールバック
- 生成まわり
  - 生成: `gemini-2.5-flash`
  - 画像は `inlineData` として送信し、テキストと併せて回答生成
- セキュリティ/運用
  - APIキーは `.env.local` に保管し、リポジトリへコミットしないこと
  - サービスロールキーはクライアントに露出させない
  - 外部LLMに送る情報の機微性を確認（PII/機密情報の取り扱い）

## トラブルシュート
- 「データベーステーブルが見つかりません」
  - `documents` / `chat_history` が未作成。上記スキーマを適用し、`/api/init` を実行
- 類似検索が0件になる
  - 埋め込み未生成の可能性。`/api/documents` の `PUT` で再生成
- 画像添付時のエラー
  - 大容量画像は送信サイズに注意。必要ならサイズ上限や枚数制限を導入
- Next.js の `<img>` 警告
  - プレビュー最適化には `next/image` の使用を検討

## ライセンス
本リポジトリのライセンスは未指定です。社内利用を前提としています。必要に応じてライセンス文言を追加してください。

---
何か不明点や追加要望（例: 画像削除ボタン、next/image への置換、テスト追加など）があればIssueでお知らせください。
