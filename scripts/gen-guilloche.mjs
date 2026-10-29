#!/usr/bin/env node
/**
 * Guilloche background (design spec 7.6, light version) → public/bg/guilloche.svg
 *
 * Abstract only: concentric ellipse rosettes and sinuous interlaced bands, in
 * strokes barely brighter than the page background. No figures, no buildings.
 * The layer is masked in CSS so the map itself stays clean; motion is a 90s
 * CSS transform, disabled under prefers-reduced-motion.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public/bg')

const W = 1600
const H = 900

const lines = []
const stroke = (color, width, opacity = 1) =>
  ` fill="none" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}"`

function rosette(cx, cy, rings, startR, step, squash, rotation, color) {
  const parts = []
  for (let i = 0; i < rings; i++) {
    const r = startR + i * step
    parts.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${r.toFixed(1)}" ry="${(r * squash).toFixed(1)}"${stroke(color, 0.5, 0.9)} transform="rotate(${rotation} ${cx} ${cy})"/>`,
    )
  }
  return parts.join('')
}

function band(cx, cy, radius, amplitude, lobes, phase, squash, samples, color) {
  const points = []
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * Math.PI * 2
    const r = radius + amplitude * Math.sin(lobes * t + phase)
    const x = cx + r * Math.cos(t)
    const y = cy + r * Math.sin(t) * squash
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return `<polyline points="${points.join(' ')}"${stroke(color, 0.55, 0.85)}/>`
}

// bottom-right rosette — the largest mass, sits under the map's right edge
lines.push(rosette(1280, 760, 54, 34, 11, 0.62, -14, '#26262e'))
lines.push(rosette(1280, 760, 24, 60, 17, 0.62, -14, '#1e1e24'))

// top-left rosette — smaller, keeps the corners from feeling empty
lines.push(rosette(40, 30, 26, 24, 13, 0.7, 8, '#1e1e24'))
lines.push(rosette(40, 30, 14, 40, 19, 0.7, 8, '#232329'))

// interlaced bands sweeping the edges
for (let i = 0; i < 7; i++) {
  lines.push(
    band(-140, 620 + i * 22, 300 + i * 46, 26 + i * 6, 9 + i, i * 0.7, 0.5, 260, '#232329'),
  )
}
for (let i = 0; i < 5; i++) {
  lines.push(
    band(1560, -80, 260 + i * 52, 20 + i * 4, 7 + i, i * 1.1, 0.42, 240, '#1e1e24'),
  )
}

// fine horizontal micro-lines along the bottom edge
for (let i = 0; i < 36; i++) {
  const y = 812 + i * 2.4
  const start = 240 + (i % 5) * 30
  const end = 1220 - (i % 7) * 24
  lines.push(`<line x1="${start}" y1="${y.toFixed(1)}" x2="${end}" y2="${y.toFixed(1)}"${stroke('#232329', 0.4, 0.7)}/>`)
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${lines.join('\n')}
</svg>
`

await mkdir(OUT, { recursive: true })
await writeFile(path.join(OUT, 'guilloche.svg'), svg, 'utf8')
console.log(`wrote public/bg/guilloche.svg (${(svg.length / 1024).toFixed(0)} KB)`)
