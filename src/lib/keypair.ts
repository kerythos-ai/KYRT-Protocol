import { Keypair } from '@solana/web3.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { TREASURY_KEYPAIR_PATH } from '../config'

/** Carrega um keypair do formato array-de-bytes (padrão solana-keygen). */
export function loadKeypair(path: string): Keypair {
  const secret = JSON.parse(readFileSync(path, 'utf-8')) as number[]
  return Keypair.fromSecretKey(Uint8Array.from(secret))
}

/** Salva um keypair como array-de-bytes JSON. */
export function saveKeypair(path: string, kp: Keypair): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)))
}

/** Carrega o keypair do caminho; se não existir, gera e salva um novo. */
export function loadOrCreateKeypair(path: string): Keypair {
  if (existsSync(path)) return loadKeypair(path)
  const kp = Keypair.generate()
  saveKeypair(path, kp)
  return kp
}

/** Keypair da treasury/deployer (do TREASURY_KEYPAIR_PATH). */
export function getTreasuryKeypair(): Keypair {
  return loadOrCreateKeypair(TREASURY_KEYPAIR_PATH)
}
