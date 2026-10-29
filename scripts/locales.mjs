/**
 * Region / series dictionary for the catalog build.
 *
 * Everything the pipeline needs to know in Chinese lives here: region names,
 * base units, issuer names, series names and the clustering rules.
 * The Numista API only provides English titles and numeric years.
 */

export const REGION_LOCALE = {
  CN: {
    name: '中国',
    flag: '🇨🇳',
    currency: 'CNY',
    unit: '元',
    issuers: ['中国人民银行'],
    issuerCodes: ['chine'],
  },
  JP: {
    name: '日本',
    flag: '🇯🇵',
    currency: 'JPY',
    unit: '円',
    issuers: ['日本銀行'],
    issuerCodes: ['japon'],
  },
  US: {
    name: '美国',
    flag: '🇺🇸',
    currency: 'USD',
    unit: '美元',
    issuers: ['美国财政部', '联邦储备委员会'],
    // Numista 明细里美国的 issuer code 是 etats-unis；hawaii 是二战夏威夷加盖券
    issuerCodes: ['united-states', 'etats-unis', 'hawaii'],
  },
  GB: {
    name: '英国',
    flag: '🇬🇧',
    currency: 'GBP',
    unit: '英镑',
    issuers: ['英格兰银行'],
    fallbackSeries: 'gb-std',
  },
  BY: {
    name: '白俄罗斯',
    flag: '🇧🇾',
    currency: 'BYN',
    unit: '卢布',
    issuers: ['白俄罗斯国家银行'],
    fallbackSeries: 'by-std',
  },
  ID: {
    name: '印度尼西亚',
    flag: '🇮🇩',
    currency: 'IDR',
    unit: '盾',
    issuers: ['印度尼西亚银行'],
    fallbackSeries: 'id-std',
  },
  SY: {
    name: '叙利亚',
    flag: '🇸🇾',
    currency: 'SYP',
    unit: '叙镑',
    issuers: ['叙利亚中央银行'],
    fallbackSeries: 'sy-std',
  },
  VE: {
    name: '委内瑞拉',
    flag: '🇻🇪',
    currency: 'VES',
    unit: '玻利瓦尔',
    issuers: ['委内瑞拉中央银行'],
    fallbackSeries: 've-std',
  },
  BT: {
    name: '不丹',
    flag: '🇧🇹',
    currency: 'BTN',
    unit: '努尔特鲁姆',
    issuers: ['不丹皇家金融管理局'],
    fallbackSeries: 'bt-std',
  },
  KH: {
    name: '柬埔寨',
    flag: '🇰🇭',
    currency: 'KHR',
    unit: '瑞尔',
    issuers: ['柬埔寨国家银行'],
    fallbackSeries: 'kh-std',
  },
}

/**
 * Face-value units → base-unit factor + the Chinese character used in labels.
 *
 * Numista reports currencies by name, not by code: China comes back as
 * "Rénmínbì" (with diacritics) and Japan as "Yen". Keys are matched against a
 * diacritic-free, lower-cased form, so synonyms and pinyin all land here.
 * Anything absent from this table falls back to the raw API unit in the label
 * and is listed under `unknown_units` in data/reports/build.json.
 */
