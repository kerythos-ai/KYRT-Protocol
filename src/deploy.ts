import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getConnection } from './lib/connection'
import { getTreasuryKeypair } from './lib/keypair'
import { appendEnv } from './lib/env'
import { createKyrtMint, mintFullSupply, revokeAuthorities } from './actions'
import { CLUSTER, TOKEN } from './config'

/**
 * Deploy completo do KYRT, fim-a-fim:
 *   1) cria mint + metadados   2) minta supply total   3) revoga authorities
 */
async function main(): Promise<void> {
  const treasury = getTreasuryKeypair()
  const connection = getConnection()

  console.log(`🚀 Deploy do $${TOKEN.symbol} em ${CLUSTER}`)
  console.log(`   Treasury: ${treasury.publicKey.toBase58()}`)

  const balance = await connection.getBalance(treasury.publicKey)
  console.log(`   Saldo: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`)
  if (balance === 0) {
    throw new Error(
      CLUSTER === 'mainnet-beta'
        ? 'Treasury sem SOL. Financie a wallet antes do deploy.'
        : 'Treasury sem SOL. Rode `npm run airdrop` primeiro.',
    )
  }

  console.log('1/3 · Criando mint + metadados...')
  const mint = await createKyrtMint(treasury)
  appendEnv('KYRT_MINT_ADDRESS', mint)
  console.log(`      Mint: ${mint}`)

  console.log('2/3 · Mintando supply total...')
  await mintFullSupply(treasury, mint)
  console.log(`      ${TOKEN.totalSupply.toLocaleString('pt-BR')} ${TOKEN.symbol} → treasury`)

  console.log('3/3 · Revogando authorities (supply fixo)...')
  await revokeAuthorities(treasury, mint)
  console.log('      🔒 mint & freeze authority → null')

  console.log('\n✅ Deploy completo! Detalhes: npm run info')
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
