import { db } from '@/db/db'
import type { SyncedNote } from '@/types'
import { SYNC_COUNTRIES } from '@/lib/sync-countries'

/**
 * In-app Numista sync.
 *
 * This deliberately mirrors the list-only mode of scripts/sync-numista.mjs:
 * fetch the paginated banknote list, drop undated rows, keep 1960+, parse the
 * face value from the title and park everything in Standard Issues. Details
 * (variants) stay a desktop/backfill job — the app only needs a working set.
 */

const API = 'https://api.numista.com/v3'
const PAGE_SIZE = 50
const SINCE = 1960

export interface SyncProgress {
  phase: 'fetch' | 'clean' | 'save' | 'done'
  page?: number
  pages?: number
  total?: number
  kept?: number
  listed?: number
  message?: string
}

const FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
}

const UNIT_ZH: Record<string, string> = {
  dollar: '美元',
  dollars: '美元',
  pound: '英镑',
  pounds: '英镑',
  shilling: '先令',
  shillings: '先令',
  rouble: '卢布',
  roubles: '卢布',
  ruble: '卢布',
  rubles: '卢布',
  kopek: '戈比',
  kopeks: '戈比',
  rupiah: '盾',
  ringgit: '林吉特',
  baht: '泰铢',
  dong: '盾',
  'đồng': '盾',
  yen: '円',
  yuan: '元',
  won: '韩元',
  hwan: '圜',
  jeon: '钱',
  rupee: '卢比',
  rupees: '卢比',
  peso: '比索',
  pesos: '比索',
  piso: '比索',
  'new peso': '新比索',
  'nuevos pesos': '新比索',
  austral: '奥斯特拉尔',
  australes: '奥斯特拉尔',
  cruzado: '克鲁扎多',
  cruzados: '克鲁扎多',
  cruzeiro: '克鲁塞罗',
  cruzeiros: '克鲁塞罗',
  real: '雷亚尔',
  reais: '雷亚尔',
  centavo: '分',
  centavos: '分',
  centesimo: '分',
  centesimos: '分',
  escudo: '埃斯库多',
  escudos: '埃斯库多',
  peseta: '比塞塔',
  pesetas: '比塞塔',
  mark: '马克',
  'deutsche mark': '马克',
  pfennig: '芬尼',
  franc: '法郎',
  francs: '法郎',
  euro: '欧元',
  euros: '欧元',
  krone: '克朗',
  kroner: '克朗',
  krona: '克朗',
  kronor: '克朗',
  zloty: '兹罗提',
  zlotys: '兹罗提',
  lira: '里拉',
  lire: '里拉',
  'israeli pound': '以色列镑',
  sheqel: '谢克尔',
  sheqalim: '谢克尔',
  'new sheqel': '新谢克尔',
  'new sheqalim': '新谢克尔',
  livre: '叙镑',
  livres: '叙镑',
  'syrian pound': '叙镑',
  gulden: '盾',
  ngultrum: '努尔特鲁姆',
  riel: '瑞尔',
  riels: '瑞尔',
  bolivar: '玻利瓦尔',
  bolivares: '玻利瓦尔',
  rand: '兰特',
  'new pence': '便士',
  pence: '便士',
  'new unit': '新单位',
}

const REGION_UNIT_OVERRIDES: Record<string, Record<string, string>> = {
  US: { dollar: '美元' },
  CA: { dollar: '加元' },
  AU: { dollar: '澳元' },
  NZ: { dollar: '新西兰元' },
  SG: { dollar: '新加坡元' },
  GB: { pound: '英镑' },
  SY: { pound: '叙镑', livre: '叙镑' },
  EG: { pound: '埃及镑' },
}

