/** A note is either collected, wanted, or neither (no row in the DB). */
export type Status = 'owned' | 'want'
export type NoteStatus = Status | null

/** Directory layer — read only, shipped as offline JSON. */
export interface Region {
  id: string
  name: string
  /** ISO 3166-1 alpha-2. The map is keyed by this, never by country name. */
  iso: string
  flag: string
  /** null = independent issuer, otherwise the region it belongs to (HK → CN). */
  parent: string | null
  issuers?: string[]
}

export interface Series {
  id: string
  region_id: string
  name: string
  year_start: number
  year_end: number | null
  status: 'current' | 'historical' | 'commemorative'
}

export interface Note {
  id: string
  numista_type_id: number
  series_id: string
  /** Numeric face value, used for sorting. Never sort the label string. */
  denom: number
  unit: string
  label: string
  /**
   * Only present when two notes in the same series share a label
   * ("500元 · 1949" twice). A short English obverse description from Numista,
   * shown as the secondary line so the two rows stay distinguishable.
   */
  variant?: string
  img_obverse?: string
  img_reverse?: string
}

/** Progress layer — one Dexie table. A note without a row has no status. */
export interface Progress {
  note_id: string
  status: Status
  updated_at: number
}

/** Aggregated counts for a region or a series. */
export interface Stat {
  total: number
  owned: number
  want: number
  /** null when total === 0 (nothing to draw). */
  ratio: number | null
}
