# $KYRT Tokenomics, reference parameters

> **Provisional**, locked on 2026-06-23 from the model in [`KYRT_Tokenomics.xlsx`](KYRT_Tokenomics.xlsx).
> "Let's go with these numbers for now." Revisit before mainnet.

## Supply & allocation (genesis)

| Bucket | % | KYRT | Note |
|---|--:|--:|---|
| **Rewards pool** | 15% | 150,000,000 | community distribution (Refer & Earn) |
| **Liquidity** | 85%* | 850,000,000* | liquidity fair launch · LP burned/locked |
| **Expansion Vault** | 0% at genesis |, | funded **only post-launch via buyback** |

\* exact split between liquidity and an eventual operating treasury still to be defined.

- Total supply: **1,000,000,000** (fixed, mint authority revoked).
- ⚠️ With the Rewards pool, this is **no longer a "100% pure fair launch"**, it's a **liquidity fair launch + community rewards pool**. Adjust the site/README narrative accordingly.
- **Reference** target price: **$0.002** (FDV ~$2M). Reference only, the market decides.

## Distribution, Refer & Earn

- Reward per successful referral (the referee completes their 1st **paid** invoice): **$8 in KYRT** (total value, split between referrer and referee).
- Credited **off-chain** first (balance in Supabase) → **on-chain claim** later (see `KYRT_ONBOARDING.md`).
- *Note from the model:* LTV/CAC ≈ 50x, there's plenty of room to be more generous whenever you want to accelerate adoption.

## Sink, paying the subscription in KYRT

- Discount for paying the plan in KYRT: **15%**.
- Destination of the KYRT paid: **[TO DECIDE, burn vs. treasury]** (changes the deflation rate).

## Buyback & Burn

- **30%** of revenue → KYRT buyback on the market (Solana).
- Split: **50% burn** (permanent deflation) / **50% Expansion Vault** (funds the ecosystem).

## Reference plans (real prices in Stripe)

- Pro **$19/mo** · Business **$49/mo** · Starter free · Enterprise custom.

## Model health (Base scenario, 15k users)

| | |
|---|--:|
| Coverage (buyback ÷ incentive) | **2.9x** (self-sustaining) |
| LTV ÷ CAC | **48x** |
| Rewards pool runway | **12.5 years** |

## Open items / to calibrate later

1. **Plan payment: burn or treasury?**
2. **Pool %** could rise (15% → 20-25%) if growth is fast (in the aggressive scenario the runway drops to ~2 years).
3. **Referral reward** could be far more generous (LTV/CAC is extremely high).
4. Exact **liquidity vs treasury** split within the 85%.
5. Realign the **site + README** to the real narrative (fintech/invoicing + rewards, not a "100% pure fair launch").
