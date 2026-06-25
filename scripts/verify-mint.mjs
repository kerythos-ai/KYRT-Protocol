// Verifies a deployed mint on-chain: supply, vault balance, authorities, metadata.
// Reads SOLANA_RPC_URL from .env (the key is never printed).
// Usage: node scripts/verify-mint.mjs <mint> [vaultOwner]
import 'dotenv/config'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { getMint, getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { mplTokenMetadata, fetchMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'

const MINT = new PublicKey(process.argv[2])
const VAULT = process.argv[3] ? new PublicKey(process.argv[3]) : null
const rpc = process.env.SOLANA_RPC_URL?.trim() || clusterApiUrl('mainnet-beta')
const conn = new Connection(rpc, 'confirmed')

const m = await getMint(conn, MINT)
const fmt = (r) => (r / 10n ** BigInt(m.decimals)).toLocaleString('en-US')

let bal = 0n
if (VAULT) {
  const ata = getAssociatedTokenAddressSync(MINT, VAULT, true)
  try { bal = (await getAccount(conn, ata)).amount } catch {}
}

const umi = createUmi(rpc).use(mplTokenMetadata())
const clean = (s) => s.replace(/\0/g, '').trim()
let md = null
try { md = await fetchMetadata(umi, findMetadataPda(umi, { mint: fromWeb3JsPublicKey(MINT) })) } catch {}

console.log(`Mint:             ${MINT.toBase58()}`)
console.log(`Decimals:         ${m.decimals}`)
console.log(`Supply:           ${fmt(m.supply)}  (raw ${m.supply})`)
if (VAULT) console.log(`Vault holds:      ${fmt(bal)}`)
console.log(`Mint authority:   ${m.mintAuthority?.toBase58() ?? 'null 🔒'}`)
console.log(`Freeze authority: ${m.freezeAuthority?.toBase58() ?? 'null 🔒'}`)
if (md) {
  console.log(`Metadata:         ${clean(md.name)} / ${clean(md.symbol)}`)
  console.log(`Metadata uri:     ${clean(md.uri)}`)
  console.log(`Update authority: ${md.updateAuthority}`)
} else {
  console.log('Metadata:         (not found)')
}
