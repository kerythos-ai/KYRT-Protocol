import { PublicKey, type Keypair } from '@solana/web3.js'
import {
  AuthorityType,
  burn,
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
 * Cria o mint do KYRT (SPL Token clássico) já com metadados Metaplex.
 * A mint e a freeze authority ficam, por ora, com a treasury.
 * @returns endereço (base58) do mint criado.
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

/** Minta o supply total do KYRT para a ATA da treasury. @returns assinatura da tx. */
export async function mintFullSupply(treasury: Keypair, mintAddress: string): Promise<string> {
  const connection = getConnection()
  const mint = new PublicKey(mintAddress)
  const ata = await getOrCreateAssociatedTokenAccount(connection, treasury, mint, treasury.publicKey)
  return mintTo(connection, treasury, mint, ata.address, treasury, RAW_SUPPLY)
}

/**
 * Revoga as authorities do mint (→ null), tornando o supply imutável.
 * Idempotente: ignora authorities já revogadas.
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

/** Queima `amountWhole` KYRT (unidades inteiras) da ATA da treasury. @returns assinatura. */
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

/** Lê o estado on-chain do mint. */
export async function readMint(mintAddress: string): Promise<Mint> {
  return getMint(getConnection(), new PublicKey(mintAddress))
}
