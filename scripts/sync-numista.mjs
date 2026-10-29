#!/usr/bin/env node
/**
 * Numista API → data/raw/raw_<iso>.json
 *
 * We do not ship a third-party "Numista CLI": the API is a plain JSON API and
 * this script keeps the schema-tolerance in exactly one place. It normalises
 * Numista's response into our own stable raw shape, so build-catalog.mjs never
 * has to care what Numista calls a field this month.
 *
 * Issuer codes are NOT country names. Always confirm with --list-issuers first
 * (China, People's Republic of → `chine`; Republic of China is a different
 * issuer). Only the code you pass is queried.
 *
 * Usage:
 *   set NUMISTA_API_KEY=xxxx                 (or put it in .env.local)
 *   node scripts/sync-numista.mjs --list-issuers --filter japan
 *   node scripts/sync-numista.mjs --issuer chine --iso CN --since 1948
 *   node scripts/sync-numista.mjs --issuer japan --iso JP --since 1946
 *   (--out 省略时写到 data/raw/raw_<iso>.json)
 *
 * Options:
 *   --dry-run        翻完列表页 + 拉 1 条详情：打印过滤前后统计、预估配额、一条归一化样例，不写文件
 *   --limit N        最多处理 N 条（调试用，作用于详情请求数）
 *   --delay MS       请求间隔，默认 1100
 *   --no-details     不拉 /types/{id} 详情，只用列表数据
 *   --force          忽略已有 raw，全量重拉
 *   --no-issuer-check  跳过 /issuers 代码校验（默认会校验并给出相近代码）
 *   --api-base URL   调试用，默认 https://api.numista.com/v3
 *
 * `--since` is applied at the listing stage: items whose list row is older than
 * the cut-off are dropped WITHOUT fetching their detail, so they cost no quota.
 */

import { existsSync, readFileSync } from 'node:fs'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { REGION_LOCALE } from './locales.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API = 'https://api.numista.com/v3'
const PAGE_SIZE = 50

const args = {
  issuer: null,
  iso: null,
  since: 1900,
  out: null,
  delay: 1100,
  limit: null,
  details: true,
  force: false,
  dryRun: false,
  listIssuers: false,
  filter: null,
  lang: 'en',
  apiBase: API,
  issuerCheck: true,
  cacheList: true,
  refresh: false,
  skipUndated: false,
}

for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i]
  const next = () => process.argv[++i]
  if (flag === '--issuer') args.issuer = next()
  else if (flag === '--iso') args.iso = String(next() ?? '').toUpperCase()
  else if (flag === '--since') args.since = Number(next())
  else if (flag === '--out') args.out = next()
  else if (flag === '--delay') args.delay = Number(next())
  else if (flag === '--limit') args.limit = Number(next())
  else if (flag === '--filter') args.filter = String(next() ?? '').toLowerCase()
  else if (flag === '--lang') args.lang = next()
  else if (flag === '--api-base') args.apiBase = String(next() ?? '').replace(/\/$/, '')
  else if (flag === '--no-issuer-check') args.issuerCheck = false
  else if (flag === '--no-details') args.details = false
  else if (flag === '--no-cache') args.cacheList = false
  else if (flag === '--refresh') args.refresh = true
  else if (flag === '--skip-undated') args.skipUndated = true
  else if (flag === '--stats-out') args.statsOut = next()
  else if (flag === '--force') args.force = true
  else if (flag === '--dry-run') args.dryRun = true
  else if (flag === '--list-issuers') args.listIssuers = true
  else if (flag === '--help' || flag === '-h') {
    const help = readFileSync(new URL(import.meta.url), 'utf8')
      .split('*/')[0]
      .replace(/^#[^\n]*\n/, '')
      .replace('/**', '')
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim()
    console.log(help)
    process.exit(0)
  } else {
    console.error(`未知参数：${flag}`)
    process.exit(1)
  }
}

