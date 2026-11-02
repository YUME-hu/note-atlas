import { useMemo, useState } from 'react'
import { formatPercent } from '@/lib/color'
import { flagSrc } from '@/lib/flag-src'
import type { Region, Stat } from '@/types'

interface CountryIndexProps {
  regions: Region[]
  stats: Record<string, Stat>
  onSelect: (iso: string) => void
}

function IndexFlag({ iso }: { iso: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span
        aria-hidden="true"
        className="flex h-6 w-9 shrink-0 items-center justify-center border border-line text-[9px] tracking-[0.06em] text-muted"
      >
        {iso}
      </span>
    )
  }
  return (
    <img
      src={flagSrc(iso)}
      alt=""
      width={36}
      height={24}
      loading="lazy"
      className="h-6 w-9 shrink-0 border border-line"
      onError={() => setFailed(true)}
    />
  )
}

/**
 * Mobile-only country index. The world map at 390px is an overview, not a tap
 * target list; this grid gives every country a 48px row with its own progress.
 */
export function CountryIndex({ regions, stats, onSelect }: CountryIndexProps) {
  const [query, setQuery] = useState('')

  const sorted = useMemo(
    () =>
      [...regions].sort((a, b) =>
        a.name.localeCompare(b.name, 'zh-CN') || a.iso.localeCompare(b.iso),
      ),
    [regions],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sorted
    return sorted.filter(
      (region) =>
        region.name.toLowerCase().includes(needle) ||
        region.iso.toLowerCase().includes(needle),
    )
  }, [sorted, query])

  return (
    <section className="mt-10 sm:hidden">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="label">国家索引</h2>
        <p className="text-[11px] text-muted">{regions.length} 个</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索国家 / ISO"
        className="mt-3 h-10 w-full border border-line bg-base px-3 text-[13px] outline-none placeholder:text-muted focus:border-ink"
      />

      {filtered.length === 0 ? (
        <p className="py-6 text-[13px] text-muted">没有匹配的国家。</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-px border border-line bg-line">
          {filtered.map((region) => {
            const iso = region.iso.toUpperCase()
            const stat = stats[iso]
            return (
              <button
                key={region.id}
                type="button"
                onClick={() => onSelect(iso)}
                className="flex min-h-14 items-center gap-3 bg-base px-3 py-3 text-left transition-colors duration-150 hover:bg-surface"
              >
                <IndexFlag iso={iso} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{region.name}</span>
                  <span className="tnum block text-[11px] text-muted">
                    {stat ? `${stat.owned}/${stat.total} · ${formatPercent(stat.ratio)}` : '—'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
