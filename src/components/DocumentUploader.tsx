'use client'

import { useState } from 'react'

interface DocumentUploaderProps {
  onUploadSuccess: (document: { title: string }) => void
}

export default function DocumentUploader({ onUploadSuccess }: DocumentUploaderProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [source, setSource] = useState('manual')
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !content.trim()) {
      setMessage({ type: 'error', text: 'タイトルと内容を入力してください' })
      return
    }

    setIsUploading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          source
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'アップロードに失敗しました')
      }

      onUploadSuccess({ title })
      setMessage({ type: 'success', text: `ドキュメント「${title}」をアップロードしました` })
      
      setTitle('')
      setContent('')
      setSource('manual')

    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'アップロードエラーが発生しました' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          📄 社内ドキュメント追加
        </h3>
        <p className="text-sm text-gray-600">
          新しい社内ドキュメントを追加して、RAGモードで検索可能にします
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            ドキュメントタイトル *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：新入社員研修について"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isUploading}
            required
          />
        </div>

        <div>
          <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
            カテゴリ
          </label>
          <select
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isUploading}
          >
            <option value="manual">手動入力</option>
            <option value="FAQ">FAQ</option>
            <option value="人事資料">人事資料</option>
            <option value="業務手順書">業務手順書</option>
            <option value="セキュリティガイドライン">セキュリティガイドライン</option>
            <option value="技術文書">技術文書</option>
            <option value="その他">その他</option>
          </select>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            ドキュメント内容 *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="ドキュメントの内容を入力してください..."
            rows={8}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            disabled={isUploading}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isUploading || !title.trim() || !content.trim()}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              アップロード中...
            </>
          ) : (
            '📄 ドキュメントを追加'
          )}
        </button>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 使い方のヒント</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 明確で検索しやすいタイトルを付けてください</li>
          <li>• 内容は具体的で詳細に記述してください</li>
          <li>• 追加後、RAGモードで関連質問ができるようになります</li>
          <li>• 自動的にベクトル化され、類似検索に使用されます</li>
        </ul>
      </div>
    </div>
  )
}
