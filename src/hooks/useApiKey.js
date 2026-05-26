import { useState, useCallback } from 'react'
import { getApiKey, setApiKey } from '../lib/storage'

export function useApiKey() {
  const [apiKey, setLocal] = useState(() => getApiKey())

  const save = useCallback((key) => {
    const trimmed = key.trim()
    setApiKey(trimmed)
    setLocal(trimmed)
  }, [])

  return { apiKey, saveApiKey: save }
}
