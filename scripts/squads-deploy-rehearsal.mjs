// Full Option-A deploy REHEARSAL on devnet (Stage 1: no metadata yet).
// Throwaway 2-of-2 multisig, then the real deploy as 3 proposals:
//   1) create mint  (ephemeral signer = the mint; authorities = vault0)
//   2) mint full supply -> vault0 ATA
//   3) revoke mint + freeze -> null
// Each proposal: create -> approve x2 -> execute. Verifies the end state.
// Run: node scripts/squads-deploy-rehearsal.mjs
import {
  Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram,
  Transaction, TransactionMessage, clusterApiUrl, sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  MINT_SIZE, TOKEN_PROGRAM_ID, AuthorityType,
  getMinimumBalanceForRentExemptMint, createInitializeMint2Instruction,
  getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction, createSetAuthorityInstruction, getMint, getAccount,
} from '@solana/spl-token'
import * as multisig from '@sqds/multisig'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createNoopSigner, none } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey, toWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters'
import { mplTokenMetadata, createMetadataAccountV3, findMetadataPda, fetchMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { readFileSync } from 'node:fs'

const { Permissions } = multisig.types
const DECIMALS = 9
const SUPPLY = 1_000_000_000n * 10n ** BigInt(DECIMALS)
const conn = new Connection(clusterApiUrl('devnet'), 'confirmed')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// The public devnet RPC is heavily rate-limited; retry direct calls on 429.
async function retry(fn, tries = 12) {
  for (let i = 0; ; i++) {
    try { return await fn() }
    catch (e) { if (i < tries - 1 && /429|Too Many Requests/.test(String(e))) { await sleep(700 * (i + 1)); continue } throw e }
  }
}
const confirm = async (sig, label) => { await retry(() => conn.confirmTransaction(sig, 'confirmed')); console.log(`      ✓ ${label}`); await sleep(400) }

const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync('.keys/treasury.json', 'utf8'))))
const memberA = Keypair.generate()
const memberB = Keypair.generate()
console.log(`Payer: ${payer.publicKey.toBase58()} (${(await conn.getBalance(payer.publicKey) / LAMPORTS_PER_SOL).toFixed(3)} SOL)`)

const programConfig = await multisig.accounts.ProgramConfig.fromAccountAddress(conn, multisig.getProgramConfigPda({})[0])

// Create a throwaway 2-of-2 multisig.
const createKey = Keypair.generate()
const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey })
console.log(`\nCreating 2-of-2 multisig ${multisigPda.toBase58()}…`)
await confirm(await multisig.rpc.multisigCreateV2({
  connection: conn, treasury: programConfig.treasury, createKey, creator: payer, multisigPda,
  configAuthority: null, threshold: 2, timeLock: 0, rentCollector: null,
  members: [
    { key: memberA.publicKey, permissions: Permissions.all() },
    { key: memberB.publicKey, permissions: Permissions.all() },
  ],
}), 'multisig created')
const [vault0] = multisig.getVaultPda({ multisigPda, index: 0 })
console.log(`vault0: ${vault0.toBase58()}`)

console.log('\nFunding vault0 (0.1) + creator (0.05)…')
await retry(() => sendAndConfirmTransaction(conn, new Transaction().add(
  SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: vault0, lamports: 0.1 * LAMPORTS_PER_SOL }),
  SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: memberA.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
), [payer]))
console.log('      ✓ funded')

// Runs one proposal end-to-end (create -> approve x2 -> execute).
async function runProposal(index, instructions, ephemeralSigners = 0) {
  const { blockhash } = await retry(() => conn.getLatestBlockhash())
  const message = new TransactionMessage({ payerKey: vault0, recentBlockhash: blockhash, instructions })
  await sleep(500)
  await confirm(await multisig.rpc.vaultTransactionCreate({
    connection: conn, feePayer: payer, multisigPda, transactionIndex: index,
    creator: memberA.publicKey, vaultIndex: 0, ephemeralSigners, transactionMessage: message, signers: [memberA],
  }), `tx ${index} created`)
  await confirm(await multisig.rpc.proposalCreate({ connection: conn, feePayer: payer, creator: memberA, multisigPda, transactionIndex: index }), 'proposal')
  await confirm(await multisig.rpc.proposalApprove({ connection: conn, feePayer: payer, member: memberA, multisigPda, transactionIndex: index }), 'approved by A')
  await confirm(await multisig.rpc.proposalApprove({ connection: conn, feePayer: payer, member: memberB, multisigPda, transactionIndex: index }), 'approved by B')
  await confirm(await multisig.rpc.vaultTransactionExecute({ connection: conn, feePayer: payer, multisigPda, transactionIndex: index, member: memberA.publicKey, signers: [memberA] }), 'executed')
}

