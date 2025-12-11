"use server";

import OpenAI from "openai";

export type ModelType = "gemini" | "ollama";

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const ollamaClient = new OpenAI({
  apiKey: "ollama",
  baseURL: process.env.API_BASE_OLLAMA_URL,
});

export async function ollamaChat(messages: OllamaChatMessage[]): Promise<string> {
  const completion = await ollamaClient.chat.completions.create({
    model: "gemma3:4b",
    messages,
  });

  const content = completion.choices[0]?.message?.content;
  return typeof content === "string" ? content : "";
}
