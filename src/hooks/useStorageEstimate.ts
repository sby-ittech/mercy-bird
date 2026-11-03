import { useCallback, useEffect, useState } from 'react'

export interface StorageInfo {
  usage: number
  quota: number
  persisted: boolean | null
}

export function useStorageEstimate(deps: unknown[] = []) {
  const [info, setInfo] = useState<StorageInfo | null>(null)

  const refresh = useCallback(async () => {
    if (!('storage' in navigator) || !navigator.storage.estimate) return
    const [{ usage = 0, quota = 0 }, persisted] = await Promise.all([
      navigator.storage.estimate(),
      navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(null),
    ])
    setInfo({ usage, quota, persisted })
  }, [])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, ...deps])

  return { info, refresh }
}
