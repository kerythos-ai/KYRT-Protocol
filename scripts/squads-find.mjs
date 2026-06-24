// Finds the Squads v4 multisig CONFIG account given the vault address and/or
// member addresses, by scanning their tx history: the multisig is whichever
// account in those txs whose derived vault[0] == the known vault.
// Usage: node scripts/squads-find.mjs <knownVault> <addr1> [addr2 ...] [--rpc <url>]
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import * as multisig from '@sqds/multisig'

const args = process.argv.slice(2)
const rpcFlag = args.indexOf('--rpc')
const rpc = rpcFlag !== -1 ? args[rpcFlag + 1] : clusterApiUrl('mainnet-beta')
const addrs = args.filter((a, i) => a !== '--rpc' && args[i - 1] !== '--rpc')

const VAULT = new PublicKey(addrs[0])
const seeds = addrs.map((a) => new PublicKey(a))
const conn = new Connection(rpc, 'confirmed')

console.log(`RPC: ${rpc}`)
console.log(`Known vault: ${VAULT.toBase58()}\n`)

const candidates = new Set()
for (const addr of seeds) {
  let sigs = []
  try {
    sigs = await conn.getSignaturesForAddress(addr, { limit: 40 })
  } catch (e) {
    console.log(`  (could not get sigs for ${addr.toBase58()}: ${e.message})`)
  }
  console.log(`  ${addr.toBase58()}: ${sigs.length} sigs`)
  for (const s of sigs) {
    let tx
    try {
      tx = await conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 })
    } catch {
      continue
    }
    if (!tx) continue
    for (const k of tx.transaction.message.accountKeys) candidates.add(k.pubkey.toBase58())
  }
}

console.log(`\nScanning ${candidates.size} candidate accounts for a matching multisig...\n`)
for (const c of candidates) {
  try {
    const pk = new PublicKey(c)
    const [v0] = multisig.getVaultPda({ multisigPda: pk, index: 0 })
    if (v0.equals(VAULT)) {
      console.log(`✅ MULTISIG FOUND: ${c}`)
      const m = await multisig.accounts.Multisig.fromAccountAddress(conn, pk)
      console.log(`   Threshold: ${m.threshold} of ${m.members.length}`)
      m.members.forEach((mm) => console.log(`   member: ${mm.key.toBase58()}`))
      const [v1] = multisig.getVaultPda({ multisigPda: pk, index: 1 })
      console.log(`   vault[0] = ${v0.toBase58()}  (== known vault ✓)`)
      console.log(`   vault[1] = ${v1.toBase58()}`)
      process.exit(0)
    }
  } catch {
    /* not a pubkey / not a multisig */
  }
}
console.log('❌ Multisig not found from the provided history. Provide the creator (Principal) address, or fund/transact the squad once so its history references the multisig.')
