import 'dotenv/config'

export type Cluster = 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet'

/** Immutable parameters of the KYRT token. */
export const TOKEN = {
  name: 'Kerythos AI',
  symbol: 'KYRT',
  decimals: 9,
  /** Total supply in whole units (before applying decimals). */
  totalSupply: 1_000_000_000n,
} as const

export const CLUSTER = (process.env.SOLANA_CLUSTER ?? 'devnet') as Cluster
export const RPC_URL = process.env.SOLANA_RPC_URL?.trim() || undefined
export const TREASURY_KEYPAIR_PATH =
  process.env.TREASURY_KEYPAIR_PATH?.trim() || '.keys/treasury.json'
export const KYRT_MINT_ADDRESS = process.env.KYRT_MINT_ADDRESS?.trim() || ''
export const KYRT_METADATA_URI = process.env.KYRT_METADATA_URI?.trim() || ''

/** Supply in base units (with decimals applied), used on-chain. */
export const RAW_SUPPLY = TOKEN.totalSupply * 10n ** BigInt(TOKEN.decimals)

// --- Genesis distribution (used by `npm run distribute`) ---
// Liquidity fair launch + community Rewards pool. Liquidity gets the remainder
// after the Rewards pool. On mainnet both wallets are required; on devnet the
// distribute script falls back to ephemeral test addresses. See docs/MAINNET.md.

/** Liquidity wallet (the ~85% that seeds the pool). */
export const KYRT_LIQUIDITY_WALLET = process.env.KYRT_LIQUIDITY_WALLET?.trim() || ''
/** Community Rewards pool wallet, a Squads multisig on mainnet. */
export const KYRT_REWARDS_WALLET = process.env.KYRT_REWARDS_WALLET?.trim() || ''
/** Rewards pool share (%). Liquidity receives the remaining (100 minus this). */
export const KYRT_REWARDS_PCT = Number(process.env.KYRT_REWARDS_PCT ?? '15')

// --- Squads (Option A) deploy via proposals ---
// The mainnet deploy is created as Squads proposals signed by the Tangem
// members. See docs/MAINNET.md and `npm run deploy:squads`.

/** Squads v4 multisig (config account) that owns the mint authority. */
export const KYRT_SQUADS_MULTISIG = process.env.KYRT_SQUADS_MULTISIG?.trim() || ''
/** Vault index whose ATA receives the genesis supply (default 0). */
export const KYRT_SQUADS_VAULT_INDEX = Number(process.env.KYRT_SQUADS_VAULT_INDEX ?? '0')
/** Proposer key that queues the proposals (member with Initiate permission). */
export const PROPOSER_KEYPAIR_PATH =
  process.env.PROPOSER_KEYPAIR_PATH?.trim() || '.keys/proposer.json'
