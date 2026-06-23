# Plano de Mainnet — $KYRT

Checklist de segurança, custódia e go-live para levar o $KYRT de devnet para **mainnet-beta**.

> ⚠️ Em mainnet não há "desfazer". Cada passo abaixo é uma decisão definitiva. Nada de pressa.

---

## 1. Modelo de tokenomics — ✅ Opção A (fair launch puro)

> **Decidido (2026-06-23):** **fair launch puro** — 100% do supply (1B) entra via pool de liquidez, **sem reservas no genesis** (sem equipe/vault pré-minerado). O `deploy.ts` atual (minta 100% na treasury → revoga authorities) já está alinhado; a treasury fornece tudo ao pool. O Expansion Vault é abastecido **apenas via buyback** pós-launch.

O site (kerythos.org) descreve três mecânicas. Tradução técnica para Solana:

| Mecânica (site) | Implementação on-chain |
|---|---|
| **100% Fair Launch** | Todo o supply entra via pool de liquidez; sem pré-venda/alocação privada |
| **Deflacionário (buyback & burn)** | Receita do negócio recompra KYRT no mercado → 50% `burn` (já temos `npm run burn`) |
| **Expansion Vault** | 50% do recomprado vai para um cofre multisig que financia projetos |

⚠️ **Tensão a resolver:** "100% fair launch" normalmente significa **zero** alocação reservada (equipe/vault no genesis). O Expansion Vault então só pode ser abastecido **depois**, via buyback — não com tokens pré-minerados. Se a intenção for reservar tokens no genesis (ex.: vault/equipe), então **não** é 100% fair launch e o texto do site precisa mudar. **Precisamos travar isto antes do deploy** (ver §8).

### Distribuição — duas opções

**Opção A — Fair launch puro (alinha com o texto atual do site)**
| Bucket | % | KYRT |
|---|---|---|
| Liquidez (pool) | 100% | 1.000.000.000 |
| Vault/Equipe (genesis) | 0% | 0 — abastecidos só via buyback |

**Opção B — Fair launch + reservas (mais comum na prática)**
| Bucket | % | KYRT | Custódia |
|---|---|---|---|
| Liquidez (pool) | 40% | 400.000.000 | LP queimado/locked |
| Expansion Vault | 35% | 350.000.000 | Multisig + vesting |
| Comunidade/Recompensas | 15% | 150.000.000 | Multisig |
| Equipe & Advisors | 10% | 100.000.000 | Vesting (cliff 12m + linear 24m) |

> Recomendação: se a narrativa de "fair launch" é central pro marketing, vá de **A** e seja rigoroso (abastece vault via buyback). Se precisa de runway/tesouraria, vá de **B** e ajuste o texto do site para "fair launch da liquidez + reservas transparentes e travadas".

---

## 2. Gap entre o código atual e a mainnet

O `deploy.ts` de hoje faz o caminho **devnet/Opção A simplificado**: minta 100% para **uma** treasury e revoga as authorities. Para mainnet, dependendo da opção:

- [ ] **Opção B** → criar `src/distribute.ts`: minta para a treasury e distribui para as carteiras de cada bucket **antes** de revogar a mint authority.
- [ ] **Vesting** → vault/equipe não devem ficar em carteira simples. Usar **Streamflow** ou **Bonfida Token Vesting** (contratos de vesting auditados) ou cofres Squads com desbloqueio temporizado.
- [ ] **Metadados imutáveis** → hospedar `assets/metadata.json` + logo PNG no **Arweave** (via Irys/Metaplex) ou **IPFS** e fixar `KYRT_METADATA_URI`. Depois, tornar os metadados imutáveis (`isMutable: false`).
- [ ] **Logo** → exportar `logo-kyrt.svg` para **PNG 512×512** (wallets/explorers não renderizam SVG).

---

## 3. Segurança & custódia das authorities

A treasury de devnet é uma keypair em arquivo — **inaceitável** para mainnet. Plano:

1. **Hardware wallet** (Ledger) como signatária, ou
2. **Multisig Squads** (https://squads.so) — padrão de mercado em Solana — exigindo M-de-N assinaturas para mover fundos do vault/tesouraria.

Sequência recomendada de authorities:
- **Mint authority** → **revogar (null)** após mintar. Supply fixo é o maior sinal de confiança e elimina o vetor "dev cunhou mais". *(É o que o `revoke` já faz.)*
- **Freeze authority** → **revogar (null)**. Token não-congelável = mais credibilidade DeFi.
- **Update authority dos metadados** → transferir para o **multisig**, depois tornar imutável quando o branding estabilizar.
- **Vault / tesouraria** → **multisig Squads** (nunca uma única chave).

---

## 4. Custos estimados (mainnet, em SOL)

Valores aproximados — variam com a rede e o programa do pool.

| Item | Custo (SOL) |
|---|---|
| Conta do mint (rent) | ~0,0015 |
| Conta de metadados (Metaplex) | ~0,006–0,015 |
| ATAs (por carteira) | ~0,002 cada |
| Upload Arweave (JSON + PNG) | ~0,01–0,05 |
| Taxas de transação | desprezível (~0,000005/tx) |
| Criação de pool Raydium | ~0,15–0,3 (rent + taxa) |
| **Subtotal operacional** | **< 0,5 SOL** |
| **+ Capital de liquidez** | ver `docs/LIQUIDITY.md` (à parte) |

> Recomendado: manter **2–3 SOL** na treasury operacional, além do capital de liquidez.
> **RPC dedicado** (Helius/QuickNode/Triton) é obrigatório em mainnet — o público tem rate-limit. ~US$0–50/mês nos planos iniciais.

---

## 5. Checklist go-live

**Pré-deploy**
- [ ] Tokenomics travada (Opção A ou B) e texto do site batendo
- [ ] Logo PNG 512×512 + `metadata.json` no Arweave/IPFS → `KYRT_METADATA_URI`
- [ ] Multisig Squads criado; signatários e threshold definidos
- [ ] `SOLANA_CLUSTER=mainnet-beta` + `SOLANA_RPC_URL` dedicado no `.env`
- [ ] Treasury (hardware/multisig) financiada com SOL
- [ ] **Dry-run completo em devnet idêntico ao plano de mainnet**

**Deploy**
- [ ] `npm run create` (mint + metadados)
- [ ] `npm run mint` (supply total) — ou `npm run distribute` (Opção B)
- [ ] Conferir saldos/distribuição
- [ ] `npm run revoke` (mint + freeze → null)
- [ ] `npm run info` e validar no explorer

**Liquidez** → seguir `docs/LIQUIDITY.md`

**Pós-deploy**
- [ ] Verificar token no **Solana Explorer / Solscan**
- [ ] Submeter à **Jupiter token list** (verificação de logo/metadados)
- [ ] Reivindicar perfil no **Birdeye** e **DexScreener**
- [ ] Aplicar no **CoinGecko** e **CoinMarketCap**
- [ ] Anunciar contrato (mint address) nos canais oficiais

---

## 6. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Chave da treasury vazada | Hardware wallet + multisig; nunca commitar `.keys/` |
| Metadados mutáveis explorados | Tornar imutável após estabilizar |
| Sniping de bots no launch | Adicionar liquidez e queimar/travar LP na **mesma** transação/bloco |
| "Rug" percebido | Supply fixo (mint revogado) + LP queimado/locked + vault em multisig público |
| RPC instável no launch | RPC dedicado + fallback |
