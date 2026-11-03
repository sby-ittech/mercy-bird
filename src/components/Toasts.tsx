import { X } from 'lucide-react'
import { useUiStore } from '../store/uiStore'

const STYLES = {
  info: 'bg-slate-800 text-slate-100 ring-slate-600',
  success: 'bg-emerald-900 text-emerald-100 ring-emerald-600',
  error: 'bg-rose-900 text-rose-100 ring-rose-600',
}

export default function Toasts() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-2.5 text-sm shadow-lg ring-1 ${STYLES[t.kind]}`}>
          <span className="flex-1">{t.message}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
