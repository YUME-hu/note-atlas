import notes from '../../public/data/notes.json'
import regions from '../../public/data/regions.json'
import series from '../../public/data/series.json'
import type { Note, Region, Series } from '@/types'

/** Catalog compiled into the JS bundle for the HBuilderX / file:// build. */
export const bundledCatalog = {
  regions: regions as unknown as Region[],
  series: series as unknown as Series[],
  notes: notes as unknown as Note[],
}
