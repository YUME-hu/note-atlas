#!/usr/bin/env node
/**
 * raw_*.json → public/data/{regions,series,notes,series_map}.json
 *
 * The raw files are produced by scripts/sync-numista.mjs and already use our
 * stable schema (see that file). This script is the only place that knows how
 * to turn one Numista type into one of our notes.
 *
 * Usage:
 *   node scripts/build-catalog.mjs
 *   node scripts/build-catalog.mjs --strict          # exit 1 if anything needs review
 *   node scripts/build-catalog.mjs --raw-dir data/fixtures
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { REGION_LOCALE, SERIES_DEFS, SKIP_PATTERNS, matchSeries, seriesDef, resolveUnit } from './locales.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const args = {
    rawDir: 'data/raw',
    outDir: 'public/data',
    reportPath: 'data/reports/build.json',
    overridesPath: 'data/series_map.manual.json',
    strict: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const value = () => argv[++i]
    if (flag === '--strict') args.strict = true
    else if (flag === '--raw-dir') args.rawDir = value()
    else if (flag === '--out-dir') args.outDir = value()
    else if (flag === '--report') args.reportPath = value()
    else if (flag === '--overrides') args.overridesPath = value()
    else if (flag === '--help' || flag === '-h') {
      console.log('node scripts/build-catalog.mjs [--strict] [--raw-dir dir] [--out-dir dir]')
      process.exit(0)
    } else {
      fail(`未知参数：${flag}`)
    }
  }
  return args
}

function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

/** Editors on Windows love BOMs; JSON.parse does not. */
async function readJson(file) {
  const text = await readFile(file, 'utf8')
  return JSON.parse(text.replace(/^\uFEFF/, ''))
}

const round = (value, precision = 4) => Math.round(value * 10 ** precision) / 10 ** precision

function yearLabel(minYear, maxYear) {
  if (minYear == null && maxYear == null) return ''
  if (minYear != null && maxYear != null && minYear !== maxYear) return `${minYear}–${maxYear}`
  return String(minYear ?? maxYear)
}

/**
 * Face value → { value, unitRaw, text } in the raw file's own terms.
 * Multi-denomination titles ("1, 2, 5 Jiao") cannot become one note.
 */
function resolveFace(type) {
  const title = String(type.title ?? '').trim()
  const face = type.face ?? {}

  if (/^\s*\d[\d.,]*\s*(?:,\s*\d[\d.,]*)+\s*/.test(title)) {
    return { reason: 'multi-denomination' }
  }

  let value =
    typeof face.value === 'number' && Number.isFinite(face.value) ? face.value : null
  let unitRaw = typeof face.unit === 'string' ? face.unit : null
  let text = typeof face.text === 'string' ? face.text : null

  if (value === null) {
    const match = /^([\d]+(?:[.,]\d+)?)\s*([A-Za-z]+)?/.exec(title)
    if (match) {
      value = Number(match[1].replace(/,/g, ''))
      unitRaw = unitRaw ?? match[2] ?? null
    }
  }

  if (value === null) return { reason: 'missing-denom' }
  return { value, unitRaw, text }
}

/**
 * Labels are "denom · years"; when two different designs share one, borrow the
 * first clause of Numista's obverse description as the secondary line.
 */
