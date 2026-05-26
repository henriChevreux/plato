import { useState, useCallback } from 'react'
import { getTopics, setTopics } from '../lib/storage'

export function useTopics() {
  const [topics, setLocal] = useState(() => getTopics())

  const addTopic = useCallback((name, level = 'intermediate') => {
    const trimmed = name.trim()
    if (!trimmed) return
    setLocal((prev) => {
      if (prev.map((t) => t.name.toLowerCase()).includes(trimmed.toLowerCase())) return prev
      const next = [...prev, { name: trimmed, level }]
      setTopics(next)
      return next
    })
  }, [])

  const removeTopic = useCallback((name) => {
    setLocal((prev) => {
      const next = prev.filter((t) => t.name !== name)
      setTopics(next)
      return next
    })
  }, [])

  const updateLevel = useCallback((name, level) => {
    setLocal((prev) => {
      const next = prev.map((t) => (t.name === name ? { ...t, level } : t))
      setTopics(next)
      return next
    })
  }, [])

  return { topics, addTopic, removeTopic, updateLevel }
}
