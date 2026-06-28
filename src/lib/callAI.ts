import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

export class AIError extends Error {
  provider: string
  constructor(provider: string, message: string) {
    super(message)
    this.name = 'AIError'
    this.provider = provider
  }
}

function getProviderConfig(): { provider: string; apiKey: string; model: string; baseURL?: string } {
  const provider = process.env.AI_PROVIDER || 'gemini'

  switch (provider) {
    case 'gemini':
      return {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY || '',
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      }
    case 'openrouter':
      return {
        provider: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
        baseURL: 'https://openrouter.ai/api/v1',
      }
    case 'groq':
      return {
        provider: 'groq',
        apiKey: process.env.GROQ_API_KEY || '',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        baseURL: 'https://api.groq.com/openai/v1',
      }
    case 'nvidia':
      return {
        provider: 'nvidia',
        apiKey: process.env.NVIDIA_API_KEY || '',
        model: process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct',
        baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      }
    default:
      throw new AIError(provider, `Unknown AI provider: "${provider}". Use gemini, openrouter, groq, or nvidia.`)
  }
}

export async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const config = getProviderConfig()

  if (!config.apiKey) {
    throw new AIError(config.provider, `Missing API key for provider "${config.provider}". Set ${config.provider.toUpperCase()}_API_KEY in .env.local`)
  }

  if (config.provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(config.apiKey)
    const model = genAI.getGenerativeModel({ model: config.model })
    const result = await model.generateContent([{ text: systemPrompt }, { text: userPrompt }])
    const text = result.response.text()
    if (!text) {
      throw new AIError(config.provider, 'Gemini returned an empty response')
    }
    return text
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const text = response.choices?.[0]?.message?.content
  if (!text) {
    throw new AIError(config.provider, `OpenAI-compatible provider "${config.provider}" returned an empty response`)
  }

  return text
}
