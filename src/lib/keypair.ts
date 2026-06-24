import { Keypair } from '@solana/web3.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { TREASURY_KEYPAIR_PATH } from '../config'

/** Loads a keypair from the byte-array format (solana-keygen standard). */
export function loadKeypair(path: string): Keypair {
  const secret = JSON.parse(readFileSync(path, 'utf-8')) as number[]
  return Keypair.fromSecretKey(Uint8Array.from(secret))
}

/** Saves a keypair as a JSON byte array. */
export function saveKeypair(path: string, kp: Keypair): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)))
}

/** Loads the keypair from the path; if it doesn't exist, generates and saves a new one. */
export function loadOrCreateKeypair(path: string): Keypair {
  if (existsSync(path)) return loadKeypair(path)
  const kp = Keypair.generate()
  saveKeypair(path, kp)
  return kp
}

/** Treasury/deployer keypair (from TREASURY_KEYPAIR_PATH). */
export function getTreasuryKeypair(): Keypair {
  return loadOrCreateKeypair(TREASURY_KEYPAIR_PATH)
}
