# Blueprint — $KYRT Onboarding in the Invoice App

Architecture for taking a user **who doesn't know what a wallet is** all the way to earning, holding, and
spending $KYRT — no jargon, no seed phrase, no gas. This is a design document; **no
code has been written yet**. Mapped onto what the app already has (Supabase + Edge Functions + Stripe).

> Current status in the app: everything is "coming soon" — `web3_banner.dart`, `web3_payments_screen.dart`,
> `referral_code` (migration 009, "crediting $KYRT are later phases"), Web3/$KYRT toggle
> (migration 012). The UX exists; the on-chain integration does not. This doc fills in what's missing.

---

## 1. Design principles

1. **Progressive custody** — embedded wallet (social login, no seed) first; Phantom is a *graduation*, not the entry point.
2. **Always gasless** — the user never sees "you need SOL for the fee." The app sponsors the fee.
3. **Off-chain first** — the user *earns* KYRT into a balance held in Supabase. It only "drops down" to the blockchain when they claim it. This reduces cost, gives us control, and lets us run everything before mainnet.
4. **Reuse the existing infra** — sensitive operations live in Edge Functions with `service_role`, just like Stripe does today.

---

## 2. The ladder (user states)

| Rung | State | What they see | On-chain? |
|---|---|---|---|
| **0** | No wallet | "You earned 500 KYRT for a referral!" (balance in the app) | ❌ off-chain |
| **1** | Creates wallet | "Store your KYRT" → social login, **no seed phrase** | ❌ |
| **2** | Claim | Balance "drops down" to the wallet — 1st transaction, **gasless** | ✅ transfer from the treasury |
| **3** | Pays for the plan | "Pay for your plan with KYRT and get X% off" — **gasless** | ✅ |
| **4** | Familiarity | Sees history, balance, earns more by referring | ✅ |
| **5** | Graduation (optional) | "Take it to Phantom," "buy more" | ✅ self-custody |

**Rung 0 is the pedagogical trick**: they earn *before* having a wallet. The pending balance is the bait that pulls them into creating the wallet ("there are 500 KYRT waiting for you"). It flips "create a wallet to participate" → "you already have some, come get it."

---

## 3. Data model (new migrations)

Following the project's conventions (`ADD COLUMN IF NOT EXISTS`, RLS, `DEFAULT auth.uid()`):

**`045_kyrt_ledger.sql`** — the off-chain balance (source of truth until the claim)
- `kyrt_balances` — `user_id` (PK, `DEFAULT auth.uid()`), `pending` (numeric, still in the app), `claimed` (already on-chain), `updated_at`.
- `kyrt_transactions` — immutable ledger: `id`, `user_id`, `kind` (`earn` | `claim` | `spend` | `adjust`), `amount`, `ref` (e.g., invoice_id, referral_id), `created_at`. Append-only.
- `kyrt_credit(uuid, numeric, text)` function — `SECURITY DEFINER`, called only by an Edge Function/trigger.

**`046_kyrt_wallets.sql`** — the user's wallet
- `user_wallets` — `user_id`, `address` (base58), `provider` (`embedded` | `phantom`), `custody` (`mpc` | `self`), `linked_at`. RLS: the owner reads/writes their own row.

**`047_referral_attribution.sql`** — closes the "later phase" that 009 anticipated
- `companies.referred_by` (uuid → who referred them, captured at signup).
- Trigger: when the referred user marks their 1st invoice as **Paid**, credit KYRT to **both** via `kyrt_credit` (anti-abuse: a real paid 1st invoice, not a draft).

> The distribution treasury must **back** the sum of `pending` — it's a liability. Model the emission cap (see §8).

---

## 4. New components

| Component | Role | Options |
|---|---|---|
| **Embedded wallet** | Creates a Solana wallet with social login, no seed | **Web3Auth** (has a Flutter SDK + Solana), **Para**, Magic, Privy — to evaluate. Web3Auth is the most likely fit for Flutter. |
| **Fee payer (gasless)** | The app pays the gas; the user only signs | Native Solana: a tx with `feePayer` = the server's keypair; co-signing in the Edge Function. Or a relayer (Octane). |
| **Price oracle** | Convert a $X plan → KYRT | Jupiter Price API or Pyth. Initially: **fixed/manual price** (devnet has no market). |
| **Distribution treasury** | Where the KYRT comes from on a claim | The mint we already created (`kerythos_kyrt`); on mainnet, **multisig (Squads)**. |

