# Mainnet Plan — $KYRT

Security, custody, and go-live checklist for moving $KYRT from devnet to **mainnet-beta**.

> ⚠️ On mainnet there is no "undo." Each step below is a final decision. Don't rush.

---

## 1. Tokenomics model — liquidity fair launch + Rewards pool

> **Updated (2026-06-23):** with the adoption of Refer&Earn (utility in the invoice app), the tokenomics evolved from "pure fair launch" to **liquidity fair launch (~85%) + community Rewards pool (15% = 150M)** — with no team/investor allocation. Parameters in [`TOKENOMICS.md`](TOKENOMICS.md).
>
> ⚠️ **Implication for the deploy:** mainnet needs a **distribution script** that mints to the liquidity pool **and** to the rewards pool, unlike the devnet dry-run (which minted 100% into a single treasury). The Expansion Vault is funded via post-launch buyback.

### Genesis distribution (decided)

| Bucket | % | KYRT | Custody |
|---|---|---|---|
| **Liquidity (pool)** | ~85% | ~850,000,000 | LP burned/locked |
| **Rewards Pool (community)** | 15% | 150,000,000 | Multisig — distributed via Refer&Earn |
| Team / investor | 0% | 0 | no allocation |
| Expansion Vault | 0% at genesis | — | funded only via post-launch buyback |

The three mechanics, on Solana:

| Mechanic | On-chain implementation |
|---|---|
| **Liquidity fair launch** | ~85% of supply enters via the liquidity pool; no presale/private allocation |
| **Buyback & Burn** | ecosystem revenue buys back KYRT → 50% `burn` (`npm run burn`) / 50% Vault |
| **Expansion Vault** | half of the bought-back amount goes to a multisig vault that funds the ecosystem |

> The exact split between liquidity and operational treasury within the ~85% is still to be defined. Parameters in [`TOKENOMICS.md`](TOKENOMICS.md).

---

## 2. Gap between the current code and mainnet

Today's `deploy.ts` (devnet dry-run) mints 100% to **one** treasury and revokes the authorities. For mainnet, with the rewards pool:

- [x] ✅ **`src/distribute.ts`** (`npm run distribute`) — mints to the **liquidity** wallet (~85%) and the **rewards pool / multisig** (15%) **before** revoking the mint authority. Wallets via `KYRT_LIQUIDITY_WALLET` / `KYRT_REWARDS_WALLET` (+ `KYRT_REWARDS_PCT`, default 15). Refuses to run if the mint already has supply (no double-mint) and requires explicit wallets on mainnet. **Dry-run-validated on devnet** (full create → distribute → revoke).
- [ ] **Vesting** → vault/team should not sit in a plain wallet. Use **Streamflow** or **Bonfida Token Vesting** (audited vesting contracts) or Squads vaults with time-locked unlocking.
- [ ] **Immutable metadata** → host `assets/metadata.json` + logo PNG on **Arweave** (via Irys/Metaplex) or **IPFS** and pin `KYRT_METADATA_URI`. Then make the metadata immutable (`isMutable: false`).
- [ ] **Logo** → export `logo-kyrt.svg` to **PNG 512×512** (wallets/explorers don't render SVG).

---

## 3. Security & custody of the authorities

The devnet treasury is a keypair in a file — **unacceptable** for mainnet. Plan:

1. **Hardware wallet** (Ledger) as signer, or
2. **Squads multisig** (https://squads.so) — the market standard on Solana — requiring M-of-N signatures to move funds from the vault/treasury.

Recommended authority sequence:
- **Mint authority** → **revoke (null)** after minting. A fixed supply is the strongest trust signal and eliminates the "dev minted more" vector. *(This is what `revoke` already does.)*
- **Freeze authority** → **revoke (null)**. A non-freezable token = more DeFi credibility.
- **Metadata update authority** → transfer to the **multisig**, then make it immutable once the branding stabilizes.
- **Vault / treasury** → **Squads multisig** (never a single key).

---

## 4. Estimated costs (mainnet, in SOL)

Approximate figures — they vary with the network and the pool program.

| Item | Cost (SOL) |
|---|---|
| Mint account (rent) | ~0.0015 |
| Metadata account (Metaplex) | ~0.006–0.015 |
| ATAs (per wallet) | ~0.002 each |
| Arweave upload (JSON + PNG) | ~0.01–0.05 |
| Transaction fees | negligible (~0.000005/tx) |
| Raydium pool creation | ~0.15–0.3 (rent + fee) |
| **Operational subtotal** | **< 0.5 SOL** |
| **+ Liquidity capital** | see `docs/LIQUIDITY.md` (separate) |

> Recommended: keep **2–3 SOL** in the operational treasury, on top of the liquidity capital.
> A **dedicated RPC** (Helius/QuickNode/Triton) is mandatory on mainnet — the public one is rate-limited. ~$0–50/month on the entry-level plans.

---

## 5. Go-live checklist

**Pre-deploy**
- [ ] Tokenomics locked (see `TOKENOMICS.md`) and site/README copy matching
- [ ] Logo PNG 512×512 + `metadata.json` on Arweave/IPFS → `KYRT_METADATA_URI`
- [ ] Squads multisig created; signers and threshold defined
- [ ] `SOLANA_CLUSTER=mainnet-beta` + dedicated `SOLANA_RPC_URL` in `.env`
- [ ] Treasury (hardware/multisig) funded with SOL
- [ ] **Full dry-run on devnet identical to the mainnet plan**

**Deploy**
- [ ] `npm run create` (mint + metadata)
- [ ] `npm run distribute` (liquidity + rewards pool) — see §2
- [ ] Check balances/distribution
- [ ] `npm run revoke` (mint + freeze → null)
- [ ] `npm run info` and validate on the explorer

**Liquidity** → follow `docs/LIQUIDITY.md`

**Post-deploy**
- [ ] Verify the token on **Solana Explorer / Solscan**
- [ ] Submit to the **Jupiter token list** (logo/metadata verification)
- [ ] Claim the profile on **Birdeye** and **DexScreener**
- [ ] Apply to **CoinGecko** and **CoinMarketCap**
- [ ] Announce the contract (mint address) on the official channels

---

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Leaked treasury key | Hardware wallet + multisig; never commit `.keys/` |
| Mutable metadata exploited | Make it immutable once stabilized |
| Bot sniping at launch | Add liquidity and burn/lock the LP in the **same** transaction/block |
| Perceived "rug" | Fixed supply (mint revoked) + LP burned/locked + vault in a public multisig |
| Unstable RPC at launch | Dedicated RPC + fallback |
