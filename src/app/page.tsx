import ChatInterface from '@/components/ChatInterface'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 p-0">
        <div className="h-full">
          <ChatInterface />
        </div>
      </main>
    </div>
  )
}
