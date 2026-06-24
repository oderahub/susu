/**
 * Post-conditions — the trust detail. Attaching a `willSendEq` to a deposit makes
 * the wallet show (and the chain enforce) exactly how much USDCx leaves the user.
 */
import { Pc, type PostCondition } from "@stacks/transactions";
import { CONTRACTS } from "./config";

/** The `define-fungible-token` asset name inside the USDCx contract. */
const USDCX_ASSET = "usdcx-token";
const USDCX_FT =
  `${CONTRACTS.tokenContractAddress}.${CONTRACTS.tokenContractName}` as `${string}.${string}`;

/**
 * "This wallet sends exactly `amountMicro` USDCx." Attached to a deposit so the
 * user sees precisely what leaves their account. The deposit also triggers a
 * contract → recipient split, which `allow` mode permits alongside this.
 */
export function depositPostCondition(sender: string, amountMicro: bigint): PostCondition {
  return Pc.principal(sender).willSendEq(amountMicro).ft(USDCX_FT, USDCX_ASSET);
}
