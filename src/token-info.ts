import { readMint } from './actions'
import { CLUSTER, KYRT_MINT_ADDRESS, TOKEN } from './config'

/** Formats base units into readable whole units. */
function fmt(raw: bigint, decimals: number): string {
  return (raw / 10n ** BigInt(decimals)).toLocaleString('en-US')
}

function explorerUrl(mint: string): string {
  const suffix = CLUSTER === 'mainnet-beta' ? '' : `?cluster=${CLUSTER}`
  return `https://explorer.solana.com/address/${mint}${suffix}`
}

async function main(): Promise<void> {
  if (!KYRT_MINT_ADDRESS) {
    throw new Error('KYRT_MINT_ADDRESS is empty. Run `npm run create` first.')
  }
  const info = await readMint(KYRT_MINT_ADDRESS)

  console.log(`=== ${TOKEN.name} ($${TOKEN.symbol}) — ${CLUSTER} ===`)
  console.log(`Mint:             ${KYRT_MINT_ADDRESS}`)
  console.log(`Decimals:         ${info.decimals}`)
  console.log(`Supply:           ${fmt(info.supply, info.decimals)} ${TOKEN.symbol}`)
  console.log(`Supply (raw):     ${info.supply}`)
  console.log(`Mint authority:   ${info.mintAuthority?.toBase58() ?? 'null 🔒 (fixed supply)'}`)
  console.log(`Freeze authority: ${info.freezeAuthority?.toBase58() ?? 'null 🔒'}`)
  console.log(`Explorer:         ${explorerUrl(KYRT_MINT_ADDRESS)}`)
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
