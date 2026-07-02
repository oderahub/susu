import { NextResponse } from "next/server";
import { isValidAddress } from "flowvault-sdk";
import { NETWORK } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Server-side nonce lookup (no browser CORS). Used when building the unsigned
 * transaction client-side so we don't call the Hiro API from the browser.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  const host = NETWORK === "mainnet" ? "https://api.hiro.so" : "https://api.testnet.hiro.so";
  try {
    const r = await fetch(`${host}/extended/v1/address/${address}/nonces`);
    if (!r.ok) throw new Error(`nonce lookup ${r.status}`);
    const d = (await r.json()) as { possible_next_nonce?: number };
    return NextResponse.json({ nonce: d.possible_next_nonce ?? 0 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "nonce lookup failed" },
      { status: 502 },
    );
  }
}
