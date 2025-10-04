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
  const [openDoc, setOpenDoc] = useState<Doc | null>(null)

  const categoryBadge = (source: string) => {
    const map: Record<string, string> = {
      manual: 'bg-blue-100 text-blue-700',
      FAQ: 'bg-green-100 text-green-700',
      '人事資料': 'bg-pink-100 text-pink-700',
      '業務手順書': 'bg-yellow-100 text-yellow-700',
      'セキュリティガイドライン': 'bg-red-100 text-red-700',
      '技術文書': 'bg-purple-100 text-purple-700',
      'その他': 'bg-gray-100 text-gray-700',
    }
    return map[source] ?? 'bg-gray-100 text-gray-700'
  }

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

  useEffect(() => {
    if (!openDoc) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDoc(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openDoc])

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
          <li key={doc.id}>
            <button
              onClick={() => setOpenDoc(doc)}
              className="w-full text-left border border-gray-200 rounded-lg p-3 bg-gray-50 shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">{doc.title}</div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded ${categoryBadge(doc.source)}`}>
                    {doc.source}
                  </span>
                  <div className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleString('ja-JP')}</div>
                </div>
              </div>
              <div className="text-sm text-gray-700 mt-2 line-clamp-3 whitespace-pre-wrap">
                {doc.content.length > 240 ? doc.content.slice(0, 240) + '…' : doc.content}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {openDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpenDoc(null)}>
          <div role="dialog" aria-modal="true" className="bg-white w-[92vw] max-w-2xl max-h-[80vh] rounded-lg shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="font-semibold text-gray-900 truncate pr-4">{openDoc.title}</h4>
              <button onClick={() => setOpenDoc(null)} className="text-gray-500 hover:text-gray-700 text-lg leading-none">✕</button>
            </div>
            <div className="px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
              <span>カテゴリ: {openDoc.source}</span>
              <span>{new Date(openDoc.created_at).toLocaleString('ja-JP')}</span>
            </div>
            <div className="px-4 pb-4 overflow-y-auto">
              <div className="whitespace-pre-wrap text-sm text-gray-800">{openDoc.content}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
