import { fileURLToPath } from 'node:url'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
} from '@solana/web3.js'
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  AuthorityType,
  getMinimumBalanceForRentExemptMint,
  createInitializeMint2Instruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
} from '@solana/spl-token'
import * as multisig from '@sqds/multisig'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createNoopSigner, none } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey, toWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters'
import { mplTokenMetadata, createMetadataAccountV3, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'
import { getConnection, getRpcUrl } from './lib/connection'
import { loadOrCreateKeypair } from './lib/keypair'
import {
  CLUSTER,
  KYRT_METADATA_URI,
  KYRT_SQUADS_MULTISIG,
  KYRT_SQUADS_VAULT_INDEX,
  PROPOSER_KEYPAIR_PATH,
  RAW_SUPPLY,
  TOKEN,
} from './config'

export type ProposeOptions = {
  connection: Connection
  rpcUrl: string
  multisigPda: PublicKey
  vaultIndex: number
  /** Member with Initiate permission; pays the proposal/transaction rent. */
  proposer: Keypair
  metadataUri: string
}

export type ProposeResult = {
  mint: PublicKey
  vault: PublicKey
  indices: { create: bigint; mint: bigint; revoke: bigint }
}

/**
 * Queues the genesis deploy as three Squads proposals (NO approve/execute):
 *   1) create mint + Metaplex metadata (authorities = the vault)
 *   2) mint the full supply to the vault's ATA
 *   3) revoke the mint + freeze authorities
 * The multisig members (Tangem) then approve and execute, in order, in the app.
 */
export async function proposeDeployment(opts: ProposeOptions): Promise<ProposeResult> {
  const { connection, rpcUrl, multisigPda, vaultIndex, proposer, metadataUri } = opts

  // Each step depends on the previous being on-chain, so confirm between calls.
  // Light 429 retry keeps it robust on any RPC.
  const withRetry = async <T>(fn: () => Promise<T>, tries = 8): Promise<T> => {
    for (let i = 0; ; i++) {
      try { return await fn() }
      catch (e) {
        if (i < tries - 1 && /429|Too Many Requests/.test(String(e))) { await new Promise((r) => setTimeout(r, 800 * (i + 1))); continue }
        throw e
      }
    }
  }

  const ms = await withRetry(() => multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda))
  const start = BigInt(ms.transactionIndex.toString())
  const idx = { create: start + 1n, mint: start + 2n, revoke: start + 3n }

  const [vault] = multisig.getVaultPda({ multisigPda, index: vaultIndex })
  const [createTxPda] = multisig.getTransactionPda({ multisigPda, index: idx.create })
  const [mint] = multisig.getEphemeralSignerPda({ transactionPda: createTxPda, ephemeralSignerIndex: 0 })

  // Metaplex metadata instruction (update authority = vault), umi -> web3.
  const umi = createUmi(rpcUrl).use(mplTokenMetadata())
  const umiVault = fromWeb3JsPublicKey(vault)
  const metadataIxs = createMetadataAccountV3(umi, {
    metadata: findMetadataPda(umi, { mint: fromWeb3JsPublicKey(mint) }),
    mint: fromWeb3JsPublicKey(mint),
    mintAuthority: createNoopSigner(umiVault),
    payer: createNoopSigner(umiVault),
    updateAuthority: umiVault,
    data: {
      name: TOKEN.name,
      symbol: TOKEN.symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: 0,
      creators: none(),
      collection: none(),
      uses: none(),
    },
    isMutable: true,
    collectionDetails: none(),
  }).getInstructions().map(toWeb3JsInstruction)

  const rent = await withRetry(() => getMinimumBalanceForRentExemptMint(connection))
  const ata = getAssociatedTokenAddressSync(mint, vault, true)

  const queue = async (transactionIndex: bigint, instructions: any[], ephemeralSigners: number) => {
    const { blockhash } = await withRetry(() => connection.getLatestBlockhash())
    const transactionMessage = new TransactionMessage({ payerKey: vault, recentBlockhash: blockhash, instructions })
    const createSig = await multisig.rpc.vaultTransactionCreate({
      connection, feePayer: proposer, multisigPda, transactionIndex,
      creator: proposer.publicKey, vaultIndex, ephemeralSigners, transactionMessage, signers: [proposer],
    })
    await withRetry(() => connection.confirmTransaction(createSig, 'confirmed'))
    const proposalSig = await multisig.rpc.proposalCreate({ connection, feePayer: proposer, creator: proposer, multisigPda, transactionIndex })
    await withRetry(() => connection.confirmTransaction(proposalSig, 'confirmed'))
  }

  await queue(idx.create, [
    SystemProgram.createAccount({ fromPubkey: vault, newAccountPubkey: mint, space: MINT_SIZE, lamports: rent, programId: TOKEN_PROGRAM_ID }),
    createInitializeMint2Instruction(mint, TOKEN.decimals, vault, vault, TOKEN_PROGRAM_ID),
    ...metadataIxs,
  ], 1)

  await queue(idx.mint, [
    createAssociatedTokenAccountIdempotentInstruction(vault, ata, vault, mint),
    createMintToInstruction(mint, ata, vault, RAW_SUPPLY),
  ], 0)

  await queue(idx.revoke, [
    createSetAuthorityInstruction(mint, vault, AuthorityType.MintTokens, null),
    createSetAuthorityInstruction(mint, vault, AuthorityType.FreezeAccount, null),
  ], 0)

  return { mint, vault, indices: idx }
}

