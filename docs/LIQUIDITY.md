# Liquidity Roadmap — $KYRT

How to create and manage the $KYRT market on a Solana DEX after deployment.

> Prerequisite: token deployed, supply minted, and authorities revoked (see `docs/MAINNET.md`).

---

## 1. Choosing the DEX

| DEX | Pros | Cons |
|---|---|---|
| **Raydium** ⭐ | Highest volume/routing, integrates with Jupiter, the standard for launches | Slightly more technical UI |
| **Orca** | Excellent UX, mature Whirlpools (CLMM) | Less of a launch hub than Raydium |
| **Meteora** | DLMM, dynamic pools, great for LPs | Steeper learning curve |

> **Recommendation:** **Raydium** for the main pool. Every aggregator (Jupiter) routes through it, so liquidity on Raydium means $KYRT is buyable from any Solana wallet/app.

---

## 2. Pool Type

| Type | When to use |
|---|---|
| **CPMM (Standard AMM)** ⭐ | Launch. Liquidity spread across the entire curve (0→∞), zero management, bot-drain proof. **Start here.** |
| **CLMM (Concentrated)** | Later, for capital efficiency once there's volume and an active market maker |

> **Recommendation:** open with **CPMM**. Migrate to or supplement with CLMM once volume justifies it.

---

## 3. Trading Pair

- **KYRT/SOL** ⭐ — the native pair, most natural on Solana, best routing.
- **KYRT/USDC** — stable, readable pricing, good for a second pool later.

> **Recommendation:** launch with **KYRT/SOL**. Add **KYRT/USDC** in a second phase.

---

## 4. Initial Price and Depth

On an AMM, price is set **by the ratio between the two sides** of the pool:

```
price(KYRT in SOL) = SOL_deposited / KYRT_deposited
FDV (in SOL)       = price × total_supply
```

**Seed scenarios (KYRT/SOL, 1B supply), assuming SOL ≈ $150:**

| KYRT in pool | SOL in pool | Initial price | Approx. FDV |
|---|---|---|---|
| 200,000,000 | 50 SOL | 0.00000025 SOL (~$0.0000375) | ~$37.5k |
| 200,000,000 | 200 SOL | 0.000001 SOL (~$0.00015) | ~$150k |
| 400,000,000 | 400 SOL | 0.000001 SOL (~$0.00015) | ~$150k |

> Rule of thumb: **more SOL in the seed = a "firmer" price** that's less volatile on each buy. Thin liquidity means violent candles and an easy target for bots. Size the SOL side according to available capital and your target FDV.

---

## 5. LP Tokens: Burn vs. Lock

When you create the pool you receive **LP tokens** (which represent your share of the liquidity). What you do with them is the No. 1 trust signal:

| Strategy | Effect | Signal |
|---|---|---|
| **Burn** ⭐ | Liquidity is locked **forever** | Maximum trust, irreversible |
| **Lock** | Time-lock (e.g., 6–12 months) via a lock service | High trust, reversible at the end |
| Hold | You can pull the liquidity | ❌ Read as "rug" risk |

> **Recommendation:** **burn** (or lock for a long, public period) the initial pool's LP tokens. Combined with the revoked mint, this closes the two biggest vectors of distrust.

---

## 6. Deflationary Mechanics (buyback & burn)

Putting the model into practice, funded by **ecosystem revenue** (invoice app subscriptions, etc.):

```
Revenue (USDC/SOL)
   └─► buy back KYRT on the market (via Jupiter)
          ├─ 50% → permanent BURN   →  npm run burn -- <amount>
          └─ 50% → Expansion Vault (multisig)
```

- **Phase 1 (manual):** periodic executions signed by the multisig; transparency via public transactions.
- **Phase 2 (programmatic):** a bot/cron that buys back and burns on revenue triggers (publish the formula publicly).
- The burn function **already exists** in the project (`src/actions.ts → burnKyrt`).

---

## 7. Fair Launch & Anti-Bot

- **Atomicity:** add liquidity **and** burn/lock the LP as close together as possible (same block/transaction) so there's no window for sniping.
- **No hidden allocation:** no team/investor allocation; the liquidity portion and the community Rewards pool are public and auditable (see `docs/TOKENOMICS.md`).
- **Disclosure:** publish the mint address only at launch time; watch out for bots that listen to the mempool/new pools.
- Consider launch tools with anti-sniper protection if the event is highly anticipated.

---

## 8. Post-Pool: Visibility

| Platform | Action |
|---|---|
| **Jupiter** | Automatic routing once it detects the pool; submit to the token list for a verified logo |
| **DexScreener** | Shows up on its own; **claim** the profile and add logo/links |
| **Birdeye** | Same; claim and enrich |
| **CoinGecko / CMC** | Manual application (requires a track record of volume/liquidity) |

---

## 9. Summary Sequence

1. Deployment complete (`docs/MAINNET.md`)
2. Set target FDV → calculate the pool sides (§4)
3. Create the **KYRT/SOL CPMM** pool on Raydium
4. **Burn/lock** the LP tokens
5. Verify routing on Jupiter
6. Claim DexScreener/Birdeye
7. Announce the mint address on official channels
8. Turn on the **buyback & burn** cycle (§6)
