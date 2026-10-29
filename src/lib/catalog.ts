import type { Note, Region, Series, Stat, Status } from '@/types'

/**
 * Catalog aggregation. This module knows nothing about the map library:
 * it turns directory rows + progress rows into counts, keyed by ISO.
 */

export interface Catalog {
  regions: Region[]
  series: Series[]
  notes: Note[]
  regionById: Map<string, Region>
  regionByIso: Map<string, Region>
  seriesByRegion: Map<string, Series[]>
  notesBySeries: Map<string, Note[]>
  childrenByParent: Map<string, Region[]>
}

export function createCatalog(
  regions: Region[],
  series: Series[],
  notes: Note[],
): Catalog {
  const regionById = new Map(regions.map((r) => [r.id, r]))
  const regionByIso = new Map(regions.map((r) => [r.iso.toUpperCase(), r]))

  const seriesByRegion = new Map<string, Series[]>()
  for (const s of series) {
    const bucket = seriesByRegion.get(s.region_id) ?? []
    bucket.push(s)
    seriesByRegion.set(s.region_id, bucket)
  }
  for (const bucket of seriesByRegion.values()) {
    bucket.sort((a, b) => a.year_start - b.year_start || a.name.localeCompare(b.name))
  }

  const notesBySeries = new Map<string, Note[]>()
  for (const n of notes) {
    const bucket = notesBySeries.get(n.series_id) ?? []
    bucket.push(n)
    notesBySeries.set(n.series_id, bucket)
  }
  for (const bucket of notesBySeries.values()) {
    bucket.sort((a, b) => a.denom - b.denom || a.label.localeCompare(b.label))
  }

  const childrenByParent = new Map<string, Region[]>()
  for (const r of regions) {
    if (!r.parent) continue
    const bucket = childrenByParent.get(r.parent) ?? []
    bucket.push(r)
    childrenByParent.set(r.parent, bucket)
  }

  return {
    regions,
    series,
    notes,
    regionById,
    regionByIso,
    seriesByRegion,
    notesBySeries,
    childrenByParent,
  }
}

/** A region plus its descendants — HK/MO count towards CN. */
function regionBranch(catalog: Catalog, regionId: string): Region[] {
  const root = catalog.regionById.get(regionId)
  if (!root) return []
  const out: Region[] = []
  const queue: Region[] = [root]
  while (queue.length > 0) {
    const region = queue.shift()!
    out.push(region)
    queue.push(...(catalog.childrenByParent.get(region.id) ?? []))
  }
  return out
}

export function regionSeries(catalog: Catalog, regionId: string): Series[] {
  return regionBranch(catalog, regionId)
    .flatMap((r) => catalog.seriesByRegion.get(r.id) ?? [])
    .sort((a, b) => a.year_start - b.year_start || a.name.localeCompare(b.name))
}

export function regionNotes(catalog: Catalog, regionId: string): Note[] {
  return regionSeries(catalog, regionId).flatMap(
    (s) => catalog.notesBySeries.get(s.id) ?? [],
  )
}

export function seriesNotes(catalog: Catalog, seriesId: string): Note[] {
  return catalog.notesBySeries.get(seriesId) ?? []
}

export function computeStat(
  notes: readonly Note[],
  statusById: ReadonlyMap<string, Status>,
): Stat {
  let owned = 0
  let want = 0
  for (const note of notes) {
    const status = statusById.get(note.id)
    if (status === 'owned') owned += 1
    else if (status === 'want') want += 1
  }
  const total = notes.length
  return { total, owned, want, ratio: total === 0 ? null : owned / total }
}

export function seriesStat(
  catalog: Catalog,
  seriesId: string,
  statusById: ReadonlyMap<string, Status>,
): Stat {
  return computeStat(seriesNotes(catalog, seriesId), statusById)
}

/** Map layer input: region ISO (alpha-2) → counts. Contains only known regions. */
export function mapStats(
  catalog: Catalog,
  statusById: ReadonlyMap<string, Status>,
): Record<string, Stat> {
  const out: Record<string, Stat> = {}
  for (const region of catalog.regions) {
    out[region.iso.toUpperCase()] = computeStat(
      regionNotes(catalog, region.id),
      statusById,
    )
  }
  return out
}

export function sumStats(stats: Iterable<Stat>): Stat {
  let total = 0
  let owned = 0
  let want = 0
  for (const stat of stats) {
    total += stat.total
    owned += stat.owned
    want += stat.want
  }
  return { total, owned, want, ratio: total === 0 ? null : owned / total }
}
