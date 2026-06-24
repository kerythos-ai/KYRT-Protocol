import { getTreasuryKeypair } from './lib/keypair'
import { mintFullSupply, readMint } from './actions'
import { KYRT_MINT_ADDRESS, TOKEN } from './config'

async function main(): Promise<void> {
  if (!KYRT_MINT_ADDRESS) {
    throw new Error('KYRT_MINT_ADDRESS is empty. Run `npm run create` first.')
  }
  const treasury = getTreasuryKeypair()

  console.log(`Minting ${TOKEN.totalSupply.toLocaleString('en-US')} ${TOKEN.symbol} to the treasury...`)
  const sig = await mintFullSupply(treasury, KYRT_MINT_ADDRESS)
  console.log(`✅ Supply minted. Tx: ${sig}`)

  const info = await readMint(KYRT_MINT_ADDRESS)
  console.log(`   On-chain supply (raw): ${info.supply}`)
  console.log('   Next step: npm run revoke (makes the supply fixed)')
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
