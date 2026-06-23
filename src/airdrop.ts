import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getConnection } from './lib/connection'
import { getTreasuryKeypair } from './lib/keypair'
import { CLUSTER } from './config'

const AMOUNT_SOL = Number(process.argv[2] ?? 2)
const MAX_RETRIES = 5

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function main(): Promise<void> {
  if (CLUSTER === 'mainnet-beta') {
    throw new Error('Airdrop não existe em mainnet-beta. Financie a treasury manualmente.')
  }
  const connection = getConnection()
  const treasury = getTreasuryKeypair()

  console.log(`Treasury: ${treasury.publicKey.toBase58()}`)
  const before = await connection.getBalance(treasury.publicKey)
  console.log(`Saldo atual: ${(before / LAMPORTS_PER_SOL).toFixed(4)} SOL`)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Airdrop de ${AMOUNT_SOL} SOL em ${CLUSTER} (tentativa ${attempt}/${MAX_RETRIES})...`)
      const sig = await connection.requestAirdrop(treasury.publicKey, AMOUNT_SOL * LAMPORTS_PER_SOL)
      await connection.confirmTransaction(sig, 'confirmed')
      const after = await connection.getBalance(treasury.publicKey)
      console.log(`✅ Airdrop confirmado. Novo saldo: ${(after / LAMPORTS_PER_SOL).toFixed(4)} SOL`)
      console.log(`   Tx: ${sig}`)
      return
    } catch (e) {
      console.log(`   ⚠️  Falhou: ${e instanceof Error ? e.message : e}`)
      if (attempt < MAX_RETRIES) await sleep(attempt * 2000)
    }
  }

  console.error('❌ Airdrop falhou após várias tentativas — o faucet público de devnet tem rate-limit.')
  console.error('   Alternativas:')
  console.error('   • Repita em alguns minutos: npm run airdrop')
  console.error(`   • Faucet web: https://faucet.solana.com  (cole: ${treasury.publicKey.toBase58()})`)
  console.error('   • Use um RPC com faucet (ex.: Helius) em SOLANA_RPC_URL')
  process.exit(1)
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
