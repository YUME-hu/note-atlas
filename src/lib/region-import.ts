import { db } from '@/db/db'
import type { CustomNote, CustomRegion } from '@/types'

/**
 * Import a country from a hand-written JSON file.
 *
 * Bundled countries are rejected: use the per-note form or in-app sync for those.
 * Imported notes live in custom_notes, so they behave exactly like manually
 * added notes (toggle, backup, delete).
 */

export interface CountryImportNote {
  denom: number
  name: string
  label?: string
  /** Per-note series name; overrides the file-level `series`. */
  series?: string
}

export interface CountryImportFile {
  region: {
    iso: string
    name: string
    unit: string
    issuers?: string[]
  }
  series?: string
  notes: CountryImportNote[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseCountryImport(raw: unknown): CountryImportFile {
  if (!isRecord(raw)) throw new Error('不是国家 JSON 对象')
  if (!isRecord(raw.region)) throw new Error('缺少 region 对象')
  const region = raw.region
  const iso = typeof region.iso === 'string' ? region.iso.trim().toUpperCase() : ''
  const name = typeof region.name === 'string' ? region.name.trim() : ''
  const unit = typeof region.unit === 'string' ? region.unit.trim() : ''
  if (!/^[A-Z]{2}$/.test(iso)) throw new Error('region.iso 必须是两位字母，如 RS')
  if (!name) throw new Error('region.name 不能为空')
  if (!unit) throw new Error('region.unit 不能为空')
  const issuers = Array.isArray(region.issuers)
    ? region.issuers.filter((item): item is string => typeof item === 'string')
    : []

  if (!Array.isArray(raw.notes) || raw.notes.length === 0) {
    throw new Error('notes 必须是非空数组')
  }
  if (raw.notes.length > 500) throw new Error('一次最多导入 500 条')

  const notes: CountryImportNote[] = raw.notes.map((item, index) => {
    if (!isRecord(item)) throw new Error(`notes 第 ${index + 1} 条不是对象`)
    const denom = typeof item.denom === 'number' ? item.denom : Number(item.denom)
    if (!Number.isFinite(denom) || denom <= 0) {
      throw new Error(`notes 第 ${index + 1} 条 denom 必须是正数`)
    }
    const noteName = typeof item.name === 'string' ? item.name.trim() : ''
    const label = typeof item.label === 'string' ? item.label.trim() : ''
    if (!noteName && !label) throw new Error(`notes 第 ${index + 1} 条需要 name 或 label`)
    return {
      denom,
      name: noteName || label,
      label: label || undefined,
      series: typeof item.series === 'string' && item.series.trim() ? item.series.trim() : undefined,
    }
  })

  return {
    region: { iso, name, unit, issuers },
    series: typeof raw.series === 'string' && raw.series.trim() ? raw.series.trim() : undefined,
    notes,
  }
}

export async function importCountry(
  file: File,
  knownIsos: string[],
): Promise<{ region: CustomRegion; notes: number }> {
  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('文件不是合法的 JSON')
  }
  const parsed = parseCountryImport(raw)
  const iso = parsed.region.iso
  if (knownIsos.map((item) => item.toUpperCase()).includes(iso)) {
    throw new Error(`${iso} 已在目录里；用面板里的“添加自定义纸币”，或在设置里同步更新`)
  }

  const base = iso.toLowerCase()
  const id = `custom-region-${base}`
  const existing = await db.custom_regions.get(id)
  if (existing) throw new Error(`${iso} 已导入过（${existing.name}），先删除再导入`)

  const defaultSeries = parsed.series ?? '标准流通钞'
  const seriesNames = [...new Set(parsed.notes.map((note) => note.series ?? defaultSeries))]
  const seriesIdByName = new Map<string, string>()
  if (seriesNames.length === 1) {
    seriesIdByName.set(seriesNames[0], `${base}-imported`)
  } else {
    seriesNames.forEach((name, index) => {
      seriesIdByName.set(name, `custom-series-${base}-${index + 1}`)
    })
  }

  const created = Date.now()
  const region: CustomRegion = {
    id,
    iso,
    name: parsed.region.name,
    unit: parsed.region.unit,
    issuers: parsed.region.issuers ?? [],
    created_at: created,
  }

  const notes: CustomNote[] = parsed.notes.map((note, index) => {
    const seriesName = note.series ?? defaultSeries
    return {
      id: `custom-${base}-${created}-${index}`,
      region_id: base,
      series_id: seriesIdByName.get(seriesName) ?? `${base}-imported`,
      denom: note.denom,
      unit: parsed.region.unit,
      label: note.label ?? `${note.denom}${parsed.region.unit} · ${note.name}`,
      name: note.name || `#${note.denom}`,
      series_name: seriesName,
      created_at: created + index,
    }
  })

  await db.transaction('rw', db.custom_regions, db.custom_notes, async () => {
    await db.custom_regions.put(region)
    await db.custom_notes.bulkPut(notes)
  })

  return { region, notes: notes.length }
}

export async function deleteCustomRegion(region: CustomRegion): Promise<void> {
  const regionId = region.iso.toLowerCase()
  await db.transaction('rw', db.custom_regions, db.custom_notes, db.progress, async () => {
    const notes = await db.custom_notes.where('region_id').equals(regionId).toArray()
    for (const note of notes) await db.progress.delete(note.id)
    await db.custom_notes.where('region_id').equals(regionId).delete()
    await db.custom_regions.delete(region.id)
  })
}
