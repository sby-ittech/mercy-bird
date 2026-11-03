import { formatBytes } from '../lib/format'
import type { StorageInfo } from '../hooks/useStorageEstimate'

export default function StorageBar({ info, offlineBytes }: { info: StorageInfo | null; offlineBytes: number }) {
  const pct = info && info.quota > 0 ? Math.min(100, (info.usage / info.quota) * 100) : 0
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">Device storage</span>
        <span className="text-slate-400">
          {info ? `${formatBytes(info.usage)} of ${formatBytes(info.quota)} used` : 'Unavailable'}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(pct, info?.usage ? 1 : 0)}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-400">Offline media: {formatBytes(offlineBytes)}</p>
    </div>
  )
}
