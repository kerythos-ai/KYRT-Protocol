// Generates the square token icon (kyrt-512.png) from the brand SVG.
// The mark is navy (#091E2F) + green (#00A859); on dark wallet UIs the navy
// would disappear, so we recolor navy → white and place it on a navy square.
// Run: node scripts/gen-logo.mjs
import sharp from 'sharp'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const SIZE = 512
const PAD = 44 // breathing room around the mark, per side (px)
const NAVY = { r: 9, g: 30, b: 47, alpha: 1 } // #091E2F
const SRC = resolve('assets/images/logo-kyrt.svg')
const OUT = resolve('assets/images/kyrt-512.png')

// Recolor the navy fills/strokes to white; keep the green accent untouched.
const svg = readFileSync(SRC, 'utf8').replaceAll('#091E2F', '#FFFFFF')

const inner = SIZE - PAD * 2
const mark = await sharp(Buffer.from(svg), { density: 512 })
  .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

const png = await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: NAVY },
})
  .composite([{ input: mark, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toBuffer()

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, png)
console.log(`✅ ${OUT} (${SIZE}x${SIZE}, ${(png.length / 1024).toFixed(1)} KB)`)
