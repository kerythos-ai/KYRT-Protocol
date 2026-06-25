// Generates the circle-safe token icon (kyrt-512.png) from the brand mark.
// The mark (navy network "K" + green trend arrow) is recolored navy -> white
// and centered on a navy background, scaled to stay clear of the circular crop
// that wallets / DEX / trackers apply to token logos. Icon only, no wordmark.
// Run: node scripts/gen-logo.mjs
import sharp from 'sharp'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const SIZE = 512
const INNER = 326 // mark box: keeps the corner tips inside the circular crop (~26px margin to edge)
const SRC = resolve('assets/images/logo-icon.svg')
const OUT = resolve('assets/images/kyrt-512.png')

// On dark wallet UIs the navy mark would vanish, so recolor navy -> white; keep green.
const svg = readFileSync(SRC, 'utf8').replaceAll('#091E2F', '#FFFFFF')

// Rasterize the mark large, then trim to its true bounding box so centering is exact.
const raster = await sharp(Buffer.from(svg), { density: 1200 }).png().toBuffer()
const trimmed = await sharp(raster).trim().toBuffer()
const mark = await sharp(trimmed)
  .resize(INNER, INNER, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

// Subtle radial navy gradient (lighter center) for a modern, premium depth.
const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <defs><radialGradient id="g" cx="50%" cy="44%" r="72%">
    <stop offset="0%" stop-color="#0E3050"/>
    <stop offset="62%" stop-color="#0A2236"/>
    <stop offset="100%" stop-color="#071726"/>
  </radialGradient></defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
</svg>`
const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer()

const png = await sharp(bg)
  .composite([{ input: mark, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toBuffer()

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, png)
console.log(`✅ ${OUT} (${SIZE}x${SIZE}, ${(png.length / 1024).toFixed(1)} KB)`)
