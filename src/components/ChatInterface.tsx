'use client'

import { useState, useRef, useEffect } from 'react'
import DocumentUploader from './DocumentUploader'

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  relevantDocs?: Array<{
    title: string
    source: string
    similarity: number
  }>
  mode?: 'rag' | 'direct' | 'upload'
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'こんにちは！チャットボットです。RAGモード（社内文書検索）と通常チャットモードを切り替えることができます。',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatMode, setChatMode] = useState<'rag' | 'direct' | 'upload'>('rag')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [sessionId] = useState(() => Math.random().toString(36).substring(7))

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const apiEndpoint = chatMode === 'rag' ? '/api/chat' : '/api/simple-chat'
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content,
          sessionId: sessionId,
          chatHistory: messages
            .filter(m => m.type !== 'bot' || !m.content.includes('こんにちは！'))
            .slice(-6) // 直近6件の履歴
            .map(m => ({ question: m.type === 'user' ? m.content : '', answer: m.type === 'bot' ? m.content : '' }))
            .filter(m => m.question || m.answer)
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response not ok:', response.status, response.statusText, errorText)
        throw new Error(`サーバーエラーが発生しました (${response.status}): ${response.statusText}`)
      }

      const data = await response.json()

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.answer,
        timestamp: new Date(),
        relevantDocs: chatMode === 'rag' ? data.relevantDocuments : undefined,
        mode: chatMode
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const handleUploadSuccess = (message: string) => {
    const successMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: `✅ ${message}\n\nRAGモードに切り替えて、アップロードしたドキュメントを検索してみてください。`,
      timestamp: new Date(),
      mode: 'upload'
    }
    setMessages(prev => [...prev, successMessage])
  }

  const handleUploadError = (error: string) => {
    const errorMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: `❌ エラー: ${error}`,
      timestamp: new Date(),
      mode: 'upload'
    }
    setMessages(prev => [...prev, errorMessage])
  }

  return (
    <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
      {/* モード切り替えヘッダー */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">チャットボット</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">モード:</span>
            <div className="relative">
              <select
                value={chatMode}
                onChange={(e) => {
                  setChatMode(e.target.value as 'rag' | 'direct')
                  setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    type: 'bot',
                    content: e.target.value === 'rag' 
                      ? 'RAGモードに切り替えました。社内文書を検索して回答します。'
                      : e.target.value === 'direct'
                      ? '通常チャットモードに切り替えました。一般的な質問にお答えします。'
                      : 'ドキュメント管理モードに切り替えました。新しい社内文書を追加できます。',
                    timestamp: new Date(),
                    mode: e.target.value as 'rag' | 'direct' | 'upload'
                  }])
                }}
                className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rag">RAG（文書検索）</option>
                <option value="direct">通常チャット</option>
                <option value="upload">📄 文書管理</option>
              </select>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {chatMode === 'rag' 
            ? '📚 社内文書を検索して関連情報に基づいて回答します'
            : chatMode === 'direct'
            ? '💬 一般的な知識に基づいて直接回答します'
            : '📄 新しい社内文書を追加・管理します'
          }
        </div>
      </div>

      {/* コンテンツエリア */}
      {chatMode === 'upload' ? (
        <DocumentUploader 
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">{messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              } rounded-lg px-4 py-2`}
            >
              <div className="text-sm">{message.content}</div>
              <div
                className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {formatTime(message.timestamp)}
                {message.mode && message.type === 'bot' && (
                  <span className="ml-2 px-1 py-0.5 bg-opacity-20 bg-black rounded text-xs">
                    {message.mode === 'rag' ? 'RAG' : message.mode === 'direct' ? '通常' : '管理'}
                  </span>
                )}
              </div>
              
              {/* 関連ドキュメントの表示 */}
              {message.relevantDocs && message.relevantDocs.length > 0 && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                  <div className="font-semibold text-gray-700 mb-1">参考にした文書:</div>
                  {message.relevantDocs.map((doc, index) => (
                    <div key={index} className="text-gray-600">
                      • {doc.title} ({doc.source}) - 類似度: {(doc.similarity * 100).toFixed(1)}%
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 max-w-xs">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm">回答を生成中...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              chatMode === 'rag' 
                ? "社内文書に関する質問を入力してください..."
                : "何でもお聞きください..."
            }
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            送信
          </button>
        </div>
      </form>
        </>
      )}
    </div>
  )
}
