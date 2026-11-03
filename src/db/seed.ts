import { CATALOG_VERSION, MOCK_CATALOG } from '../data/mockCatalog'
import { db, type MediaBundle } from './schema'

const CATALOG_SYNC_KEY = 'catalog_sync'

/**
 * Upserts catalog metadata while preserving any offline payloads already stored,
 * and recovers downloads that were interrupted by a reload or crash.
 */
export async function syncCatalog(force = false): Promise<void> {
  await db.transaction('rw', db.mediaBundles, db.syncState, async () => {
    const state = await db.syncState.get(CATALOG_SYNC_KEY)
    if (force || !state || state.lastSyncVersion < CATALOG_VERSION) {
      for (const entry of MOCK_CATALOG) {
        const existing = await db.mediaBundles.get(entry.id)
        const merged: MediaBundle = existing
          ? {
              ...existing,
              ...entry,
              downloadStatus: existing.downloadStatus,
              downloadProgress: existing.downloadProgress,
              totalSizeBytes: existing.downloadStatus === 'DOWNLOADED' ? existing.totalSizeBytes : entry.totalSizeBytes,
            }
          : { ...entry }
        await db.mediaBundles.put(merged)
      }
      await db.syncState.put({
        key: CATALOG_SYNC_KEY,
        lastSyncVersion: CATALOG_VERSION,
        lastSyncedAt: new Date().toISOString(),
      })
    }

    await db.mediaBundles
      .where('downloadStatus')
      .equals('DOWNLOADING')
      .modify({ downloadStatus: 'NOT_DOWNLOADED', downloadProgress: 0 })
  })
}

export { CATALOG_SYNC_KEY }