function normalizeUnit(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[()[\]{}._/、,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function faceUnitZh(raw: string, iso: string): string {
  const key = normalizeUnit(raw)
  if (!key) return SYNC_COUNTRIES[iso]?.unit ?? ''
  const overrides = REGION_UNIT_OVERRIDES[iso] ?? {}
  const words = key.split(' ')
  for (const candidate of [key, words[0], words[words.length - 1]]) {
    if (overrides[candidate]) return overrides[candidate]
    if (UNIT_ZH[candidate]) return UNIT_ZH[candidate]
  }
  return SYNC_COUNTRIES[iso]?.unit ?? raw
}

function parseTitle(title: string): { value: number | null; unit: string | null } {
  let head = title.split(/\(|\s+-\s+/)[0].trim()
  head = head.replace(/(\d)\s+(?=\d{3}\b)/g, '$1')
  const match = /^([\d.,]+)(?:st|nd|rd|th)?\s*([½¼¾⅓⅔⅛])?\s*(.*)$/.exec(head)
  if (!match) return { value: null, unit: null }
  const whole = match[1] ? Number(match[1].replace(/,/g, '')) : 0
  const fraction = match[2] ? FRACTIONS[match[2]] : 0
  const value = match[1] || match[2] ? whole + fraction : null
  const unit = (match[3] ?? '').split('/')[0].replace(/^["“”']+|["“”']+$/g, '').trim() || null
  return { value, unit }
}

interface NumistaType {
  id: number
  title: string
  min_year?: number | null
  max_year?: number | null
}

export async function syncCountry(
  isoInput: string,
  apiKey: string,
  onProgress: (progress: SyncProgress) => void,
): Promise<{ kept: number; listed: number }> {
  const iso = isoInput.trim().toUpperCase()
  const country = SYNC_COUNTRIES[iso]
  if (!country) throw new Error(`内置清单里没有 ${iso || '空 ISO'}，目前支持 42 个已收录国家`)
  if (!apiKey.trim()) throw new Error('先填 Numista API Key')

  const rows: SyncedNote[] = []
  let listed = 0
  let page = 1
  let pages = 1

  while (page <= pages && page <= 40) {
    const url =
      `${API}/types?category=banknote&issuer=${encodeURIComponent(country.issuer)}` +
      `&count=${PAGE_SIZE}&page=${page}&lang=en`
    let response: Response
    try {
      response = await fetch(url, {
        headers: { 'Numista-API-Key': apiKey.trim(), Accept: 'application/json' },
      })
    } catch {
      throw new Error('请求被浏览器拦截（CORS）。APK 的 WebView 内可直连；网页版请用桌面脚本同步。')
    }
    if (response.status === 401) throw new Error('API Key 无效（401）')
    if (response.status === 429) throw new Error('触发限流（429），等一会儿再试')
    if (!response.ok) throw new Error(`Numista 返回 ${response.status}`)

    const data = (await response.json()) as {
      count?: number
      types?: NumistaType[]
      items?: NumistaType[]
    }
    const batch = data.types ?? data.items ?? []
    listed += batch.length
    if (typeof data.count === 'number') pages = Math.max(1, Math.ceil(data.count / PAGE_SIZE))
    onProgress({ phase: 'fetch', page, pages, total: data.count, message: '拉取列表' })

    for (const type of batch) {
      const year = type.max_year ?? type.min_year
      if (year == null || year < SINCE) continue
      const face = parseTitle(String(type.title ?? ''))
      if (face.value == null) continue
      const unit = faceUnitZh(face.unit ?? '', iso)
      const yearLabel =
        type.min_year && type.max_year && type.min_year !== type.max_year
          ? `${type.min_year}–${type.max_year}`
          : String(year)
      rows.push({
        // Match build-catalog's `n-<iso>-<typeId>` so progress survives a sync.
        id: `n-${iso.toLowerCase()}-${type.id}`,
        region_id: iso.toLowerCase(),
        series_id: `${iso.toLowerCase()}-std`,
        numista_type_id: type.id,
        denom: face.value,
        unit,
        label: `${face.value}${unit} · ${yearLabel}`,
        synced_at: Date.now(),
      })
    }

    if (batch.length < PAGE_SIZE) break
    page += 1
  }

  onProgress({ phase: 'clean', kept: rows.length, listed, message: '清洗与归类' })

  await db.transaction('rw', db.synced_notes, async () => {
    await db.synced_notes.where('region_id').equals(iso.toLowerCase()).delete()
    if (rows.length > 0) await db.synced_notes.bulkPut(rows)
  })

  onProgress({ phase: 'done', kept: rows.length, listed, message: '已写入本机' })
  return { kept: rows.length, listed }
}

export async function clearSyncedRegion(iso: string): Promise<void> {
  await db.synced_notes.where('region_id').equals(iso.toLowerCase()).delete()
}
