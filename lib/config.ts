/**
 * Network + contract configuration.
 *
 * Everything is sourced from the FlowVault SDK's known deployment so we never
 * hard-code an address that could drift from the SDK. Susu only ever talks to
 * the *deployed* FlowVault contract — we do not deploy our own vault.
 */
import { DEFAULT_CONTRACTS, type NetworkName } from "flowvault-sdk";

export const NETWORK: NetworkName =
  ((process.env.NEXT_PUBLIC_FLOWVAULT_NETWORK || process.env.NEXT_PUBLIC_STACKS_NETWORK) as NetworkName) ||
  "testnet";

const defaults = DEFAULT_CONTRACTS[NETWORK];

/**
 * Contract principals. FlowVault's documented env vars take precedence; otherwise
 * we fall back to the SDK's known deployment for the selected network.
 */
export const CONTRACTS = {
  contractAddress: process.env.NEXT_PUBLIC_FLOWVAULT_CONTRACT_ADDRESS || defaults.contractAddress,
  contractName: process.env.NEXT_PUBLIC_FLOWVAULT_CONTRACT_NAME || defaults.contractName,
  tokenContractAddress:
    process.env.NEXT_PUBLIC_FLOWVAULT_TOKEN_CONTRACT_ADDRESS || defaults.tokenContractAddress,
  tokenContractName: process.env.NEXT_PUBLIC_FLOWVAULT_TOKEN_CONTRACT_NAME || defaults.tokenContractName,
};

/** Fully-qualified contract ids, e.g. "STD7….flowvault-v2". */
export const VAULT_CONTRACT_ID = `${CONTRACTS.contractAddress}.${CONTRACTS.contractName}`;
export const USDCX_CONTRACT_ID = `${CONTRACTS.tokenContractAddress}.${CONTRACTS.tokenContractName}`;

/** USDCx uses 6 decimals — 1 USDCx = 1_000_000 micro-units. */
export const USDCX_DECIMALS = 6;

/** Hiro explorer links so the demo can point at real on-chain proof. */
const EXPLORER_BASE = "https://explorer.hiro.so";
export const explorerTx = (txId: string) =>
  `${EXPLORER_BASE}/txid/${txId.startsWith("0x") ? txId : `0x${txId}`}?chain=${NETWORK}`;
export const explorerAddress = (addr: string) =>
  `${EXPLORER_BASE}/address/${addr}?chain=${NETWORK}`;
export const explorerContract = (contractId: string) =>
  `${EXPLORER_BASE}/txid/${contractId}?chain=${NETWORK}`;

/**
 * Approximate wall-clock per block, used ONLY to render a friendly "~30 min"
 * style hint next to a lock. Locks are denominated in BLOCKS on-chain; we never
 * show a false-precise countdown. Calibrate empirically on testnet before demo.
 */
export const APPROX_SECONDS_PER_BLOCK = 30;

/** How long a member's personal savings stay locked, in blocks (extends with each contribution). */
export const SAVE_LOCK_BLOCKS = 30;
