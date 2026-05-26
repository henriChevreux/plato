import { useState, useCallback } from 'react'
import { getBlocklist, setBlocklist } from '../lib/storage'

export function useBlocklist() {
  const [blocklist, setLocal] = useState(() => getBlocklist())

  const blockChannel = useCallback((channelTitle) => {
    setLocal((prev) => {
      if (prev.includes(channelTitle)) return prev
      const next = [...prev, channelTitle]
      setBlocklist(next)
      return next
    })
  }, [])

  const unblockChannel = useCallback((channelTitle) => {
    setLocal((prev) => {
      const next = prev.filter((c) => c !== channelTitle)
      setBlocklist(next)
      return next
    })
  }, [])

  const isBlocked = useCallback((channelTitle) => {
    return blocklist.includes(channelTitle)
  }, [blocklist])

  return { blocklist, blockChannel, unblockChannel, isBlocked }
}
