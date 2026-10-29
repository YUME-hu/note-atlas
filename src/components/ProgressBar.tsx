import { cn } from '@/lib/utils'

/**
 * Segmented progress bar: 20 ticks, one per 5%.
 * Progress is ink; gold appears only when the set is complete.
 */
export function ProgressBar({ ratio }: { ratio: number | null }) {
  const complete = ratio !== null && ratio >= 1
  const filled = ratio === null ? 0 : Math.round(ratio * 20)

  return (
    <div className="mt-2 flex h-2 gap-1" aria-hidden="true">
      {Array.from({ length: 20 }, (_, index) => (
        <span
          key={index}
          className={cn(
            'flex-1',
            index < filled ? (complete ? 'bg-accent' : 'bg-ink') : 'bg-elevated',
          )}
        />
      ))}
    </div>
  )
}
