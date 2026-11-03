import { create } from 'zustand'

export type Tab = 'home' | 'downloads' | 'settings'

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  message: string
}

interface UiState {
  tab: Tab
  pdfBundleId: string | null
  toasts: Toast[]
  offlineReady: boolean
  setTab: (tab: Tab) => void
  openPdf: (id: string) => void
  closePdf: () => void
  toast: (kind: Toast['kind'], message: string) => void
  dismissToast: (id: number) => void
  setOfflineReady: (ready: boolean) => void
}

let nextToastId = 1

export const useUiStore = create<UiState>((set, get) => ({
  tab: 'home',
  pdfBundleId: null,
  toasts: [],
  offlineReady: false,
  setTab: (tab) => set({ tab }),
  openPdf: (id) => set({ pdfBundleId: id }),
  closePdf: () => set({ pdfBundleId: null }),
  toast: (kind, message) => {
    const id = nextToastId++
    set({ toasts: [...get().toasts, { id, kind, message }] })
    setTimeout(() => get().dismissToast(id), 4500)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setOfflineReady: (offlineReady) => set({ offlineReady }),
}))
