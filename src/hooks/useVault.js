import { useState, useEffect, useCallback } from 'react'
import { isSupported, pickVault, forgetVault, vaultPermission, ensurePermission, getVaultName } from '../lib/vault'

// status: 'unsupported' | 'none' | 'prompt' | 'granted' | 'denied'
export function useVault() {
  const supported = isSupported()
  const [status, setStatus] = useState(supported ? 'checking' : 'unsupported')
  const [name, setName] = useState(() => getVaultName())

  const refresh = useCallback(async () => {
    if (!supported) { setStatus('unsupported'); return }
    const perm = await vaultPermission()
    setStatus(perm)
    setName(getVaultName())
  }, [supported])

  useEffect(() => { refresh() }, [refresh])

  const connect = useCallback(async () => {
    const handle = await pickVault()
    setName(handle.name)
    setStatus('granted')
  }, [])

  const reconnect = useCallback(async () => {
    const ok = await ensurePermission()
    setStatus(ok ? 'granted' : 'denied')
    return ok
  }, [])

  const disconnect = useCallback(async () => {
    await forgetVault()
    setName('')
    setStatus('none')
  }, [])

  return { supported, status, name, connected: status === 'granted', connect, reconnect, disconnect, refresh }
}
