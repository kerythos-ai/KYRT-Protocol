# $KYRT Tokenomics, reference parameters

> **Provisional**, locked on 2026-06-23 from the model in [`KYRT_Tokenomics.xlsx`](KYRT_Tokenomics.xlsx).
> **Economic knobs locked 2026-06-24:** plan payment goes to **treasury** (recycle into rewards); Rewards pool **15%**; referral reward **$15** (tunable).

## Supply & allocation (genesis)

| Bucket | % | KYRT | Note |
|---|--:|--:|---|
| **Rewards pool** | 15% | 150,000,000 | community distribution (Refer & Earn) |
| **Liquidity** | 85%* | 850,000,000* | liquidity fair launch · LP burned/locked |
| **Expansion Vault** | 0% at genesis | n/a | funded **only post-launch via buyback** |

\* exact split between liquidity and an eventual operating treasury still to be defined.

- Total supply: **1,000,000,000** (fixed, mint authority revoked).
- ⚠️ With the Rewards pool, this is **no longer a "100% pure fair launch"**, it's a **liquidity fair launch + community rewards pool**. Adjust the site/README narrative accordingly.
- **Reference** target price: **$0.002** (FDV ~$2M). Reference only, the market decides.

## Distribution, Refer & Earn

- Reward per successful referral (the referee completes their 1st **paid** invoice): **$15 in KYRT** (total value, split between referrer and referee). Tunable off-chain; start here and calibrate with data.
- Credited **off-chain** first (balance in Supabase) → **on-chain claim** later (see `KYRT_ONBOARDING.md`).
- *Note from the model:* LTV/CAC ≈ 50x, there's plenty of room to be more generous whenever you want to accelerate adoption.

## Sink, paying the subscription in KYRT

- Discount for paying the plan in KYRT: **15%**.
- Destination of the KYRT paid: **treasury** (recycled into the Rewards pool to extend its runway). Deflation is provided separately by the buyback & burn, so the deflationary narrative holds.

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

## Decisions locked (2026-06-24)

1. ✅ **Plan payment, treasury (recycle)** into the Rewards pool. Keeps the rewards loop sustainable; deflation stays via the buyback & burn.
2. ✅ **Pool %, 15%** (genesis, permanent). Liquidity keeps ~85%; rewards can be topped up post-launch via treasury recycling and the buyback.
3. ✅ **Referral reward, $15** (off-chain, tunable). More generous than the old $8 to bootstrap the flywheel; LTV/CAC leaves large headroom.
4. ✅ **Site + README** realigned to the real narrative (done 2026-06-23/24).

## Still open / to calibrate later

- Exact **liquidity vs operating-treasury** split within the 85%.
- **Plan discount** (currently 15%) and the **referrer/referee split** of the $15, calibrate with data.
