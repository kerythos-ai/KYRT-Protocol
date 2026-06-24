import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { getConnection } from './lib/connection'
import { getTreasuryKeypair } from './lib/keypair'
import { getOwnerBalanceRaw, mintToWallet, readMint } from './actions'
import {
  CLUSTER,
  KYRT_LIQUIDITY_WALLET,
  KYRT_MINT_ADDRESS,
  KYRT_REWARDS_PCT,
  KYRT_REWARDS_WALLET,
  RAW_SUPPLY,
  TOKEN,
} from './config'

/**
 * Genesis distribution for mainnet: mints the full supply into the
 * liquidity wallet (~85%) and the community Rewards pool (15%) BEFORE the
 * mint authority is revoked. Runs after `npm run create`, before `npm run revoke`.
 *
 * On devnet, missing wallets are replaced by ephemeral test addresses so the
 * full create → distribute → revoke flow can be rehearsed end-to-end.
 */

type Bucket = {
  name: string
  owner: string
  raw: bigint
  /** ATAs for PDA owners (e.g. a Squads vault) need this. */
  allowOffCurve: boolean
  ephemeral: boolean
}

const fmt = (raw: bigint): string =>
  (raw / 10n ** BigInt(TOKEN.decimals)).toLocaleString('en-US')

async function main(): Promise<void> {
  if (!KYRT_MINT_ADDRESS) {
    throw new Error('KYRT_MINT_ADDRESS is empty. Run `npm run create` first.')
  }

  const isMainnet = CLUSTER === 'mainnet-beta'
  const connection = getConnection()
  const treasury = getTreasuryKeypair()

  // The treasury pays rent for the ATAs and is the mint authority.
  const lamports = await connection.getBalance(treasury.publicKey)
  if (lamports === 0) {
    throw new Error(
      isMainnet
        ? 'Treasury has no SOL. Fund the wallet before distributing.'
        : 'Treasury has no SOL. Run `npm run airdrop` first.',
    )
  }

  // Safety: distribution must run on a freshly created mint, never mint twice.
  const before = await readMint(KYRT_MINT_ADDRESS)
  if (before.supply !== 0n) {
    throw new Error(
      `Mint already has supply ${before.supply} (raw). Distribution runs only on a fresh mint, aborting to avoid double-minting.`,
    )
  }
  if (!before.mintAuthority) {
    throw new Error('Mint authority is already revoked, cannot mint. Aborting.')
  }
  if (!before.mintAuthority.equals(treasury.publicKey)) {
    throw new Error(
      `Treasury ${treasury.publicKey.toBase58()} is not the mint authority (${before.mintAuthority.toBase58()}).`,
    )
  }

  // Percentages → exact base-unit amounts. Rewards is computed first (basis
  // points, so fractional %s work); liquidity takes the remainder so the sum
  // is always exactly RAW_SUPPLY.
  const rewardsPct = KYRT_REWARDS_PCT
  if (!Number.isFinite(rewardsPct) || rewardsPct <= 0 || rewardsPct >= 100) {
    throw new Error(`KYRT_REWARDS_PCT must be between 0 and 100 (got ${rewardsPct}).`)
  }
  const rewardsRaw = (RAW_SUPPLY * BigInt(Math.round(rewardsPct * 100))) / 10_000n
  const liquidityRaw = RAW_SUPPLY - rewardsRaw

  // Resolve destination wallets (env on mainnet; ephemeral fallback on devnet).
  const resolve = (addr: string, label: string): { owner: string; ephemeral: boolean } => {
    if (addr) {
      new PublicKey(addr) // throws if malformed
      return { owner: addr, ephemeral: false }
    }
    if (isMainnet) {
      throw new Error(`${label} is required on mainnet-beta. Set it in .env.`)
    }
    return { owner: Keypair.generate().publicKey.toBase58(), ephemeral: true }
  }

  const liq = resolve(KYRT_LIQUIDITY_WALLET, 'KYRT_LIQUIDITY_WALLET')
  const rew = resolve(KYRT_REWARDS_WALLET, 'KYRT_REWARDS_WALLET')
  if (liq.owner === rew.owner) {
    throw new Error('Liquidity and Rewards wallets must be different addresses.')
  }

  const buckets: Bucket[] = [
    { name: `Liquidity (${100 - rewardsPct}%)`, owner: liq.owner, raw: liquidityRaw, allowOffCurve: false, ephemeral: liq.ephemeral },
    { name: `Rewards pool (${rewardsPct}%)`, owner: rew.owner, raw: rewardsRaw, allowOffCurve: true, ephemeral: rew.ephemeral },
  ]

  console.log(`🪙 Distributing $${TOKEN.symbol} on ${CLUSTER}`)
  console.log(`   Mint:     ${KYRT_MINT_ADDRESS}`)
  console.log(`   Treasury: ${treasury.publicKey.toBase58()} (${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL)`)
  console.log(`   Total:    ${fmt(RAW_SUPPLY)} ${TOKEN.symbol}\n`)

  if (buckets.some((b) => b.ephemeral)) {
    console.log('   ⚠️  Some wallets are EPHEMERAL devnet test addresses (not set in .env).')
    console.log('       Set KYRT_LIQUIDITY_WALLET / KYRT_REWARDS_WALLET for a realistic run.\n')
  }

  console.log('   Plan:')
  for (const b of buckets) {
    console.log(`     • ${b.name}: ${fmt(b.raw)} ${TOKEN.symbol} → ${b.owner}${b.ephemeral ? ' (ephemeral)' : ''}`)
  }
  console.log('')

  for (const b of buckets) {
    const sig = await mintToWallet(treasury, KYRT_MINT_ADDRESS, b.owner, b.raw, b.allowOffCurve)
    console.log(`   ✅ ${b.name}: minted. Tx: ${sig}`)
  }

  // Verify: each bucket holds exactly its share and the total equals RAW_SUPPLY.
  console.log('\n   Verifying...')
  let sum = 0n
  let allOk = true
  for (const b of buckets) {
    const bal = await getOwnerBalanceRaw(KYRT_MINT_ADDRESS, b.owner)
    sum += bal
    const ok = bal === b.raw
    allOk &&= ok
    console.log(`     ${ok ? '✓' : '✗'} ${b.name}: ${fmt(bal)} ${TOKEN.symbol}`)
  }
  const after = await readMint(KYRT_MINT_ADDRESS)
  console.log(`     on-chain supply: ${fmt(after.supply)} ${TOKEN.symbol}`)
  if (!allOk || sum !== RAW_SUPPLY || after.supply !== RAW_SUPPLY) {
    throw new Error('Verification failed: balances do not add up to the total supply.')
  }

  console.log('\n✅ Distribution complete. Next: npm run revoke (locks the supply).')
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
