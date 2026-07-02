"use client";

/**
 * Wallet glue for @stacks/connect v8 (Leather / Xverse) — non-custodial.
 *
 * Why we don't use `request("stx_callContract")`: connect serializes the
 * functionArgs with its own bundled Clarity helper, which breaks in the minified
 * production build ("Cl.serialize is not a function"). Instead we build AND
 * serialize the transaction here with @stacks/transactions v7, then hand the
 * wallet a ready-made tx via `stx_signTransaction` — which never touches
 * connect's serializer. Works in dev and prod alike.
 */
import {
  connect as stacksConnect,
  disconnect as stacksDisconnect,
  getLocalStorage,
  isConnected,
  request,
} from "@stacks/connect";
import { makeUnsignedContractCall, serializeTransaction, PostConditionMode } from "@stacks/transactions";
import type { ContractCallExecutor } from "flowvault-sdk";

let cachedPublicKey: string | null = null;

/** The connected Stacks (STX) address, or null if not connected. */
export function getStxAddress(): string | null {
  return getLocalStorage()?.addresses?.stx?.[0]?.address ?? null;
}

export function isWalletConnected(): boolean {
  return isConnected() && !!getStxAddress();
}

/** The STX entry (address starts with S) from a connect/getAddresses result. */
function stxEntry(addresses?: { address?: string; publicKey?: string }[]) {
  return addresses?.find((a) => a.address?.startsWith("S"));
}

/** Open the wallet picker and connect. Caches the STX public key for signing. */
export async function connectWallet(): Promise<string | null> {
  const res = await stacksConnect();
  const pk = stxEntry(res?.addresses)?.publicKey;
  if (pk) cachedPublicKey = pk;
  return getStxAddress();
}

export function disconnectWallet(): void {
  cachedPublicKey = null;
  stacksDisconnect();
}

/** The connected account's public key — needed to build the unsigned tx. */
async function getSenderPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey;
  const res = await request("stx_getAddresses");
  const pk = stxEntry(res?.addresses)?.publicKey;
  if (!pk) throw new Error("Could not read wallet public key");
  cachedPublicKey = pk;
  return pk;
}

function toPcMode(m: unknown): PostConditionMode {
  if (m === "allow" || m === PostConditionMode.Allow) return PostConditionMode.Allow;
  return PostConditionMode.Deny;
}

async function fetchNonce(address: string): Promise<bigint> {
  const res = await fetch(`/api/nonce/${address}`);
  if (!res.ok) throw new Error("Could not fetch nonce");
  const data = (await res.json()) as { nonce?: number };
  return BigInt(data.nonce ?? 0);
}

/**
 * FlowVault SDK executor. Builds + serializes the contract-call tx here (v7),
 * then signs + broadcasts via `stx_signTransaction`. The SDK reads `.txid` off
 * the result.
 */
export const walletExecutor: ContractCallExecutor = async (req) => {
  const senderAddress = getStxAddress();
  if (!senderAddress) throw new Error("Wallet not connected");

  const publicKey = await getSenderPublicKey();
  const nonce = await fetchNonce(senderAddress);

  const tx = await makeUnsignedContractCall({
    contractAddress: req.contractAddress,
    contractName: req.contractName,
    functionName: req.functionName,
    functionArgs: req.functionArgs,
    publicKey,
    network: req.network,
    nonce,
    fee: 10_000n,
    postConditions: req.postConditions,
    postConditionMode: toPcMode(req.postConditionMode),
  });

  const transaction = serializeTransaction(tx);

  // Sign only (broadcast:true isn't reliably honored — it returned no txid), then
  // broadcast the signed tx ourselves server-side to get the real txid.
  const signed = await request("stx_signTransaction", { transaction, broadcast: false });
  const signedHex = signed?.transaction;
  if (!signedHex) throw new Error("Wallet did not return a signed transaction");

  const res = await fetch("/api/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tx: signedHex }),
  });
  const data = (await res.json()) as { txid?: string; error?: string };
  if (!res.ok || !data.txid) throw new Error(data.error || "Broadcast failed");
  return { txid: data.txid };
};
