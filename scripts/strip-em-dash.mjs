// Replaces em dashes (—) with ", " across text/code files, per the project's
// style rule (no em dashes). Collapses surrounding spaces/tabs but NOT newlines.
// Usage: node scripts/strip-em-dash.mjs <dir> [dir...]
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const EXTS = new Set(['.md', '.ts', '.tsx', '.mjs', '.js', '.json'])
const SKIP_DIR = new Set(['node_modules', '.next', '.git', 'dist', '.claude', 'build'])
const SKIP_FILE = new Set(['package-lock.json', 'strip-em-dash.mjs'])
const roots = process.argv.slice(2)
if (!roots.length) { console.error('usage: node scripts/strip-em-dash.mjs <dir> [dir...]'); process.exit(1) }

let files = 0
let total = 0
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) { walk(p); continue }
    if (SKIP_FILE.has(name) || !EXTS.has(extname(name))) continue
    const before = readFileSync(p, 'utf8')
    const matches = before.match(/[ \t]*—[ \t]*/g)
    if (!matches) continue
    const after = before.replace(/[ \t]*—[ \t]*/g, ', ')
    writeFileSync(p, after)
    files++
    total += matches.length
    console.log(`  ${matches.length.toString().padStart(3)}  ${p}`)
  }
}
for (const r of roots) walk(r)
console.log(`\nReplaced ${total} em dashes across ${files} files.`)
