'use client'

import { useEffect, useState } from 'react'

type Doc = {
  id: string
  title: string
  content: string
  source: string
  created_at: string
}

export default function DocumentList({ refreshKey = 0 }: { refreshKey?: number }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/documents', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data = await res.json()
      setDocs(data.documents || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, [refreshKey])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">アップロード済みドキュメント</h3>
        <button onClick={fetchDocs} className="text-sm px-3 py-1 rounded border hover:bg-gray-50">更新</button>
      </div>

      {loading && <div className="text-sm text-gray-500">読み込み中...</div>}
      {error && <div className="text-sm text-red-600">エラー: {error}</div>}

      {!loading && !error && docs.length === 0 && (
        <div className="text-sm text-gray-500">ドキュメントはまだありません。</div>
      )}

      <ul className="space-y-3">
        {docs.map(doc => (
          <li key={doc.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 shadow">
            <div className="flex items-center justify-between">
              <div className="font-medium text-gray-900">{doc.title}</div>
              <div className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleString('ja-JP')}</div>
            </div>
            <div className="text-xs text-gray-600 mt-1">カテゴリ: {doc.source}</div>
            <div className="text-sm text-gray-700 mt-2 line-clamp-3 whitespace-pre-wrap">
              {doc.content.length > 240 ? doc.content.slice(0, 240) + '…' : doc.content}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
