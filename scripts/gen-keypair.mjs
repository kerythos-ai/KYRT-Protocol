// Generates (or shows) a Solana keypair at a path and prints its public key.
// Usage: node scripts/gen-keypair.mjs <path>
import { Keypair } from '@solana/web3.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const path = process.argv[2]
if (!path) { console.error('usage: node scripts/gen-keypair.mjs <path>'); process.exit(1) }

if (existsSync(path)) {
  const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, 'utf8'))))
  console.log(`EXISTS  ${path}`)
  console.log(`pubkey  ${kp.publicKey.toBase58()}`)
} else {
  mkdirSync(dirname(path), { recursive: true })
  const kp = Keypair.generate()
  writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)))
  console.log(`CREATED ${path}`)
  console.log(`pubkey  ${kp.publicKey.toBase58()}`)
}
