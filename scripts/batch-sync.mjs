#!/usr/bin/env node
/**
 * Batch driver for the curated country list.
 *
 *   node scripts/batch-sync.mjs --estimate        # listing pages only, writes data/reports/estimate.json
 *   node scripts/batch-sync.mjs                   # sync pending countries, respects --budget
 *   node scripts/batch-sync.mjs --only GB,BR      # subset
 *   node scripts/batch-sync.mjs --budget 1400     # hard request ceiling for this run
 *   node scripts/batch-sync.mjs --force           # re-sync countries that already have raw data
 *
 * Listing pages are cached in data/.cache/list by sync-numista.mjs, so the
 * --estimate pass is not paid for twice.
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { COUNTRIES } from './countries.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SYNC = path.join(ROOT, 'scripts/sync-numista.mjs')
const REPORT_DIR = path.join(ROOT, 'data/reports')
const ESTIMATE_PATH = path.join(REPORT_DIR, 'estimate.json')

const args = { estimate: false, only: null, delay: 900, budget: 1400, force: false, refresh: false, listOnly: false, backfill: false }
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i]
  const next = () => process.argv[++i]
  if (flag === '--estimate') args.estimate = true
  else if (flag === '--list-only') args.listOnly = true
  else if (flag === '--backfill') args.backfill = true
  else if (flag === '--only') args.only = String(next() ?? '').toUpperCase().split(',')
  else if (flag === '--delay') args.delay = Number(next())
  else if (flag === '--budget') args.budget = Number(next())
  else if (flag === '--force') args.force = true
  else if (flag === '--refresh') args.refresh = true
  else if (flag === '--help' || flag === '-h') {
    console.log('node scripts/batch-sync.mjs [--estimate] [--only GB,BR] [--budget 1400] [--delay 900] [--force] [--refresh]')
    process.exit(0)
  } else {
    console.error(`未知参数：${flag}`)
    process.exit(1)
  }
}

const selected = args.only
  ? COUNTRIES.filter((country) => args.only.includes(country.iso))
  : COUNTRIES
if (selected.length === 0) {
  console.error('--only 没有匹配的国家（ISO 代码，逗号分隔）')
  process.exit(1)
}

const rawPath = (country) => path.join(ROOT, 'data/raw', `raw_${country.iso.toLowerCase()}.json`)
const hasDetailData = (country) => {
  try {
    const raw = JSON.parse(readFileSync(rawPath(country), 'utf8'))
    return (raw.meta?.details_fetched ?? 0) > 0
  } catch {
    return false
  }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function runSync(country, extra) {
  return new Promise((resolve) => {
    const cliArgs = [
      SYNC,
      '--issuer', country.issuer,
      '--iso', country.iso,
      '--since', String(country.since),
      '--delay', String(extra.delay),
      ...extra.args,
    ]
    const child = spawn(process.execPath, cliArgs, { stdio: 'inherit', cwd: ROOT })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

function readStats(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function printTable(rows) {
  const head = ['ISO', '国家', '列表', '保留', '页数', '本次请求', '累计']
  console.log(
    `\n${head[0].padEnd(4)}${head[1].padEnd(8)}${head[2].padStart(6)}${head[3].padStart(6)}${head[4].padStart(5)}${head[5].padStart(10)}${head[6].padStart(8)}`,
  )
  console.log('-'.repeat(52))
  for (const row of rows) {
    console.log(
      `${row.iso.padEnd(4)}${row.name.padEnd(8)}${String(row.listed).padStart(6)}${String(row.kept).padStart(6)}${String(row.pages).padStart(5)}${String(row.cost).padStart(10)}${String(row.cumulative).padStart(8)}`,
    )
  }
}

// ---------------------------------------------------------------------------
// Estimate mode: list pages only (no details, no issuer check)
// ---------------------------------------------------------------------------
if (args.estimate) {
  const rows = []
  let spent = 0
  let totalKept = 0
  let totalListed = 0

  for (const country of selected) {
    if (existsSync(rawPath(country)) && !args.force) {
      console.log(`\n▶ ${country.iso} ${country.name} — 已有 raw，跳过（--force 可重估）`)
      rows.push({ iso: country.iso, name: country.name, listed: '-', kept: '-', pages: '-', cost: 0, cumulative: spent, note: 'existing' })
      continue
    }
    if (spent >= args.budget) {
      console.log(`\n⛔ 已达到预算上限 ${args.budget}，剩余国家未估算`)
      break
    }

    const statsFile = path.join(REPORT_DIR, `estimate_${country.iso.toLowerCase()}.json`)
    const code = await runSync(country, {
      delay: 250,
      args: ['--dry-run', '--no-details', '--no-issuer-check', '--stats-out', path.relative(ROOT, statsFile)],
    })
    if (code !== 0) {
      console.error(`  ✕ ${country.iso} 估算失败（exit ${code}）`)
      continue
    }
    const stats = readStats(statsFile)
    if (!stats) {
      console.error(`  ✕ ${country.iso} 没有生成 stats`)
      continue
    }
    const cost = stats.actual_requests ?? stats.pages ?? 0
    spent += cost
    totalKept += stats.kept
    totalListed += stats.listed
    rows.push({
      iso: country.iso,
      name: country.name,
      listed: stats.listed,
      kept: stats.kept,
      pages: stats.pages,
      cost,
      cumulative: spent,
      note: '',
    })
    await sleep(150)
  }

  rows.sort((a, b) => (Number(b.kept) || 0) - (Number(a.kept) || 0))
  printTable(rows)

  const pending = rows.filter((row) => row.note !== 'existing')
  const details = pending.reduce((sum, row) => sum + (Number(row.kept) || 0), 0)
  const issuerChecks = pending.length
  const syncAfterEstimate = details + issuerChecks
  const grandTotal = spent + syncAfterEstimate

  console.log(`\n${'='.repeat(52)}`)
  console.log(`估算阶段（本次已花）：${spent} 次请求`)
  console.log(`待同步详情：${details} 条 + issuer 校验 ${issuerChecks} 次`)
  console.log(`同步阶段预计：${syncAfterEstimate} 次`)
  console.log(`全量总计：${grandTotal} 次（预算 ${args.budget}）`)
  console.log(
    grandTotal <= args.budget
      ? '✓ 在预算内，可以开跑'
      : `△ 超出预算 ${grandTotal - args.budget} 次：按 kept 从大到小截断，或下月续跑`,
  )

  mkdirSync(REPORT_DIR, { recursive: true })
  writeFileSync(
    ESTIMATE_PATH,
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        budget: args.budget,
        estimate_spent: spent,
        details,
        issuer_checks: issuerChecks,
        grand_total: grandTotal,
        countries: rows,
      },
      null,
      2,
    )}\n`,
  )
  console.log(`\nreport → ${path.relative(ROOT, ESTIMATE_PATH)}`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Sync mode
// ---------------------------------------------------------------------------
const estimate = readStats(ESTIMATE_PATH)
const plan = new Map()
if (estimate) {
  for (const row of estimate.countries) {
    if (typeof row.kept === 'number') plan.set(row.iso, row)
  }
}

const pending = args.backfill
  ? selected.filter((country) => !existsSync(rawPath(country)) || !hasDetailData(country))
  : selected.filter((country) => {
      if (!existsSync(rawPath(country))) return true
      if (!args.force) return false
      // --list-only must never overwrite a country that already has detail data.
      if (args.listOnly && hasDetailData(country)) return false
      return true
    })
console.log(`\n待同步 ${pending.length} 国 · 预算 ${args.budget} 次${estimate ? ` · 估算已花 ${estimate.estimate_spent} 次` : '（无估算文件，按实际请求计数）'}`)

let spent = estimate?.estimate_spent ?? 0
const done = []
const skipped = []

for (const country of pending) {
  const row = plan.get(country.iso)
  const cost = args.listOnly ? 0 : row ? row.kept + 1 : null
  if (cost != null && spent + cost > args.budget) {
    skipped.push({ country, reason: `预算不足（需 ${cost}，已花 ${spent}）` })
    continue
  }

  console.log(`\n${'='.repeat(64)}\n▶ ${country.iso} ${country.name} · ${country.issuer} · since ${country.since}\n${'='.repeat(64)}`)
  const extraArgs = args.listOnly
    ? ['--no-details', '--no-issuer-check', '--skip-undated', ...(args.force ? ['--force'] : [])]
    : args.backfill
      ? ['--force', '--skip-undated']
      : args.refresh
        ? ['--refresh']
        : []
  const code = await runSync(country, { delay: args.listOnly ? 150 : args.delay, args: extraArgs })
  const statsFile = path.join(REPORT_DIR, `sync_${country.iso.toLowerCase()}.json`)
  const stats = readStats(statsFile)
  const actual = stats?.requests ?? cost ?? 0
  spent += actual
  done.push({ iso: country.iso, name: country.name, code, requests: actual, kept: stats?.fetched ?? '?' })
  if (code !== 0) console.error(`  ✕ ${country.iso} 失败（exit ${code}），稍后 --only ${country.iso} 续跑`)
  await sleep(200)
}

console.log(`\n${'='.repeat(64)}\n批量同步结果\n${'='.repeat(64)}`)
for (const item of done) {
  console.log(`  ${item.iso.padEnd(3)} ${item.name.padEnd(6)} ${item.code === 0 ? 'ok' : `失败(${item.code})`}  ${item.kept} 条  ${item.requests} 次`)
}
for (const item of skipped) {
  console.log(`  ${item.country.iso.padEnd(3)} ${item.country.name.padEnd(6)} 跳过：${item.reason}`)
}
console.log(`\n本次总消耗：${spent} / ${args.budget} 次`)

if (skipped.length > 0) {
  console.log(`剩余国家：${skipped.map((item) => item.country.iso).join(', ')}`)
  process.exit(2)
}
console.log('\n下一步：node scripts/build-catalog.mjs')