const UNIT_TABLE = {
  // CNY — base
  yuan: { factor: 1, zh: '元' },
  'yuan renminbi': { factor: 1, zh: '元' },
  'renminbi yuan': { factor: 1, zh: '元' },
  renminbi: { factor: 1, zh: '元' },
  rmb: { factor: 1, zh: '元' },
  'chinese yuan': { factor: 1, zh: '元' },
  元: { factor: 1, zh: '元' },
  圆: { factor: 1, zh: '元' },
  圓: { factor: 1, zh: '元' },
  人民币: { factor: 1, zh: '元' },
  人民币元: { factor: 1, zh: '元' },
  kuai: { factor: 1, zh: '元' },
  // CNY — fractions
  jiao: { factor: 0.1, zh: '角' },
  mao: { factor: 0.1, zh: '角' },
  角: { factor: 0.1, zh: '角' },
  毛: { factor: 0.1, zh: '角' },
  fen: { factor: 0.01, zh: '分' },
  分: { factor: 0.01, zh: '分' },
  // JPY — base
  yen: { factor: 1, zh: '円' },
  'japanese yen': { factor: 1, zh: '円' },
  en: { factor: 1, zh: '円' },
  円: { factor: 1, zh: '円' },
  日元: { factor: 1, zh: '円' },
  日本円: { factor: 1, zh: '円' },
  日圆: { factor: 1, zh: '円' },
  日圓: { factor: 1, zh: '円' },
  // JPY — fractions
  sen: { factor: 0.01, zh: '銭' },
  銭: { factor: 0.01, zh: '銭' },
  錢: { factor: 0.01, zh: '銭' },
  rin: { factor: 0.001, zh: '厘' },
  厘: { factor: 0.001, zh: '厘' },
  // USD — base
  dollar: { factor: 1, zh: '美元' },
  dollars: { factor: 1, zh: '美元' },
  usd: { factor: 1, zh: '美元' },
  'us dollar': { factor: 1, zh: '美元' },
  'united states dollar': { factor: 1, zh: '美元' },
  美元: { factor: 1, zh: '美元' },
  美金: { factor: 1, zh: '美元' },
  // USD — fractions (denominations below 1 dollar, rare on notes)
  cent: { factor: 0.01, zh: '美分' },
  cents: { factor: 0.01, zh: '美分' },
  // GBP — base and pre-decimal fraction
  pound: { factor: 1, zh: '英镑' },
  pounds: { factor: 1, zh: '英镑' },
  'pound sterling': { factor: 1, zh: '英镑' },
  sterling: { factor: 1, zh: '英镑' },
  gbp: { factor: 1, zh: '英镑' },
  英镑: { factor: 1, zh: '英镑' },
  shilling: { factor: 0.05, zh: '先令' },
  shillings: { factor: 0.05, zh: '先令' },
  // BYN / BYR
  rouble: { factor: 1, zh: '卢布' },
  roubles: { factor: 1, zh: '卢布' },
  ruble: { factor: 1, zh: '卢布' },
  rubles: { factor: 1, zh: '卢布' },
  byn: { factor: 1, zh: '卢布' },
  byr: { factor: 1, zh: '卢布' },
  卢布: { factor: 1, zh: '卢布' },
  kopek: { factor: 0.01, zh: '戈比' },
  kopeks: { factor: 0.01, zh: '戈比' },
  // IDR
  rupiah: { factor: 1, zh: '盾' },
  idr: { factor: 1, zh: '盾' },
  印尼盾: { factor: 1, zh: '盾' },
  // SYP
  'syrian pound': { factor: 1, zh: '叙镑' },
  'syrian pounds': { factor: 1, zh: '叙镑' },
  lira: { factor: 1, zh: '叙镑' },
  syp: { factor: 1, zh: '叙镑' },
  piastre: { factor: 0.01, zh: '皮阿斯特' },
  piastres: { factor: 0.01, zh: '皮阿斯特' },
  // VES
  bolivar: { factor: 1, zh: '玻利瓦尔' },
  bolivares: { factor: 1, zh: '玻利瓦尔' },
  'bolívar': { factor: 1, zh: '玻利瓦尔' },
  'bolívares': { factor: 1, zh: '玻利瓦尔' },
  ves: { factor: 1, zh: '玻利瓦尔' },
  // BTN
  ngultrum: { factor: 1, zh: '努尔特鲁姆' },
  ngultrums: { factor: 1, zh: '努尔特鲁姆' },
  btn: { factor: 1, zh: '努尔特鲁姆' },
  chetrum: { factor: 0.01, zh: '切特鲁姆' },
  // KHR
  riel: { factor: 1, zh: '瑞尔' },
  riels: { factor: 1, zh: '瑞尔' },
  khr: { factor: 1, zh: '瑞尔' },
  kak: { factor: 0.1, zh: '卡' },
  // Pre-modern Japanese unit; kept at face value instead of skipping the data.
  monme: { factor: 1, zh: '匁' },
  匁: { factor: 1, zh: '匁' },
}

