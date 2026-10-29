import { db } from '@/db/db'
import type { CustomNote, Progress, Status, SyncedNote } from '@/types'

/**
 * JSON backup, format 2.
 *
 * v1 only carried `progress`; v2 adds the two local tables that now hold real
 * data (custom notes + in-app Numista syncs). Import stays backward compatible:
 * a v1 file or a bare progress array still restores progress.
 */

export interface BackupFile {
  app: 'note-atlas'
  format: 2
  exported_at: string
  progress: Progress[]
  custom_notes: CustomNote[]
  synced_notes: SyncedNote[]
}

export interface BackupCounts {
  progress: number
  custom: number
  synced: number
}

const STATUSES: Status[] = ['owned', 'want']

export function backupFileName(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `note-atlas-backup-${year}${month}${day}.json`
}

export async function exportProgress(): Promise<BackupCounts> {
  const [progress, customNotes, syncedNotes] = await Promise.all([
    db.progress.toArray(),
    db.custom_notes.toArray(),
    db.synced_notes.toArray(),
  ])
  const payload: BackupFile = {
    app: 'note-atlas',
    format: 2,
    exported_at: new Date().toISOString(),
    progress,
    custom_notes: customNotes,
    synced_notes: syncedNotes,
  }
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = backupFileName()
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return {
    progress: progress.length,
    custom: customNotes.length,
    synced: syncedNotes.length,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseProgressList(raw: unknown): Progress[] {
  if (!Array.isArray(raw)) throw new Error('progress 不是数组')
  const rows: Progress[] = []
  for (const [index, item] of raw.entries()) {
    if (!isRecord(item)) throw new Error(`progress 第 ${index + 1} 条不是对象`)
    const noteId = typeof item.note_id === 'string' ? item.note_id.trim() : ''
    if (!noteId) throw new Error(`progress 第 ${index + 1} 条缺少 note_id`)
    if (!STATUSES.includes(item.status as Status)) {
      throw new Error(`progress 第 ${index + 1} 条 status 必须是 owned 或 want`)
    }
    rows.push({
      note_id: noteId,
      status: item.status as Status,
      updated_at: isFiniteNumber(item.updated_at) ? item.updated_at : Date.now(),
    })
  }
  return rows
}

function parseCustomList(raw: unknown): CustomNote[] {
  if (!Array.isArray(raw)) throw new Error('custom_notes 不是数组')
  const rows: CustomNote[] = []
  for (const [index, item] of raw.entries()) {
    if (!isRecord(item)) throw new Error(`custom_notes 第 ${index + 1} 条不是对象`)
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    const regionId = typeof item.region_id === 'string' ? item.region_id.trim() : ''
    const seriesId = typeof item.series_id === 'string' ? item.series_id.trim() : ''
    if (!id || !regionId || !seriesId) {
      throw new Error(`custom_notes 第 ${index + 1} 条缺少 id / region_id / series_id`)
    }
    if (!isFiniteNumber(item.denom)) {
      throw new Error(`custom_notes 第 ${index + 1} 条 denom 不是数字`)
    }
    rows.push({
      id,
      region_id: regionId,
      series_id: seriesId,
      denom: item.denom,
      unit: typeof item.unit === 'string' ? item.unit : '',
      label: typeof item.label === 'string' ? item.label : String(item.denom),
      name: typeof item.name === 'string' ? item.name : '',
      created_at: isFiniteNumber(item.created_at) ? item.created_at : Date.now(),
    })
  }
  return rows
}

function parseSyncedList(raw: unknown): SyncedNote[] {
  if (!Array.isArray(raw)) throw new Error('synced_notes 不是数组')
  const rows: SyncedNote[] = []
  for (const [index, item] of raw.entries()) {
    if (!isRecord(item)) throw new Error(`synced_notes 第 ${index + 1} 条不是对象`)
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    const regionId = typeof item.region_id === 'string' ? item.region_id.trim() : ''
    const seriesId = typeof item.series_id === 'string' ? item.series_id.trim() : ''
    if (!id || !regionId || !seriesId) {
      throw new Error(`synced_notes 第 ${index + 1} 条缺少 id / region_id / series_id`)
    }
    if (!isFiniteNumber(item.denom)) {
      throw new Error(`synced_notes 第 ${index + 1} 条 denom 不是数字`)
    }
    rows.push({
      id,
      region_id: regionId,
      series_id: seriesId,
      numista_type_id: isFiniteNumber(item.numista_type_id) ? item.numista_type_id : 0,
      denom: item.denom,
      unit: typeof item.unit === 'string' ? item.unit : '',
      label: typeof item.label === 'string' ? item.label : String(item.denom),
      synced_at: isFiniteNumber(item.synced_at) ? item.synced_at : Date.now(),
    })
  }
  return rows
}

export interface ParsedBackup {
  format: number
  progress: Progress[]
  custom: CustomNote[]
  synced: SyncedNote[]
}

export function parseBackup(raw: unknown): ParsedBackup {
  // Legacy: a bare progress array.
  if (Array.isArray(raw)) {
    return { format: 1, progress: parseProgressList(raw), custom: [], synced: [] }
  }
  if (!isRecord(raw)) throw new Error('不是 note-atlas 的备份文件')

  const hasProgress = Array.isArray(raw.progress)
  const hasCustom = Array.isArray(raw.custom_notes)
  const hasSynced = Array.isArray(raw.synced_notes)
  if (!hasProgress && !hasCustom && !hasSynced) {
    throw new Error('不是 note-atlas 的备份文件（缺少 progress / custom_notes / synced_notes）')
  }

  return {
    format: isFiniteNumber(raw.format) ? raw.format : 1,
    progress: hasProgress ? parseProgressList(raw.progress) : [],
    custom: hasCustom ? parseCustomList(raw.custom_notes) : [],
    synced: hasSynced ? parseSyncedList(raw.synced_notes) : [],
  }
}

function emptyCounts(): BackupCounts {
  return { progress: 0, custom: 0, synced: 0 }
}

/**
 * Restore all three tables. Merge-by-id, never clear first: a v1 backup (or an
 * older v2) must not wipe custom notes created after it was taken.
 */
export async function importProgress(file: File): Promise<BackupCounts> {
  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('文件不是合法的 JSON')
  }
  const parsed = parseBackup(raw)
  const counts = emptyCounts()

  await db.transaction('rw', db.progress, db.custom_notes, db.synced_notes, async () => {
    if (parsed.progress.length > 0) {
      await db.progress.bulkPut(parsed.progress)
      counts.progress = parsed.progress.length
    }
    if (parsed.custom.length > 0) {
      await db.custom_notes.bulkPut(parsed.custom)
      counts.custom = parsed.custom.length
    }
    if (parsed.synced.length > 0) {
      await db.synced_notes.bulkPut(parsed.synced)
      counts.synced = parsed.synced.length
    }
  })

  return counts
}
