import { getTreasuryKeypair } from './lib/keypair'
import { burnKyrt, readMint } from './actions'
import { KYRT_MINT_ADDRESS, TOKEN } from './config'

const AMOUNT = BigInt(process.argv[2] ?? '0') // amount in KYRT (whole units)

async function main(): Promise<void> {
  if (!KYRT_MINT_ADDRESS) {
    throw new Error('KYRT_MINT_ADDRESS is empty. Run `npm run create` first.')
  }
  if (AMOUNT <= 0n) {
    throw new Error('Usage: npm run burn -- <amount in KYRT>  (e.g., npm run burn -- 1000)')
  }
  const treasury = getTreasuryKeypair()

  console.log(`🔥 Burning ${AMOUNT.toLocaleString('en-US')} ${TOKEN.symbol}...`)
  const sig = await burnKyrt(treasury, KYRT_MINT_ADDRESS, AMOUNT)
  console.log(`✅ Burned. Tx: ${sig}`)

  const info = await readMint(KYRT_MINT_ADDRESS)
  console.log(`   New supply (raw): ${info.supply}`)
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
