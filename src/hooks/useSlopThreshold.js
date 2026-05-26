import { useState, useCallback } from 'react'
import { getSlopThreshold, setSlopThreshold } from '../lib/storage'

export function useSlopThreshold() {
  const [threshold, setLocal] = useState(() => getSlopThreshold())

  const setThreshold = useCallback((n) => {
    setSlopThreshold(n)
    setLocal(n)
  }, [])

  return { threshold, setThreshold }
}
