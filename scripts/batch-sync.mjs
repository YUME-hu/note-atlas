#!/usr/bin/env node
/**
 * Batch sync for a curated list of countries.
 *
 *   node scripts/batch-sync.mjs                 # all countries
 *   node scripts/batch-sync.mjs --dry-run       # listing + statistics only
 *   node scripts/batch-sync.mjs --only GB,BY    # subset
 *   node scripts/batch-sync.mjs --delay 900     # slower/faster
 *
 * Each country runs scripts/sync-numista.mjs sequentially with resume, so an
 * interrupted batch can simply be re-run. Syria is intentionally pulled from
 * 1900: Numista's Syria issuer has no 1950+ banknotes at all.
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SYNC = path.join(ROOT, 'scripts/sync-numista.mjs')

const COUNTRIES = [
  { iso: 'GB', issuer: 'united-kingdom', since: 1950, name: '英国' },
  { iso: 'BY', issuer: 'bielorussie', since: 1950, name: '白俄罗斯' },
  { iso: 'ID', issuer: 'indonesia', since: 1950, name: '印度尼西亚' },
  { iso: 'SY', issuer: 'syria', since: 1900, name: '叙利亚' },
  { iso: 'VE', issuer: 'venezuela', since: 1950, name: '委内瑞拉' },
  { iso: 'BT', issuer: 'bhoutan', since: 1950, name: '不丹' },
  { iso: 'KH', issuer: 'cambodge', since: 1950, name: '柬埔寨' },
]

const args = { dryRun: false, only: null, delay: 900, force: false }
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i]
  const next = () => process.argv[++i]
  if (flag === '--dry-run') args.dryRun = true
  else if (flag === '--only') args.only = String(next() ?? '').toUpperCase().split(',')
  else if (flag === '--delay') args.delay = Number(next())
  else if (flag === '--force') args.force = true
  else if (flag === '--help' || flag === '-h') {
    console.log('node scripts/batch-sync.mjs [--dry-run] [--only GB,BY] [--delay 900] [--force]')
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
  console.error('没有匹配的国家，--only 用 ISO 代码，逗号分隔')
  process.exit(1)
}

function run(iso, name, issuer, since) {
  return new Promise((resolve) => {
    const cliArgs = [SYNC, '--issuer', issuer, '--iso', iso, '--since', String(since), '--delay', String(args.delay)]
    if (args.dryRun) cliArgs.push('--dry-run')
    if (args.force) cliArgs.push('--force')
    console.log(`\n${'='.repeat(64)}\n▶ ${iso} ${name} · issuer=${issuer} · since ${since}\n${'='.repeat(64)}`)
    const started = Date.now()
    const child = spawn(process.execPath, cliArgs, { stdio: 'inherit', cwd: ROOT })
    child.on('exit', (code) => {
      resolve({ iso, name, code: code ?? 1, seconds: Math.round((Date.now() - started) / 1000) })
    })
  })
}

const results = []
for (const country of selected) {
  results.push(await run(country.iso, country.name, country.issuer, country.since))
}

console.log(`\n${'='.repeat(64)}\n批量同步结果\n${'='.repeat(64)}`)
for (const result of results) {
  const status = result.code === 0 ? 'ok' : `失败 (exit ${result.code})`
  console.log(`  ${result.iso.padEnd(3)} ${result.name.padEnd(6)} ${status.padEnd(12)} ${result.seconds}s`)
}
const failed = results.filter((result) => result.code !== 0)
if (failed.length > 0) {
  console.log('\n有失败项：重跑同一条命令即可续传（已完成的国家会跳过已有数据）')
  process.exit(1)
}
console.log('\n下一步：node scripts/build-catalog.mjs')
