// Validates src/deploy-squads.ts proposeDeployment() on devnet: builds a test
// multisig (2 voters + 1 proposer-only, threshold 2, mirroring mainnet), calls
// the PRODUCTION propose function, then approves (2-of-2) and executes in order
// to confirm the queued proposals are valid and executable.
// Run: npx tsx scripts/squads-propose-test.ts
import {
  Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction,
  clusterApiUrl, sendAndConfirmTransaction,
} from '@solana/web3.js'
import { getMint, getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token'
import * as multisig from '@sqds/multisig'
import { readFileSync } from 'node:fs'
import { proposeDeployment } from '../src/deploy-squads'
import { RAW_SUPPLY } from '../src/config'

const { Permissions, Permission } = multisig.types
const conn = new Connection(clusterApiUrl('devnet'), 'confirmed')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
async function retry<T>(fn: () => Promise<T>, tries = 12): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn() }
    catch (e) { if (i < tries - 1 && /429|Too Many Requests/.test(String(e))) { await sleep(700 * (i + 1)); continue } throw e }
  }
}
const confirm = async (sig: string, label: string) => { await retry(() => conn.confirmTransaction(sig, 'confirmed')); console.log('  ✓', label); await sleep(400) }

const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync('.keys/treasury.json', 'utf8'))))
const voterA = Keypair.generate()
const voterB = Keypair.generate()
const proposer = Keypair.generate()

const programConfig = await multisig.accounts.ProgramConfig.fromAccountAddress(conn, multisig.getProgramConfigPda({})[0])
const createKey = Keypair.generate()
const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey })
console.log('Creating test multisig (2 voters + 1 proposer-only, threshold 2)…')
await confirm(await multisig.rpc.multisigCreateV2({
  connection: conn, treasury: programConfig.treasury, createKey, creator: payer, multisigPda,
  configAuthority: null, threshold: 2, timeLock: 0, rentCollector: null,
  members: [
    { key: voterA.publicKey, permissions: Permissions.all() },
    { key: voterB.publicKey, permissions: Permissions.all() },
    { key: proposer.publicKey, permissions: Permissions.fromPermissions([Permission.Initiate]) },
  ],
}), 'multisig created')
const [vault0] = multisig.getVaultPda({ multisigPda, index: 0 })

await retry(() => sendAndConfirmTransaction(conn, new Transaction().add(
  SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: vault0, lamports: 0.1 * LAMPORTS_PER_SOL }),
  SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: proposer.publicKey, lamports: 0.06 * LAMPORTS_PER_SOL }),
), [payer]))
console.log('  ✓ funded vault + proposer')

console.log('\nCalling proposeDeployment() (production function)…')
const res = await proposeDeployment({ connection: conn, rpcUrl: clusterApiUrl('devnet'), multisigPda, vaultIndex: 0, proposer, metadataUri: '' })
console.log(`  proposed #${res.indices.create}/#${res.indices.mint}/#${res.indices.revoke}, mint ${res.mint.toBase58()}`)

console.log('\nApproving (2-of-2) + executing in order…')
for (const index of [res.indices.create, res.indices.mint, res.indices.revoke]) {
  await confirm(await multisig.rpc.proposalApprove({ connection: conn, feePayer: payer, member: voterA, multisigPda, transactionIndex: index }), `approve A #${index}`)
  await confirm(await multisig.rpc.proposalApprove({ connection: conn, feePayer: payer, member: voterB, multisigPda, transactionIndex: index }), `approve B #${index}`)
  await confirm(await multisig.rpc.vaultTransactionExecute({ connection: conn, feePayer: payer, multisigPda, transactionIndex: index, member: voterA.publicKey, signers: [voterA] }), `execute #${index}`)
}

const mintInfo = await retry(() => getMint(conn, res.mint))
const acct = await retry(() => getAccount(conn, getAssociatedTokenAddressSync(res.mint, vault0, true)))
console.log('\n=== Result ===')
console.log(`supply:   ${mintInfo.supply}  (expected ${RAW_SUPPLY})`)
console.log(`vault ATA: ${acct.amount}`)
console.log(`mintAuth: ${mintInfo.mintAuthority?.toBase58() ?? 'null'} | freezeAuth: ${mintInfo.freezeAuthority?.toBase58() ?? 'null'}`)
const ok = mintInfo.supply === RAW_SUPPLY && acct.amount === RAW_SUPPLY && !mintInfo.mintAuthority && !mintInfo.freezeAuthority
console.log(ok ? '\n✅ deploy-squads.ts proposeDeployment() produces valid, executable proposals.' : '\n❌ mismatch')
