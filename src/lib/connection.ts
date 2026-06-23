import { Connection, clusterApiUrl } from '@solana/web3.js'
import { CLUSTER, RPC_URL } from '../config'

/** Resolve a URL do RPC a partir do cluster/config. */
export function getRpcUrl(): string {
  if (RPC_URL) return RPC_URL
  if (CLUSTER === 'localnet') return 'http://127.0.0.1:8899'
  return clusterApiUrl(CLUSTER)
}

/** Conexão padrão (commitment "confirmed"). */
export function getConnection(): Connection {
  return new Connection(getRpcUrl(), 'confirmed')
}
