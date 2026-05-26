import { useState, useCallback } from 'react'
import { getBanner, setBanner } from '../lib/storage'

export const DEFAULT_BANNER = '/banner.jpg'

export function useBanner() {
  const [banner, setLocal] = useState(() => getBanner())

  const uploadBanner = useCallback((file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setBanner(dataUrl)
      setLocal(dataUrl)
    }
    reader.readAsDataURL(file)
  }, [])

  const resetBanner = useCallback(() => {
    setBanner(null)
    setLocal(null)
  }, [])

  return {
    bannerSrc: banner || DEFAULT_BANNER,
    isCustom: Boolean(banner),
    uploadBanner,
    resetBanner,
  }
}
