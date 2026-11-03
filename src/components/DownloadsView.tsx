import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2, X } from 'lucide-react'
import { db } from '../db/schema'
import { useDownloadManager } from '../hooks/useDownloadManager'
import { useStorageEstimate } from '../hooks/useStorageEstimate'
import { formatBytes } from '../lib/format'
import BundleCard from './BundleCard'
import StorageBar from './StorageBar'

export default function DownloadsView() {
  const items = useLiveQuery(
    () => db.mediaBundles.where('downloadStatus').anyOf('DOWNLOADED', 'DOWNLOADING', 'ERROR').toArray(),
    [],
  )
  const offlineBytes = (items ?? []).filter((b) => b.downloadStatus === 'DOWNLOADED').reduce((sum, b) => sum + b.totalSizeBytes, 0)
  const { info } = useStorageEstimate([offlineBytes, items?.length])
  const { remove, removeAll, cancel } = useDownloadManager()
  const queue = (items ?? []).map((b) => b.id)

  const confirmRemoveAll = () => {
    if (window.confirm('Remove all downloaded media from this device?')) void removeAll()
  }

  return (
    <section aria-labelledby="downloads-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="downloads-heading" className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Downloads
        </h2>
        {items && items.length > 0 && (
          <button type="button" onClick={confirmRemoveAll} className="text-xs font-semibold text-rose-300 hover:underline">
            Remove all
          </button>
        )}
      </div>
      <StorageBar info={info} offlineBytes={offlineBytes} />
      <div className="space-y-3">
        {items === undefined ? null : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nothing downloaded yet. Use the Download button on the Home tab.</p>
        ) : (
          items.map((b) => (
            <div key={b.id}>
              <BundleCard
                bundle={b}
                queue={queue}
                actions={
                  b.downloadStatus === 'DOWNLOADING' ? (
                    <button type="button" onClick={() => cancel(b.id)} className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold" aria-label={`Cancel download of ${b.title}`}>
                      <X size={14} aria-hidden /> {b.downloadProgress}%
                    </button>
                  ) : (
                    <button type="button" onClick={() => void remove(b)} className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25" aria-label={`Delete offline data for ${b.title}`}>
                      <Trash2 size={14} aria-hidden /> Delete
                    </button>
                  )
                }
              />
              {b.downloadStatus === 'DOWNLOADED' && (
                <p className="mt-1 px-3 text-[11px] text-slate-500">
                  Audio {formatBytes(b.audioBlob?.size ?? 0)}
                  {b.pdfBlob && ` · PDF ${formatBytes(b.pdfBlob.size)}`}
                  {b.extraAudioBlob && ` · Extra ${formatBytes(b.extraAudioBlob.size)}`}
                  {b.albumArtBlob && ` · Art ${formatBytes(b.albumArtBlob.size)}`}
                </p>
              )}
              {b.downloadStatus === 'ERROR' && <p className="mt-1 px-3 text-[11px] text-rose-300">{b.downloadError}</p>}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
