import Dexie, { type Table } from 'dexie'

export type DownloadStatus = 'NOT_DOWNLOADED' | 'DOWNLOADING' | 'DOWNLOADED' | 'ERROR'

export interface MediaBundle {
  id: string
  title: string
  artist: string
  category: string
  albumArtUrl: string

  audioUrl: string
  pdfUrl?: string
  extraAudioUrl?: string

  audioBlob?: Blob
  pdfBlob?: Blob
  extraAudioBlob?: Blob
  albumArtBlob?: Blob

  downloadStatus: DownloadStatus
  downloadProgress: number
  totalSizeBytes: number
  updatedAt: string
  downloadError?: string
}

export type CatalogEntry = Omit<
  MediaBundle,
  'audioBlob' | 'pdfBlob' | 'extraAudioBlob' | 'albumArtBlob' | 'downloadError'
>

export interface SyncState {
  key: string
  lastSyncVersion: number
  lastSyncedAt: string
}

export class AppDatabase extends Dexie {
  mediaBundles!: Table<MediaBundle, string>
  syncState!: Table<SyncState, string>

  constructor() {
    super('OrganizationMediaDB')
    this.version(1).stores({
      mediaBundles: 'id, title, artist, category, downloadStatus, updatedAt',
      syncState: 'key',
    })
  }
}

export const db = new AppDatabase()
