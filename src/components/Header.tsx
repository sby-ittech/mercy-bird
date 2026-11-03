import { Music2, Wifi, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function Header() {
  const online = useOnlineStatus()
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
        <Music2 size={20} aria-hidden />
      </span>
      <h1 className="flex-1 text-lg font-bold tracking-tight">Mercy Bird</h1>
      <span
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          online ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40' : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
        }`}
      >
        {online ? <Wifi size={14} aria-hidden /> : <WifiOff size={14} aria-hidden />}
        {online ? 'Online' : 'Offline Mode'}
      </span>
    </header>
  )
}
