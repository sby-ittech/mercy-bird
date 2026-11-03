import { useCallback } from 'react'
import { db, type MediaBundle } from '../db/schema'
import { safeMediaUrl } from '../lib/format'
import { useUiStore } from '../store/uiStore'
import { usePlayerStore } from './useAudioPlayer'

type BlobKey = 'audioBlob' | 'pdfBlob' | 'extraAudioBlob' | 'albumArtBlob'

interface Asset {
  key: BlobKey
  url: string
}

export class InsufficientStorageError extends Error {
  constructor(public requiredBytes: number, public remainingBytes: number) {
    super('Insufficient storage space on device.')
    this.name = 'InsufficientStorageError'
  }
}

const RUNTIME_CACHES = ['audio-media-cache', 'static-assets-cache']
const controllers = new Map<string, AbortController>()

function assetsOf(bundle: MediaBundle): Asset[] {
  const assets: Asset[] = [{ key: 'audioBlob', url: bundle.audioUrl }]
  if (bundle.pdfUrl) assets.push({ key: 'pdfBlob', url: bundle.pdfUrl })
  if (bundle.extraAudioUrl) assets.push({ key: 'extraAudioBlob', url: bundle.extraAudioUrl })
  if (bundle.albumArtUrl) assets.push({ key: 'albumArtBlob', url: bundle.albumArtUrl })
  return assets.map((a) => ({ ...a, url: safeMediaUrl(a.url) }))
}

export async function ensureStorage(requiredBytes: number): Promise<void> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { quota, usage } = await navigator.storage.estimate()
    const remainingSpace = quota ? quota - (usage ?? 0) : 0
    if (remainingSpace < requiredBytes) {
      throw new InsufficientStorageError(requiredBytes, remainingSpace)
    }
  }
}

async function contentLength(url: string, signal: AbortSignal): Promise<number | null> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal, credentials: 'omit' })
    const len = Number(res.headers.get('content-length'))
    return res.ok && len > 0 ? len : null
  } catch (err) {
    if (signal.aborted) throw err
    return null
  }
}

async function fetchBlob(url: string, signal: AbortSignal, onChunk: (bytes: number) => void): Promise<Blob> {
  const res = await fetch(url, { signal, credentials: 'omit', cache: 'no-store' })
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`)
  const type = res.headers.get('content-type') ?? 'application/octet-stream'
  if (!res.body) {
    const blob = await res.blob()
    onChunk(blob.size)
    return blob
  }
  const reader = res.body.getReader()
  const chunks: BlobPart[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    onChunk(value.byteLength)
  }
  return new Blob(chunks, { type })
}

async function purgeRuntimeCaches(urls: string[]): Promise<void> {
  if (!('caches' in window)) return
  await Promise.all(
    RUNTIME_CACHES.map(async (name) => {
      const cache = await caches.open(name)
      await Promise.all(urls.map((u) => cache.delete(u, { ignoreSearch: true, ignoreVary: true })))
    }),
  )
}

export async function downloadBundle(id: string): Promise<void> {
  const bundle = await db.mediaBundles.get(id)
  if (!bundle || bundle.downloadStatus === 'DOWNLOADED' || controllers.has(id)) return

  const controller = new AbortController()
  controllers.set(id, controller)
  const { signal } = controller

  try {
    const assets = assetsOf(bundle)
    await db.mediaBundles.update(id, { downloadStatus: 'DOWNLOADING', downloadProgress: 0, downloadError: undefined })

    const sizes = await Promise.all(assets.map((a) => contentLength(a.url, signal)))
    const knownTotal = sizes.reduce<number>((sum, s) => sum + (s ?? 0), 0)
    const expectedTotal = sizes.every((s) => s !== null) ? knownTotal : Math.max(knownTotal, bundle.totalSizeBytes)

    await ensureStorage(expectedTotal)
    void navigator.storage?.persist?.()

    let loaded = 0
    let lastProgress = 0
    const blobs: Partial<Record<BlobKey, Blob>> = {}

    for (const asset of assets) {
      blobs[asset.key] = await fetchBlob(asset.url, signal, (bytes) => {
        loaded += bytes
        const progress = Math.min(99, Math.floor((loaded / Math.max(expectedTotal, loaded)) * 100))
        if (progress !== lastProgress) {
          lastProgress = progress
          void db.mediaBundles.update(id, { downloadProgress: progress })
        }
      })
    }

    const totalSizeBytes = Object.values(blobs).reduce((sum, b) => sum + (b?.size ?? 0), 0)
    await db.mediaBundles.update(id, {
      ...blobs,
      downloadStatus: 'DOWNLOADED',
      downloadProgress: 100,
      totalSizeBytes,
    })
  } catch (err) {
    if (signal.aborted) {
      await db.mediaBundles.update(id, { downloadStatus: 'NOT_DOWNLOADED', downloadProgress: 0 })
      return
    }
    const message = err instanceof Error ? err.message : 'Download failed'
    await db.mediaBundles.update(id, { downloadStatus: 'ERROR', downloadProgress: 0, downloadError: message })
    throw err
  } finally {
    controllers.delete(id)
  }
}

export function cancelDownload(id: string): void {
  controllers.get(id)?.abort()
}

export async function deleteBundleData(id: string): Promise<void> {
  cancelDownload(id)
  const bundle = await db.mediaBundles.get(id)
  if (!bundle) return
  usePlayerStore.getState().releaseBundle(id)
  await db.mediaBundles.update(id, {
    audioBlob: undefined,
    pdfBlob: undefined,
    extraAudioBlob: undefined,
    albumArtBlob: undefined,
    downloadStatus: 'NOT_DOWNLOADED',
    downloadProgress: 0,
    downloadError: undefined,
  })
  await purgeRuntimeCaches(
    [bundle.audioUrl, bundle.pdfUrl, bundle.extraAudioUrl, bundle.albumArtUrl]
      .filter((u): u is string => Boolean(u))
      .map((u) => new URL(u, window.location.href).href),
  )
}

export function useDownloadManager() {
  const toast = useUiStore((s) => s.toast)

  const download = useCallback(
    async (bundle: MediaBundle) => {
      try {
        await downloadBundle(bundle.id)
        const updated = await db.mediaBundles.get(bundle.id)
        if (updated?.downloadStatus === 'DOWNLOADED') toast('success', `Saved "${bundle.title}" for offline use`)
      } catch (err) {
        toast('error', err instanceof Error ? err.message : 'Download failed')
      }
    },
    [toast],
  )

  const remove = useCallback(
    async (bundle: MediaBundle) => {
      await deleteBundleData(bundle.id)
      toast('info', `Removed offline data for "${bundle.title}"`)
    },
    [toast],
  )

  const removeAll = useCallback(async () => {
    const ids = await db.mediaBundles.where('downloadStatus').anyOf('DOWNLOADED', 'ERROR', 'DOWNLOADING').primaryKeys()
    for (const id of ids) await deleteBundleData(id)
    toast('info', 'All offline downloads removed')
  }, [toast])

  return { download, cancel: cancelDownload, remove, removeAll }
}
