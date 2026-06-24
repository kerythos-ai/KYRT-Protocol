import { PublicKey, type Keypair } from '@solana/web3.js'
import {
  AuthorityType,
  burn,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  type Mint,
} from '@solana/spl-token'
import { generateSigner, percentAmount } from '@metaplex-foundation/umi'
import { createFungible } from '@metaplex-foundation/mpl-token-metadata'
import { getConnection } from './lib/connection'
import { getUmi } from './lib/umi'
import { KYRT_METADATA_URI, RAW_SUPPLY, TOKEN } from './config'

/**
 * Creates the KYRT mint (classic SPL Token) with Metaplex metadata included.
 * The mint and freeze authorities stay with the treasury for now.
 * @returns base58 address of the created mint.
 */
export async function createKyrtMint(treasury: Keypair): Promise<string> {
  const umi = getUmi(treasury)
  const mint = generateSigner(umi)

  await createFungible(umi, {
    mint,
    name: TOKEN.name,
    symbol: TOKEN.symbol,
    uri: KYRT_METADATA_URI,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: TOKEN.decimals,
  }).sendAndConfirm(umi)

  return mint.publicKey.toString()
}

/** Mints the full KYRT supply to the treasury's ATA. @returns the tx signature. */
export async function mintFullSupply(treasury: Keypair, mintAddress: string): Promise<string> {
  const connection = getConnection()
  const mint = new PublicKey(mintAddress)
  const ata = await getOrCreateAssociatedTokenAccount(connection, treasury, mint, treasury.publicKey)
  return mintTo(connection, treasury, mint, ata.address, treasury, RAW_SUPPLY)
}

/**
 * Revokes the mint authorities (→ null), making the supply immutable.
 * Idempotent: skips authorities that are already revoked.
 */
export async function revokeAuthorities(treasury: Keypair, mintAddress: string): Promise<void> {
  const connection = getConnection()
  const mint = new PublicKey(mintAddress)
  const info = await getMint(connection, mint)

  if (info.mintAuthority) {
    await setAuthority(connection, treasury, mint, treasury, AuthorityType.MintTokens, null)
  }
  if (info.freezeAuthority) {
    await setAuthority(connection, treasury, mint, treasury, AuthorityType.FreezeAccount, null)
  }
}

/** Burns `amountWhole` KYRT (whole units) from the treasury's ATA. @returns the signature. */
export async function burnKyrt(
  treasury: Keypair,
  mintAddress: string,
  amountWhole: bigint,
): Promise<string> {
  const connection = getConnection()
  const mint = new PublicKey(mintAddress)
  const ata = await getAssociatedTokenAddress(mint, treasury.publicKey)
  const raw = amountWhole * 10n ** BigInt(TOKEN.decimals)
  return burn(connection, treasury, ata, mint, treasury, raw)
}

/** Reads the on-chain state of the mint. */
export async function readMint(mintAddress: string): Promise<Mint> {
  return getMint(getConnection(), new PublicKey(mintAddress))
}

/**
 * Mints `rawAmount` base units to `owner`'s ATA (created if it doesn't exist).
 * Set `allowOwnerOffCurve` when the owner is a PDA (e.g. a Squads multisig vault).
 * @returns the tx signature.
 */
export async function mintToWallet(
  treasury: Keypair,
  mintAddress: string,
  owner: string,
  rawAmount: bigint,
  allowOwnerOffCurve = false,
): Promise<string> {
  const connection = getConnection()
  const mint = new PublicKey(mintAddress)
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    treasury,
    mint,
    new PublicKey(owner),
    allowOwnerOffCurve,
  )
  return mintTo(connection, treasury, mint, ata.address, treasury, rawAmount)
}

/** Reads `owner`'s token balance (base units) for the mint; 0n if the ATA doesn't exist. */
export async function getOwnerBalanceRaw(mintAddress: string, owner: string): Promise<bigint> {
  const mint = new PublicKey(mintAddress)
  const ata = await getAssociatedTokenAddress(mint, new PublicKey(owner), true)
  try {
    return (await getAccount(getConnection(), ata)).amount
  } catch {
    return 0n
  }
}
