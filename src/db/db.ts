import Dexie, { type EntityTable } from 'dexie'
import type {
  CustomNote,
  CustomRegion,
  NoteStatus,
  Progress,
  SyncedNote,
} from '@/types'

const db = new Dexie('note-atlas') as Dexie & {
  progress: EntityTable<Progress, 'note_id'>
  custom_notes: EntityTable<CustomNote, 'id'>
  synced_notes: EntityTable<SyncedNote, 'id'>
  custom_regions: EntityTable<CustomRegion, 'id'>
}

db.version(1).stores({
  progress: 'note_id, status, updated_at',
})

db.version(2).stores({
  progress: 'note_id, status, updated_at',
  custom_notes: 'id, region_id, series_id, created_at',
  synced_notes: 'id, region_id, synced_at',
})

db.version(3).stores({
  progress: 'note_id, status, updated_at',
  custom_notes: 'id, region_id, series_id, created_at',
  synced_notes: 'id, region_id, synced_at',
  custom_regions: 'id, iso, created_at',
})

export { db }

/**
 * Three-state write. "no status" is the absence of a row, not a stored null.
 */
export async function setNoteStatus(noteId: string, status: NoteStatus) {
  if (status === null) {
    await db.progress.delete(noteId)
    return
  }
  await db.progress.put({ note_id: noteId, status, updated_at: Date.now() })
}
