// Requires Ollama running with: OLLAMA_ORIGINS=http://localhost:5173 ollama serve

import { getOllamaUrl, getOllamaModel } from './storage'

export async function isAvailable() {
  try {
    const res = await fetch(`${getOllamaUrl()}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return { available: false, models: [] }
    const data = await res.json()
    return { available: true, models: (data.models || []).map((m) => m.name) }
  } catch {
    return { available: false, models: [] }
  }
}

export async function chat(messages, { model, format } = {}) {
  try {
    const body = {
      model: model ?? getOllamaModel(),
      messages,
      stream: false,
    }
    if (format === 'json') body.format = 'json'

    const res = await fetch(`${getOllamaUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null

    const data = await res.json()
    const content = data?.message?.content ?? ''

    if (format === 'json') {
      try {
        const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
        return JSON.parse(clean)
      } catch {
        return null
      }
    }
    return content
  } catch {
    return null
  }
}
