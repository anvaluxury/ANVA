// Copies the ffmpeg.wasm core next to the site (public/ffmpeg) so the admin video trimmer never depends on a third-party CDN.
// Runs automatically after `npm install`. It never fails the install: without the core only video trimming is unavailable.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
const from = 'node_modules/@ffmpeg/core/dist/esm'
const to = 'public/ffmpeg'
try {
  if (!existsSync(from)) { console.warn('[ffmpeg] @ffmpeg/core not installed - video trimming will be unavailable'); process.exit(0) }
  mkdirSync(to, { recursive: true })
  for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) copyFileSync(`${from}/${f}`, `${to}/${f}`)
  console.log('[ffmpeg] core copied to public/ffmpeg')
} catch (e) { console.warn('[ffmpeg] copy skipped:', e.message) }
