#!/usr/bin/env node
/**
 * Subdued ("tactical") flag tiles → public/flags/engraved/{iso}.svg
 *
 * Design decision (M3 revision): the pure-hatch engraving was beautiful but
 * impossible to tell apart at 48×32 once more countries arrive. These flags keep
 * the real colour-block layout and replace every colour with a low-saturation,
 * low-value variant, so they sit inside the dark UI and stay recognisable.
 *
 * Palette is deliberately dark: burgundy red, dim gold, smoke grey, olive, navy.
 * Nothing here may use --accent (that gold is reserved for 100% completion).
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public/flags/engraved')

const W = 60
const H = 40

/** Low-visibility palette. Keys are the roles a flag needs, not real colours. */
const SUBDUED = {
  red: '#5c2128',
  gold: '#a38c4a',
  plate: '#2b2b33',
  ink: '#1e1e24',
  navy: '#2b4154',
  pale: '#cfcac0',
  light: '#8f8b81',
  green: '#2f4a3c',
  orange: '#7a4a2e',
}

function starPoints(cx, cy, radius, rotation = 0) {
  const points = []
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + rotation + (i * Math.PI) / 5
    const r = i % 2 === 0 ? radius : radius * 0.382
    points.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`)
  }
  return points.join(' ')
}

function china() {
  const big = { x: 10, y: 10, r: 6 }
  const smallStars = [
    { x: 20, y: 4 },
    { x: 24, y: 8 },
    { x: 24, y: 14 },
    { x: 20, y: 18 },
  ]
  const small = smallStars
    .map(({ x, y }) => {
      const rotation = Math.atan2(big.y - y, big.x - x) + Math.PI / 2
      return `<polygon points="${starPoints(x, y, 2, rotation)}"/>`
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="China">
  <rect width="${W}" height="${H}" fill="${SUBDUED.red}"/>
  <g fill="${SUBDUED.gold}">
    <polygon points="${starPoints(big.x, big.y, big.r)}"/>
    ${small}
  </g>
</svg>
`
}

function japan() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Japan">
  <rect width="${W}" height="${H}" fill="${SUBDUED.plate}"/>
  <circle cx="30" cy="20" r="12" fill="${SUBDUED.red}"/>
</svg>
`
}

function unitedStates() {
  const stripe = H / 13
  const cantonW = 24
  const cantonH = stripe * 7
  const stripes = Array.from({ length: 13 }, (_, index) => {
    const fill = index % 2 === 0 ? SUBDUED.red : SUBDUED.plate
    return `<rect y="${(index * stripe).toFixed(2)}" width="${W}" height="${(stripe + 0.02).toFixed(2)}" fill="${fill}"/>`
  }).join('')
  // 48px 下 50 颗星会糊成一团，用 5×4 的错位点阵保留「星区」的观感。
  const stars = []
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 3 + col * 4.5 + (row % 2) * 2.25
      const y = 3 + row * 4.2
      stars.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="0.85"/>`)
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="United States">
  ${stripes}
  <rect width="${cantonW}" height="${cantonH.toFixed(2)}" fill="${SUBDUED.navy}"/>
  <g fill="${SUBDUED.pale}">${stars.join('')}</g>
</svg>
`
}

function unitedKingdom() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="United Kingdom">
  <rect width="${W}" height="${H}" fill="${SUBDUED.navy}"/>
  <g stroke="${SUBDUED.light}" stroke-width="7">
    <line x1="0" y1="0" x2="${W}" y2="${H}"/>
    <line x1="${W}" y1="0" x2="0" y2="${H}"/>
  </g>
  <g stroke="${SUBDUED.red}" stroke-width="2.6">
    <line x1="0" y1="0" x2="${W}" y2="${H}"/>
    <line x1="${W}" y1="0" x2="0" y2="${H}"/>
  </g>
  <g stroke="${SUBDUED.light}" stroke-width="8">
    <line x1="30" y1="0" x2="30" y2="${H}"/>
    <line x1="0" y1="20" x2="${W}" y2="20"/>
  </g>
  <g stroke="${SUBDUED.red}" stroke-width="3">
    <line x1="30" y1="0" x2="30" y2="${H}"/>
    <line x1="0" y1="20" x2="${W}" y2="20"/>
  </g>
</svg>
`
}