---

## 5. Flows (all via Edge Function, the app's pattern)

**Earn (refer & earn)** — rung 0
`trigger (1st invoice Paid)` → `kyrt_credit(referred, X)` + `kyrt_credit(referrer, Y)` → `kyrt_balances.pending += `. Purely off-chain. Zero friction, zero on-chain cost.

**Create wallet** — rung 1
The app calls the embedded SDK (the social login they already have) → receives `address` → `user_wallets` insert. No seed phrase shown.

**Claim** — rung 2 (`kyrt-claim`)
Validate `pending > 0` → build a `transfer` from the treasury → the user's wallet → **the fee payer (server) signs and pays the gas** → send → confirm → move `pending → claimed`, record the tx. Gasless.

**Pay for the plan in KYRT** — rung 3 (`kyrt-pay-subscription`)
Compute the plan's KYRT amount (oracle) with the discount → build the tx (user → treasury **or burn**) → the user signs via the embedded wallet (one tap), **the server pays the gas** → confirm → activate the plan (a path parallel to Stripe's `create-checkout-session`). Apply the discount as an incentive.

**Customer pays an invoice in KYRT/SOL** — rung 5, *late phase*
Only after a base of holders exists. Reuses the public invoice link (`get-public-invoice`) + the `payment_methods` toggle. For crypto-native customers; **$SOL** is the most realistic path here.

---

## 6. Where it fits into the existing UI

- `web3_banner.dart` / `web3_payments_screen.dart` (today "coming soon") → become the **real onboarding flow** (rungs 1-2).
- `company_footer.dart` (Refer & Earn) → shows the **KYRT balance + a Claim button**.
- Settings → Subscription → a **"Pay with KYRT (X% off)"** option alongside Stripe.
- Invoice → payment methods (migration 012) → Web3/$KYRT enabled in **phase 5**.

---

## 7. Custody & security

- **Treasury** = multisig (Squads) on mainnet. Never a keypair in a file.
- **Fee payer keypair** = a secret in the Edge Function's env (same as the Stripe keys). Never on the client.
- **Off-chain balance** = source of truth until the claim, protected by RLS; writes only via `SECURITY DEFINER` / `service_role`.
- **Anti-abuse**: earn only fires on a **genuinely paid** invoice (not a draft); a per-user cap; reuse `device_trials` to prevent farming.

---

## 8. Implementation order (phases)

| Phase | Deliverable | Network | Risk |
|---|---|---|---|
| **0** | Off-chain ledger + refer & earn crediting `pending` | none (Supabase only) | low — already delivers "earn KYRT" without touching the blockchain |
| **1** | Embedded wallet + gasless claim | **devnet** | medium — pick a provider |
| **2** | Pay for the plan in KYRT with a discount | **devnet** | medium |
| **3** | Phantom graduation + buy more | devnet | low |
| **4** | Liquidity + real oracle + multisig → **mainnet** | **mainnet** | high — irreversible |
| **5** | Customer pays an invoice in KYRT/SOL | mainnet | niche |

> **Phase 0 can start right now** — it's just Supabase, no blockchain. The user starts *earning* KYRT (points) while the rest is being built. Once the on-chain side is ready, the balance "becomes" a real token on the claim.

---

## 9. Open decisions (for you)

1. **Embedded wallet provider** — Web3Auth (Flutter SDK ready) vs Para vs Magic. Determines the integration stack.
2. **Paying for the plan: burn or treasury?** — does paying for the plan in KYRT **burn** the token (deflation, aligns with the site) or return it to the treasury (recycling)? It has both economic and narrative implications.
3. **Economic model** — how much KYRT per referral, what the plan discount is, what the emission cap is. Needs a spreadsheet so it doesn't turn into a loss or runaway inflation.
4. **Custody** — embedded MPC (Web3Auth) is technically assisted self-custody; are you comfortable with that, or do you want a more custodial model at the start?
5. **Tax** — KYRT earned with a market value may be taxable income for the user; worth a note in the terms.

---

## 10. Connection to the ecosystem

The same ledger ($KYRT off-chain → claim → spend) is **cross-cutting**: Invoice is the first vertex (it already has real Stripe revenue to back the buyback), and Ledger/Money come later as new *sinks* and *distribution sources*. The onboarding designed here is the crypto entry point for the **entire** ecosystem, not just the invoice app.