function shortenDescription(text, max = 48) {
  const firstLine = String(text ?? '')
    .split(/\r?\n/)[0]
    .replace(/\s+/g, ' ')
    .trim()
  if (!firstLine) return null
  const clause = firstLine.split(/[.;]/)[0].trim()
  if (clause.length <= max) return clause
  const cut = clause.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 16 ? cut.slice(0, lastSpace) : cut).trim()}…`
}
/**
 * Titles name fractional units ("1 Fen", "50 Sen", "1分") even when the API
 * only reports the base currency ("Rénmínbì"). Returns the title's own number
 * and unit so the note can be re-based on it — using the title number (not the
 * API number) keeps this correct whether the API reports 1 or 0.01 for a fen.
 */
function fractionFaceFromTitle(title) {
  const match = /^\s*([\d.,]+)\s*([A-Za-z\u4e00-\u9fff]+)/.exec(String(title ?? ''))
  if (!match) return null
  const info = resolveUnit(match[2])
  if (!info || info.factor >= 1) return null
  return { value: Number(match[1].replace(/,/g, '')), info }
}

async function loadOverrides(file) {
  if (!existsSync(file)) return {}
  const raw = await readJson(file)
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    fail(`${file} 必须是 { "<numista_type_id>": "<series_id>" } 形式的对象`)
  }
  return raw
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const rawDir = path.resolve(ROOT, args.rawDir)
  const outDir = path.resolve(ROOT, args.outDir)
  const reportPath = path.resolve(ROOT, args.reportPath)
  const overrides = await loadOverrides(path.resolve(ROOT, args.overridesPath))
  const imageManifestPath = path.join(ROOT, 'public/img/manifest.json')
  const imageManifest = existsSync(imageManifestPath) ? await readJson(imageManifestPath) : {}
  const imagePath = (typeId, kind) => {
    const file = imageManifest[String(typeId)]?.[kind]
    return file ? `/img/${file}` : null
  }

  const files = (await readdir(rawDir).catch(() => []))
    .filter((name) => /^raw_.+\.json$/i.test(name))
    .sort()
  if (files.length === 0) fail(`没有找到 ${args.rawDir}/raw_*.json`)

  const regions = []
  const seriesById = new Map()
  const notes = []
  const seenTypeIds = new Set()
  const unknownUnits = new Map()

  const report = {
    generated_at: new Date().toISOString(),
    inputs: [],
    fixture: false,
    totals: {},
    per_region: [],
    per_series: [],
    low_confidence: [],
    unassigned: [],
    skipped: [],
    empty_series: [],
    conversions: [],
    manual_overrides: [],
    warnings: [],
  }

  for (const file of files) {
    const raw = await readJson(path.join(rawDir, file))
    const meta = raw.meta ?? {}
    const iso = String(meta.iso ?? '').toUpperCase()
    const locale = REGION_LOCALE[iso]
    if (!locale) fail(`${file} 的地区 ${iso || '(空)'} 不在 scripts/locales.mjs 里，先补字典`)

    const isFixture = meta.fixture === true
    report.fixture ||= isFixture
    report.inputs.push({ file, iso, issuer: meta.issuer ?? null, fixture: isFixture, types: raw.types?.length ?? 0 })
    if (isFixture) {
      report.warnings.push({ code: 'fixture-input', message: `${file} 是 fixture 假数据，不是真实 Numista 导出` })
    }

    const regionId = iso.toLowerCase()
    const regionNoteStart = notes.length

    regions.push({
      id: regionId,
      name: locale.name,
      iso,
      flag: locale.flag,
      parent: null,
      issuers: locale.issuers,
    })

    for (const type of raw.types ?? []) {
      const typeId = Number(type.numista_type_id)
      const title = String(type.title ?? '(无标题)')
      if (!Number.isFinite(typeId)) {
        report.skipped.push({ iso, title, reason: 'missing-type-id' })
        continue
      }
      if (seenTypeIds.has(typeId)) {
        report.skipped.push({ iso, type_id: typeId, title, reason: 'duplicate-type-id' })
        continue
      }
      seenTypeIds.add(typeId)

      const override = overrides[String(typeId)]
      if (String(override) === '__skip__') {
        report.skipped.push({ iso, type_id: typeId, title, reason: 'manual-skip' })
        continue
      }

      // The API's issuer filter can return sibling entities (Confederate States,
      // Danish West Indies, …). Keep only the codes we declared for this region.
      const issuerCode = String(type.issuer?.code ?? '').toLowerCase()
      if (locale.issuerCodes && issuerCode && !locale.issuerCodes.includes(issuerCode)) {
        report.skipped.push({
          iso,
          type_id: typeId,
          title,
          reason: 'foreign-issuer',
          issuer: issuerCode,
        })
        continue
      }

      if ((SKIP_PATTERNS[iso] ?? []).some((pattern) => pattern.test(title))) {
        report.skipped.push({ iso, type_id: typeId, title, reason: 'non-currency' })
        continue
      }

      const face = resolveFace(type)
      if (face.reason) {
        report.skipped.push({ iso, type_id: typeId, title, reason: face.reason })
        continue
      }

      let unitInfo = face.unitRaw ? resolveUnit(face.unitRaw, iso) : null
      let faceValue = face.value
      const titleFraction = fractionFaceFromTitle(title)
      if (titleFraction && (!unitInfo || unitInfo.factor === 1)) {
        unitInfo = titleFraction.info
        faceValue = titleFraction.value
      }
      if (face.unitRaw && !unitInfo) {
        // Keep the raw API unit in the label, and surface it for the dictionary.
        const key = `${iso}|${face.unitRaw}`
        const record = unknownUnits.get(key) ?? { iso, unit: face.unitRaw, count: 0, type_ids: [] }
        record.count += 1
        if (record.type_ids.length < 5) record.type_ids.push(typeId)
        unknownUnits.set(key, record)
      }
      const unitZh = unitInfo?.zh ?? locale.unit
      const denom = round(faceValue * (unitInfo?.factor ?? 1))

      const minYear = Number.isFinite(type.min_year) ? Number(type.min_year) : null
      const maxYear = Number.isFinite(type.max_year) ? Number(type.max_year) : null

      // 1) manual override  2) title keyword  3) explicit rule  4) year bin
      let seriesId = null
      let confidence = null
      if (override) {
        seriesId = String(override)
        confidence = 'manual'
        report.manual_overrides.push({ iso, type_id: typeId, title, series_id: seriesId })
      } else {
        const matched = matchSeries(iso, { title, minYear, maxYear, denom })
        if (matched) {
          seriesId = matched.seriesId
          confidence = matched.rule === 'year-bin' ? 'low' : 'high'
        }
      }

      if (!seriesId) {
        report.unassigned.push({
          iso,
          type_id: typeId,
          title,
          reason: minYear == null ? 'no-year-and-no-keyword' : 'no-keyword-and-no-bin',
          min_year: minYear,
        })
        continue
      }

      const def = seriesDef(iso, seriesId)
      if (def) {
        if (!seriesById.has(seriesId)) {
          seriesById.set(seriesId, {
            id: seriesId,
            region_id: regionId,
            name: def.name,
            year_start: def.year_start,
            year_end: def.year_end,
            status: def.status,
          })
        }
      } else {
        // Manual override pointing at a series we do not know: keep the data,
        // derive the range from the notes themselves, and flag it.
        if (!seriesById.has(seriesId)) {
          seriesById.set(seriesId, {
            id: seriesId,
            region_id: regionId,
            name: seriesId,
            year_start: minYear,
            year_end: maxYear,
            status: 'historical',
          })
          report.warnings.push({ code: 'custom-series', iso, series_id: seriesId })
        }
      }

      if (confidence === 'low') {
        report.low_confidence.push({
          iso,
          type_id: typeId,
          title,
          assigned: seriesId,
          reason: 'year-bin',
          min_year: minYear,
        })
      }
      if (minYear == null) {
        report.warnings.push({ code: 'missing-year', iso, type_id: typeId, title })
      }

      const labelBase = `${faceValue}${/[A-Za-z]/.test(unitZh) ? ' ' : ''}${unitZh}`
      const years = yearLabel(minYear, maxYear)
      const label = years ? `${labelBase} · ${years}` : labelBase

      if (denom !== face.value) {
        report.conversions.push({
          iso,
          type_id: typeId,
          title,
          face: `${face.value} ${face.unitRaw ?? locale.unit}`,
          denom,
          unit: locale.unit,
          label,
        })
      }

      notes.push({
        id: `n-${regionId}-${typeId}`,
        numista_type_id: typeId,
        series_id: seriesId,
        denom,
        unit: locale.unit,
        label,
        img_obverse: imagePath(typeId, 'o'),
        img_reverse: imagePath(typeId, 'r'),
        _obverse: type.raw?.obverse?.description ?? null,
        _confidence: confidence,
        _min_year: minYear,
      })
    }

    report.per_region.push({
      iso,
      region_id: regionId,
      notes: notes.length - regionNoteStart,
    })
  }

  // ---- assemble -------------------------------------------------------------

  report.unknown_units = [...unknownUnits.values()].sort(
    (a, b) => a.iso.localeCompare(b.iso) || a.unit.localeCompare(b.unit),
  )

  const series = [...seriesById.values()].sort(
    (a, b) => String(a.region_id).localeCompare(String(b.region_id)) || (a.year_start ?? 9999) - (b.year_start ?? 9999),
  )

  notes.sort((a, b) => {
    const sa = seriesById.get(a.series_id)
    const sb = seriesById.get(b.series_id)
    return (
      String(sa?.region_id).localeCompare(String(sb?.region_id)) ||
      (sa?.year_start ?? 9999) - (sb?.year_start ?? 9999) ||
      a.denom - b.denom ||
      (a._min_year ?? 0) - (b._min_year ?? 0)
    )
  })

  // Two designs can share "denom · years" inside one series; give those a
  // secondary line so two identical-looking rows never sit next to each other.
  const labelGroups = new Map()
  for (const note of notes) {
    const key = `${note.series_id}|${note.label}`
    const bucket = labelGroups.get(key) ?? []
    bucket.push(note)
    labelGroups.set(key, bucket)
  }
  const variantNotes = []
  for (const bucket of labelGroups.values()) {
    if (bucket.length < 2) continue
    for (const note of bucket) {
      const variant = shortenDescription(note._obverse) ?? `Type ${note.numista_type_id}`
      note.variant = variant
      variantNotes.push({
        iso: String(seriesById.get(note.series_id)?.region_id ?? '').toUpperCase(),
        type_id: note.numista_type_id,
        series_id: note.series_id,
        label: note.label,
        variant,
      })
    }
  }
  report.variants = variantNotes

  const seriesMap = {}
  for (const note of notes) seriesMap[note.numista_type_id] = note.series_id

  for (const item of series) {
    const owned = notes.filter((note) => note.series_id === item.id)
    const confidence = { high: 0, low: 0, manual: 0 }
    for (const note of owned) confidence[note._confidence] += 1
    report.per_series.push({
      id: item.id,
      region_id: item.region_id,
      name: item.name,
      year_start: item.year_start,
      year_end: item.year_end,
      notes: owned.length,
      confidence,
    })
  }

  const usedSeries = new Set(series.map((item) => item.id))
  for (const [iso, defs] of Object.entries(SERIES_DEFS)) {
    if (!regions.some((region) => region.iso === iso)) continue
    for (const def of defs) if (!usedSeries.has(def.id)) report.empty_series.push(def.id)
  }

  const publicNotes = notes.map(({ _confidence, _min_year, _obverse, ...note }) => note)

  report.totals = {
    regions: regions.length,
    series: series.length,
    notes: publicNotes.length,
    skipped: report.skipped.length,
    unassigned: report.unassigned.length,
    low_confidence: report.low_confidence.length,
    manual_overrides: report.manual_overrides.length,
    unknown_units: report.unknown_units.length,
    variants: report.variants.length,
    images: publicNotes.filter((note) => note.img_obverse).length,
  }

  // ---- write ----------------------------------------------------------------

  await mkdir(outDir, { recursive: true })
  await mkdir(path.dirname(reportPath), { recursive: true })

  const writeJson = async (file, data) =>
    writeFile(path.join(outDir, file), `${JSON.stringify(data, null, 2)}\n`, 'utf8')

  await writeJson('regions.json', regions)
  await writeJson('series.json', series)
  await writeJson('notes.json', publicNotes)
  await writeJson('series_map.json', seriesMap)
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  // ---- console summary ------------------------------------------------------

  const out = []
  out.push('note-atlas · build-catalog')
  out.push(`  inputs: ${report.inputs.map((input) => `${input.file} (${input.types})`).join(', ')}`)
  if (report.fixture) out.push('  ⚠ 输入包含 fixture 假数据，不是真实 Numista 导出')
  for (const region of report.per_region) {
    const regionSeries = report.per_series.filter((item) => item.region_id === region.region_id)
    out.push('')
    out.push(`region ${region.iso} · ${region.notes} notes / ${regionSeries.length} series`)
    for (const item of regionSeries) {
      const parts = [`high ${item.confidence.high}`]
      if (item.confidence.low) parts.push(`low ${item.confidence.low}`)
      if (item.confidence.manual) parts.push(`manual ${item.confidence.manual}`)
      out.push(`  ${item.id.padEnd(7)} ${item.name}  ${item.notes} 张（${parts.join(' · ')}）`)
    }
  }
  const total = report.totals
  out.push('')
  out.push(
    `totals: regions ${total.regions} · series ${total.series} · notes ${total.notes}` +
      ` · unassigned ${total.unassigned} · skipped ${total.skipped} · low ${total.low_confidence}` +
      ` · manual ${total.manual_overrides} · unknown-units ${total.unknown_units}` +
      ` · variants ${total.variants} · images ${total.images}/${total.notes}`,
  )
  if (report.low_confidence.length) {
    out.push('')
    out.push('low confidence (year-bin only):')
    for (const item of report.low_confidence) {
      out.push(`  [${item.iso}] ${item.type_id} ${item.title} → ${item.assigned} (min_year ${item.min_year ?? '—'})`)
    }
  }
  if (report.unassigned.length) {
    out.push('')
    out.push('unassigned (kept out of notes.json):')
    for (const item of report.unassigned) out.push(`  [${item.iso}] ${item.type_id} ${item.title} (${item.reason})`)
  }
  if (report.skipped.length) {
    out.push('')
    out.push('skipped:')
    for (const item of report.skipped) out.push(`  [${item.iso}] ${item.type_id ?? '—'} ${item.title} (${item.reason})`)
  }
  if (report.conversions.length) {
    out.push('')
    out.push('denom conversions (face → base unit):')
    for (const item of report.conversions) out.push(`  ${item.face} → ${item.denom} ${item.unit}  (${item.label})`)
  }
  if (report.unknown_units.length) {
    out.push('')
    out.push('unknown units（未映射，label 回退 API 原单位）:')
    for (const item of report.unknown_units) {
      out.push(
        `  [${item.iso}] "${item.unit}" × ${item.count}（type ${item.type_ids.join(', ')}${item.count > item.type_ids.length ? '…' : ''}）`,
      )
    }
    out.push('  修法：在 scripts/locales.mjs 的 UNIT_TABLE 里补别名后重跑 build')
  }
  if (report.variants.length) {
    out.push('')
    out.push(`label variants（同系列重名消歧，${report.variants.length} 张）:`)
    for (const item of report.variants.slice(0, 8)) {
      out.push(`  [${item.iso}] ${item.label} → ${item.variant}`)
    }
    if (report.variants.length > 8) out.push(`  …其余 ${report.variants.length - 8} 条见报告`)
  }
  if (report.empty_series.length) {
    out.push('')
    out.push(`empty series (定義あり・0 张): ${report.empty_series.join(', ')}`)
  }
  if (report.warnings.length) {
    out.push('')
    out.push(`warnings: ${report.warnings.length}（详见报告）`)
  }
  out.push('')
  out.push(`wrote ${args.outDir}/{regions,series,notes,series_map}.json`)
  out.push(`report → ${args.reportPath}`)
  console.log(out.join('\n'))

  if (
    args.strict &&
    (total.skipped || total.unassigned || total.low_confidence || total.unknown_units)
  ) {
    console.error('\n✖ --strict：仍有需要人工复核的券种或未映射单位')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
