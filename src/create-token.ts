import { getTreasuryKeypair } from './lib/keypair'
import { appendEnv } from './lib/env'
import { createKyrtMint } from './actions'
import { KYRT_METADATA_URI, TOKEN } from './config'

async function main(): Promise<void> {
  const treasury = getTreasuryKeypair()
  console.log(`Criando mint do $${TOKEN.symbol}...`)
  console.log(`  Treasury/authority: ${treasury.publicKey.toBase58()}`)
  if (!KYRT_METADATA_URI) {
    console.log('  ⚠️  KYRT_METADATA_URI vazio — token sem imagem/JSON. Defina depois em produção.')
  }

  const mint = await createKyrtMint(treasury)
  appendEnv('KYRT_MINT_ADDRESS', mint)

  console.log(`✅ Mint do ${TOKEN.symbol}: ${mint}`)
  console.log('   Gravado em .env (KYRT_MINT_ADDRESS).')
  console.log('   Próximo passo: npm run mint')
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
