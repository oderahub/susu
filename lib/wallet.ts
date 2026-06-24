"use client";

/**
 * Wallet glue for @stacks/connect v8 (Leather / Xverse).
 *
 * Susu is non-custodial: every state-changing call is signed by the user's own
 * wallet. `walletExecutor` is handed to the FlowVault SDK so its
 * setRoutingRules / deposit / withdraw calls open the wallet instead of using a
 * private key.
 */
import {
  connect as stacksConnect,
  disconnect as stacksDisconnect,
  getLocalStorage,
  isConnected,
  request,
} from "@stacks/connect";
import { PostConditionMode, type ContractIdString } from "@stacks/transactions";
import type { ContractCallExecutor } from "flowvault-sdk";

/** The connected Stacks (STX) address, or null if not connected. */
export function getStxAddress(): string | null {
  return getLocalStorage()?.addresses?.stx?.[0]?.address ?? null;
}

export function isWalletConnected(): boolean {
  return isConnected() && !!getStxAddress();
}

/** Open the wallet picker and connect. Returns the STX address on success. */
export async function connectWallet(): Promise<string | null> {
  await stacksConnect();
  return getStxAddress();
}

export function disconnectWallet(): void {
  stacksDisconnect();
}

/**
 * The SDK hands us a @stacks/transactions `PostConditionMode` enum value
 * (Allow = 1 / Deny = 2), but @stacks/connect's `request` wants the string name
 * "allow"/"deny". Normalize both representations (and pass-through strings).
 */
function toPcModeName(mode: unknown): "allow" | "deny" | undefined {
  if (mode === "allow" || mode === PostConditionMode.Allow) return "allow";
  if (mode === "deny" || mode === PostConditionMode.Deny) return "deny";
  return undefined;
}

/**
 * FlowVault SDK executor → routes a contract call to the connected wallet via
 * the SIP-030 `stx_callContract` RPC. The SDK reads `.txid` off the result.
 */
export const walletExecutor: ContractCallExecutor = async (req) => {
  const postConditionMode = toPcModeName(req.postConditionMode);
  return request("stx_callContract", {
    contract: `${req.contractAddress}.${req.contractName}` as ContractIdString,
    functionName: req.functionName,
    functionArgs: req.functionArgs,
    network: req.network,
    ...(req.postConditions ? { postConditions: req.postConditions } : {}),
    ...(postConditionMode ? { postConditionMode } : {}),
  });
};
