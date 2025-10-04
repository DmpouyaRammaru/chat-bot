import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const getTextModel = () => {
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
}

const getEmbeddingModel = () => {
  return genAI.getGenerativeModel({ model: 'text-embedding-004' })
}

export const model = getTextModel()
export const embeddingModel = getEmbeddingModel()

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(text)
    return result.embedding.values
  } catch (error) {
    console.error('Embedding generation error:', error)
    // 代替手段として、ダミーのembeddingを生成
    console.warn('Using dummy embedding due to API error')
    return new Array(768).fill(0).map(() => Math.random() * 0.01)
  }
}

/**
 * 通常のチャット回答を生成する（RAGなし）
 */
export async function generateDirectAnswer(
  question: string,
  chatHistory: Array<{ question: string; answer: string }> = []
): Promise<string> {
  try {
    const historyContext = chatHistory.length > 0
      ? chatHistory
          .slice(-3) // 直近3件の履歴のみ使用
          .map((item, index) => `${index + 1}. Q: ${item.question}\n   A: ${item.answer}`)
          .join('\n\n')
      : ''

    const prompt = `
あなたは親切で知識豊富なAIアシスタントです。ユーザーの質問に対して、適切で役立つ回答をしてください。

${historyContext ? `## 会話履歴:\n${historyContext}\n` : ''}

## 現在の質問:
${question}

## 回答指針:
- 質問に対して正確で役立つ情報を提供してください
- 分からないことは正直に「分からない」と答えてください
- 丁寧で分かりやすい日本語で回答してください
- 会話履歴がある場合は、文脈を考慮して回答してください

回答:
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Direct answer generation error:', error)
    return '申し訳ございませんが、現在AIサービスに問題が発生しています。しばらく経ってから再度お試しください。'
  }
}

/**
 * 関連文書を使って回答を生成する
 */
export async function generateAnswer(
  question: string,
  relevantDocuments: Array<{ title: string; content: string; source: string }>
): Promise<string> {
  try {
    const context = relevantDocuments
      .map(doc => `【${doc.title}】(${doc.source})\n${doc.content}`)
      .join('\n\n')

    const prompt = `
あなたは社内ナレッジベースの専門アシスタントです。以下の関連文書を参考にして、ユーザーの質問に正確で親切な回答をしてください。

## 関連文書:
${context}

## ユーザーの質問:
${question}

## 回答指針:
- 関連文書の情報のみを使用して回答してください
- 具体的で実用的な回答を心がけてください
- 情報が不足している場合は、その旨を明記してください
- 丁寧で分かりやすい日本語で回答してください
- 回答の最後に参考にした文書名を記載してください

回答:
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Answer generation error:', error)
    // フォールバック回答を提供
    return '申し訳ございませんが、現在AIサービスに問題が発生しています。関連文書の情報を参考にしてください。'
  }
}

/**
 * チャット履歴を考慮した回答を生成する
 */
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
          .slice(-3) // 直近3件の履歴のみ使用
          .map((item, index) => `${index + 1}. Q: ${item.question}\n   A: ${item.answer}`)
          .join('\n\n')
      : ''

    const prompt = `
あなたは社内ナレッジベースの専門アシスタントです。以下の関連文書と会話履歴を参考にして、ユーザーの質問に正確で親切な回答をしてください。

## 関連文書:
${context}

${historyContext ? `## 会話履歴:\n${historyContext}\n` : ''}

## 現在の質問:
${question}

## 回答指針:
- 関連文書の情報を主に使用して回答してください
- 会話履歴がある場合は、文脈を考慮して回答してください
- 具体的で実用的な回答を心がけてください
- 情報が不足している場合は、その旨を明記してください
- 丁寧で分かりやすい日本語で回答してください

回答:
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Contextual answer generation error:', error)
    // フォールバック回答を提供
    return '申し訳ございませんが、現在AIサービスに問題が発生しています。関連文書の情報を参考にしてください。'
  }
}
