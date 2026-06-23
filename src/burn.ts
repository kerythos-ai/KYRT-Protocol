import { getTreasuryKeypair } from './lib/keypair'
import { burnKyrt, readMint } from './actions'
import { KYRT_MINT_ADDRESS, TOKEN } from './config'

const AMOUNT = BigInt(process.argv[2] ?? '0') // quantidade em KYRT (unidades inteiras)

async function main(): Promise<void> {
  if (!KYRT_MINT_ADDRESS) {
    throw new Error('KYRT_MINT_ADDRESS vazio. Rode `npm run create` primeiro.')
  }
  if (AMOUNT <= 0n) {
    throw new Error('Uso: npm run burn -- <quantidade em KYRT>  (ex.: npm run burn -- 1000)')
  }
  const treasury = getTreasuryKeypair()

  console.log(`🔥 Queimando ${AMOUNT.toLocaleString('pt-BR')} ${TOKEN.symbol}...`)
  const sig = await burnKyrt(treasury, KYRT_MINT_ADDRESS, AMOUNT)
  console.log(`✅ Queimado. Tx: ${sig}`)

  const info = await readMint(KYRT_MINT_ADDRESS)
  console.log(`   Novo supply (raw): ${info.supply}`)
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
