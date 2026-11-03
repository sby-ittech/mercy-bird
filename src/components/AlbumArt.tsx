import { Music } from 'lucide-react'
import type { MediaBundle } from '../db/schema'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function AlbumArt({ bundle, size = 56 }: { bundle: MediaBundle; size?: number }) {
  const online = useOnlineStatus()
  const blobUrl = useObjectUrl(bundle.albumArtBlob)
  const src = blobUrl ?? (online ? bundle.albumArtUrl : null)
  return (
    <div className="shrink-0 overflow-hidden rounded-lg bg-slate-800" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" width={size} height={size} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-500">
          <Music size={size / 2.5} aria-hidden />
        </div>
      )}
    </div>
  )
}
