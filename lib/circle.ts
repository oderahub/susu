/**
 * Phase 2 — the Susu circle.
 *
 * Off-chain coordination over on-chain pass-through splits. The FlowVault
 * contract knows nothing about "circles"; this module computes the rotation
 * schedule, the trust-tiered slot order, and the per-round contribution routing.
 *
 * The demo climax lives in `exposureAfter`: a member in the LAST slot has no
 * contributions left to make after they receive, so they CANNOT default. New /
 * low-reputation members are placed last; early slots are earned. This is the
 * lever the contract can't enforce but the schedule can.
 */
import type { RoutingRules } from "flowvault-sdk";

export interface Member {
  address: string;
  /** Short display label, e.g. "A" or "Amara". */
  name: string;
  /** Completed circles. 0 = newcomer → forced to the last, default-proof slot. */
  reputation: number;
}

export interface Circle {
  members: Member[];
  /** Whole USDCx each member contributes per round. */
  contribution: string;
}

export interface Round {
  /** 0-based slot. */
  index: number;
  recipient: Member;
  contributors: Member[];
  /**
   * Contributions this member still owes AFTER receiving this round. 0 means
   * they have fully paid in before they receive → they cannot default.
   */
  exposureAfter: number;
}

/** Highest reputation first, newcomers (rep 0) last. Ties keep input order. */
export function slotOrder(members: Member[]): Member[] {
  return members
    .map((m, i) => ({ m, i }))
    .sort((a, b) => b.m.reputation - a.m.reputation || a.i - b.i)
    .map(({ m }) => m);
}

/** The full rotation: round k pays slotOrder[k]; everyone else contributes. */
export function schedule(circle: Circle): Round[] {
  const order = slotOrder(circle.members);
  const n = order.length;
  return order.map((recipient, index) => ({
    index,
    recipient,
    contributors: circle.members.filter((m) => m.address !== recipient.address),
    exposureAfter: n - 1 - index,
  }));
}

/**
 * Routing rules for one contribution: the full amount passes straight through to
 * the round's recipient (split = amount, nothing held, nothing locked, nothing
 * pooled — so it is insulated from the token-confusion drain in SECURITY.md).
 */
export function contributionRules(recipient: string, contributionMicro: bigint): RoutingRules {
  return {
    lockAmount: 0n,
    lockUntilBlock: 0,
    splitAddress: recipient,
    splitAmount: contributionMicro,
  };
}

/** A member who has never completed a circle — forced to the safe last slot. */
export const isNewcomer = (m: Member): boolean => m.reputation === 0;