function belarus() {
  const diamonds = [5, 13, 21, 29, 37]
    .map(
      (y) =>
        `<polygon points="3.5,${y - 3} 5.5,${y} 3.5,${y + 3} 1.5,${y}" fill="${SUBDUED.red}"/>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Belarus">
  <rect width="${W}" height="26.67" fill="${SUBDUED.red}"/>
  <rect y="26.67" width="${W}" height="13.33" fill="${SUBDUED.green}"/>
  <rect width="7" height="${H}" fill="${SUBDUED.light}"/>
  ${diamonds}
</svg>
`
}

function indonesia() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Indonesia">
  <rect width="${W}" height="20" fill="${SUBDUED.red}"/>
  <rect y="20" width="${W}" height="20" fill="${SUBDUED.light}"/>
</svg>
`
}

function syria() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Syria">
  <rect width="${W}" height="13.33" fill="${SUBDUED.red}"/>
  <rect y="13.33" width="${W}" height="13.34" fill="${SUBDUED.light}"/>
  <rect y="26.67" width="${W}" height="13.33" fill="${SUBDUED.ink}"/>
  <g fill="${SUBDUED.green}">
    <circle cx="22" cy="20" r="2.4"/>
    <circle cx="38" cy="20" r="2.4"/>
  </g>
</svg>
`
}

function venezuela() {
  const stars = Array.from({ length: 8 }, (_, index) => {
    const x = 17 + index * 3.7
    const y = 21 - 4 * Math.sin((Math.PI * index) / 7)
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="0.95"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Venezuela">
  <rect width="${W}" height="13.33" fill="${SUBDUED.gold}"/>
  <rect y="13.33" width="${W}" height="13.34" fill="${SUBDUED.navy}"/>
  <rect y="26.67" width="${W}" height="13.33" fill="${SUBDUED.red}"/>
  <g fill="${SUBDUED.pale}">${stars}</g>
</svg>
`
}

function bhutan() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bhutan">
  <rect width="${W}" height="${H}" fill="${SUBDUED.orange}"/>
  <polygon points="0,0 ${W},0 0,${H}" fill="${SUBDUED.gold}"/>
  <path d="M10,27 C16,11 23,32 31,17 C37,7 45,24 51,12" fill="none" stroke="${SUBDUED.pale}" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="51" cy="12" r="1.7" fill="${SUBDUED.pale}"/>
</svg>
`
}

function cambodia() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cambodia">
  <rect width="${W}" height="${H}" fill="${SUBDUED.navy}"/>
  <rect y="8" width="${W}" height="24" fill="${SUBDUED.red}"/>
  <g fill="${SUBDUED.pale}">
    <polygon points="30,9 33.2,27 26.8,27"/>
    <polygon points="21,15 23.4,27 18.6,27"/>
    <polygon points="39,15 41.4,27 36.6,27"/>
    <rect x="17" y="27" width="26" height="3.2"/>
  </g>
</svg>
`
}

await mkdir(OUT, { recursive: true })
await writeFile(path.join(OUT, 'cn.svg'), china(), 'utf8')
await writeFile(path.join(OUT, 'jp.svg'), japan(), 'utf8')
await writeFile(path.join(OUT, 'us.svg'), unitedStates(), 'utf8')
await writeFile(path.join(OUT, 'gb.svg'), unitedKingdom(), 'utf8')
await writeFile(path.join(OUT, 'by.svg'), belarus(), 'utf8')
await writeFile(path.join(OUT, 'id.svg'), indonesia(), 'utf8')
await writeFile(path.join(OUT, 'sy.svg'), syria(), 'utf8')
await writeFile(path.join(OUT, 've.svg'), venezuela(), 'utf8')
await writeFile(path.join(OUT, 'bt.svg'), bhutan(), 'utf8')
await writeFile(path.join(OUT, 'kh.svg'), cambodia(), 'utf8')
console.log('wrote public/flags/engraved/{cn,jp,us,gb,by,id,sy,ve,bt,kh}.svg')
