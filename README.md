# $KYRT — Kerythos AI

Token **SPL** da Kerythos AI na **Solana**. Supply fixo, queimável, sem programa custom — usa o SPL Token Program nativo (auditado) + metadados Metaplex, tudo orquestrado por scripts TypeScript.

## Tokenomics

| Parâmetro | Valor |
|---|---|
| Nome | Kerythos AI |
| Símbolo | `KYRT` |
| Decimais | 9 |
| Supply total | 1.000.000.000 (1 bilhão) |
| Supply fixo | ✅ mint authority revogada (null) |
| Queimável | ✅ nativo do SPL |
| Congelável | ❌ freeze authority revogada (null) |

## Pré-requisitos

- Node.js ≥ 20 (testado em 24)
- Nada de Rust/CLI da Solana — tudo roda em TypeScript.

## Setup

```bash
npm install
cp .env.example .env      # no Windows: copy .env.example .env
```

Ajuste o `.env` se quiser (o padrão já aponta para **devnet**). Uma keypair de treasury é gerada automaticamente em `.keys/treasury.json` no primeiro comando — **nunca** committe esse arquivo.

## Fluxo de deploy (devnet)

```bash
npm run airdrop        # pega 2 SOL de teste na treasury (só devnet/testnet)
npm run deploy         # cria mint + metadados, minta 1B, revoga authorities
npm run info           # mostra o estado on-chain + link do explorer
```

Ou passo a passo, para entender cada etapa:

```bash
npm run create         # 1. cria o mint do KYRT (+ metadados)  → grava no .env
npm run mint           # 2. minta o supply total para a treasury
npm run revoke         # 3. revoga mint + freeze authority (supply imutável)
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run airdrop [sol]` | Airdrop de SOL de teste na treasury (devnet/testnet) |
| `npm run create` | Cria o mint do KYRT com metadados; grava `KYRT_MINT_ADDRESS` no `.env` |
| `npm run mint` | Minta o supply total (1B) para a ATA da treasury |
| `npm run revoke` | Revoga as authorities → supply fixo e imutável |
| `npm run burn -- <qtd>` | Queima `<qtd>` KYRT da treasury (deflação) |
| `npm run info` | Estado on-chain do token + link do explorer |
| `npm run deploy` | Pipeline completo: create → mint → revoke |
| `npm run typecheck` | Checagem de tipos (tsc) |

## Estrutura

```
src/
├── config.ts              # parâmetros do token + cluster (fonte única)
├── actions.ts             # lógica on-chain (create/mint/revoke/burn/read)
├── lib/
│   ├── connection.ts      # RPC/Connection por cluster
│   ├── keypair.ts         # carregar/gerar keypair da treasury
│   ├── umi.ts             # instância Metaplex Umi (metadados)
│   └── env.ts             # persistência do mint no .env
├── airdrop.ts             # CLIs finos — um por comando
├── create-token.ts
├── mint-supply.ts
├── revoke-authorities.ts
├── burn.ts
├── token-info.ts
└── deploy.ts              # orquestra o pipeline completo
assets/metadata.json       # metadados off-chain (hospede em Arweave/IPFS p/ prod)
```

## Segurança

- 🔑 A keypair da treasury vive em `.keys/` (no `.gitignore`). Faça backup offline.
- 🧊 Em produção, transfira as authorities para um **multisig** (Squads) **antes** de revogar, ou revogue direto para garantir supply fixo.
- 🌐 Use um RPC dedicado (`SOLANA_RPC_URL`) em mainnet — o público tem rate limit.

## Próximos passos (mainnet)

Planejamento detalhado em:
- **[`docs/MAINNET.md`](docs/MAINNET.md)** — tokenomics, custódia (multisig Squads), custos, checklist go-live
- **[`docs/LIQUIDITY.md`](docs/LIQUIDITY.md)** — DEX, tipo de pool, preço inicial, burn/lock de LP, buyback & burn

Resumo:
1. Hospedar `assets/metadata.json` + logo PNG 512×512 no Arweave/IPFS → preencher `KYRT_METADATA_URI`.
2. `SOLANA_CLUSTER=mainnet-beta` + RPC dedicado; financiar a treasury com SOL real.
3. Authorities para multisig/hardware wallet; `npm run deploy`.
4. Criar pool na Raydium e **queimar/travar** o LP.
