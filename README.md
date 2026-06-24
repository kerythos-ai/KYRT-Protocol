# $KYRT — Kerythos AI

**Strategy Speaks Integrity**

$KYRT is the native utility token of the **Kerythos AI** ecosystem — an autonomous AI office that architects a suite of business software, anchored today by a live invoicing product and expanding toward a full financial operating system. $KYRT is the value layer that runs across all of it.

---

## The ecosystem

| Layer | Product | Status |
|---|---|---|
| **Intelligence** | **Kerythos AI** — Department-as-a-Service, the autonomous AI office that architects the ecosystem | **Beta · launching soon** |
| **Invoicing** | **Kerythos Invoice** — professional invoicing & business management (Flutter + Supabase, Stripe billing live) | **Live** |
| **Finance** | **Kerythos Ledger** — cross-app cash, receivables & income hub | In development |
| **Infrastructure** | **Kethosbase** — Kerythos' own multi-tenant backend platform (Go + PostgreSQL) | In construction |

Kerythos AI is the architect of the ecosystem; Kerythos Invoice is its live anchor — real users and real revenue today. **$KYRT is the currency that ties it all together.**

---

## What $KYRT is for

The token's first home is the **Invoice** product, designed to bring everyday business users into crypto **gradually — no seed phrase, no gas friction**:

- **Earn** — users receive $KYRT through *Refer & Earn*: invite a business, and both sides earn when the first invoice is paid. Credited first as an in-app balance, claimed on-chain when the user is ready.
- **Spend** — pay your subscription in $KYRT for a discount.
- **Grow** — the same balance becomes the entry point to the wider ecosystem (Ledger, and beyond).

Utility first: the token is **earned through real use, not sold**.

---

## Tokenomics

- **Network:** Solana (SPL Token) · **Decimals:** 9
- **Total supply:** 1,000,000,000 — **fixed**. Mint authority and freeze authority are permanently revoked.
- **Allocation:** fair launch of the liquidity + a **community Rewards pool (15%)** that funds Refer & Earn. **No team or investor allocation.**
- **Buyback & Burn:** a portion of ecosystem revenue repurchases $KYRT on the open market → **50% burned** (permanent deflation) / **50% to the Expansion Vault** (funds ecosystem growth).

Parameters and the full economic model: [`docs/TOKENOMICS.md`](docs/TOKENOMICS.md) · [`docs/KYRT_Tokenomics.xlsx`](docs/KYRT_Tokenomics.xlsx).

---

## Launch integrity

- **Fair launch** — no presale, no insider allocation, no hidden mint authority.
- **Immutable supply** — once deployed, the mint authority is permanently revoked; scarcity is guaranteed by the code itself.
- **Transparent & auditable** — the entire token toolchain lives in this repository. $KYRT has been deployed and verified on Solana **devnet** as a public dry-run; **mainnet is planned** and gated by the ecosystem milestones in [`docs/MAINNET.md`](docs/MAINNET.md).

---

## This repository

| Path | Contents |
|---|---|
| [`src/`](src/) | TypeScript toolchain — create mint + metadata, mint supply, revoke authorities, burn, inspect |
| [`DEVELOPMENT.md`](DEVELOPMENT.md) | How to run the toolchain |
| [`docs/TOKENOMICS.md`](docs/TOKENOMICS.md) | Token parameters |
| [`docs/MAINNET.md`](docs/MAINNET.md) | Mainnet go-live plan (custody, costs, checklist) |
| [`docs/LIQUIDITY.md`](docs/LIQUIDITY.md) | Liquidity & market plan |
| [`GOVERNANCE.md`](GOVERNANCE.md) · [`SECURITY.md`](SECURITY.md) · [`LEGAL.md`](LEGAL.md) | Governance, security policy, legal |

---

## Status

- ✅ SPL token implemented and validated on **devnet** — supply fixed, authorities revoked.
- ⏳ **Mainnet** — planned, pending the milestones in `docs/MAINNET.md` (real utility live in-product, custody hardening, liquidity).

---

### Proprietary Notice & Copyright

© 2026 Kerythos AI. All Rights Reserved.

This repository contains proprietary architecture, business models, and documentation. Public visibility is provided exclusively for transparency and auditing purposes.

**No License Granted** — no part of this repository may be reproduced, distributed, copied, or used to create derivative works without the express written permission of Kerythos AI.

**No Contributions** — we do not accept external pull requests or contributions at this time, to preserve the integrity of the core architecture.

For official inquiries: **support@kerythos.org**

---

**Strategy Speaks Integrity.**
