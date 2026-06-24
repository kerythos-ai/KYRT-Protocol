import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getConnection } from './lib/connection'
import { getTreasuryKeypair } from './lib/keypair'
import { appendEnv } from './lib/env'
import { createKyrtMint, mintFullSupply, revokeAuthorities } from './actions'
import { CLUSTER, TOKEN } from './config'

/**
 * Full end-to-end KYRT deploy:
 *   1) create mint + metadata   2) mint full supply   3) revoke authorities
 */
async function main(): Promise<void> {
  const treasury = getTreasuryKeypair()
  const connection = getConnection()

  console.log(`🚀 Deploying $${TOKEN.symbol} on ${CLUSTER}`)
  console.log(`   Treasury: ${treasury.publicKey.toBase58()}`)

  const balance = await connection.getBalance(treasury.publicKey)
  console.log(`   Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`)
  if (balance === 0) {
    throw new Error(
      CLUSTER === 'mainnet-beta'
        ? 'Treasury has no SOL. Fund the wallet before deploying.'
        : 'Treasury has no SOL. Run `npm run airdrop` first.',
    )
  }

  console.log('1/3 · Creating mint + metadata...')
  const mint = await createKyrtMint(treasury)
  appendEnv('KYRT_MINT_ADDRESS', mint)
  console.log(`      Mint: ${mint}`)

  console.log('2/3 · Minting full supply...')
  await mintFullSupply(treasury, mint)
  console.log(`      ${TOKEN.totalSupply.toLocaleString('en-US')} ${TOKEN.symbol} → treasury`)

  console.log('3/3 · Revoking authorities (fixed supply)...')
  await revokeAuthorities(treasury, mint)
  console.log('      🔒 mint & freeze authority → null')

  console.log('\n✅ Deploy complete! Details: npm run info')
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
