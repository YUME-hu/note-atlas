/** Generated from scripts/countries.mjs — keep in sync when adding countries. */
export interface SyncCountry {
  iso: string
  issuer: string
  name: string
  unit: string
}

export const SYNC_COUNTRIES: Record<string, SyncCountry> = {
  CN: { iso: 'CN', issuer: 'chine', name: '中国', unit: '元' },
  JP: { iso: 'JP', issuer: 'japon', name: '日本', unit: '円' },
  US: { iso: 'US', issuer: 'etats-unis', name: '美国', unit: '美元' },
  GB: { iso: 'GB', issuer: 'united-kingdom', name: '英国', unit: '英镑' },
  BY: { iso: 'BY', issuer: 'bielorussie', name: '白俄罗斯', unit: '卢布' },
  ID: { iso: 'ID', issuer: 'indonesia', name: '印度尼西亚', unit: '盾' },
  SY: { iso: 'SY', issuer: 'syria', name: '叙利亚', unit: '叙镑' },
  VE: { iso: 'VE', issuer: 'venezuela', name: '委内瑞拉', unit: '玻利瓦尔' },
  BT: { iso: 'BT', issuer: 'bhoutan', name: '不丹', unit: '努尔特鲁姆' },
  KH: { iso: 'KH', issuer: 'cambodge', name: '柬埔寨', unit: '瑞尔' },
  DE: { iso: 'DE', issuer: 'allemagne', name: '德国', unit: '欧元' },
  FR: { iso: 'FR', issuer: 'france', name: '法国', unit: '欧元' },
  IT: { iso: 'IT', issuer: 'italy', name: '意大利', unit: '欧元' },
  ES: { iso: 'ES', issuer: 'spain', name: '西班牙', unit: '欧元' },
  PT: { iso: 'PT', issuer: 'portugal', name: '葡萄牙', unit: '欧元' },
  NL: { iso: 'NL', issuer: 'netherlands', name: '荷兰', unit: '欧元' },
  BE: { iso: 'BE', issuer: 'belgium', name: '比利时', unit: '欧元' },
  CH: { iso: 'CH', issuer: 'switzerland', name: '瑞士', unit: '法郎' },
  SE: { iso: 'SE', issuer: 'suede', name: '瑞典', unit: '克朗' },
  NO: { iso: 'NO', issuer: 'norway', name: '挪威', unit: '克朗' },
  DK: { iso: 'DK', issuer: 'denmark', name: '丹麦', unit: '克朗' },
  PL: { iso: 'PL', issuer: 'pologne', name: '波兰', unit: '兹罗提' },
  RU: { iso: 'RU', issuer: 'russie', name: '俄罗斯', unit: '卢布' },
  CA: { iso: 'CA', issuer: 'canada', name: '加拿大', unit: '加元' },
  MX: { iso: 'MX', issuer: 'mexico', name: '墨西哥', unit: '比索' },
  BR: { iso: 'BR', issuer: 'bresil', name: '巴西', unit: '雷亚尔' },
  AR: { iso: 'AR', issuer: 'argentina', name: '阿根廷', unit: '比索' },
  CL: { iso: 'CL', issuer: 'chili', name: '智利', unit: '比索' },
  KR: { iso: 'KR', issuer: 'coree_du_sud', name: '韩国', unit: '韩元' },
  IN: { iso: 'IN', issuer: 'india', name: '印度', unit: '卢比' },
  MY: { iso: 'MY', issuer: 'malaisie', name: '马来西亚', unit: '林吉特' },
  SG: { iso: 'SG', issuer: 'singapour', name: '新加坡', unit: '新加坡元' },
  TH: { iso: 'TH', issuer: 'thailande', name: '泰国', unit: '泰铢' },
  VN: { iso: 'VN', issuer: 'viet_nam', name: '越南', unit: '盾' },
  PH: { iso: 'PH', issuer: 'philippines', name: '菲律宾', unit: '比索' },
  PK: { iso: 'PK', issuer: 'pakistan', name: '巴基斯坦', unit: '卢比' },
  TR: { iso: 'TR', issuer: 'turquie', name: '土耳其', unit: '里拉' },
  IL: { iso: 'IL', issuer: 'israel', name: '以色列', unit: '新谢克尔' },
  EG: { iso: 'EG', issuer: 'egypte', name: '埃及', unit: '埃及镑' },
  ZA: { iso: 'ZA', issuer: 'south-africa', name: '南非', unit: '兰特' },
  AU: { iso: 'AU', issuer: 'australie', name: '澳大利亚', unit: '澳元' },
  NZ: { iso: 'NZ', issuer: 'nouvelle-zelande', name: '新西兰', unit: '新西兰元' },
}
