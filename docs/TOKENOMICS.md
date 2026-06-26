# $KYRT Tokenomics, reference parameters

> **Provisional**, locked on 2026-06-23 from the model in [`KYRT_Tokenomics.xlsx`](KYRT_Tokenomics.xlsx).
> **Economic knobs locked 2026-06-24:** plan payment goes to **treasury** (recycle into rewards); referral reward **$15** (tunable).
> **Allocation revised 2026-06-25:** genesis now includes a **vested founders allocation** and **company buckets** (treasury + growth), replacing the earlier "no team allocation" model. Fully disclosed, with multi-year vesting and no external investors.

## Supply & allocation (genesis)

| Bucket | % | KYRT | Custody / lock |
|---|--:|--:|---|
| **Liquidity** | 31% | 310,000,000 | DEX pool · LP burned/locked |
| **Community Rewards** | 25% | 250,000,000 | multisig · distributed via Refer & Earn |
| **Founders** | 14% | 140,000,000 | 7% each (2 founders) · **5-year vesting** (Streamflow) |
| **Growth / Ecosystem** | 20% | 200,000,000 | multisig · released over the project's growth |
| **Company Treasury** | 10% | 100,000,000 | multisig |
| **Expansion Vault** | 0% at genesis | n/a | funded **only post-launch via buyback** |

- Total supply: **1,000,000,000** (fixed, mint authority and freeze authority revoked).
- **Transparency:** every bucket is disclosed and verifiable on-chain. The founders' allocation is **locked in an audited vesting contract** (Streamflow) and unlocks gradually over 5 years, aligning the team with the long term.
- **Purpose of the company buckets:** treasury (10%) and growth (20%) fund Kerythos' sustained growth, pay back collaborators, and provide reserve for partnerships, listings and future strategic deals. Held in the multisig, released gradually.
- **Bootstrap launch:** no external investors, no presale. Liquidity is seeded by the team and the **LP is burned/locked**; supply is fixed and the mint is revoked.
- **Reference** target price: **$0.002** (FDV ~$2M). Reference only, the market decides; the launch pool itself is a small, self-funded bootstrap that grows over time via the buyback.

## Founders' vesting

- **14% total** (140,000,000 KYRT), split **7% per founder** across the 2 founders (70,000,000 each).
- Held in **Streamflow** (audited, on-chain vesting), one stream per founder.
- Schedule: **12-month cliff** (nothing unlocks in year 1), then **linear release over the next 48 months** (fully unlocked at month 60 / year 5).
- Enforced on-chain: founders cannot move tokens faster than the schedule, so the lock-up is verifiable by anyone.

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
| Rewards pool runway | **~21 years** (250M pool) |

## Decisions locked

1. ✅ **Plan payment, treasury (recycle)** into the Rewards pool. Keeps the rewards loop sustainable; deflation stays via the buyback & burn.
2. ✅ **Referral reward, $15** (off-chain, tunable). More generous than the old $8 to bootstrap the flywheel; LTV/CAC leaves large headroom.
3. ✅ **Allocation model, 2026-06-25:** liquidity 31% · community rewards 25% · **founders 14% (vested 5 years)** · growth 20% · treasury 10%. Replaces the earlier "no team allocation" plan; fully disclosed, long vesting, bootstrap (no external raise). Founders vesting via Streamflow; treasury/growth in the multisig, for Kerythos' growth and to pay back collaborators.

## Still open / to calibrate later

- **Plan discount** (currently 15%) and the **referrer/referee split** of the $15, calibrate with data.
- **Release schedule** for the treasury / growth buckets (recommended: public and gradual, to avoid being read as an overhang).
