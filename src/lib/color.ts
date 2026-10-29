import type { Stat } from '@/types'

/**
 * Choropleth scale (design spec 7.4).
 * Gold is reserved for 100% — do not reuse it here for anything else.
 */
export const MAP_COLORS = {
  empty: '#2a2a2e',
  low: '#3b5b8c',
  lowMid: '#3d8b7a',
  mid: '#b8a34a',
  high: '#c47a3a',
  near: '#5a9e6f',
  complete: '#c9a227',
} as const

export function mapColor(stat: Stat | undefined): string {
  if (!stat || stat.total === 0 || stat.owned === 0) return MAP_COLORS.empty
  const ratio = stat.owned / stat.total
  if (ratio >= 1) return MAP_COLORS.complete
  if (ratio > 0.8) return MAP_COLORS.near
  if (ratio > 0.6) return MAP_COLORS.high
  if (ratio > 0.4) return MAP_COLORS.mid
  if (ratio > 0.2) return MAP_COLORS.lowMid
  return MAP_COLORS.low
}

export const LEGEND: ReadonlyArray<{ label: string; color: string }> = [
  { label: '0%', color: MAP_COLORS.empty },
  { label: '1–20%', color: MAP_COLORS.low },
  { label: '20–40%', color: MAP_COLORS.lowMid },
  { label: '40–60%', color: MAP_COLORS.mid },
  { label: '60–80%', color: MAP_COLORS.high },
  { label: '80–99%', color: MAP_COLORS.near },
  { label: '100%', color: MAP_COLORS.complete },
]

export function formatPercent(ratio: number | null): string {
  if (ratio === null) return '—'
  return `${Math.round(ratio * 100)}%`
}
