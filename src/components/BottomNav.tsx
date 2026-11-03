import { Download, Home, Settings } from 'lucide-react'
import { useUiStore, type Tab } from '../store/uiStore'

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'downloads', label: 'Downloads', Icon: Download },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

export default function BottomNav() {
  const tab = useUiStore((s) => s.tab)
  const setTab = useUiStore((s) => s.setTab)
  return (
    <nav aria-label="Primary" className="grid grid-cols-3 border-t border-slate-800 bg-slate-950 pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setTab(id)}
          aria-current={tab === id ? 'page' : undefined}
          className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
            tab === id ? 'text-indigo-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Icon size={20} aria-hidden />
          {label}
        </button>
      ))}
    </nav>
  )
}
