import { AlertTriangle, CheckCircle2, CloudDownload, Loader2 } from 'lucide-react'
import type { MediaBundle } from '../db/schema'
import { useDownloadManager } from '../hooks/useDownloadManager'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function DownloadButton({ bundle }: { bundle: MediaBundle }) {
  const online = useOnlineStatus()
  const { download, cancel } = useDownloadManager()
  const base = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap'

  switch (bundle.downloadStatus) {
    case 'DOWNLOADED':
      return (
        <span className={`${base} bg-emerald-500/15 text-emerald-300`}>
          <CheckCircle2 size={16} aria-hidden /> Downloaded
        </span>
      )
    case 'DOWNLOADING':
      return (
        <button type="button" onClick={() => cancel(bundle.id)} className={`${base} bg-indigo-500/15 text-indigo-200`} aria-label={`Cancel download, ${bundle.downloadProgress}% complete`} title="Cancel download">
          <Loader2 size={16} className="animate-spin" aria-hidden /> {bundle.downloadProgress}%
        </button>
      )
    case 'ERROR':
      return (
        <button type="button" disabled={!online} onClick={() => void download(bundle)} title={bundle.downloadError} className={`${base} bg-rose-500/15 text-rose-300 disabled:opacity-50`}>
          <AlertTriangle size={16} aria-hidden /> Retry
        </button>
      )
    default:
      return (
        <button type="button" disabled={!online} onClick={() => void download(bundle)} className={`${base} bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-50`} title={online ? 'Save for offline use' : 'Connect to download'}>
          <CloudDownload size={16} aria-hidden /> Download
        </button>
      )
  }
}
