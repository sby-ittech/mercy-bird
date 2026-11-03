import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { syncCatalog } from './db/seed'
import { useUiStore } from './store/uiStore'
import './index.css'

registerSW({
  immediate: true,
  onOfflineReady() {
    useUiStore.getState().setOfflineReady(true)
    useUiStore.getState().toast('success', 'App is ready to work offline')
  },
  onRegisteredSW(_url, registration) {
    if (registration?.active) useUiStore.getState().setOfflineReady(true)
  },
})

syncCatalog()
  .catch((err) => console.error('Catalog sync failed', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
