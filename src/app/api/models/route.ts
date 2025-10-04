import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    
    // 利用可能なモデルをリスト
    const models = await genAI.listModels()
    
    return NextResponse.json({
      api_key_status: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
      available_models: models.map(model => ({
        name: model.name,
        displayName: model.displayName,
        supportedGenerationMethods: model.supportedGenerationMethods
      }))
    })

  } catch (error) {
    console.error('Model listing error:', error)
    return NextResponse.json({
      error: 'Failed to list models',
      details: error instanceof Error ? error.message : 'Unknown error',
      api_key_status: process.env.GEMINI_API_KEY ? 'configured' : 'missing'
    }, { status: 500 })
  }
}
