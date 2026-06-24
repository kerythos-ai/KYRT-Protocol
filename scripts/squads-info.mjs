// Verifies a Squads v4 multisig and derives its vault addresses.
// Usage: node scripts/squads-info.mjs <MULTISIG_ADDRESS> [rpcUrl]
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import * as multisig from '@sqds/multisig'

const SQUADS_V4_PROGRAM = 'SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf'

const arg = process.argv[2]
if (!arg) {
  console.error('Pass the multisig address: node scripts/squads-info.mjs <address> [rpc]')
  process.exit(1)
}
const rpc = process.argv[3] || clusterApiUrl('mainnet-beta')
const conn = new Connection(rpc, 'confirmed')

let ms
try {
  ms = new PublicKey(arg)
} catch {
  console.error(`❌ "${arg}" is not a valid Solana address.`)
  process.exit(1)
}

console.log(`RPC: ${rpc}`)
console.log(`Address: ${ms.toBase58()}\n`)

const acc = await conn.getAccountInfo(ms)
if (!acc) {
  console.log('❌ Account NOT found on this network. (Wrong network, or it is a vault, not the multisig config.)')
  process.exit(1)
}
console.log(`Owner program: ${acc.owner.toBase58()}`)
console.log(`Is Squads v4:  ${acc.owner.toBase58() === SQUADS_V4_PROGRAM ? '✅ yes' : '❌ no, this is NOT a Squads v4 multisig config account'}\n`)

try {
  const m = await multisig.accounts.Multisig.fromAccountAddress(conn, ms)
  console.log(`Threshold:   ${m.threshold} of ${m.members.length}`)
  console.log('Members:')
  for (const mem of m.members) console.log(`  • ${mem.key.toBase58()}`)
  console.log('')
  for (const i of [0, 1, 2]) {
    const [vault] = multisig.getVaultPda({ multisigPda: ms, index: i })
    console.log(`Vault index ${i}: ${vault.toBase58()}`)
  }
  console.log('\n→ Vault index 0 is the default vault (where the genesis supply will be minted).')
} catch (e) {
  console.log(`Could not parse as a v4 Multisig: ${e instanceof Error ? e.message : e}`)
}
