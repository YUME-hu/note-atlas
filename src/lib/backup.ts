import { db } from '@/db/db'
import type { Progress, Status } from '@/types'

/**
 * JSON backup: the only safety net for iOS/Storage-cleanup wiping IndexedDB.
 * Format is deliberately small and versioned when the shape changes.
 */

export interface BackupFile {
  app: 'note-atlas'
  format: 1
  exported_at: string
  progress: Progress[]
}

export function backupFileName(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `note-atlas-backup-${year}${month}${day}.json`
}

export async function exportProgress(): Promise<number> {
  const progress = await db.progress.toArray()
  const payload: BackupFile = {
    app: 'note-atlas',
    format: 1,
    exported_at: new Date().toISOString(),
    progress,
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
  return progress.length
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseBackup(raw: unknown): Progress[] {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.progress)
      ? raw.progress
      : null
  if (!list) throw new Error('不是 note-atlas 的备份文件（缺少 progress 数组）')

  const rows: Progress[] = []
  for (const [index, item] of list.entries()) {
    if (!isRecord(item)) throw new Error(`第 ${index + 1} 条记录不是对象`)
    const noteId = typeof item.note_id === 'string' ? item.note_id.trim() : ''
    const status = item.status
    if (!noteId) throw new Error(`第 ${index + 1} 条缺少 note_id`)
    if (status !== 'owned' && status !== 'want') {
      throw new Error(`第 ${index + 1} 条 status 必须是 owned 或 want`)
    }
    const updatedAt =
      typeof item.updated_at === 'number' && Number.isFinite(item.updated_at)
        ? item.updated_at
        : Date.now()
    rows.push({ note_id: noteId, status: status as Status, updated_at: updatedAt })
  }
  return rows
}

/** Merge/overwrite by note_id. Rows not present in the file are left untouched. */
export async function importProgress(file: File): Promise<number> {
  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('文件不是合法的 JSON')
  }
  const rows = parseBackup(raw)
  if (rows.length > 0) await db.progress.bulkPut(rows)
  return rows.length
}
