import { useLiveQuery } from 'dexie-react-hooks'
import { HardDrive, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { db } from '../db/schema'
import { CATALOG_SYNC_KEY, syncCatalog } from '../db/seed'
import { usePlayerStore } from '../hooks/useAudioPlayer'
import { useStorageEstimate } from '../hooks/useStorageEstimate'
import { useUiStore } from '../store/uiStore'
import StorageBar from './StorageBar'

export default function SettingsView() {
  const toast = useUiStore((s) => s.toast)
  const offlineReady = useUiStore((s) => s.offlineReady)
  const sync = useLiveQuery(() => db.syncState.get(CATALOG_SYNC_KEY), [])
  const offlineBytes = useLiveQuery(
    async () => (await db.mediaBundles.where('downloadStatus').equals('DOWNLOADED').toArray()).reduce((s, b) => s + b.totalSizeBytes, 0),
    [],
  )
  const { info, refresh } = useStorageEstimate([offlineBytes])

  const requestPersistence = async () => {
    const granted = await navigator.storage?.persist?.()
    toast(granted ? 'success' : 'info', granted ? 'Storage is now persistent' : 'The browser declined persistent storage')
    void refresh()
  }

  const resync = async () => {
    await syncCatalog(true)
    toast('success', 'Catalog refreshed')
  }

  const resetApp = async () => {
    if (!window.confirm('Erase all offline data, caches and settings? This cannot be undone.')) return
    usePlayerStore.getState().stop()
    db.close()
    await db.delete()
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)))
    window.location.reload()
  }

  const row = 'flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4'
  const action = 'rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700'

  return (
    <section aria-labelledby="settings-heading" className="space-y-3">
      <h2 id="settings-heading" className="text-xs font-bold uppercase tracking-widest text-slate-400">
        Settings
      </h2>
      <StorageBar info={info} offlineBytes={offlineBytes ?? 0} />

      <div className={row}>
        <ShieldCheck size={20} className="text-emerald-300" aria-hidden />
        <div className="flex-1 text-sm">
          <p className="font-semibold">Persistent storage</p>
          <p className="text-xs text-slate-400">
            {info?.persisted ? 'Granted – the browser will not evict your downloads.' : 'Not granted – downloads may be evicted under storage pressure.'}
          </p>
        </div>
        {!info?.persisted && (
          <button type="button" className={action} onClick={() => void requestPersistence()}>
            Request
          </button>
        )}
      </div>

      <div className={row}>
        <HardDrive size={20} className="text-indigo-300" aria-hidden />
        <div className="flex-1 text-sm">
          <p className="font-semibold">Offline app shell</p>
          <p className="text-xs text-slate-400">{offlineReady ? 'Installed – the app opens without a connection.' : 'Installing service worker...'}</p>
        </div>
      </div>

      <div className={row}>
        <RefreshCw size={20} className="text-sky-300" aria-hidden />
        <div className="flex-1 text-sm">
          <p className="font-semibold">Catalog</p>
          <p className="text-xs text-slate-400">
            {sync ? `Version ${sync.lastSyncVersion} · synced ${new Date(sync.lastSyncedAt).toLocaleString()}` : 'Not synced'}
          </p>
        </div>
        <button type="button" className={action} onClick={() => void resync()}>
          Re-sync
        </button>
      </div>

      <div className={row}>
        <Trash2 size={20} className="text-rose-300" aria-hidden />
        <div className="flex-1 text-sm">
          <p className="font-semibold">Reset app data</p>
          <p className="text-xs text-slate-400">Deletes all downloads, caches and the local database.</p>
        </div>
        <button type="button" className={`${action} text-rose-300`} onClick={() => void resetApp()}>
          Reset
        </button>
      </div>

      <p className="pt-4 text-center text-xs text-slate-500">Mercy Bird v{__APP_VERSION__}</p>
    </section>
  )
}
