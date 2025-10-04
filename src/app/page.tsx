import ChatInterface from '@/components/ChatInterface'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold text-gray-900">AI チャットボット</h1>
            <div className="text-sm text-gray-500">RAG・通常チャット・文書管理機能を切り替えて利用できます</div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-2 sm:p-4 lg:p-6">
        <div className="h-full">
          <ChatInterface />
        </div>
      </main>
    </div>
  )
}
