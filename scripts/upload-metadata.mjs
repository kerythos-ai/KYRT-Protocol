// Uploads the token logo (PNG) and metadata.json to Arweave via Irys, and
// prints the resulting KYRT_METADATA_URI to put on-chain.
//   devnet  (test, temporary):  node scripts/upload-metadata.mjs devnet
//   mainnet (PERMANENT):        node scripts/upload-metadata.mjs mainnet-beta <keypair.json>
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'
import { createGenericFile, createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi'
import { clusterApiUrl } from '@solana/web3.js'
import { readFileSync } from 'node:fs'

const cluster = process.argv[2] || 'devnet'
const keypairPath = process.argv[3] || '.keys/treasury.json'
const isMainnet = cluster === 'mainnet-beta' || cluster === 'mainnet'
const rpc = clusterApiUrl(isMainnet ? 'mainnet-beta' : 'devnet')

// Mainnet uses the plugin's default (permanent) node; devnet uses the test node.
const opts = isMainnet ? { providerUrl: rpc } : { address: 'https://devnet.irys.xyz', providerUrl: rpc }
const umi = createUmi(rpc).use(irysUploader(opts))

const kp = umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(JSON.parse(readFileSync(keypairPath, 'utf8'))))
umi.use(signerIdentity(createSignerFromKeypair(umi, kp)))

console.log(`Cluster:  ${cluster}  ${isMainnet ? '(PERMANENT)' : '(devnet test, temporary)'}`)
console.log(`Payer:    ${kp.publicKey}\n`)

// 1) Logo PNG -> Arweave
const png = readFileSync('assets/images/kyrt-512.png')
const imageFile = createGenericFile(new Uint8Array(png), 'kyrt-512.png', { contentType: 'image/png' })
try {
  const price = await umi.uploader.getUploadPrice([imageFile])
  console.log(`Est. image upload price: ${Number(price.basisPoints) / 10 ** price.decimals} ${price.identifier}`)
} catch { /* price check optional */ }

console.log('Uploading logo…')
const [imageUri] = await umi.uploader.upload([imageFile])
console.log(`  image: ${imageUri}\n`)

// 2) metadata.json (with the Arweave image URI) -> Arweave
const meta = JSON.parse(readFileSync('assets/metadata.json', 'utf8'))
meta.image = imageUri
if (meta.properties?.files) meta.properties.files = [{ uri: imageUri, type: 'image/png' }]

console.log('Uploading metadata.json…')
const metadataUri = await umi.uploader.uploadJson(meta)
console.log(`  metadata: ${metadataUri}\n`)

console.log('============================================================')
console.log(`KYRT_METADATA_URI=${metadataUri}`)
console.log('============================================================')
