import { useState, useCallback } from 'react'
import { getMinDuration, setMinDuration } from '../lib/storage'

export function useMinDuration() {
  const [minDuration, setLocal] = useState(() => getMinDuration())

  const set = useCallback((seconds) => {
    setMinDuration(seconds)
    setLocal(seconds)
  }, [])

  return { minDuration, setMinDuration: set }
}
