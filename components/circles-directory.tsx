"use client";

/** The directory: browse open circles and join, or start your own. */
import { useEffect, useState } from "react";
import Link from "next/link";

type ApiCircle = {
  id: string;
  name: string;
  contribution: string;
  save: string;
  seats: number;
  members: { address: string; name: string }[];
  createdAt: number;
};

export default function CirclesDirectory() {
  const [circles, setCircles] = useState<ApiCircle[] | null>(null);

  useEffect(() => {
    fetch("/api/circles")
      .then((r) => r.json())
      .then((d) => setCircles(d.circles ?? []))
      .catch(() => setCircles([]));
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Circles</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Browse open circles and join — or start your own.</p>
        </div>
        <Link
          href="/create"
          className="rounded-xl bg-[var(--brand)] px-4 py-2 font-medium text-black transition hover:brightness-110"
        >
          Create circle
        </Link>
      </div>

      {circles === null ? (
        <p className="mt-12 text-[var(--muted)]">Loading…</p>
      ) : circles.length === 0 ? (
        <div className="glass mt-10 rounded-2xl p-12 text-center text-[var(--muted)]">
          No circles yet.{" "}
          <Link href="/create" className="text-[var(--brand)] hover:underline">
            Start the first one →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {circles.map((c) => {
            const full = c.members.length >= c.seats;
            const spotsLeft = Math.max(0, c.seats - c.members.length);
            const pot = (c.seats - 1) * Number(c.contribution);
            const totalSave = (c.seats - 1) * Number(c.save || 0);
            const names = c.members.map((m) => m.name).filter(Boolean);
            return (
              <Link key={c.id} href={`/c/${c.id}`} className="glass glass-hover block rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate font-medium">{c.name}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      full ? "bg-neutral-700 text-neutral-300" : "bg-emerald-900/40 text-emerald-300"
                    }`}
                  >
                    {full ? "full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-2xl font-semibold text-[var(--brand)]">{pot} USDCx</div>
                  <div className="text-xs text-[var(--muted)]">pot you collect on your turn</div>
                </div>

                <dl className="mt-4 space-y-1 text-sm text-[var(--muted)]">
                  <div className="flex justify-between">
                    <dt>Dues / round</dt>
                    <dd>{Number(c.contribution)} USDCx</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Savings / round</dt>
                    <dd>{Number(c.save || 0)} USDCx locked</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Members</dt>
                    <dd>
                      {c.members.length}/{c.seats}
                    </dd>
                  </div>
                </dl>

                {totalSave > 0 && (
                  <div className="mt-3 rounded-lg bg-emerald-900/20 px-2 py-1.5 text-xs text-emerald-300">
                    + build {totalSave} USDCx in savings for yourself over the circle
                  </div>
                )}

                {names.length > 0 && (
                  <p className="mt-3 truncate text-xs text-[var(--muted)]">
                    with {names.slice(0, 3).join(", ")}
                    {names.length > 3 ? ` +${names.length - 3}` : ""}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
