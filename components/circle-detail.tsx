"use client";

/**
 * A persisted, shareable Susu circle: read the rules, join, and contribute.
 * Circle metadata comes from the coordinator (/api/circles); all money movement
 * is on-chain, non-custodial, signed by each member.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { signingClient, tokenToMicro, microToToken, fetchVaultState } from "@/lib/flowvault";
import { walletExecutor } from "@/lib/wallet";
import { rulesEqual } from "@/lib/routing";
import { depositPostCondition } from "@/lib/postconditions";
import { schedule, contributionRules } from "@/lib/circle";
import { explorerTx, SAVE_LOCK_BLOCKS } from "@/lib/config";

type ApiMember = { name: string; address: string; reputation: number; joinedAt: number };
type ApiCircle = {
  id: string;
  name: string;
  contribution: string;
  save: string;
  seats: number;
  creator: string;
  createdAt: number;
  members: ApiMember[];
};

const short = (a: string) => (a ? `${a.slice(0, 5)}…${a.slice(-4)}` : "");

export default function CircleDetail({ id }: { id: string }) {
  const { address, connect, disconnect, connecting } = useWallet();
  const [circle, setCircle] = useState<ApiCircle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRound, setActiveRound] = useState(0);
  const [joinName, setJoinName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [txs, setTxs] = useState<{ label: string; txId: string }[]>([]);
  const [myVault, setMyVault] = useState<Awaited<ReturnType<typeof fetchVaultState>> | null>(null);
  const [saveAmount, setSaveAmount] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/circles/${id}`);
      setCircle(res.ok ? (await res.json()).circle : null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!address) {
      setMyVault(null);
      return;
    }
    fetchVaultState(address)
      .then(setMyVault)
      .catch(() => setMyVault(null));
  }, [address]);

  const rounds = useMemo(
    () => (circle ? schedule({ members: circle.members, contribution: circle.contribution, save: circle.save }) : []),
    [circle],
  );
  const round = rounds[activeRound];
  const potFull = circle ? (circle.seats - 1) * Number(circle.contribution) : 0;
  const isMember = !!circle && !!address && circle.members.some((m) => m.address === address);
  const isFull = !!circle && circle.members.length >= circle.seats;

  const myRole = useMemo<"recipient" | "contributor" | "outsider" | "none">(() => {
    if (!address || !round) return "none";
    if (round.recipient.address === address) return "recipient";
    if (round.contributors.some((c) => c.address === address)) return "contributor";
    return "outsider";
  }, [address, round]);

  const share = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const join = async () => {
    if (!address) return;
    setError(null);
    setBusy("join");
    try {
      const res = await fetch(`/api/circles/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, name: joinName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");
      setCircle(data.circle);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join");
    } finally {
      setBusy(null);
    }
  };

  const contribute = async () => {
    if (!address || !circle || !round?.recipient.address) return;
    setError(null);
    setBusy("contribute");
    try {
      const duesMicro = tokenToMicro(circle.contribution);
      const saveStr = saveAmount.trim() || circle.save || "0";
      const saveMicro = tokenToMicro(saveStr);
      const amountMicro = duesMicro + saveMicro;
      const client = signingClient(address, walletExecutor);
      const state = await fetchVaultState(address);
      const lockUntilBlock = state.currentBlock + SAVE_LOCK_BLOCKS;
      const rules = contributionRules(round.recipient.address, duesMicro, saveMicro, lockUntilBlock);
      if (!rulesEqual(state.routingRules, rules)) {
        await client.setRoutingRules(rules);
      }
      const tx = await client.deposit(amountMicro, {
        postConditionMode: "allow",
        postConditions: [depositPostCondition(address, amountMicro)],
      });
      setTxs((t) => [
        {
          label: `${circle.contribution} dues → ${round.recipient.name} + ${saveStr} locked (round ${activeRound + 1})`,
          txId: tx.txId,
        },
        ...t,
      ]);
      fetchVaultState(address).then(setMyVault).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Contribution failed");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <main className="mx-auto max-w-4xl px-6 py-20 text-[var(--muted)]">Loading circle…</main>;
  if (!circle)
    return (
      <main className="mx-auto max-w-4xl px-6 py-20 text-center text-[var(--muted)]">
        Circle not found. <a href="/create" className="text-[var(--brand)] hover:underline">Start one →</a>
      </main>
    );

  const effectiveSave = saveAmount.trim() || circle.save || "0";

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{circle.name}</h1>
          <p className="text-sm text-[var(--muted)]">
            {Number(circle.contribution)} USDCx / round · pot {potFull} USDCx · {circle.members.length}/{circle.seats} seats
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={share} className="glass glass-hover rounded-lg px-3 py-1.5">
            {copied ? "Link copied ✓" : "Share invite"}
          </button>
          {address ? (
            <button onClick={disconnect} className="rounded-lg px-3 py-1.5 text-[var(--muted)] hover:text-white">
              {short(address)} · disconnect
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="rounded-lg bg-[var(--brand)] px-3 py-1.5 font-medium text-black hover:brightness-110 disabled:opacity-50"
            >
              {connecting ? "…" : "Connect"}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mt-6 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Rules */}
      <section className="glass mt-8 rounded-2xl p-5 text-sm text-[var(--muted)]">
        <h2 className="font-medium text-[var(--foreground)]">The rules</h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Each round, everyone contributes {Number(circle.contribution)} USDCx; one member receives the pot.</li>
          <li>Payouts are <strong>direct splits</strong> — funds never pool in any contract.</li>
          <li>Seating is <strong>trust-tiered</strong>: the newest member is seated last, where they cannot default.</li>
          <li>Non-custodial — you sign every contribution yourself.</li>
        </ul>
      </section>

      {/* Join */}
      {!isMember && (
        <section className="glass mt-6 rounded-2xl p-5">
          {isFull ? (
            <p className="text-sm text-[var(--muted)]">This circle is full ({circle.seats} seats).</p>
          ) : !address ? (
            <button
              onClick={connect}
              disabled={connecting}
              className="rounded-xl bg-[var(--brand)] px-4 py-2 font-medium text-black hover:brightness-110 disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect wallet to join"}
            </button>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-[var(--muted)]">Your display name</span>
                <input
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Chidi"
                  className="rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm"
                />
              </label>
              <button
                onClick={join}
                disabled={busy === "join"}
                className="rounded-xl bg-[var(--brand)] px-4 py-2 font-medium text-black hover:brightness-110 disabled:opacity-50"
              >
                {busy === "join" ? "Joining…" : "Join this circle"}
              </button>
              <span className="text-xs text-[var(--muted)]">You&apos;ll join as the newest member — seated last.</span>
            </div>
          )}
        </section>
      )}

      {/* Schedule board */}
      <section className="mt-6">
        <h2 className="font-medium">Schedule</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rounds.map((r) => {
            const safe = r.exposureAfter === 0;
            return (
              <div
                key={r.index}
                className={`glass rounded-2xl p-4 ${safe ? "ring-1 ring-emerald-500/40" : ""} ${
                  activeRound === r.index ? "ring-2 ring-[var(--brand)]" : ""
                }`}
              >
                <div className="text-xs text-[var(--muted)]">Round {r.index + 1}</div>
                <div className="mt-1 text-lg font-semibold">{r.recipient.name}</div>
                <div className="text-xs text-[var(--muted)]">receives the pot</div>
                <div
                  className={`mt-3 rounded-lg px-2 py-1.5 text-xs ${
                    safe ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"
                  }`}
                >
                  {safe
                    ? "✓ Cannot default — fully paid in before receiving"
                    : `owes ${r.exposureAfter} more after receiving`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Round runner */}
      {isMember && round && (
        <section className="glass mt-6 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">Run a round:</h2>
            {rounds.map((r) => (
              <button
                key={r.index}
                onClick={() => setActiveRound(r.index)}
                className={`rounded-md px-3 py-1 text-sm ${
                  activeRound === r.index ? "bg-[var(--brand)] text-black" : "border border-[var(--surface-border)]"
                }`}
              >
                {r.index + 1}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Round {activeRound + 1}: <span className="text-[var(--foreground)]">{round.recipient.name}</span> receives.
          </p>
          {myRole === "contributor" ? (
            <div className="mt-3 space-y-2">
              <label className="block text-sm text-[var(--muted)]">
                Your savings this round (USDCx — locked for you):
                <input
                  value={saveAmount}
                  onChange={(e) => setSaveAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder={circle.save}
                  className="ml-2 w-24 rounded-md border border-[var(--surface-border)] bg-transparent px-2 py-1 text-sm text-[var(--foreground)]"
                />
              </label>
              <p className="text-sm text-[var(--muted)]">
                One deposit of{" "}
                <strong className="text-[var(--foreground)]">
                  {Number(circle.contribution) + Number(effectiveSave)} USDCx
                </strong>
                : {circle.contribution} dues (equal for all) → {round.recipient.name}, {effectiveSave} locked as your
                savings.
              </p>
              <button
                onClick={contribute}
                disabled={!!busy}
                className="rounded-xl bg-[var(--brand)] px-4 py-2 font-medium text-black hover:brightness-110 disabled:opacity-50"
              >
                {busy === "contribute" ? "Signing…" : "Contribute"}
              </button>
            </div>
          ) : myRole === "recipient" ? (
            <p className="mt-3 text-emerald-400">You receive this round — contributions arrive in your wallet.</p>
          ) : (
            <p className="mt-3 text-[var(--muted)]">You&apos;re not a contributor this round.</p>
          )}
        </section>
      )}

      {isMember && myVault && myVault.lockedBalance > 0 && (
        <section className="glass mt-6 rounded-2xl p-5">
          <h2 className="font-medium">Your savings</h2>
          <p className="mt-2 text-sm">
            🔒 <strong>{microToToken(myVault.lockedBalance)} USDCx</strong> locked until block #
            {myVault.lockUntilBlock}. No early-unlock exists — not even you can withdraw it early. It frees when the
            lock expires.
          </p>
        </section>
      )}

      {txs.length > 0 && (
        <section className="glass mt-6 rounded-2xl p-5">
          <h2 className="font-medium">Contributions</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {txs.map((t) => (
              <li key={t.txId} className="flex items-center justify-between">
                <span className="text-[var(--muted)]">{t.label}</span>
                <a href={explorerTx(t.txId)} target="_blank" rel="noreferrer" className="font-mono text-[var(--brand)] hover:underline">
                  {short(t.txId)} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
