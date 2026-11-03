/**
 * Flag source per country.
 *
 * Most flags come from the generated `flags/pack` (flag-icons, recoloured to the
 * subdued palette). A handful of simplified hand-drawn flags are clearer at
 * 48×32 and take precedence; Mexico/Spain are hand-drawn because their official
 * SVGs contain gradients/coats of arms that do not survive recolouring.
 */
const HAND_DRAWN = new Set([
  'cn',
  'jp',
  'us',
  'gb',
  'by',
  'id',
  'sy',
  've',
  'bt',
  'kh',
  'br',
  'za',
  'es',
  'mx',
  'yu',
])

export function flagSrc(iso: string): string {
  const code = iso.toLowerCase()
  return HAND_DRAWN.has(code)
    ? `flags/engraved/${code}.svg`
    : `flags/pack/${code}.svg`
}
