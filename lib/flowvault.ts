/**
 * Thin factory around the FlowVault SDK.
 *
 * Two client flavours:
 *  - `readClient()`     — no signing, used for getVaultState / reads.
 *  - `signingClient()`  — delegates signing to the connected wallet via an
 *                         @stacks/connect executor (see lib/wallet.ts). We never
 *                         hold a private key; Susu is non-custodial.
 */
import {
  FlowVault,
  tokenToMicro,
  microToToken,
  microToNumber,
  type ContractCallExecutor,
  type VaultState,
} from "flowvault-sdk";
import { NETWORK, CONTRACTS } from "./config";

const base = {
  network: NETWORK,
  contractAddress: CONTRACTS.contractAddress,
  contractName: CONTRACTS.contractName,
  tokenContractAddress: CONTRACTS.tokenContractAddress,
  tokenContractName: CONTRACTS.tokenContractName,
};

/** Read-only client. `senderAddress` is optional (used as simulated tx-sender). */
export function readClient(senderAddress?: string): FlowVault {
  return new FlowVault({ ...base, senderAddress });
}

/** Wallet-signing client — `executor` routes the call to the user's wallet. */
export function signingClient(
  senderAddress: string,
  executor: ContractCallExecutor,
): FlowVault {
  return new FlowVault({ ...base, senderAddress, contractCallExecutor: executor });
}

/**
 * Client-side helper: read vault state via our own /api/vault proxy rather than
 * hitting the Hiro RPC directly from the browser. The browser → RPC call trips
 * CORS (and rate-limit responses arrive without CORS headers); reading server-side
 * sidesteps both. Returns full VaultState (incl. currentBlock + routingRules).
 */
export async function fetchVaultState(address: string): Promise<VaultState> {
  const res = await fetch(`/api/vault/${address}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to read vault state");
  }
  return ((await res.json()) as { state: VaultState }).state;
}

export { tokenToMicro, microToToken, microToNumber };
export type { RoutingRules, VaultState } from "flowvault-sdk";
