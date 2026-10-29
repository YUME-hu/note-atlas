import type { Note, Region, Series } from '@/types'

/**
 * Runtime data loading. The catalog is plain JSON produced by
 * scripts/build-catalog.mjs and served from /data — no API calls at runtime.
 */

export interface CatalogData {
  regions: Region[]
  series: Series[]
  notes: Note[]
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

async function fetchJson<T>(file: string): Promise<T> {
  const response = await fetch(`/data/${file}`, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`${file}：HTTP ${response.status}`)
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    // A dev/prod server that falls back to index.html would otherwise look
    // like a parse error; be explicit that the file is missing.
    throw new Error(`${file}：期望 JSON，实际返回 ${contentType || '未知类型'}（文件可能不存在）`)
  }
  try {
    return (await response.json()) as T
  } catch {
    throw new Error(`${file}：不是合法的 JSON`)
  }
}

/**
 * Hand-written validation of the generated catalog. It only guards the
 * invariants the UI relies on — enough to fail loudly instead of rendering a
 * half-broken map.
 */
export function validateCatalog(data: CatalogData): CatalogData {
  const { regions, series, notes } = data

  assert(Array.isArray(regions) && regions.length > 0, 'regions.json：期望非空数组')
  const regionIds = new Set<string>()
  const isos = new Set<string>()
  for (const region of regions) {
    assert(typeof region.id === 'string' && region.id, 'regions.json：存在缺少 id 的地区')
    assert(
      typeof region.iso === 'string' && /^[A-Za-z]{2}$/.test(region.iso),
      `regions.json：${region.id} 的 iso 不是两位代码`,
    )
    assert(!regionIds.has(region.id), `regions.json：id ${region.id} 重复`)
    assert(!isos.has(region.iso.toUpperCase()), `regions.json：ISO ${region.iso} 重复`)
    assert(typeof region.name === 'string' && region.name, `regions.json：${region.id} 缺少名称`)
    regionIds.add(region.id)
    isos.add(region.iso.toUpperCase())
  }

  assert(Array.isArray(series), 'series.json：期望数组')
  const seriesIds = new Set<string>()
  for (const item of series) {
    assert(typeof item.id === 'string' && item.id, 'series.json：存在缺少 id 的版别')
    assert(!seriesIds.has(item.id), `series.json：id ${item.id} 重复`)
    assert(regionIds.has(item.region_id), `series.json：${item.id} 的 region_id ${item.region_id} 不存在`)
    assert(
      item.year_start === null || isFiniteNumber(item.year_start),
      `series.json：${item.id} 的 year_start 不是数字`,
    )
    seriesIds.add(item.id)
  }

  assert(Array.isArray(notes), 'notes.json：期望数组')
  const noteIds = new Set<string>()
  for (const note of notes) {
    assert(typeof note.id === 'string' && note.id, 'notes.json：存在缺少 id 的券种')
    assert(!noteIds.has(note.id), `notes.json：id ${note.id} 重复`)
    assert(seriesIds.has(note.series_id), `notes.json：${note.id} 的 series_id ${note.series_id} 不存在`)
    assert(isFiniteNumber(note.denom), `notes.json：${note.id} 的 denom 不是数字`)
    assert(typeof note.label === 'string' && note.label, `notes.json：${note.id} 缺少 label`)
    noteIds.add(note.id)
  }

  return data
}

export async function loadCatalogData(): Promise<CatalogData> {
  const [regions, series, notes] = await Promise.all([
    fetchJson<Region[]>('regions.json'),
    fetchJson<Series[]>('series.json'),
    fetchJson<Note[]>('notes.json'),
  ])
  return validateCatalog({ regions, series, notes })
}
