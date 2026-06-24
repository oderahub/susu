# Susu — reputation-tiered rotating savings on FlowVault

A rotating savings circle (**ajo / esusu / tanda / chama**) on Stacks, built on
[FlowVault](https://flow-vault.dev)'s programmable routing primitives.

> **The thesis:** every prior on-chain ROSCA died for the same reason — smart
> contracts can automate payouts but *can't enforce commitment*, so the first
> recipient takes the pot and stops contributing. Susu is the first on-chain
> circle that **doesn't pretend code can enforce contributions.** Instead it
> *tiers and prices* default risk the way real bidding-ROSCAs do — and seats the
> newcomer where they **structurally cannot default.**

Built for the **FlowVault Builder Bounty** · category *Experimental Money
Behaviors*.

---

## What it does

A group takes turns receiving the pooled contributions — and **every contribution
also force-saves for the member who makes it.** Susu is *ajo where each payment
saves for you too.*

Each scheduled contribution is **one deposit that uses all three FlowVault
primitives at once:**

- **`split`** — your *dues* route straight to this round's recipient (the rotation).
- **`lock`** — a *personal savings* slice locks for **you** until a future block
  (self-only — no early-unlock exists, not even for you).
- **`hold`** — the remainder stays in your vault.

The newest member is **seated last**, where they've fully paid in before they
receive — so they structurally **cannot default.**

## Why it's novel — the default problem, solved by *ordering* not *code*

FlowVault's `lock` is self-only with no conditional release, so a bond can never
be seized from a defector. Default therefore **cannot be prevented** by
fund-mechanics — only made structurally impossible, priced, or irrational:

1. **Trust-tiered ordering** — a member in slot *k* still owes *(N−k−1)*
   contributions after receiving. The **last slot owes nothing → cannot default.**
   Newcomers go last; early slots are earned. *(This is the demo climax.)*
2. **Early-access premium** — taking an early slot costs a sunk `split` to the
   others, compensating them for the risk *(roadmap)*.
3. **Reputation** — default is a missing deposit event on-chain; completing
   circles builds history that gates bigger circles.
4. **Pot ≤ demonstrated reputation** — caps the max default gain.

## How it uses FlowVault (the 30% integration story)

We **compose the deployed `flowvault-v2` contract** via `flowvault-sdk` — we do
**not** deploy our own vault (that would be the "wallet wrapper" anti-pattern the
bounty discourages).

| Primitive | Role in every contribution |
|-----------|------|
| `split`   | your **dues**, routed to the round's recipient — pass-through (never pooled), destination computed per round by the schedule |
| `lock`    | your **personal savings**, locked to you (self-only, irreversible) until a future block |
| `hold`    | the remainder, kept in your own vault |

**Non-custodial:** every member signs their own deposits with their own wallet
(`@stacks/connect`). The coordinator only *reads* on-chain state and computes the
schedule — no keys, no custody.

## Security — disclosed, not hidden

During integration review we identified a vulnerability in the deployed FlowVault
contract and **disclosed it privately to the FlowVault team (2026-06-23).** Exploit
details are withheld until a fix lands, per responsible disclosure. Susu is
architected to avoid the affected path — money movement is **pass-through `split`**,
so funds never pool in the contract. See [`SECURITY.md`](./SECURITY.md).
*(Testnet — no real-money impact.)*

## Honest limitations

- A **one-shot circle of anonymous strangers** all wanting early slots is still
  vulnerable — that's the bootstrap problem of undercollateralized credit, not a
  FlowVault gap. Susu targets communities/acquaintances building reputation.
- The reputation **exit-scam** is *bounded* (by the pot ≤ reputation cap), not
  eliminated.
- The "circle" coordination is **off-chain**; the money and the routing are
  on-chain and verifiable.

## Run it

```bash
npm install
npm run dev          # → http://localhost:3000
```

Flow: `/` landing → `/circles` browse → `/create` → `/c/<id>` (your circle).

The schedule board and the *cannot-default* beat render with **zero funds**. To
run live transactions you need a **testnet** wallet (Leather / Xverse) with:
- **testnet STX** for fees — Hiro faucet / Leather's built-in faucet
- **testnet USDCx** — request from the FlowVault dev (their faucet is a Telegram
  DM; `protocol-mint` is role-gated)

For a live circle round, fund 2–3 testnet addresses and switch accounts to
contribute as each member (the app re-reads your active account on tab focus).

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind v4 · `flowvault-sdk` ·
`@stacks/connect` v8 · Stacks testnet (`flowvault-v2` / `usdcx`). Circle metadata
persists in Upstash Redis (in-memory fallback for local dev); all money movement
is on-chain and non-custodial.
