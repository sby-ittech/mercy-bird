import type { CatalogEntry } from '../db/schema'

export const CATALOG_VERSION = 1

const media = (file: string) => `${import.meta.env.BASE_URL}media/${file}`

// Sample media is served same-origin from /public/media so downloads work without
// third-party CORS support and the app can be demoed fully air-gapped.
export const MOCK_CATALOG: CatalogEntry[] = [
  {
    id: 'item_001',
    title: 'Abba Father Worship & Word',
    artist: 'Organization Worship Ministry',
    category: 'Sermon & Music',
    albumArtUrl: media('item_001_art.png'),
    audioUrl: media('item_001_primary.mp3'),
    pdfUrl: media('item_001_notes.pdf'),
    extraAudioUrl: media('item_001_extra.mp3'),
    downloadStatus: 'NOT_DOWNLOADED',
    downloadProgress: 0,
    totalSizeBytes: 1058450,
    updatedAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'item_002',
    title: 'Walking in Faith & Hope',
    artist: 'Pastor David',
    category: 'Sermon',
    albumArtUrl: media('item_002_art.png'),
    audioUrl: media('item_002_primary.mp3'),
    pdfUrl: media('item_002_notes.pdf'),
    extraAudioUrl: media('item_002_extra.mp3'),
    downloadStatus: 'NOT_DOWNLOADED',
    downloadProgress: 0,
    totalSizeBytes: 1171048,
    updatedAt: '2026-11-02T08:30:00Z',
  },
]
