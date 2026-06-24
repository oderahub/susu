/**
 * The Ratchet spine: pay-yourself-last routing math.
 *
 * Turns a deposit + a split/lock allocation into the FlowVault `RoutingRules`
 * the contract expects, in micro-units, with every contract constraint checked
 * client-side so we fail with a readable message instead of an opaque revert.
 *
 * Contract invariants enforced here (verified against flowvault-v2.clar):
 *   - splitAmount ≤ amount, lockAmount ≤ amount
 *   - splitAmount + lockAmount ≤ amount
 *   - lockAmount ≤ hold  (hold = amount − splitAmount)   [ERR-LOCK-EXCEEDS-HOLD]
 *   - splitAddress required & ≠ self when splitAmount > 0 [ERR-SPLIT-TO-SELF]
 *   - lockUntilBlock > currentBlock when lockAmount > 0   [ERR-INVALID-LOCK-BLOCK]
 */
import type { RoutingRules } from "flowvault-sdk";

const BIPS = 10_000n;

export interface StrategyInput {
  /** Deposit amount in micro-units. */
  depositMicro: bigint;
  /** Portion split to a third party, in basis points (0–10000). */
  splitBips: number;
  /** Portion locked irreversibly, in basis points (0–10000). */
  lockBips: number;
  /** Recipient of the split. Required (and ≠ self) when splitBips > 0. */
  splitAddress: string | null;
  /** Caller's own address, so we reject split-to-self before the chain does. */
  selfAddress?: string;
  /** Block height the lock holds until. Required (> currentBlock) when lockBips > 0. */
  lockUntilBlock: number;
  /** Current block height, for future-lock validation when provided. */
  currentBlock?: number;
}

export interface StrategyBreakdown {
  /** Leaves the vault immediately to `splitAddress`. */
  splitMicro: bigint;
  /** Stays in the vault, irreversibly locked until `lockUntilBlock`. */
  lockMicro: bigint;
  /** Stays in the vault (locked + liquid). */
  holdMicro: bigint;
  /** Stays in the vault and is withdrawable now. */
  liquidMicro: bigint;
}

export interface Strategy {
  rules: RoutingRules;
  breakdown: StrategyBreakdown;
}

function assertBips(label: string, bips: number): void {
  if (!Number.isInteger(bips) || bips < 0 || bips > 10_000) {
    throw new Error(`${label} must be an integer between 0 and 10000 bips`);
  }
}

/**
 * Compute the on-chain routing rules for a "split X / lock Y / hold the rest"
 * strategy. Amounts are floored to whole micro-units; flooring keeps
 * lock+split ≤ deposit and lock ≤ hold by construction.
 */
export function computeStrategy(input: StrategyInput): Strategy {
  const {
    depositMicro,
    splitBips,
    lockBips,
    splitAddress,
    selfAddress,
    lockUntilBlock,
    currentBlock,
  } = input;

  if (depositMicro <= 0n) throw new Error("Deposit must be greater than zero");
  assertBips("Split", splitBips);
  assertBips("Lock", lockBips);
  if (splitBips + lockBips > 10_000) {
    throw new Error("Split + lock cannot exceed 100% of the deposit");
  }

  const splitMicro = (depositMicro * BigInt(splitBips)) / BIPS;
  const lockMicro = (depositMicro * BigInt(lockBips)) / BIPS;
  const holdMicro = depositMicro - splitMicro;
  const liquidMicro = holdMicro - lockMicro;

  if (splitMicro > 0n) {
    if (!splitAddress) throw new Error("A split recipient is required when splitting");
    if (selfAddress && splitAddress === selfAddress) {
      throw new Error("Split recipient cannot be your own address (split-to-self)");
    }
  }
  if (lockMicro > 0n) {
    if (!Number.isInteger(lockUntilBlock) || lockUntilBlock <= 0) {
      throw new Error("A future lock block is required when locking");
    }
    if (currentBlock !== undefined && lockUntilBlock <= currentBlock) {
      throw new Error("Lock block must be in the future");
    }
  }

  const rules: RoutingRules = {
    lockAmount: lockMicro,
    lockUntilBlock: lockMicro > 0n ? lockUntilBlock : 0,
    splitAddress: splitMicro > 0n ? splitAddress : null,
    splitAmount: splitMicro,
  };

  return { rules, breakdown: { splitMicro, lockMicro, holdMicro, liquidMicro } };
}

/** Convert basis points to a display percentage, e.g. 2500 → "25%". */
export const bipsToPct = (bips: number): string => `${bips / 100}%`;

/**
 * True when on-chain rules already equal the rules we're about to set — lets us
 * skip the `set-routing-rules` signature and deposit in one signature.
 */
export function rulesEqual(a: RoutingRules | null, b: RoutingRules): boolean {
  if (!a) return false;
  return (
    String(a.lockAmount) === String(b.lockAmount) &&
    a.lockUntilBlock === b.lockUntilBlock &&
    (a.splitAddress ?? null) === (b.splitAddress ?? null) &&
    String(a.splitAmount) === String(b.splitAmount)
  );
}
