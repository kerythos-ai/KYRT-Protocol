# Mainnet Plan, $KYRT

Security, custody, and go-live checklist for moving $KYRT from devnet to **mainnet-beta**.

> ⚠️ On mainnet there is no "undo." Each step below is a final decision. Don't rush.

---

## 1. Tokenomics model, liquidity fair launch + Rewards pool

> **Updated (2026-06-25):** the genesis allocation now includes a **vested founders allocation (14%, 5-year vesting via Streamflow)** plus company **growth (20%)** and **treasury (10%)** buckets (for Kerythos' growth and to pay back collaborators), alongside **liquidity (31%)** and **community rewards (25%)**. No external investors, no presale; founders locked on-chain. Full parameters in [`TOKENOMICS.md`](TOKENOMICS.md).
>
> ⚠️ **Implication for the deploy:** mainnet needs a **distribution script** that mints to the liquidity pool **and** to the rewards pool, unlike the devnet dry-run (which minted 100% into a single treasury). The Expansion Vault is funded via post-launch buyback.

### Genesis distribution (decided)

| Bucket | % | KYRT | Custody |
|---|---|---|---|
| **Liquidity (pool)** | 31% | 310,000,000 | LP burned/locked |
| **Community Rewards** | 25% | 250,000,000 | multisig, distributed via Refer&Earn |
| **Founders** | 14% | 140,000,000 | 7% each (2 founders), **5-year vesting** via Streamflow |
| **Growth / Ecosystem** | 20% | 200,000,000 | multisig, released over the project's growth |
| **Company Treasury** | 10% | 100,000,000 | multisig |
| Expansion Vault | 0% at genesis | n/a | funded only via post-launch buyback |

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

- [x] ✅ **`src/distribute.ts`** (`npm run distribute`), mints to the **liquidity** wallet (~85%) and the **rewards pool / multisig** (15%) **before** revoking the mint authority. Wallets via `KYRT_LIQUIDITY_WALLET` / `KYRT_REWARDS_WALLET` (+ `KYRT_REWARDS_PCT`, default 15). Refuses to run if the mint already has supply (no double-mint) and requires explicit wallets on mainnet. **Dry-run-validated on devnet** (full create → distribute → revoke).
- [ ] **Vesting** → vault/team should not sit in a plain wallet. Use **Streamflow** or **Bonfida Token Vesting** (audited vesting contracts) or Squads vaults with time-locked unlocking.
- [x] ✅ **Logo**, `assets/images/kyrt-512.png` (512×512, navy bg + white mark + green accent), generated from the SVG by `npm run logo` (`scripts/gen-logo.mjs`). Also placed at the site's `public/logo/kyrt-512.png` so the interim URL resolves.
- [~] **Immutable metadata** → `assets/metadata.json` is ready (copy aligned to the new narrative). Hosting steps, in order: **1)** upload `kyrt-512.png` to **Arweave** (Irys/Metaplex) or **IPFS** → get the image URI; **2)** put that URI in `metadata.json` `image` + `properties.files[].uri` (replacing the interim `kerythos.org` URL); **3)** upload `metadata.json` → set `KYRT_METADATA_URI` to its URI; **4)** after branding stabilizes, make it immutable (`isMutable: false`).

---

## 3. Security & custody of the authorities

The devnet treasury is a keypair in a file, **unacceptable** for mainnet. Plan:

1. **Hardware wallet** (Ledger) as signer, or
2. **Squads multisig** (https://squads.so), the market standard on Solana, requiring M-of-N signatures to move funds from the vault/treasury.

Recommended authority sequence:
- **Mint authority** → **revoke (null)** after minting. A fixed supply is the strongest trust signal and eliminates the "dev minted more" vector. *(This is what `revoke` already does.)*
- **Freeze authority** → **revoke (null)**. A non-freezable token = more DeFi credibility.
- **Metadata update authority** → transfer to the **multisig**, then make it immutable once the branding stabilizes.
- **Vault / treasury** → **Squads multisig** (never a single key).

---

## 4. Estimated costs (mainnet, in SOL)

Approximate figures, they vary with the network and the pool program.

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
> A **dedicated RPC** (Helius/QuickNode/Triton) is mandatory on mainnet, the public one is rate-limited. ~$0–50/month on the entry-level plans.

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
- [ ] `npm run distribute` (liquidity + rewards pool), see §2
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
