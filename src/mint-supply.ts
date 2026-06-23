import { getTreasuryKeypair } from './lib/keypair'
import { mintFullSupply, readMint } from './actions'
import { KYRT_MINT_ADDRESS, TOKEN } from './config'

async function main(): Promise<void> {
  if (!KYRT_MINT_ADDRESS) {
    throw new Error('KYRT_MINT_ADDRESS vazio. Rode `npm run create` primeiro.')
  }
  const treasury = getTreasuryKeypair()

  console.log(`Mintando ${TOKEN.totalSupply.toLocaleString('pt-BR')} ${TOKEN.symbol} para a treasury...`)
  const sig = await mintFullSupply(treasury, KYRT_MINT_ADDRESS)
  console.log(`✅ Supply mintado. Tx: ${sig}`)

  const info = await readMint(KYRT_MINT_ADDRESS)
  console.log(`   Supply on-chain (raw): ${info.supply}`)
  console.log('   Próximo passo: npm run revoke (torna o supply fixo)')
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
