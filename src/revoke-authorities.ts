import { getTreasuryKeypair } from './lib/keypair'
import { readMint, revokeAuthorities } from './actions'
import { KYRT_MINT_ADDRESS, TOKEN } from './config'

async function main(): Promise<void> {
  if (!KYRT_MINT_ADDRESS) {
    throw new Error('KYRT_MINT_ADDRESS is empty. Run `npm run create` first.')
  }
  const treasury = getTreasuryKeypair()

  const before = await readMint(KYRT_MINT_ADDRESS)
  console.log(`Mint authority:   ${before.mintAuthority?.toBase58() ?? 'null (already revoked)'}`)
  console.log(`Freeze authority: ${before.freezeAuthority?.toBase58() ?? 'null (already revoked)'}`)

  console.log('Revoking authorities (mint + freeze → null)...')
  await revokeAuthorities(treasury, KYRT_MINT_ADDRESS)

  const after = await readMint(KYRT_MINT_ADDRESS)
  console.log('Final state:')
  console.log(`  mintAuthority:   ${after.mintAuthority?.toBase58() ?? 'null ✅'}`)
  console.log(`  freezeAuthority: ${after.freezeAuthority?.toBase58() ?? 'null ✅'}`)
  console.log(`🔒 The ${TOKEN.symbol} supply is now IMMUTABLE, no one can mint more.`)
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
