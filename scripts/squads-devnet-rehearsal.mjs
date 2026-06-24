// De-risks the Squads proposal machinery on DEVNET before building the real
// KYRT deploy. Creates a throwaway 2-of-2 multisig (mirrors mainnet), funds its
// vault, then runs a full cycle: vaultTransactionCreate -> proposalCreate ->
// approve x2 -> execute, moving a little SOL out of the vault.
// Run: node scripts/squads-devnet-rehearsal.mjs
import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram,
  Transaction, TransactionMessage, clusterApiUrl, sendAndConfirmTransaction,
} from '@solana/web3.js'
import * as multisig from '@sqds/multisig'
import { readFileSync } from 'node:fs'

const { Permissions } = multisig.types
const conn = new Connection(clusterApiUrl('devnet'), 'confirmed')
const confirm = async (sig, label) => {
  await conn.confirmTransaction(sig, 'confirmed')
  console.log(`   ✓ ${label}: ${sig.slice(0, 16)}…`)
}

// Reuse the existing devnet treasury keypair as fee payer / funder.
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync('.keys/treasury.json', 'utf8'))),
)
const memberA = Keypair.generate()
const memberB = Keypair.generate()

const bal = await conn.getBalance(payer.publicKey)
console.log(`Payer: ${payer.publicKey.toBase58()} (${(bal / LAMPORTS_PER_SOL).toFixed(3)} SOL)`)
if (bal < 0.3 * LAMPORTS_PER_SOL) throw new Error('Need ~0.3 SOL on the devnet treasury. Run `npm run airdrop`.')

// Squads program config -> creation-fee treasury.
const programConfigPda = multisig.getProgramConfigPda({})[0]
const programConfig = await multisig.accounts.ProgramConfig.fromAccountAddress(conn, programConfigPda)
const treasury = programConfig.treasury
console.log(`Squads creation treasury: ${treasury.toBase58()}`)

// 1) Create a 2-of-2 multisig.
const createKey = Keypair.generate()
const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey })
console.log(`\n1/5 Creating 2-of-2 multisig ${multisigPda.toBase58()}…`)
await confirm(
  await multisig.rpc.multisigCreateV2({
    connection: conn, treasury, createKey, creator: payer, multisigPda,
    configAuthority: null, threshold: 2, timeLock: 0, rentCollector: null,
    members: [
      { key: memberA.publicKey, permissions: Permissions.all() },
      { key: memberB.publicKey, permissions: Permissions.all() },
    ],
  }),
  'multisig created',
)

const [vault0] = multisig.getVaultPda({ multisigPda, index: 0 })
console.log(`   vault0: ${vault0.toBase58()}`)

// 2) Fund vault0.
console.log('\n2/5 Funding vault0 (0.05) + creator memberA (0.03)…')
await confirm(
  await sendAndConfirmTransaction(conn, new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: vault0, lamports: 0.05 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: memberA.publicKey, lamports: 0.03 * LAMPORTS_PER_SOL }),
  ), [payer]),
  'vault + creator funded',
)
const vaultBefore = await conn.getBalance(vault0)

// 3) Create a vault transaction (move 0.01 SOL out of the vault) + proposal.
const transactionIndex = 1n
const { blockhash } = await conn.getLatestBlockhash()
const innerMessage = new TransactionMessage({
  payerKey: vault0,
  recentBlockhash: blockhash,
  instructions: [SystemProgram.transfer({ fromPubkey: vault0, toPubkey: payer.publicKey, lamports: 0.01 * LAMPORTS_PER_SOL })],
})
console.log('\n3/5 Creating vault transaction + proposal…')
await confirm(
  await multisig.rpc.vaultTransactionCreate({
    connection: conn, feePayer: payer, multisigPda, transactionIndex,
    creator: memberA.publicKey, vaultIndex: 0, ephemeralSigners: 0,
    transactionMessage: innerMessage, signers: [memberA],
  }),
  'vault tx created',
)
await confirm(
  await multisig.rpc.proposalCreate({ connection: conn, feePayer: payer, creator: memberA, multisigPda, transactionIndex }),
  'proposal created',
)

// 4) Approve with BOTH members (2-of-2).
console.log('\n4/5 Approving with both members…')
await confirm(await multisig.rpc.proposalApprove({ connection: conn, feePayer: payer, member: memberA, multisigPda, transactionIndex }), 'approved by A')
await confirm(await multisig.rpc.proposalApprove({ connection: conn, feePayer: payer, member: memberB, multisigPda, transactionIndex }), 'approved by B')

// 5) Execute.
console.log('\n5/5 Executing…')
await confirm(
  await multisig.rpc.vaultTransactionExecute({ connection: conn, feePayer: payer, multisigPda, transactionIndex, member: memberA.publicKey, signers: [memberA] }),
  'executed',
)

const vaultAfter = await conn.getBalance(vault0)
console.log(`\nVault: ${(vaultBefore / LAMPORTS_PER_SOL).toFixed(4)} -> ${(vaultAfter / LAMPORTS_PER_SOL).toFixed(4)} SOL`)
console.log(vaultAfter < vaultBefore ? '\n✅ Proposal cycle works end-to-end (create → approve×2 → execute).' : '\n❌ Vault balance did not change, something is off.')
