# Mercy Bird

Offline-first PWA for cataloged worship music, sermon audio, PDF sermon notes and secondary audio (commentary / backing / split tracks). Everything a user downloads keeps working with no network connection.

## Stack

React 19 + Vite + TypeScript (strict) · Tailwind CSS v4 + Lucide · Zustand · Dexie (IndexedDB) · Workbox (via `vite-plugin-pwa`, `injectManifest`) · `pdfjs-dist` · HTML5 Audio + Media Session API

## Getting started

```bash
npm install
npm run dev        # development server (service worker disabled)
npm run build      # type-check + production build (generates dist/sw.js)
npm run preview    # serve the production build with the service worker
npm run lint
```

Offline behaviour must be tested against `npm run build && npm run preview` – the service worker only runs in the production build.

## Architecture

| Area | File |
| --- | --- |
| IndexedDB schema (`OrganizationMediaDB` v1) | `src/db/schema.ts` |
| Catalog seed / sync (keeps downloaded blobs) | `src/db/seed.ts`, `src/data/mockCatalog.ts` |
| Service worker (precache, app-shell fallback, range requests) | `src/sw.ts` |
| Download + quota manager | `src/hooks/useDownloadManager.ts` |
| Audio player + Media Session + object URL cleanup | `src/hooks/useAudioPlayer.ts` |
| Canvas PDF viewer | `src/components/PDFViewer.tsx` |
| UI (catalog, downloads, settings, player, nav) | `src/components/*` |

### Offline model

- **App shell** – JS/CSS/HTML/icons and the pdf.js worker are precached by Workbox; navigations fall back to the cached `index.html`.
- **Media** – the download manager streams each asset (primary audio, PDF, secondary audio, album art) with progress, checks `navigator.storage.estimate()` first, requests persistent storage, and stores the files as `Blob`s on the `MediaBundle` record. Playback and the PDF viewer use `URL.createObjectURL(blob)` and revoke the URLs when the track/document changes.
- **Streaming** – when online and not downloaded, audio streams from its URL; the service worker's `audio-media-cache` route uses `RangeRequestsPlugin` so cached audio answers `Range` requests with HTTP 206.
- Interrupted downloads are reset on the next launch; deleting a download purges its blobs and any runtime-cache entries.

### Sample data

`src/data/mockCatalog.ts` mirrors the spec's mock dataset (ids, titles, artists, categories, dates) but points at sample files in `public/media/`. The original remote URLs could not be used for offline downloads: SoundHelix serves no CORS headers (browser `fetch` can't read the bytes) and the referenced pdf.js PDF returns 404. To use your own catalog, replace the entries and bump `CATALOG_VERSION`; remote hosts must send `Access-Control-Allow-Origin` and use HTTPS.

### Security

- Production builds inject a strict Content-Security-Policy (`script-src 'self'`, `object-src 'none'`, …); `vite preview` also sends `X-Frame-Options`, `nosniff`, `Referrer-Policy` and `Permissions-Policy`. Mirror these headers on your production host.
- pdf.js runs with `isEvalSupported: false`.
- Media URLs must be HTTPS or same-origin; downloads are fetched with `credentials: 'omit'`.
