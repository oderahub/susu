import Link from "next/link";
import { Reveal } from "@/components/reveal";

const FEATURES = [
  {
    title: "Pay yourself last",
    body: "One deposit splits an obligation away, locks a reserve irreversibly, and holds the rest.",
  },
  {
    title: "Cannot default",
    body: "The least-trusted member is seated last — fully paid in before they receive. Default is made structurally impossible.",
    accent: true,
  },
  {
    title: "Pass-through & non-custodial",
    body: "Payouts are direct splits — nothing pools in the contract, and you sign every transaction yourself.",
  },
  {
    title: "Irreversible by design",
    body: "Locked funds have no early-unlock — not even you can pull them. Discipline enforced by math, not willpower.",
  },
  {
    title: "Reputation-tiered",
    body: "Earn trust by completing circles; reputation reorders the schedule and unlocks bigger pots.",
  },
  {
    title: "Found & disclosed",
    body: "During review we found and privately disclosed a vulnerability in FlowVault, and architected Susu to avoid the affected path.",
  },
];

export default function Home() {
  return (
    <main className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="mx-auto max-w-5xl px-6 pb-20 pt-24 text-center">
          <span className="glass float-in inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
            FlowVault Builder Bounty · Experimental Money Behaviors
          </span>

          <h1
            className="float-in mx-auto mt-6 max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            Rotating savings, where the newcomer{" "}
            <span className="gradient-text">can&apos;t default.</span>
          </h1>

          <p
            className="float-in mx-auto mt-6 max-w-xl text-lg text-[var(--muted)]"
            style={{ animationDelay: "120ms" }}
          >
            Susu is an on-chain ajo / esusu circle built on FlowVault. It stops pretending code can
            enforce trust — and seats people so the math does.
          </p>

          <div
            className="float-in mt-9 flex items-center justify-center gap-3"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              href="/create"
              className="rounded-xl bg-[var(--brand)] px-5 py-2.5 font-medium text-black transition hover:brightness-110"
            >
              Create a circle
            </Link>
            <Link href="/circles" className="glass glass-hover rounded-xl px-5 py-2.5 font-medium">
              Browse circles
            </Link>
          </div>
          <div className="float-in mt-4" style={{ animationDelay: "220ms" }}>
            <Link href="/spine" className="text-sm text-[var(--muted)] transition-colors hover:text-white">
              or try the solo Ratchet vault →
            </Link>
          </div>
        </div>
      </section>

      {/* Bento features */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div
                className={`glass glass-hover h-full rounded-2xl p-5 ${
                  f.accent ? "ring-1 ring-[var(--brand)]/40" : ""
                }`}
              >
                <h3 className={`font-medium ${f.accent ? "gradient-text" : ""}`}>{f.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-[var(--muted)]">
          The first on-chain rotating circle that doesn&apos;t pretend code enforces contributions —
          it tiers and prices the risk the way real bidding-ROSCAs always have.
        </p>
      </section>
    </main>
  );
}
