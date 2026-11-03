import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, X } from 'lucide-react'
import { db } from '../db/schema'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import BundleCard from './BundleCard'

export default function CatalogView() {
  const online = useOnlineStatus()
  const bundles = useLiveQuery(() => db.mediaBundles.orderBy('updatedAt').reverse().toArray(), [])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [offlineOnly, setOfflineOnly] = useState(false)

  const categories = useMemo(
    () => ['All', ...Array.from(new Set((bundles ?? []).map((b) => b.category))).sort()],
    [bundles],
  )

  const filtered = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    return (bundles ?? []).filter((b) => {
      if (category !== 'All' && b.category !== category) return false
      if (offlineOnly && b.downloadStatus !== 'DOWNLOADED') return false
      const haystack = `${b.title} ${b.artist} ${b.category}`.toLowerCase()
      return terms.every((t) => haystack.includes(t))
    })
  }, [bundles, query, category, offlineOnly])

  const queue = filtered.map((b) => b.id)
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${active ? 'bg-indigo-600 text-white ring-indigo-500' : 'bg-slate-900 text-slate-300 ring-slate-700 hover:bg-slate-800'}`

  return (
    <section aria-labelledby="catalog-heading" className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Search songs, sermons, notes</span>
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, sermons, notes..."
          className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-10 text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <X size={16} />
          </button>
        )}
      </label>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {categories.map((c) => (
          <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={chip(category === c)}>
            {c}
          </button>
        ))}
        <button type="button" aria-pressed={offlineOnly} onClick={() => setOfflineOnly((v) => !v)} className={chip(offlineOnly)}>
          Downloaded only
        </button>
      </div>

      <h2 id="catalog-heading" className="text-xs font-bold uppercase tracking-widest text-slate-400">
        Catalog
      </h2>
      {!online && (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          You are offline. Downloaded items play normally; others are unavailable until you reconnect.
        </p>
      )}
      <div className="space-y-3">
        {bundles === undefined ? (
          <p className="text-sm text-slate-400">Loading catalog...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No items match your search.</p>
        ) : (
          filtered.map((b) => <BundleCard key={b.id} bundle={b} queue={queue} />)
        )}
      </div>
    </section>
  )
}
