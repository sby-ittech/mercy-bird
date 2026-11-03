import { create } from 'zustand'
import { db, type MediaBundle } from '../db/schema'

export type TrackKind = 'primary' | 'extra'

interface PlayerState {
  bundleId: string | null
  track: TrackKind
  queue: string[]
  source: 'offline' | 'stream' | null
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  error: string | null
  load: (bundle: MediaBundle, track?: TrackKind, options?: { queue?: string[]; keepPosition?: boolean }) => Promise<void>
  setTrack: (track: TrackKind) => Promise<void>
  toggle: () => Promise<void>
  seek: (time: number) => void
  skip: (delta: number) => void
  next: () => Promise<void>
  previous: () => Promise<void>
  stop: () => void
  releaseBundle: (id: string) => void
}

const audio: HTMLAudioElement | null = typeof Audio === 'undefined' ? null : new Audio()
if (audio) audio.preload = 'metadata'

let audioObjectUrl: string | null = null
let artworkObjectUrl: string | null = null

function revokeAudioUrl() {
  if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl)
  audioObjectUrl = null
}

function revokeArtworkUrl() {
  if (artworkObjectUrl) URL.revokeObjectURL(artworkObjectUrl)
  artworkObjectUrl = null
}

function resolveSource(bundle: MediaBundle, track: TrackKind) {
  const blob = track === 'primary' ? bundle.audioBlob : bundle.extraAudioBlob
  const url = track === 'primary' ? bundle.audioUrl : bundle.extraAudioUrl
  if (blob) return { kind: 'offline' as const, blob }
  if (url && navigator.onLine) return { kind: 'stream' as const, url }
  return null
}

function updateMediaSession(bundle: MediaBundle | null, track: TrackKind) {
  if (!('mediaSession' in navigator)) return
  revokeArtworkUrl()
  if (!bundle) {
    navigator.mediaSession.metadata = null
    navigator.mediaSession.playbackState = 'none'
    return
  }
  let artSrc = bundle.albumArtUrl
  let artType = 'image/png'
  if (bundle.albumArtBlob) {
    artworkObjectUrl = URL.createObjectURL(bundle.albumArtBlob)
    artSrc = artworkObjectUrl
    artType = bundle.albumArtBlob.type || artType
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track === 'extra' ? `${bundle.title} (Secondary)` : bundle.title,
    artist: bundle.artist,
    album: bundle.category,
    artwork: artSrc ? [{ src: artSrc, sizes: '300x300', type: artType }] : [],
  })
}

function updatePositionState() {
  if (!audio || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
  try {
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate,
      position: Math.min(audio.currentTime, audio.duration),
    })
  } catch {
    // Some browsers throw if position state is set before metadata is ready.
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  bundleId: null,
  track: 'primary',
  queue: [],
  source: null,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  error: null,

  load: async (bundle, track = 'primary', options = {}) => {
    if (!audio) return
    const source = resolveSource(bundle, track)
    if (!source) {
      set({ error: 'This track is not downloaded. Connect to the internet or download it for offline use.' })
      return
    }
    const resumeAt = options.keepPosition ? audio.currentTime : 0

    audio.pause()
    revokeAudioUrl()
    let src: string
    if (source.kind === 'offline') {
      audioObjectUrl = URL.createObjectURL(source.blob)
      src = audioObjectUrl
    } else {
      src = source.url
    }

    set({
      bundleId: bundle.id,
      track,
      source: source.kind,
      queue: options.queue ?? get().queue,
      isLoading: true,
      currentTime: 0,
      duration: 0,
      error: null,
    })
    updateMediaSession(bundle, track)

    audio.src = src
    if (resumeAt > 0) {
      audio.addEventListener(
        'loadedmetadata',
        () => {
          if (resumeAt < audio.duration) audio.currentTime = resumeAt
        },
        { once: true },
      )
    }
    try {
      await audio.play()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Playback failed' })
    }
  },

  setTrack: async (track) => {
    const { bundleId, track: current } = get()
    if (!bundleId || track === current) return
    const bundle = await db.mediaBundles.get(bundleId)
    if (bundle) await get().load(bundle, track, { keepPosition: true })
  },

  toggle: async () => {
    if (!audio || !get().bundleId) return
    if (audio.paused) {
      try {
        await audio.play()
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Playback failed' })
      }
    } else {
      audio.pause()
    }
  },

  seek: (time) => {
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = Math.max(0, Math.min(time, audio.duration))
    set({ currentTime: audio.currentTime })
  },

  skip: (delta) => {
    if (audio) get().seek(audio.currentTime + delta)
  },

  next: async () => {
    const { queue, bundleId } = get()
    const idx = bundleId ? queue.indexOf(bundleId) : -1
    const nextId = queue[idx + 1]
    const bundle = nextId ? await db.mediaBundles.get(nextId) : undefined
    if (bundle) await get().load(bundle)
  },

  previous: async () => {
    if (audio && audio.currentTime > 3) {
      get().seek(0)
      return
    }
    const { queue, bundleId } = get()
    const idx = bundleId ? queue.indexOf(bundleId) : -1
    const prevId = idx > 0 ? queue[idx - 1] : undefined
    const bundle = prevId ? await db.mediaBundles.get(prevId) : undefined
    if (bundle) await get().load(bundle)
  },

  stop: () => {
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    revokeAudioUrl()
    updateMediaSession(null, 'primary')
    set({ bundleId: null, source: null, isPlaying: false, isLoading: false, currentTime: 0, duration: 0 })
  },

  releaseBundle: (id) => {
    if (get().bundleId === id && get().source === 'offline') get().stop()
  },
}))

if (audio) {
  const setState = usePlayerStore.setState
  audio.addEventListener('play', () => setState({ isPlaying: true }))
  audio.addEventListener('playing', () => setState({ isPlaying: true, isLoading: false }))
  audio.addEventListener('pause', () => setState({ isPlaying: false }))
  audio.addEventListener('waiting', () => setState({ isLoading: true }))
  audio.addEventListener('canplay', () => setState({ isLoading: false }))
  audio.addEventListener('durationchange', () => {
    setState({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 })
    updatePositionState()
  })
  audio.addEventListener('timeupdate', () => {
    setState({ currentTime: audio.currentTime })
    updatePositionState()
  })
  audio.addEventListener('ended', () => {
    setState({ isPlaying: false })
    void usePlayerStore.getState().next()
  })
  audio.addEventListener('error', () => {
    if (!audio.getAttribute('src')) return
    setState({ isPlaying: false, isLoading: false, error: 'Unable to play this track.' })
  })
  audio.addEventListener('play', () => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
  })
  audio.addEventListener('pause', () => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
  })

  if ('mediaSession' in navigator) {
    const store = usePlayerStore.getState
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => void store().toggle()],
      ['pause', () => audio.pause()],
      ['stop', () => store().stop()],
      ['seekbackward', (d) => store().skip(-(d.seekOffset ?? 15))],
      ['seekforward', (d) => store().skip(d.seekOffset ?? 15)],
      ['seekto', (d) => d.seekTime !== undefined && store().seek(d.seekTime)],
      ['previoustrack', () => void store().previous()],
      ['nexttrack', () => void store().next()],
    ]
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // Action not supported on this platform.
      }
    }
  }

  window.addEventListener('pagehide', revokeAudioUrl)
}

export function useAudioPlayer() {
  return usePlayerStore()
}
