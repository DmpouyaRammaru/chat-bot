import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    api_key_status: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
    models: ['gemini-2.0-flash-exp', 'text-embedding-004']
  })
}
