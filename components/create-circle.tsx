"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";

const short = (a: string) => `${a.slice(0, 5)}…${a.slice(-4)}`;

export default function CreateCircle() {
  const { address, connect, connecting } = useWallet();
  const router = useRouter();
  const [name, setName] = useState("Lagos Builders");
  const [contribution, setContribution] = useState("1");
  const [save, setSave] = useState("1");
  const [seats, setSeats] = useState(3);
  const [creatorName, setCreatorName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputCls =
    "w-full rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm";

  const create = async () => {
    if (!address) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contribution, save, seats, creator: address, creatorName: creatorName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create circle");
      router.push(`/c/${data.circle.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create circle");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Start a circle</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Set the terms, then share the link. Members join, read the rules, and contribute each round —
        and the newest member is seated where they can&apos;t default.
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="glass mt-8 space-y-4 rounded-2xl p-6">
        <Field label="Circle name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Dues / round (USDCx → pot)">
            <input value={contribution} onChange={(e) => setContribution(e.target.value)} inputMode="decimal" className={inputCls} />
          </Field>
          <Field label="Savings / round (locked for you)">
            <input value={save} onChange={(e) => setSave(e.target.value)} inputMode="decimal" className={inputCls} />
          </Field>
        </div>
        <p className="-mt-1 text-xs text-[var(--muted)]">
          Each contribution is one deposit: your <strong>dues</strong> split to the round&apos;s recipient, your{" "}
          <strong>savings</strong> lock for you — save together and for yourself.
        </p>

        <Field label="Seats">
          <input
            type="number"
            min={2}
            max={12}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            className={inputCls}
          />
        </Field>

        <Field label="Your display name (optional)">
          <input
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            placeholder="Organizer"
            className={inputCls}
          />
        </Field>

        <div className="pt-2">
          {address ? (
            <button
              onClick={create}
              disabled={busy || !name.trim()}
              className="w-full rounded-xl bg-[var(--brand)] px-4 py-2.5 font-medium text-black transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create circle"}
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="w-full rounded-xl bg-[var(--brand)] px-4 py-2.5 font-medium text-black transition hover:brightness-110 disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect wallet to create"}
            </button>
          )}
          {address && (
            <p className="mt-2 text-center text-xs text-[var(--muted)]">
              You&apos;ll be the organizer ({short(address)}) and the first member.
            </p>
          )}
        </div>
      </div>

    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}
