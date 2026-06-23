import { getTreasuryKeypair } from './lib/keypair'
import { readMint, revokeAuthorities } from './actions'
import { KYRT_MINT_ADDRESS, TOKEN } from './config'

async function main(): Promise<void> {
  if (!KYRT_MINT_ADDRESS) {
    throw new Error('KYRT_MINT_ADDRESS vazio. Rode `npm run create` primeiro.')
  }
  const treasury = getTreasuryKeypair()

  const before = await readMint(KYRT_MINT_ADDRESS)
  console.log(`Mint authority:   ${before.mintAuthority?.toBase58() ?? 'null (já revogada)'}`)
  console.log(`Freeze authority: ${before.freezeAuthority?.toBase58() ?? 'null (já revogada)'}`)

  console.log('Revogando authorities (mint + freeze → null)...')
  await revokeAuthorities(treasury, KYRT_MINT_ADDRESS)

  const after = await readMint(KYRT_MINT_ADDRESS)
  console.log('Estado final:')
  console.log(`  mintAuthority:   ${after.mintAuthority?.toBase58() ?? 'null ✅'}`)
  console.log(`  freezeAuthority: ${after.freezeAuthority?.toBase58() ?? 'null ✅'}`)
  console.log(`🔒 Supply do ${TOKEN.symbol} agora é IMUTÁVEL — ninguém pode cunhar mais.`)
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