function readEnvFile(file) {
  if (!existsSync(file)) return {}
  const out = {}
  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (!match) continue
    out[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

const envFile = readEnvFile(path.join(ROOT, '.env.local'))
const API_KEY = process.env.NUMISTA_API_KEY || envFile.NUMISTA_API_KEY

if (!API_KEY) {
  console.error(
    [
      '✖ 缺少 NUMISTA_API_KEY。',
      '',
      '  申请（非商业免费）：登录 Numista → https://en.numista.com/api/ → Request an API key',
      '  配置任选其一：',
      '    $env:NUMISTA_API_KEY = "你的key"          # 当前 PowerShell 会话',
      '    或在项目根目录建 .env.local，写一行 NUMISTA_API_KEY=你的key（已加入 .gitignore）',
    ].join('\n'),
  )
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let lastRequestAt = 0
let requestCount = 0

async function apiGet(pathname, attempt = 0) {
  const wait = args.delay - (Date.now() - lastRequestAt)
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
  requestCount += 1

  let response
  try {
    response = await fetch(`${args.apiBase}${pathname}`, {
      headers: {
        'Numista-API-Key': API_KEY,
        Accept: 'application/json',
      },
    })
  } catch (error) {
    if (attempt < 3) {
      await sleep(1000 * (attempt + 1))
      return apiGet(pathname, attempt + 1)
    }
    throw new Error(`请求失败 ${pathname}: ${error.message}`)
  }

  if (response.status === 401) {
    throw new Error('401：API key 无效或未被接受（检查 NUMISTA_API_KEY）')
  }
  if (response.status === 429 || response.status >= 500) {
    if (attempt < 4) {
      const retryAfter = Number(response.headers.get('retry-after')) * 1000
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 1500 * (attempt + 1)
      console.warn(`  …HTTP ${response.status}，${Math.round(backoff)}ms 后重试 ${pathname}`)
      await sleep(backoff)
      return apiGet(pathname, attempt + 1)
    }
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${pathname}: ${(await response.text()).slice(0, 300)}`)
  }
  return response.json()
}

/** First non-empty value along a dotted path list. */
function pick(source, paths) {
  if (!source) return undefined
  for (const pathname of paths) {
    const value = pathname.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), source)
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function firstOf(sources, paths) {
  for (const source of sources) {
    const value = pick(source, paths)
    if (value !== undefined) return value
  }
  return undefined
}

function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function itemId(source) {
  return asNumber(pick(source, ['id', 'numista_type_id', 'type_id']))
}

/** Year taken from the listing row — enough for the cheap `--since` cut. */
function listYearOf(item) {
  const max = asNumber(pick(item, ['max_year', 'year_max', 'year']))
  const min = asNumber(pick(item, ['min_year', 'year_min', 'year']))
  return max ?? min ?? null
}

function titleNumber(title) {
  let head = String(title ?? '').split(/\(|\s+-\s+/)[0].trim()
  head = head.replace(/(\d)\s+(?=\d{3}\b)/g, '$1')
  const match = /^([\d.,]+)(?:st|nd|rd|th)?\s*([½¼¾⅓⅔⅛])?\s*(.*)$/.exec(head)
  if (!match) return { value: null, unit: null }
  const fractions = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 }
  const whole = match[1] ? Number(match[1].replace(/,/g, '')) : 0
  const fraction = match[2] ? fractions[match[2]] : 0
  const value = match[1] || match[2] ? whole + fraction : null
  const unit =
    (match[3] ?? '')
      .split('/')[0]
      .replace(/^["“”']+|["“”']+$/g, '')
      .trim() || null
  return { value, unit }
}

function imageUrl(source) {
  if (!source) return null
  if (typeof source === 'string') return source
  return pick(source, ['image', 'url', 'src', 'thumb', 'thumbnail']) ?? null
}

/**
 * Normalise one Numista type (list row + optional detail) into our raw schema.
 * Everything is fallback-friendly: an unexpected field name only degrades one
 * field, and the sync report counts how often that happened.
 */
function normalize(item, detail) {
  const sources = [detail, item].filter(Boolean)
  const id = asNumber(firstOf(sources, ['id', 'numista_type_id', 'type_id']))
  const title = String(firstOf(sources, ['title', 'name']) ?? '')
  const issuerRaw = firstOf(sources, ['issuer', 'issuer_name'])
  const issuer =
    issuerRaw && typeof issuerRaw === 'object'
      ? {
          code: String(pick(issuerRaw, ['code', 'id']) ?? ''),
          name: String(pick(issuerRaw, ['name', 'title']) ?? ''),
        }
      : { code: '', name: String(issuerRaw ?? '') }

  const minYear = asNumber(firstOf(sources, ['min_year', 'year_min', 'year']))
  const maxYear = asNumber(firstOf(sources, ['max_year', 'year_max', 'year']))

  const valueObject = firstOf(sources, ['value', 'denomination', 'face'])
  const numeric =
    valueObject && typeof valueObject === 'object'
      ? asNumber(pick(valueObject, ['numeric_value', 'value', 'numeric', 'amount']))
      : asNumber(valueObject)

  const currencyObject =
    valueObject && typeof valueObject === 'object' ? pick(valueObject, ['currency']) : undefined
  const currencyCode =
    currencyObject && typeof currencyObject === 'object'
      ? String(pick(currencyObject, ['code', 'id']) ?? '')
      : String(currencyObject ?? '')
  const currencyName =
    currencyObject && typeof currencyObject === 'object'
      ? String(pick(currencyObject, ['name', 'title', 'unit']) ?? '')
      : ''

  let unit =
    (valueObject && typeof valueObject === 'object'
      ? pick(valueObject, ['unit', 'currency_name'])
      : null) ?? null
  if (!unit && currencyName) unit = currencyName
  if (!unit && currencyCode) unit = currencyCode

  // Numista may hand us an ISO currency code ("CNY") instead of a unit name.
  const locale = REGION_LOCALE[args.iso]
  if (unit && locale && String(unit).toUpperCase() === locale.currency) unit = locale.unit

  const fromTitle = titleNumber(title)
  const faceValue = numeric ?? fromTitle.value
  const faceUnit = unit ?? fromTitle.unit
  const faceText = `${faceValue ?? ''}${faceUnit ? ` ${faceUnit}` : ''}`.trim() || null

  return {
    numista_type_id: id,
    title,
    issuer,
    min_year: minYear,
    max_year: maxYear,
    face: {
      value: faceValue,
      unit: faceUnit,
      text: faceText,
    },
    images: {
      obverse: imageUrl(firstOf(sources, ['obverse', 'images.obverse'])),
      reverse: imageUrl(firstOf(sources, ['reverse', 'images.reverse'])),
    },
    url: firstOf(sources, ['url', 'numista_url', 'link']) ?? null,
    raw: detail ?? item,
  }
}

function countMissing(types) {
  const missing = { title: 0, min_year: 0, face_value: 0, face_unit: 0, images: 0 }
  for (const type of types) {
    if (!type.title) missing.title += 1
    if (type.min_year == null) missing.min_year += 1
    if (type.face?.value == null) missing.face_value += 1
    if (!type.face?.unit) missing.face_unit += 1
    if (!type.images?.obverse && !type.images?.reverse) missing.images += 1
  }
  return missing
}

function secondsFor(requests) {
  return Math.round((requests * args.delay) / 1000)
}

let issuersCache = null

async function fetchIssuers() {
  if (issuersCache) return issuersCache
  const data = await apiGet('/issuers')
  const issuers = Array.isArray(data) ? data : (data.items ?? data.issuers ?? [])
  issuersCache = issuers
    .map((issuer) => ({
      code: String(pick(issuer, ['code', 'id']) ?? ''),
      name: String(pick(issuer, ['name', 'title']) ?? ''),
    }))
    .filter((issuer) => issuer.code)
  return issuersCache
}

async function listIssuers() {
  const rows = (await fetchIssuers())
    .filter((issuer) => !args.filter || `${issuer.code} ${issuer.name}`.toLowerCase().includes(args.filter))
    .sort((a, b) => a.name.localeCompare(b.name))
  for (const issuer of rows) console.log(`${issuer.code.padEnd(28)} ${issuer.name}`)
  console.log(`\n${rows.length} issuers`)
}

/**
 * Issuer codes are not country names ("chine" ≠ "china"). Check the code
 * against /issuers before spending the listing requests, and suggest near
 * matches so a typo never burns a whole sync run.
 */
async function verifyIssuerCode() {
  if (!args.issuerCheck) return
  let list
  try {
    list = await fetchIssuers()
  } catch (error) {
    console.warn(`issuer 校验跳过：${error.message}`)
    return
  }
  if (list.some((issuer) => issuer.code === args.issuer)) return

  const needle = args.issuer.toLowerCase()
  const suggestions = list
    .map((issuer) => {
      const text = `${issuer.code} ${issuer.name}`.toLowerCase()
      const score = text.includes(needle)
        ? 2
        : needle.length >= 3 && text.includes(needle.slice(0, 4))
          ? 1
          : 0
      return { ...issuer, score }
    })
    .filter((issuer) => issuer.score > 0)
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
    .slice(0, 5)

  console.error(`✖ /issuers 里没有「${args.issuer}」这个 issuer code。`)
  if (suggestions.length) {
    console.error('  相近的 issuer：')
    for (const issuer of suggestions) console.error(`    ${issuer.code.padEnd(22)} ${issuer.name}`)
  } else {
    console.error('  用 --list-issuers --filter <关键词> 查找正确代码。')
  }
  console.error('  确认后：--issuer <code> 重跑（--no-issuer-check 可跳过校验）。')
  process.exit(1)
}

/** Phase 1: listing only — one request per 50 types, no details. */
async function fetchListing() {
  const items = []
  let page = 1
  let pages = 0
  let total = null
  let previousSignature = null

  while (true) {
    const query = new URLSearchParams({
      category: 'banknote',
      issuer: args.issuer,
      lang: args.lang,
      count: String(PAGE_SIZE),
      page: String(page),
    })
    const cachePath = path.join(
      ROOT,
      'data/.cache/list',
      `${args.issuer}_${args.lang}_p${page}.json`,
    )
    let response = null
    let fromCache = false
    if (args.cacheList && !args.refresh && existsSync(cachePath)) {
      try {
        response = JSON.parse(readFileSync(cachePath, 'utf8').replace(/^\uFEFF/, ''))
        fromCache = true
      } catch {
        response = null
      }
    }
    if (!response) {
      response = await apiGet(`/types?${query}`)
      if (args.cacheList) {
        await mkdir(path.dirname(cachePath), { recursive: true })
        await writeFile(cachePath, `${JSON.stringify(response)}\n`, 'utf8')
      }
    }
    pages += 1
    const batch =
      response.items ?? response.types ?? response.results ?? (Array.isArray(response) ? response : [])
    total ??= asNumber(response.count ?? response.total) ?? null
    if (!batch.length) break
    console.log(
      `  page ${page}: ${batch.length} 条${fromCache ? '（cache）' : ''}${total != null ? `（API count ${total}）` : ''}`,
    )

    // Guard against an API that ignores `page` and keeps returning page 1.
    const signature = batch.map((item) => itemId(item) ?? '?').join(',')
    if (signature === previousSignature) {
      console.warn('  ⚠ 分页似乎未生效（连续两页返回同一批），停止翻页')
      break
    }
    previousSignature = signature
    items.push(...batch)

    // A short page means this was the last one; never rely on `count` alone
    // (some APIs report the page size there, which would truncate the sync).
    if (batch.length < PAGE_SIZE) break
    page += 1
    if (page > 200) break
  }

  return { items, pages, total }
}

function loadExisting(outPath) {
  const existing = new Map()
  if (!outPath || !existsSync(outPath) || args.force) return existing
  try {
    const previous = JSON.parse(readFileSync(outPath, 'utf8').replace(/^\uFEFF/, ''))
    const previousMeta = previous.meta ?? {}
    // Never resume from a different source: fixture files and another issuer's
    // export would silently merge into the real data.
    if (previousMeta.fixture === true) {
      console.warn('已有 raw 是 fixture 假数据，忽略它并全量重拉真实数据')
    } else if (previousMeta.issuer && previousMeta.issuer !== args.issuer) {
      console.warn(
        `已有 raw 属于 issuer「${previousMeta.issuer}」，与本次「${args.issuer}」不符，忽略并全量重拉`,
      )
    } else {
      for (const type of previous.types ?? []) existing.set(type.numista_type_id, type)
      console.log(`resume: ${existing.size} 条已存在，只补缺失（--force 全量重拉）`)
    }
  } catch {
    console.warn('已有 raw 文件无法解析，忽略并重拉')
  }
  return existing
}

async function main() {
  if (args.listIssuers) return listIssuers()
  if (!args.issuer || !args.iso) {
    console.error('用法：node scripts/sync-numista.mjs --issuer chine --iso CN --since 1948')
    console.error('      （issuer 代码用 --list-issuers 确认，不是国名）')
    process.exit(1)
  }

  const outPath = args.dryRun
    ? null
    : path.resolve(ROOT, args.out ?? path.join('data/raw', `raw_${args.iso.toLowerCase()}.json`))
  const existing = loadExisting(outPath)

  await verifyIssuerCode()

  // ---- Phase 1: listing (cheap) -------------------------------------------
  console.log(`listing issuer=${args.issuer} category=banknote`)
  const listing = await fetchListing()

  const listingById = new Map()
  let duplicates = 0
  for (const item of listing.items) {
    const id = itemId(item)
    if (id == null) continue
    if (listingById.has(id)) {
      duplicates += 1
      continue
    }
    listingById.set(id, item)
  }
  if (listingById.size === 0) {
    console.log(`\nlisting 为空：issuer「${args.issuer}」没有纸币记录，检查 issuer 代码`)
    return
  }

  // ---- Phase 2: split by the cheap list-row year --------------------------
  const droppedByList = []
  const candidates = []
  let unknownListYear = 0
  for (const [id, item] of listingById) {
    if (existing.has(id)) {
      candidates.push({ id, item, resumed: true })
      continue
    }
    const year = listYearOf(item)
    if (year == null) {
      if (args.skipUndated) {
        droppedByList.push({ id, title: String(item.title ?? ''), year: null, source: 'list' })
        continue
      }
      unknownListYear += 1
      candidates.push({ id, item, year: null })
      continue
    }
    if (year < args.since) {
      droppedByList.push({ id, title: String(item.title ?? ''), year, source: 'list' })
      continue
    }
    candidates.push({ id, item, year })
  }

  const fresh = candidates.filter((candidate) => !candidate.resumed)
  const plannedDetails = args.details ? fresh.length : 0
  const plannedRequests = listing.pages + plannedDetails + (args.issuerCheck ? 1 : 0)

  // ---- dry run: report the filter and spend exactly one detail request ----
  if (args.dryRun) {
    console.log('\n— dry-run 统计 —')
    console.log(`列表：${listingById.size} 条（${listing.pages} 页${listing.total != null ? `，API count ${listing.total}` : ''}）`)
    if (duplicates) console.log(`列表重复 id：${duplicates} 条（已去重）`)
    console.log(`按 --since ${args.since} 过滤（列表层，不拉详情）：丢弃 ${droppedByList.length} 条`)
    console.log(`保留 ${fresh.length} 条待拉详情${unknownListYear ? `（其中 ${unknownListYear} 条列表无年份，需详情判断）` : ''}`)
    console.log(
      `正式同步预计：${listing.pages} 页 + ${plannedDetails} 详情${args.issuerCheck ? ' + 1 issuer 校验' : ''} = ${plannedRequests} 次请求，约 ${secondsFor(plannedRequests)} 秒（delay ${args.delay}ms）`,
    )

    if (args.statsOut) {
      const statsPath = path.resolve(ROOT, args.statsOut)
      await mkdir(path.dirname(statsPath), { recursive: true })
      await writeFile(
        statsPath,
        `${JSON.stringify(
          {
            iso: args.iso,
            issuer: args.issuer,
            since: args.since,
            listed: listingById.size,
            dropped: droppedByList.length,
            kept: fresh.length,
            unknown_list_year: unknownListYear,
            pages: listing.pages,
            planned_requests: plannedRequests,
            actual_requests: requestCount,
          },
          null,
          2,
        )}\n`,
        'utf8',
      )
    }
    if (droppedByList.length) {
      console.log('\n被丢弃的示例（最多 8 条）：')
      for (const item of droppedByList.slice(0, 8)) {
        console.log(`  ${item.id}  ${item.year}  ${item.title}`)
      }
      if (droppedByList.length > 8) console.log(`  …其余 ${droppedByList.length - 8} 条`)
    }

    if (!fresh.length) {
      console.log('\n没有需要拉详情的券种（全部被年份过滤或已存在）')
      return
    }

    const sample = fresh[0]
    const detail = args.details ? await apiGet(`/types/${sample.id}?lang=${args.lang}`) : null
    const normalized = normalize(sample.item, detail)
    console.log(
      `\n— 归一化样例${args.details ? '（本次 dry-run 额外消耗 1 次详情请求）' : '（--no-details，不拉详情）'} —`,
    )
    console.log(JSON.stringify(normalized, null, 2))
    console.log('\n原始 list item（判断能否用 --no-details）：')
    console.log(JSON.stringify(sample.item, null, 2))
    if (detail) {
      console.log('\n原始 detail（核对字段名）：')
      console.log(JSON.stringify(detail, null, 2))
    }
    console.log('\n该条字段缺失：', JSON.stringify(countMissing([normalized])))
    console.log(`本次 dry-run 实际请求：${requestCount} 次`)
    return
  }

  // ---- Phase 3: details only for what survives the year cut ---------------
  const collected = new Map(existing)
  const dropped = [...droppedByList]
  const issuerMismatches = []
  let detailsFetched = 0
  let processed = 0

  for (const candidate of candidates) {
    if (candidate.resumed) continue
    if (args.limit && processed >= args.limit) break

    const detail = args.details ? await apiGet(`/types/${candidate.id}?lang=${args.lang}`) : null
    if (detail) detailsFetched += 1
    const type = normalize(candidate.item, detail)
    if (!type.numista_type_id) continue
    processed += 1

    const year = type.max_year ?? type.min_year
    if (year != null && year < args.since) {
      dropped.push({ id: type.numista_type_id, title: type.title, year, source: 'detail' })
      continue
    }
    const allowedIssuers = REGION_LOCALE[args.iso]?.issuerCodes
    const issuerCode = type.issuer.code
    if (issuerCode && issuerCode !== args.issuer && !(allowedIssuers ?? []).includes(issuerCode)) {
      issuerMismatches.push({ id: type.numista_type_id, title: type.title, code: issuerCode })
    }

    collected.set(type.numista_type_id, type)
  }

  const types = [...collected.values()].sort((a, b) => a.numista_type_id - b.numista_type_id)
  const missing = countMissing(types)
  const droppedListCount = dropped.filter((item) => item.source === 'list').length
  const droppedDetailCount = dropped.length - droppedListCount

  const meta = {
    generated_at: new Date().toISOString(),
    fixture: false,
    api: 'numista v3',
    issuer: args.issuer,
    iso: args.iso,
    category: 'banknote',
    lang: args.lang,
    since: args.since,
    listed: listingById.size,
    fetched: types.length,
    details_fetched: detailsFetched,
    dropped_before_since: dropped.length,
    dropped_by_source: { list: droppedListCount, detail: droppedDetailCount },
    issuer_mismatches: issuerMismatches.length,
    pages: listing.pages,
    requests: requestCount,
  }

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify({ meta, types }, null, 2)}\n`, 'utf8')

  const reportPath = path.join(ROOT, 'data/reports', `sync_${args.iso.toLowerCase()}.json`)
  await mkdir(path.dirname(reportPath), { recursive: true })
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        generated_at: meta.generated_at,
        issuer: args.issuer,
        iso: args.iso,
        listed: listingById.size,
        fetched: types.length,
        requests: requestCount,
        details_fetched: detailsFetched,
        dropped,
        issuer_mismatches: issuerMismatches,
        missing,
        samples: { normalized: types[0] ?? null },
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  console.log('')
  console.log(`listed ${listingById.size} · kept ${types.length} · dropped ${dropped.length}（list ${droppedListCount} / detail ${droppedDetailCount}）`)
  console.log(`pages ${listing.pages} · details ${detailsFetched} · requests ${requestCount} → ${path.relative(ROOT, outPath)}`)
  console.log(`missing: ${JSON.stringify(missing)}`)
  if (issuerMismatches.length) {
    console.warn(`\n⚠ ${issuerMismatches.length} 条结果的 issuer code 与 --issuer 不符（过滤可能未生效）：`)
    for (const item of issuerMismatches.slice(0, 5)) console.warn(`  ${item.id} ${item.code} ${item.title}`)
  }
  if (missing.face_value > 0) {
    console.warn('\n⚠ 有券种未能解析面额，请把 data/reports/sync_*.json 的 samples 发我补映射')
  }
  console.log(`report → ${path.relative(ROOT, reportPath)}`)
}

main().catch((error) => {
  console.error(`\n✖ ${error.message}\n`)
  process.exit(1)
})
