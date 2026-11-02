#!/usr/bin/env node
/**
 * flag-icons (MIT) → low-visibility SVG flags.
 *
 * Reads node_modules/flag-icons/flags/4x3/*.svg, maps every fill/stroke colour
 * onto the same subdued palette used by scripts/gen-flags.mjs, and writes
 * public/flags/pack/<iso>.svg. Flags with embedded images/gradients (crests,
 * coats of arms) are skipped and fall back to the ISO letter block in the UI.
 *
 *   node scripts/gen-flags-pack.mjs
 *   node scripts/gen-flags-pack.mjs --only cn,us,de
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'node_modules/flag-icons/flags/4x3')
const OUT = path.join(ROOT, 'public/flags/pack')
const REPORT = path.join(ROOT, 'data/reports/flags-pack.json')

const PALETTE = {
  red: '#5c2128',
  orange: '#7a4a2e',
  gold: '#a38c4a',
  green: '#2f4a3c',
  navy: '#2b4154',
  pale: '#b9b5ab',
  light: '#8f8b81',
  plate: '#2b2b33',
  ink: '#1e1e24',
}

const NAMED = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  gold: '#ffd700',
  orange: '#ffa500',
  purple: '#800080',
  grey: '#808080',
  gray: '#808080',
  silver: '#c0c0c0',
  maroon: '#800000',
  navy: '#000080',
  aqua: '#00ffff',
  lime: '#00ff00',
  fuchsia: '#ff00ff',
  teal: '#008080',
  olive: '#808000',
}

function parseColor(value) {
  const raw = String(value).trim().toLowerCase()
  if (NAMED[raw]) return NAMED[raw]
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`
  }
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw
  const rgb = /^rgba?\(([^)]+)\)$/.exec(raw)
  if (rgb) {
    const parts = rgb[1].split(',').map((part) => Number(part.trim()))
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      return `#${parts
        .slice(0, 3)
        .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
        .join('')}`
    }
  }
  return null
}

function rgbToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = (h * 60 + 360) % 360
  return { h, s, l }
}

function subdued(hex) {
  const { h, s, l } = rgbToHsl(hex)
  if (l >= 0.9 && s < 0.3) return PALETTE.pale
  if (l <= 0.14) return PALETTE.ink
  if (s < 0.16) return l > 0.55 ? PALETTE.light : PALETTE.plate
  if (h < 18 || h >= 345) return PALETTE.red
  if (h < 42) return PALETTE.orange
  if (h < 70) return PALETTE.gold
  if (h < 165) return PALETTE.green
  if (h < 260) return PALETTE.navy
  return PALETTE.plate
}

const ATTR = /(fill|stroke|stop-color|flood-color)="([^"]+)"/g
const CSS_COLOR = /(fill|stroke|stop-color):\s*(#[0-9a-fA-F]{3,6}|rgb[a]?\([^)]+\)|[a-zA-Z]+)/g

function recolor(svg) {
  const seen = new Set()
  const replace = (value) => {
    const key = value.trim().toLowerCase()
    if (!key || key === 'none' || key === 'currentcolor' || key === 'transparent') return null
    const hex = parseColor(key)
    if (!hex) return null
    seen.add(hex)
    return subdued(hex)
  }
  let out = svg.replace(ATTR, (match, attr, value) => {
    const mapped = replace(value)
    return mapped ? `${attr}="${mapped}"` : match
  })
  out = out.replace(CSS_COLOR, (match, attr, value) => {
    const mapped = replace(value)
    return mapped ? `${attr}:${mapped}` : match
  })
  return { svg: out, colors: seen.size }
}

const onlyArg = process.argv.indexOf('--only')
const only =
  onlyArg >= 0
    ? new Set(
        String(process.argv[onlyArg + 1] ?? '')
          .toLowerCase()
          .split(',')
          .filter(Boolean),
      )
    : null

if (!existsSync(SRC)) {
  console.error('缺少 flag-icons，先运行：npm install -D flag-icons')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
mkdirSync(path.dirname(REPORT), { recursive: true })

const files = readdirSync(SRC).filter((file) => file.endsWith('.svg')).sort()
const generated = []
const skipped = []

for (const file of files) {
  const code = file.replace(/\.svg$/, '').toLowerCase()
  if (only && !only.has(code)) continue
  const svg = readFileSync(path.join(SRC, file), 'utf8')
  // Coats of arms / photographic emblems cannot survive a 6-colour recolor.
  if (/<image|<filter|Gradient|gradient/i.test(svg)) {
    skipped.push({ code, reason: 'image-or-gradient' })
    continue
  }
  const { svg: recolored, colors } = recolor(svg)
  if (colors > 9) {
    skipped.push({ code, reason: `too-many-colors:${colors}` })
    continue
  }
  writeFileSync(path.join(OUT, `${code}.svg`), recolored)
  generated.push({ code, colors })
}

writeFileSync(REPORT, `${JSON.stringify({ generated, skipped }, null, 2)}\n`)
console.log(`generated ${generated.length} flags → ${path.relative(ROOT, OUT)}`)
if (skipped.length > 0) {
  console.log(`skipped ${skipped.length}: ${skipped.map((item) => item.code).join(', ')}`)
}
