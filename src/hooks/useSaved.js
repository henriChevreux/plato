import { useState, useCallback } from 'react'
import { getSaved, setSaved } from '../lib/storage'

export function useSaved() {
  const [saved, setLocal] = useState(() => getSaved())

  const saveVideo = useCallback((video) => {
    setLocal((prev) => {
      if (prev.some((v) => v.videoId === video.videoId)) return prev
      const next = [video, ...prev]
      setSaved(next)
      return next
    })
  }, [])

  const unsaveVideo = useCallback((videoId) => {
    setLocal((prev) => {
      const next = prev.filter((v) => v.videoId !== videoId)
      setSaved(next)
      return next
    })
  }, [])

  const isSaved = useCallback((videoId) => {
    return saved.some((v) => v.videoId === videoId)
  }, [saved])

  return { saved, saveVideo, unsaveVideo, isSaved }
}
