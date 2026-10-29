import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { computeStat, regionNotes, regionSeries } from '@/lib/catalog'
import { formatPercent } from '@/lib/color'
import { cn } from '@/lib/utils'
import { ProgressBar } from './ProgressBar'
import { StatusToggle } from './StatusToggle'
import type { Catalog } from '@/lib/catalog'
import type { Note, NoteStatus, Region, Series, Status } from '@/types'

type Tab = 'series' | 'denom'

interface RegionPanelProps {
  region: Region
  catalog: Catalog
  statusById: ReadonlyMap<string, Status>
  onClose: () => void
}

function yearLabel(series: Series): string {
  if (series.year_start == null) return ''
  return series.year_end ? `${series.year_start}–${series.year_end}` : `${series.year_start}–`
}

/**
 * Engraved flag (spec 7.5) at 48×32, falling back to the ISO letter block when
 * no engraved asset exists for the region yet.
 */
function RegionMark({ region }: { region: Region }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className="flex size-12 shrink-0 items-center justify-center border border-line text-[14px] font-medium tracking-[0.08em]"
        aria-hidden="true"
      >
        {region.iso}
      </div>
    )
  }

  return (
    <img
      src={`/flags/engraved/${region.iso.toLowerCase()}.svg`}
      alt=""
      width={48}
      height={32}
      className="h-8 w-12 shrink-0 border border-line"
      onError={() => setFailed(true)}
    />
  )
}

/**
 * 40px thumbnail, or a printed "ticket slot" placeholder when the image was not
 * downloaded. 4px radius stays inside the container radius rule from 7.3.
 */
function NoteThumb({ note }: { note: Note }) {
  if (note.img_obverse) {
    return (
      <img
        src={note.img_obverse}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        decoding="async"
        className="size-10 shrink-0 rounded-[4px] border border-line bg-elevated object-cover"
      />
    )
  }
  const face = note.label.split(' · ')[0]
  const match = /^([\d.,]+)\s*(.*)$/.exec(face)
  const amount = match?.[1] ?? face
  const unit = match?.[2] ?? ''

  return (
    <div
      aria-hidden="true"
      className="relative size-10 shrink-0 overflow-hidden rounded-[4px] border border-line bg-elevated/40"
    >
      <span className="tnum absolute left-1 top-0.5 text-[9px] leading-3 text-muted">
        {amount}
      </span>
      <span className="absolute bottom-0.5 right-1 text-[7px] leading-3 text-muted">
        {unit}
      </span>
    </div>
  )
}

function NoteRow({
  note,
  status,
  subtitle,
}: {
  note: Note
  status: NoteStatus
  subtitle?: string
}) {
  return (
    <li className="flex items-center gap-2 border-t border-hairline py-2 pl-6">
      <NoteThumb note={note} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px]">{note.label}</p>
        {subtitle && (
          <p title={subtitle} className="mt-1 truncate text-[11px] text-muted">
            {subtitle}
          </p>
        )}
      </div>
      <StatusToggle noteId={note.id} status={status} />
    </li>
  )
}

export function RegionPanel({
  region,
  catalog,
  statusById,
  onClose,
}: RegionPanelProps) {
  const [tab, setTab] = useState<Tab>('series')
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const bodyRef = useRef<HTMLDivElement>(null)

  const notes = regionNotes(catalog, region.id)
  const stat = computeStat(notes, statusById)
  const seriesList = regionSeries(catalog, region.id)
  const byDenom = [...notes].sort(
    (a, b) => a.denom - b.denom || a.label.localeCompare(b.label),
  )
  const seriesName = (id: string) =>
    seriesList.find((series) => series.id === id)?.name ?? ''

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function toggleSeries(id: string) {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-20 bg-base/60 sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label={`${region.name} 券种清单`}
        className="panel-anim fixed inset-x-0 bottom-0 z-30 flex max-h-[86dvh] flex-col border-t border-line bg-surface sm:sticky sm:top-0 sm:z-auto sm:h-dvh sm:max-h-dvh sm:w-[420px] sm:shrink-0 sm:border-t-0 sm:border-l"
      >
        <header className="border-b border-line px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <RegionMark region={region} />
              <div className="min-w-0 pt-1">
                <h2 className="truncate text-xl font-bold leading-none">
                  {region.name}
                </h2>
                <p className="mt-2 truncate text-[11px] text-muted">
                  {region.iso} · {region.issuers?.join(' / ') ?? '纸币'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="-mr-2 -mt-1 flex size-8 shrink-0 items-center justify-center text-muted transition-colors duration-150 hover:bg-elevated hover:text-ink"
            >
              <X size={15} strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="label">已收</span>
              <p className="tnum text-[13px]">
                <span className="font-medium">{stat.owned}</span>
                <span className="text-muted">
                  {' '}
                  / {stat.total} · {formatPercent(stat.ratio)}
                </span>
              </p>
            </div>
            <ProgressBar ratio={stat.ratio} />
          </div>
        </header>

        <div
          role="tablist"
          aria-label="清单视图"
          className="flex shrink-0 gap-6 border-b border-line px-6"
        >
          {(
            [
              ['series', '按版别'],
              ['denom', '按面额'],
            ] as const
          ).map(([value, label]) => {
            const active = tab === value
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(value)
                  bodyRef.current?.scrollTo({ top: 0 })
                }}
                className={cn(
                  '-mb-px border-b py-3 text-[12px] font-medium tracking-[0.04em] transition-colors duration-150',
                  active
                    ? 'border-ink text-ink'
                    : 'border-transparent text-muted hover:text-ink',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 pb-8">
          {tab === 'series' ? (
            seriesList.length === 0 ? (
              <p className="py-8 text-[13px] text-muted">暂无版别数据。</p>
            ) : (
              seriesList.map((series) => {
                const rows = catalog.notesBySeries.get(series.id) ?? []
                const seriesStat = computeStat(rows, statusById)
                const open = !collapsed.has(series.id)

                return (
                  <section key={series.id} className="border-b border-hairline">
                    <button
                      type="button"
                      onClick={() => toggleSeries(series.id)}
                      aria-expanded={open}
                      className="flex w-full items-baseline justify-between gap-4 py-4 text-left"
                    >
                      <span className="flex min-w-0 items-baseline gap-2">
                        <ChevronDown
                          size={12}
                          strokeWidth={2}
                          aria-hidden
                          className={cn(
                            'shrink-0 text-muted transition-transform duration-150',
                            !open && '-rotate-90',
                          )}
                        />
                        <span className="truncate text-[13px] font-medium">
                          {series.name}
                        </span>
                        {yearLabel(series) && (
                          <span className="tnum shrink-0 text-[11px] text-muted">
                            {yearLabel(series)}
                          </span>
                        )}
                      </span>
                      <span className="tnum shrink-0 text-[12px] text-muted">
                        <span className={cn(seriesStat.owned > 0 && 'text-ink')}>
                          {seriesStat.owned}
                        </span>{' '}
                        / {seriesStat.total}
                      </span>
                    </button>

                    {open && (
                      <ul className="pb-2">
                        {rows.map((note) => (
                          <NoteRow
                            key={note.id}
                            note={note}
                            status={statusById.get(note.id) ?? null}
                            subtitle={note.variant}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })
            )
          ) : byDenom.length === 0 ? (
            <p className="py-8 text-[13px] text-muted">暂无券种数据。</p>
          ) : (
            <ul className="pt-1">
              {byDenom.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  status={statusById.get(note.id) ?? null}
                  subtitle={[seriesName(note.series_id), note.variant]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}

