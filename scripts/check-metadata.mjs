// One-off: prints on-chain metadata mutability + update authority for a mint.
import 'dotenv/config'
import { PublicKey, clusterApiUrl } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { mplTokenMetadata, fetchMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'

const MINT = new PublicKey(process.argv[2] || process.env.KYRT_MINT_ADDRESS)
const rpc = process.env.SOLANA_RPC_URL?.trim() || clusterApiUrl('mainnet-beta')
const umi = createUmi(rpc).use(mplTokenMetadata())
const clean = (s) => String(s).replace(/\0/g, '').trim()

const md = await fetchMetadata(umi, findMetadataPda(umi, { mint: fromWeb3JsPublicKey(MINT) }))
console.log(`Mint:             ${MINT.toBase58()}`)
console.log(`Name/Symbol:      ${clean(md.name)} / ${clean(md.symbol)}`)
console.log(`URI:              ${clean(md.uri)}`)
console.log(`Update authority: ${md.updateAuthority}`)
console.log(`isMutable:        ${md.isMutable}  ${md.isMutable ? '(changeable)' : '(LOCKED forever)'}`)
