# Demo script (~90 seconds)

The video lands **one idea** — *the newest member is seated where they
structurally cannot default* — and shows that **every contribution also saves for
you.** Real testnet transactions throughout; keep a Hiro explorer tab open.

**Setup:** 3 funded testnet accounts in Leather (Amara, Bola, Chidi), each with
USDCx + STX. Create a circle (`/create`) and fill their addresses, or open one at
`/c/<id>`.

---

### 0:00 – 0:12 · The problem
> "Susus — rotating savings circles — are how a billion people save. Everyone pays
> in each round; each round one person takes the pot. The problem is always the
> same: whoever collects early can just stop paying. Every on-chain version has
> died on exactly this."

### 0:12 – 0:42 · One contribution, three primitives
Connect as Bola. It's Amara's round. Hit **Contribute** (the panel shows the
breakdown: dues → Amara, savings locked).
> "When Bola pays, it's a *single deposit* that does three things at once: her dues
> **split** straight to Amara, a savings slice **locks** for Bola herself, and the
> rest she **holds**."

Sign. Cut to the explorer: the dues landed in Amara's wallet — a pass-through
split, nothing pooled. Back in the app, the **Your savings** panel shows Bola's
locked amount.
> "And here's her savings — locked. No early-unlock function exists, not even for
> her. She saved *while* paying into the club."

### 0:42 – 1:05 · The lever (the climax)
Show the schedule board: Amara, Bola, **Chidi** (newcomer), and point at Chidi's
green **"Cannot default"** badge.
> "Members are seated by reputation. Chidi is new, so he's seated **last** — and by
> the time he collects, he's already paid every round. He has nothing left to walk
> away from. Default isn't punished; it's made **structurally impossible** for the
> person most likely to do it."

Edit Chidi's reputation up; the board re-orders live.
> "Earn trust, move up. The schedule does the enforcement the contract can't."

### 1:05 – 1:25 · It's real money
Switch to Chidi → **Contribute** → sign.
> "Every contribution is a real pass-through split — paid directly, nothing pooled,
> so nothing can be drained — plus a lock that saves for the payer."

Cut to the explorer: the split landing.

### 1:25 – 1:35 · Close
> "Susu: a rotating circle where every payment also force-saves for you, and the
> newest person is seated so they can't default. We also found and privately
> disclosed a vulnerability in FlowVault; Susu is architected around it."

---

## Beats checklist
- [ ] One contribution shown using split + lock + hold
- [ ] Locked savings with no early-unlock (the irreversibility beat)
- [ ] Chidi pinned last + "cannot default" badge (**the climax**)
- [ ] Reputation edit re-orders the board
- [ ] A real pass-through contribution tx on the explorer
