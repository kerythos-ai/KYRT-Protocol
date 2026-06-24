# $KYRT — Kerythos AI

Kerythos AI's **SPL** token on **Solana**. Fixed supply, burnable, no custom program — it uses the native (audited) SPL Token Program + Metaplex metadata, all orchestrated by TypeScript scripts.

## Tokenomics

| Parameter | Value |
|---|---|
| Name | Kerythos AI |
| Symbol | `KYRT` |
| Decimals | 9 |
| Total supply | 1,000,000,000 (1 billion) |
| Fixed supply | ✅ mint authority revoked (null) |
| Burnable | ✅ native to SPL |
| Freezable | ❌ freeze authority revoked (null) |

> Full allocation (liquidity fair launch + **15% community Rewards pool**) and economic parameters are in [`docs/TOKENOMICS.md`](docs/TOKENOMICS.md). The **mainnet** deploy will use a distribution script (liquidity + rewards pool), unlike the devnet dry-run, which minted 100% into a single treasury.

## Prerequisites

- Node.js ≥ 20 (tested on 24)
- No Rust or Solana CLI — everything runs in TypeScript.

## Setup

```bash
npm install
cp .env.example .env      # on Windows: copy .env.example .env
```

Adjust `.env` if you like (the default already points to **devnet**). A treasury keypair is generated automatically at `.keys/treasury.json` on the first command — **never** commit this file.

## Deploy flow (devnet)

```bash
npm run airdrop        # grabs 2 test SOL for the treasury (devnet/testnet only)
npm run deploy         # creates mint + metadata, mints 1B, revokes authorities
npm run info           # shows on-chain state + explorer link
```

Or step by step, to understand each stage:

```bash
npm run create         # 1. creates the KYRT mint (+ metadata)  → writes to .env
npm run mint           # 2. mints the total supply to the treasury
npm run revoke         # 3. revokes mint + freeze authority (immutable supply)
```

## Commands

| Command | What it does |
|---|---|
| `npm run airdrop [sol]` | Airdrops test SOL to the treasury (devnet/testnet) |
| `npm run create` | Creates the KYRT mint with metadata; writes `KYRT_MINT_ADDRESS` to `.env` |
| `npm run mint` | Mints the total supply (1B) to the treasury ATA |
| `npm run revoke` | Revokes the authorities → fixed, immutable supply |
| `npm run burn -- <amount>` | Burns `<amount>` KYRT from the treasury (deflationary) |
| `npm run info` | Token's on-chain state + explorer link |
| `npm run deploy` | Full pipeline: create → mint → revoke |
| `npm run typecheck` | Type checking (tsc) |

## Structure

```
src/
├── config.ts              # token parameters + cluster (single source)
├── actions.ts             # on-chain logic (create/mint/revoke/burn/read)
├── lib/
│   ├── connection.ts      # RPC/Connection per cluster
│   ├── keypair.ts         # load/generate the treasury keypair
│   ├── umi.ts             # Metaplex Umi instance (metadata)
│   └── env.ts             # persist the mint to .env
├── airdrop.ts             # thin CLIs — one per command
├── create-token.ts
├── mint-supply.ts
├── revoke-authorities.ts
├── burn.ts
├── token-info.ts
└── deploy.ts              # orchestrates the full pipeline
assets/metadata.json       # off-chain metadata (host on Arweave/IPFS for prod)
```

## Security

- 🔑 The treasury keypair lives in `.keys/` (in `.gitignore`). Back it up offline.
- 🧊 In production, transfer the authorities to a **multisig** (Squads) **before** revoking, or revoke outright to guarantee a fixed supply.
- 🌐 Use a dedicated RPC (`SOLANA_RPC_URL`) on mainnet — the public one is rate-limited.

## Next steps (mainnet)

Detailed planning in:
- **[`docs/MAINNET.md`](docs/MAINNET.md)** — tokenomics, custody (Squads multisig), costs, go-live checklist
- **[`docs/LIQUIDITY.md`](docs/LIQUIDITY.md)** — DEX, pool type, initial price, LP burn/lock, buyback & burn

Summary:
1. Host `assets/metadata.json` + a 512×512 PNG logo on Arweave/IPFS → fill in `KYRT_METADATA_URI`.
2. Set `SOLANA_CLUSTER=mainnet-beta` + a dedicated RPC; fund the treasury with real SOL.
3. Move the authorities to a multisig/hardware wallet; run `npm run deploy`.
4. Create a pool on Raydium and **burn/lock** the LP.
