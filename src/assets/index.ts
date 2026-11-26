// Central asset map. Numbers refer to docs/asset-inventory.json (originals sorted by filename).
// All files are processed WebP with real transparency (green screen removed).
const p = (n: number) => `/assets/processed/${String(n).padStart(2, '0')}.webp`
const t = (n: number) => `/assets/preview/${String(n).padStart(2, '0')}.webp`
// transparent margins removed (see public/assets/trimmed) — used wherever the object itself should fill its box
const c = (n: number) => `/assets/trimmed/${String(n).padStart(2, '0')}.webp`
export const assets = {
  branding: { logo: c(42), monogram: c(13) },
  backgrounds: { silk: p(53), chromeWave: p(54) },
  chrome: { ribbonA: p(12), ribbonInfinity: p(47), ribbonCurve: p(55), wave: p(34), interwoven: p(46), podiumOrbit: p(45) },
  diamonds: { rainbow: p(3), faceted: p(8), facetedAlt: p(9), photoreal: p(32), onTransparent: p(51), deco: p(24) },
  jewelry: { ringPave: c(17), ringSolitaire: c(16), ring: c(15), necklace: c(14), earrings: c(20), bracelet: c(21), tennis: c(22), crown: c(1), pendant: c(2) },
  editorial: { portrait: p(52) },
  banners: { newCollectionSign: c(11), sparkle: c(10) },
  thumb: t,
  full: p,
} as const
