// Verifies the RPC in SOLANA_RPC_URL (.env) without printing the API key.
// Confirms it responds and that it is mainnet-beta (by genesis hash).
// Run: npm run check:rpc
import 'dotenv/config'
import { Connection } from '@solana/web3.js'

const url = process.env.SOLANA_RPC_URL?.trim()
if (!url) {
  console.error('SOLANA_RPC_URL is empty in .env. Paste your Helius mainnet URL there first.')
  process.exit(1)
}

const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'
let host = 'unknown'
try { host = new URL(url).host } catch {}

const conn = new Connection(url, 'confirmed')
const t0 = Date.now()
const version = await conn.getVersion()
const slot = await conn.getSlot()
const genesis = await conn.getGenesisHash()
const ms = Date.now() - t0
const isMainnet = genesis === MAINNET_GENESIS

console.log(`Host:    ${host}`) // API key intentionally NOT printed
console.log(`Version: ${version['solana-core']}`)
console.log(`Slot:    ${slot}`)
console.log(`Network: ${isMainnet ? 'mainnet-beta ✅' : 'NOT mainnet (genesis ' + genesis + ')'}`)
console.log(`Latency: ~${ms} ms for 3 calls`)
console.log(isMainnet ? '\n✅ RPC OK and on mainnet-beta.' : '\n⚠️  This RPC is not mainnet-beta. Check that you copied the Mainnet URL, not Devnet.')
