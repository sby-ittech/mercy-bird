import { FileText, Headphones, Pause, Play } from 'lucide-react'
import type { MediaBundle } from '../db/schema'
import { usePlayerStore } from '../hooks/useAudioPlayer'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { formatBytes } from '../lib/format'
import { useUiStore } from '../store/uiStore'
import AlbumArt from './AlbumArt'
import DownloadButton from './DownloadButton'

interface Props {
  bundle: MediaBundle
  queue: string[]
  actions?: React.ReactNode
}

export default function BundleCard({ bundle, queue, actions }: Props) {
  const online = useOnlineStatus()
  const isCurrent = usePlayerStore((s) => s.bundleId === bundle.id)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const load = usePlayerStore((s) => s.load)
  const toggle = usePlayerStore((s) => s.toggle)
  const toast = useUiStore((s) => s.toast)
  const openPdf = useUiStore((s) => s.openPdf)

  const available = Boolean(bundle.audioBlob) || online
  const pdfAvailable = Boolean(bundle.pdfBlob) || (online && Boolean(bundle.pdfUrl))
  const audioSize = bundle.audioBlob?.size

  const onPlay = async () => {
    if (isCurrent) return toggle()
    if (!available) return toast('error', 'Not available offline. Download it while online.')
    await load(bundle, 'primary', { queue })
  }

  return (
    <article className={`flex items-center gap-3 rounded-2xl border p-3 ${isCurrent ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-slate-800 bg-slate-900'} ${available ? '' : 'opacity-60'}`}>
      <AlbumArt bundle={bundle} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{bundle.title}</h3>
        <p className="truncate text-sm text-slate-400">
          {bundle.artist} · <span className="text-slate-500">{bundle.category}</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          <span>Audio{audioSize ? `: ${formatBytes(audioSize)}` : ''}</span>
          {bundle.pdfUrl && (
            <button type="button" disabled={!pdfAvailable} onClick={() => openPdf(bundle.id)} className="inline-flex items-center gap-1 text-indigo-300 hover:underline disabled:text-slate-500 disabled:no-underline">
              <FileText size={12} aria-hidden /> PDF Notes
            </button>
          )}
          {bundle.extraAudioUrl && (
            <span className="inline-flex items-center gap-1">
              <Headphones size={12} aria-hidden /> Extra Audio
            </span>
          )}
          <span className="text-slate-500">· {formatBytes(bundle.totalSizeBytes)}</span>
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => void onPlay()}
          aria-label={isCurrent && isPlaying ? `Pause ${bundle.title}` : `Play ${bundle.title}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
          disabled={!available}
        >
          {isCurrent && isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-px" />}
        </button>
        {actions ?? <DownloadButton bundle={bundle} />}
      </div>
    </article>
  )
}
