// Preview helper: shows how an icon looks after the circular crop that
// wallets / DEX / trackers apply, on a light and a dark app background.
// Run: node scripts/circle-preview.mjs [srcPng]
import sharp from 'sharp'
import { resolve } from 'node:path'

const SRC = resolve(process.argv[2] || 'assets/images/kyrt-512.png')
const OUT = resolve('assets/images/_circle-preview.png')
const D = 256

const icon = await sharp(SRC).resize(D, D).png().toBuffer()
const mask = Buffer.from(`<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="#fff"/></svg>`)
const circ = await sharp(icon).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()

const tile = (bg) =>
  sharp({ create: { width: D, height: D, channels: 4, background: bg } })
    .composite([{ input: circ }])
    .png()
    .toBuffer()

const light = await tile('#FFFFFF')
const dark = await tile('#0B1220')

await sharp({ create: { width: D * 2 + 12, height: D, channels: 4, background: '#9aa0a6' } })
  .composite([{ input: light, left: 0, top: 0 }, { input: dark, left: D + 12, top: 0 }])
  .png()
  .toFile(OUT)
console.log(`✅ ${OUT}`)
