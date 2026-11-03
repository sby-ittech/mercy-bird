import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, Loader2, Pause, Play, RotateCcw, RotateCw, SkipBack, SkipForward, X } from 'lucide-react'
import { db } from '../db/schema'
import { usePlayerStore, type TrackKind } from '../hooks/useAudioPlayer'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { formatTime } from '../lib/format'
import { useUiStore } from '../store/uiStore'
import AlbumArt from './AlbumArt'

export default function PlayerBar() {
  const online = useOnlineStatus()
  const player = usePlayerStore()
  const openPdf = useUiStore((s) => s.openPdf)
  const bundle = useLiveQuery(() => (player.bundleId ? db.mediaBundles.get(player.bundleId) : undefined), [player.bundleId])

  if (!player.bundleId || !bundle) {
    return player.error ? <p className="bg-rose-950 px-4 py-2 text-sm text-rose-200">{player.error}</p> : null
  }

  const extraAvailable = Boolean(bundle.extraAudioBlob) || (online && Boolean(bundle.extraAudioUrl))
  const pdfAvailable = Boolean(bundle.pdfBlob) || (online && Boolean(bundle.pdfUrl))
  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-slate-800 hover:text-white'
  const trackBtn = (kind: TrackKind) =>
    `flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold disabled:opacity-40 ${player.track === kind ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`

  return (
    <section aria-label="Now playing" className="border-t border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <AlbumArt bundle={bundle} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
            Now playing · {player.source === 'offline' ? 'Offline' : 'Streaming'}
          </p>
          <p className="truncate text-sm font-semibold">{bundle.title}</p>
        </div>
        <div className="order-last flex w-full items-center justify-center gap-3 sm:order-none sm:w-auto">
        <button type="button" className={iconBtn} onClick={() => void player.previous()} aria-label="Previous">
          <SkipBack size={18} />
        </button>
        <button type="button" className={iconBtn} onClick={() => player.skip(-15)} aria-label="Back 15 seconds">
          <RotateCcw size={18} />
        </button>
        <button
          type="button"
          onClick={() => void player.toggle()}
          aria-label={player.isPlaying ? 'Pause' : 'Play'}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-950 hover:bg-indigo-100"
        >
          {player.isLoading ? <Loader2 size={20} className="animate-spin" /> : player.isPlaying ? <Pause size={20} /> : <Play size={20} className="translate-x-px" />}
        </button>
        <button type="button" className={iconBtn} onClick={() => player.skip(15)} aria-label="Forward 15 seconds">
          <RotateCw size={18} />
        </button>
        <button type="button" className={iconBtn} onClick={() => void player.next()} aria-label="Next">
          <SkipForward size={18} />
        </button>
        </div>
        <button type="button" className={iconBtn} onClick={player.stop} aria-label="Stop and close player">
          <X size={18} />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs tabular-nums text-slate-400">
        <span className="w-10 text-right">{formatTime(player.currentTime)}</span>
        <input
          type="range"
          min={0}
          max={player.duration || 0}
          step={0.1}
          value={Math.min(player.currentTime, player.duration || 0)}
          onChange={(e) => player.seek(Number(e.target.value))}
          aria-label="Seek"
          className="flex-1"
          disabled={!player.duration}
        />
        <span className="w-10">{formatTime(player.duration)}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="flex flex-1 gap-1 rounded-xl bg-slate-950 p-1" role="group" aria-label="Audio track">
          <button type="button" aria-pressed={player.track === 'primary'} className={trackBtn('primary')} onClick={() => void player.setTrack('primary')}>
            Primary
          </button>
          <button type="button" aria-pressed={player.track === 'extra'} className={trackBtn('extra')} disabled={!extraAvailable} onClick={() => void player.setTrack('extra')}>
            Secondary / Commentary
          </button>
        </div>
        {bundle.pdfUrl && (
          <button type="button" disabled={!pdfAvailable} onClick={() => openPdf(bundle.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold hover:bg-slate-700 disabled:opacity-40">
            <FileText size={14} aria-hidden /> Notes
          </button>
        )}
      </div>
      {player.error && <p className="mt-2 text-xs text-rose-300">{player.error}</p>}
    </section>
  )
}
