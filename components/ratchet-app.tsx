"use client";

/**
 * Phase 1 — the Ratchet spine.
 *
 * Connect a wallet → set a split/lock/hold strategy → deposit → watch the live
 * vault buckets → withdraw. This is a complete, demoable submission on its own,
 * and the same engine the Susu circle layers on top of.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { VaultState } from "flowvault-sdk";
import { signingClient, tokenToMicro, microToToken, fetchVaultState } from "@/lib/flowvault";
import { computeStrategy, rulesEqual } from "@/lib/routing";
import { depositPostCondition } from "@/lib/postconditions";
import {
  connectWallet,
  disconnectWallet,
  getStxAddress,
  walletExecutor,
} from "@/lib/wallet";
import { APPROX_SECONDS_PER_BLOCK, explorerAddress, explorerTx, VAULT_CONTRACT_ID } from "@/lib/config";

const short = (a: string) => `${a.slice(0, 5)}…${a.slice(-4)}`;
const fmt = (micro: number | bigint) => {
  const n = Number(microToToken(typeof micro === "bigint" ? micro : Math.trunc(micro)));
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
};
const approxTime = (blocks: number) => {
  const secs = blocks * APPROX_SECONDS_PER_BLOCK;
  if (secs < 3600) return `~${Math.round(secs / 60)} min`;
  if (secs < 86400) return `~${Math.round(secs / 3600)} hr`;
  return `~${Math.round(secs / 86400)} d`;
};

type TxNote = { label: string; txId: string };

export default function RatchetApp() {
  const [address, setAddress] = useState<string | null>(null);
  const [vault, setVault] = useState<VaultState | null>(null);
  const [loadingVault, setLoadingVault] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txs, setTxs] = useState<TxNote[]>([]);

  // strategy form
  const [depositAmount, setDepositAmount] = useState("100");
  const [splitPct, setSplitPct] = useState(20);
  const [lockPct, setLockPct] = useState(60);
  const [splitAddress, setSplitAddress] = useState("");
  const [lockBlocks, setLockBlocks] = useState(30);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // restore session
  useEffect(() => {
    setAddress(getStxAddress());
  }, []);

  const refreshVault = useCallback(async (addr: string) => {
    setLoadingVault(true);
    try {
      const state = await fetchVaultState(addr);
      setVault(state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read vault state");
    } finally {
      setLoadingVault(false);
    }
  }, []);

  // load + poll vault state while connected
  useEffect(() => {
    if (!address) return;
    refreshVault(address);
    const id = setInterval(() => refreshVault(address), 15_000);
    return () => clearInterval(id);
  }, [address, refreshVault]);

  const onConnect = async () => {
    setError(null);
    try {
      setBusy("connect");
      setAddress(await connectWallet());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet connection failed");
    } finally {
      setBusy(null);
    }
  };

  const onDisconnect = () => {
    disconnectWallet();
    setAddress(null);
    setVault(null);
    setTxs([]);
  };

  // live preview of the three buckets
  const preview = useMemo(() => {
    let amt = 0n;
    try {
      amt = tokenToMicro(depositAmount || "0");
    } catch {
      amt = 0n;
    }
    const split = (amt * BigInt(Math.round(splitPct * 100))) / 10_000n;
    const lock = (amt * BigInt(Math.round(lockPct * 100))) / 10_000n;
    const hold = amt - split;
    const liquid = hold - lock;
    return { amt, split, lock, liquid, valid: liquid >= 0n && splitPct + lockPct <= 100 };
  }, [depositAmount, splitPct, lockPct]);

  const onDeposit = async () => {
    if (!address) return;
    setError(null);
    try {
      const amountMicro = tokenToMicro(depositAmount);
      const client = signingClient(address, walletExecutor);

      setBusy("blocks");
      const state = await fetchVaultState(address);
      const currentBlock = state.currentBlock;
      const lockUntilBlock = currentBlock + Number(lockBlocks);

      const { rules } = computeStrategy({
        depositMicro: amountMicro,
        splitBips: Math.round(splitPct * 100),
        lockBips: Math.round(lockPct * 100),
        splitAddress: splitAddress.trim() || null,
        selfAddress: address,
        lockUntilBlock,
        currentBlock,
      });

      // One-signature path: only (re)set rules if the on-chain rules differ.
      if (!rulesEqual(state.routingRules, rules)) {
        setBusy("rules");
        const rulesTx = await client.setRoutingRules(rules);
        setTxs((t) => [{ label: "Set routing rules", txId: rulesTx.txId }, ...t]);
      }

      setBusy("deposit");
      // willSendEq post-condition: the wallet shows (and the chain enforces) that
      // exactly `amountMicro` leaves the depositor. "allow" mode lets the
      // contract → recipient split transfer through alongside it.
      const depositTx = await client.deposit(amountMicro, {
        postConditionMode: "allow",
        postConditions: [depositPostCondition(address, amountMicro)],
      });
      setTxs((t) => [{ label: `Deposit ${depositAmount} USDCx`, txId: depositTx.txId }, ...t]);

      // give the chain a moment, then refresh
      setTimeout(() => refreshVault(address), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deposit failed");
    } finally {
      setBusy(null);
    }
  };

  const onWithdraw = async () => {
    if (!address) return;
    setError(null);
    try {
      const client = signingClient(address, walletExecutor);
      setBusy("withdraw");
      const tx = await client.withdraw(tokenToMicro(withdrawAmount), { postConditionMode: "allow" });
      setTxs((t) => [{ label: `Withdraw ${withdrawAmount} USDCx`, txId: tx.txId }, ...t]);
      setTimeout(() => refreshVault(address), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Withdraw failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Susu · Ratchet spine</h1>
          <p className="text-sm text-neutral-500">
            Pay yourself last — split, lock irreversibly, hold the rest. One deposit.
          </p>
        </div>
        {address ? (
          <div className="flex items-center gap-3 text-sm">
            <a
              href={explorerAddress(address)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-neutral-100 px-3 py-1 font-mono dark:bg-neutral-800"
            >
              {short(address)}
            </a>
            <button onClick={onDisconnect} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            disabled={busy === "connect"}
            className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {busy === "connect" ? "Connecting…" : "Connect wallet"}
          </button>
        )}
      </header>

      {error && (
        <div className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {!address ? (
        <div className="mt-16 rounded-2xl border border-dashed border-neutral-300 py-20 text-center text-neutral-500 dark:border-neutral-700">
          Connect a testnet wallet (Leather / Xverse) to begin.
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Strategy + deposit */}
          <section className="glass rounded-2xl p-5">
            <h2 className="font-medium">Set your strategy &amp; deposit</h2>

            <label className="mt-4 block text-sm text-neutral-500">Deposit (USDCx)</label>
            <input
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
            />

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-500">Split %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={splitPct}
                  onChange={(e) => setSplitPct(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-500">Lock %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={lockPct}
                  onChange={(e) => setLockPct(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
                />
              </div>
            </div>

            <label className="mt-4 block text-sm text-neutral-500">
              Split recipient {splitPct > 0 ? "(required)" : "(optional)"}
            </label>
            <input
              value={splitAddress}
              onChange={(e) => setSplitAddress(e.target.value)}
              placeholder="ST… address"
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-neutral-700"
            />

            <label className="mt-4 block text-sm text-neutral-500">
              Lock duration: {lockBlocks} blocks ({approxTime(lockBlocks)})
            </label>
            <input
              type="range"
              min={1}
              max={300}
              value={lockBlocks}
              onChange={(e) => setLockBlocks(Number(e.target.value))}
              className="mt-2 w-full accent-amber-500"
            />

            {/* live buckets */}
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
              <Bucket label="Split → away" value={fmt(preview.split)} tone="rose" />
              <Bucket label="Locked" value={fmt(preview.lock)} tone="amber" />
              <Bucket label="Liquid" value={fmt(preview.liquid)} tone="emerald" />
            </div>

            <button
              onClick={onDeposit}
              disabled={!!busy || !preview.valid || preview.amt <= 0n}
              className="mt-5 w-full rounded-lg bg-amber-500 px-4 py-2 font-medium text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {busy === "blocks"
                ? "Reading block height…"
                : busy === "rules"
                ? "Sign: set routing rules…"
                : busy === "deposit"
                ? "Sign: deposit…"
                : "Set rules + deposit"}
            </button>
            {!preview.valid && (
              <p className="mt-2 text-xs text-red-500">Split + lock cannot exceed 100%.</p>
            )}
          </section>

          {/* Vault dashboard */}
          <section className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Your vault</h2>
              <button
                onClick={() => address && refreshVault(address)}
                className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                {loadingVault ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {vault ? (
              <>
                <div className="mt-4 space-y-2 text-sm">
                  <Row label="Total balance" value={`${fmt(vault.totalBalance)} USDCx`} />
                  <Row label="Locked" value={`${fmt(vault.lockedBalance)} USDCx`} tone="amber" />
                  <Row label="Unlocked" value={`${fmt(vault.unlockedBalance)} USDCx`} tone="emerald" />
                  <Row label="Lock until block" value={vault.lockUntilBlock ? `#${vault.lockUntilBlock}` : "—"} />
                  <Row label="Current block" value={`#${vault.currentBlock}`} />
                </div>

                {vault.lockedBalance > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                    🔒 {fmt(vault.lockedBalance)} USDCx is locked until block #{vault.lockUntilBlock}. There is no
                    early-unlock function — not even you can withdraw it early.
                  </div>
                )}

                <div className="mt-5">
                  <label className="block text-sm text-neutral-500">Withdraw unlocked (USDCx)</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      inputMode="decimal"
                      placeholder={microToToken(vault.unlockedBalance)}
                      className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
                    />
                    <button
                      onClick={onWithdraw}
                      disabled={!!busy || !withdrawAmount}
                      className="rounded-lg border border-neutral-300 px-4 py-2 font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      {busy === "withdraw" ? "Signing…" : "Withdraw"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">{loadingVault ? "Loading…" : "No vault yet — make a deposit."}</p>
            )}
          </section>
        </div>
      )}

      {txs.length > 0 && (
        <section className="mt-6 glass rounded-2xl p-5">
          <h2 className="font-medium">Transactions</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {txs.map((t) => (
              <li key={t.txId} className="flex items-center justify-between">
                <span className="text-neutral-500">{t.label}</span>
                <a href={explorerTx(t.txId)} target="_blank" rel="noreferrer" className="font-mono text-amber-600 hover:underline">
                  {short(t.txId)} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-10 text-center text-xs text-neutral-400">
        Non-custodial · you sign every transaction · contract{" "}
        <span className="font-mono">{VAULT_CONTRACT_ID}</span> on testnet
      </footer>
    </main>
  );
}

function Bucket({ label, value, tone }: { label: string; value: string; tone: "rose" | "amber" | "emerald" }) {
  const toneClass = {
    rose: "border-rose-300 text-rose-600 dark:border-rose-900",
    amber: "border-amber-300 text-amber-600 dark:border-amber-900",
    emerald: "border-emerald-300 text-emerald-600 dark:border-emerald-900",
  }[tone];
  return (
    <div className={`rounded-lg border ${toneClass} px-2 py-3`}>
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "amber" | "emerald" }) {
  const toneClass = tone === "amber" ? "text-amber-600" : tone === "emerald" ? "text-emerald-600" : "";
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 pb-1 dark:border-neutral-800">
      <span className="text-neutral-500">{label}</span>
      <span className={`font-medium ${toneClass}`}>{value}</span>
    </div>
  );
}
