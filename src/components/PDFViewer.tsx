import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ChevronLeft, ChevronRight, Download, Loader2, Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { MediaBundle } from '../db/schema'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const MIN_SCALE = 0.4
const MAX_SCALE = 4

interface Props {
  bundle: MediaBundle
  onClose: () => void
}

export default function PDFViewer({ bundle, onClose }: Props) {
  const online = useOnlineStatus()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)

  const blob = bundle.pdfBlob
  const remoteUrl = !blob && online ? bundle.pdfUrl : undefined

  useEffect(() => {
    if (!blob && !remoteUrl) {
      setError('These notes are not downloaded. Connect to the internet or download this item.')
      return
    }
    const objectUrl = blob ? URL.createObjectURL(blob) : null
    const url = objectUrl ?? remoteUrl!
    setDocUrl(url)
    setError(null)
    let task: ReturnType<typeof pdfjsLib.getDocument> | null = null
    let disposed = false
    // Blobs are passed as bytes: CSP connect-src does not allow fetching blob: URLs.
    const source = blob ? blob.arrayBuffer().then((data) => ({ data })) : Promise.resolve({ url })
    source
      .then((src) => {
        if (disposed) return
        task = pdfjsLib.getDocument({ ...src, isEvalSupported: false })
        return task.promise.then((pdf) => {
          if (disposed) return
          setDoc(pdf)
          setPage(1)
          setScale(null)
        })
      })
      .catch((err: unknown) => {
        if (disposed || (err instanceof Error && err.name === 'AbortException')) return
        setError(err instanceof Error ? err.message : 'Unable to open PDF')
      })
    return () => {
      disposed = true
      void task?.destroy()
      setDoc(null)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [blob, remoteUrl])

  useEffect(() => {
    if (!doc || !canvasRef.current) return
    let cancelled = false
    let renderTask: RenderTask | null = null
    setRendering(true)
    void (async () => {
      try {
        const pdfPage = await doc.getPage(page)
        if (cancelled) return
        let effectiveScale = scale
        if (effectiveScale === null) {
          const width = (containerRef.current?.clientWidth ?? 600) - 32
          effectiveScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, width / pdfPage.getViewport({ scale: 1 }).width))
          setScale(effectiveScale)
          return
        }
        const viewport = pdfPage.getViewport({ scale: effectiveScale })
        const dpr = window.devicePixelRatio || 1
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        renderTask = pdfPage.render({
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        })
        await renderTask.promise
      } catch (err) {
        if (err instanceof Error && err.name === 'RenderingCancelledException') return
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to render page')
      } finally {
        if (!cancelled) setRendering(false)
      }
    })()
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [doc, page, scale])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setPage((p) => (doc ? Math.min(doc.numPages, p + 1) : p))
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(1, p - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc, onClose])

  const zoom = (factor: number) =>
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, (s ?? 1) * factor)))

  const btn =
    'inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-indigo-400'

  return (
    <div role="dialog" aria-modal="true" aria-label={`Notes: ${bundle.title}`} className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur">
      <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{bundle.title}</p>
          <p className="text-xs text-slate-400">{blob ? 'Offline copy' : 'Streaming from network'}</p>
        </div>
        {docUrl && (
          <a href={docUrl} download={`${bundle.title}.pdf`} className={btn} aria-label="Download PDF" title="Download PDF">
            <Download size={18} />
          </a>
        )}
        <button type="button" onClick={onClose} className={btn} aria-label="Close PDF viewer">
          <X size={18} />
        </button>
      </header>

      <div ref={containerRef} className="relative flex-1 overflow-auto p-4">
        {error ? (
          <p className="mx-auto mt-16 max-w-sm text-center text-amber-300">{error}</p>
        ) : (
          <>
            {(!doc || rendering) && (
              <Loader2 className="absolute left-1/2 top-16 -translate-x-1/2 animate-spin text-indigo-300" aria-label="Loading" />
            )}
            <canvas ref={canvasRef} className="mx-auto block rounded bg-white shadow-xl" />
          </>
        )}
      </div>

      {doc && !error && (
        <footer className="flex items-center justify-center gap-2 border-t border-slate-800 px-4 py-3">
          <button type="button" className={btn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-20 text-center text-sm tabular-nums" aria-live="polite">
            {page} / {doc.numPages}
          </span>
          <button type="button" className={btn} onClick={() => setPage((p) => Math.min(doc.numPages, p + 1))} disabled={page >= doc.numPages} aria-label="Next page">
            <ChevronRight size={18} />
          </button>
          <span className="mx-2 h-6 w-px bg-slate-700" />
          <button type="button" className={btn} onClick={() => zoom(1 / 1.2)} aria-label="Zoom out">
            <ZoomOut size={18} />
          </button>
          <span className="w-14 text-center text-sm tabular-nums">{Math.round((scale ?? 1) * 100)}%</span>
          <button type="button" className={btn} onClick={() => zoom(1.2)} aria-label="Zoom in">
            <ZoomIn size={18} />
          </button>
          <button type="button" className={btn} onClick={() => setScale(null)} aria-label="Fit to width">
            <Maximize2 size={18} />
          </button>
        </footer>
      )}
    </div>
  )
}
