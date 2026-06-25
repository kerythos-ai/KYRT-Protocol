import { fileURLToPath } from 'node:url'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionMessage,
} from '@solana/web3.js'
import * as multisig from '@sqds/multisig'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createNoopSigner, signerIdentity, some } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey, toWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters'
import { mplTokenMetadata, fetchMetadata, findMetadataPda, updateV1 } from '@metaplex-foundation/mpl-token-metadata'
import { getConnection, getRpcUrl } from './lib/connection'
import { loadOrCreateKeypair } from './lib/keypair'
import {
  CLUSTER,
  KYRT_METADATA_URI,
  KYRT_MINT_ADDRESS,
  KYRT_SQUADS_MULTISIG,
  KYRT_SQUADS_VAULT_INDEX,
  PROPOSER_KEYPAIR_PATH,
} from './config'

export type ProposeUpdateOptions = {
  connection: Connection
  rpcUrl: string
  multisigPda: PublicKey
  vaultIndex: number
  /** Member with Initiate permission; pays the proposal/transaction rent. */
  proposer: Keypair
  mint: PublicKey
  /** New off-chain metadata JSON URI (Arweave). */
  metadataUri: string
}

const clean = (s: string): string => s.replace(/\0/g, '').trim()

/**
 * Queues ONE Squads proposal that updates the token's on-chain metadata URI
 * (pointing it at a new Arweave JSON, e.g. after a logo change). Name, symbol,
 * fees and creators are preserved; only the URI changes. The update is signed
 * by the vault (the metadata update authority), so the multisig members (Tangem)
 * approve and execute it in the Squads app. NO approve/execute here.
 */
export async function proposeMetadataUpdate(opts: ProposeUpdateOptions): Promise<bigint> {
  const { connection, rpcUrl, multisigPda, vaultIndex, proposer, mint, metadataUri } = opts

  const withRetry = async <T>(fn: () => Promise<T>, tries = 8): Promise<T> => {
    for (let i = 0; ; i++) {
      try { return await fn() }
      catch (e) {
        if (i < tries - 1 && /429|Too Many Requests/.test(String(e))) { await new Promise((r) => setTimeout(r, 800 * (i + 1))); continue }
        throw e
      }
    }
  }

  const [vault] = multisig.getVaultPda({ multisigPda, index: vaultIndex })

  // Build the Token Metadata update (umi -> web3). Authority = the vault, signed
  // by Squads at execution time. Preserve current data, swap only the URI.
  const umi = createUmi(rpcUrl).use(mplTokenMetadata())
  const umiVault = fromWeb3JsPublicKey(vault)
  umi.use(signerIdentity(createNoopSigner(umiVault)))

  const umiMint = fromWeb3JsPublicKey(mint)
  const metadataPda = findMetadataPda(umi, { mint: umiMint })
  const current = await withRetry(() => fetchMetadata(umi, metadataPda))

  if (clean(current.updateAuthority) !== vault.toBase58()) {
    throw new Error(
      `Update authority on-chain is ${clean(current.updateAuthority)}, not the vault ${vault.toBase58()}. ` +
      'This multisig cannot update the metadata.',
    )
  }
  if (clean(current.uri) === clean(metadataUri)) {
    throw new Error(`On-chain URI already equals ${metadataUri}. Nothing to update.`)
  }

  const updateIxs = updateV1(umi, {
    mint: umiMint,
    authority: createNoopSigner(umiVault),
    data: some({
      name: current.name,
      symbol: current.symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: current.sellerFeeBasisPoints,
      creators: current.creators,
    }),
  }).getInstructions().map(toWeb3JsInstruction)

  const ms = await withRetry(() => multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda))
  const transactionIndex = BigInt(ms.transactionIndex.toString()) + 1n

  const { blockhash } = await withRetry(() => connection.getLatestBlockhash())
  const transactionMessage = new TransactionMessage({ payerKey: vault, recentBlockhash: blockhash, instructions: updateIxs })

  const createSig = await multisig.rpc.vaultTransactionCreate({
    connection, feePayer: proposer, multisigPda, transactionIndex,
    creator: proposer.publicKey, vaultIndex, ephemeralSigners: 0, transactionMessage, signers: [proposer],
  })
  await withRetry(() => connection.confirmTransaction(createSig, 'confirmed'))

  const proposalSig = await multisig.rpc.proposalCreate({ connection, feePayer: proposer, creator: proposer, multisigPda, transactionIndex })
  await withRetry(() => connection.confirmTransaction(proposalSig, 'confirmed'))

  return transactionIndex
}

async function main(): Promise<void> {
  if (!KYRT_SQUADS_MULTISIG) throw new Error('KYRT_SQUADS_MULTISIG is empty. Set the Squads multisig in .env.')
  if (!KYRT_MINT_ADDRESS) throw new Error('KYRT_MINT_ADDRESS is empty. Set the mint in .env.')
  if (!KYRT_METADATA_URI) throw new Error('KYRT_METADATA_URI is empty. Upload the new metadata JSON first (scripts/upload-metadata.mjs).')
  if (CLUSTER !== 'mainnet-beta') console.log(`⚠️  Cluster is "${CLUSTER}" (not mainnet-beta).`)

  const connection = getConnection()
  const multisigPda = new PublicKey(KYRT_SQUADS_MULTISIG)
  const mint = new PublicKey(KYRT_MINT_ADDRESS)
  const proposer = loadOrCreateKeypair(PROPOSER_KEYPAIR_PATH)

  const ms = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda)
  const isMember = ms.members.some((m) => m.key.equals(proposer.publicKey))
  if (!isMember) {
    console.log(`Proposer ${proposer.publicKey.toBase58()} is NOT a member of the Squad.`)
    console.log('→ Add it to your Squad with the Proposer permission, fund it with ~0.03 SOL, then re-run.')
    return
  }
  const balance = await connection.getBalance(proposer.publicKey)
  if (balance < 0.02 * LAMPORTS_PER_SOL) {
    console.log(`Proposer ${proposer.publicKey.toBase58()} has ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL.`)
    console.log('→ Fund it with ~0.03 SOL (it pays the proposal account rent), then re-run.')
    return
  }

  console.log(`🚀 Queuing $KYRT metadata update on ${CLUSTER}`)
  console.log(`   Multisig: ${multisigPda.toBase58()}`)
  console.log(`   Mint:     ${mint.toBase58()}`)
  console.log(`   New URI:  ${KYRT_METADATA_URI}`)

  const index = await proposeMetadataUpdate({
    connection, rpcUrl: getRpcUrl(), multisigPda, vaultIndex: KYRT_SQUADS_VAULT_INDEX, proposer, mint, metadataUri: KYRT_METADATA_URI,
  })

  console.log(`\n✅ Proposal #${index} queued (pending your signature).`)
  console.log('   Next: open Squads, approve and EXECUTE it with your Tangem.')
  console.log('   Then verify with: node scripts/check-metadata.mjs')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error('❌', e instanceof Error ? e.message : e)
    process.exit(1)
  })
}