export function normalizeUnit(rawUnit) {
  return String(rawUnit ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[()[\]{}._\-/、,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Resolve a raw unit string. Returns { factor, zh } or null (→ raw fallback).
 * `iso` enables the last-resort match against the region's ISO currency code.
 */
export function resolveUnit(rawUnit, iso) {
  if (rawUnit == null) return null
  const key = normalizeUnit(rawUnit)
  if (!key) return null

  const direct = UNIT_TABLE[key]
  if (direct) return direct

  // "Chinese yuan", "Japanese yen", "Yuan Renminbi" → last word
  const last = key.split(' ').pop()
  if (last && UNIT_TABLE[last]) return UNIT_TABLE[last]

  const locale = REGION_LOCALE[String(iso ?? '').toUpperCase()]
  if (locale && key === normalizeUnit(locale.currency)) {
    return { factor: 1, zh: locale.unit }
  }
  return null
}

/**
 * Series definitions, in matching order.
 * keywords are checked first (high confidence); from/to form the fallback
 * year bins (low confidence) used only when no keyword matches.
 *
 * CN 1953 is the overlap year: 第一套 ends there, 第二套 is dated 1953 but
 * issued in 1955. The bin sends 1953 to 第二套 and relies on keywords to keep
 * 第一套 notes out; anything decided by the bin alone is reported as
 * low confidence for manual review.
 */
export const SERIES_DEFS = {
  CN: [
    {
      id: 'cn-com',
      name: '纪念钞',
      year_start: 1999,
      year_end: null,
      status: 'commemorative',
      keywords: [
        /commemorative|anniversary|纪念/i,
        /olympic|dragon|snake|horse|millennium|aerospace|winter/i,
      ],
    },
    {
      // 1980–1996 的 1/2/5 角、1/2/5/10/50/100 元 = 第四套。
      // 必须在年份桶之前判断：1980 版的票面年份会落进第三套的桶。
      id: 'cn-4',
      name: '第四套人民币',
      year_start: 1987,
      year_end: 2018,
      status: 'historical',
      keywords: [/fourth\s+series|第四套/i],
      match: ({ denom, minYear, maxYear }) => {
        if (denom == null) return false
        const year = minYear ?? maxYear
        if (year == null || year < 1980 || year > 1996) return false
        return [0.1, 0.2, 0.5, 1, 2, 5, 10, 50, 100].includes(denom)
      },
      from: 1980,
      to: 1998,
    },
    {
      id: 'cn-1',
      name: '第一套人民币',
      year_start: 1948,
      year_end: 1955,
      status: 'historical',
      keywords: [/first\s+series|第一套/i],
      // 第一套的高面额（100–50000 元）；第二套最高只有 10 元，1953 年重叠也分得开
      match: ({ denom, minYear }) => denom != null && denom >= 100 && minYear != null && minYear <= 1953,
      from: 1948,
      to: 1952,
    },
    {
      id: 'cn-2',
      name: '第二套人民币',
      year_start: 1955,
      year_end: 1962,
      status: 'historical',
      keywords: [/second\s+series|第二套/i],
      from: 1953,
      to: 1959,
    },
    {
      id: 'cn-3',
      name: '第三套人民币',
      year_start: 1962,
      year_end: 1987,
      status: 'historical',
      keywords: [/third\s+series|第三套/i],
      // 第三套票面年份 1960/1962/1965/1972，1960 必须从这里开始
      from: 1960,
      to: 1979,
    },
    {
      id: 'cn-5',
      name: '第五套人民币',
      year_start: 1999,
      year_end: null,
      status: 'current',
      keywords: [/fifth\s+series|第五套/i],
      from: 1999,
      to: 9999,
    },
  ],
  JP: [
    {
      id: 'jp-com',
      name: '纪念钞',
      year_start: 1964,
      year_end: null,
      status: 'commemorative',
      keywords: [/commemorative|olympic|expo|記念|纪念/i],
      // 2000 円札（2000 年沖縄サミット）标题里没有 commemorative 字样
      match: ({ denom }) => denom === 2000,
    },
    {
      id: 'jp-a',
      name: 'A号券',
      year_start: 1946,
      year_end: 1950,
      status: 'historical',
      keywords: [/series\s*a\b|a\s*号券|us\s+military\s+currency/i],
      // 1946 年前已发行、仍在流通的券；以及没有年份的券，归最近档
      match: ({ minYear }) => minYear == null || minYear < 1946,
      from: 1946,
      to: 1948,
    },
    {
      id: 'jp-b',
      name: 'B号券',
      year_start: 1950,
      year_end: 1957,
      status: 'historical',
      keywords: [/series\s*b\b|b\s*号券/i],
      from: 1949,
      to: 1956,
    },
    {
      id: 'jp-c',
      name: 'C号券',
      year_start: 1957,
      year_end: 1984,
      status: 'historical',
      keywords: [/series\s*c\b|c\s*号券/i],
      from: 1957,
      to: 1983,
    },
    {
      id: 'jp-d',
      name: 'D号券',
      year_start: 1984,
      year_end: 2004,
      status: 'historical',
      keywords: [/series\s*d\b|d\s*号券/i],
      from: 1984,
      to: 2003,
    },
    {
      id: 'jp-e',
      name: 'E号券',
      year_start: 2004,
      year_end: 2024,
      status: 'historical',
      keywords: [/series\s*e\b|e\s*号券/i],
      from: 2004,
      to: 2023,
    },
    {
      id: 'jp-f',
      name: 'F号券',
      year_start: 2024,
      year_end: null,
      status: 'current',
      keywords: [/series\s*f\b|f\s*号券/i],
      from: 2024,
      to: 9999,
    },
  ],
  US: [
    // 美国券种按发行主体/券别区分，标题括号里通常写着券别；先关键词，再按年份兜底。
    {
      id: 'us-frn',
      name: '联邦储备券',
      year_start: 1914,
      year_end: null,
      status: 'current',
      keywords: [/federal\s+reserve\s+note/i],
      from: 1914,
      to: 9999,
    },
    {
      id: 'us-frbn',
      name: '联邦储备银行券',
      year_start: 1915,
      year_end: 1934,
      status: 'historical',
      keywords: [/federal\s+reserve\s+bank\s+note/i],
    },
    {
      id: 'us-silver',
      name: '白银券',
      year_start: 1900,
      year_end: 1964,
      status: 'historical',
      keywords: [/silver\s+certificate/i],
    },
    {
      id: 'us-gold',
      name: '黄金券',
      year_start: 1900,
      year_end: 1933,
      status: 'historical',
      keywords: [/gold\s+certificate/i],
    },
    {
      id: 'us-usn',
      name: '法定货币券',
      year_start: 1900,
      year_end: 1971,
      status: 'historical',
      keywords: [/legal\s+tender|united\s+states\s+note/i],
    },
    {
      id: 'us-nbn',
      name: '国民银行券',
      year_start: 1900,
      year_end: 1935,
      status: 'historical',
      keywords: [/national\s+bank\s+note|national\s+currency|national\s+bank/i],
    },
  ],
  GB: [
    {
      id: 'gb-armed',
      name: '武装部队券',
      year_start: 1940,
      year_end: 1972,
      status: 'historical',
      keywords: [/armed\s+forces|naafi|canteen|voucher/i],
    },
    {
      id: 'gb-std',
      name: '标准流通钞',
      year_start: 1950,
      year_end: null,
      status: 'current',
    },
  ],
  BY: [
    { id: 'by-std', name: '标准流通钞', year_start: 1992, year_end: null, status: 'current' },
  ],
  ID: [
    { id: 'id-std', name: '标准流通钞', year_start: 1950, year_end: null, status: 'current' },
  ],
  SY: [
    // Numista 的叙利亚发行人只覆盖 1919–1945，没有 1950 年后的条目，这一国从 1900 拉起
    { id: 'sy-std', name: '标准流通钞', year_start: 1900, year_end: null, status: 'current' },
  ],
  VE: [
    { id: 've-std', name: '标准流通钞', year_start: 1950, year_end: null, status: 'current' },
  ],
  BT: [
    { id: 'bt-std', name: '标准流通钞', year_start: 1974, year_end: null, status: 'current' },
  ],
  KH: [
    { id: 'kh-std', name: '标准流通钞', year_start: 1950, year_end: null, status: 'current' },
  ],
}

/**
 * Titles that are not circulating currency (props, specimens, test prints).
 * Checked before face parsing so they never reach notes.json.
 */
export const SKIP_PATTERNS = {
  US: [
    /movie prop|prop money|copy money|motion picture|experimental substrate|replica|specimen|test note|test print|fantasy/i,
  ],
}

export function seriesDef(iso, seriesId) {
  return (SERIES_DEFS[iso] ?? []).find((def) => def.id === seriesId) ?? null
}

/**
 * Manual overrides > title keywords > explicit rules > year bins.
 * Returns { seriesId, rule: 'keyword' | 'rule' | 'year-bin' } or null.
 *
 * `context` = { title, minYear, maxYear, denom }.
 * Rules are deterministic checks (denomination + era, military issues, …) and
 * outrank year bins, which stay as the last-resort low-confidence fallback.
 */
export function matchSeries(iso, context) {
  const { title = '', minYear = null, maxYear = null, denom = null } = context ?? {}
  const defs = SERIES_DEFS[iso] ?? []
  const normalizedTitle = String(title ?? '')

  for (const def of defs) {
    for (const keyword of def.keywords ?? []) {
      if (keyword.test(normalizedTitle)) {
        return { seriesId: def.id, rule: 'keyword' }
      }
    }
  }

  const ctx = { title: normalizedTitle, minYear, maxYear, denom }
  for (const def of defs) {
    if (def.match?.(ctx)) {
      return { seriesId: def.id, rule: 'rule' }
    }
  }

  if (Number.isFinite(minYear)) {
    for (const def of defs) {
      if (def.from == null || def.to == null) continue
      if (minYear >= def.from && minYear <= def.to) {
        return { seriesId: def.id, rule: 'year-bin' }
      }
    }
  }

  // Small catalogs (GB/BY/ID/SY/VE/BT/KH) have no meaningful series structure in
  // their titles: everything unmatched becomes "标准流通钞" instead of unassigned.
  const fallback = REGION_LOCALE[iso]?.fallbackSeries
  if (fallback) return { seriesId: fallback, rule: 'fallback' }

  return null
}
