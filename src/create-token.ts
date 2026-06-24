import { getTreasuryKeypair } from './lib/keypair'
import { appendEnv } from './lib/env'
import { createKyrtMint } from './actions'
import { KYRT_METADATA_URI, TOKEN } from './config'

async function main(): Promise<void> {
  const treasury = getTreasuryKeypair()
  console.log(`Creating the $${TOKEN.symbol} mint...`)
  console.log(`  Treasury/authority: ${treasury.publicKey.toBase58()}`)
  if (!KYRT_METADATA_URI) {
    console.log('  ⚠️  KYRT_METADATA_URI is empty, token has no image/JSON. Set it later for production.')
  }

  const mint = await createKyrtMint(treasury)
  appendEnv('KYRT_MINT_ADDRESS', mint)

  console.log(`✅ ${TOKEN.symbol} mint: ${mint}`)
  console.log('   Saved to .env (KYRT_MINT_ADDRESS).')
  console.log('   Next step: npm run mint')
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
