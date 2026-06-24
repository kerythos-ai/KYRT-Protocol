import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getConnection } from './lib/connection'
import { getTreasuryKeypair } from './lib/keypair'
import { CLUSTER } from './config'

const AMOUNT_SOL = Number(process.argv[2] ?? 2)
const MAX_RETRIES = 5

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function main(): Promise<void> {
  if (CLUSTER === 'mainnet-beta') {
    throw new Error('Airdrop is not available on mainnet-beta. Fund the treasury manually.')
  }
  const connection = getConnection()
  const treasury = getTreasuryKeypair()

  console.log(`Treasury: ${treasury.publicKey.toBase58()}`)
  const before = await connection.getBalance(treasury.publicKey)
  console.log(`Current balance: ${(before / LAMPORTS_PER_SOL).toFixed(4)} SOL`)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Airdropping ${AMOUNT_SOL} SOL on ${CLUSTER} (attempt ${attempt}/${MAX_RETRIES})...`)
      const sig = await connection.requestAirdrop(treasury.publicKey, AMOUNT_SOL * LAMPORTS_PER_SOL)
      await connection.confirmTransaction(sig, 'confirmed')
      const after = await connection.getBalance(treasury.publicKey)
      console.log(`✅ Airdrop confirmed. New balance: ${(after / LAMPORTS_PER_SOL).toFixed(4)} SOL`)
      console.log(`   Tx: ${sig}`)
      return
    } catch (e) {
      console.log(`   ⚠️  Failed: ${e instanceof Error ? e.message : e}`)
      if (attempt < MAX_RETRIES) await sleep(attempt * 2000)
    }
  }

  console.error('❌ Airdrop failed after several attempts, the public devnet faucet is rate-limited.')
  console.error('   Alternatives:')
  console.error('   • Retry in a few minutes: npm run airdrop')
  console.error(`   • Web faucet: https://faucet.solana.com  (paste: ${treasury.publicKey.toBase58()})`)
  console.error('   • Use an RPC with a faucet (e.g., Helius) in SOLANA_RPC_URL')
  process.exit(1)
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
