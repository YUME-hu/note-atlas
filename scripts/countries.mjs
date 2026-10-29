/**
 * Single source of truth for the countries we ship.
 *
 * `issuer` is the Numista issuer code (NOT an ISO code); it must be confirmed
 * with --list-issuers. `since` is the earliest year we keep (list-stage filter,
 * no details wasted on older types). `region` is only for grouping the report.
 *
 * This table feeds batch-sync.mjs and, eventually, locales.mjs.
 */

export const COUNTRIES = [
  // ---- already shipped ----
  { iso: 'CN', name: '中国', issuer: 'chine', since: 1948, currency: 'CNY', unit: '元', region: 'Asia', issuers: ['中国人民银行'] },
  { iso: 'JP', name: '日本', issuer: 'japon', since: 1946, currency: 'JPY', unit: '円', region: 'Asia', issuers: ['日本銀行'] },
  { iso: 'US', name: '美国', issuer: 'etats-unis', since: 1900, currency: 'USD', unit: '美元', region: 'Americas', issuers: ['美国财政部', '联邦储备委员会'] },

  // ---- previous 7 ----
  { iso: 'GB', name: '英国', issuer: 'united-kingdom', since: 1960, currency: 'GBP', unit: '英镑', region: 'Europe', issuers: ['英格兰银行'] },
  { iso: 'BY', name: '白俄罗斯', issuer: 'bielorussie', since: 1960, currency: 'BYN', unit: '卢布', region: 'Europe', issuers: ['白俄罗斯国家银行'] },
  { iso: 'ID', name: '印度尼西亚', issuer: 'indonesia', since: 1960, currency: 'IDR', unit: '盾', region: 'Asia', issuers: ['印度尼西亚银行'] },
  { iso: 'SY', name: '叙利亚', issuer: 'syria', since: 1900, currency: 'SYP', unit: '叙镑', region: 'Middle East', issuers: ['叙利亚中央银行'] },
  { iso: 'VE', name: '委内瑞拉', issuer: 'venezuela', since: 1960, currency: 'VES', unit: '玻利瓦尔', region: 'Americas', issuers: ['委内瑞拉中央银行'] },
  { iso: 'BT', name: '不丹', issuer: 'bhoutan', since: 1960, currency: 'BTN', unit: '努尔特鲁姆', region: 'Asia', issuers: ['不丹皇家金融管理局'] },
  { iso: 'KH', name: '柬埔寨', issuer: 'cambodge', since: 1960, currency: 'KHR', unit: '瑞尔', region: 'Asia', issuers: ['柬埔寨国家银行'] },

  // ---- Europe ----
  { iso: 'DE', name: '德国', issuer: 'allemagne', since: 1960, currency: 'EUR', unit: '欧元', region: 'Europe', issuers: ['德意志联邦银行'] },
  { iso: 'FR', name: '法国', issuer: 'france', since: 1960, currency: 'EUR', unit: '欧元', region: 'Europe', issuers: ['法兰西银行'] },
  { iso: 'IT', name: '意大利', issuer: 'italy', since: 1960, currency: 'EUR', unit: '欧元', region: 'Europe', issuers: ['意大利银行'] },
  { iso: 'ES', name: '西班牙', issuer: 'spain', since: 1960, currency: 'EUR', unit: '欧元', region: 'Europe', issuers: ['西班牙银行'] },
  { iso: 'PT', name: '葡萄牙', issuer: 'portugal', since: 1960, currency: 'EUR', unit: '欧元', region: 'Europe', issuers: ['葡萄牙银行'] },
  { iso: 'NL', name: '荷兰', issuer: 'netherlands', since: 1960, currency: 'EUR', unit: '欧元', region: 'Europe', issuers: ['荷兰银行'] },
  { iso: 'BE', name: '比利时', issuer: 'belgium', since: 1960, currency: 'EUR', unit: '欧元', region: 'Europe', issuers: ['比利时国家银行'] },
  { iso: 'CH', name: '瑞士', issuer: 'switzerland', since: 1960, currency: 'CHF', unit: '法郎', region: 'Europe', issuers: ['瑞士国家银行'] },
  { iso: 'SE', name: '瑞典', issuer: 'suede', since: 1960, currency: 'SEK', unit: '克朗', region: 'Europe', issuers: ['瑞典央行'] },
  { iso: 'NO', name: '挪威', issuer: 'norway', since: 1960, currency: 'NOK', unit: '克朗', region: 'Europe', issuers: ['挪威央行'] },
  { iso: 'DK', name: '丹麦', issuer: 'denmark', since: 1960, currency: 'DKK', unit: '克朗', region: 'Europe', issuers: ['丹麦国家银行'] },
  { iso: 'PL', name: '波兰', issuer: 'pologne', since: 1960, currency: 'PLN', unit: '兹罗提', region: 'Europe', issuers: ['波兰国家银行'] },
  { iso: 'RU', name: '俄罗斯', issuer: 'russie', since: 1960, currency: 'RUB', unit: '卢布', region: 'Europe', issuers: ['俄罗斯银行'] },

  // ---- Americas ----
  { iso: 'CA', name: '加拿大', issuer: 'canada', since: 1960, currency: 'CAD', unit: '加元', region: 'Americas', issuers: ['加拿大银行'] },
  { iso: 'MX', name: '墨西哥', issuer: 'mexico', since: 1960, currency: 'MXN', unit: '比索', region: 'Americas', issuers: ['墨西哥银行'] },
  { iso: 'BR', name: '巴西', issuer: 'bresil', since: 1960, currency: 'BRL', unit: '雷亚尔', region: 'Americas', issuers: ['巴西中央银行'] },
  { iso: 'AR', name: '阿根廷', issuer: 'argentina', since: 1960, currency: 'ARS', unit: '比索', region: 'Americas', issuers: ['阿根廷中央银行'] },
  { iso: 'CL', name: '智利', issuer: 'chili', since: 1960, currency: 'CLP', unit: '比索', region: 'Americas', issuers: ['智利中央银行'] },

  // ---- Asia ----
  { iso: 'KR', name: '韩国', issuer: 'coree_du_sud', since: 1960, currency: 'KRW', unit: '韩元', region: 'Asia', issuers: ['韩国银行'] },
  { iso: 'IN', name: '印度', issuer: 'india', since: 1960, currency: 'INR', unit: '卢比', region: 'Asia', issuers: ['印度储备银行'] },
  { iso: 'MY', name: '马来西亚', issuer: 'malaisie', since: 1960, currency: 'MYR', unit: '林吉特', region: 'Asia', issuers: ['马来西亚国家银行'] },
  { iso: 'SG', name: '新加坡', issuer: 'singapour', since: 1960, currency: 'SGD', unit: '新加坡元', region: 'Asia', issuers: ['新加坡金融管理局'] },
  { iso: 'TH', name: '泰国', issuer: 'thailande', since: 1960, currency: 'THB', unit: '泰铢', region: 'Asia', issuers: ['泰国银行'] },
  { iso: 'VN', name: '越南', issuer: 'viet_nam', since: 1960, currency: 'VND', unit: '盾', region: 'Asia', issuers: ['越南国家银行'] },
  { iso: 'PH', name: '菲律宾', issuer: 'philippines', since: 1960, currency: 'PHP', unit: '比索', region: 'Asia', issuers: ['菲律宾中央银行'] },
  { iso: 'PK', name: '巴基斯坦', issuer: 'pakistan', since: 1960, currency: 'PKR', unit: '卢比', region: 'Asia', issuers: ['巴基斯坦国家银行'] },

  // ---- Middle East / Africa ----
  { iso: 'TR', name: '土耳其', issuer: 'turquie', since: 1960, currency: 'TRY', unit: '里拉', region: 'Middle East', issuers: ['土耳其共和国中央银行'] },
  { iso: 'IL', name: '以色列', issuer: 'israel', since: 1960, currency: 'ILS', unit: '新谢克尔', region: 'Middle East', issuers: ['以色列银行'] },
  { iso: 'EG', name: '埃及', issuer: 'egypte', since: 1960, currency: 'EGP', unit: '埃及镑', region: 'Africa', issuers: ['埃及中央银行'] },
  { iso: 'ZA', name: '南非', issuer: 'south-africa', since: 1960, currency: 'ZAR', unit: '兰特', region: 'Africa', issuers: ['南非储备银行'] },

  // ---- Oceania ----
  { iso: 'AU', name: '澳大利亚', issuer: 'australie', since: 1960, currency: 'AUD', unit: '澳元', region: 'Oceania', issuers: ['澳大利亚储备银行'] },
  { iso: 'NZ', name: '新西兰', issuer: 'nouvelle-zelande', since: 1960, currency: 'NZD', unit: '新西兰元', region: 'Oceania', issuers: ['新西兰储备银行'] },
]

export const COUNTRY_BY_ISO = new Map(COUNTRIES.map((country) => [country.iso, country]))
