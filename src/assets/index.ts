// Central asset map. Numbers refer to docs/asset-inventory.json (originals sorted by filename).
// All files are processed WebP with real transparency (green screen removed).
const p = (n: number) => `/assets/processed/${String(n).padStart(2, '0')}.webp`
const t = (n: number) => `/assets/preview/${String(n).padStart(2, '0')}.webp`
export const assets = {
  branding: { logo: p(42), monogram: p(13) },
  backgrounds: { silk: p(53), chromeWave: p(54) },
  chrome: { ribbonA: p(12), ribbonInfinity: p(47), ribbonCurve: p(55), wave: p(34), interwoven: p(46), podiumOrbit: p(45) },
  diamonds: { rainbow: p(3), faceted: p(8), facetedAlt: p(9), photoreal: p(32), onTransparent: p(51), deco: p(24) },
  jewelry: { ringPave: p(17), ringSolitaire: p(16), ring: p(15), necklace: p(14), earrings: p(20), bracelet: p(21), tennis: p(22), crown: p(1), pendant: p(2) },
  editorial: { portrait: p(52) },
  banners: { newCollectionSign: p(11), sparkle: p(10) },
  thumb: t,
  full: p,
} as const
