import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
export const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
export const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

export type InputImage = { mimeType: string; data: string }

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(text)
    return result.embedding.values
  } catch (error) {
    return new Array(768).fill(0).map(() => Math.random() * 0.01)
  }
}

export async function generateDirectAnswer(
  question: string,
  chatHistory: Array<{ question: string; answer: string }> = []
): Promise<string> {
  try {
    const historyContext = chatHistory.length > 0
      ? chatHistory
          .slice(-3)
          .map((item, index) => `${index + 1}. Q: ${item.question}\n   A: ${item.answer}`)
          .join('\n\n')
      : ''

    const prompt = `あなたは親切で知識豊富なAIアシスタントです。ユーザーの質問に対して、適切で役立つ回答をしてください。

${historyContext ? `## 会話履歴:\n${historyContext}\n` : ''}

## 現在の質問:
${question}

回答:`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    void error
    return '申し訳ございませんが、現在AIサービスに問題が発生しています。'
  }
}

export async function generateDirectAnswerWithImages(
  question: string,
  images: InputImage[],
  chatHistory: Array<{ question: string; answer: string }> = []
): Promise<string> {
  try {
    const historyContext = chatHistory.length > 0
      ? chatHistory
          .slice(-3)
          .map((item, index) => `${index + 1}. Q: ${item.question}\n   A: ${item.answer}`)
          .join('\n\n')
      : ''

    const prompt = `あなたは親切で知識豊富なAIアシスタントです。以下の画像も参考にしながら、ユーザーの質問に対して、適切で役立つ回答をしてください。\n\n${historyContext ? `## 会話履歴:\n${historyContext}\n` : ''}\n## 現在の質問:\n${question}\n\n回答:`

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }]
    for (const img of images) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } })
    }

  const input = parts as Parameters<typeof model.generateContent>[0]
  const result = await model.generateContent(input)
    const response = await result.response
    return response.text()
  } catch (error) {
    void error
    return '申し訳ございませんが、現在AIサービスに問題が発生しています。'
  }
}

export async function generateAnswer(
  question: string,
  relevantDocuments: Array<{ title: string; content: string; source: string }>
): Promise<string> {
  try {
    const context = relevantDocuments
      .map(doc => `【${doc.title}】(${doc.source})\n${doc.content}`)
      .join('\n\n')

    const prompt = `あなたは社内ナレッジベースの専門アシスタントです。以下の関連文書を参考にして、ユーザーの質問に正確で親切な回答をしてください。

## 関連文書:
${context}

## ユーザーの質問:
${question}

回答:`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    void error
    return '申し訳ございませんが、現在AIサービスに問題が発生しています。'
  }
}

export async function generateContextualAnswer(
  question: string,
  relevantDocuments: Array<{ title: string; content: string; source: string }>,
  chatHistory: Array<{ question: string; answer: string }> = []
): Promise<string> {
  try {
    const context = relevantDocuments
      .map(doc => `【${doc.title}】(${doc.source})\n${doc.content}`)
      .join('\n\n')

    const historyContext = chatHistory.length > 0
      ? chatHistory
          .slice(-3)
          .map((item, index) => `${index + 1}. Q: ${item.question}\n   A: ${item.answer}`)
          .join('\n\n')
      : ''

    const prompt = `あなたは社内ナレッジベースの専門アシスタントです。以下の関連文書と会話履歴を参考にして、ユーザーの質問に正確で親切な回答をしてください。

## 関連文書:
${context}

${historyContext ? `## 会話履歴:\n${historyContext}\n` : ''}

## 現在の質問:
${question}

回答:`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    void error
    return '申し訳ございませんが、現在AIサービスに問題が発生しています。'
  }
}

export async function generateContextualAnswerWithImages(
  question: string,
  relevantDocuments: Array<{ title: string; content: string; source: string }>,
  images: InputImage[],
  chatHistory: Array<{ question: string; answer: string }> = []
): Promise<string> {
  try {
    const context = relevantDocuments
      .map(doc => `【${doc.title}】(${doc.source})\n${doc.content}`)
      .join('\n\n')

    const historyContext = chatHistory.length > 0
      ? chatHistory
          .slice(-3)
          .map((item, index) => `${index + 1}. Q: ${item.question}\n   A: ${item.answer}`)
          .join('\n\n')
      : ''

    const prompt = `あなたは社内ナレッジベースの専門アシスタントです。以下の関連文書と会話履歴、添付画像を参考にして、ユーザーの質問に正確で親切な回答をしてください。\n\n## 関連文書:\n${context}\n\n${historyContext ? `## 会話履歴:\n${historyContext}\n` : ''}\n## 現在の質問:\n${question}\n\n回答:`

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }]
    for (const img of images) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } })
    }

  const input = parts as Parameters<typeof model.generateContent>[0]
  const result = await model.generateContent(input)
    const response = await result.response
    return response.text()
  } catch (error) {
    return '申し訳ございませんが、現在AIサービスに問題が発生しています。'
  }
}
