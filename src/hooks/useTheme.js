import { useState, useEffect, useCallback } from 'react'
import { getTheme, setTheme } from '../lib/storage'

function applyTheme(preference) {
  const root = document.documentElement
  if (preference === 'dark') {
    root.classList.add('dark')
  } else if (preference === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

export function useTheme() {
  const [theme, setLocal] = useState(() => getTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Keep system preference in sync if user is on 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (getTheme() === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const set = useCallback((t) => {
    setTheme(t)
    setLocal(t)
    applyTheme(t)
  }, [])

  return { theme, setTheme: set }
}
