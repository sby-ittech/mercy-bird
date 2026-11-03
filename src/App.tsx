import { lazy, Suspense } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/schema'
import { useUiStore } from './store/uiStore'
import Header from './components/Header'
import CatalogView from './components/CatalogView'
import DownloadsView from './components/DownloadsView'
import SettingsView from './components/SettingsView'
import PlayerBar from './components/PlayerBar'
import BottomNav from './components/BottomNav'
import Toasts from './components/Toasts'

const PDFViewer = lazy(() => import('./components/PDFViewer'))

export default function App() {
  const tab = useUiStore((s) => s.tab)
  const pdfBundleId = useUiStore((s) => s.pdfBundleId)
  const closePdf = useUiStore((s) => s.closePdf)
  const pdfBundle = useLiveQuery(() => (pdfBundleId ? db.mediaBundles.get(pdfBundleId) : undefined), [pdfBundleId])

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <Header />
      <main className="flex-1 px-4 pb-48 pt-4">
        {tab === 'home' && <CatalogView />}
        {tab === 'downloads' && <DownloadsView />}
        {tab === 'settings' && <SettingsView />}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-3xl">
        <PlayerBar />
        <BottomNav />
      </div>
      <Toasts />
      {pdfBundle && (
        <Suspense fallback={null}>
          <PDFViewer bundle={pdfBundle} onClose={closePdf} />
        </Suspense>
      )}
    </div>
  )
}