async function main(): Promise<void> {
  if (!KYRT_SQUADS_MULTISIG) throw new Error('KYRT_SQUADS_MULTISIG is empty. Set the Squads multisig in .env.')
  if (CLUSTER !== 'mainnet-beta') console.log(`⚠️  Cluster is "${CLUSTER}" (not mainnet-beta).`)
  if (!KYRT_METADATA_URI) console.log('⚠️  KYRT_METADATA_URI is empty, the token will have no metadata JSON.')

  const connection = getConnection()
  const multisigPda = new PublicKey(KYRT_SQUADS_MULTISIG)
  const proposer = loadOrCreateKeypair(PROPOSER_KEYPAIR_PATH)

  const ms = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda)
  const isMember = ms.members.some((m) => m.key.equals(proposer.publicKey))
  if (!isMember) {
    console.log(`Proposer ${proposer.publicKey.toBase58()} is NOT a member of the Squad.`)
    console.log('→ Add it to your Squad with the Proposer permission, fund it with ~0.05 SOL, then re-run.')
    return
  }
  const balance = await connection.getBalance(proposer.publicKey)
  if (balance < 0.03 * LAMPORTS_PER_SOL) {
    console.log(`Proposer ${proposer.publicKey.toBase58()} has ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL.`)
    console.log('→ Fund it with ~0.05 SOL (it pays the proposal account rent), then re-run.')
    return
  }

  console.log(`🚀 Queuing $${TOKEN.symbol} deploy proposals on ${CLUSTER}`)
  console.log(`   Multisig: ${multisigPda.toBase58()}`)
  console.log(`   Proposer: ${proposer.publicKey.toBase58()} (${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL)`)

  const res = await proposeDeployment({
    connection, rpcUrl: getRpcUrl(), multisigPda, vaultIndex: KYRT_SQUADS_VAULT_INDEX, proposer, metadataUri: KYRT_METADATA_URI,
  })

  const [vaultShown] = [res.vault.toBase58()]
  console.log('\n✅ Three proposals queued (pending your signatures):')
  console.log(`   #${res.indices.create}  Create mint + metadata`)
  console.log(`   #${res.indices.mint}  Mint ${TOKEN.totalSupply.toLocaleString('en-US')} ${TOKEN.symbol} -> vault`)
  console.log(`   #${res.indices.revoke}  Revoke mint + freeze authority`)
  console.log(`\n   Mint will be: ${res.mint.toBase58()}`)
  console.log(`   Vault (holds supply): ${vaultShown}`)
  console.log('\n   Next: open Squads, approve EACH with both Tangem (2-of-2), and EXECUTE IN ORDER:')
  console.log(`   ${res.indices.create} (create) -> ${res.indices.mint} (mint) -> ${res.indices.revoke} (revoke).`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error('❌', e instanceof Error ? e.message : e)
    process.exit(1)
  })
}
