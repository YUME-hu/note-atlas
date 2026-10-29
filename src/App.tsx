import { useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Settings } from 'lucide-react'
import { db } from '@/db/db'
import { createCatalog, mapStats, sumStats, withLocalRows } from '@/lib/catalog'
import { LEGEND, formatPercent } from '@/lib/color'
import { CatalogNotice } from '@/components/CatalogNotice'
import { RegionPanel } from '@/components/RegionPanel'
import { SettingsPanel } from '@/components/SettingsPanel'
import { WorldMap } from '@/components/WorldMap'
import { useCatalog } from '@/hooks/useCatalog'
import { cn } from '@/lib/utils'
import type { CustomNote, Progress, Status, SyncedNote } from '@/types'

function Legend() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-4">
      {LEGEND.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className="size-2 shrink-0"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="tnum text-[11px] text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const { state, retry } = useCatalog()

  const rows = useLiveQuery(() => db.progress.toArray(), [], [] as Progress[])
  const customRows = useLiveQuery(() => db.custom_notes.toArray(), [], [] as CustomNote[])
  const syncedRows = useLiveQuery(() => db.synced_notes.toArray(), [], [] as SyncedNote[])
  const statusById = useMemo(
    () => new Map<string, Status>(rows.map((row) => [row.note_id, row.status])),
    [rows],
  )

  // The catalog comes from /data/*.json; while it loads there is nothing to map.
  const baseCatalog = useMemo(
    () =>
      state.status === 'ready'
        ? createCatalog(state.data.regions, state.data.series, state.data.notes)
        : null,
    [state],
  )
  const catalog = useMemo(
    () =>
      baseCatalog ? withLocalRows(baseCatalog, customRows, syncedRows) : null,
    [baseCatalog, customRows, syncedRows],
  )
  const stats = useMemo(
    () => (catalog ? mapStats(catalog, statusById) : {}),
    [catalog, statusById],
  )
  const total = useMemo(() => sumStats(Object.values(stats)), [stats])
  const regionNames = useMemo(
    () =>
      catalog
        ? Object.fromEntries(
            catalog.regions.map((region) => [region.iso.toUpperCase(), region.name]),
          )
        : {},
    [catalog],
  )

  const [selectedIso, setSelectedIso] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const selectedRegion =
    catalog && selectedIso ? (catalog.regionByIso.get(selectedIso) ?? null) : null

  const closePanel = useCallback(() => setSelectedIso(null), [])

  return (
    <div className="flex min-h-dvh flex-col bg-base text-ink sm:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex w-full max-w-[1180px] items-end justify-between gap-6 px-6 py-6">
            <div>
              <h1 className="text-[13px] font-bold uppercase tracking-[0.2em]">
                note atlas
              </h1>
              <p className="mt-1 text-[11px] text-muted">纸币收藏进度</p>
            </div>

            <div className="flex items-center gap-4 sm:gap-8">
              <dl className="flex items-end gap-4 text-right sm:gap-8">
                <div>
                  <dt className="label">已收</dt>
                  <dd className="tnum mt-1 text-lg font-medium leading-none">
                    {total.owned}
                  </dd>
                </div>
                <div>
                  <dt className="label">券种</dt>
                  <dd className="tnum mt-1 text-lg leading-none">{total.total}</dd>
                </div>
                <div>
                  <dt className="label">进度</dt>
                  <dd
                    className={cn(
                      'tnum mt-1 text-lg leading-none',
                      total.ratio !== null && total.ratio >= 1 && 'text-accent',
                    )}
                  >
                    {formatPercent(total.ratio)}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="设置"
                aria-expanded={settingsOpen}
                className="flex size-8 shrink-0 items-center justify-center border border-line text-muted transition-colors duration-150 hover:bg-elevated hover:text-ink"
              >
                <Settings size={14} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1180px] px-6 py-8">
            {catalog ? (
              <>
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="label">世界地图</h2>
                  <p className="text-[11px] text-muted">点击国家查看券种清单</p>
                </div>

                <div className="relative mt-4">
                  <div
                    aria-hidden="true"
                    className={cn(
                      'guilloche-layer',
                      selectedRegion && 'guilloche-paused',
                    )}
                  />
                  <WorldMap
                    stats={stats}
                    names={regionNames}
                    selectedIso={selectedIso}
                    onSelect={setSelectedIso}
                  />
                </div>

                <Legend />
              </>
            ) : state.status === 'error' ? (
              <CatalogNotice
                tone="alert"
                title="目录载入失败"
                detail={state.message}
                onRetry={retry}
              />
            ) : (
              <CatalogNotice
                title="正在载入目录"
                detail="regions.json · series.json · notes.json"
              />
            )}
          </div>
        </main>
      </div>

      {selectedRegion && catalog && (
        <RegionPanel
          key={selectedRegion.id}
          region={selectedRegion}
          catalog={catalog}
          statusById={statusById}
          onClose={closePanel}
        />
      )}

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        noteCount={catalog?.notes.length ?? 0}
        regionCount={catalog?.regions.length ?? 0}
      />
    </div>
  )
}
