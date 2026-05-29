import { useState, useEffect, useCallback } from 'react'
import { getOllamaUrl, setOllamaUrl, getOllamaModel, setOllamaModel, getAiRerankEnabled, setAiRerankEnabled } from '../lib/storage'
import { isAvailable } from '../lib/ollama'

export function useOllama() {
  const [url, setLocalUrl] = useState(() => getOllamaUrl())
  const [model, setLocalModel] = useState(() => getOllamaModel())
  const [aiEnabled, setLocalAiEnabled] = useState(() => getAiRerankEnabled())
  const [status, setStatus] = useState({ available: null, models: [] })

  useEffect(() => {
    let cancelled = false
    setStatus({ available: null, models: [] })
    isAvailable().then((result) => {
      if (!cancelled) setStatus(result)
    })
    return () => { cancelled = true }
  }, [url])

  const saveUrl = useCallback((v) => {
    const trimmed = v.trim()
    setOllamaUrl(trimmed)
    setLocalUrl(trimmed)
  }, [])

  const saveModel = useCallback((v) => {
    const trimmed = v.trim()
    setOllamaModel(trimmed)
    setLocalModel(trimmed)
  }, [])

  const toggleAi = useCallback((v) => {
    setAiRerankEnabled(v)
    setLocalAiEnabled(v)
  }, [])

  return { url, saveUrl, model, saveModel, aiEnabled, toggleAi, status }
}
