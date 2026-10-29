import { Check, Heart, Minus } from 'lucide-react'
import { setNoteStatus } from '@/db/db'
import { cn } from '@/lib/utils'
import type { NoteStatus } from '@/types'

const OPTIONS = [
  { value: 'owned', label: '已收', Icon: Check },
  { value: 'want', label: '想要', Icon: Heart },
  { value: null, label: '无', Icon: Minus },
] as const

/**
 * Three-state mark. Writes straight to Dexie; the map and the lists
 * recompute through useLiveQuery.
 */
export function StatusToggle({
  noteId,
  status,
}: {
  noteId: string
  status: NoteStatus
}) {
  return (
    <div
      role="group"
      aria-label="收藏状态"
      className="flex shrink-0 items-stretch border border-line"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = status === value
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => void setNoteStatus(noteId, value)}
            className={cn(
              'flex size-8 items-center justify-center border-l border-line transition-colors duration-150 first:border-l-0 sm:size-7',
              active && value === 'owned' && 'bg-accent/15 text-accent',
              active && value === 'want' && 'bg-want/15 text-want',
              active && value === null && 'bg-elevated text-ink',
              !active && 'text-muted hover:bg-elevated hover:text-ink',
            )}
          >
            <Icon size={13} strokeWidth={1.75} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