// The mint address is the ephemeral signer of transaction #1.
const [txPda1] = multisig.getTransactionPda({ multisigPda, index: 1n })
const [mint] = multisig.getEphemeralSignerPda({ transactionPda: txPda1, ephemeralSignerIndex: 0 })
console.log(`\nMint will be: ${mint.toBase58()}`)

// Build the Metaplex CreateMetadataAccountV3 instruction (update authority = vault0)
// with umi, then convert to a web3.js instruction to embed in the proposal.
const umi = createUmi(clusterApiUrl('devnet')).use(mplTokenMetadata())
const umiVault = fromWeb3JsPublicKey(vault0)
const umiMint = fromWeb3JsPublicKey(mint)
const metadataPda = findMetadataPda(umi, { mint: umiMint })
const metadataIxs = createMetadataAccountV3(umi, {
  metadata: metadataPda,
  mint: umiMint,
  mintAuthority: createNoopSigner(umiVault),
  payer: createNoopSigner(umiVault),
  updateAuthority: umiVault,
  data: { name: 'Kerythos AI', symbol: 'KYRT', uri: '', sellerFeeBasisPoints: 0, creators: none(), collection: none(), uses: none() },
  isMutable: true,
  collectionDetails: none(),
}).getInstructions().map(toWeb3JsInstruction)

console.log('\n[1/3] Create mint + metadata (ephemeral signer)…')
const rent = await getMinimumBalanceForRentExemptMint(conn)
await runProposal(1n, [
  SystemProgram.createAccount({ fromPubkey: vault0, newAccountPubkey: mint, space: MINT_SIZE, lamports: rent, programId: TOKEN_PROGRAM_ID }),
  createInitializeMint2Instruction(mint, DECIMALS, vault0, vault0, TOKEN_PROGRAM_ID),
  ...metadataIxs,
], 1)

console.log('\n[2/3] Mint full supply -> vault0 ATA…')
const ata = getAssociatedTokenAddressSync(mint, vault0, true)
await runProposal(2n, [
  createAssociatedTokenAccountIdempotentInstruction(vault0, ata, vault0, mint),
  createMintToInstruction(mint, ata, vault0, SUPPLY),
])

console.log('\n[3/3] Revoke mint + freeze -> null…')
await runProposal(3n, [
  createSetAuthorityInstruction(mint, vault0, AuthorityType.MintTokens, null),
  createSetAuthorityInstruction(mint, vault0, AuthorityType.FreezeAccount, null),
])

const mintInfo = await retry(() => getMint(conn, mint))
const acct = await retry(() => getAccount(conn, ata))
const md = await retry(() => fetchMetadata(umi, metadataPda))
const clean = (s) => s.replace(/\0/g, '').trim()
console.log('\n=== Result ===')
console.log(`mint:             ${mint.toBase58()}`)
console.log(`supply:           ${mintInfo.supply}  (expected ${SUPPLY})`)
console.log(`vault ATA amount: ${acct.amount}`)
console.log(`metadata:         ${clean(md.name)} / ${clean(md.symbol)}  (update authority ${md.updateAuthority})`)
console.log(`mint authority:   ${mintInfo.mintAuthority?.toBase58() ?? 'null'}`)
console.log(`freeze authority: ${mintInfo.freezeAuthority?.toBase58() ?? 'null'}`)
const ok = mintInfo.supply === SUPPLY && acct.amount === SUPPLY &&
  !mintInfo.mintAuthority && !mintInfo.freezeAuthority &&
  clean(md.symbol) === 'KYRT' && md.updateAuthority === umiVault
console.log(ok ? '\n✅ Full deploy via proposals works on devnet (create+metadata → mint → revoke, all 2-of-2).' : '\n❌ Mismatch, check above.')
