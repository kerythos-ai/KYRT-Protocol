import 'dotenv/config'

export type Cluster = 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet'

/** Parâmetros imutáveis do token KYRT. */
export const TOKEN = {
  name: 'Kerythos AI',
  symbol: 'KYRT',
  decimals: 9,
  /** Supply total em unidades inteiras (antes de aplicar os decimais). */
  totalSupply: 1_000_000_000n,
} as const

export const CLUSTER = (process.env.SOLANA_CLUSTER ?? 'devnet') as Cluster
export const RPC_URL = process.env.SOLANA_RPC_URL?.trim() || undefined
export const TREASURY_KEYPAIR_PATH =
  process.env.TREASURY_KEYPAIR_PATH?.trim() || '.keys/treasury.json'
export const KYRT_MINT_ADDRESS = process.env.KYRT_MINT_ADDRESS?.trim() || ''
export const KYRT_METADATA_URI = process.env.KYRT_METADATA_URI?.trim() || ''

/** Supply em unidades-base (com os decimais aplicados) — usado on-chain. */
export const RAW_SUPPLY = TOKEN.totalSupply * 10n ** BigInt(TOKEN.decimals)
