import { NextResponse } from "next/server";
import { isValidAddress } from "flowvault-sdk";
import { readClient } from "@/lib/flowvault";

// Always read fresh on-chain state.
export const dynamic = "force-dynamic";

/**
 * Server-side proxy for vault reads. The browser can't call the Hiro RPC
 * directly (CORS + rate-limit responses without CORS headers), so the client
 * reads through here instead. Returns full VaultState (balances, currentBlock,
 * routingRules).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  try {
    const state = await readClient(address).getVaultState(address);
    return NextResponse.json({ state });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read vault state" },
      { status: 502 },
    );
  }
}
