import Dexie, { type EntityTable } from 'dexie'
import type { NoteStatus, Progress } from '@/types'

const db = new Dexie('note-atlas') as Dexie & {
  progress: EntityTable<Progress, 'note_id'>
}

db.version(1).stores({
  progress: 'note_id, status, updated_at',
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
