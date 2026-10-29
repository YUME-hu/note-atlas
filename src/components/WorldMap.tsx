import { useMemo } from 'react'
import { MapBase, MapFeature, MapFeatures } from '@d3-maps/react'
import countriesTopology from '@d3-maps/atlas/world/countries/countries-50m'
import countryMetadata from '@d3-maps/atlas/metadata/countries'
import { mapColor } from '@/lib/color'
import type { Stat } from '@/types'

/** ISO alpha-3 (topology `properties.id`) → alpha-2 (our region keys). */
const ISO_A3_TO_A2 = new Map<string, string>()
// A few atlas metadata rows only carry adm0A3 (France, Norway) and Singapore is
// omitted from the 110m topology but still has a 50m entry.
const ADM0_TO_A2: Record<string, string> = { FRA: 'FR', NOR: 'NO', SGP: 'SG' }
for (const country of countryMetadata) {
  const a3 = String(country.isoA3 ?? country.adm0A3 ?? '').toUpperCase()
  const a2 = String(country.isoA2 ?? ADM0_TO_A2[a3] ?? '').toUpperCase()
  if (a3 && a2) ISO_A3_TO_A2.set(a3, a2)
}

const HOVER_STYLE = { hover: { stroke: '#e8e6e1', strokeWidth: 0.75 } }

interface WorldMapProps {
  /** ISO alpha-2 → counts. Keys are the only clickable countries. */
  stats: Record<string, Stat>
  names: Record<string, string>
  selectedIso: string | null
  onSelect: (iso: string) => void
}

export function WorldMap({ stats, names, selectedIso, onSelect }: WorldMapProps) {
  const interactiveIsos = useMemo(() => new Set(Object.keys(stats)), [stats])

  return (
    <MapBase
        width={1040}
        aspectRatio={2}
        padding={4}
        role="group"
        aria-label="世界地图，按收藏进度着色"
        className="select-none"
      >
        <MapFeatures
          data={countriesTopology}
          objectKey="features"
          fill="#2a2a2e"
          stroke="#2e2e38"
          strokeWidth={0.5}
          strokeLinejoin="round"
        >
          {({ features }) =>
            features.map((feature) => {
              const isoA2 = ISO_A3_TO_A2.get(
                String(feature.properties?.id ?? '').toUpperCase(),
              )
              if (!isoA2) {
                return (
                  <MapFeature key={feature.key} d={feature.d} fill="#2a2a2e" />
                )
              }
              const stat = stats[isoA2]
              const interactive = interactiveIsos.has(isoA2)
              const selected = isoA2 === selectedIso
              const name = names[isoA2]

              return (
                <MapFeature
                  key={feature.key}
                  d={feature.d}
                  fill={stat ? mapColor(stat) : '#2a2a2e'}
                  stroke={selected ? '#e8e6e1' : undefined}
                  strokeWidth={selected ? 0.75 : undefined}
                  styles={interactive ? HOVER_STYLE : undefined}
                  className={interactive ? 'cursor-pointer' : undefined}
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={
                    interactive
                      ? `${name ?? isoA2}，已收 ${stat?.owned ?? 0} / ${stat?.total ?? 0}`
                      : undefined
                  }
                  onClick={interactive ? () => onSelect(isoA2) : undefined}
                  onKeyDown={
                    interactive
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onSelect(isoA2)
                          }
                        }
                      : undefined
                  }
                />
              )
            })
          }
        </MapFeatures>
      </MapBase>
  )
}
