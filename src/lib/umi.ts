import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createSignerFromKeypair, signerIdentity, type Umi } from '@metaplex-foundation/umi'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import type { Keypair } from '@solana/web3.js'
import { getRpcUrl } from './connection'

/** Creates a Umi instance authenticated with the given keypair as the identity. */
export function getUmi(payer: Keypair): Umi {
  const umi = createUmi(getRpcUrl())
  const signer = createSignerFromKeypair(umi, fromWeb3JsKeypair(payer))
  umi.use(signerIdentity(signer))
  return umi
}
